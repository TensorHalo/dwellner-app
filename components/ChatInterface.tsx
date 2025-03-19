import { View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Keyboard, Dimensions, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useRef, useEffect } from 'react';
import { Feather as FeatherIcon } from '@expo/vector-icons';
// import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { ListingData } from '@/types/listingData';
import { ChatMessage, ModelPreference } from '@/types/chatInterface';
import { getAuthTokens } from '@/utils/authTokens';
import { ChatApiService } from './chat-interface/ApiService';
import { MessageHandler } from './chat-interface/MessageHandler';
import { MessageAnimator } from './chat-interface/MessageAnimator';
import { Message } from './chat-interface/ChatMessage';
import { ChatHistoryService } from './chat-interface/ChatHistory';
import PresetPrompts from './chat-interface/PresetPrompts';
import { getCognitoUserId } from '@/utils/cognitoConfig';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

// Get screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Dynamic sizes based on screen dimensions
const INPUT_HEIGHT = Math.max(40, Math.min(50, SCREEN_HEIGHT * 0.075));
const BOTTOM_SPACING = Math.max(-10, Math.min(-20, SCREEN_HEIGHT * 0.012));

// Send button SVG component
const SendIcon = ({ color }) => (
  <Svg width="27" height="27" viewBox="0 0 27 27" fill="none">
    <Path
      d="M13.5 27C15.3441 27 17.0779 26.6471 18.7015 25.9412C20.3338 25.2353 21.7721 24.2603 23.0162 23.0162C24.2603 21.7721 25.2353 20.3382 25.9412 18.7147C26.6471 17.0824 27 15.3441 27 13.5C27 11.6559 26.6471 9.92206 25.9412 8.29853C25.2353 6.66618 24.2603 5.22794 23.0162 3.98382C21.7721 2.73971 20.3338 1.76471 18.7015 1.05882C17.0691 0.352941 15.3309 0 13.4868 0C11.6426 0 9.90441 0.352941 8.27206 1.05882C6.64853 1.76471 5.21471 2.73971 3.97059 3.98382C2.73529 5.22794 1.76471 6.66618 1.05882 8.29853C0.352941 9.92206 0 11.6559 0 13.5C0 15.3441 0.352941 17.0824 1.05882 18.7147C1.76471 20.3382 2.73971 21.7721 3.98382 23.0162C5.22794 24.2603 6.66176 25.2353 8.28529 25.9412C9.91765 26.6471 11.6559 27 13.5 27ZM13.5265 20.3162C13.2265 20.3162 12.9794 20.2235 12.7853 20.0382C12.5912 19.8441 12.4941 19.5926 12.4941 19.2838V12.4941L12.6 9.59559L11.2368 11.2368L9.62206 12.8647C9.41912 13.0676 9.17647 13.1691 8.89412 13.1691C8.61176 13.1691 8.37353 13.0765 8.17941 12.8912C7.99412 12.6971 7.90147 12.4588 7.90147 12.1765C7.90147 11.8853 7.99412 11.6471 8.17941 11.4618L12.7324 6.93529C12.9882 6.67059 13.2529 6.53824 13.5265 6.53824C13.8 6.53824 14.0647 6.67059 14.3206 6.93529L18.8735 11.4618C19.0588 11.6559 19.1515 11.8941 19.1515 12.1765C19.1515 12.4588 19.0544 12.6971 18.8603 12.8912C18.6662 13.0765 18.4279 13.1691 18.1456 13.1691C17.8456 13.1691 17.6029 13.0676 17.4176 12.8647L15.8162 11.2368L14.4397 9.58235L14.5456 12.4941V19.2838C14.5456 19.5926 14.4485 19.8441 14.2544 20.0382C14.0691 20.2235 13.8265 20.3162 13.5265 20.3162Z"
      fill={color}
    />
  </Svg>
);

