// @/utils/cognitoVerify.ts
import { CognitoUserPool, CognitoUser, CognitoUserAttribute, AuthenticationDetails } from 'amazon-cognito-identity-js';
import AWS from 'aws-sdk';
import { userPool, poolConfig, cognitoIdentityServiceProvider } from './cognitoConfig';
import { storeAuthTokens } from './authTokens';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCognitoUserId } from './cognitoConfig';
import { PendingAuthData } from '@/types/user';

interface VerifyResponse {
    success: boolean;
    error?: string;
    isNewUser?: boolean;
    codeDelivered?: boolean;
    session?: {
        accessToken: string;
        idToken: string;
        refreshToken: string;
    };
}

const createUserAndSendCode = async (email: string): Promise<VerifyResponse> => {
    try {
        // First, attempt to delete any existing unverified user
        try {
            await cognitoIdentityServiceProvider.adminDeleteUser({
                UserPoolId: poolConfig.UserPoolId,
                Username: email.toLowerCase()
            }).promise();
            console.log('Cleaned up existing user');
        } catch (error: any) {
            if (error.code !== 'UserNotFoundException') {
                throw error;
            }
        }

        // Create new user with signup
        const attributeList = [
            new CognitoUserAttribute({
                Name: 'email',
                Value: email.toLowerCase()
            })
        ];

        return new Promise((resolve) => {
            const tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';
            
            userPool.signUp(
                email.toLowerCase(),
                tempPassword,
                attributeList,
                null,
                async (err, result) => {
                    if (err) {
                        console.error('Error in signUp:', err);
                        resolve({
                            success: false,
                            error: err.message || 'Failed to send verification code'
                        });
                        return;
                    }

                    try {
                        // Ensure user is in FORCE_CHANGE_PASSWORD state
                        await cognitoIdentityServiceProvider.adminSetUserPassword({
                            UserPoolId: poolConfig.UserPoolId,
                            Username: email.toLowerCase(),
                            Password: tempPassword,
                            Permanent: false
                        }).promise();

                        console.log('User created successfully and verification code sent');
                        resolve({
                            success: true,
                            codeDelivered: true,
                            isNewUser: true
                        });
                    } catch (error) {
                        console.error('Error setting password state:', error);
                        resolve({
                            success: false,
                            error: 'Failed to complete user setup'
                        });
                    }
                }
            );
        });
    } catch (error: any) {
        console.error('Error in createUserAndSendCode:', error);
        throw error;
    }
};

export const sendEmailVerificationCode = async (email: string): Promise<VerifyResponse> => {
    console.log('Starting verification code send process for:', email);
    
    try {
        // Check if user exists and get their status
        try {
            const existingUser = await cognitoIdentityServiceProvider.adminGetUser({
                UserPoolId: poolConfig.UserPoolId,
                Username: email.toLowerCase()
            }).promise();

            console.log('Existing user status:', existingUser.UserStatus);
            
            // Check email verification status
            const emailVerified = existingUser.UserAttributes.find(
                attr => attr.Name === 'email_verified'
            )?.Value === 'true';

            if (!emailVerified || existingUser.UserStatus === 'FORCE_CHANGE_PASSWORD') {
                console.log('User needs new verification code, recreating user');
                return await createUserAndSendCode(email);
            }

            if (existingUser.UserStatus === 'CONFIRMED' && emailVerified) {
                return {
                    success: false,
                    error: 'User is already verified and confirmed'
                };
            }
        } catch (error: any) {
            if (error.code === 'UserNotFoundException') {
                console.log('User not found, creating new user');
                return await createUserAndSendCode(email);
            }
            throw error;
        }

        throw new Error('Unexpected user state encountered');
    } catch (error: any) {
        console.error('Error in sendEmailVerificationCode:', error);
        return {
            success: false,
            error: error.message || 'Failed to send verification code'
        };
    }
};

export const verifyEmailCode = async (email: string, code: string): Promise<VerifyResponse> => {
    console.log('Starting email verification for:', email);
    
    return new Promise((resolve) => {
        const userData = {
            Username: email.toLowerCase(),
            Pool: userPool
        };

        const cognitoUser = new CognitoUser(userData);

        // Use signUp confirmation but handle the expected error
        cognitoUser.confirmRegistration(code, false, async (err, result) => {
            if (err) {
                if (err.code === 'NotAuthorizedException' && err.message.includes('Current status is FORCE_CHANGE_PASSWORD')) {
                    // This error is expected - the code was valid but user is in FORCE_CHANGE_PASSWORD state
                    try {
                        // Update email_verified attribute
                        await cognitoIdentityServiceProvider.adminUpdateUserAttributes({
                            UserPoolId: poolConfig.UserPoolId,
                            Username: email.toLowerCase(),
                            UserAttributes: [
                                {
                                    Name: 'email_verified',
                                    Value: 'true'
                                }
                            ]
                        }).promise();

                        console.log('Email verified successfully');
                        resolve({
                            success: true,
                            isNewUser: true
                        });
                    } catch (updateError) {
                        console.error('Error updating attributes:', updateError);
                        resolve({
                            success: false,
                            error: 'Failed to complete verification'
                        });
                    }
                    return;
                }

                console.error('Code verification failed:', err);
                resolve({
                    success: false,
                    error: err.code === 'CodeMismatchException' 
                        ? 'Invalid verification code' 
                        : (err.message || 'Failed to verify code')
                });
                return;
            }

            // If we get here without the expected error, something went wrong
            resolve({
                success: false,
                error: 'Unexpected verification state'
            });
        });
    });
};

