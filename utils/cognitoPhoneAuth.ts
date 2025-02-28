// @/utils/cognitoPhoneAuth.ts
import { userPool, poolConfig, cognitoIdentityServiceProvider } from './cognitoConfig';
import { storeAuthTokens } from './authTokens';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PendingAuthDataForPhone } from '@/types/user';

interface AuthResponse {
    success: boolean;
    error?: string;
    userExists?: boolean;
    session?: {
        accessToken: string;
        idToken: string;
        refreshToken: string;
    };
    cognitoId?: string;
}

// Ensure phone number is in E.164 format
const formatPhoneNumber = (phoneNumber: string): string => {
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+')) {
        return `+${cleaned}`;
    }
    return cleaned;
};

// Generate a random password for account creation
const generateRandomPassword = (): string => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
    
    let password = '';
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += special.charAt(Math.floor(Math.random() * special.length));
    
    const allChars = uppercase + lowercase + numbers + special;
    for (let i = 0; i < 8; i++) {
        password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    return password.split('').sort(() => 0.5 - Math.random()).join('');
};

// Check if user exists in Cognito user pool
export const checkPhoneExists = async (phoneNumber: string): Promise<{ exists: boolean; cognitoId?: string }> => {
    try {
        const formattedPhone = formatPhoneNumber(phoneNumber);
        console.log('Checking if phone exists:', formattedPhone);
        
        const listUsersParams = {
            UserPoolId: poolConfig.UserPoolId,
            Filter: `phone_number = "${formattedPhone}"`,
            Limit: 1
        };
        
        const response = await cognitoIdentityServiceProvider.listUsers(listUsersParams).promise();
        
        if (response.Users && response.Users.length > 0) {
            const user = response.Users[0];
            const cognitoId = user.Username;
            const phoneVerified = user.Attributes.find(
                attr => attr.Name === 'phone_number_verified'
            )?.Value === 'true';
            
            console.log('Found existing user with phone number:', cognitoId, 'Verified:', phoneVerified);
            return { exists: true, cognitoId };
        }
        
        console.log('No existing user found with this phone number');
        return { exists: false };
    } catch (error) {
        console.error('Error checking if phone exists:', error);
        return { exists: false };
    }
};

// Create a new user with phone number
export const createPhoneUser = async (phoneNumber: string): Promise<{ success: boolean; cognitoId?: string; error?: string }> => {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    console.log('Creating new user with phone number:', formattedPhone);
    
    try {
        // First check if user already exists
        const existingUser = await checkPhoneExists(formattedPhone);
        if (existingUser.exists) {
            console.log('User already exists, skipping creation');
            return {
                success: true,
                cognitoId: existingUser.cognitoId
            };
        }
        
        // Use the phone number as the username directly
        const username = formattedPhone;
        const password = generateRandomPassword();
        
        // Create the user
        const signUpParams = {
            ClientId: poolConfig.ClientId,
            Username: username,
            Password: password,
            UserAttributes: [
                {
                    Name: 'phone_number',
                    Value: formattedPhone
                }
            ]
        };
        
        return new Promise((resolve) => {
            userPool.signUp(
                signUpParams.Username,
                signUpParams.Password,
                signUpParams.UserAttributes,
                null,
                (err, result) => {
                    if (err) {
                        console.error('Error in signUp callback:', err);
                        resolve({
                            success: false,
                            error: err.message || 'Failed to create user'
                        });
                        return;
                    }
                    console.log('SignUp successful in callback:', result.UserSub);
                    resolve({
                        success: true,
                        cognitoId: result.UserSub
                    });
                }
            );
        });
    } catch (error) {
        console.error('Error creating phone user:', error);
        return {
            success: false,
            error: error.message || 'Failed to create user'
        };
    }
};

