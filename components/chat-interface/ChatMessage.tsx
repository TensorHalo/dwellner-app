// @/components/chat-interface/ChatMessage.tsx
import React from 'react';
import { View, Text, Image, ActivityIndicator } from 'react-native';
import { ChatMessage } from '@/types/chatInterface';
import ListingsButton from '../ListingsButton';
import { ListingData } from '@/types/listingData';

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
                <View 
                    className={`px-5 py-3 rounded-xl max-w-[85%] ${
                        message.sender === 'user' 
                            ? 'bg-gray-100' 
                            : 'bg-white'
                    }`}
                    style={message.sender === 'user' ? {
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
                        {message.sender === 'bot' 
                            ? (message.displayedText !== undefined ? message.displayedText : message.text)
                            : message.text
                        }
                        {message.isTyping && '▋'}
                    </Text>
                </View>
            </View>
        </View>
    );
};

export default Message;