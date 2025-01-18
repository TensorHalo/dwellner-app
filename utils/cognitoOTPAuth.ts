// @/utils/cognitoOTPAuth.ts
import { CognitoUser } from 'amazon-cognito-identity-js';
import { userPool, poolConfig, cognitoIdentityServiceProvider } from './cognitoConfig';
import { storeAuthTokens } from './authTokens';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PendingAuthData } from '@/types/user';

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
        // Step 1: Initiate auth
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

        // Step 2: If we get CUSTOM_CHALLENGE, no need to respond yet
        // The Lambda function should have generated and sent the code
        if (authResult.ChallengeName === 'CUSTOM_CHALLENGE') {
            console.log('Custom challenge received, code should be sent via Lambda');
            return {
                success: true
            };
        }

        console.log('Unexpected challenge name:', authResult.ChallengeName);
        throw new Error('Unexpected authentication flow');

    } catch (error: any) {
        console.error('Error in sendLoginVerificationCode:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            name: error.name,
            stack: error.stack
        });
        
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
    console.log('Starting OTP verification for:', email, 'with code length:', code.length);
    
    try {
        // Step 1: Initiate auth again
        const authResult = await cognitoIdentityServiceProvider.initiateAuth({
            AuthFlow: 'CUSTOM_AUTH',
            ClientId: poolConfig.ClientId,
            AuthParameters: {
                USERNAME: email.toLowerCase()
            }
        }).promise();

        console.log('Auth initiation response:', {
            hasSession: !!authResult.Session,
            challengeName: authResult.ChallengeName
        });

        if (!authResult.Session) {
            throw new Error('No session returned');
        }

        // Step 2: Respond to the challenge with the code
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

        console.log('Challenge response received:', {
            hasAuthResult: !!challengeResult.AuthenticationResult,
            challengeName: challengeResult.ChallengeName,
            session: !!challengeResult.Session
        });

        if (challengeResult.AuthenticationResult) {
            console.log('Authentication successful, storing tokens');
            const tokens = {
                accessToken: challengeResult.AuthenticationResult.AccessToken,
                idToken: challengeResult.AuthenticationResult.IdToken,
                refreshToken: challengeResult.AuthenticationResult.RefreshToken
            };

            await storeAuthTokens(tokens);

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

        // If we get here without authentication result
        console.log('No authentication result received');
        return {
            success: false,
            error: 'Invalid verification code'
        };
    } catch (error: any) {
        console.error('Error in verifyLoginCode:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            name: error.name,
            stack: error.stack
        });
        
        if (error.code === 'CodeMismatchException') {
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