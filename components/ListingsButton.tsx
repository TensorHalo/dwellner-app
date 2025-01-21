// @/components/ListingsButton.tsx
import React from 'react';
import { TouchableOpacity, Text, View, Image } from 'react-native';
import { ListingData } from '@/types/listingData';
import { ModelPreference } from '@/types/chatInterface';
import { ListingsCache } from './listings/ListingsCache';  // Changed to named import

interface ListingsButtonProps {
    listings: ListingData[];
    modelPreference?: ModelPreference;
    listingIds: string[];
    onPress: () => void;
}

const ListingsButton: React.FC<ListingsButtonProps> = ({ 
    listings, 
    modelPreference, 
    listingIds, 
    onPress 
}) => {
    const handlePress = () => {
        // Initialize the cache with the first listing
        if (listings?.length > 0) {
            const cache = ListingsCache.getInstance();
            cache.initializeWithFirstListing(
                listings[0],
                listingIds,
                modelPreference || null
            );
        }
        onPress();
    };

    return (
        <TouchableOpacity 
            onPress={handlePress}
            className="w-[85%] ml-10"
        >
            <View className="flex-row bg-[#8CD0CB] rounded-2xl overflow-hidden border-2 border-[#8CD0CB]">
                <View className="bg-[#8CD0CB] py-3 pl-6 pr-5">
                    <Image 
                        source={require('@/assets/logo_white.png')}
                        className="w-10 h-10"
                        resizeMode="contain"
                    />
                </View>
                <View className="flex-1 bg-white py-3 px-4 justify-center rounded-r-xl">
                    <Text className="text-black text-base font-medium">Your listings are ready.</Text>
                    <Text className="text-gray-400 text-sm">Click to check →</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default ListingsButton;