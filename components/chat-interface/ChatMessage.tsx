// @/components/chat-interface/ChatMessage.tsx
import React, { useState, useRef } from 'react';
import { View, Text, Image, ActivityIndicator, Pressable, ActionSheetIOS, Platform, Alert, Share, Clipboard } from 'react-native';
import { ChatMessage } from '@/types/chatInterface';
import ListingsButton from '../ListingsButton';
import { ListingData } from '@/types/listingData';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import * as Speech from 'expo-speech';

interface MessageProps {
    message: ChatMessage;
    index: number;
    messages: ChatMessage[];
    onListingsPress: (listings: ListingData[], modelPreference?: any, listingIds?: string[]) => void;
}

export const Message: React.FC<MessageProps> = ({ 
    message, 
    index, 
    messages,
    onListingsPress
}) => {
    const [isSelected, setIsSelected] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    
    // Skip showing message actions for loading or listings messages
    if (message.isLoading) {
        return (
            <View key={message.id} className="mb-4">
                <View className="flex-row items-start">
                    <View className="w-8 h-8 mr-2">
                        <Image 
                            source={require('@/assets/camila-avatar.jpg')}
                            className="w-8 h-8 rounded-full absolute top-0 left-0"
                        />
                    </View>
                    <View className="bg-white px-5 py-4 rounded-xl">
                        <ActivityIndicator size="small" color="#54B4AF" />
                    </View>
                </View>
            </View>
        );
    }

    // Handle listings message
    if (message.listings && message.listings.length > 0) {
        return (
            <View key={message.id} className="mb-4">
                <View className="flex-row items-start">
                    <View style={{ flex: 1 }}>
                        <ListingsButton 
                            listings={message.listings}
                            modelPreference={message.modelPreference}
                            listingIds={message.listingIds}
                            onPress={() => {
                                if (onListingsPress && message.listings) {
                                    onListingsPress(
                                        message.listings, 
                                        message.modelPreference, 
                                        message.listingIds
                                    );
                                }
                            }}
                        />
                    </View>
                </View>
            </View>
        );
    }

    // Get the text content to display/copy
    const messageText = message.sender === 'bot' 
        ? (message.displayedText !== undefined ? message.displayedText : message.text)
        : message.text;

    // Show toast message
    const showToast = (message: string) => {
        Toast.show({
            type: 'success',
            position: 'bottom',
            text1: message,
            visibilityTime: 2000,
        });
    };

    // Copy message text to clipboard
    const copyToClipboard = () => {
        try {
            Clipboard.setString(messageText);
            showToast('Copied to clipboard');
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            showToast('Failed to copy');
        }
        setIsSelected(false);
    };

    // Share message text
    const shareMessage = () => {
        Share.share({
            message: messageText
        }).catch(error => {
            console.error('Error sharing message:', error);
            showToast('Failed to share');
        });
        setIsSelected(false);
    };

    // Read text aloud using Text-to-Speech
    const readAloud = async () => {
        try {
            // Stop any ongoing speech
            await Speech.stop();
            
            // Set speaking state for UI feedback
            setIsSpeaking(true);
            showToast('Reading aloud');
            
            // Start speaking
            await Speech.speak(messageText, {
                language: 'en',
                pitch: 1.0,
                rate: 0.9,
                onDone: () => {
                    setIsSpeaking(false);
                },
                onStopped: () => {
                    setIsSpeaking(false);
                },
                onError: (error) => {
                    console.error('Speech error:', error);
                    setIsSpeaking(false);
                    showToast('Error reading text');
                }
            });
        } catch (error) {
            console.error('TTS error:', error);
            setIsSpeaking(false);
            showToast('Failed to read text');
        }
        
        setIsSelected(false);
    };

    // Stop text-to-speech
    const stopSpeaking = async () => {
        try {
            await Speech.stop();
            setIsSpeaking(false);
            showToast('Stopped reading');
        } catch (error) {
            console.error('Error stopping speech:', error);
        }
    };

    // Handler for long press on message
    const handleLongPress = () => {
        // Trigger haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        // Set message as selected (for visual feedback)
        setIsSelected(true);
        
        // Build options array based on current state
        const options = ['Copy', 'Share'];
        let cancelIndex = 2; // Default position

        // Add appropriate speech option based on current state
        if (isSpeaking) {
            options.push('Stop Reading');
            cancelIndex = 3;
        } else {
            options.push('Read Aloud');
            cancelIndex = 3;
        }

        // Add Cancel option
        options.push('Cancel');
        
        // Platform-specific message actions
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options,
                    cancelButtonIndex: cancelIndex,
                    title: 'Message Options'
                },
                (buttonIndex) => {
                    switch (buttonIndex) {
                        case 0: // Copy
                            copyToClipboard();
                            break;
                        case 1: // Share
                            shareMessage();
                            break;
                        case 2: // Read Aloud or Stop Reading
                            if (isSpeaking) {
                                stopSpeaking();
                            } else {
                                readAloud();
                            }
                            break;
                        default:
                            setIsSelected(false);
                    }
                }
            );
        } else {
            // Android handling with Alert menu
            const buttons = [
                {
                    text: 'Copy',
                    onPress: copyToClipboard
                },
                {
                    text: 'Share',
                    onPress: shareMessage
                },
                {
                    text: isSpeaking ? 'Stop Reading' : 'Read Aloud',
                    onPress: isSpeaking ? stopSpeaking : readAloud
                },
                {
                    text: 'Cancel',
                    onPress: () => setIsSelected(false),
                    style: 'cancel'
                }
            ];

            Alert.alert(
                'Message Options',
                '',
                buttons
            );
        }
    };

    // Handle press out (release touch)
    const handlePressOut = () => {
        // Only reset selection if not showing an action sheet
        if (!ActionSheetIOS.showActionSheetWithOptions) {
            setIsSelected(false);
        }
    };

    // Determine if this is the first message in a group
    const isFirstInGroup = message.sender === 'bot' && (
        index === 0 ||
        messages[index - 1]?.sender !== 'bot' ||
        message.responseGroup !== messages[index - 1]?.responseGroup
    );

    // Regular message rendering
    return (
        <View key={message.id} className="mb-4">
            <View className={`flex-row ${message.sender === 'user' ? 'justify-end' : 'items-start'}`}>
                {message.sender === 'bot' && (
                    <View className="w-8 h-8 mr-2">
                        {isFirstInGroup && (
                            <Image 
                                source={require('@/assets/camila-avatar.jpg')}
                                className="w-8 h-8 rounded-full absolute top-0 left-0"
                            />
                        )}
                    </View>
                )}
                <Pressable 
                    onLongPress={handleLongPress}
                    onPressOut={handlePressOut}
                    delayLongPress={500}
                    style={({ pressed }) => [
                        {
                            maxWidth: '85%',
                            backgroundColor: isSelected
                                ? (message.sender === 'user' ? '#E1E1E1' : '#F0F0F0')
                                : (message.sender === 'user' ? '#F6F6F6' : '#FFFFFF'),
                            borderRadius: 12,
                            padding: 12,
                            shadowColor: "#000",
                            shadowOffset: message.sender === 'user' ? {
                                width: 0,
                                height: 1,
                            } : undefined,
                            shadowOpacity: message.sender === 'user' ? 0.08 : 0,
                            shadowRadius: message.sender === 'user' ? 2 : 0,
                            elevation: message.sender === 'user' ? 2 : 0,
                        }
                    ]}
                >
                    <Text className="text-black text-[17px] leading-[22px]" selectable={false}>
                        {messageText}
                        {message.isTyping && '▋'}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
};

export default Message;