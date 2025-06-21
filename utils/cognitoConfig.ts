// @/utils/cognitoConfig.ts
import 'react-native-get-random-values';
import AWS from 'aws-sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CognitoUserPool, CognitoUser, AuthenticationDetails, CognitoUserSession } from 'amazon-cognito-identity-js';


export const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

interface AuthResponse {
    success?: boolean;
    error?: string;
    user?: any;
    exists?: boolean;
    confirmed?: boolean;
    isNewUser?: boolean;
    requiresNewPassword?: boolean;
    session?: {
        accessToken: string;
        idToken: string;
        refreshToken: string;
    };
}

export const getCurrentSession = async (): Promise<AuthResponse['session'] | null> => {
    const currentUser = userPool.getCurrentUser();
    if (!currentUser) return null;

    return new Promise((resolve) => {
        currentUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
            if (err || !session) {
                resolve(null);
                return;
            }

            resolve({
                accessToken: session.getAccessToken().getJwtToken(),
                idToken: session.getIdToken().getJwtToken(),
                refreshToken: session.getRefreshToken().getToken()
            });
        });
    });
};

export const getCognitoUserId = async (email: string): Promise<string | null> => {
    try {
        const params = {
            UserPoolId: poolConfig.UserPoolId,
            Username: email.toLowerCase()
        };

        const response = await cognitoIdentityServiceProvider.adminGetUser(params).promise();
        // The sub attribute contains the unique identifier (Cognito User ID)
        const subAttribute = response.UserAttributes.find(attr => attr.Name === 'sub');
        return subAttribute ? subAttribute.Value : null;
    } catch (error) {
        console.error('Error getting Cognito user ID:', error);
        return null;
    }
};

export const checkUserExists = async (email: string): Promise<AuthResponse> => {
    console.log('Checking if user exists:', email);
    
    try {
        const params = {
            UserPoolId: poolConfig.UserPoolId,
            Username: email.toLowerCase()
        };

        const response = await cognitoIdentityServiceProvider.adminGetUser(params).promise();
        const isConfirmed = response.UserStatus === 'CONFIRMED';
        const requiresNewPassword = response.UserStatus === 'FORCE_CHANGE_PASSWORD';
        
        console.log('User status:', response.UserStatus);
        
        return {
            exists: true,
            confirmed: isConfirmed,
            isNewUser: false,
            requiresNewPassword
        };
    } catch (error: any) {
        if (error.code === 'UserNotFoundException') {
            return {
                exists: false,
                confirmed: false,
                isNewUser: true,
                requiresNewPassword: false
            };
        }
        throw error;
    }
};

export const completeNewUserSignup = async (email: string, password: string): Promise<AuthResponse> => {
    console.log('Starting signup completion for:', email);
    
    try {
        // Set the permanent password first
        try {
            await cognitoIdentityServiceProvider.adminSetUserPassword({
                UserPoolId: poolConfig.UserPoolId,
                Username: email.toLowerCase(),
                Password: password,
                Permanent: true
            }).promise();
            console.log('Password set successfully');
        } catch (error: any) {
            // If error is not about user being confirmed, throw it
            if (!error.message.includes('User cannot be confirmed')) {
                throw error;
            }
            console.log('Password set with confirmed user warning');
        }

        // Get current user status after password set
        const userInfo = await cognitoIdentityServiceProvider.adminGetUser({
            UserPoolId: poolConfig.UserPoolId,
            Username: email.toLowerCase()
        }).promise();

        // If user isn't confirmed yet, confirm them
        if (userInfo.UserStatus !== 'CONFIRMED') {
            try {
                await cognitoIdentityServiceProvider.adminConfirmSignUp({
                    UserPoolId: poolConfig.UserPoolId,
                    Username: email.toLowerCase()
                }).promise();
                console.log('User confirmed successfully');
            } catch (error: any) {
                // Ignore "already confirmed" errors
                if (!error.message.includes('User cannot be confirmed')) {
                    throw error;
                }
                console.log('User was already confirmed');
            }
        }

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

        const cognitoUserId = await getCognitoUserId(email);
        if (!cognitoUserId) {
            throw new Error('Failed to get Cognito user ID');
        }

        const signInResult = await signIn(email, password);
        if (!signInResult.success) {
            throw new Error(signInResult.error || 'Failed to sign in after signup');
        }

        return {
            success: true,
            confirmed: true,
            isNewUser: true,
            session: signInResult.session,
            user: {
                ...signInResult.user,
                userId: cognitoUserId
            }
        };

    } catch (error: any) {
        console.error('Error in completeNewUserSignup:', error);
        
        // Check if the error is just about confirmation
        if (error.code === 'NotAuthorizedException' && 
            error.message.includes('User cannot be confirmed')) {
            // If it's just about confirmation, consider it a success
            return {
                success: true,
                confirmed: true,
                isNewUser: true
            };
        }

        return {
            success: false,
            error: error.message || 'Failed to complete signup'
        };
    }
};

export const signIn = async (email: string, password: string): Promise<AuthResponse> => {
    return new Promise((resolve) => {
        const cognitoUser = new CognitoUser({
            Username: email.toLowerCase(),
            Pool: userPool
        });

        const authDetails = new AuthenticationDetails({
            Username: email.toLowerCase(),
            Password: password
        });

        cognitoUser.authenticateUser(authDetails, {
            onSuccess: async (session) => {
                const attributes = await new Promise((attrResolve) => {
                    cognitoUser.getUserAttributes((err, result) => {
                        if (err) {
                            console.error('Error getting user attributes:', err);
                            attrResolve(null);
                            return;
                        }
                        attrResolve(result);
                    });
                });
                const sub = attributes?.find(attr => attr.Name === 'sub')?.Value;

                resolve({
                    success: true,
                    user: {
                        ...cognitoUser,
                        username: sub || cognitoUser.getUsername()
                    },
                    confirmed: true,
                    session: {
                        accessToken: session.getAccessToken().getJwtToken(),
                        idToken: session.getIdToken().getJwtToken(),
                        refreshToken: session.getRefreshToken().getToken()
                    }
                });
            },
            onFailure: (err) => {
                resolve({
                    success: false,
                    error: err.message || 'An error occurred during sign in',
                    confirmed: false
                });
            },
            newPasswordRequired: (userAttributes, requiredAttributes) => {
                delete userAttributes.email_verified;
                delete userAttributes.email;

                cognitoUser.completeNewPasswordChallenge(password, userAttributes, {
                    onSuccess: (session) => {
                        resolve({
                            success: true,
                            user: cognitoUser,
                            confirmed: true,
                            session: {
                                accessToken: session.getAccessToken().getJwtToken(),
                                idToken: session.getIdToken().getJwtToken(),
                                refreshToken: session.getRefreshToken().getToken()
                            }
                        });
                    },
                    onFailure: (err) => {
                        resolve({
                            success: false,
                            error: 'Failed to setup new password. Please try again.',
                            confirmed: false
                        });
                    }
                });
            }
        });
    });
};

export const signOut = async (): Promise<void> => {
    try {
        console.log('Starting sign out process');
        
        const currentUser = userPool.getCurrentUser();
        if (currentUser) {
            currentUser.signOut();
            console.log('User signed out from Cognito');
        }

        await AsyncStorage.multiRemove([
            'auth_tokens',
            'pendingUserData',
            'userSession'
        ]);
        console.log('Local storage cleared');

    } catch (error) {
        console.error('Error during sign out:', error);
        throw error;
    }
};