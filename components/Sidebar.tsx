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
    onGetProPress?: () => void;
    onUpdateUserData?: () => Promise<void>;
}

const Sidebar = ({ onClose, userData, onGetProPress, onUpdateUserData }: SidebarProps) => {
    const [isSettingsVisible, setIsSettingsVisible] = useState(false);
    const [isProModalVisible, setProModalVisible] = useState(false);

    // console.log('Sidebar rendering with userData:', userData);

    const handleSettingsClose = useCallback(async () => {
        setIsSettingsVisible(false);
        if (onUpdateUserData) {
            await onUpdateUserData();
        }
    }, [onUpdateUserData]);

    const handleProModalOpen = useCallback(() => {
        if (onGetProPress) {
            onGetProPress();
        } else {
            setProModalVisible(true);
        }
    }, [onGetProPress]);

    const displayName = userData?.profile?.name || 'USER';
    const displayInitial = userData?.profile?.name?.[0]?.toUpperCase() || 'U';

    return (
        <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
            <View className="flex-1">
                <View className="flex-1 justify-center px-4">
                    <Text className="text-gray-500 text-center text-base mb-4">
                        Multi-Sessions are exclusively{'\n'}available for Pro users.
                    </Text>
                    <TouchableOpacity 
                        className="bg-[#E8F4F4] py-2.5 rounded-2xl items-center mx-4"
                        onPress={handleProModalOpen}
                    >
                        <Text className="text-[#54B4AF] font-medium text-base">Get Pro +</Text>
                    </TouchableOpacity>
                </View>

                <View className="px-4 mb-8">
                    <View className="flex-row items-center px-3 py-2.5 bg-[#F8F8F8] rounded-xl">
                        <View className="w-8 h-8 bg-[#E8F4F4] rounded-lg items-center justify-center">
                            <Text className="text-[#54B4AF] font-medium">
                                {displayInitial}
                            </Text>
                        </View>
                        <Text className="ml-3 font-medium text-base">
                            {displayName}
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

            {/* Pro Modal */}
            <GetProModal 
                visible={isProModalVisible}
                onClose={() => setProModalVisible(false)}
            />

            {/* Settings Modal */}
            <UserSettingsModal
                visible={isSettingsVisible}
                onClose={handleSettingsClose}
                userData={userData}
                onUpdateUserData={onUpdateUserData}
            />
        </SafeAreaView>
    );
};

export default Sidebar;