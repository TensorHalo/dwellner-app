// @/components/settings/PhoneEditModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    StyleSheet, 
    Modal, 
    Dimensions,
    TextInput,
    Pressable,
    Animated,
    TouchableWithoutFeedback
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import CountryPicker, { 
    Country, 
    CountryCode 
} from "react-native-country-picker-modal";
import { formatPhoneNumber, isValidPhoneNumber } from "@/utils/phoneFormatters";

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MODAL_TOP_MARGIN = 80;

interface PhoneEditModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (value: string) => Promise<void>;
    currentValue: string;
}

const PhoneEditModal = ({ visible, onClose, onSave, currentValue }: PhoneEditModalProps) => {
    const [countryCode, setCountryCode] = useState<CountryCode>("CA");
    const [callingCode, setCallingCode] = useState("1");
    const [phoneNumber, setPhoneNumber] = useState(currentValue || "");
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
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

    const handlePhoneChange = (text: string) => {
        const numericOnly = text.replace(/\D/g, '');
        const formatted = formatPhoneNumber(numericOnly, countryCode);
        setPhoneNumber(formatted);
        if (error) setError("");
    };

    const onSelectCountry = (country: Country) => {
        setCountryCode(country.cca2);
        setCallingCode(country.callingCode[0]);
        setPhoneNumber("");
        if (error) setError("");
    };

    const handleSave = async () => {
        const numericPhone = phoneNumber.replace(/\D/g, '');
        
        if (!numericPhone) {
            setError("Please enter your phone number");
            return;
        }

        if (!isValidPhoneNumber(numericPhone, countryCode)) {
            setError("Please enter a valid phone number");
            return;
        }

        setLoading(true);
        try {
            const formattedNumber = `+${callingCode}${numericPhone}`;
            await onSave(formattedNumber);
            onClose();
        } catch (error) {
            setError("Failed to save phone number");
        } finally {
            setLoading(false);
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
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
                            <View style={styles.header}>
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={onClose}
                                >
                                    <MaterialIcons name="close" size={24} color="#000" />
                                </TouchableOpacity>
                                <Text style={styles.title}>Phone number</Text>
                            </View>

                            <View style={styles.content}>
                                <View style={styles.inputContainer}>
                                    <Pressable
                                        onPress={() => setShowCountryPicker(true)}
                                        style={styles.countryPicker}
                                    >
                                        <CountryPicker
                                            withFilter
                                            withFlag
                                            withCallingCode
                                            withEmoji
                                            countryCode={countryCode}
                                            onSelect={onSelectCountry}
                                            visible={showCountryPicker}
                                            onClose={() => setShowCountryPicker(false)}
                                        />
                                        <Text style={styles.callingCode}>+{callingCode}</Text>
                                        <MaterialIcons name="arrow-drop-down" size={24} color="#666666" />
                                    </Pressable>

                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter phone number"
                                        value={phoneNumber}
                                        onChangeText={handlePhoneChange}
                                        keyboardType="phone-pad"
                                        placeholderTextColor="#999"
                                        editable={!loading}
                                    />
                                </View>

                                {error ? (
                                    <Text style={styles.errorText}>{error}</Text>
                                ) : null}

                                <TouchableOpacity
                                    style={[
                                        styles.saveButton,
                                        (loading || !phoneNumber) && styles.saveButtonDisabled
                                    ]}
                                    onPress={handleSave}
                                    disabled={loading || !phoneNumber}
                                >
                                    <Text style={styles.saveButtonText}>
                                        {loading ? 'Saving...' : 'Save'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
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
        paddingBottom: 34,
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
    content: {
        padding: 16,
    },
    inputContainer: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    countryPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRightWidth: 1,
        borderRightColor: '#E5E5E5',
    },
    callingCode: {
        marginLeft: 8,
        fontSize: 16,
        color: '#000',
    },
    input: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        color: '#000',
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 14,
        marginTop: 4,
        marginLeft: 4,
    },
    saveButton: {
        backgroundColor: '#54B4AF',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 16,
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
});

export default PhoneEditModal;