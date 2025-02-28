// @/utils/cognitoOTPAuth.ts
import { CognitoUser } from 'amazon-cognito-identity-js';
import { userPool, poolConfig, cognitoIdentityServiceProvider } from './cognitoConfig';
import { storeAuthTokens } from './authTokens';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PendingAuthData, DynamoDBUserRecord } from '@/types/user';
import { getCognitoUserId } from './cognitoConfig';
import { updateEmailCodeLoginFields } from './dynamodbEmailUtils';

interface AuthResponse {
    success: boolean;
    error?: string;
    session?: {
        accessToken: string;
        idToken: string;
        refreshToken: string;
    };
}

export const sendLoginVerificationCode = async (email: string): Promise<AuthResponse> => {
    console.log('Starting OTP send process for:', email);
    
    try {
        // Check if user exists
        try {
            await cognitoIdentityServiceProvider.adminGetUser({
                UserPoolId: poolConfig.UserPoolId,
                Username: email.toLowerCase()
            }).promise();
        } catch (error: any) {
            if (error.code === 'UserNotFoundException') {
                return {
                    success: false,
                    error: 'No account found with this email'
                };
            }
            throw error;
        }

        // Step 1: Initiate auth with CUSTOM_AUTH flow
        console.log('Initiating CUSTOM_AUTH flow with params:', {
            AuthFlow: 'CUSTOM_AUTH',
            ClientId: poolConfig.ClientId,
            Username: email.toLowerCase()
        });

        const authResult = await cognitoIdentityServiceProvider.initiateAuth({
            AuthFlow: 'CUSTOM_AUTH',
            ClientId: poolConfig.ClientId,
            AuthParameters: {
                USERNAME: email.toLowerCase()
            }
        }).promise();

        console.log('Auth initiation response:', {
            hasSession: !!authResult.Session,
            challengeName: authResult.ChallengeName,
            hasChallenge: !!authResult.ChallengeParameters
        });

        if (!authResult.Session) {
            console.error('No session returned from auth initiation');
            throw new Error('No session returned');
        }

        // Save the session for later use
        await AsyncStorage.setItem(
            `otp_session_${email.toLowerCase()}`, 
            authResult.Session
        );

        // Step 2: If we get CUSTOM_CHALLENGE, the Lambda function has sent the code
        if (authResult.ChallengeName === 'CUSTOM_CHALLENGE') {
            console.log('Custom challenge received, code should be sent via Lambda');
            return {
                success: true
            };
        }

        console.log('Unexpected challenge name:', authResult.ChallengeName);
        return {
            success: false,
            error: 'Unexpected authentication flow'
        };

    } catch (error: any) {
        console.error('Error in sendLoginVerificationCode:', error);
        console.error('Error details:', JSON.stringify({
            code: error.code,
            message: error.message,
            name: error.name
        }));
        
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
    console.log('Starting OTP verification for:', email, 'with code length:', code.length);
    
    try {
        // Retrieve the saved session
        const savedSession = await AsyncStorage.getItem(`otp_session_${email.toLowerCase()}`);
        
        if (!savedSession) {
            console.error('No saved session found, initiating new auth flow');
            
            // Initiate auth again to get a fresh session
            const authResult = await cognitoIdentityServiceProvider.initiateAuth({
                AuthFlow: 'CUSTOM_AUTH',
                ClientId: poolConfig.ClientId,
                AuthParameters: {
                    USERNAME: email.toLowerCase()
                }
            }).promise();

            if (!authResult.Session) {
                throw new Error('Failed to get authentication session');
            }
            
            // Save the fresh session
            await AsyncStorage.setItem(
                `otp_session_${email.toLowerCase()}`, 
                authResult.Session
            );
            
            // Continue with the new session
            console.log('Responding to CUSTOM_CHALLENGE with code');
            const challengeResult = await cognitoIdentityServiceProvider.respondToAuthChallenge({
                ClientId: poolConfig.ClientId,
                ChallengeName: 'CUSTOM_CHALLENGE',
                Session: authResult.Session,
                ChallengeResponses: {
                    USERNAME: email.toLowerCase(),
                    ANSWER: code
                }
            }).promise();
            
            return handleChallengeResult(challengeResult, email);
        }
        
        // Use the existing session
        console.log('Using saved session to respond to challenge');
        const challengeResult = await cognitoIdentityServiceProvider.respondToAuthChallenge({
            ClientId: poolConfig.ClientId,
            ChallengeName: 'CUSTOM_CHALLENGE',
            Session: savedSession,
            ChallengeResponses: {
                USERNAME: email.toLowerCase(),
                ANSWER: code
            }
        }).promise();
        
        return handleChallengeResult(challengeResult, email);
    } catch (error: any) {
        console.error('Error in verifyLoginCode:', error);
        console.error('Error details:', JSON.stringify({
            code: error.code,
            message: error.message,
            name: error.name
        }));
        
        if (error.code === 'CodeMismatchException' || 
            error.code === 'NotAuthorizedException' ||
            (error.message && error.message.includes('Incorrect username or password'))) {
            return {
                success: false,
                error: 'Invalid verification code'
            };
        }

        return {
            success: false,
            error: error.message || 'Failed to verify code'
        };
    }
};

const handleChallengeResult = async (challengeResult: any, email: string): Promise<AuthResponse> => {
    console.log('Challenge response received:', {
        challengeName: challengeResult.ChallengeName,
        hasAuthResult: !!challengeResult.AuthenticationResult,
        session: !!challengeResult.Session
    });

    if (challengeResult.AuthenticationResult) {
        console.log('Authentication successful, storing tokens');
        
        // Clear the session from storage since we don't need it anymore
        await AsyncStorage.removeItem(`otp_session_${email.toLowerCase()}`);
        
        // Create tokens object from authentication result
        const tokens = {
            accessToken: challengeResult.AuthenticationResult.AccessToken,
            idToken: challengeResult.AuthenticationResult.IdToken,
            refreshToken: challengeResult.AuthenticationResult.RefreshToken
        };
    
        // Store tokens for later use
        await storeAuthTokens(tokens);
    
        try {
            // Try to get the Cognito user ID
            const cognitoUserId = await getCognitoUserId(email);
            console.log('Got Cognito user ID:', cognitoUserId);
            
            if (cognitoUserId) {
                // Store the user ID directly for easy access - this is critical for later use
                await AsyncStorage.setItem('userId', cognitoUserId);
                
                // Create pending user data with the ACTUAL Cognito ID (not email)
                const pendingData: PendingAuthData = {
                    type: 'EMAIL_CODE_LOGIN',
                    cognito_id: cognitoUserId,  // Use actual Cognito ID, not email
                    email: email.toLowerCase(),
                    timestamp: new Date().toISOString()
                };
                
                // Store pending user data
                await AsyncStorage.setItem('pendingUserData', JSON.stringify(pendingData));
                console.log('Stored pending user data with correct Cognito ID');
            } else {
                console.error('Failed to get Cognito user ID');
                // In this case, we don't have a fallback that would work with DynamoDB
                // because DynamoDB requires the actual Cognito ID
                return {
                    success: true,
                    session: tokens
                };
            }
        } catch (error) {
            console.error('Error storing pending user data:', error);
            // Continue despite error since authentication succeeded
        }
    
        return {
            success: true,
            session: tokens
        };
    } else if (challengeResult.ChallengeName === 'CUSTOM_CHALLENGE') {
        // Need another challenge attempt - probably incorrect code
        console.log('Another challenge required, code was likely incorrect');
        
        // Update session if provided
        if (challengeResult.Session) {
            await AsyncStorage.setItem(
                `otp_session_${email.toLowerCase()}`, 
                challengeResult.Session
            );
        }
        
        return {
            success: false,
            error: 'Invalid verification code'
        };
    }

    // If we get here without authentication result or another challenge
    console.log('No authentication result received');
    return {
        success: false,
        error: 'Invalid verification code or session expired'
    };
};