export const resendEmailCode = async (email: string): Promise<VerifyResponse> => {
    return sendEmailVerificationCode(email);
};

export const sendLoginVerificationCode = async (email: string): Promise<VerifyResponse> => {
    console.log('Sending login verification code to:', email);
    
    try {
        // Check if user exists and is in correct state
        const userInfo = await cognitoIdentityServiceProvider.adminGetUser({
            UserPoolId: poolConfig.UserPoolId,
            Username: email.toLowerCase()
        }).promise();

        const emailVerified = userInfo.UserAttributes.find(
            attr => attr.Name === 'email_verified'
        )?.Value === 'true';
        const isConfirmed = userInfo.UserStatus === 'CONFIRMED';

        if (!emailVerified || !isConfirmed) {
            return {
                success: false,
                error: 'Account not fully verified. Please complete registration first.'
            };
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await cognitoIdentityServiceProvider.adminUpdateUserAttributes({
            UserPoolId: poolConfig.UserPoolId,
            Username: email.toLowerCase(),
            UserAttributes: [
                {
                    Name: 'custom:login_code',
                    Value: otp
                }
            ]
        }).promise();

        await cognitoIdentityServiceProvider.adminInitiateAuth({
            AuthFlow: 'CUSTOM_AUTH',
            ClientId: poolConfig.ClientId,
            UserPoolId: poolConfig.UserPoolId,
            AuthParameters: {
                USERNAME: email.toLowerCase()
            }
        }).promise();

        return {
            success: true,
            codeDelivered: true
        };

    } catch (error: any) {
        console.error('Error in sendLoginVerificationCode:', error);
        if (error.code === 'UserNotFoundException') {
            return {
                success: false,
                error: 'No account found with this email'
            };
        }
        return {
            success: false,
            error: error.message || 'Failed to send verification code'
        };
    }
};

export const verifyLoginCode = async (email: string, code: string): Promise<VerifyResponse> => {
    console.log('Verifying login code for:', email);
    
    try {
        const userInfo = await cognitoIdentityServiceProvider.adminGetUser({
            UserPoolId: poolConfig.UserPoolId,
            Username: email.toLowerCase()
        }).promise();

        const storedCode = userInfo.UserAttributes.find(
            attr => attr.Name === 'custom:login_code'
        )?.Value;

        if (!storedCode || code !== storedCode) {
            return {
                success: false,
                error: 'Invalid verification code'
            };
        }

        // Initiate custom auth with OTP
        const authResult = await cognitoIdentityServiceProvider.adminRespondToAuthChallenge({
            ChallengeName: 'CUSTOM_CHALLENGE',
            ClientId: poolConfig.ClientId,
            UserPoolId: poolConfig.UserPoolId,
            ChallengeResponses: {
                USERNAME: email.toLowerCase(),
                ANSWER: code
            }
        }).promise();

        if (authResult.AuthenticationResult) {
            // Store tokens
            const tokens = {
                accessToken: authResult.AuthenticationResult.AccessToken,
                idToken: authResult.AuthenticationResult.IdToken,
                refreshToken: authResult.AuthenticationResult.RefreshToken
            };
            await storeAuthTokens(tokens);

            // Clear the OTP
            await cognitoIdentityServiceProvider.adminUpdateUserAttributes({
                UserPoolId: poolConfig.UserPoolId,
                Username: email.toLowerCase(),
                UserAttributes: [
                    {
                        Name: 'custom:login_code',
                        Value: ''
                    }
                ]
            }).promise();

            // Store pending data for DynamoDB update
            const cognitoId = await getCognitoUserId(email);
            if (cognitoId) {
                const pendingData: PendingAuthData = {
                    type: 'EMAIL_CODE_LOGIN',
                    cognito_id: cognitoId,
                    email: email,
                    timestamp: new Date().toISOString()
                };
                await AsyncStorage.setItem('pendingUserData', JSON.stringify(pendingData));
            }

            return {
                success: true,
                session: tokens
            };
        } else {
            return {
                success: false,
                error: 'Authentication failed'
            };
        }
    } catch (error: any) {
        console.error('Error in verifyLoginCode:', error);
        return {
            success: false,
            error: error.message || 'Failed to verify code'
        };
    }
};