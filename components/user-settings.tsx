import React, { useState, useEffect, useRef } from 'react';
import { 
    View, Text, TouchableOpacity, StyleSheet, Modal, 
    PanResponder, Animated, Dimensions, TextInput,
    KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Image 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { auth, db } from '@/utils/firebase-config';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import {updateUserProfile} from '@/utils/userService';
import defaultAvatar from '@/assets/dwellnerLogo.png';

interface UserSettingsProps {
    visible: boolean;
    onClose: () => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

const UserSettings = ({ visible, onClose }: UserSettingsProps) => {
    const router = useRouter();
    const panY = useRef(new Animated.Value(0)).current;
    const [displayName, setDisplayName] = useState('');
    const [tempDisplayName, setTempDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [tempAvatarUrl, setTempAvatarUrl] = useState('');
    const [isPro, setIsPro] = useState(false);
    const [loading, setLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [currentEmail, setCurrentEmail] = useState('');
    const unsubscribeRef = useRef<(() => void) | null>(null);

    const resetPositionAnim = Animated.timing(panY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
    });

    const closeAnim = Animated.timing(panY, {
        toValue: SCREEN_HEIGHT,
        duration: 500,
        useNativeDriver: true,
    });

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => false,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    panY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 50) {
                    closeAnim.start(onClose);
                } else {
                    resetPositionAnim.start();
                }
            },
        })
    ).current;

    useEffect(() => {
        if (visible && auth.currentUser?.email) {
            const userRef = doc(db, 'users', auth.currentUser.email);
            
            const unsubscribe = onSnapshot(userRef, (doc) => {
                if (doc.exists()) {
                    const userData = doc.data();
                    console.log('Loaded user data:', userData); // Debug log
                    setCurrentEmail(auth.currentUser?.email || '');
                    setDisplayName(userData.name || '');
                    setTempDisplayName(userData.name || '');
                    setAvatarUrl(userData.avatarUrl || '');
                    setTempAvatarUrl(userData.avatarUrl || '');
                    setIsPro(userData.isPro || false);
                }
            }, (error) => {
                console.error('Error fetching user data:', error);
                Alert.alert('Error', 'Failed to load user data');
            });
    
            unsubscribeRef.current = unsubscribe;
            return () => unsubscribe();
        }
    }, [visible, auth.currentUser?.email]);

    useEffect(() => {
        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
        };
    }, []);

    useEffect(() => {
        setHasChanges(
            tempDisplayName !== displayName ||
            tempAvatarUrl !== avatarUrl
        );
    }, [tempDisplayName, tempAvatarUrl, displayName, avatarUrl]);

    const handlePickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            
            if (!permissionResult.granted) {
                Alert.alert('Permission Required', 'Please grant camera roll permissions to change your avatar.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
            });

            if (!result.canceled && result.assets[0]) {
                setTempAvatarUrl(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handleSaveChanges = async () => {
        const email = auth.currentUser?.email;
        if (!email || !hasChanges) return;

        try {
            setLoading(true);
            
            await updateUserProfile(email, {
                name: tempDisplayName,
                avatarUrl: tempAvatarUrl
            });

            setDisplayName(tempDisplayName);
            setAvatarUrl(tempAvatarUrl);
            setHasChanges(false);
            Alert.alert('Success', 'Profile updated successfully');
        } catch (error) {
            console.error('Error saving changes:', error);
            Alert.alert('Error', 'Failed to save changes');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
            await auth.signOut();
            onClose();
            router.replace('/');
        } catch (error) {
            console.error('Error signing out:', error);
            Alert.alert('Error', 'Failed to sign out');
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.container}
            >
                <Animated.View 
                    style={[
                        styles.content,
                        {
                            transform: [{
                                translateY: panY.interpolate({
                                    inputRange: [0, SCREEN_HEIGHT],
                                    outputRange: [0, SCREEN_HEIGHT],
                                })
                            }]
                        }
                    ]}
                    {...panResponder.panHandlers}
                >
                    <View style={styles.dragIndicator} />
                    
                    <View style={styles.avatarContainer}>
                        <TouchableOpacity onPress={handlePickImage} disabled={loading}>
                        {tempAvatarUrl ? (
                            <Image 
                                source={{ uri: tempAvatarUrl }}
                                defaultSource={defaultAvatar}
                                style={styles.avatar}
                            />
                        ) : (
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {tempDisplayName ? tempDisplayName.substring(0, 2).toUpperCase() : 'US'}
                                </Text>
                            </View>
                        )}
                            <View style={styles.cameraButton}>
                                <Feather name="camera" size={12} color="white" />
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.infoContainer}>
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Display Name</Text>
                            <TextInput
                                style={[styles.input, loading && styles.inputDisabled]}
                                value={tempDisplayName}
                                onChangeText={setTempDisplayName}
                                placeholder="Enter display name"
                                placeholderTextColor="#999"
                                editable={!loading}
                                maxLength={30}
                            />
                        </View>

                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Email</Text>
                            <Text style={styles.value}>{currentEmail || 'No email'}</Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Account Status</Text>
                            <Text style={[styles.value, isPro && styles.proBadge]}>
                                {isPro ? 'PRO' : 'Free'}
                            </Text>
                        </View>

                        {hasChanges && (
                            <TouchableOpacity 
                                style={[styles.saveButton, loading && styles.buttonDisabled]}
                                onPress={handleSaveChanges}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Save Changes</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity 
                        style={styles.logoutButton}
                        onPress={handleLogout}
                        disabled={loading}
                    >
                        <Feather name="log-out" size={20} color="#FF4444" />
                        <Text style={styles.logoutText}>Switch Account</Text>
                    </TouchableOpacity>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    content: {
        flex: 1,
        backgroundColor: 'white',
        padding: 24,
        marginTop: 50,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    dragIndicator: {
        alignSelf: 'center',
        width: 40,
        height: 4,
        backgroundColor: '#E1E1E1',
        borderRadius: 2,
        marginBottom: 24,
    },
    avatarContainer: {
        alignItems: 'center',
        marginVertical: 32,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#E8F4F4',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 32,
        color: '#54B4AF',
        fontWeight: '500',
    },
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#54B4AF',
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    infoContainer: {
        marginTop: 32,
    },
    infoRow: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
        fontWeight: '500',
    },
    value: {
        fontSize: 16,
        color: '#000',
        padding: 12,
        backgroundColor: '#F8F8F8',
        borderRadius: 8,
    },
    input: {
        fontSize: 16,
        color: '#000',
        padding: 12,
        backgroundColor: '#F8F8F8',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E1E1E1',
    },
    inputDisabled: {
        opacity: 0.5,
    },
    proBadge: {
        backgroundColor: '#54B4AF',
        color: 'white',
        fontWeight: '500',
    },
    saveButton: {
        backgroundColor: '#54B4AF',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 16,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    logoutButton: {
        position: 'absolute',
        bottom: 50,
        left: 24,
        right: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderWidth: 1,
        borderColor: '#FF4444',
        borderRadius: 12,
    },
    logoutText: {
        color: '#FF4444',
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '500',
    },
});

export default UserSettings;