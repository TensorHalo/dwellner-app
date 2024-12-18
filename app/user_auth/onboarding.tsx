// app/user_auth/onboarding.tsx
import { View, Text, TouchableOpacity } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';

const OnboardingScreen = () => {
    const router = useRouter();
    
    const handleContinue = async () => {
        try {
            await AsyncStorage.setItem('hasSeenOnboarding', 'true');
            router.push("/camila/home");
        } catch (error) {
            console.error('Error saving onboarding status:', error);
        }
    };

    return (
        <>
            <Stack.Screen options={{ 
                headerShown: false,
                gestureEnabled: false 
            }} />
            
            <View style={{ flex: 1, backgroundColor: 'white' }}>
                <SafeAreaView className="flex-1">
                    <View className="flex-1 px-4 pt-12">
                        <Text className="text-[32px] font-bold text-black mb-4">
                            Welcome to{"\n"}Dwellner
                        </Text>
                        <Text className="text-gray-500 text-base">
                            The home search function is free for any home seekers with limited times of access.
                        </Text>
                    </View>
                    <View className="px-4 pb-8">
                        <TouchableOpacity
                            className="w-full bg-[#68B8B4] py-3.5 rounded-xl items-center"
                            onPress={handleContinue}
                        >
                            <Text className="text-white font-semibold text-lg">
                                Continue
                            </Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        </>
    );
};

export default OnboardingScreen;