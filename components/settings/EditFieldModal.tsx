// @/components/settings/EditFieldModal.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface EditFieldModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (value: string) => Promise<void>;
    fieldLabel: string;
    currentValue: string;
    placeholder?: string;
}

const EditFieldModal = ({ 
    visible, 
    onClose, 
    onSave,
    fieldLabel,
    currentValue,
    placeholder
}: EditFieldModalProps) => {
    const [value, setValue] = useState(currentValue);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setValue(currentValue);
    }, [currentValue]);

    const handleSave = async () => {
        try {
            setLoading(true);
            await onSave(value);
            onClose();
        } catch (error) {
            console.error('Error saving field:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <TouchableOpacity 
                            onPress={onClose}
                            style={styles.closeButton}
                        >
                            <MaterialIcons name="close" size={24} color="#000" />
                        </TouchableOpacity>
                        <Text style={styles.title}>{fieldLabel}</Text>
                    </View>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={value}
                            onChangeText={setValue}
                            placeholder={placeholder || `Enter ${fieldLabel.toLowerCase()}`}
                            autoFocus
                        />
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.saveButton,
                            { opacity: !value.trim() || loading ? 0.5 : 1 }
                        ]}
                        onPress={handleSave}
                        disabled={!value.trim() || loading}
                    >
                        <Text style={styles.saveButtonText}>
                            {loading ? 'Saving...' : 'Save'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 34,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
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
    inputContainer: {
        padding: 16,
    },
    input: {
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#F9F9F9',
    },
    saveButton: {
        backgroundColor: '#54B4AF',
        marginHorizontal: 16,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
});

export default EditFieldModal;