// app/navigation/camila/view-more.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ListingData } from '@/types/listingData';
import { ModelPreference } from '@/types/chatInterface';
import ListingCard from '@/components/ListingCard';
import SearchFilters from '@/components/SearchFilters';
import ListingsPrefetcher from '@/components/listings/ListingsPrefetcher';

interface ParsedListingsData {
    cachedListings: ListingData[];
    listingIds: string[];
    modelPreference: ModelPreference;
}

const ViewMore = () => {
    const router = useRouter();
    const { listingsData } = useLocalSearchParams();
    const [listings, setListings] = useState<ListingData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [mediaIndices, setMediaIndices] = useState<{ [key: string]: number }>({});
    const [showFilters, setShowFilters] = useState(false);
    const [modelPreference, setModelPreference] = useState<ModelPreference | null>(null);
    const [allListingIds, setAllListingIds] = useState<string[]>([]);

    useEffect(() => {
        if (!listingsData) return;
        
        try {
            const decodedData = decodeURIComponent(listingsData as string);
            const parsed = JSON.parse(decodedData);
            
            if (!Array.isArray(parsed.cachedListings)) {
                console.error('Invalid listings data');
                return;
            }
    
            console.log('Rendering view-more with listings:', parsed.cachedListings.length);
            
            setModelPreference(parsed.modelPreference);
            setListings(parsed.cachedListings);
            
            const indices = {};
            parsed.cachedListings.forEach((listing: ListingData) => {
                indices[listing.listing_id] = 0;
            });
            setMediaIndices(indices);
    
        } catch (error) {
            console.error('Error parsing listings data:', error);
        }
    }, [listingsData]);

    const handleMediaIndexChange = (listingId: string, index: number) => {
        setMediaIndices(prev => ({
            ...prev,
            [listingId]: index
        }));
    };

    const renderListingItem = ({ item }: { item: ListingData }) => (
        <ListingCard
            listing={item}
            currentMediaIndex={mediaIndices[item.listing_id] || 0}
            onMediaIndexChange={(index) => handleMediaIndexChange(item.listing_id, index)}
        />
    );

    return (
        <View className="flex-1 bg-gray-100">
            {modelPreference && allListingIds.length > 0 && (
                <ListingsFetcher
                    cachedListings={listings}
                    allListingIds={allListingIds}
                    modelPreference={modelPreference}
                    onListingsUpdate={(updatedListings) => {
                        console.log('Received updated listings:', updatedListings.length);
                        setListings(updatedListings);
                        const newIndices = { ...mediaIndices };
                        updatedListings.forEach(listing => {
                            if (!(listing.listing_id in newIndices)) {
                                newIndices[listing.listing_id] = 0;
                            }
                        });
                        setMediaIndices(newIndices);
                    }}
                    onLoadingStateChange={setIsLoading}
                />
            )}

            <Stack.Screen 
                options={{
                    title: "Camila",
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: '#F8F8F8' },
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} className="pl-4">
                            <Text><Feather name="arrow-left" size={24} color="black" /></Text>
                        </TouchableOpacity>
                    ),
                }}
            />

            <View className="items-center my-2">
                <TouchableOpacity 
                    className="bg-white rounded-full py-1.5 px-5"
                    onPress={() => setShowFilters(true)}
                >
                    <Text className="text-gray-800 text-sm">View Search Filters</Text>
                </TouchableOpacity>
            </View>
            
            <FlatList
                data={listings}
                renderItem={renderListingItem}
                keyExtractor={(item) => item.listing_id.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
                maxToRenderPerBatch={5}
                windowSize={5}
            />

            <TouchableOpacity
                className="absolute bottom-40 left-40 transform -translate-x-1/2 bg-black rounded-full py-2 px-4 flex-row items-center justify-center shadow-lg"
                onPress={() => {
                    router.push({
                        pathname: '/navigation/camila/google-map',
                        params: { 
                            listingsData: encodeURIComponent(JSON.stringify(listings))
                        }
                    });
                }}
            >
                <Text className="text-white font-medium text-base mr-2">Map</Text>
                <Feather name="map" size={24} color="white" />
            </TouchableOpacity>

            <SearchFilters 
                visible={showFilters}
                onDismiss={() => setShowFilters(false)}
                modelPreference={modelPreference}
            />

            {isLoading && (
                <View className="absolute top-0 left-0 right-0 bottom-0 justify-center items-center bg-black/30">
                    <ActivityIndicator size="large" color="#54B4AF" />
                </View>
            )}
        </View>
    );
};

export default ViewMore;