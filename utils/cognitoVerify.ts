// @/utils/cognitoVerify.ts
import { CognitoUserPool, CognitoUser } from 'amazon-cognito-identity-js';

const poolConfig = {
    UserPoolId: 'ca-central-1_SU1CkywRI',
    ClientId: '2jq4ra1nagnurhvecbn9gmaj04'
};

const userPool = new CognitoUserPool(poolConfig);

interface VerifyResponse {
    success: boolean;
    error?: string;
    isNewUser?: boolean;
}

export const resendEmailCode = async (email: string): Promise<VerifyResponse> => {
    console.log('Resending verification code to:', email);

    return new Promise((resolve) => {
        const userData = {
            Username: email.toLowerCase(),
            Pool: userPool
        };

        const cognitoUser = new CognitoUser(userData);

        cognitoUser.resendConfirmationCode((err, result) => {
            if (err) {
                console.error('Error resending code:', err);
                resolve({
                    success: false,
                    error: err.message || 'Failed to send verification code'
                });
                return;
            }

            console.log('Code resent successfully:', result);
            resolve({
                success: true
            });
        });
    });
};

export const verifyEmailCode = async (email: string, code: string): Promise<VerifyResponse> => {
    console.log('Verifying code for:', email);

    return new Promise((resolve) => {
        const userData = {
            Username: email.toLowerCase(),
            Pool: userPool
        };

        const cognitoUser = new CognitoUser(userData);

        cognitoUser.confirmRegistration(code, true, (err, result) => {
            if (err) {
                console.error('Verification error:', err);
                resolve({
                    success: false,
                    error: err.message || 'Failed to verify code'
                });
                return;
            }

            console.log('Verification successful:', result);
            resolve({
                success: true,
                isNewUser: true // Since this is signup flow
            });
        });
    });
};