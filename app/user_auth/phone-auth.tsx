import { View, Text, TouchableOpacity, TextInput, Pressable, KeyboardAvoidingView, Platform, Keyboard } from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { MaterialIcons } from '@expo/vector-icons';
import { initializePhoneAuth } from "@/utils/phoneAuth";
import CountryPicker, { Country } from 'react-native-country-picker-modal';

interface PhoneFormat {
    lengths: number[];
    pattern: string;
}

const PHONE_FORMATS: { [key: string]: PhoneFormat } = {
    'US': { lengths: [3, 3, 4], pattern: 'XXX-XXX-XXXX' },
    'CA': { lengths: [3, 3, 4], pattern: 'XXX-XXX-XXXX' },
    'CN': { lengths: [3, 4, 4], pattern: 'XXX-XXXX-XXXX' },
    'GB': { lengths: [4, 6], pattern: 'XXXX XXXXXX' },
    'JP': { lengths: [2, 4, 4], pattern: 'XX-XXXX-XXXX' },
};

const PhoneAuth = () => {
    const router = useRouter();
    const [phoneNumber, setPhoneNumber] = useState("");
    const [countryCode, setCountryCode] = useState("US");
    const [callingCode, setCallingCode] = useState("1");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [showCountryPicker, setShowCountryPicker] = useState(false);

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

    const formatPhoneNumber = (text: string, country: string) => {
        // Remove all non-digits
        const cleaned = text.replace(/\D/g, '');
        const format = PHONE_FORMATS[country] || PHONE_FORMATS['US'];
        
        let result = '';
        let currentPosition = 0;
        
        for (let i = 0; i < format.lengths.length && currentPosition < cleaned.length; i++) {
            const segmentLength = format.lengths[i];
            const segment = cleaned.slice(currentPosition, currentPosition + segmentLength);
            
            if (segment) {
                if (result.length > 0) {
                    result += '-';
                }
                result += segment;
            }
            
            currentPosition += segmentLength;
        }
        
        // If there are any remaining digits, add them to the result
        if (currentPosition < cleaned.length) {
            if (result.length > 0) {
                result += '-';
            }
            result += cleaned.slice(currentPosition);
        }
        
        return result;
    };

    const handlePhoneNumberChange = (text: string) => {
        // Only format if there's actual content
        const cleaned = text.replace(/\D/g, '');
        if (cleaned.length > 0) {
            const formatted = formatPhoneNumber(cleaned, countryCode);
            setPhoneNumber(formatted);
        } else {
            setPhoneNumber('');
        }
    };

    const validatePhoneNumber = (number: string) => {
        const cleaned = number.replace(/\D/g, '');
        const format = PHONE_FORMATS[countryCode] || PHONE_FORMATS['US'];
        const totalLength = format.lengths.reduce((a, b) => a + b, 0);
        return cleaned.length >= totalLength;
    };

    const onSelectCountry = (country: Country) => {
        const newCountryCode = country.cca2;
        setCountryCode(newCountryCode);
        setCallingCode(country.callingCode[0]);
        
        // Reformat existing phone number for new country
        if (phoneNumber) {
            const cleaned = phoneNumber.replace(/\D/g, '');
            const formatted = formatPhoneNumber(cleaned, newCountryCode);
            setPhoneNumber(formatted);
        }
    };

    const handleContinue = async () => {
        const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
        
        if (!cleanPhoneNumber) {
            setError("Please enter your phone number");
            return;
        }

        if (!validatePhoneNumber(cleanPhoneNumber)) {
            setError("Please enter a valid phone number");
            return;
        }

        setError("");
        setLoading(true);

        try {
            const formattedNumber = `+${callingCode}${cleanPhoneNumber}`;
            const result = await initializePhoneAuth(formattedNumber);
            
            if (result.success && result.verificationId) {
                router.push({
                    pathname: "/user_auth/phone-verify",
                    params: { 
                        phoneNumber: formattedNumber,
                        verificationId: result.verificationId
                    }
                });
            } else {
                setError(result.error || "An error occurred. Please try again.");
            }
        } catch (error) {
            console.error('Phone auth error:', error);
            setError("Failed to send verification code. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (error) {
            setError("");
        }
    }, [phoneNumber]);

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            
            <View style={{ flex: 1, backgroundColor: 'white' }}>
                <SafeAreaView className="flex-1">
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

                    <View className="flex-1 px-4">
                        <View className="mt-4 mb-6">
                            <MaterialIcons name="phone" size={32} color="#666666" />
                        </View>

                        <Text className="text-2xl font-semibold mb-2">
                            Continue with Phone
                        </Text>
                        <Text className="text-gray-500 mb-8">
                            Sign in or sign up with your phone number.
                        </Text>

                        <View>
                            <View className="flex-row bg-[#F5F5F5] rounded-lg">
                                <TouchableOpacity 
                                    onPress={() => setShowCountryPicker(true)}
                                    className="px-4 py-4 flex-row items-center border-r border-gray-300"
                                >
                                    <CountryPicker
                                        countryCode={countryCode}
                                        withFilter={true}
                                        withFlag={true}
                                        withCallingCode={true}
                                        withCountryNameButton={false}
                                        withAlphaFilter={false}
                                        withEmoji={true}
                                        onSelect={onSelectCountry}
                                        visible={showCountryPicker}
                                        onClose={() => setShowCountryPicker(false)}
                                        theme={{
                                            fontSize: 16,
                                            onBackgroundTextColor: '#000',
                                            backgroundColor: '#fff',
                                        }}
                                        containerButtonStyle={{
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    />
                                    <Text className="ml-2">+{callingCode}</Text>
                                    <MaterialIcons name="arrow-drop-down" size={24} color="#666666" />
                                </TouchableOpacity>

                                <TextInput
                                    placeholder={PHONE_FORMATS[countryCode]?.pattern || "Enter number"}
                                    value={phoneNumber}
                                    onChangeText={handlePhoneNumberChange}
                                    keyboardType="phone-pad"
                                    className="flex-1 px-4 py-4 text-black text-base"
                                    placeholderTextColor="#666666"
                                    autoFocus={true}
                                    editable={!loading}
                                    maxLength={15}
                                />
                            </View>
                            {error ? (
                                <Text className="text-red-500 text-sm mt-2 ml-1">
                                    {error}
                                </Text>
                            ) : null}
                        </View>
                    </View>

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
                                <Text className="text-black font-semibold text-base">
                                    {loading ? 'Please wait...' : 'Continue'}
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

export default PhoneAuth;