// @/utils/cognitoPhoneVerify.ts
import AWS from 'aws-sdk';
import { CognitoUserPool, CognitoUser, CognitoUserAttribute } from 'amazon-cognito-identity-js';

const poolConfig = {
    UserPoolId: 'us-east-1_wHcEk9kP8',
    ClientId: '25lbf1t46emi9b4g51c6du5kkn',
    Region: 'us-east-1'
};

const userPool = new CognitoUserPool({
    UserPoolId: poolConfig.UserPoolId,
    ClientId: poolConfig.ClientId
});

interface VerifyResponse {
    success: boolean;
    error?: string;
    codeDelivered?: boolean;
}

export const initiatePhoneVerification = async (phoneNumber: string): Promise<VerifyResponse> => {
    console.log('Initiating phone verification for:', phoneNumber);
    
    try {
        // First, check if user exists
        const cognitoUser = new CognitoUser({
            Username: phoneNumber,
            Pool: userPool
        });

        // Try to send verification code
        // If user doesn't exist, it will create one
        await new Promise((resolve, reject) => {
            const attributeList = [
                new CognitoUserAttribute({
                    Name: 'phone_number',
                    Value: phoneNumber
                })
            ];

            userPool.signUp(
                phoneNumber,
                Math.random().toString(36).slice(-8) + 'Aa1!', // temporary password
                attributeList,
                null,
                (err, result) => {
                    if (err) {
                        // If user exists, try resending the code
                        if (err.code === 'UsernameExistsException') {
                            cognitoUser.resendConfirmationCode((resendErr, resendResult) => {
                                if (resendErr) {
                                    reject(resendErr);
                                    return;
                                }
                                resolve(resendResult);
                            });
                            return;
                        }
                        reject(err);
                        return;
                    }
                    resolve(result);
                }
            );
        });

        return {
            success: true,
            codeDelivered: true
        };
    } catch (error: any) {
        console.error('Error in initiatePhoneVerification:', error);
        return {
            success: false,
            error: error.message || 'Failed to send verification code'
        };
    }
};

export const verifyPhoneCode = async (phoneNumber: string, code: string): Promise<VerifyResponse> => {
    console.log('Verifying phone code for:', phoneNumber);
    
    try {
        const cognitoUser = new CognitoUser({
            Username: phoneNumber,
            Pool: userPool
        });

        await new Promise((resolve, reject) => {
            cognitoUser.confirmRegistration(code, true, (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(result);
            });
        });

        return {
            success: true
        };
    } catch (error: any) {
        console.error('Error in verifyPhoneCode:', error);
        return {
            success: false,
            error: error.code === 'CodeMismatchException' 
                ? 'Invalid verification code' 
                : (error.message || 'Failed to verify code')
        };
    }
};

export const resendPhoneCode = async (phoneNumber: string): Promise<VerifyResponse> => {
    console.log('Resending phone code to:', phoneNumber);
    
    try {
        const cognitoUser = new CognitoUser({
            Username: phoneNumber,
            Pool: userPool
        });

        await new Promise((resolve, reject) => {
            cognitoUser.resendConfirmationCode((err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(result);
            });
        });

        return {
            success: true,
            codeDelivered: true
        };
    } catch (error: any) {
        console.error('Error in resendPhoneCode:', error);
        return {
            success: false,
            error: error.message || 'Failed to resend code'
        };
    }
};