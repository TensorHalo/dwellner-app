import { doc, setDoc, getDoc, Timestamp, writeBatch, increment } from 'firebase/firestore';
import { db } from './firebase-config';

export interface UserData {
    userId: string;      // Can be email, phone number, or Google ID
    authType: 'email' | 'phone' | 'google';
    email?: string;
    phoneNumber?: string;
    name: string;
    avatarUrl: string;
    isPro: boolean;
    createdAt: Date;
    lastLoginAt: Date;
    loginCount: number;
}

export const generateDefaultUsername = (identifier: string): string => {
    return 'user_' + Math.random().toString(36).substring(2, 8);
};

export const createUserProfile = async (
    userId: string,
    authType: UserData['authType'],
    data: {
        email?: string;
        phoneNumber?: string;
        name?: string;
        avatarUrl?: string;
    }
): Promise<void> => {
    const userRef = doc(db, 'users', userId);
    
    const userData: UserData = {
        userId,
        authType,
        email: data.email || '',
        phoneNumber: data.phoneNumber || '',
        name: data.name || generateDefaultUsername(userId),
        avatarUrl: data.avatarUrl || '',
        isPro: false,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        loginCount: 1
    };

    await setDoc(userRef, userData);
};

export const updateLoginHistory = async (userId: string): Promise<void> => {
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', userId);
    const loginHistoryRef = doc(db, 'loginHistory', userId);
    
    batch.set(loginHistoryRef, {
        lastLoginAt: new Date(),
        userId,
        loginCount: increment(1)
    }, { merge: true });

    batch.update(userRef, {
        lastLoginAt: new Date(),
        loginCount: increment(1)
    });

    await batch.commit();
};

export const getUserProfile = async (userId: string): Promise<UserData | null> => {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
        return null;
    }
    
    return userDoc.data() as UserData;
};

export const updateUserProfile = async (
    userId: string,
    updates: Partial<Pick<UserData, 'name' | 'avatarUrl' | 'email' | 'phoneNumber'>>
) => {
    if (!userId) throw new Error('No user ID provided');
    
    const userRef = doc(db, 'users', userId);
    
    try {
        let finalUpdates = {...updates};
        if (updates.avatarUrl?.startsWith('file://')) {
            finalUpdates.avatarUrl = updates.avatarUrl;
        }
        
        await setDoc(userRef, {
            ...finalUpdates,
            updatedAt: new Date()
        }, { merge: true });
        
        console.log('Profile updated successfully:', finalUpdates);
    } catch (error) {
        console.error('Error in updateUserProfile:', error);
        throw error;
    }
};

export const checkUserStatus = async (userId: string): Promise<{ 
    isNewUser: boolean; 
    hasCompletedOnboarding: boolean;
    error?: string 
}> => {
    try {
        const userProfile = await getUserProfile(userId);
        
        if (!userProfile) {
            return {
                isNewUser: true,
                hasCompletedOnboarding: false
            };
        }

        await updateLoginHistory(userId);

        return {
            isNewUser: false,
            hasCompletedOnboarding: Boolean(userProfile.name !== generateDefaultUsername(userId))
        };
    } catch (error) {
        console.error('Error checking user status:', error);
        return {
            isNewUser: false,
            hasCompletedOnboarding: false,
            error: 'Failed to check user status'
        };
    }
};