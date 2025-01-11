import { View, Text, TouchableOpacity } from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather as FeatherIcon } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
// import UserSettings from './user-settings';

interface SidebarProps {
    onClose: () => void;
}

const Sidebar = ({ onClose }: SidebarProps) => {
    const router = useRouter();
    const [isSettingsVisible, setIsSettingsVisible] = useState(false);

    return (
        <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
            <View className="flex-1">
                <View className="flex-1 justify-center px-4">
                    <Text className="text-gray-500 text-center text-base mb-4">
                        Multi-Sessions are exclusively{'\n'}available for Pro users.
                    </Text>
                    <TouchableOpacity 
                        className="bg-[#E8F4F4] py-2.5 rounded-2xl items-center mx-4"
                        onPress={() => router.push("/camila/get-pro")}
                    >
                        <Text className="text-[#54B4AF] font-medium text-base">Get Pro +</Text>
                    </TouchableOpacity>
                </View>

                <View className="px-4 mb-8">
                    <View className="flex-row items-center px-3 py-2.5 bg-[#F8F8F8] rounded-xl">
                        <View className="w-8 h-8 bg-[#E8F4F4] rounded-lg items-center justify-center">
                            <Text className="text-[#54B4AF] font-medium">SE</Text>
                        </View>
                        <Text className="ml-3 font-medium text-base">SEAN</Text>
                        <TouchableOpacity 
                            className="ml-auto"
                            onPress={() => setIsSettingsVisible(true)}
                        >
                            <FeatherIcon name="more-horizontal" size={20} color="gray" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* <UserSettings 
                visible={isSettingsVisible}
                onClose={() => setIsSettingsVisible(false)}
            /> */}
        </SafeAreaView>
    );
};

export default Sidebar;