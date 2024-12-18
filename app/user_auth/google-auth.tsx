import { View, Text, TouchableOpacity, TextInput } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';

const EmailAuth = () => {
    const router = useRouter();
    const [email, setEmail] = React.useState("");

    return (
        <SafeAreaView className="flex-1 bg-white">
            <StatusBar style="dark" />
            
            {/* Header */}
            <View className="px-4 pt-2">
                <TouchableOpacity 
                    onPress={() => router.back()}
                    className="w-10 h-10 items-center justify-center rounded-full"
                >
                    <Ionicons name="chevron-back" size={24} color="black" />
                </TouchableOpacity>
            </View>

            {/* Content */}
            <View className="px-4 mt-4">
                {/* Icon */}
                <View className="mb-4">
                    <Ionicons name="mail-outline" size={28} color="black" />
                </View>

                {/* Title and subtitle */}
                <Text className="text-2xl font-semibold mb-2">
                    Continue with Email
                </Text>
                <Text className="text-gray-500 mb-8">
                    Sign in or sign up with your email.
                </Text>

                {/* Email Input */}
                <View className="mb-6">
                    <TextInput
                        placeholder="Email address"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        className="w-full px-4 py-3 bg-gray-100 rounded-lg text-black"
                    />
                </View>

                {/* Continue Button */}
                <TouchableOpacity
                    className="w-full bg-[#5eead4] py-4 rounded-lg items-center"
                    onPress={() => {
                        // Handle email submission
                        if (email) {
                            router.push("/user_auth/verify");
                        }
                    }}
                >
                    <Text className="text-black font-semibold">
                        Continue
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default EmailAuth;