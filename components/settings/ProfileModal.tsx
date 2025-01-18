// @/components/settings/ProfileModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    StyleSheet, 
    Modal, 
    Dimensions,
    Image,
    Animated,
    TouchableWithoutFeedback,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { DynamoDBUserRecord } from '@/types/user';
import { updateUserField } from '@/utils/dynamodbUserInfoUtils';
import { getUserData } from '@/utils/dynamodbEmailUtils';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MODAL_TOP_MARGIN = 80;
const AVATAR_SIZE = 120;

interface ProfileModalProps {
    visible: boolean;
    onClose: () => void;
    userData: DynamoDBUserRecord | null;
    onUpdateUserData: () => Promise<void>;
}

const ProfileModal = ({ visible, onClose, userData, onUpdateUserData }: ProfileModalProps) => {
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

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

    useEffect(() => {
        setAvatarUrl(userData?.profile?.avatar_url || null);
    }, [userData]);

    const handleImagePick = async () => {
        try {
            // Request permissions
            if (Platform.OS !== 'web') {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    alert('Sorry, we need camera roll permissions to make this work!');
                    return;
                }
            }

            // Launch image picker
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.5,
                base64: true,
            });

            if (!result.canceled && result.assets[0]) {
                setUploading(true);
                try {
                    // Here you would typically:
                    // 1. Upload the image to your storage (S3, etc)
                    // 2. Get the URL back
                    // 3. Update the user record with the new URL
                    // For now, we'll use the local URI as a placeholder
                    const imageUrl = result.assets[0].uri;
                    
                    if (userData?.cognito_id) {
                        await updateUserField(
                            userData.cognito_id,
                            'avatar_url',
                            imageUrl
                        );
                        await onUpdateUserData();
                        setAvatarUrl(imageUrl);
                    }
                } catch (error) {
                    console.error('Error updating avatar:', error);
                    alert('Failed to update profile picture');
                }
                setUploading(false);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            alert('Failed to select image');
            setUploading(false);
        }
    };

    const handleClose = () => {
        Animated.spring(translateY, {
            toValue: SCREEN_HEIGHT,
            damping: 20,
            mass: 0.4,
            stiffness: 100,
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
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
                                    transform: [{ translateY }]
                                }
                            ]}
                        >
                            <SafeAreaView edges={['top']} style={styles.content}>
                                <View style={styles.header}>
                                    <TouchableOpacity
                                        style={styles.closeButton}
                                        onPress={handleClose}
                                    >
                                        <MaterialIcons name="close" size={24} color="#000" />
                                    </TouchableOpacity>
                                    <Text style={styles.title}>Profile</Text>
                                </View>

                                <View style={styles.avatarContainer}>
                                    <View style={styles.avatarWrapper}>
                                        {avatarUrl ? (
                                            <Image 
                                                source={{ uri: avatarUrl }} 
                                                style={styles.avatar}
                                            />
                                        ) : (
                                            <View style={styles.avatarPlaceholder}>
                                                <Text style={styles.avatarText}>
                                                    {userData?.profile?.name?.[0]?.toUpperCase() || 'U'}
                                                </Text>
                                            </View>
                                        )}
                                        <TouchableOpacity 
                                            style={styles.editButton}
                                            onPress={handleImagePick}
                                            disabled={uploading}
                                        >
                                            <MaterialIcons name="camera-alt" size={20} color="white" />
                                            <Text style={styles.editButtonText}>Edit</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <TouchableOpacity 
                                    style={styles.doneButton}
                                    onPress={handleClose}
                                >
                                    <Text style={styles.doneButtonText}>Done</Text>
                                </TouchableOpacity>
                            </SafeAreaView>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
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
    closeButton: {
        position: 'absolute',
        left: 16,
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    avatarContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    avatarWrapper: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        position: 'relative',
    },
    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
    },
    avatarPlaceholder: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        backgroundColor: '#F0F0F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 40,
        fontWeight: '500',
        color: '#666',
    },
    editButton: {
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transform: [{ translateX: -30 }],
        backgroundColor: '#54B4AF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    editButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
    },
    doneButton: {
        backgroundColor: '#54B4AF',
        margin: 16,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    doneButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
});

export default ProfileModal;