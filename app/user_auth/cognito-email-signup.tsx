// @/app/user_auth/cognito-email-signup.tsx
import { View, Text, TouchableOpacity, TextInput, Pressable, KeyboardAvoidingView, Platform, Keyboard } from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from '@expo/vector-icons';
import { completeNewUserSignup } from "@/utils/cognitoConfig";
import { UserInfoFormData, PendingAuthData } from "@/types/user";
import { prepareUserDataForDB } from "@/utils/dynamodbEmailUtils";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storeAuthTokens } from "@/utils/authTokens";

interface RouterParams {
    email?: string;
    verificationCode?: string;
    userInfo?: string;
}

const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
    <View className="flex-row items-center mt-2">
        <MaterialIcons 
            name={met ? "check-circle" : "radio-button-unchecked"} 
            size={16} 
            color={met ? "#4CAF50" : "#666666"} 
        />
        <Text className={`ml-2 ${met ? 'text-green-600' : 'text-gray-600'}`}>
            {text}
        </Text>
    </View>
);

const CognitoSignUp = () => {
    const router = useRouter();
    const params = useLocalSearchParams<RouterParams>();
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    const email = params.email;
    const verificationCode = params.verificationCode;
    const userInfo = params.userInfo ? JSON.parse(params.userInfo) as UserInfoFormData : undefined;

    useEffect(() => {
        if (!email || !verificationCode || !userInfo) {
            console.error('Missing required params:', { email, verificationCode, userInfo });
            router.replace("/user_auth/cognito-email-auth");
        }
    }, [email, verificationCode, userInfo]);

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

    // Password validation states
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const allRequirementsMet = 
        hasMinLength && 
        hasUpperCase && 
        hasLowerCase && 
        hasNumber && 
        hasSpecialChar;

        const handleCreateAccount = async () => {
            if (!password.trim()) {
                setError("Please enter a password");
                return;
            }
        
            if (!allRequirementsMet) {
                setError("Please meet all password requirements");
                return;
            }
        
            setError("");
            setLoading(true);
        
            try {
                const result = await completeNewUserSignup(email, password);
                
                if (result.success) {
                    await storeAuthTokens(result.session);
        
                    const completeUserData = prepareUserDataForDB(
                        result.user.username,
                        email,
                        userInfo
                    );
        
                    const pendingData: PendingAuthData = {
                        type: 'SIGNUP',
                        cognito_id: result.user?.username || '',
                        email: email,
                        timestamp: new Date().toISOString(),
                        userData: completeUserData // Include the complete user data
                    };
        
                    await AsyncStorage.setItem('pendingUserData', JSON.stringify(pendingData));
                    console.log('Signup completed successfully');
                    router.replace("/user_auth/onboarding");
                } else if (result.error?.toLowerCase().includes('already confirmed')) {
                    console.log('User already confirmed but password set successfully');
                    router.replace("/user_auth/onboarding");
                } else {
                    console.error('Signup failed:', result.error);
                    setError(result.error || "Failed to create account");
                }
            } catch (err) {
                console.error('Account creation error:', err);
                const errorMessage = err instanceof Error ? err.message : "Failed to create account. Please try again.";
                
                if (errorMessage.toLowerCase().includes('already confirmed')) {
                    console.log('User already confirmed but password may be set');
                    router.replace("/user_auth/onboarding");
                } else {
                    setError(errorMessage);
                }
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
                        <MaterialIcons name="lock" size={32} color="#666666" />
                    </View>

                    <Text className="text-2xl font-semibold mb-2">
                        Create Password
                    </Text>
                    <Text className="text-gray-500 mb-8">
                        Create a secure password to protect your account
                    </Text>

                    {/* Password Input */}
                    <View className="mb-4">
                        <View className="bg-[#F5F5F5] rounded-lg flex-row items-center">
                            <TextInput
                                placeholder="Enter password"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                className="flex-1 px-4 py-4 text-black text-base"
                                placeholderTextColor="#666666"
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoFocus={true}
                            />
                            <Pressable 
                                onPress={() => setShowPassword(!showPassword)}
                                className="px-4"
                            >
                                <MaterialIcons
                                    name={showPassword ? "visibility-off" : "visibility"}
                                    size={24}
                                    color="#666666"
                                />
                            </Pressable>
                        </View>

                        {/* Password Requirements */}
                        <View className="mt-4">
                            <Text className="text-gray-600 mb-2">Password must contain:</Text>
                            <PasswordRequirement met={hasMinLength} text="At least 8 characters" />
                            <PasswordRequirement met={hasUpperCase} text="At least 1 uppercase letter" />
                            <PasswordRequirement met={hasLowerCase} text="At least 1 lowercase letter" />
                            <PasswordRequirement met={hasNumber} text="At least 1 number" />
                            <PasswordRequirement met={hasSpecialChar} text="At least 1 special character" />
                        </View>

                        {error ? (
                            <Text className="text-red-500 text-sm mt-4">
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
                                loading || !allRequirementsMet ? 'opacity-50' : 'opacity-100'
                            }`}
                            onPress={handleCreateAccount}
                            disabled={loading || !allRequirementsMet}
                        >
                            <Text className="text-white font-semibold text-base">
                                {loading ? 'Creating account...' : 'Create Account'}
                            </Text>
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

export default CognitoSignUp;