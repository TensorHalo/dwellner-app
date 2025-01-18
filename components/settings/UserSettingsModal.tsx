// @/components/settings/UserSettingsModal.tsx
import { View, Text, TouchableOpacity, Modal, StyleSheet, Dimensions, Animated, TouchableWithoutFeedback, Linking } from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { DynamoDBUserRecord } from '@/types/user';
import PersonalInfoModal from './PersonalInfoModal';
import LogoutConfirmModal from './LogoutConfirmModal';
import ProfileModal from './ProfileModal';
import { signOut } from '@/utils/cognitoConfig';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MODAL_TOP_MARGIN = 80;

interface MenuItem {
    icon: string;
    label: string;
    value?: string;
    onPress?: () => void;
    isLast?: boolean;
    isDestructive?: boolean;
    showChevron?: boolean;
}

const MenuItem = ({ 
    icon, 
    label, 
    value, 
    onPress, 
    isLast = false,
    isDestructive = false,
    showChevron = false
}: MenuItem) => (
    <TouchableOpacity 
        style={[
            styles.menuItem,
            !isLast && styles.menuItemBorder
        ]}
        onPress={onPress}
    >
        <View style={styles.menuItemLeft}>
            <MaterialIcons 
                name={icon} 
                size={24} 
                color={isDestructive ? '#FF3B30' : '#333'} 
            />
            <Text style={[
                styles.menuItemLabel,
                isDestructive && styles.destructiveText
            ]}>
                {label}
            </Text>
        </View>
        <View style={styles.menuItemRight}>
            {value && <Text style={styles.menuItemValue}>{value}</Text>}
            {(onPress || showChevron) && <MaterialIcons name="chevron-right" size={24} color="#999" />}
        </View>
    </TouchableOpacity>
);

const UserSettingsModal = ({ visible, onClose, userData, onUpdateUserData }: {
    visible: boolean;
    onClose: () => void;
    userData: DynamoDBUserRecord | null;
    onUpdateUserData: () => Promise<void>;
}) => {
    const router = useRouter();
    const [showPersonalInfo, setShowPersonalInfo] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    useEffect(() => {
        if (visible) {
            translateY.setValue(SCREEN_HEIGHT);
            Animated.spring(translateY, {
                toValue: 0,
                damping: 20,
                mass: 0.4,
                stiffness: 100,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const handleClose = () => {
        onClose();
    };

    const handleLogout = async () => {
        try {
            await signOut();
            router.replace('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <TouchableWithoutFeedback onPress={handleClose}>
                <View style={styles.container}>
                    <TouchableWithoutFeedback>
                        <Animated.View 
                            style={[
                                styles.modal,
                                {
                                    transform: [{ translateY }],
                                }
                            ]}
                        >
                            <SafeAreaView edges={['top']} style={styles.content}>
                                <View style={styles.header}>
                                    <Text style={styles.headerTitle}>Settings</Text>
                                    <TouchableOpacity
                                        style={styles.closeButton}
                                        onPress={handleClose}
                                    >
                                        <MaterialIcons name="close" size={24} color="#000" />
                                    </TouchableOpacity>
                                </View>

                                {/* Profile Section */}
                                <TouchableOpacity 
                                    style={styles.profileSection}
                                    onPress={() => setShowProfile(true)}
                                >
                                    <View style={styles.avatar}>
                                        {userData?.profile?.avatar_url ? (
                                            <Image 
                                                source={{ uri: userData.profile.avatar_url }}
                                                style={styles.avatarImage}
                                            />
                                        ) : (
                                            <Text style={styles.avatarText}>
                                                {userData?.profile?.name?.[0]?.toUpperCase() || 'U'}
                                            </Text>
                                        )}
                                    </View>
                                    <Text style={styles.userName}>
                                        {userData?.profile?.name || 'User'}
                                    </Text>
                                    <MaterialIcons name="chevron-right" size={24} color="#999" />
                                </TouchableOpacity>

                                {/* Account Section */}
                                <View style={[styles.menuSection, styles.firstSection]}>
                                    <MenuItem
                                        icon="person-outline"
                                        label="Personal information"
                                        onPress={() => setShowPersonalInfo(true)}
                                        showChevron={true}
                                    />
                                    <MenuItem
                                        icon="add-circle-outline"
                                        label="Subscription"
                                        value={userData?.is_pro ? "Dwellner Pro" : "Free Plan"}
                                    />
                                    <MenuItem
                                        icon="palette"
                                        label="Color Scheme"
                                        value="System"
                                        isLast
                                    />
                                </View>

                                {/* Support Section */}
                                <View style={styles.menuSection}>
                                    <MenuItem
                                        icon="help-outline"
                                        label="Help Center"
                                        onPress={() => {}}
                                        showChevron={true}
                                    />
                                    <MenuItem
                                        icon="description"
                                        label="Terms of Use"
                                        onPress={() => Linking.openURL('https://dwellner.com/terms')}
                                        showChevron={true}
                                    />
                                    <MenuItem
                                        icon="lock-outline"
                                        label="Privacy Policy"
                                        onPress={() => Linking.openURL('https://dwellner.com/policy')}
                                        showChevron={true}
                                    />
                                    <MenuItem
                                        icon="phone-iphone"
                                        label="Dwellner for iOS"
                                        value="0.9.8"
                                        isLast
                                    />
                                </View>

                                {/* Logout Section */}
                                <View style={styles.menuSection}>
                                    <MenuItem
                                        icon="logout"
                                        label="Log out"
                                        isDestructive
                                        onPress={() => setShowLogoutConfirm(true)}
                                    />
                                </View>
                            </SafeAreaView>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>

            <PersonalInfoModal 
                visible={showPersonalInfo}
                onClose={() => setShowPersonalInfo(false)}
                userData={userData}
                onUpdateUserData={onUpdateUserData}
            />

            <ProfileModal 
                visible={showProfile}
                onClose={() => setShowProfile(false)}
                userData={userData}
                onUpdateUserData={onUpdateUserData}
            />

            <LogoutConfirmModal
                visible={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleLogout}
            />
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'flex-end',
    },
    modal: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        minHeight: SCREEN_HEIGHT - MODAL_TOP_MARGIN,
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E5E5',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    closeButton: {
        position: 'absolute',
        right: 16,
        top: 16,
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E5E5',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F0F0F0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#666',
    },
    userName: {
        fontSize: 16,
        fontWeight: '500',
        flex: 1,
    },
    menuSection: {
        backgroundColor: 'white',
        marginTop: 20,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: '#E5E5E5',
    },
    firstSection: {
        marginTop: 0,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: 'white',
    },
    menuItemBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E5E5',
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuItemLabel: {
        marginLeft: 12,
        fontSize: 16,
    },
    menuItemRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    menuItemValue: {
        fontSize: 16,
        color: '#999',
    },
    destructiveText: {
        color: '#FF3B30',
    }
});

export default UserSettingsModal;