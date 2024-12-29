import { CognitoUserPool, CognitoUser, AuthenticationDetails, CognitoUserAttribute } from 'amazon-cognito-identity-js';

// Cognito Configuration
const poolConfig = {
    UserPoolId: 'ca-central-1_SU1CkywRI',
    ClientId: '2jq4ra1nagnurhvecbn9gmaj04'
};

// Initialize the user pool with explicit region
const userPool = new CognitoUserPool({
    ...poolConfig,
    Region: 'ca-central-1'
});

// Interface for authentication responses
interface AuthResponse {
    success?: boolean;
    error?: string;
    user?: any;
    exists?: boolean;
    confirmed?: boolean;
}

/**
 * Check if a user exists and their status in Cognito
 */
export const checkUserExists = async (email: string): Promise<AuthResponse> => {
    console.log('Checking user status:', email);
    
    return new Promise((resolve) => {
        const userData = {
            Username: email.toLowerCase(),
            Pool: userPool
        };

        const cognitoUser = new CognitoUser(userData);
        const authDetails = new AuthenticationDetails({
            Username: email.toLowerCase(),
            Password: 'dummyPassword123!' // Dummy password to trigger auth flow
        });

        cognitoUser.authenticateUser(authDetails, {
            onSuccess: () => {
                // This should never happen with dummy password
                console.log('User exists and is confirmed');
                resolve({ exists: true, confirmed: true });
            },
            onFailure: (err) => {
                console.log('Authentication check response:', err);
                
                switch (err.code) {
                    case 'UserNotFoundException':
                        console.log('User does not exist');
                        resolve({ exists: false, confirmed: false });
                        break;
                        
                    case 'UserNotConfirmedException':
                        console.log('User exists but is not confirmed');
                        resolve({ exists: true, confirmed: false });
                        break;
                        
                    case 'NotAuthorizedException':
                        // Wrong password means user exists and is confirmed
                        console.log('User exists and is confirmed');
                        resolve({ exists: true, confirmed: true });
                        break;
                        
                    case 'PasswordResetRequiredException':
                        console.log('User exists but needs password reset');
                        resolve({ exists: true, confirmed: true });
                        break;
                        
                    default:
                        console.log('Unexpected error:', err);
                        // Handle rate limiting and other errors gracefully
                        resolve({ 
                            error: 'Unable to check user status. Please try again later.',
                            exists: false,
                            confirmed: false
                        });
                }
            }
        });
    });
};

/**
 * Sign up a new user in Cognito
 */
export const signUp = async (email: string, password: string): Promise<AuthResponse> => {
    console.log('Starting signup process for:', email);

    // First check if user already exists
    const userStatus = await checkUserExists(email);
    
    if (userStatus.exists && userStatus.confirmed) {
        return {
            success: false,
            error: 'An account with this email already exists',
            exists: true,
            confirmed: true
        };
    }

    return new Promise((resolve) => {
        const attributeList = [
            new CognitoUserAttribute({
                Name: 'email',
                Value: email.toLowerCase()
            })
        ];

        userPool.signUp(email.toLowerCase(), password, attributeList, [], (err, result) => {
            if (err) {
                console.error('Signup error:', err);
                resolve({
                    success: false,
                    error: err.message || 'An error occurred during signup'
                });
                return;
            }

            console.log('Signup successful:', result);
            resolve({
                success: true,
                user: result?.user,
                exists: true,
                confirmed: false
            });
        });
    });
};

/**
 * Sign in an existing user
 */
export const signIn = async (email: string, password: string): Promise<AuthResponse> => {
    console.log('Starting signin process for:', email);

    return new Promise((resolve) => {
        const userData = {
            Username: email.toLowerCase(),
            Pool: userPool
        };

        const cognitoUser = new CognitoUser(userData);
        const authDetails = new AuthenticationDetails({
            Username: email.toLowerCase(),
            Password: password
        });

        cognitoUser.authenticateUser(authDetails, {
            onSuccess: (result) => {
                console.log('Authentication successful');
                resolve({
                    success: true,
                    user: cognitoUser,
                    confirmed: true
                });
            },
            onFailure: (err) => {
                console.error('Authentication error:', err);
                
                switch (err.code) {
                    case 'UserNotConfirmedException':
                        resolve({
                            success: false,
                            error: 'Please verify your email first',
                            exists: true,
                            confirmed: false
                        });
                        break;
                        
                    case 'NotAuthorizedException':
                        resolve({
                            success: false,
                            error: 'Incorrect email or password',
                            exists: true,
                            confirmed: true
                        });
                        break;
                        
                    case 'UserNotFoundException':
                        resolve({
                            success: false,
                            error: 'Incorrect email or password',
                            exists: false,
                            confirmed: false
                        });
                        break;
                        
                    default:
                        resolve({
                            success: false,
                            error: 'An error occurred during sign in. Please try again.',
                            confirmed: false
                        });
                }
            }
        });
    });
};

/**
 * Confirm user signup with verification code
 */
export const confirmSignUp = async (email: string, code: string): Promise<AuthResponse> => {
    console.log('Starting signup confirmation for:', email);

    return new Promise((resolve) => {
        const userData = {
            Username: email.toLowerCase(),
            Pool: userPool
        };

        const cognitoUser = new CognitoUser(userData);

        cognitoUser.confirmRegistration(code, true, (err, result) => {
            if (err) {
                console.error('Confirmation error:', err);
                
                if (err.code === 'ExpiredCodeException') {
                    resolve({
                        success: false,
                        error: 'Verification code has expired. Please request a new one.'
                    });
                } else if (err.code === 'CodeMismatchException') {
                    resolve({
                        success: false,
                        error: 'Invalid verification code. Please try again.'
                    });
                } else {
                    resolve({
                        success: false,
                        error: 'Failed to verify code. Please try again.'
                    });
                }
                return;
            }

            console.log('Confirmation successful:', result);
            resolve({
                success: true,
                confirmed: true
            });
        });
    });
};

/**
 * Request a new verification code
 */
export const resendVerificationCode = async (email: string): Promise<AuthResponse> => {
    console.log('Requesting new verification code for:', email);

    return new Promise((resolve) => {
        const userData = {
            Username: email.toLowerCase(),
            Pool: userPool
        };

        const cognitoUser = new CognitoUser(userData);

        cognitoUser.resendConfirmationCode((err, result) => {
            if (err) {
                console.error('Error resending code:', err);
                
                if (err.code === 'LimitExceededException') {
                    resolve({
                        success: false,
                        error: 'Too many attempts. Please try again later.'
                    });
                } else {
                    resolve({
                        success: false,
                        error: 'Failed to send verification code. Please try again.'
                    });
                }
                return;
            }

            console.log('Code resent successfully:', result);
            resolve({
                success: true
            });
        });
    });
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<void> => {
    const currentUser = userPool.getCurrentUser();
    if (currentUser) {
        console.log('Signing out user');
        currentUser.signOut();
    }
};