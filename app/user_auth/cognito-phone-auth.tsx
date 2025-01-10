// @/app/user_auth/cognito-phone-auth.tsx
import { View, Text, TouchableOpacity, TextInput, Pressable, KeyboardAvoidingView, Platform, Keyboard, ActivityIndicator } from "react-native";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { MaterialIcons } from '@expo/vector-icons';
import CountryPicker, { 
    Country, 
    CountryCode 
} from "react-native-country-picker-modal";
import { formatPhoneNumber, isValidPhoneNumber } from "@/utils/phoneFormatters";

// Suppress warning at file level
const consoleError = console.error;
console.error = (...args: any) => {
    if (args[0]?.includes?.('defaultProps')) return;
    consoleError.apply(console, args);
};

const CognitoPhoneAuth = () => {
    const router = useRouter();
    const [phoneNumber, setPhoneNumber] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [countryCode, setCountryCode] = useState<CountryCode>("CA");
    const [callingCode, setCallingCode] = useState("1");
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

    const handlePhoneChange = (text: string) => {
        const numericOnly = text.replace(/\D/g, '');
        const formatted = formatPhoneNumber(numericOnly, countryCode);
        setPhoneNumber(formatted);
        if (error) setError("");
    };

    const handleContinue = () => {
        const numericPhone = phoneNumber.replace(/\D/g, '');
        
        if (!numericPhone) {
            setError("Please enter your phone number");
            return;
        }

        if (!isValidPhoneNumber(numericPhone, countryCode)) {
            setError("Please enter a valid phone number");
            return;
        }

        router.push({
            pathname: "/user_auth/cognito-phone-verify",
            params: {
                phoneNumber: numericPhone,
                callingCode: callingCode
            }
        });
    };

    const onSelectCountry = (country: Country) => {
        setCountryCode(country.cca2);
        setCallingCode(country.callingCode[0]);
        setPhoneNumber("");
        if (error) setError("");
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <Stack.Screen 
                options={{ 
                    headerShown: false,
                    contentStyle: { backgroundColor: 'white' }
                }} 
            />
            
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <TouchableOpacity 
                    onPress={() => router.back()}
                    className="w-10 h-10 ml-2 mt-2 items-center justify-center bg-gray-50 rounded-full"
                >
                    <MaterialIcons name="chevron-left" size={28} color="black" />
                </TouchableOpacity>

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
                        <View className="bg-[#F5F5F5] rounded-lg flex-row items-center">
                            <Pressable
                                onPress={() => setShowCountryPicker(true)}
                                className="flex-row items-center px-4 py-4"
                            >
                                <CountryPicker
                                    withFilter
                                    withFlag
                                    withCallingCode
                                    withEmoji
                                    countryCode={countryCode}
                                    onSelect={onSelectCountry}
                                    visible={showCountryPicker}
                                    onClose={() => setShowCountryPicker(false)}
                                />
                                <Text className="ml-2 text-black text-base">+{callingCode}</Text>
                                <MaterialIcons name="arrow-drop-down" size={24} color="#666666" />
                            </Pressable>

                            <TextInput
                                placeholder="Phone number"
                                value={phoneNumber}
                                onChangeText={handlePhoneChange}
                                keyboardType="phone-pad"
                                className="flex-1 py-4 text-black text-base"
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

                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "position" : "padding"}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 20}
                >
                    <View className="px-4 pb-4">
                        <TouchableOpacity
                            className="w-full py-4 rounded-lg items-center"
                            style={{ 
                                backgroundColor: '#54B4AF',
                                opacity: loading ? 0.5 : 1
                            }}
                            onPress={handleContinue}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
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

export default CognitoPhoneAuth;