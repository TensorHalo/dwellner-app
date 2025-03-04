// @/utils/cognitoGoogleAuth.ts
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storeAuthTokens } from '@/utils/authTokens';

// Ensure WebBrowser can handle redirects
WebBrowser.maybeCompleteAuthSession();

// Configuration constants
const CONFIG = {
  COGNITO_DOMAIN: "https://us-east-1whcek9kp8.auth.us-east-1.amazoncognito.com",
  COGNITO_CLIENT_ID: "25lbf1t46emi9b4g51c6du5kkn",
  REDIRECT_URI: "camila://oauth"
};

// Store last auth state
const GOOGLE_AUTH_STATE_KEY = 'google_auth_state';

// Interfaces
interface AuthSession {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

interface AuthResponse {
  success: boolean;
  error?: string;
  session?: AuthSession;
  isNewUser?: boolean;
}

export const useGoogleAuth = () => {
  // Exchange authorization code for tokens
  const exchangeCodeForTokens = async (code: string): Promise<any> => {
    try {
      console.log('Exchanging code for tokens...');
      
      const tokenEndpoint = `${CONFIG.COGNITO_DOMAIN}/oauth2/token`;
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CONFIG.COGNITO_CLIENT_ID,
        code: code,
        redirect_uri: CONFIG.REDIRECT_URI
      });
      
      console.log('Token exchange params:', params.toString());
      
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });
      
      console.log('Token exchange response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Token exchange failed:', errorText);
        throw new Error(`Token exchange failed: ${errorText}`);
      }
      
      const tokenData = await response.json();
      console.log('Token exchange successful. Received tokens.');
      return tokenData;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw error;
    }
  };
  
  // Generate a random string for state parameter
  const generateRandomState = (): string => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };
  
  // Main sign-in function - direct to Google
  const signInWithGoogle = async (): Promise<AuthResponse> => {
    try {
      console.log('Starting Google auth flow...');
      
      // Close any open auth sessions
      try {
        await WebBrowser.dismissAuthSession();
      } catch (e) {
        console.log('No active auth session to dismiss');
      }
      
      // Generate a unique state parameter for this auth request
      const state = generateRandomState();
      await AsyncStorage.setItem(GOOGLE_AUTH_STATE_KEY, state);
      
      // Current timestamp to prevent caching
      const timestamp = Date.now();
      
      // Modified URL with multiple parameters to force account selection
      const authUrl = `${CONFIG.COGNITO_DOMAIN}/oauth2/authorize?` +
        `identity_provider=Google` +
        `&client_id=${CONFIG.COGNITO_CLIENT_ID}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(CONFIG.REDIRECT_URI)}` +
        `&scope=email+openid+phone` +
        `&prompt=select_account` + // Force account selection
        `&login_hint=` + // Clear login hint
        `&state=${state}` + // Add state parameter for security
        `&max_age=0` + // Force re-authentication
        `&ts=${timestamp}`; // Cache busting
      
      console.log('Auth URL:', authUrl);
      
      // Open the auth URL in browser
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        CONFIG.REDIRECT_URI,
        {
          preferEphemeral: true,
          showInRecents: false,
          dismissButtonStyle: 'cancel',
          toolbarColor: '#54B4AF'
        }
      );
      
      console.log('Browser result:', JSON.stringify(result));
      
      // Handle the response
      if (result.type === 'success' && result.url) {
        console.log('Successful redirect URL:', result.url);
        
        // Extract code from redirect URL
        const urlObj = new URL(result.url);
        const code = urlObj.searchParams.get('code');
        const returnedState = urlObj.searchParams.get('state');
        
        // Verify state parameter matches
        const storedState = await AsyncStorage.getItem(GOOGLE_AUTH_STATE_KEY);
        if (returnedState && storedState && returnedState !== storedState) {
          console.error('State parameter mismatch - possible CSRF attack');
          return {
            success: false,
            error: 'Authentication failed: state parameter mismatch'
          };
        }
        
        if (!code) {
          console.error('No code found in redirect URL');
          return {
            success: false,
            error: 'No authorization code received'
          };
        }
        
        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(code);
        
        // Create session object using the correct token keys from Cognito
        const sessionData = {
          accessToken: tokens.access_token,
          idToken: tokens.id_token,
          refreshToken: tokens.refresh_token
        };
        
        // Store the tokens using the existing mechanism
        await storeAuthTokens(sessionData);
        console.log('Auth tokens stored successfully');
        
        return {
          success: true,
          session: sessionData,
          isNewUser: false
        };
      }
      
      // Handle cancellation
      if (result.type === 'cancel' || result.type === 'dismiss') {
        console.log('Auth cancelled by user');
        return {
          success: false,
          error: 'Authentication was cancelled'
        };
      }
      
      return {
        success: false,
        error: 'Authentication failed for an unknown reason'
      };
    } catch (error: any) {
      console.error('Google auth error:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred'
      };
    } finally {
      // Clean up state parameter
      await AsyncStorage.removeItem(GOOGLE_AUTH_STATE_KEY);
    }
  };
  
  // Sign out
  const signOut = async (): Promise<void> => {
    try {
      await WebBrowser.dismissAuthSession();
      console.log('Sign out complete');
    } catch (error) {
      console.error('Error during sign out:', error);
    }
  };
  
  return {
    signInWithGoogle,
    signOut
  };
};