import { View, Text, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView, Keyboard, ViewStyle } from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import { Feather as FeatherIcon } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { ListingData, fetchListings } from '@/utils/firebase';
// import ListingsMessage from '@/components/ListingsMessage';
import { useRouter } from 'expo-router';
import ListingsButton from './ListingsButton';

interface ChatMessage {
    id: number;
    text: string;
    sender: 'user' | 'bot';
    listings?: ListingData[];
}

// for test
const TEST_LISTING_IDS = [
    "20535215",
    "20710014",
    "20731370",
    "21539525",
    "21620042",
    "21763400",
    "21871454",
    "21893816"
];

interface ChatInterfaceProps {
    onChatStart: () => void;
}

const ChatInterface = ({ onChatStart }: ChatInterfaceProps) => {
    const [message, setMessage] = useState('');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);
    const [sessionId] = useState(() => Math.random().toString(36).substring(2, 15));

    // Auto-scroll when new messages are added
    useEffect(() => {
        scrollToBottom();
    }, [chatMessages]);

    const scrollToBottom = (animated = true) => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated });
        }, 100);
    };

    const handleApiResponse = async (responseData: any) => {
        console.log('Handling API response:', responseData);
        
        try {
            // First, add the text response
            const botMessage: ChatMessage = {
                id: Date.now(),
                text: responseData.text || 'No response text available',
                sender: 'bot',
            };
            setChatMessages(prev => [...prev, botMessage]);
    
            // Then handle listings if present
            if (responseData.show_listings_flag && Array.isArray(responseData.listings)) {
                const listings = await fetchListings(TEST_LISTING_IDS);
                console.log('Fetched listings:', listings);
    
                if (listings.length > 0) {
                    const listingsMessage: ChatMessage = {
                        id: Date.now(),
                        text: '',
                        sender: 'bot',
                        listings: listings,
                    };
                    setChatMessages(prev => [...prev, listingsMessage]);
                }
            }
        } catch (error) {
            console.error('Error handling API response:', error);
            const errorMessage: ChatMessage = {
                id: Date.now(),
                text: `Error processing response: ${error.message}`,
                sender: 'bot',
            };
            setChatMessages(prev => [...prev, errorMessage]);
        }
    };

    const router = useRouter();

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
            console.log('Started recording');
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
        if (!message.trim()) return;
        
        if (chatMessages.length === 0) {
            console.log('First message, triggering onChatStart');
            onChatStart();
        }

        const userMessage: ChatMessage = {
            id: Date.now(),
            text: message.trim(),
            sender: 'user',
        };
        setChatMessages(prev => [...prev, userMessage]);
        console.log('User message sent:', userMessage.text);

        const messageToSend = message.trim();
        setMessage('');

        try {
            console.log('Making API call...');
            const response = await fetch('http://35.183.142.12:8000/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    message: messageToSend,
                }),
            });

            console.log('API response status:', response.status);
            const responseText = await response.text();
            console.log('Raw API response:', responseText);
            
            try {
                const parsedResponse = JSON.parse(responseText);
                console.log('Parsed API response:', parsedResponse);
                await handleApiResponse(parsedResponse);
            } catch (e) {
                console.error('Failed to parse API response:', e);
                const errorMessage: ChatMessage = {
                    id: Date.now(),
                    text: 'Error processing response',
                    sender: 'bot',
                };
                setChatMessages(prev => [...prev, errorMessage]);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: ChatMessage = {
                id: Date.now(),
                text: `Error: ${error.message}`,
                sender: 'bot',
            };
            setChatMessages(prev => [...prev, errorMessage]);
        }
    };

    // const handleListingsPress = (listings: ListingData[]) => {
    //     router.push({
    //         pathname: '@app/camila/search-results',
    //         params: { listings: encodeURIComponent(JSON.stringify(listings)) }
    //     });
    // };    

    type ListingDataBasic = {
        listing_id: string;
        address: string;
        list_price: number;
        bedrooms_total: number;
        bathrooms_total: number;
        parking_features?: string[];
        property_type: string;
        media?: Array<{
            MediaURL: string;
            MediaType: string;
        }>;
        // Add coordinates
        coordinates: {
            latitude: number;
            longitude: number;
        };
    };

    const handleListingsPress = (listings: ListingData[]) => {
        try {
            // Create a simplified version of the listings data
            const basicListings: ListingDataBasic[] = listings.map(listing => ({
                listing_id: listing.listing_id,
                address: listing.address,
                list_price: listing.list_price,
                bedrooms_total: listing.bedrooms_total,
                bathrooms_total: listing.bathrooms_total,
                parking_features: listing.parking_features,
                property_type: listing.property_type,
                media: listing.media,
                coordinates: listing.coordinates
            }));
    
            const serializedListings = JSON.stringify(basicListings);
            console.log('Navigating to search results with listings:', serializedListings.substring(0, 100) + '...');
            
            router.push({
                pathname: '/camila/search-results',
                params: {
                    listingsData: encodeURIComponent(serializedListings)
                }
            });
        } catch (error) {
            console.error('Error handling listings press:', error);
        }
    };

    const renderMessage = (msg: ChatMessage) => {
        if (msg.listings && msg.listings.length > 0) {
            return (
                <View key={msg.id} className="mb-4">
                    <View className="flex-row items-start">
                        <View style={{ flex: 1 }}>
                            <ListingsButton onPress={() => handleListingsPress(msg.listings!)} />
                        </View>
                    </View>
                </View>
            );
        }

        return (
            <View key={msg.id} className="mb-4">
                <View className={`flex-row ${msg.sender === 'user' ? 'justify-end' : 'items-start'}`}>
                    {msg.sender === 'bot' && (
                        <Image 
                            source={require('@/assets/camila-avatar.jpg')}
                            className="w-8 h-8 rounded-full mr-2"
                        />
                    )}
                    <View 
                        className={`px-5 py-3 rounded-xl max-w-[85%] ${
                            msg.sender === 'user' 
                                ? 'bg-gray-100' 
                                : 'bg-white'
                        }`}
                        style={msg.sender === 'user' ? {
                            shadowColor: "#000",
                            shadowOffset: {
                                width: 0,
                                height: 1,
                            },
                            shadowOpacity: 0.08,
                            shadowRadius: 2,
                            elevation: 2
                        } : {}}
                    >
                        <Text className="text-black text-[17px] leading-[22px]">
                            {msg.text}
                        </Text>
                    </View>
                </View>
            </View>
        );
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
                    {chatMessages.map(msg => renderMessage(msg))}
                </ScrollView>

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
                                disabled={!message.trim()}
                            >
                                <FeatherIcon 
                                    name="send" 
                                    size={24} 
                                    color={message.trim() ? "#54B4AF" : "#CCCCCC"} 
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