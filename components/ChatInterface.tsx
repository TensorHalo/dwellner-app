// @/components/ChatInterface.tsx
import { View, Text, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import React, { useState, useRef, useEffect } from 'react';
import { Feather as FeatherIcon } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { ListingData } from '@/utils/listingData';
import { useRouter } from 'expo-router';
import ListingsButton from './ListingsButton';
import { getCurrentSession } from '@/utils/cognitoConfig';
import { getAuthTokens } from '@/utils/authTokens';

const API_CONFIG = {
    CHAT_API_ENDPOINT: 'https://api.dwellner.ca/api/v0/text_v4'
};

interface ChatMessage {
    id: number;
    text: string;
    sender: 'user' | 'bot';
    listings?: ListingData[];
    responseGroup?: number;
    isTyping?: boolean;
    displayedText?: string;
}

interface ProcessedListing {
    listing_id: string;
    address: string;
    list_price: number;
    bedrooms_total: number;
    bathrooms_total: number;
    parking_features: string[];
    property_type: string;
    media: Array<{
        MediaURL: string;
        MediaType: string;
    }>;
    coordinates: {
        latitude: number;
        longitude: number;
    };
    PublicRemarks: string;
    LotFeatures: string[];
    City: string;
    PostalCode: string;
    ParkingTotal: number;
}

interface ChatInterfaceProps {
    onChatStart: () => void;
}

const ChatInterface = ({ onChatStart }: ChatInterfaceProps) => {
    const [message, setMessage] = useState('');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);
    const [sessionId] = useState(() => `session_${Math.random().toString(36).substring(2, 15)}`);
    const [isShowingResponse, setIsShowingResponse] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const router = useRouter();
    const [authTokens, setAuthTokens] = useState<{
        accessToken: string;
        idToken: string;
    } | null>(null);

    const MAX_RETRIES = 500;  // Maximum number of retry attempts
    const RETRY_DELAY = 100;  // Delay between retries in milliseconds

    useEffect(() => {
        scrollToBottom();
    }, [chatMessages]);

    useEffect(() => {
        const fetchTokens = async () => {
            try {
                const tokens = await getAuthTokens();
                if (tokens) {
                    console.log('Auth Tokens Retrieved:', {
                        accessToken: tokens.accessToken.substring(0, 20) + '...',
                        idToken: tokens.idToken.substring(0, 20) + '...',
                    });
                    
                    setAuthTokens({
                        accessToken: tokens.accessToken,
                        idToken: tokens.idToken
                    });
                } else {
                    console.error('No valid session found');
                    router.replace('/');
                }
            } catch (error) {
                console.error('Error fetching tokens:', error);
                router.replace('/');
            }
        };
        fetchTokens();
    }, [router]);

    const makeApiCall = async (messageToSend: string) => {
        if (!authTokens) {
            throw new Error('No authentication tokens available');
        }

        const response = await fetch(API_CONFIG.CHAT_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain, */*',
                // 'Authorization': `Bearer ${authTokens.accessToken}`,
                'Authorization': 'Bearer eyJraWQiOiIzY200STgwMVpudWRiUkY0b2xyeFF3SU1NbkVsd2FWWHBqbDdMRFc2cHZNPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJhYzZkMjUzOC0zMGYxLTcwYzYtNjBkZi03ZmE4MjcxOThkYTYiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuY2EtY2VudHJhbC0xLmFtYXpvbmF3cy5jb21cL2NhLWNlbnRyYWwtMV82eEV2Q0RuVDYiLCJjbGllbnRfaWQiOiJ1OGthN3JncmRzamdmZmY4dWlvNWRlZzdrIiwib3JpZ2luX2p0aSI6IjcyMDVhOTQzLTY3ZWUtNDI4Ni1iYzY5LTUyZDI1MTMzMWVjOCIsImV2ZW50X2lkIjoiMTU4NzIxYjktZTY3Zi00YzlkLWI0M2ItODAzM2JmOGFhY2M1IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTczNjgzOTk1NCwiZXhwIjoxNzM2OTI2MzU0LCJpYXQiOjE3MzY4Mzk5NTQsImp0aSI6ImVmY2E5MGQzLTFlZjYtNDNkOC04YjUxLWZkYWNmOGIxZTE5ZCIsInVzZXJuYW1lIjoiYWM2ZDI1MzgtMzBmMS03MGM2LTYwZGYtN2ZhODI3MTk4ZGE2In0.h4tZ7WkImpRpg-Ktnaz2Pqn5KBP4VuTgDyolYYr8nCsJSZX1F3VxH0Ww3A9KLapBRCfiMEgI4FTBN29EvmIoeXJhfP6tLifVpkfvoPTN1APJf33BfOT6K3bLmBfjkszTC1LjSmzxlfDDfVm0xV_-MDGuvhBymNVPaVl-Ng8uQbYxG38KrXty1zQEH3oZ6wPYn1vESixihhaHxU-GBK54AHye5lk5VvlJfxQIe5gocgL_5rAFLHAquOoeWOKF7S2dzrviK-C3qlTZNaCM3H5q4HJtLZR7-PFm6bFIetaDWzQ36XcuGvQOGGOcShAnHbTXb7j__jDU2jtD7Zyfy44tTw',
                // 'id-token': authTokens.idToken
                // 'id-token': 'eyJraWQiOiJHREtXejFJVFhIY2JaQTFtV2R4aG8ra0pQdTd4bitpUVZUczczeUs5UW9BPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJhYzZkMjUzOC0zMGYxLTcwYzYtNjBkZi03ZmE4MjcxOThkYTYiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLmNhLWNlbnRyYWwtMS5hbWF6b25hd3MuY29tXC9jYS1jZW50cmFsLTFfNnhFdkNEblQ2IiwiY29nbml0bzp1c2VybmFtZSI6ImFjNmQyNTM4LTMwZjEtNzBjNi02MGRmLTdmYTgyNzE5OGRhNiIsIm9yaWdpbl9qdGkiOiJlNzc5ZGQyMi00Yjc2LTQ3OWMtYWRiMC1kMDJhOTk5ZWI2NWEiLCJhdWQiOiJ1OGthN3JncmRzamdmZmY4dWlvNWRlZzdrIiwiZXZlbnRfaWQiOiJmYWVkNjU2ZS01ZGY2LTRlMTYtYjE0Zi02ODdhZWE3YTMzMDMiLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTczNTk1OTc5MywiZXhwIjoxNzM2MDQ2MTkzLCJpYXQiOjE3MzU5NTk3OTMsImp0aSI6IjJkYzBmZjE3LWMyNTUtNDFlYy04ODQzLWFlZGQyMGZiOThkYSIsImVtYWlsIjoic3RlcGhlbkBkd2VsbG5lci5jb20ifQ.u_EZQB4HudcVFnvUBiwK-ITs6iw3b2mDTaIf7DcNIz9xBDBTZ9BFtYnUVgAugNZpFguqj-TkJbLz4TikMG3W3LfG9Cu-Rbmvsd5GyDFuj_TFeVDc8IYB1eaikGiSANc5KxT9L0nL4hOXqCB5IwyfjG-xdDH_4pzKaPbaz55MAO10w7i2wFccibLlo5GBOKhMRy0jnnTgSGLS7NS-T3RtYswNjRo3P9awqcJ-VNkr4Cmlr8Xfgh0MBGkNlHbIOpYJbQxuteuyFQTiVgOiwAjr_uXG_M1tFvFStEyM6-XZP9aB_m-u4uNrcUqwzvFsrcsowcASn_1pFAsXsKA6_i6EoA'
            },
            body: JSON.stringify({
                prompt: messageToSend,
                sessionId: sessionId
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    };

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const makeApiCallWithRetry = async (messageToSend: string, attemptCount = 0): Promise<any> => {
        try {
            return await makeApiCall(messageToSend);
        } catch (error) {
            if (error instanceof Error && (error.message.includes('404') || error.message.includes('500')) && attemptCount < MAX_RETRIES) {
                console.log(`Attempt ${attemptCount + 1} failed, retrying after delay...`);
                await delay(RETRY_DELAY);
                return makeApiCallWithRetry(messageToSend, attemptCount + 1);
            }
            throw error;
        }
    };

    const scrollToBottom = (animated = true) => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated });
        }, 100);
    };

    const animateResponse = async (messages: ChatMessage[]) => {
        setIsShowingResponse(true);
        
        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            if (message.sender === 'bot' && !message.listings) {
                setChatMessages(prev => prev.map((msg, index) => 
                    index === prev.length - messages.length + i
                        ? { ...msg, isTyping: true, displayedText: '' }
                        : msg
                ));

                // Animate each character
                const text = message.text;
                for (let j = 0; j <= text.length; j++) {
                    await new Promise(resolve => {
                        typingTimeoutRef.current = setTimeout(resolve, 0); // Adjust speed here
                    });

                    setChatMessages(prev => prev.map((msg, index) =>
                        index === prev.length - messages.length + i
                            ? { ...msg, displayedText: text.slice(0, j) }
                            : msg
                    ));
                }

                setChatMessages(prev => prev.map((msg, index) =>
                    index === prev.length - messages.length + i
                        ? { ...msg, isTyping: false, displayedText: text }
                        : msg
                ));
                
                await new Promise(resolve => {
                    const randomDelay = Math.floor(Math.random() * (200 - 100 + 1)) + 100;
                    typingTimeoutRef.current = setTimeout(resolve, randomDelay);
                });
            }
        }
        
        setIsShowingResponse(false);
    };

    const handleApiResponse = async (responseData: any) => {
        console.log('Handling API response:', responseData);
        
        try {
            if (responseData.response && responseData.response[0]) {
                const responseText = responseData.response[0].resp || 'No response text available';
                const textParts = responseText.split('\n').filter(part => part.trim() !== '');
                const responseGroup = Date.now();
    
                // Add and animate first message first
                if (textParts.length > 0) {
                    const firstMessage: ChatMessage = {
                        id: Date.now(),
                        text: textParts[0].trim(),
                        sender: 'bot',
                        responseGroup: responseGroup,
                        isTyping: false,
                        displayedText: ''
                    };
                    
                    // Add first message
                    setChatMessages(prev => [...prev, firstMessage]);
                    
                    // Animate first message
                    await animateResponse([firstMessage]);
    
                    if (responseData.response[0].show_listings_flag && Array.isArray(responseData.response[0].listing)) {
                        const listings = responseData.response[0].listing.map((listing: any) => ({
                            listing_id: listing.ListingId,
                            address: listing.UnparsedAddress,
                            city: listing.City,
                            architectural_style: Array.isArray(listing.ArchitecturalStyle) ? listing.ArchitecturalStyle : 
                                typeof listing.ArchitecturalStyle === 'string' ? JSON.parse(listing.ArchitecturalStyle) : [],
                            bathrooms_partial: listing.BathroomsPartial,
                            bathrooms_total: listing.BathroomsTotalInteger,
                            bedrooms_total: listing.BedroomsTotal,
                            common_interest: listing.CommonInterest || '',
                            country: listing.Country,
                            coordinates: {
                                latitude: listing.Latitude,
                                longitude: listing.Longitude
                            },
                            list_price: listing.TotalActualRent,
                            parking_features: Array.isArray(listing.ParkingFeatures) ? listing.ParkingFeatures :
                                typeof listing.ParkingFeatures === 'string' ? JSON.parse(listing.ParkingFeatures) : [],
                            property_type: Array.isArray(listing.StructureType) ? listing.StructureType[0] :
                                typeof listing.StructureType === 'string' ? JSON.parse(listing.StructureType)[0] : 'Unknown',
                            photos_count: listing.PhotosCount || 0,
                            media: Array.isArray(listing.Media) ? listing.Media :
                                typeof listing.Media === 'string' ? JSON.parse(listing.Media) : []
                        }));
    
                        if (listings.length > 0) {
                            const listingsMessage: ChatMessage = {
                                id: Date.now() + 1,
                                text: '',
                                sender: 'bot',
                                listings: listings,
                                responseGroup: responseGroup
                            };
                            setChatMessages(prev => [...prev, listingsMessage]);
                        }
                    }
    
                    // Finally, add and animate remaining messages
                    if (textParts.length > 1) {
                        const remainingMessages = textParts.slice(1).map((text, i) => ({
                            id: Date.now() + i + 2,
                            text: text.trim(),
                            sender: 'bot' as const,
                            responseGroup: responseGroup,
                            isTyping: false,
                            displayedText: ''
                        }));
    
                        setChatMessages(prev => [...prev, ...remainingMessages]);
                        await animateResponse(remainingMessages);
                    }
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
            console.log('Making API call with retry logic...');
            const responseData = await makeApiCallWithRetry(messageToSend);
            await handleApiResponse(responseData);
        } catch (error) {
            console.error('All retry attempts failed:', error);
            // Don't show error to user, silently fail
        }
    };

    const handleListingsPress = (listings: ListingData[]) => {
        try {
            if (!Array.isArray(listings) || listings.length === 0) {
                console.error('Invalid listings data:', listings);
                return;
            }
    
            const basicListings = listings.map(listing => {
                // Ensure all required properties have default values
                const processedListing = {
                    listing_id: listing.listing_id || '',
                    address: listing.address || '',
                    list_price: typeof listing.list_price === 'number' ? listing.list_price : 0,
                    bedrooms_total: typeof listing.bedrooms_total === 'number' ? listing.bedrooms_total : 0,
                    bathrooms_total: typeof listing.bathrooms_total === 'number' ? listing.bathrooms_total : 0,
                    parking_features: Array.isArray(listing.parking_features) ? listing.parking_features : [],
                    property_type: typeof listing.property_type === 'string' ? listing.property_type : 'Unknown',
                    media: Array.isArray(listing.media) ? listing.media.map(media => ({
                        MediaURL: media.MediaURL || '',
                        MediaType: media.MediaCategory || 'Photo'
                    })) : [],
                    coordinates: {
                        latitude: typeof listing.coordinates?.latitude === 'number' ? listing.coordinates.latitude : 0,
                        longitude: typeof listing.coordinates?.longitude === 'number' ? listing.coordinates.longitude : 0
                    },
                    PublicRemarks: '',
                    LotFeatures: [],
                    City: listing.city || '',
                    PostalCode: '',
                    ParkingTotal: 0
                };
    
                return processedListing;
            });
    
            console.log('First processed listing:', basicListings[0]);

            const serializedListings = JSON.stringify(basicListings);
            if (!serializedListings) {
                throw new Error('Failed to serialize listings data');
            }
    
            console.log('Navigation payload size:', serializedListings.length);
            console.log('Sample of navigation payload:', serializedListings.substring(0, 200));
    
            router.push({
                pathname: '/camila/search-results',
                params: {
                    listingsData: encodeURIComponent(serializedListings)
                }
            });
        } catch (error) {
            console.error('Error in handleListingsPress:', error);
        }
    };

    const renderMessage = (msg: ChatMessage, index: number) => {
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
    
        const isFirstInGroup = msg.sender === 'bot' && (
            index === 0 ||
            chatMessages[index - 1]?.sender !== 'bot' ||
            msg.responseGroup !== chatMessages[index - 1]?.responseGroup
        );
    
        return (
            <View key={msg.id} className="mb-4">
                <View className={`flex-row ${msg.sender === 'user' ? 'justify-end' : 'items-start'}`}>
                    {msg.sender === 'bot' && (
                        <View className="w-8 h-8 mr-2">
                            {isFirstInGroup && (
                                <Image 
                                    source={require('@/assets/camila-avatar.jpg')}
                                    className="w-8 h-8 rounded-full absolute top-0 left-0"
                                />
                            )}
                        </View>
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
                            {msg.sender === 'bot' ? msg.displayedText || '' : msg.text}
                            {msg.isTyping && '▋'}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);

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
                    {chatMessages.map((msg, index) => renderMessage(msg, index))}
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