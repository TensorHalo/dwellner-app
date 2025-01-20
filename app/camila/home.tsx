import { View, Text, TouchableOpacity, Animated, Dimensions, StyleSheet } from 'react-native';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Sidebar from '@/components/Sidebar';
import ChatInterface from '@/components/ChatInterface';
import GetProModal from '@/components/get-pro/GetProModal';
import { fetchPendingUserData, storeUserData, getUserData } from '@/utils/dynamodbEmailUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DynamoDBUserRecord, PendingAuthData } from '@/types/user';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.85;
const MENU_BUTTON_WIDTH = 60;

const HomeScreen = () => {
    const router = useRouter();
    const [isSidebarVisible, setSidebarVisible] = useState(false);
    const [isInChat, setIsInChat] = useState(false);
    const [isProModalVisible, setProModalVisible] = useState(false);
    const [userData, setUserData] = useState<DynamoDBUserRecord | null>(null);
    const sidebarPosition = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
    const mainContentPosition = useRef(new Animated.Value(0)).current;
    
    const fetchUserData = async () => {
        try {
            const pendingDataStr = await AsyncStorage.getItem('pendingUserData');
            if (pendingDataStr) {
                const pendingData = JSON.parse(pendingDataStr) as PendingAuthData;
                console.log('Fetching data for user:', pendingData.cognito_id);
                
                const currentUserData = await getUserData(pendingData.cognito_id);
                if (currentUserData) {
                    console.log('Setting user data:', currentUserData);
                    setUserData(currentUserData);
                }
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    // Add this new function to handle user data updates
    const handleUserDataUpdate = useCallback(async () => {
        await fetchUserData();
    }, []);

    useEffect(() => {
        fetchUserData();
    }, []);

    const toggleSidebar = () => {
        const sidebarToValue = isSidebarVisible ? -SIDEBAR_WIDTH : 0;
        const mainContentToValue = isSidebarVisible ? 0 : (SIDEBAR_WIDTH - MENU_BUTTON_WIDTH);

        Animated.parallel([
            Animated.spring(sidebarPosition, {
                toValue: sidebarToValue,
                useNativeDriver: true,
                friction: 8,
                tension: 40,
            }),
            Animated.spring(mainContentPosition, {
                toValue: mainContentToValue,
                useNativeDriver: true,
                friction: 8,
                tension: 40,
            })
        ]).start();

        setSidebarVisible(!isSidebarVisible);
    };

    return (
        <GestureHandlerRootView style={styles.container}>
            {/* Sidebar */}
            <Animated.View style={[
                styles.sidebar,
                {
                    transform: [{ translateX: sidebarPosition }],
                }
            ]}>
                <Sidebar 
                    onClose={toggleSidebar}
                    userData={userData}
                    onGetProPress={() => setProModalVisible(true)}
                    onUpdateUserData={handleUserDataUpdate}
                />
            </Animated.View>

            {/* Main Content */}
            <Animated.View style={[
                styles.mainContent,
                {
                    transform: [{ translateX: mainContentPosition }],
                }
            ]}>
                <Stack.Screen 
                    options={{
                        headerShown: true,
                        headerStyle: {
                            height: 100,
                            backgroundColor: '#FFFFFF',
                        },
                        headerTitleContainerStyle: {
                            paddingVertical: 15,
                        },
                        headerTitle: () => (
                            !isSidebarVisible && (
                                isInChat ? (
                                    <Text className="text-lg font-semibold">Camila</Text>
                                ) : (
                                    <TouchableOpacity 
                                        onPress={() => setProModalVisible(true)}
                                        className="bg-[#54B4AF] px-6 py-1.5 rounded-xl mx-auto"
                                    >
                                        <Text className="text-white font-medium text-base">Get Pro +</Text>
                                    </TouchableOpacity>
                                )
                            )
                        ),
                        headerLeft: () => (
                            <TouchableOpacity 
                                onPress={toggleSidebar}
                                className="pl-4"
                            >
                                <View>
                                    <View style={{ width: 24, height: 2, backgroundColor: 'black', marginBottom: 6 }} />
                                    <View style={{ width: 20, height: 2, backgroundColor: 'black', marginBottom: 6 }} />
                                    <View style={{ width: 16, height: 2, backgroundColor: 'black' }} />
                                </View>
                            </TouchableOpacity>
                        ),
                        headerRight: () => (
                            <View style={{ width: 24 }} />
                        ),
                        headerShadowVisible: false,
                    }}
                />
                <ChatInterface 
                    onChatStart={() => setIsInChat(true)} 
                    userId={userData?.cognito_id || ''} 
                />
            </Animated.View>

            {/* Overlay when sidebar is open */}
            {isSidebarVisible && (
                <TouchableOpacity
                    style={[styles.overlay, { left: SIDEBAR_WIDTH - MENU_BUTTON_WIDTH }]}
                    activeOpacity={1}
                    onPress={toggleSidebar}
                />
            )}

            {/* Pro Modal */}
            <GetProModal 
                visible={isProModalVisible}
                onClose={() => setProModalVisible(false)}
            />
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    sidebar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: SIDEBAR_WIDTH,
        backgroundColor: 'white',
        zIndex: 2,
        shadowColor: "#000",
        shadowOffset: {
            width: 2,
            height: 0,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    mainContent: {
        flex: 1,
        width: SCREEN_WIDTH,
        backgroundColor: 'white',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.2)',
        zIndex: 1,
    },
});

export default HomeScreen;