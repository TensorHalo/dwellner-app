// app/camila/view-more.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ListingData } from '@/utils/firebase';
import SearchFilters from '@/components/SearchFilters';
import ListingCard, { getFilters } from '@/components/ListingCard';

const ViewMore = () => {
    const router = useRouter();
    const { listingsData } = useLocalSearchParams();
    const [listings, setListings] = useState<ListingData[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [mediaIndices, setMediaIndices] = useState<{ [key: string]: number }>({});

    useEffect(() => {
        if (!listingsData) return;
        try {
            const decodedData = decodeURIComponent(listingsData as string);
            const parsedListings = JSON.parse(decodedData);
            setListings(parsedListings);
            // Initialize media indices for each listing
            const indices = {};
            parsedListings.forEach((listing: ListingData) => {
                indices[listing.listing_id] = 0;
            });
            setMediaIndices(indices);
        } catch (error) {
            console.error('Error parsing listings:', error);
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
            />

            <TouchableOpacity
                className="absolute bottom-40 left-40 transform -translate-x-1/2 bg-black rounded-full py-2 px-4 flex-row items-center justify-center shadow-lg"
                onPress={() => {
                    router.push({
                        pathname: '/camila/google-map',
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
                filters={getFilters()}
            />
        </View>
    );
};

export default ViewMore;