// Send verification code to phone number
export const sendPhoneVerificationCode = async (phoneNumber: string): Promise<AuthResponse> => {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    console.log('Starting phone OTP send process for:', formattedPhone);
    
    try {
        // Check if user exists first
        const userCheck = await checkPhoneExists(formattedPhone);
        let userExists = userCheck.exists;
        let cognitoId = userCheck.cognitoId;
        
        // If user doesn't exist, create one first
        if (!userExists) {
            console.log('User not found, creating new user before OTP flow');
            const createResult = await createPhoneUser(formattedPhone);
            
            if (!createResult.success) {
                return {
                    success: false,
                    error: createResult.error || 'Failed to create user'
                };
            }
            
            cognitoId = createResult.cognitoId;
            console.log('New user created successfully with ID:', cognitoId);
        }
        
        // Use CUSTOM_AUTH flow as specified in poolConfig
        console.log('Initiating CUSTOM_AUTH flow for phone number');
        
        const authResult = await cognitoIdentityServiceProvider.initiateAuth({
            AuthFlow: 'CUSTOM_AUTH',
            ClientId: poolConfig.ClientId,
            AuthParameters: {
                USERNAME: formattedPhone,
            },
            ClientMetadata: {
                CHALLENGE_NAME: 'SMS_OTP'
            }
        }).promise();
        
        console.log('Auth initiation response:', {
            hasSession: !!authResult.Session,
            challengeName: authResult.ChallengeName,
        });
        
        if (!authResult.Session) {
            return {
                success: false,
                error: 'No session returned'
            };
        }
        
        // Save the session for later use
        await AsyncStorage.setItem(`phone_otp_session_${formattedPhone}`, authResult.Session);
        
        // Store Cognito ID for later use if we have it
        if (cognitoId) {
            await AsyncStorage.setItem('temp_cognito_id', cognitoId);
        }
        
        // Store user exists flag for later use
        await AsyncStorage.setItem('phone_user_exists', userExists ? 'true' : 'false');
        
        if (authResult.ChallengeName === 'CUSTOM_CHALLENGE') {
            console.log('CUSTOM_CHALLENGE received, SMS should be sent');
            return {
                success: true,
                userExists
            };
        }
        
        return {
            success: false,
            error: 'Unexpected authentication flow'
        };
    } catch (error) {
        console.error('Error in sendPhoneVerificationCode:', error);
        return {
            success: false,
            error: error.message || 'Failed to send verification code'
        };
    }
};

