import { 
    PhoneAuthProvider,
    signInWithCredential,
} from "firebase/auth";
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from './firebase-config';
import { createUserProfile, checkUserStatus } from './userService';
import Constants from 'expo-constants';

interface PhoneAuthResponse {
    success: boolean;
    verificationId?: string;
    error?: string;
}

interface VerifyCodeResponse {
    success: boolean;
    isNewUser?: boolean;
    error?: string;
}

export const initializePhoneAuth = async (phoneNumber: string): Promise<PhoneAuthResponse> => {
    try {
        // Create a PhoneAuthProvider instance
        const provider = new PhoneAuthProvider(auth);
        let verificationId: string;

        if (__DEV__ && Constants.expoConfig?.extra?.useTestVerification) {
            // Development mode with test verification
            verificationId = 'test-verification-id-' + Date.now();
            console.log('Development mode - Test verification ID:', verificationId);
            console.log('Development mode - Test code will be: 123456');
        } else {
            // Production mode - real phone verification
            try {
                verificationId = await provider.verifyPhoneNumber(
                    phoneNumber,
                    // Pass recaptcha verifier here if needed
                    undefined
                );
            } catch (error: any) {
                console.error('Phone verification error:', error);
                if (error.code === 'auth/invalid-phone-number') {
                    return { success: false, error: 'Invalid phone number format' };
                } else if (error.code === 'auth/too-many-requests') {
                    return { success: false, error: 'Too many attempts. Please try again later' };
                }
                return { success: false, error: 'Failed to send verification code' };
            }
        }

        // Store verification attempt in Firestore
        const verificationRef = doc(db, 'phoneVerifications', phoneNumber);
        await setDoc(verificationRef, {
            verificationId,
            createdAt: Timestamp.now(),
            attempts: 0,
            verified: false,
            phoneNumber
        });

        return { 
            success: true,
            verificationId 
        };

    } catch (error: any) {
        console.error('Phone auth error:', error);
        return {
            success: false,
            error: error.message || 'Failed to send verification code'
        };
    }
};

export const verifyPhoneCode = async (
    phoneNumber: string, 
    verificationId: string, 
    code: string
): Promise<VerifyCodeResponse> => {
    try {
        // Get the verification record
        const verificationRef = doc(db, 'phoneVerifications', phoneNumber);
        const verificationDoc = await getDoc(verificationRef);
        
        if (!verificationDoc.exists()) {
            return { 
                success: false, 
                error: 'No verification found' 
            };
        }

        const verificationData = verificationDoc.data();
        
        // Check if verification is expired (10 minutes)
        const timeDiff = (Timestamp.now().toMillis() - verificationData.createdAt.toMillis()) / 1000;
        if (timeDiff > 600) {
            return { 
                success: false, 
                error: 'Verification code expired. Please request a new one.' 
            };
        }

        let isVerified = false;

        if (__DEV__ && Constants.expoConfig?.extra?.useTestVerification) {
            // In development, only accept '123456'
            isVerified = code === '123456';
            if (!isVerified) {
                return { 
                    success: false, 
                    error: 'Invalid verification code' 
                };
            }
        } else {
            // In production, verify with Firebase
            try {
                const credential = PhoneAuthProvider.credential(verificationId, code);
                await signInWithCredential(auth, credential);
                isVerified = true;
            } catch (error: any) {
                console.error('Verification error:', error);
                let errorMessage = 'Invalid verification code';
                if (error.code === 'auth/invalid-verification-code') {
                    errorMessage = 'Invalid verification code';
                } else if (error.code === 'auth/code-expired') {
                    errorMessage = 'Code expired';
                }
                return { 
                    success: false, 
                    error: errorMessage 
                };
            }
        }

        if (isVerified) {
            // Check/create user profile
            const userStatus = await checkUserStatus(phoneNumber);
            
            if (userStatus.isNewUser) {
                await createUserProfile(phoneNumber, 'phone', { phoneNumber });
            }

            // Update verification status
            await setDoc(verificationRef, {
                ...verificationData,
                verified: true,
                verifiedAt: Timestamp.now()
            }, { merge: true });

            return { 
                success: true,
                isNewUser: userStatus.isNewUser
            };
        }

        return {
            success: false,
            error: 'Verification failed'
        };

    } catch (error: any) {
        console.error('Verification error:', error);
        return { 
            success: false,
            error: error.message || 'Verification failed'
        };
    }
};