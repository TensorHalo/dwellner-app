// @/app/user_auth/cognito-phone-verify.tsx
import { View, Text, TouchableOpacity, TextInput, Pressable, KeyboardAvoidingView, Platform, Keyboard, ActivityIndicator } from "react-native";
import React, { useState, useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from '@expo/vector-icons';
import { sendPhoneVerificationCode, verifyPhoneCode } from "@/utils/cognitoPhoneAuth";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Code Input Component
const CodeInput = ({ code, setCode, autoFocus, disabled }) => {
    const maxLength = 6;
    const codeArray = code.split('');
    const inputRef = useRef(null);

    // Focus the text input when the component mounts
    useEffect(() => {
        if (autoFocus && inputRef.current) {
            setTimeout(() => {
                inputRef.current.focus();
            }, 100);
        }
    }, [autoFocus]);

    return (
        <View className="flex-row justify-between mb-8">
            {[...Array(maxLength)].map((_, index) => (
                <View 
                    key={index}
                    className={`w-12 h-12 rounded-lg bg-[#F5F5F5] flex items-center justify-center ${
                        disabled ? 'opacity-50' : 'opacity-100'
                    }`}
                >
                    <Text className="text-2xl font-semibold">
                        {codeArray[index] || ''}
                    </Text>
                </View>
            ))}
            <TextInput
                ref={inputRef}
                value={code}
                onChangeText={(text) => {
                    if (text.length <= maxLength && /^\d*$/.test(text)) {
                        setCode(text);
                    }
                }}
                keyboardType="numeric"
                maxLength={maxLength}
                style={{ 
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    opacity: 0
                }}
                editable={!disabled}
            />
        </View>
    );
};

const CognitoPhoneVerify = () => {
    const router = useRouter();
    const { phoneNumber, callingCode } = useLocalSearchParams();
    const [code, setCode] = useState('');
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [resendDisabled, setResendDisabled] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [initialCodeSent, setInitialCodeSent] = useState(false);

    // Format full phone number with + sign and calling code
    const formattedPhoneNumber = `+${callingCode}${phoneNumber}`.replace(/\D/g, '');

    // Send initial verification code on mount
    useEffect(() => {
        const sendInitialCode = async () => {
            if (formattedPhoneNumber && !initialCodeSent && !resendDisabled) {
                setLoading(true);
                try {
                    console.log('Sending initial code to:', formattedPhoneNumber);
                    const result = await sendPhoneVerificationCode(formattedPhoneNumber);
                    if (result.success) {
                        setInitialCodeSent(true);
                        setResendDisabled(true);
                        setCountdown(30);
                        setCode('');
                        setError('');
                    } else {
                        setError(result.error || 'Failed to send verification code');
                    }
                } catch (error) {
                    console.error('Error sending initial code:', error);
                    setError('Failed to send verification code');
                } finally {
                    setLoading(false);
                }
            }
        };

        sendInitialCode();
    }, [formattedPhoneNumber, initialCodeSent]);

    // Handle keyboard events
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

    // Handle resend countdown
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setResendDisabled(false);
        }
    }, [countdown]);

    // Clear error when code changes
    useEffect(() => {
        if (error && code.length > 0) {
            setError('');
        }
    }, [code]);

    const handleResend = async () => {
        if (!resendDisabled && !loading) {
            setLoading(true);
            try {
                console.log('Resending code to:', formattedPhoneNumber);
                const result = await sendPhoneVerificationCode(formattedPhoneNumber);
                if (result.success) {
                    setResendDisabled(true);
                    setCountdown(30);
                    setCode('');
                    setError('');
                } else {
                    setError(result.error || 'Failed to send code. Please try again.');
                }
            } catch (error) {
                console.error('Error resending code:', error);
                setError('Failed to send verification code');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleVerification = async () => {
        if (code.length === 6 && !loading) {
            setLoading(true);
            try {
                const verifyResult = await verifyPhoneCode(formattedPhoneNumber, code);
                
                if (verifyResult.success) {
                    // If user exists, go directly to home screen
                    // If new user, go to user info screen
                    if (verifyResult.userExists) {
                        console.log('Existing user verified, going to home screen');
                        router.replace("/camila/home");
                    } else {
                        console.log('New user verified, going to user info screen');
                        router.replace({
                            pathname: "/user_auth/user-info",
                            params: {
                                phoneNumber: formattedPhoneNumber,
                                phoneVerified: "true",
                                verificationCode: code
                            }
                        });
                    }
                } else {
                    setError(verifyResult.error || 'Invalid code. Please try again.');
                    setCode('');
                }
            } catch (error) {
                setError('Verification failed. Please try again.');
                console.error('Verification error:', error);
            } finally {
                setLoading(false);
            }
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
                    {/* Icon */}
                    <View className="mt-4 mb-6">
                        <MaterialIcons name="smartphone" size={32} color="#666666" />
                    </View>

                    {/* Title and subtitle */}
                    <Text className="text-2xl font-semibold mb-2">
                        Enter code
                    </Text>
                    <Text className="text-gray-500 mb-2">
                        We sent a verification code to your phone
                    </Text>
                    <Text className="text-black mb-8">
                        +{callingCode} {phoneNumber}
                    </Text>

                    {/* Code Input */}
                    <CodeInput 
                        code={code}
                        setCode={setCode}
                        autoFocus={true}
                        disabled={loading}
                    />

                    {/* Resend option */}
                    <View className="flex-row items-center justify-start">
                        <Text className="text-gray-500">
                            Didn't receive a code?
                        </Text>
                        <TouchableOpacity 
                            onPress={handleResend}
                            disabled={resendDisabled || loading}
                        >
                            <Text className={`ml-1 underline ${resendDisabled || loading ? 'text-gray-400' : 'text-gray-700'}`}>
                                {resendDisabled ? `Send again (${countdown}s)` : 'Send again'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Error message */}
                    {error ? (
                        <Text className="text-red-500 text-sm text-center mt-4">
                            {error}
                        </Text>
                    ) : null}

                </View>

                {/* Continue Button */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "position" : "padding"}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 20}
                >
                    <View className="px-4 pb-4">
                        <TouchableOpacity
                            className={`w-full bg-[#54B4AF] py-4 rounded-lg items-center ${
                                code.length === 6 && !loading ? 'opacity-100' : 'opacity-50'
                            }`}
                            onPress={handleVerification}
                            disabled={code.length !== 6 || loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Text className="text-white font-semibold text-base">
                                    Verify
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

export default CognitoPhoneVerify;