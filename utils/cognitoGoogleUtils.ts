// @/utils/cognitoGoogleUtils.ts
import { fromByteArray, toByteArray } from 'base64-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCognitoUserId } from './cognitoConfig';
import { PendingAuthData, DynamoDBUserRecord } from '@/types/user';
import { getAuthTokens } from './authTokens';

// Base64 decoding function that works in React Native
function base64DecodeUnicode(str: string): string {
  try {
    // First, make sure we have a properly padded base64 string
    const paddedStr = str.replace(/-/g, '+').replace(/_/g, '/');
    const padding = paddedStr.length % 4;
    const normalizedStr = padding ? 
      paddedStr + '='.repeat(4 - padding) : 
      paddedStr;
    
    // Convert to bytes using base64-js
    const bytes = toByteArray(normalizedStr);
    
    // Convert bytes to string using a method that works in React Native
    return decodeURIComponent(
      bytes.reduce((acc, byte) => {
        return acc + '%' + ('00' + byte.toString(16)).slice(-2);
      }, '')
    );
  } catch (error) {
    console.error('Error in base64DecodeUnicode:', error);
    throw error;
  }
}

// Extract user info from JWT token
export const extractUserInfoFromIdToken = (idToken: string): {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  'cognito:username'?: string;
  'custom:is_new_user'?: string;
} | null => {
  try {
    // JWT format: header.payload.signature
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      console.error('Invalid token format');
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    console.log('Decoding JWT payload part');
    const decodedPayload = base64DecodeUnicode(payload);
    console.log('Successfully decoded payload');
    const parsedPayload = JSON.parse(decodedPayload);
    console.log('Parsed payload:', parsedPayload);

    // Extract the needed fields
    const userInfo = {
      sub: parsedPayload.sub,
      email: parsedPayload.email,
      email_verified: parsedPayload.email_verified,
      name: parsedPayload.name,
      'cognito:username': parsedPayload['cognito:username'],
      'custom:is_new_user': parsedPayload['custom:is_new_user']
    };
    
    console.log('Extracted user info from token:', userInfo);
    return userInfo;
  } catch (error) {
    console.error('Error extracting user info from token:', error);
    return null;
  }
};

// Check if this is a new Google user
export const checkIsNewGoogleUser = async (): Promise<boolean> => {
  try {
    // Get stored tokens
    const tokens = await getAuthTokens();
    if (!tokens || !tokens.idToken) {
      console.error('No valid ID token found');
      return false;
    }

    // Extract user info from ID token
    const userInfo = extractUserInfoFromIdToken(tokens.idToken);
    if (!userInfo) {
      console.error('Could not extract user info from token');
      return false;
    }

    // Check for custom attribute in token that indicates new user
    if (userInfo['custom:is_new_user'] === 'true') {
      return true;
    }

    // By default, assume it's not a new user if we can't determine
    return false;
  } catch (error) {
    console.error('Error checking if Google user is new:', error);
    return false;
  }
};

// Save Google user info for pending processing
export const storePendingGoogleUserData = async (
  isNewUser: boolean,
  googleId: string,
  email: string
): Promise<void> => {
  try {
    const now = new Date();
    
    if (isNewUser) {
      // For new users, we'll need to collect their info later
      const pendingData: PendingAuthData = {
        type: 'GOOGLE_SIGNUP',
        cognito_id: googleId,
        email: email,
        google_id: googleId,
        timestamp: now.toISOString()
      };
      
      await AsyncStorage.setItem('pendingUserData', JSON.stringify(pendingData));
      console.log('Stored pending data for new Google user');
    } else {
      // For existing users, update login timestamp
      const pendingData: PendingAuthData = {
        type: 'GOOGLE_SIGNIN',
        cognito_id: googleId,
        email: email,
        google_id: googleId,
        timestamp: now.toISOString()
      };
      
      await AsyncStorage.setItem('pendingUserData', JSON.stringify(pendingData));
      console.log('Stored pending data for existing Google user');
    }
  } catch (error) {
    console.error('Error storing pending Google user data:', error);
    throw error;
  }
};

// Prepare user data structure with Google auth info
export const prepareGoogleUserDataForDB = (
  cognitoId: string,
  email: string,
  googleId: string,
  userInfo: any
): DynamoDBUserRecord => {
  const now = new Date();
  
  return {
    cognito_id: cognitoId,
    auth_methods: {
      google: {
        google_id: googleId,
        google_email: email,
        last_login_date: now,
        auth_metadata: {
          last_successful_login: now.toISOString(),
          failed_attempts_count: 0
        }
      }
    },
    profile: {
      name: userInfo.name,
      user_type: userInfo.user_type,
      date_of_birth: userInfo.date_of_birth,
      registration_date: now
    },
    is_pro: false
  };
};