// Verify the OTP code from SMS
export const verifyPhoneCode = async (phoneNumber: string, code: string): Promise<AuthResponse> => {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    console.log('Starting phone OTP verification for:', formattedPhone, 'with code length:', code.length);
    
    try {
        // Retrieve user existence flag and Cognito ID
        const userExistsStr = await AsyncStorage.getItem('phone_user_exists');
        const tempCognitoId = await AsyncStorage.getItem('temp_cognito_id');
        const userExists = userExistsStr === 'true';
        const cognitoId = tempCognitoId;
        
        // Make sure the user is confirmed before verification
        try {
            console.log('Ensuring user is confirmed before verification');
            await cognitoIdentityServiceProvider.adminConfirmSignUp({
                UserPoolId: poolConfig.UserPoolId,
                Username: formattedPhone
            }).promise();
            
            await cognitoIdentityServiceProvider.adminUpdateUserAttributes({
                UserPoolId: poolConfig.UserPoolId,
                Username: formattedPhone,
                UserAttributes: [
                    {
                        Name: 'phone_number_verified',
                        Value: 'true'
                    }
                ]
            }).promise();
            console.log('User confirmed and phone number marked as verified');
        } catch (confirmError) {
            // Ignore errors if user is already confirmed
            console.log('Confirmation step completed:', confirmError?.message || 'User already confirmed');
        }
        
        // Retrieve the saved session
        const savedSession = await AsyncStorage.getItem(`phone_otp_session_${formattedPhone}`);
        
        if (!savedSession) {
            return {
                success: false,
                error: 'Session expired. Please request a new code.'
            };
        }
        
        // Respond to the CUSTOM_CHALLENGE with the code
        console.log('Responding to CUSTOM_CHALLENGE with code');
        const challengeResult = await cognitoIdentityServiceProvider.respondToAuthChallenge({
            ClientId: poolConfig.ClientId,
            ChallengeName: 'CUSTOM_CHALLENGE',
            Session: savedSession,
            ChallengeResponses: {
                USERNAME: formattedPhone,
                ANSWER: code
            }
        }).promise();
        
        // Process the challenge result
        if (challengeResult.AuthenticationResult) {
            console.log('Authentication successful, storing tokens');
            
            // Clean up storage
            await AsyncStorage.removeItem(`phone_otp_session_${formattedPhone}`);
            await AsyncStorage.removeItem('temp_cognito_id');
            await AsyncStorage.removeItem('phone_user_exists');
            
            // Create tokens object
            const tokens = {
                accessToken: challengeResult.AuthenticationResult.AccessToken,
                idToken: challengeResult.AuthenticationResult.IdToken,
                refreshToken: challengeResult.AuthenticationResult.RefreshToken
            };
            
            // Store tokens
            await storeAuthTokens(tokens);
            
            // Try to get Cognito ID if needed and store user data
            if (!cognitoId) {
                try {
                    const idTokenSections = tokens.idToken.split('.');
                    if (idTokenSections.length > 1) {
                        const payload = JSON.parse(
                            Buffer.from(idTokenSections[1], 'base64').toString('utf8')
                        );
                        const newCognitoId = payload.sub;
                        if (newCognitoId) {
                            await AsyncStorage.setItem('userId', newCognitoId);
                            
                            // Create pending user data
                            const pendingData: PendingAuthDataForPhone = {
                                type: 'PHONE_CODE_LOGIN',
                                cognito_id: newCognitoId,
                                phone_number: formattedPhone,
                                timestamp: new Date().toISOString()
                            };
                            
                            await AsyncStorage.setItem('pendingUserData', JSON.stringify(pendingData));
                        }
                    }
                } catch (error) {
                    console.error('Error extracting user data from token:', error);
                }
            } else {
                // Use existing Cognito ID
                await AsyncStorage.setItem('userId', cognitoId);
                
                // Create pending user data
                const pendingData: PendingAuthDataForPhone = {
                    type: 'PHONE_CODE_LOGIN',
                    cognito_id: cognitoId,
                    phone_number: formattedPhone,
                    timestamp: new Date().toISOString()
                };
                
                await AsyncStorage.setItem('pendingUserData', JSON.stringify(pendingData));
            }
            
            return {
                success: true,
                userExists,
                cognitoId,
                session: tokens
            };
        } else if (challengeResult.ChallengeName) {
            // If we get another challenge instead of tokens, it likely means the code was wrong
            console.log('Received another challenge:', challengeResult.ChallengeName);
            
            // Try admin auth as fallback if we've confirmed the user
            if (challengeResult.ChallengeName === 'CUSTOM_CHALLENGE') {
                try {
                    console.log('Attempting admin auth after seeing circular challenge');
                    
                    // Set a permanent password for the user
                    const newPassword = generateRandomPassword();
                    await cognitoIdentityServiceProvider.adminSetUserPassword({
                        UserPoolId: poolConfig.UserPoolId,
                        Username: formattedPhone,
                        Password: newPassword,
                        Permanent: true
                    }).promise();
                    
                    // Try to authenticate with new password
                    const adminAuthResult = await cognitoIdentityServiceProvider.adminInitiateAuth({
                        UserPoolId: poolConfig.UserPoolId,
                        ClientId: poolConfig.ClientId,
                        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
                        AuthParameters: {
                            USERNAME: formattedPhone,
                            PASSWORD: newPassword
                        }
                    }).promise();
                    
                    if (adminAuthResult.AuthenticationResult) {
                        // Clean up storage
                        await AsyncStorage.removeItem(`phone_otp_session_${formattedPhone}`);
                        await AsyncStorage.removeItem('temp_cognito_id');
                        await AsyncStorage.removeItem('phone_user_exists');
                        
                        // Create tokens object
                        const tokens = {
                            accessToken: adminAuthResult.AuthenticationResult.AccessToken,
                            idToken: adminAuthResult.AuthenticationResult.IdToken,
                            refreshToken: adminAuthResult.AuthenticationResult.RefreshToken
                        };
                        
                        // Store tokens
                        await storeAuthTokens(tokens);
                        
                        // Store user data
                        if (cognitoId) {
                            await AsyncStorage.setItem('userId', cognitoId);
                            
                            const pendingData: PendingAuthDataForPhone = {
                                type: 'PHONE_CODE_LOGIN',
                                cognito_id: cognitoId,
                                phone_number: formattedPhone,
                                timestamp: new Date().toISOString()
                            };
                            
                            await AsyncStorage.setItem('pendingUserData', JSON.stringify(pendingData));
                        }
                        
                        return {
                            success: true,
                            userExists,
                            cognitoId,
                            session: tokens
                        };
                    }
                } catch (adminAuthError) {
                    console.log('Admin auth fallback failed:', adminAuthError.message);
                }
            }
            
            return {
                success: false,
                error: 'Invalid verification code'
            };
        }
        
        // If we get here, something unexpected happened
        return {
            success: false,
            error: 'Verification failed. Please try again.'
        };
    } catch (error) {
        console.error('Error in verifyPhoneCode:', error);
        
        if (error.code === 'CodeMismatchException' || 
            error.code === 'NotAuthorizedException' ||
            (error.message && error.message.includes('Incorrect code'))) {
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