// @/utils/cognitoPhoneVerify.ts
import AWS from 'aws-sdk';

const poolConfig = {
    UserPoolId: 'us-east-1_wHcEk9kP8',
    ClientId: '25lbf1t46emi9b4g51c6du5kkn',
    Region: 'us-east-1'
};

const cognito = new AWS.CognitoIdentityServiceProvider({
    region: poolConfig.Region,
    credentials: new AWS.Credentials({
        accessKeyId: 'AKIAWDARUP7MHJ5IRB3Y',
        secretAccessKey: '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'
    })
});

interface VerifyResponse {
    success: boolean;
    error?: string;
    sessionId?: string;
    session?: {
        accessToken: string;
        idToken: string;
        refreshToken: string;
    };
}

const debugLog = (message: string, data?: any) => {
    console.log(`[VERIFY DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

export const initiatePhoneVerification = async (phoneNumber: string): Promise<VerifyResponse> => {
    try {
        // Only use USER_AUTH flow for authentication
        debugLog('Starting USER_AUTH flow for:', phoneNumber);
        const authResult = await cognito.initiateAuth({
            AuthFlow: 'USER_AUTH',
            ClientId: poolConfig.ClientId,
            AuthParameters: {
                USERNAME: phoneNumber
            }
        }).promise();
        debugLog('Auth initiated:', authResult);

        if (!authResult.Session) {
            throw new Error('No session received');
        }

        // Select SMS_OTP challenge
        const challengeResult = await cognito.respondToAuthChallenge({
            ChallengeName: 'SELECT_CHALLENGE',
            ClientId: poolConfig.ClientId,
            ChallengeResponses: {
                USERNAME: phoneNumber,
                ANSWER: 'SMS_OTP'
            },
            Session: authResult.Session
        }).promise();
        debugLog('Challenge selected:', challengeResult);

        if (!challengeResult.Session) {
            throw new Error('No session received from challenge');
        }

        return {
            success: true,
            sessionId: challengeResult.Session
        };

    } catch (error: any) {
        debugLog('Error in initiatePhoneVerification:', error);
        return {
            success: false,
            error: error.message || 'Failed to start verification'
        };
    }
};

export const verifyPhoneCode = async (
    phoneNumber: string,
    code: string,
    sessionId: string
): Promise<VerifyResponse> => {
    try {
        debugLog('Verifying code:', { phoneNumber, code: '******' });
        const result = await cognito.respondToAuthChallenge({
            ChallengeName: 'SMS_OTP',
            ClientId: poolConfig.ClientId,
            ChallengeResponses: {
                USERNAME: phoneNumber,
                SMS_OTP_CODE: code
            },
            Session: sessionId
        }).promise();
        debugLog('Verification response:', result);

        if (!result.AuthenticationResult) {
            throw new Error('No authentication result received');
        }

        return {
            success: true,
            session: {
                accessToken: result.AuthenticationResult.AccessToken,
                idToken: result.AuthenticationResult.IdToken,
                refreshToken: result.AuthenticationResult.RefreshToken
            }
        };
    } catch (error: any) {
        debugLog('Error in verifyPhoneCode:', error);
        return {
            success: false,
            error: error.code === 'CodeMismatchException' 
                ? 'Invalid verification code' 
                : (error.message || 'Failed to verify code')
        };
    }
};

export const resendPhoneCode = async (phoneNumber: string): Promise<VerifyResponse> => {
    debugLog('Resending code for:', phoneNumber);
    return initiatePhoneVerification(phoneNumber);
};