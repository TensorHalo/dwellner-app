// @/app/user_auth/cognito-email-auth.tsx
import { View, Text, TouchableOpacity, TextInput, Pressable, KeyboardAvoidingView, Platform, Keyboard, ActivityIndicator } from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { MaterialIcons } from '@expo/vector-icons';
import { checkUserExists } from "@/utils/cognitoConfig";

const CognitoEmailAuth = () => {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => setKeyboardVisible(true)
        );

        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setKeyboardVisible(false)
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, []);

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleContinue = async () => {
        const trimmedEmail = email.trim().toLowerCase();
        
        if (!trimmedEmail) {
            setError("Please enter your email address");
            return;
        }

        if (!validateEmail(trimmedEmail)) {
            setError("Please enter a valid email address");
            return;
        }

        setError("");
        setLoading(true);

        try {
            console.log('Starting user check process...');
            const result = await checkUserExists(trimmedEmail);
            console.log('User check result:', result);
            
            if (result.error) {
                setError(result.error);
                return;
            }

            if (!result.exists) {
                console.log('New user, navigating to signup');
                router.push({
                    pathname: "/user_auth/cognito-email-verify",
                    params: { email: trimmedEmail }
                });
            } else if (!result.confirmed) {
                console.log('User exists but needs verification');
                router.push({
                    pathname: "/user_auth/cognito-email-verify",
                    params: { email: trimmedEmail }
                });
            } else {
                console.log('User exists and is confirmed, navigating to signin');
                router.push({
                    pathname: "/user_auth/cognito-email-signin",
                    params: { email: trimmedEmail }
                });
            }
        } catch (error) {
            console.error('Error in handleContinue:', error);
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Clear error when email changes
    useEffect(() => {
        if (error) {
            setError("");
        }
    }, [email]);

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <Stack.Screen options={{ headerShown: false }} />
            
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header with back button */}
                <View className="px-4 pt-2">
                    <Pressable 
                        onPress={() => {
                            if (keyboardVisible) {
                                Keyboard.dismiss();
                            } else {
                                router.back();
                            }
                        }}
                        className="w-10 h-10 items-center justify-center"
                    >
                        <MaterialIcons name="chevron-left" size={32} color="black" />
                    </Pressable>
                </View>

                {/* Main Content */}
                <View className="flex-1 px-4">
                    <View className="mt-4 mb-6">
                        <MaterialIcons name="mail" size={32} color="#666666" />
                    </View>

                    <Text className="text-2xl font-semibold mb-2">
                        Continue with Email
                    </Text>
                    <Text className="text-gray-500 mb-8">
                        Sign in or sign up with your email.
                    </Text>

                    <View>
                        <View className="bg-[#F5F5F5] rounded-lg">
                            <TextInput
                                placeholder="Email address"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoComplete="email"
                                textContentType="emailAddress"
                                className="px-4 py-4 text-black text-base"
                                placeholderTextColor="#666666"
                                autoFocus={true}
                                editable={!loading}
                            />
                        </View>
                        {error ? (
                            <Text className="text-red-500 text-sm mt-2 ml-1">
                                {error}
                            </Text>
                        ) : null}
                    </View>
                </View>

                {/* Continue Button */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "position" : "padding"}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 20}
                >
                    <View className="px-4 pb-4">
                        <TouchableOpacity
                            className={`w-full bg-[#54B4AF] py-4 rounded-lg items-center ${
                                loading ? 'opacity-50' : 'opacity-100'
                            }`}
                            onPress={handleContinue}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="black" />
                            ) : (
                                <Text className="text-white font-semibold text-base">
                                    Continue
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>

                {keyboardVisible && (
                    <Pressable 
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'transparent'
                        }}
                        onPress={Keyboard.dismiss}
                    />
                )}
            </SafeAreaView>
        </View>
    );
};

export default CognitoEmailAuth;