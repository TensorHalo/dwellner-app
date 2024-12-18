import { View, Text, TouchableOpacity, Pressable, KeyboardAvoidingView, Platform, Keyboard, TextInput } from "react-native";
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from '@expo/vector-icons';
import { verifyPhoneCode } from "@/utils/phoneAuth";

const CodeInput = ({ code, setCode, autoFocus, disabled }) => {
    const maxLength = 6;
    const codeArray = code.split('');

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
                value={code}
                onChangeText={(text) => {
                    if (text.length <= maxLength && /^\d*$/.test(text)) {
                        setCode(text);
                    }
                }}
                keyboardType="numeric"
                autoFocus={autoFocus}
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

const PhoneVerifyScreen = () => {
    const router = useRouter();
    const { phoneNumber, verificationId } = useLocalSearchParams();
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
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

    useEffect(() => {
        if (error && code.length > 0) {
            setError('');
        }
    }, [code]);

    const handleVerification = async () => {
        if (code.length === 6 && !loading) {
            setLoading(true);
            try {
                const result = await verifyPhoneCode(
                    phoneNumber as string,
                    verificationId as string,
                    code
                );
                
                if (result.success) {
                    // Navigate based on whether user is new
                    if (result.isNewUser) {
                        router.push("/user_auth/onboarding");
                    } else {
                        router.push("/camila/home");
                    }
                } else {
                    setError(result.error || 'Invalid code');
                    setCode('');
                }
            } catch (error) {
                setError('Verification failed');
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            
            <View style={{ flex: 1, backgroundColor: 'white' }}>
                <SafeAreaView className="flex-1">
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
                            <MaterialIcons name="shield" size={32} color="#666666" />
                        </View>

                        {/* Title and subtitle */}
                        <Text className="text-2xl font-semibold mb-2">
                            Enter code
                        </Text>
                        <Text className="text-gray-500 mb-2">
                            We sent a verification code to your phone
                        </Text>
                        <Text className="text-black mb-8">
                            {phoneNumber}
                        </Text>

                        {/* Code Input */}
                        <CodeInput 
                            code={code}
                            setCode={setCode}
                            autoFocus={true}
                            disabled={loading}
                        />

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
                                <Text className="text-black font-semibold text-base">
                                    {loading ? 'Verifying...' : 'Continue'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
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
        </>
    );
};

export default PhoneVerifyScreen;