// @/user_auth/cognito-email-signin.tsx
import { View, Text, TouchableOpacity, TextInput, Pressable, KeyboardAvoidingView, Platform, Keyboard, Image } from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from '@expo/vector-icons';
import { signIn } from "@/utils/cognitoConfig";

interface Params {
    email?: string;
}

const CognitoSignIn = () => {
    const router = useRouter();
    const params = useLocalSearchParams<Params>();
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    // Get email from params safely
    const userEmail = params.email || '';

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

    const handleSignIn = async () => {
        if (!password.trim()) {
            setError("Please enter your password");
            return;
        }

        setError("");
        setLoading(true);

        try {
            const result = await signIn(userEmail, password);
            if (result.success) {
                router.replace("/camila/home");
            } else {
                setError(result.error || "Incorrect password. Please try again.");
            }
        } catch (err) {
            console.error('Sign in error:', err);
            setError("Failed to sign in. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = () => {
        router.push({
            pathname: "/user_auth/cognito-email-forgot-password",
            params: { email: userEmail }
        });
    };

    const handleLoginWithCode = () => {
        router.push({
            pathname: "/user_auth/cognito-email-code-login",
            params: { email: userEmail }
        });
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <Stack.Screen options={{ headerShown: false }} />
            
            <SafeAreaView style={{ flex: 1 }}>
                {/* Back Button */}
                <Pressable 
                    onPress={() => {
                        if (keyboardVisible) {
                            Keyboard.dismiss();
                        } else {
                            router.back();
                        }
                    }}
                    className="w-10 h-10 items-center justify-center mx-4"
                >
                    <MaterialIcons name="chevron-left" size={32} color="black" />
                </Pressable>

                <View className="flex-1 px-4">
                    {/* Logo */}
                    <View className="items-center mt-8 mb-8">
                        <Image 
                            source={require('@/assets/dwellnerLogo.png')}
                            style={{ width: 80, height: 80 }}
                            resizeMode="contain"
                        />
                    </View>

                    {/* Title */}
                    <Text className="text-2xl font-semibold text-center mb-8">
                        Welcome to Dwellner
                    </Text>

                    {/* Password Input Group */}
                    <View>
                        <View className="bg-[#F5F5F5] rounded-lg flex-row items-center">
                            <TextInput
                                placeholder="Password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                className="flex-1 px-4 py-4 text-black text-base"
                                placeholderTextColor="#666666"
                                autoFocus={true}
                            />
                            <Pressable 
                                onPress={() => setShowPassword(!showPassword)}
                                hitSlop={10}
                                className="px-4"
                            >
                                <Text className="text-[#66B8B1] font-semibold">
                                    {showPassword ? 'Hide' : 'Show'}
                                </Text>
                            </Pressable>
                        </View>

                        {error ? (
                            <Text className="text-red-500 text-sm mt-2 ml-1">
                                {error}
                            </Text>
                        ) : null}

                        {/* Continue Button */}
                        <TouchableOpacity
                            className={`w-full bg-[#66B8B1] py-4 rounded-2xl items-center mt-4 ${
                                loading ? 'opacity-50' : 'opacity-100'
                            }`}
                            onPress={handleSignIn}
                            disabled={loading}
                        >
                            <Text className="text-white font-semibold text-base">
                                {loading ? 'Signing in...' : 'Continue'}
                            </Text>
                        </TouchableOpacity>

                        {/* Links */}
                        <View className="mt-6 items-center space-y-4">
                            <TouchableOpacity onPress={handleLoginWithCode}>
                                <Text className="text-gray-700 font-medium underline">
                                    Log in with email code
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={handleForgotPassword}>
                                <Text className="text-gray-700 font-medium underline">
                                    Forgot password
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

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

export default CognitoSignIn;