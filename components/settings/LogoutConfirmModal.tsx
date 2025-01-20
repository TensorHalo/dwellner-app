import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from 'react-native';

interface LogoutConfirmModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}

const LogoutConfirmModal = ({ visible, onClose, onConfirm }: LogoutConfirmModalProps) => {
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        try {
            setIsLoggingOut(true);
            await onConfirm();
        } catch (error) {
            console.error('Error during logout:', error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
        >
            <View style={styles.container}>
                <View style={styles.content}>
                    <Text style={styles.title}>Log out</Text>
                    <Text style={styles.message}>
                        Are you sure you want to log out?
                    </Text>
                    
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity 
                            style={[styles.button, styles.cancelButton]}
                            onPress={onClose}
                            disabled={isLoggingOut}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.button, styles.logoutButton]}
                            onPress={handleLogout}
                            disabled={isLoggingOut}
                        >
                            {isLoggingOut ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.logoutButtonText}>Log out</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        backgroundColor: 'white',
        borderRadius: 14,
        width: '80%',
        padding: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        marginHorizontal: 6,
    },
    cancelButton: {
        backgroundColor: '#F0F0F0',
    },
    logoutButton: {
        backgroundColor: '#FF3B30',
    },
    cancelButtonText: {
        color: '#000',
        textAlign: 'center',
        fontWeight: '500',
    },
    logoutButtonText: {
        color: 'white',
        textAlign: 'center',
        fontWeight: '500',
    },
});

export default LogoutConfirmModal;