import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from './firebase-config';
import { createUserProfile, updateLoginHistory, checkUserStatus } from './userService';

interface VerificationData {
    code: string;
    createdAt: Timestamp;
    attempts: number;
    verified: boolean;
    verifiedAt?: Timestamp;
}

const generateVerificationCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const storeVerificationCode = async (email: string, code: string): Promise<void> => {
    const verificationRef = doc(db, 'verificationCodes', email);
    await setDoc(verificationRef, {
        code,
        createdAt: Timestamp.now(),
        attempts: 0,
        verified: false
    });
};

export const emailSignUp = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const verificationRef = doc(db, 'verificationCodes', email);
        const verificationDoc = await getDoc(verificationRef);
        
        if (verificationDoc.exists()) {
            const data = verificationDoc.data();
            const createdAt = data.createdAt.toDate();
            const timeDiff = (new Date().getTime() - createdAt.getTime()) / 1000;
            
            if (timeDiff < 60 && !data.verified) {
                return {
                    success: false,
                    error: 'A verification code was recently sent. Please wait 1 minute before requesting a new one.'
                };
            }
        }

        try {
            await signInWithEmailAndPassword(auth, email, "dummy-password");
        } catch (authError: any) {
            if (authError.code === 'auth/user-not-found') {
                const tempPassword = Math.random().toString(36).slice(-8);
                await createUserWithEmailAndPassword(auth, email, tempPassword);
            }
        }

        const verificationCode = generateVerificationCode();
        await storeVerificationCode(email, verificationCode);
        
        console.log('Verification code for', email, ':', verificationCode);
        
        return { success: true };
    } catch (error: any) {
        console.error('Error in emailSignUp:', error);
        return {
            success: false,
            error: error.message || 'Failed to process request'
        };
    }
};

export const verifyEmailCode = async (email: string, code: string): Promise<{ 
    success: boolean; 
    isNewUser?: boolean;
    error?: string 
}> => {
    try {
        const verificationRef = doc(db, 'verificationCodes', email);
        const verificationDoc = await getDoc(verificationRef);
        
        if (!verificationDoc.exists()) {
            return { success: false, error: 'No verification code found' };
        }

        const data = verificationDoc.data() as VerificationData;
        const timeDiff = (new Date().getTime() - data.createdAt.toDate().getTime()) / 1000;

        if (timeDiff > 60) {
            return { success: false, error: 'Code expired' };
        }

        if (data.code !== code) {
            await setDoc(verificationRef, {
                ...data,
                attempts: (data.attempts || 0) + 1
            }, { merge: true });
            return { success: false, error: 'Invalid code' };
        }

        const userStatus = await checkUserStatus(email);
        
        if (userStatus.isNewUser) {
            await createUserProfile(email, 'email', { email });
        }

        await setDoc(verificationRef, {
            ...data,
            verified: true,
            verifiedAt: Timestamp.now()
        }, { merge: true });

        return { 
            success: true,
            isNewUser: userStatus.isNewUser
        };
    } catch (error) {
        console.error('Error in verifyEmailCode:', error);
        return { success: false, error: 'Verification failed' };
    }
};

export const resendEmailCode = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const verificationRef = doc(db, 'verificationCodes', email);
        const verificationDoc = await getDoc(verificationRef);
        
        if (verificationDoc.exists()) {
            const data = verificationDoc.data() as VerificationData;
            const timeDiff = (Timestamp.now().toMillis() - data.createdAt.toMillis()) / 1000;
            
            if (timeDiff < 60) {
                return {
                    success: false,
                    error: 'Please wait before requesting a new code.'
                };
            }
        }

        const verificationCode = generateVerificationCode();
        await storeVerificationCode(email, verificationCode);
        
        console.log('New verification code for', email, ':', verificationCode);
        
        return { success: true };
    } catch (error) {
        console.error('Error in resendEmailCode:', error);
        return {
            success: false,
            error: 'Failed to send new code'
        };
    }
};