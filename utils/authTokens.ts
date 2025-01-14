// @/utils/authTokens.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AuthTokens {
    accessToken: string;
    idToken: string;
    refreshToken: string;
}

export const storeAuthTokens = async (tokens: AuthTokens): Promise<void> => {
    try {
        await AsyncStorage.setItem('auth_tokens', JSON.stringify(tokens));
        console.log('Auth tokens stored successfully');
    } catch (error) {
        console.error('Error storing auth tokens:', error);
        throw error;
    }
};

export const getAuthTokens = async (): Promise<AuthTokens | null> => {
    try {
        const tokens = await AsyncStorage.getItem('auth_tokens');
        return tokens ? JSON.parse(tokens) : null;
    } catch (error) {
        console.error('Error retrieving auth tokens:', error);
        return null;
    }
};

export const removeAuthTokens = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem('auth_tokens');
        console.log('Auth tokens removed successfully');
    } catch (error) {
        console.error('Error removing auth tokens:', error);
        throw error;
    }
};