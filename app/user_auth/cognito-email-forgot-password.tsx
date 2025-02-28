// @/app/user_auth/cognito-email-forgot-password.tsx
import { View, Text, TouchableOpacity, TextInput, Pressable, Keyboard, Image, Platform } from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from '@expo/vector-icons';
import { CognitoUser, CognitoUserPool } from 'amazon-cognito-identity-js';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCognitoUserId } from "@/utils/cognitoConfig";
import { PendingAuthData } from "@/types/user";

interface Params {
    email?: string;
}

const poolConfig = {
    UserPoolId: 'us-east-1_wHcEk9kP8',
    ClientId: '25lbf1t46emi9b4g51c6du5kkn',
    Region: 'us-east-1'
};

const userPool = new CognitoUserPool(poolConfig);

const CognitoForgotPassword = () => {
    const router = useRouter();
    const params = useLocalSearchParams<Params>();
    const [stage, setStage] = useState<'request'|'verify'>('request');
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [verificationCode, setVerificationCode] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [success, setSuccess] = useState(false);

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

    const validatePassword = (password: string): boolean => {
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const isLongEnough = password.length >= 8;

        return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar && isLongEnough;
    };

    const requestPasswordReset = async () => {
        setError("");
        setLoading(true);

        try {
            const cognitoUser = new CognitoUser({
                Username: userEmail.toLowerCase(),
                Pool: userPool
            });

            await new Promise<void>((resolve, reject) => {
                cognitoUser.forgotPassword({
                    onSuccess: () => {
                        resolve();
                    },
                    onFailure: (err) => {
                        reject(err);
                    }
                });
            });

            setStage('verify');
            setError("");
        } catch (err: any) {
            console.error('Password reset request error:', err);
            setError(err.message || "Failed to request password reset. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const confirmPasswordReset = async () => {
        if (!validatePassword(newPassword)) {
            setError("Password must be at least 8 characters and contain uppercase, lowercase, numbers, and special characters.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (!verificationCode) {
            setError("Please enter the verification code.");
            return;
        }

        setError("");
        setLoading(true);

        try {
            const cognitoUser = new CognitoUser({
                Username: userEmail.toLowerCase(),
                Pool: userPool
            });
    
            await new Promise<void>((resolve, reject) => {
                cognitoUser.confirmPassword(verificationCode, newPassword, {
                    onSuccess: async () => {
                        const cognitoId = await getCognitoUserId(userEmail);
                        if (cognitoId) {
                            const pendingData: PendingAuthData = {
                                type: 'PASSWORD_RESET',
                                cognito_id: cognitoId,
                                email: userEmail,
                                timestamp: new Date().toISOString()
                            };
                            await AsyncStorage.setItem('pendingUserData', JSON.stringify(pendingData));
                        }
                        resolve();
                    },
                    onFailure: reject
                });
            });    
    
            setSuccess(true);
            setTimeout(() => {
                router.push({
                    pathname: "/user_auth/cognito-email-signin",
                    params: { email: userEmail }
                });
            }, 1500);
        } catch (err: any) {
            console.error('Password reset confirmation error:', err);
            if (err.code === 'CodeMismatchException') {
                setError("Invalid verification code. Please try again.");
            } else {
                setError(err.message || "Failed to reset password. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        await requestPasswordReset();
    };

    if (success) {
        return (
            <View style={{ flex: 1, backgroundColor: 'white' }}>
                <Stack.Screen options={{ headerShown: false }} />
                <SafeAreaView style={{ flex: 1 }}>
                    <View className="flex-1 items-center justify-center px-4">
                        <View className="w-16 h-16 rounded-full bg-[#66B8B1] items-center justify-center mb-4">
                            <MaterialIcons name="check" size={32} color="white" />
                        </View>
                        
                        <Text className="text-2xl font-semibold mb-2">
                            Password Reset Successfully
                        </Text>
                        
                        <Text className="text-gray-600 text-center">
                            Redirecting to login...
                        </Text>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

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
                            source={require('@/assets/dwellnerlogo.png')}
                            style={{ width: 80, height: 80 }}
                            resizeMode="contain"
                        />
                    </View>

                    {/* Title */}
                    <Text className="text-2xl font-semibold text-center mb-8">
                        Reset Password
                    </Text>

                    {stage === 'request' ? (
                        <View>
                            <Text className="text-gray-600 text-center mb-8">
                                We'll send a verification code to your email address to reset your password.
                            </Text>

                            <TouchableOpacity
                                className={`w-full bg-[#66B8B1] py-4 rounded-2xl items-center ${
                                    loading ? 'opacity-50' : 'opacity-100'
                                }`}
                                onPress={requestPasswordReset}
                                disabled={loading}
                            >
                                <Text className="text-white font-semibold text-base">
                                    {loading ? 'Sending...' : 'Send Reset Code'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View>
                            <View className="space-y-4">
                                {/* Verification Code Input */}
                                <View>
                                    <View className="bg-[#F5F5F5] rounded-lg">
                                        <TextInput
                                            placeholder="Verification Code"
                                            value={verificationCode}
                                            onChangeText={setVerificationCode}
                                            className="px-4 py-4 text-black text-base"
                                            placeholderTextColor="#666666"
                                            keyboardType="number-pad"
                                            autoFocus={true}
                                        />
                                    </View>
                                </View>

                                {/* New Password Input */}
                                <View>
                                    <View className="bg-[#F5F5F5] rounded-lg flex-row items-center">
                                        <TextInput
                                            placeholder="New Password"
                                            value={newPassword}
                                            onChangeText={setNewPassword}
                                            secureTextEntry={!showPassword}
                                            className="flex-1 px-4 py-4 text-black text-base"
                                            placeholderTextColor="#666666"
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
                                </View>

                                {/* Confirm Password Input */}
                                <View>
                                    <View className="bg-[#F5F5F5] rounded-lg flex-row items-center">
                                        <TextInput
                                            placeholder="Confirm Password"
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            secureTextEntry={!showPassword}
                                            className="flex-1 px-4 py-4 text-black text-base"
                                            placeholderTextColor="#666666"
                                        />
                                    </View>
                                </View>

                                {error ? (
                                    <Text className="text-red-500 text-sm mt-2 ml-1">
                                        {error}
                                    </Text>
                                ) : null}

                                {/* Reset Button */}
                                <TouchableOpacity
                                    className={`w-full bg-[#66B8B1] py-4 rounded-2xl items-center ${
                                        loading ? 'opacity-50' : 'opacity-100'
                                    }`}
                                    onPress={confirmPasswordReset}
                                    disabled={loading}
                                >
                                    <Text className="text-white font-semibold text-base">
                                        {loading ? 'Resetting...' : 'Reset Password'}
                                    </Text>
                                </TouchableOpacity>

                                {/* Resend Code Link */}
                                <TouchableOpacity 
                                    onPress={handleResendCode}
                                    className="items-center mt-4"
                                >
                                    <Text className="text-gray-700 font-medium underline">
                                        Resend verification code
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
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

export default CognitoForgotPassword;