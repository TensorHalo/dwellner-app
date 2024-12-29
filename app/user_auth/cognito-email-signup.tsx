// @/user_auth/cognito-email-signup.tsx
import { View, Text, TouchableOpacity, TextInput, Pressable, KeyboardAvoidingView, Platform, Keyboard, Image } from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from '@expo/vector-icons';
import { signUp } from "@/utils/cognitoConfig";

interface Params {
  email?: string;
  verified?: string;
}

const CognitoSignUp = () => {
    const router = useRouter();
    const params = useLocalSearchParams<Params>();
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    // Get email from params safely
    const userEmail = params.email || '';
    const isVerified = params.verified === 'true';

    useEffect(() => {
        if (!isVerified) {
            // If not verified, go back to verification
            router.replace({
                pathname: "/user_auth/cognito-email-verify",
                params: { email: userEmail }
            });
        }
    }, [isVerified, userEmail]);

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

    const validatePassword = (password: string) => {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (password.length < minLength) {
            return "Password must be at least 8 characters long";
        }
        if (!hasUpperCase) {
            return "Password must contain at least one uppercase letter";
        }
        if (!hasLowerCase) {
            return "Password must contain at least one lowercase letter";
        }
        if (!hasNumbers) {
            return "Password must contain at least one number";
        }
        if (!hasSpecialChar) {
            return "Password must contain at least one special character";
        }
        return "";
    };

    const handleCreateAccount = async () => {
        if (!password.trim()) {
            setError("Please enter a password");
            return;
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        setError("");
        setLoading(true);

        try {
            const result = await signUp(userEmail, password);
            if (result.success) {
                router.replace("/user_auth/onboarding");
            } else {
                // Handle different error cases
                if (result.error && typeof result.error === 'string') {
                    if (result.error.includes('User already exists')) {
                        // User exists - redirect to signin
                        router.replace({
                            pathname: "/user_auth/cognito-email-signin",
                            params: { email: userEmail }
                        });
                    } else if (result.error.includes('Invalid parameter')) {
                        setError("Please enter a valid password");
                    } else if (result.error.includes('Password does not conform to policy')) {
                        setError("Password doesn't meet the requirements");
                    } else {
                        setError(result.error);
                    }
                }
            }
        } catch (err) {
            console.error('Account creation error:', err);
            setError(err instanceof Error ? err.message : "Failed to create account. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <Stack.Screen options={{ headerShown: false }} />
            
            <SafeAreaView style={{ flex: 1 }}>
                <View className="flex-1 px-4">
                    {/* Logo */}
                    <View className="items-center mt-12 mb-8">
                        <Image 
                            source={require('@/assets/dwellnerLogo.png')}
                            style={{ width: 80, height: 80 }}
                            resizeMode="contain"
                        />
                    </View>

                    <Text className="text-2xl font-semibold text-center mb-8">
                        Create an Account
                    </Text>

                    {/* Password Input */}
                    <View className="mb-4">
                        <View className="bg-[#F5F5F5] rounded-lg flex-row items-center">
                            <TextInput
                                placeholder="Set Your Password*"
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
                                <Text className="text-[#54B4AF]">
                                    {showPassword ? 'Hide' : 'Show'}
                                </Text>
                            </Pressable>
                        </View>

                        {error ? (
                            <Text className="text-red-500 text-sm mt-2 ml-1">
                                {error}
                            </Text>
                        ) : null}
                    </View>
                </View>

                {/* Continue Button */}
                {/* Continue Button - Moved up and styled */}
                <View className="px-4 mt-6">
                    <TouchableOpacity
                        className={`w-full bg-[#66B8B1] py-4 rounded-2xl items-center ${
                            loading ? 'opacity-50' : 'opacity-100'
                        }`}
                        onPress={handleCreateAccount}
                        disabled={loading}
                    >
                        <Text className="text-white font-semibold text-base">
                            {loading ? 'Creating account...' : 'Done'}
                        </Text>
                    </TouchableOpacity>
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

export default CognitoSignUp;