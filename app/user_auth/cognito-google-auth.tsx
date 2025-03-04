// @/app/user_auth/cognito-google-auth.tsx
import { View, Text, TouchableOpacity, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useGoogleAuth } from '@/utils/cognitoGoogleAuth';
import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { extractUserInfoFromIdToken } from '@/utils/cognitoGoogleUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PendingAuthData } from '@/types/user';
import { checkUserExistsInDynamoDB } from '@/utils/dynamodbGoogleUtils';

// Register for redirect handling
WebBrowser.maybeCompleteAuthSession();

const CognitoGoogleAuth = () => {
    const router = useRouter();
    const { signInWithGoogle } = useGoogleAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');

    // Handle Google Sign-in
    const handleSignIn = async () => {
        if (loading) return;
        
        try {
            setLoading(true);
            setError('');
            
            console.log('Starting Google sign-in flow');
            // Start the Google sign-in flow
            const result = await signInWithGoogle();
            
            if (result.success && result.session) {
                console.log('Google sign-in successful, processing token');
                try {
                    // Extract user info from ID token
                    const userInfo = extractUserInfoFromIdToken(result.session.idToken);
                    
                    if (!userInfo) {
                        console.error('Failed to extract user info from token');
                        throw new Error('Failed to extract user info from token');
                    }
                    
                    console.log('User info extracted:', userInfo.email);
                    
                    // Check if user exists in DynamoDB to determine if they're new
                    const userExists = await checkUserExistsInDynamoDB(userInfo.sub);
                    
                    const now = new Date();
                    
                    if (!userExists) {
                        console.log('New Google user detected (not in DynamoDB), routing to info collection');
                        // For new users, we need to collect additional information
                        
                        // Store minimal data for now
                        const pendingData: PendingAuthData = {
                            type: 'GOOGLE_SIGNUP',
                            cognito_id: userInfo.sub,
                            email: userInfo.email,
                            google_id: userInfo.sub,
                            timestamp: now.toISOString()
                        };
                        
                        await AsyncStorage.setItem('pendingUserData', JSON.stringify(pendingData));
                        
                        // Navigate to info collection page
                        router.replace({
                            pathname: '/user_auth/user-info-google',
                            params: {
                                googleId: userInfo.sub,
                                email: userInfo.email
                            }
                        });
                    } else {
                        console.log('Existing Google user (found in DynamoDB), proceeding to home screen');
                        // For existing users, update login timestamp and go to home
                        const pendingData: PendingAuthData = {
                            type: 'GOOGLE_SIGNIN',
                            cognito_id: userInfo.sub,
                            email: userInfo.email,
                            google_id: userInfo.sub,
                            timestamp: now.toISOString()
                        };
                        
                        await AsyncStorage.setItem('pendingUserData', JSON.stringify(pendingData));
                        
                        // Navigate to home page
                        router.replace('/navigation/camila/home');
                    }
                } catch (error: any) {
                    console.error('Error processing Google sign-in:', error);
                    setError(error.message || 'An error occurred while processing your sign-in');
                    Alert.alert(
                        'Sign-in Error',
                        'There was a problem processing your Google sign-in. Please try again.',
                        [{ text: 'OK' }]
                    );
                }
            } else {
                setError(result.error || 'Failed to sign in with Google');
                
                if (!result.error?.toLowerCase().includes('cancel')) {
                    Alert.alert(
                        'Authentication Failed',
                        result.error || 'There was a problem signing in with Google. Please try again.',
                        [{ text: 'OK' }]
                    );
                }
            }
        } catch (error: any) {
            console.error('Sign in error:', error);
            setError(error.message || 'An unexpected error occurred');
            
            Alert.alert(
                'Authentication Error',
                'There was a problem connecting to Google. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <Stack.Screen options={{ headerShown: false }} />
            
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header with back button */}
                <View className="px-4 pt-2">
                    <Pressable 
                        onPress={() => router.back()}
                        className="w-10 h-10 items-center justify-center"
                    >
                        <MaterialIcons name="chevron-left" size={32} color="black" />
                    </Pressable>
                </View>

                {/* Main Content */}
                <View className="flex-1 px-4">
                    <View className="mt-4 mb-6">
                        <MaterialIcons name="account-circle" size={32} color="#666666" />
                    </View>

                    <Text className="text-2xl font-semibold mb-2">
                        Continue with Google
                    </Text>
                    <Text className="text-gray-500 mb-8">
                        Sign in or sign up with your Google account.
                    </Text>

                    <View className="px-4 pb-4">
                        <TouchableOpacity
                            className={`w-full bg-[#54B4AF] py-4 rounded-lg items-center ${
                                loading ? 'opacity-50' : 'opacity-100'
                            }`}
                            onPress={handleSignIn}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-semibold text-base">
                                    Continue with Google
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {error ? (
                        <View className="bg-red-50 p-4 rounded-lg mb-6">
                            <Text className="text-red-500 text-sm">
                                {error}
                            </Text>
                        </View>
                    ) : null}
                </View>
            </SafeAreaView>
        </View>
    );
};

export default CognitoGoogleAuth;