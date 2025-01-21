// components/ListingCard.tsx
import React from 'react';
import { 
    View, 
    Text, 
    Image, 
    TouchableOpacity, 
    FlatList, 
    Dimensions,
    Linking 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ListingData } from '@/types/listingData';
import { useRouter } from 'expo-router';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface ListingCardProps {
    listing: ListingData;
    containerStyle?: object;
    showActions?: boolean;
    currentMediaIndex: number;
    onMediaIndexChange: (index: number) => void;
    onClose?: () => void;
    onFavorite?: () => void;
    onAddressPress?: () => void;
}

const ListingCard = ({ 
    listing, 
    containerStyle = {}, 
    showActions = false,
    currentMediaIndex = 0,
    onMediaIndexChange,
    onClose,
    onFavorite,
    onAddressPress
}: ListingCardProps) => {
    const mediaItems = listing.media || [];

    const handleMediaScroll = (event: any) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffset / (SCREEN_WIDTH - 32));
        if (onMediaIndexChange && index >= 0 && index < mediaItems.length) {
            onMediaIndexChange(index);
        }
    };

    const renderMediaItem = ({ item }: { item: any }) => {
        if (item.MediaCategory && item.MediaCategory.toLowerCase() !== "property photo") {
            return (
                <TouchableOpacity
                    style={{ width: SCREEN_WIDTH - 32, height: 200 }}
                    className="bg-black items-center justify-center"
                    onPress={() => Linking.openURL(item.MediaURL)}
                >
                    <View className="items-center">
                        <Feather name="play-circle" size={48} color="white" />
                        <Text className="text-white mt-4">Watch Virtual Tour</Text>
                    </View>
                </TouchableOpacity>
            );
        }
        return (
            <View style={{ width: SCREEN_WIDTH - 32 }}>
                <Image
                    source={{ uri: item.MediaURL }}
                    style={{ width: SCREEN_WIDTH - 32, height: 200 }}
                    className="rounded-t-3xl"
                    resizeMode="cover"
                />
            </View>
        );
    };

    return (
        <View className="bg-white rounded-3xl overflow-hidden mb-4" style={containerStyle}>
            <View className="relative">
                <FlatList
                    data={mediaItems}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleMediaScroll}
                    renderItem={renderMediaItem}
                    keyExtractor={(item, index) => `${item.MediaURL}-${index}`}
                    snapToInterval={SCREEN_WIDTH - 32}
                    decelerationRate="fast"
                />
                
                <View className="absolute top-3 left-4 bg-black/50 px-3 py-1 rounded-full">
                    <Text className="text-white text-sm">
                        {mediaItems.length > 0 ? `${currentMediaIndex + 1}/${mediaItems.length}` : ''}
                    </Text>
                </View>

                {showActions && (
                    <View className="absolute right-4 top-4 flex-row space-x-2">
                        <TouchableOpacity 
                            className="bg-white rounded-full p-2 shadow"
                            onPress={onFavorite}
                        >
                            <Feather name="heart" size={24} color="black" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            className="bg-white rounded-full p-2 shadow"
                            onPress={onClose}
                        >
                            <Feather name="x" size={24} color="black" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <View className="p-4">
                <View className="h-12 flex-row justify-between items-start">
                    <TouchableOpacity 
                        onPress={onAddressPress} 
                        className="flex-1 mr-2"
                        activeOpacity={0.7}
                    >
                        <Text 
                            adjustsFontSizeToFit
                            numberOfLines={2}
                            minimumFontScale={0.75}
                            className="font-semibold underline"
                            style={{
                                fontSize: listing.address.length <= 30 ? 20 : 16,
                                lineHeight: listing.address.length <= 30 ? 24 : 20,
                                maxHeight: 48
                            }}
                        >
                            {listing.address}
                        </Text>
                    </TouchableOpacity>
                    <Text className="text-[#8CC7C3] text-sm">Apartment</Text>
                </View>
                
                <View className="flex-row justify-between items-center mt-2">
                    <Text className="text-[#54B4AF] text-lg mb-3">
                        ${listing.list_price?.toLocaleString() || 'Price not available'}
                    </Text>

                    <View className="flex-row gap-4">
                        <Text>{listing.bedrooms_total}🛏️</Text>
                        <Text>{listing.bathrooms_total}🚿</Text>
                        <Text>{(listing.parking_features || []).length}🚗</Text>
                    </View>
                </View>

                <View className="flex-row flex-wrap gap-2 mb-4">
                    {listing.tags && listing.tags.map((tag, index) => (
                        <View 
                            key={index} 
                            className="bg-gray-100 rounded-full px-3 py-1"
                        >
                            <Text className="text-gray-600">{tag}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
};

export default ListingCard;