// @/utils/authPersistence.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cognitoIdentityServiceProvider, poolConfig } from '@/utils/cognitoConfig';

const AUTH_PERSISTENCE_KEYS = {
    LAST_EMAIL: 'last_used_email',
    CREDENTIALS: 'stored_credentials',
    LAST_LOGIN: 'last_login_timestamp'
};

// 7 days in milliseconds for credentials expiry
const CREDENTIALS_EXPIRY = 7 * 24 * 60 * 60 * 1000;

interface StoredCredentials {
    email: string;
    password: string;
    timestamp: number;
}

export const saveAuthCredentials = async (email: string, password: string) => {
    try {
        const credentials: StoredCredentials = {
            email: email.toLowerCase(),
            password,
            timestamp: Date.now()
        };
        
        await Promise.all([
            AsyncStorage.setItem(AUTH_PERSISTENCE_KEYS.CREDENTIALS, JSON.stringify(credentials)),
            AsyncStorage.setItem(AUTH_PERSISTENCE_KEYS.LAST_EMAIL, email.toLowerCase()),
            AsyncStorage.setItem(AUTH_PERSISTENCE_KEYS.LAST_LOGIN, new Date().toISOString())
        ]);
        
        console.log('Credentials saved successfully for:', email);
    } catch (error) {
        console.error('Error saving credentials:', error);
        throw error;
    }
};

export const getStoredCredentials = async (): Promise<StoredCredentials | null> => {
    try {
        const storedData = await AsyncStorage.getItem(AUTH_PERSISTENCE_KEYS.CREDENTIALS);
        if (!storedData) {
            console.log('No stored credentials found');
            return null;
        }

        const credentials: StoredCredentials = JSON.parse(storedData);
        const now = Date.now();

        // Check if credentials have expired
        if (now - credentials.timestamp > CREDENTIALS_EXPIRY) {
            console.log('Stored credentials have expired');
            await AsyncStorage.removeItem(AUTH_PERSISTENCE_KEYS.CREDENTIALS);
            return null;
        }

        console.log('Found valid stored credentials for:', credentials.email);
        return credentials;
    } catch (error) {
        console.error('Error getting stored credentials:', error);
        return null;
    }
};

export const getLastUsedEmail = async (): Promise<string | null> => {
    try {
        const email = await AsyncStorage.getItem(AUTH_PERSISTENCE_KEYS.LAST_EMAIL);
        console.log('Last used email:', email);
        return email;
    } catch (error) {
        console.error('Error getting last used email:', error);
        return null;
    }
};

export const clearAuthPersistenceData = async () => {
    try {
        await AsyncStorage.multiRemove([
            AUTH_PERSISTENCE_KEYS.CREDENTIALS,
            AUTH_PERSISTENCE_KEYS.LAST_LOGIN
        ]);
        console.log('Auth persistence data cleared');
    } catch (error) {
        console.error('Error clearing auth persistence data:', error);
        throw error;
    }
};