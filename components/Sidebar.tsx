// @/components/Sidebar.tsx
import { View, Text, TouchableOpacity } from 'react-native';
import React, { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather as FeatherIcon } from '@expo/vector-icons';
import GetProModal from './get-pro/GetProModal';
import UserSettingsModal from './settings/UserSettingsModal';
import { DynamoDBUserRecord } from '@/types/user';
import { getUserData } from '@/utils/dynamodbEmailUtils';

interface SidebarProps {
    onClose: () => void;
    userData: DynamoDBUserRecord | null;
    onUpdateUserData?: (newData: DynamoDBUserRecord) => void;
}

const Sidebar = ({ onClose, userData, onUpdateUserData }: SidebarProps) => {
    const [isSettingsVisible, setIsSettingsVisible] = useState(false);
    const [isProModalVisible, setProModalVisible] = useState(false);
    const [localUserData, setLocalUserData] = useState(userData);

    const handleUserDataUpdate = useCallback(async () => {
        if (userData?.cognito_id) {
            try {
                const updatedData = await getUserData(userData.cognito_id);
                if (updatedData) {
                    setLocalUserData(updatedData);
                    onUpdateUserData?.(updatedData);
                }
            } catch (error) {
                console.error('Error refreshing user data:', error);
            }
        }
    }, [userData?.cognito_id, onUpdateUserData]);

    return (
        <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
            <View className="flex-1">
                <View className="flex-1 justify-center px-4">
                    <Text className="text-gray-500 text-center text-base mb-4">
                        Multi-Sessions are exclusively{'\n'}available for Pro users.
                    </Text>
                    <TouchableOpacity 
                        className="bg-[#E8F4F4] py-2.5 rounded-2xl items-center mx-4"
                        onPress={() => setProModalVisible(true)}
                    >
                        <Text className="text-[#54B4AF] font-medium text-base">Get Pro +</Text>
                    </TouchableOpacity>
                </View>

                <View className="px-4 mb-8">
                    <View className="flex-row items-center px-3 py-2.5 bg-[#F8F8F8] rounded-xl">
                        <View className="w-8 h-8 bg-[#E8F4F4] rounded-lg items-center justify-center">
                            <Text className="text-[#54B4AF] font-medium">
                                {localUserData?.profile?.name?.[0]?.toUpperCase() || 'U'}
                            </Text>
                        </View>
                        <Text className="ml-3 font-medium text-base">
                            {localUserData?.profile?.name?.toUpperCase() || 'USER'}
                        </Text>
                        <TouchableOpacity 
                            className="ml-auto"
                            onPress={() => setIsSettingsVisible(true)}
                        >
                            <FeatherIcon name="more-horizontal" size={20} color="gray" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <GetProModal 
                visible={isProModalVisible}
                onClose={() => setProModalVisible(false)}
            />

            <UserSettingsModal
                visible={isSettingsVisible}
                onClose={() => setIsSettingsVisible(false)}
                userData={localUserData}
                onUpdateUserData={handleUserDataUpdate}
            />
        </SafeAreaView>
    );
};

export default Sidebar;