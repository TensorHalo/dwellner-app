// @/components/get-pro/GetProModal.tsx
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated, Modal, TouchableWithoutFeedback } from 'react-native';
import React, { useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface GetProModalProps {
    visible: boolean;
    onClose: () => void;
}

const GetProModal = ({ visible, onClose }: GetProModalProps) => {
    const insets = useSafeAreaInsets();
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

    const closeModal = () => {
        onClose();
    };

    const features = [
        "Unlimited access to Camila search model",
        "Unlimited search sessions and client profiles",
        "Presenting listings dashboards and nearby",
        "One-click generation of exclusive marketing posters for listings",
        "Access to Advanced Voice Mode",
        "Early access to new features"
    ];

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={closeModal}
        >
            <TouchableWithoutFeedback onPress={closeModal}>
                <View style={styles.modalContainer}>
                    <TouchableWithoutFeedback>
                        <Animated.View 
                            style={[
                                styles.modal,
                                {
                                    transform: [{ translateY }],
                                    paddingBottom: insets.bottom
                                }
                            ]}
                        >
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={closeModal}
                            >
                                <Text style={styles.closeButtonText}>×</Text>
                            </TouchableOpacity>

                            <View style={styles.content}>
                                <View style={styles.logoContainer}>
                                    <View style={styles.starSmallContainer}>
                                        <View style={styles.starSmall} />
                                    </View>
                                    <View style={styles.starLargeContainer}>
                                        <View style={styles.starLarge} />
                                    </View>
                                </View>

                                <Text style={styles.title}>Get Dwellner Pro</Text>

                                <Text style={styles.subtitle}>
                                    The home search function is free for any home seekers with limited times of access.
                                </Text>

                                <View style={styles.featuresContainer}>
                                    {features.map((feature, index) => (
                                        <View key={index} style={styles.featureItem}>
                                            <View style={styles.checkmark}>
                                                <Text style={styles.checkmarkText}>✓</Text>
                                            </View>
                                            <Text style={styles.featureText}>{feature}</Text>
                                        </View>
                                    ))}
                                </View>

                                <TouchableOpacity style={styles.upgradeButton}>
                                    <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
                                </TouchableOpacity>

                                <Text style={styles.subscriptionText}>
                                    Auto-renews for <Text style={styles.priceText}>$33.90</Text>/month until canceled
                                </Text>
                            </View>
                        </Animated.View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'flex-end',
    },
    modal: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        minHeight: SCREEN_HEIGHT * 0.9,
    },
    closeButton: {
        position: 'absolute',
        right: 20,
        top: 20,
        width: 32,
        height: 32,
        backgroundColor: '#F3F3F3',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    closeButtonText: {
        fontSize: 24,
        color: '#000',
        lineHeight: 24,
    },
    content: {
        paddingTop: 60,
        paddingHorizontal: 24,
        paddingBottom: 40,
        alignItems: 'center',
    },
    logoContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        alignItems: 'center',
        height: 40,
    },
    starSmallContainer: {
        width: 24,
        height: 24,
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    starLargeContainer: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    starSmall: {
        width: 18,
        height: 18,
        backgroundColor: '#54B4AF',
        borderRadius: 2,
        transform: [
            { rotate: '45deg' },
            { scale: 1.2 }
        ],
    },
    starLarge: {
        width: 28,
        height: 28,
        backgroundColor: '#54B4AF',
        borderRadius: 3,
        transform: [
            { rotate: '45deg' },
            { scale: 1.2 }
        ],
    },
    title: {
        fontSize: 32,
        fontWeight: '600',
        marginBottom: 16,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 40,
        width: '100%',
        lineHeight: 22,
    },
    featuresContainer: {
        width: '100%',
        marginBottom: 40,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: 16,
        padding: 16,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    checkmark: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#54B4AF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        marginTop: 2,
    },
    checkmarkText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
    },
    featureText: {
        fontSize: 16,
        flex: 1,
        lineHeight: 24,
    },
    upgradeButton: {
        backgroundColor: '#54B4AF',
        width: '100%',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    upgradeButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '500',
    },
    subscriptionText: {
        fontSize: 14,
        color: '#666',
    },
    priceText: {
        fontWeight: '600',
        color: '#666',
    },
});

export default GetProModal;