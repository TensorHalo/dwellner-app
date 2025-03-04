// @/components/ChatInterface.tsx
import { View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useRef, useEffect } from 'react';
import { Feather as FeatherIcon } from '@expo/vector-icons';
import { Audio } from 'expo-av';
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

interface ChatInterfaceProps {
    onChatStart: () => void;
    userId: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onChatStart, userId }) => {
    const [message, setMessage] = useState('');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isShowingResponse, setIsShowingResponse] = useState(false);
    const [apiService, setApiService] = useState<ChatApiService | null>(null);
    const [showPresetPrompts, setShowPresetPrompts] = useState(true);
    
    const scrollViewRef = useRef<ScrollView>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [sessionId] = useState(() => `session_${Math.random().toString(36).substring(2, 15)}`);
    const router = useRouter();
    const chatHistoryService = useRef<ChatHistoryService>(new ChatHistoryService());
    const hasGreetingSentRef = useRef(false);
    const [hasStartedChat, setHasStartedChat] = useState(false);
    const [effectiveUserId, setEffectiveUserId] = useState<string>("");

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => {
                scrollToBottom();
            }
        );

        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                scrollToBottom();
            }
        );

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

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
                modelPreference,
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
        console.log('Handling API response:', responseData);
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

            if (effectiveUserId && effectiveUserId.trim() !== '') {
                try {
                    console.log('Saving chat history for user:', effectiveUserId);
                    await chatHistoryService.current.addChatHistory(
                        effectiveUserId,
                        sessionId,
                        responseData
                    );
                } catch (historyError) {
                    console.error('Failed to save chat history:', historyError);
                }
            } else {
                console.log('No userId available for chat history');
            }
        } catch (error) {
            console.error('Error handling API response:', error);
            const errorMessage: ChatMessage = {
                id: Date.now(),
                text: `Error processing response: ${error.message}`,
                sender: 'bot',
            };
            setChatMessages(prev => [...prev.filter(msg => !msg.isLoading), {
                id: Date.now(),
                text: `Error processing response: ${error.message}`,
                sender: 'bot',
            }]);
        } finally {
            setIsShowingResponse(false);
        }
    };

    const startRecording = async () => {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                alert('Permission to access microphone is required!');
                return;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const newRecording = new Audio.Recording();
            await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            await newRecording.startAsync();
            setRecording(newRecording);
            setIsRecording(true);
        } catch (error) {
            console.error('Failed to start recording:', error);
        }
    };

    const stopRecording = async () => {
        try {
            if (!recording) return;
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            console.log('Recording stopped and stored at', uri);
            setIsRecording(false);
            setRecording(null);
        } catch (error) {
            console.error('Failed to stop recording:', error);
        }
    };

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
                        paddingBottom: 20,
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
                />

                <View className="px-4 pb-6 pt-2">
                    <View className="bg-gray-100 rounded-full px-4 py-2.5 mx-2 mb-6">
                        <View className="flex-row items-center">
                            <TouchableOpacity 
                                onPress={isRecording ? stopRecording : startRecording}
                                className="pr-3"
                            >
                                <FeatherIcon 
                                    name={isRecording ? "stop-circle" : "mic"} 
                                    size={24} 
                                    color={isRecording ? "red" : "black"} 
                                />
                            </TouchableOpacity>
                            
                            <TextInput
                                className="flex-1 text-base leading-5"
                                placeholder="Type your message..."
                                multiline
                                value={message}
                                onChangeText={setMessage}
                                style={{ textAlignVertical: 'center' }}
                            />
                            
                            <TouchableOpacity 
                                onPress={sendMessage}
                                className="pl-3"
                                disabled={!message.trim() || !apiService}
                            >
                                <FeatherIcon 
                                    name="send" 
                                    size={24} 
                                    color={message.trim() && apiService ? "#54B4AF" : "#CCCCCC"} 
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

export default ChatInterface;