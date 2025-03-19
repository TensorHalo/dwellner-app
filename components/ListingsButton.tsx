// @/components/ListingsButton.tsx
import React, { useEffect } from 'react';
import { TouchableOpacity, Text, View, Image } from 'react-native';
import { ListingData } from '@/types/listingData';
import { ModelPreference } from '@/types/chatInterface';
import { ListingsCache } from './listings/ListingsCache';

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
    // Log the incoming listing data for debugging
    useEffect(() => {
        if (listings && listings.length > 0) {
            console.log('ListingsButton received listing with isRental:', {
                id: listings[0].listing_id,
                isRental: listings[0].isRental,
                hasActualRent: listings[0].hasOwnProperty('TotalActualRent'),
                hasListPrice: listings[0].hasOwnProperty('ListPrice')
            });
        }
    }, [listings]);

    const handlePress = () => {
        // Initialize the cache with the first listing, ensuring isRental is properly set
        if (listings?.length > 0) {
            const firstListing = listings[0];
            
            // Ensure the isRental flag is set correctly
            // If the listing doesn't have an isRental property explicitly set,
            // determine it based on list_price and TotalActualRent
            const enhancedListing = {
                ...firstListing
            };

            // Explicitly check for isRental if it's undefined
            if (enhancedListing.isRental === undefined) {
                // If the listing has a 'rent_or_purchase' field in the model preference, use that
                if (modelPreference && modelPreference.rent_or_purchase) {
                    enhancedListing.isRental = modelPreference.rent_or_purchase.toLowerCase() === 'rent';
                    console.log('Setting isRental based on model preference:', enhancedListing.isRental);
                } else {
                    // Fallback: check if list_price is null and there's a TotalActualRent property
                    const hasListingRawData = firstListing.hasOwnProperty('TotalActualRent') || 
                                            firstListing.hasOwnProperty('ListPrice');
                    
                    if (hasListingRawData) {
                        // Direct access to raw API data
                        enhancedListing.isRental = firstListing.TotalActualRent !== null && 
                                                 firstListing.TotalActualRent !== undefined;
                    } else {
                        // No direct access, try to infer from other fields or model preference
                        const modelHasRental = modelPreference && 
                                              modelPreference.hasOwnProperty('rent_or_purchase');
                        
                        if (modelHasRental) {
                            enhancedListing.isRental = modelPreference.rent_or_purchase === 'rent';
                        } else {
                            // Last resort: check property type, if it's "Apartment" or "Condo" it's likely rental
                            enhancedListing.isRental = 
                                ['apartment', 'condo'].includes(
                                    (firstListing.property_type || '').toLowerCase()
                                );
                        }
                    }
                    
                    console.log('Inferred isRental value for first listing:', enhancedListing.isRental);
                }
            }
            
            // Initialize the cache with the enhanced listing
            const cache = ListingsCache.getInstance();
            cache.initializeWithFirstListing(
                enhancedListing,
                listingIds,
                modelPreference || null
            );
            
            console.log('Cache initialized with enhanced listing, isRental:', enhancedListing.isRental);
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