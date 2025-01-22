// @/utils/cognitoGoogleAuth.ts
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const CONFIG = {
    COGNITO_DOMAIN: 'https://us-east-1whcek9kp8.auth.us-east-1.amazoncognito.com',
    COGNITO_CLIENT_ID: '25lbf1t46emi9b4g51c6du5kkn',
    COGNITO_REDIRECT_URI: 'https://us-east-1whcek9kp8.auth.us-east-1.amazoncognito.com/oauth2/idpresponse',
    APP_REDIRECT_URI: 'camila://oauth',
    SCOPE: 'email openid phone profile'
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
            console.log('Starting auth flow with config:', {
                domain: CONFIG.COGNITO_DOMAIN,
                clientId: CONFIG.COGNITO_CLIENT_ID,
                cognitoRedirect: CONFIG.COGNITO_REDIRECT_URI,
                appRedirect: CONFIG.APP_REDIRECT_URI
            });

            // Construct the initial Cognito hosted UI URL exactly as seen in web
            const authUrlParams = new URLSearchParams({
                client_id: CONFIG.COGNITO_CLIENT_ID,
                response_type: 'code',
                scope: CONFIG.SCOPE,
                redirect_uri: CONFIG.COGNITO_REDIRECT_URI,
                identity_provider: 'Google'
            });

            const authUrl = `${CONFIG.COGNITO_DOMAIN}/login?${authUrlParams.toString()}`;
            console.log('Initial auth URL:', authUrl);

            // Open the browser with Cognito's login UI
            const result = await WebBrowser.openAuthSessionAsync(
                authUrl,
                CONFIG.APP_REDIRECT_URI,
                {
                    preferEphemeral: true,
                    showInRecents: true
                }
            );

            console.log('Auth session result:', {
                type: result.type,
                url: result.url
            });

            if (result.type === 'success' && result.url) {
                const url = new URL(result.url);
                console.log('Processing redirect URL:', result.url);

                // Check for errors
                const error = url.searchParams.get('error');
                const errorDescription = url.searchParams.get('error_description');
                
                if (error || errorDescription) {
                    console.error('Auth error response:', { error, errorDescription });
                    throw new Error(errorDescription || error || 'Authentication failed');
                }

                const code = url.searchParams.get('code');
                if (!code) {
                    console.error('No code in redirect URL');
                    throw new Error('No authorization code received');
                }

                console.log('Received auth code, exchanging for tokens...');

                // Exchange the code for tokens
                const tokenResponse = await fetch(`${CONFIG.COGNITO_DOMAIN}/oauth2/token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        grant_type: 'authorization_code',
                        client_id: CONFIG.COGNITO_CLIENT_ID,
                        redirect_uri: CONFIG.APP_REDIRECT_URI, // Use app redirect URI here
                        code
                    }).toString()
                });

                if (!tokenResponse.ok) {
                    const errorData = await tokenResponse.json();
                    console.error('Token exchange failed:', errorData);
                    throw new Error(errorData.error || 'Token exchange failed');
                }

                const tokens = await tokenResponse.json();
                console.log('Token exchange successful');

                const sessionData: AuthSession = {
                    accessToken: tokens.access_token,
                    idToken: tokens.id_token,
                    refreshToken: tokens.refresh_token
                };

                await AsyncStorage.setItem('auth_session', JSON.stringify(sessionData));
                return {
                    success: true,
                    session: sessionData
                };
            }

            if (result.type === 'cancel') {
                console.log('Auth session cancelled by user');
                return {
                    success: false,
                    error: 'Sign in was cancelled'
                };
            }

            throw new Error('Authentication failed');
        } catch (error: any) {
            console.error('Auth error:', {
                message: error.message,
                stack: error.stack,
                fullError: JSON.stringify(error, null, 2)
            });
            return {
                success: false,
                error: error.message || 'Failed to sign in'
            };
        }
    };

    const getStoredSession = async (): Promise<AuthSession | null> => {
        try {
            const session = await AsyncStorage.getItem('auth_session');
            return session ? JSON.parse(session) : null;
        } catch (error) {
            console.error('Get session error:', error);
            return null;
        }
    };

    const signOut = async (): Promise<void> => {
        try {
            await AsyncStorage.removeItem('auth_session');
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