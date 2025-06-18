// app/user_auth/onboarding.tsx
import { View, Text, TouchableOpacity } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface FeatureItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title, description }) => {
  return (
    <View className="flex-row items-start space-x-4 mb-12">
      <View className="w-14 h-14 bg-black rounded-[18px] items-center justify-center">
        {icon}
      </View>
      <View className="flex-1 pt-1.5">
        <Text className="text-[17px] font-semibold text-black mb-1">
          {title}
        </Text>
        <Text className="text-[15px] leading-5 text-gray-500">
          {description}
        </Text>
      </View>
    </View>
  );
};

const OnboardingScreen = () => {
  const router = useRouter();

  const handleContinue = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      router.push("/navigation/camila/home");
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />

      <View style={{ flex: 1, backgroundColor: 'white' }}>
        <SafeAreaView className="flex-1">
          <View className="flex-1 px-8 pt-20">
            
            <Text className="text-[32px] font-bold text-black mb-4">
              Welcome to{'\n'}DeepHome
            </Text>
            
            <Text className="text-[15px] text-gray-500 mb-12 max-w-[90%]">
              The home search is free for any home seekers with limited times of access.
            </Text>

            <FeatureItem
              icon={
                <View className="items-center justify-center">
                  <Ionicons name="home" size={28} color="white" />
                </View>
              }
              title="Find homes based on your preferences"
              description="Property type, location, surroundings, safety, price, decoration style, etc."
            />

            <FeatureItem
              icon={
                <View className="items-center justify-center">
                  <Ionicons name="add" size={32} color="white" />
                </View>
              }
              title="List your property for free"
              description="Sell, song-term Rent, short-term Rent, sublet."
            />

            <FeatureItem
              icon={
                <View className="items-center justify-center">
                  <MaterialCommunityIcons name="trending-up" size={30} color="white" />
                </View>
              }
              title="Grow your real estate business"
              description="Agents can subscribe to DeepHome Ultra for more deals and quality client leads."
            />
          </View>

          <View className="px-4 pb-12">
            <TouchableOpacity
              className="w-full bg-[#68B8B4] py-4 rounded-full items-center"
              onPress={handleContinue}
            >
              <Text className="text-white font-semibold text-[17px]">
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