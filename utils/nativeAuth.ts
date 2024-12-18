import auth from '@react-native-firebase/auth';

let nativeAuth: typeof auth;
try {
    nativeAuth = auth;
} catch (error) {
    console.error('Failed to initialize native auth:', error);
    nativeAuth = null;
}

export { nativeAuth };