// @/utils/cognitoEmailVerify.ts
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

interface AuthResponse {
    success: boolean;
    error?: string;
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

export const sendLoginVerificationCode = async (email: string): Promise<AuthResponse> => {
    console.log('Starting email OTP flow for:', email);
    
    try {
        // First initiate the USER_AUTH flow
        const authResult = await cognitoIdentityServiceProvider.initiateAuth({
            AuthFlow: 'USER_AUTH',
            ClientId: poolConfig.ClientId,
            AuthParameters: {
                USERNAME: email.toLowerCase(),
                PREFERRED_CHALLENGE: 'EMAIL_OTP'
            }
        }).promise();

        if (!authResult.Session) {
            throw new Error('No session returned from auth initiation');
        }

        // Select EMAIL_OTP challenge
        const selectResult = await cognitoIdentityServiceProvider.respondToAuthChallenge({
            ClientId: poolConfig.ClientId,
            ChallengeName: 'SELECT_CHALLENGE',
            Session: authResult.Session,
            ChallengeResponses: {
                USERNAME: email.toLowerCase(),
                ANSWER: 'EMAIL_OTP'
            }
        }).promise();

        if (selectResult.ChallengeName === 'EMAIL_OTP') {
            return {
                success: true
            };
        }

        throw new Error('Unexpected challenge response');
    } catch (error: any) {
        console.error('Error in sendLoginVerificationCode:', error);
        
        if (error.code === 'UserNotFoundException') {
            return {
                success: false,
                error: 'No account found with this email'
            };
        }

        if (error.code === 'NotAuthorizedException') {
            return {
                success: false,
                error: 'Account not verified or invalid authentication state'
            };
        }
        
        return {
            success: false,
            error: error.message || 'Failed to send verification code'
        };
    }
};

export const verifyLoginCode = async (email: string, code: string): Promise<AuthResponse> => {
    console.log('Verifying email OTP for:', email);
    
    try {
        // Reinitiate auth to get a fresh session
        const authResult = await cognitoIdentityServiceProvider.initiateAuth({
            AuthFlow: 'USER_AUTH',
            ClientId: poolConfig.ClientId,
            AuthParameters: {
                USERNAME: email.toLowerCase(),
                PREFERRED_CHALLENGE: 'EMAIL_OTP'
            }
        }).promise();

        if (!authResult.Session) {
            throw new Error('No session returned from auth initiation');
        }

        // Verify the OTP code
        const challengeResult = await cognitoIdentityServiceProvider.respondToAuthChallenge({
            ClientId: poolConfig.ClientId,
            ChallengeName: 'EMAIL_OTP',
            Session: authResult.Session,
            ChallengeResponses: {
                USERNAME: email.toLowerCase(),
                EMAIL_OTP_CODE: code
            }
        }).promise();

        if (challengeResult.AuthenticationResult) {
            const tokens = {
                accessToken: challengeResult.AuthenticationResult.AccessToken,
                idToken: challengeResult.AuthenticationResult.IdToken,
                refreshToken: challengeResult.AuthenticationResult.RefreshToken
            };

            await storeAuthTokens(tokens);

            // Store pending auth data
            const cognitoUser = new CognitoUser({
                Username: email.toLowerCase(),
                Pool: userPool
            });

            const pendingData: PendingAuthData = {
                type: 'EMAIL_CODE_LOGIN',
                cognito_id: cognitoUser.getUsername(),
                email: email.toLowerCase(),
                timestamp: new Date().toISOString()
            };
            await AsyncStorage.setItem('pendingUserData', JSON.stringify(pendingData));

            return {
                success: true,
                session: tokens
            };
        }

        return {
            success: false,
            error: 'Invalid verification code'
        };
    } catch (error: any) {
        console.error('Error in verifyLoginCode:', error);
        
        if (error.code === 'CodeMismatchException') {
            return {
                success: false,
                error: 'Invalid verification code'
            };
        }

        if (error.code === 'ExpiredCodeException') {
            return {
                success: false,
                error: 'Verification code has expired'
            };
        }
        
        return {
            success: false,
            error: error.message || 'Failed to verify code'
        };
    }
};