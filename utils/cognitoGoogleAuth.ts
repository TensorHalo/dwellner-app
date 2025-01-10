import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Initialize WebBrowser
WebBrowser.maybeCompleteAuthSession();

// Configuration
const CONFIG = {
    COGNITO_DOMAIN: 'https://us-east-1whcek9kp8.auth.us-east-1.amazoncognito.com',
    COGNITO_CLIENT_ID: '25lbf1t46emi9b4g51c6du5kkn',
    REDIRECT_URI: 'dwellner-app://example'
};

interface AuthSession {
    accessToken: string;
    idToken: string;
    refreshToken: string;
}

interface AuthResponse {
    success: boolean;
    error?: string;
    session?: AuthSession;
}

export const useGoogleAuth = () => {
    const signInWithGoogle = async (): Promise<AuthResponse> => {
        try {
            // Construct auth URL with properly formatted scopes
            const authUrlParams = new URLSearchParams({
                client_id: CONFIG.COGNITO_CLIENT_ID,
                response_type: 'code',
                scope: 'openid profile email',  // Changed order and removed +
                redirect_uri: CONFIG.REDIRECT_URI,
                identity_provider: 'Google'
            });

            const authUrl = `${CONFIG.COGNITO_DOMAIN}/oauth2/authorize?${authUrlParams.toString()}`;
            
            console.log('Starting auth flow...');
            console.log('Auth URL:', authUrl);
            console.log('Redirect URI:', CONFIG.REDIRECT_URI);

            // Open auth session
            const result = await WebBrowser.openAuthSessionAsync(
                authUrl,
                CONFIG.REDIRECT_URI,
                {
                    preferEphemeral: true,
                    showInRecents: true
                }
            );

            console.log('Auth Result:', JSON.stringify(result, null, 2));

            if (result.type === 'success' && result.url) {
                const url = new URL(result.url);
                
                // Check for error in redirect URL
                const error = url.searchParams.get('error');
                const errorDescription = url.searchParams.get('error_description');
                
                if (error || errorDescription) {
                    throw new Error(errorDescription || error || 'Authentication failed');
                }

                const code = url.searchParams.get('code');
                if (!code) {
                    throw new Error('No authorization code received');
                }

                console.log('Exchanging code for tokens...');

                // Exchange code for tokens
                const tokenResponse = await fetch(`${CONFIG.COGNITO_DOMAIN}/oauth2/token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        grant_type: 'authorization_code',
                        client_id: CONFIG.COGNITO_CLIENT_ID,
                        redirect_uri: CONFIG.REDIRECT_URI,
                        code
                    }).toString()
                });

                const tokens = await tokenResponse.json();
                console.log('Token response status:', tokenResponse.status);

                if (!tokenResponse.ok) {
                    throw new Error(tokens.error || 'Token exchange failed');
                }

                // Store tokens
                const sessionData = {
                    accessToken: tokens.access_token,
                    idToken: tokens.id_token,
                    refreshToken: tokens.refresh_token
                };

                await AsyncStorage.setItem('auth_tokens', JSON.stringify(sessionData));

                return {
                    success: true,
                    session: sessionData
                };
            }

            if (result.type === 'cancel') {
                return {
                    success: false,
                    error: 'Sign in was cancelled'
                };
            }

            throw new Error('Authentication failed');
        } catch (error: any) {
            console.error('Sign in error:', error);
            return {
                success: false,
                error: error.message || 'Failed to sign in'
            };
        }
    };

    const getStoredSession = async (): Promise<AuthSession | null> => {
        try {
            const tokens = await AsyncStorage.getItem('auth_tokens');
            return tokens ? JSON.parse(tokens) : null;
        } catch (error) {
            console.error('Get session error:', error);
            return null;
        }
    };

    const signOut = async (): Promise<void> => {
        try {
            await AsyncStorage.removeItem('auth_tokens');
        } catch (error) {
            console.error('Sign out error:', error);
        }
    };

    return {
        signInWithGoogle,
        getStoredSession,
        signOut
    };
};