interface ChatInterfaceProps {
    onChatStart: () => void;
    userId: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onChatStart, userId }) => {
    const [message, setMessage] = useState('');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    // const [isRecording, setIsRecording] = useState(false);
    // const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isShowingResponse, setIsShowingResponse] = useState(false);
    const [apiService, setApiService] = useState<ChatApiService | null>(null);
    const [showPresetPrompts, setShowPresetPrompts] = useState(true);
    const [footerHeight, setFooterHeight] = useState(global.FOOTER_HEIGHT || 80);
    const [keyboardShown, setKeyboardShown] = useState(false);
    
    const scrollViewRef = useRef<ScrollView>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [sessionId] = useState(() => `session_${Math.random().toString(36).substring(2, 15)}`);
    const router = useRouter();
    const chatHistoryService = useRef<ChatHistoryService>(new ChatHistoryService());
    const hasGreetingSentRef = useRef(false);
    const [hasStartedChat, setHasStartedChat] = useState(false);
    const [effectiveUserId, setEffectiveUserId] = useState<string>("");
    
    // Get safe area insets
    const insets = useSafeAreaInsets();

    // Calculate bottom padding to account for the footer and safe area
    const getBottomPadding = () => {
        return footerHeight + (keyboardShown ? 0 : insets.bottom);
    };

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => {
                setKeyboardShown(true);
                scrollToBottom();
            }
        );

        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                setKeyboardShown(false);
                scrollToBottom();
            }
        );

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

    useEffect(() => {
        // Update the footer height if it changes globally
        if (global.FOOTER_HEIGHT && global.FOOTER_HEIGHT !== footerHeight) {
            setFooterHeight(global.FOOTER_HEIGHT);
        }
    }, [global.FOOTER_HEIGHT]);

    useEffect(() => {
        const getEffectiveUserId = async () => {
            // If prop userId is available, use it
            if (userId) {
                console.log('Using provided userId:', userId);
                setEffectiveUserId(userId);
                return;
            }
            
            try {
                // First check for stored userId
                const storedUserId = await AsyncStorage.getItem('userId');
                if (storedUserId) {
                    console.log('Using stored userId:', storedUserId);
                    setEffectiveUserId(storedUserId);
                    return;
                }
                
                // Then check pendingUserData
                const pendingDataStr = await AsyncStorage.getItem('pendingUserData');
                if (pendingDataStr) {
                    const pendingData = JSON.parse(pendingDataStr);
                    // Check if we have a valid Cognito ID (not an email)
                    if (pendingData.cognito_id && 
                        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pendingData.cognito_id)) {
                        console.log('Using cognito_id from pendingUserData:', pendingData.cognito_id);
                        setEffectiveUserId(pendingData.cognito_id);
                        
                        // Store for future use
                        await AsyncStorage.setItem('userId', pendingData.cognito_id);
                        return;
                    }
                    
                    // If we have an email and it's in pendingData, try to get the cognito ID
                    if (pendingData.email) {
                        try {
                            const cognitoId = await getCognitoUserId(pendingData.email);
                            if (cognitoId) {
                                console.log('Retrieved cognito ID from email:', cognitoId);
                                setEffectiveUserId(cognitoId);
                                await AsyncStorage.setItem('userId', cognitoId);
                                return;
                            }
                        } catch (error) {
                            console.error('Error getting cognito ID from email:', error);
                        }
                    }
                }
                
                console.log('No effective userId found');
            } catch (error) {
                console.error('Error getting effective userId:', error);
            }
        };
        
        getEffectiveUserId();
    }, [userId]);

    useEffect(() => {
        const initializeApiService = async () => {
            try {
                const tokens = await getAuthTokens();
                if (!tokens?.accessToken || !tokens?.idToken) {
                    console.error('Missing required tokens');
                    router.replace('/');
                    return;
                }
    
                const service = new ChatApiService(tokens.accessToken, tokens.idToken);
                setApiService(service);
                
                if (!hasGreetingSentRef.current) {
                    hasGreetingSentRef.current = true;
                    await sendGreeting(service);
                }
            } catch (error) {
                console.error('Error initializing API service:', error);
                router.replace('/');
            }
        };
    
        initializeApiService();
    }, [router]);
    
    const sendGreeting = async (service: ChatApiService) => {
        try {
            console.log('Sending initial greeting...');
            // onChatStart();
            const greetingResponse = await service.sendMessage("Hello", sessionId);
            await handleApiResponse(greetingResponse);
        } catch (error) {
            console.error('Error sending greeting:', error);
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatMessages]);

    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);

    const handlePresetPrompt = async (promptText: string) => {
        if (!apiService) return;

        setShowPresetPrompts(false);
        
        if (!hasStartedChat) {
            onChatStart();
            setHasStartedChat(true);
        }

        const userMessage: ChatMessage = {
            id: Date.now(),
            text: promptText,
            sender: 'user',
        };
        setChatMessages(prev => [...prev, userMessage]);

        const loadingMessage: ChatMessage = {
            id: Date.now() + 1,
            text: '',
            sender: 'bot',
            isLoading: true
        };
        setChatMessages(prev => [...prev, loadingMessage]);

        try {
            const responseData = await apiService.sendMessage(promptText, sessionId);
            await handleApiResponse(responseData);
        } catch (error) {
            console.error('Failed to send preset prompt:', error);
        }
    };

    const scrollToBottom = (animated = true) => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated });
        }, 100);
    };

    const updateMessage = (index: number, updates: Partial<ChatMessage>) => {
        setChatMessages(prev => {
            const targetMessage = prev[prev.length - index - 1];
            if (!targetMessage) return prev;

            return prev.map(msg => 
                msg.id === targetMessage.id ? { ...msg, ...updates } : msg
            );
        });
    };

    const handleListingsPress = (
        listings: ListingData[], 
        modelPreference?: ModelPreference, 
        listingIds?: string[]
    ) => {
        try {
            if (!Array.isArray(listings) || listings.length === 0) {
                console.error('Invalid listings data:', listings);
                return;
            }
    
            const navigationData = {
                listings,
                modelPreference: modelPreference ? { ...modelPreference } : undefined,
                listingIds
            };
    
            const serializedData = JSON.stringify(navigationData);
            if (!serializedData) {
                throw new Error('Failed to serialize navigation data');
            }
    
            router.push({
                pathname: '/navigation/camila/search-results',
                params: {
                    listingsData: encodeURIComponent(serializedData)
                }
            });
        } catch (error) {
            console.error('Error in handleListingsPress:', error);
        }
    };

    const handleApiResponse = async (responseData: any) => {
        console.log('Handling API response');
        setIsShowingResponse(true);
        
        try {
            const { textMessages, listingsMessage } = MessageHandler.processApiResponse(responseData);
            setChatMessages(prev => prev.filter(msg => !msg.isLoading));
            
            if (textMessages.length > 0) {
                const messageAnimator = new MessageAnimator(typingTimeoutRef);
                
                setChatMessages(prev => [...prev, textMessages[0]]);
                await messageAnimator.animateMessages([textMessages[0]], updateMessage);
                
                if (listingsMessage) {
                    setChatMessages(prev => [...prev, listingsMessage]);
                }
    
                if (textMessages.length > 1) {
                    const remainingMessages = textMessages.slice(1);
                    setChatMessages(prev => [...prev, ...remainingMessages]);
                    await messageAnimator.animateMessages(remainingMessages, updateMessage);
                }
            }
    
            // if (effectiveUserId && effectiveUserId.trim() !== '') {
            //     try {
            //         console.log('Saving chat history for user:', effectiveUserId);
            //         await chatHistoryService.current.addChatHistory(
            //             effectiveUserId,
            //             sessionId,
            //             responseData
            //         );
            //     } catch (historyError) {
            //         console.error('Failed to save chat history:', historyError);
            //     }
            // } else {
            //     console.log('No userId available for chat history');
            // }
        } catch (error) {
            console.error('Error handling API response:', error);
            const errorMessage: ChatMessage = {
                id: Date.now(),
                text: `Error processing response: ${error.message}`,
                sender: 'bot',
            };
            setChatMessages(prev => [...prev.filter(msg => !msg.isLoading), errorMessage]);
        } finally {
            setIsShowingResponse(false);
        }
    };

    // const startRecording = async () => {
    //     try {
    //         const { status } = await Audio.requestPermissionsAsync();
    //         if (status !== 'granted') {
    //             alert('Permission to access microphone is required!');
    //             return;
    //         }

    //         await Audio.setAudioModeAsync({
    //             allowsRecordingIOS: true,
    //             playsInSilentModeIOS: true,
    //         });

    //         const newRecording = new Audio.Recording();
    //         await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    //         await newRecording.startAsync();
    //         setRecording(newRecording);
    //         setIsRecording(true);
    //     } catch (error) {
    //         console.error('Failed to start recording:', error);
    //     }
    // };

    // const stopRecording = async () => {
    //     try {
    //         if (!recording) return;
    //         await recording.stopAndUnloadAsync();
    //         const uri = recording.getURI();
    //         console.log('Recording stopped and stored at', uri);
    //         setIsRecording(false);
    //         setRecording(null);
    //     } catch (error) {
    //         console.error('Failed to stop recording:', error);
    //     }
    // };

    const sendMessage = async () => {
        if (!message.trim() || !apiService) {
            console.log('Message or apiService invalid:', {
                messageEmpty: !message.trim(),
                apiServiceNull: !apiService
            });
            return;
        }

        setShowPresetPrompts(false);

        if (!hasStartedChat) {
            onChatStart();
            setHasStartedChat(true);
        }

        const userMessage: ChatMessage = {
            id: Date.now(),
            text: message.trim(),
            sender: 'user',
        };
        setChatMessages(prev => [...prev, userMessage]);

        const loadingMessage: ChatMessage = {
            id: Date.now() + 1,
            text: '',
            sender: 'bot',
            isLoading: true
        };
        setChatMessages(prev => [...prev, loadingMessage]);

        const messageToSend = message.trim();
        setMessage('');

        try {
            const responseData = await apiService.sendMessage(messageToSend, sessionId);
            await handleApiResponse(responseData);
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white"
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            style={{ flex: 1 }}
        >
            <View style={{ flex: 1 }}>
                <ScrollView
                    ref={scrollViewRef}
                    className="flex-1"
                    contentContainerStyle={{
                        padding: 16,
                        paddingBottom: getBottomPadding() + 80, // Add extra padding for input
                    }}
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={() => scrollToBottom()}
                    onLayout={() => scrollToBottom(false)}
                >
                    {chatMessages.map((msg, index) => (
                        <Message
                            key={msg.id}
                            message={msg}
                            index={index}
                            messages={chatMessages}
                            onListingsPress={handleListingsPress}
                        />
                    ))}
                </ScrollView>

                <PresetPrompts 
                    visible={showPresetPrompts} 
                    onPromptSelect={handlePresetPrompt}
                    bottomPadding={getBottomPadding()}
                />

                <View style={[
                    styles.inputContainer, 
                    { paddingBottom: insets.bottom + BOTTOM_SPACING, bottom: keyboardShown ? 0 : footerHeight }
                ]}>
                    <View style={styles.inputWrapper}>
                        {/* <TouchableOpacity 
                            onPress={isRecording ? stopRecording : startRecording}
                            className="pr-3"
                        >
                            <FeatherIcon 
                                name={isRecording ? "stop-circle" : "mic"} 
                                size={24} 
                                color={isRecording ? "red" : "black"} 
                            />
                        </TouchableOpacity>
                         */}
                        <TextInput
                            className="flex-1 text-base"
                            placeholder="Type your message..."
                            multiline
                            value={message}
                            onChangeText={setMessage}
                            style={styles.textInput}
                        />
                        
                        <TouchableOpacity 
                            onPress={sendMessage}
                            className="pl-3"
                            disabled={!message.trim() || !apiService}
                        >
                            <SendIcon color={message.trim() && apiService ? "#00B1B1" : "#CCCCCC"} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    inputContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingTop: 10,
        backgroundColor: 'white',
        // Removed borderTopWidth and borderTopColor to eliminate the separator line
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 25,
        paddingHorizontal: 16,
        paddingVertical: 8,
        minHeight: INPUT_HEIGHT,
    },
    textInput: {
        textAlignVertical: 'center',
        paddingTop: 8,
        paddingBottom: 8,
        minHeight: INPUT_HEIGHT - 16, // Subtract padding to center text properly
    }
});

export default ChatInterface;