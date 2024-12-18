import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import { createUserProfile } from './userService';
import { firebaseConfig } from './firebase-config';

GoogleSignin.configure({
    webClientId: firebaseConfig.clientId,
});

export const handleGoogleSignIn = async () => {
    try {
        // Check if your device supports Google Play
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        
        // Get the users ID token
        const { idToken } = await GoogleSignin.signIn();

        // Create a Google credential with the token
        const googleCredential = auth.GoogleAuthProvider.credential(idToken);

        // Sign-in the user with the credential
        const userCredential = await auth().signInWithCredential(googleCredential);
        
        // Check if this is a new user
        if (userCredential.additionalUserInfo?.isNewUser) {
            const { user } = userCredential;
            await createUserProfile(user.uid, 'google', {
                email: user.email || '',
                name: user.displayName || '',
                avatarUrl: user.photoURL || '',
            });
        }

        return { user: userCredential.user, error: null };
    } catch (error) {
        console.error('Google Sign-In Error:', error);
        return { 
            user: null, 
            error: 'Failed to sign in with Google. Please try again.' 
        };
    }
};

export const signOut = async () => {
    try {
        await GoogleSignin.revokeAccess();
        await GoogleSignin.signOut();
        await auth().signOut();
    } catch (error) {
        console.error('Sign-out Error:', error);
        throw error;
    }
};