// @/components/LoadingOverlay.tsx
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';

interface LoadingOverlayProps {
    progress: number;
    visible: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ progress, visible }) => {
    if (!visible) return null;

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <ActivityIndicator size="large" color="#54B4AF" />
                <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                <Text style={styles.loadingText}>Loading listings...</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    content: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        width: '80%',
        maxWidth: 300,
    },
    progressText: {
        fontSize: 24,
        fontWeight: '600',
        marginTop: 16,
        color: '#54B4AF',
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
        marginTop: 8,
    },
});

export default LoadingOverlay;