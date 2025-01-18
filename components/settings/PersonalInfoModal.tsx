// @/components/settings/PersonalInfoModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { DynamoDBUserRecord } from '@/types/user';
import EditFieldModal from './EditFieldModal';
import PhoneEditModal from './PhoneEditModal';
import { updateUserField } from '@/utils/dynamodbUserInfoUtils';
import { getUserData } from '@/utils/dynamodbEmailUtils';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MODAL_TOP_MARGIN = 80;

interface PersonalInfoModalProps {
    visible: boolean;
    onClose: () => void;
    userData: DynamoDBUserRecord | null;
    onUpdateUserData: () => Promise<void>;
}

interface InfoRowProps {
    label: string;
    value: string;
    placeholder?: string;
    onPress?: () => void;
    showChevron?: boolean;
}

const InfoRow = ({ label, value, placeholder = 'Not set', onPress, showChevron = false }: InfoRowProps) => (
    <TouchableOpacity 
        style={styles.infoRow}
        onPress={onPress}
        disabled={!onPress}
    >
        <View>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={[styles.infoValue, !value && styles.placeholder]}>
                {value || placeholder}
            </Text>
        </View>
        {(onPress || showChevron) && (
            <MaterialIcons name="chevron-right" size={24} color="#999" />
        )}
    </TouchableOpacity>
);

const PersonalInfoModal = ({ visible, onClose, userData, onUpdateUserData }: PersonalInfoModalProps) => {
    const [editField, setEditField] = useState<{
        field: string;
        label: string;
        value: string;
    } | null>(null);
    const [localUserData, setLocalUserData] = useState(userData);
    const [modalVisible, setModalVisible] = useState(false);
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    useEffect(() => {
        if (visible) {
            setModalVisible(true);
            slideAnim.setValue(SCREEN_HEIGHT);
            Animated.spring(slideAnim, {
                toValue: 0,
                damping: 20,
                mass: 0.4,
                stiffness: 100,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    useEffect(() => {
        setLocalUserData(userData);
    }, [userData]);

    const handleClose = () => {
        Animated.spring(slideAnim, {
            toValue: SCREEN_HEIGHT,
            damping: 20,
            mass: 0.4,
            stiffness: 100,
            useNativeDriver: true,
        }).start(() => {
            setModalVisible(false);
            onClose();
        });
    };

    const handleFieldUpdate = async (value: string) => {
        if (!userData?.cognito_id || !editField) return;

        try {
            const success = await updateUserField(
                userData.cognito_id,
                editField.field,
                value
            );

            if (success) {
                const updatedData = await getUserData(userData.cognito_id);
                if (updatedData) {
                    setLocalUserData(updatedData);
                    await onUpdateUserData();
                }
                setEditField(null);
            }
        } catch (error) {
            console.error('Error updating field:', error);
            throw error;
        }
    };

    if (!modalVisible) return null;

    return (
        <Modal
            visible={true}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            <View style={styles.container}>
                <TouchableOpacity 
                    style={styles.overlay}
                    activeOpacity={1}
                    onPress={handleClose}
                />
                <Animated.View 
                    style={[
                        styles.modal,
                        {
                            transform: [{
                                translateY: slideAnim
                            }]
                        }
                    ]}
                >
                    <SafeAreaView edges={['top']} style={styles.content}>
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={handleClose}
                            >
                                <MaterialIcons name="close" size={24} color="#000" />
                            </TouchableOpacity>
                            <Text style={styles.title}>Personal info</Text>
                        </View>

                        <View style={styles.infoContainer}>
                            <InfoRow
                                label="Legal name"
                                value={localUserData?.profile?.name || ''}
                            />

                            <InfoRow
                                label="Preferred first name"
                                value={localUserData?.profile?.preferred_name || ''}
                                onPress={() => setEditField({
                                    field: 'preferred_name',
                                    label: 'Preferred first name',
                                    value: localUserData?.profile?.preferred_name || ''
                                })}
                                showChevron={true}
                            />

                            <InfoRow
                                label="Phone number"
                                value={localUserData?.auth_methods?.phone?.phone_number || ''}
                                onPress={() => setEditField({
                                    field: 'phone_number',
                                    label: 'Phone number',
                                    value: localUserData?.auth_methods?.phone?.phone_number || ''
                                })}
                                showChevron={true}
                            />

                            <InfoRow
                                label="Email"
                                value={localUserData?.auth_methods?.email?.email_address || ''}
                            />
                        </View>
                    </SafeAreaView>
                </Animated.View>

                {editField?.field === 'phone_number' ? (
                    <PhoneEditModal
                        visible={!!editField}
                        onClose={() => setEditField(null)}
                        onSave={handleFieldUpdate}
                        currentValue={editField.value}
                    />
                ) : (
                    <EditFieldModal
                        visible={!!editField}
                        onClose={() => setEditField(null)}
                        onSave={handleFieldUpdate}
                        fieldLabel={editField?.label || ''}
                        currentValue={editField?.value || ''}
                    />
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    modal: {
        position: 'absolute',
        top: MODAL_TOP_MARGIN,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E5E5',
    },
    backButton: {
        marginRight: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
        marginRight: 40,
    },
    infoContainer: {
        flex: 1,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E5E5E5',
        backgroundColor: 'white',
    },
    infoLabel: {
        fontSize: 16,
        fontWeight: '400',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 14,
        color: '#666',
    },
    placeholder: {
        color: '#999',
        fontStyle: 'italic',
    }
});

export default PersonalInfoModal;