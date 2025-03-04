// @/app/user_auth/user-info-google.tsx
import { View, Text, TouchableOpacity, TextInput, Pressable, KeyboardAvoidingView, Platform, Keyboard, ScrollView, Linking, Image } from "react-native";
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from '@expo/vector-icons';
import { UserInfoFormData } from "@/types/user";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { extractUserInfoFromIdToken } from '@/utils/cognitoGoogleUtils';
import { getAuthTokens } from '@/utils/authTokens';

interface RouterParams {
    googleId?: string;
    email?: string;
}

const userTypes = [
    'Home Seeker',
    'Agent',
    'Property Manager',
    'Landlord',
    'Developer'
] as const;

const UserInfoGoogleScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams<RouterParams>();
    
    // These will be passed or retrieved from token
    const [googleId, setGoogleId] = useState(params.googleId || '');
    const [email, setEmail] = useState(params.email || '');
    
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [name, setName] = useState("");
    const [userType, setUserType] = useState<"Home Seeker" | "Agent" | "Property Manager" | "Landlord" | "Developer">();
    const [dateOfBirth, setDateOfBirth] = useState("");
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [error, setError] = useState("");

    // Fetch user info from token if not passed as params
    useEffect(() => {
        const fetchUserInfoFromToken = async () => {
            if (!googleId || !email) {
                try {
                    const tokens = await getAuthTokens();
                    if (!tokens || !tokens.idToken) {
                        console.error('No auth tokens found');
                        router.replace("/user_auth/cognito-google-auth");
                        return;
                    }
                    
                    const userInfo = extractUserInfoFromIdToken(tokens.idToken);
                    if (!userInfo) {
                        console.error('Failed to extract user info from token');
                        router.replace("/user_auth/cognito-google-auth");
                        return;
                    }
                    
                    setGoogleId(userInfo.sub);
                    setEmail(userInfo.email);
                    
                    // If name is available from token, pre-fill it
                    if (userInfo.name) {
                        setName(userInfo.name);
                    }
                } catch (error) {
                    console.error('Error fetching user info from token:', error);
                    router.replace("/user_auth/cognito-google-auth");
                }
            }
        };
        
        fetchUserInfoFromToken();
    }, [googleId, email, router]);

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

    const formatDateInput = (input: string) => {
        // Remove any non-digit characters
        const digitsOnly = input.replace(/\D/g, '');
        
        // Format as MM/DD/YYYY
        if (digitsOnly.length <= 2) {
            return digitsOnly;
        } else if (digitsOnly.length <= 4) {
            return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
        } else {
            return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`;
        }
    };

    const handleDateChange = (text: string) => {
        const formatted = formatDateInput(text);
        setDateOfBirth(formatted);
    };

    const validateDate = (dateString: string) => {
        const [month, day, year] = dateString.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        return date instanceof Date && !isNaN(date.getTime()) &&
               date.getMonth() === month - 1 &&
               date.getDate() === day &&
               date.getFullYear() === year;
    };

    const handleContinue = async () => {
        if (!name.trim()) {
            setError("Please enter your name");
            return;
        }

        if (!userType) {
            setError("Please select your role");
            return;
        }

        if (!dateOfBirth || !validateDate(dateOfBirth)) {
            setError("Please enter a valid date in MM/DD/YYYY format");
            return;
        }

        const [month, day, year] = dateOfBirth.split('/').map(Number);
        const userInfo: UserInfoFormData = {
            name: name.trim(),
            user_type: userType,
            date_of_birth: new Date(year, month - 1, day)
        };

        try {
            // Store pending user data for processing in home page
            const now = new Date();
            const pendingData = {
                type: 'GOOGLE_SIGNUP',
                cognito_id: googleId,
                email: email,
                google_id: googleId,
                timestamp: now.toISOString(),
                userData: {
                    cognito_id: googleId,
                    auth_methods: {
                        google: {
                            google_id: googleId,
                            google_email: email
                        }
                    },
                    profile: {
                        name: userInfo.name,
                        user_type: userInfo.user_type,
                        date_of_birth: userInfo.date_of_birth,
                        registration_date: now
                    },
                    is_pro: false
                }
            };
            
            await AsyncStorage.setItem('pendingUserData', JSON.stringify(pendingData));
            
            // Navigate to home page
            router.replace('/navigation/camila/home');
        } catch (error) {
            console.error('Error storing user info:', error);
            setError("Failed to save your information. Please try again.");
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'white' }}>
            <Stack.Screen options={{ headerShown: false }} />
            
            <SafeAreaView style={{ flex: 1 }}>
                <ScrollView className="flex-1 px-4">
                    {/* Logo and Title */}
                    <View className="items-center mt-8 mb-12">
                        <Image
                            source={require('@/assets/dwellnerlogo.png')}
                            style={{ width: 48, height: 48 }}
                            contentFit="contain"
                            className="mb-6"
                        />
                        <Text className="text-2xl font-semibold">
                            Tell us about you
                        </Text>
                    </View>

                    <View className="space-y-6">
                        {/* Name Input */}
                        <View>
                            <TextInput
                                placeholder="Your Name*"
                                value={name}
                                onChangeText={setName}
                                className="bg-[#F5F5F5] px-4 py-4 rounded-xl text-black text-base"
                                placeholderTextColor="#666666"
                            />
                        </View>

                        {/* User Type Dropdown */}
                        <View>
                            <Pressable
                                onPress={() => {
                                    Keyboard.dismiss();
                                    setDropdownVisible(!dropdownVisible);
                                }}
                                className="bg-[#F5F5F5] px-4 py-4 rounded-xl flex-row justify-between items-center"
                            >
                                <Text className={userType ? "text-black text-base" : "text-gray-500 text-base"}>
                                    {userType || "What Best Describes You?"}
                                </Text>
                                <MaterialIcons
                                    name={dropdownVisible ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                                    size={24}
                                    color="#666666"
                                />
                            </Pressable>

                            {dropdownVisible && (
                                <View className="bg-white rounded-xl mt-2 shadow-md border border-gray-200">
                                    {userTypes.map((type) => (
                                        <Pressable
                                            key={type}
                                            onPress={() => {
                                                setUserType(type);
                                                setDropdownVisible(false);
                                            }}
                                            className="px-4 py-3 border-b border-gray-100"
                                        >
                                            <Text className="text-base">{type}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Date of Birth */}
                        <View>
                            <TextInput
                                placeholder="Date of Birth* (MM/DD/YYYY)"
                                value={dateOfBirth}
                                onChangeText={handleDateChange}
                                keyboardType="numeric"
                                maxLength={10}
                                className="bg-[#F5F5F5] px-4 py-4 rounded-xl text-black text-base"
                                placeholderTextColor="#666666"
                            />
                        </View>

                        {error ? (
                            <Text className="text-red-500 text-sm">
                                {error}
                            </Text>
                        ) : null}

                        {/* Terms and Privacy Policy */}
                        <Text className="text-center text-gray-500 text-sm px-8">
                            By clicking "Continue", you agree to our{' '}
                            <Text 
                                className="text-gray-700 underline"
                                onPress={() => Linking.openURL('https://dwellner.com/terms')}
                            >
                                Terms
                            </Text>
                            {' '}and have read our{' '}
                            <Text 
                                className="text-gray-700 underline"
                                onPress={() => Linking.openURL('https://dwellner.com/policy')}
                            >
                                Privacy Policy
                            </Text>
                        </Text>
                    </View>
                </ScrollView>

                {/* Continue Button */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "position" : "padding"}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 20}
                >
                    <View className="px-4 pb-4">
                        <TouchableOpacity
                            className="w-full bg-[#64B5B3] py-4 rounded-2xl items-center"
                            onPress={handleContinue}
                        >
                            <Text className="text-white font-semibold text-base">
                                Continue
                            </Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
};

export default UserInfoGoogleScreen;