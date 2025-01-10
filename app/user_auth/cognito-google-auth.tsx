import { View, Text, TouchableOpacity, Pressable, ActivityIndicator } from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useGoogleAuth } from '@/utils/cognitoGoogleAuth';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

const CognitoGoogleAuth = () => {
    const router = useRouter();
    const { signInWithGoogle } = useGoogleAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');

    const handleSignIn = async () => {
        setError('');
        setLoading(true);

        try {
            const result = await signInWithGoogle();
            console.log('Sign in result:', result);
            
            if (result.success && result.session) {
                router.replace('/user_auth/onboarding');
            } else {
                setError(result.error || 'Failed to sign in');
            }
        } catch (error: any) {
            console.error('Sign in error:', error);
            setError(error.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <Stack.Screen options={{ headerShown: false }} />
            
            <SafeAreaView style={{ flex: 1 }}>
                <View className="px-4 pt-2">
                    <Pressable 
                        onPress={() => router.back()}
                        className="w-10 h-10 items-center justify-center"
                    >
                        <MaterialIcons name="chevron-left" size={32} color="black" />
                    </Pressable>
                </View>

                <View className="flex-1 px-4">
                    <View className="mt-4 mb-6">
                        <MaterialIcons name="account-circle" size={32} color="#666666" />
                    </View>

                    <Text className="text-2xl font-semibold mb-2">
                        Sign in with Google
                    </Text>
                    <Text className="text-gray-500 mb-8">
                        Continue to Dwellner using your Google account
                    </Text>

                    <TouchableOpacity
                        className={`w-full bg-[#54B4AF] py-4 rounded-lg items-center flex-row justify-center ${
                            loading ? 'opacity-50' : 'opacity-100'
                        }`}
                        onPress={handleSignIn}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <MaterialCommunityIcons 
                                    name="google" 
                                    size={20} 
                                    color="white" 
                                    style={{marginRight: 8}} 
                                />
                                <Text className="text-white font-semibold text-base">
                                    Continue with Google
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {error ? (
                        <Text className="text-red-500 text-sm text-center mt-4">
                            {error}
                        </Text>
                    ) : null}
                </View>
            </SafeAreaView>
        </View>
    );
};

export default CognitoGoogleAuth;