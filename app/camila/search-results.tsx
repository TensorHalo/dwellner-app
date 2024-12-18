// app/camila/search-results.tsx
import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    Dimensions,
    Image 
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ListingData } from '@/utils/firebase';
import SearchFilters from '@/components/SearchFilters';
import ListingCard, { getFilters } from '@/components/ListingCard';
import NearbyFacilities from '@/components/NearbyFacilities';

interface Facility {
    name: string;
    rating: string;
}

const NearbyFacility = ({ name, rating }: Facility) => (
    <View className="flex-row justify-between items-center py-1.5">
        <Text className="text-black text-[15px]">{name}</Text>
        <Text className="text-[15px]">{rating}</Text>
    </View>
);

const SearchResults = () => {
    const router = useRouter();
    const { listingsData } = useLocalSearchParams();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [listings, setListings] = useState<ListingData[]>([]);
    const [activeTab, setActiveTab] = useState('Restaurant');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        if (!listingsData) return;
        try {
            const decodedData = decodeURIComponent(listingsData as string);
            const parsedListings = JSON.parse(decodedData);
            setListings(parsedListings);
        } catch (error) {
            console.error('Error parsing listings:', error);
        }
    }, [listingsData]);

    const handleNextListing = () => {
        if (currentIndex === listings.length - 1) {
            navigateToViewMore();
        } else {
            setCurrentIndex(prev => prev + 1);
            setCurrentMediaIndex(0); // Reset media index when changing listings
        }
    };

    const handlePreviousListing = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setCurrentMediaIndex(0); // Reset media index when changing listings
        }
    };

    const navigateToViewMore = () => {
        router.push({
            pathname: '/camila/view-more',
            params: { listingsData: encodeURIComponent(JSON.stringify(listings)) },
        });
    };

    if (!listings.length) {
        return (
            <View className="flex-1 bg-gray-100 items-center justify-center">
                <Text>Loading listings...</Text>
            </View>
        );
    }

    const currentListing = listings[currentIndex];

    return (
        <View className="flex-1 bg-gray-100">
            <Stack.Screen 
                options={{
                    title: "Search result",
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

            <View className="flex-1 px-4">
                <View className="bg-white rounded-3xl overflow-hidden mb-0 scale-95">
                    <ListingCard
                        listing={currentListing}
                        currentMediaIndex={currentMediaIndex}
                        onMediaIndexChange={setCurrentMediaIndex}
                    />
                </View>

                <View className="bg-white rounded-3xl overflow-hidden mt-4 scale-95">
                    <View className="flex-row justify-around border-b border-gray-100">
                        {['Restaurant', 'Bar', 'Shop', 'Safety'].map((tab) => (
                            <TouchableOpacity 
                                key={tab}
                                className={`py-3 px-4 ${activeTab === tab ? 'border-b-2 border-[#8CC7C3]' : ''}`}
                                onPress={() => setActiveTab(tab as 'Restaurant' | 'Bar' | 'Shop' | 'Safety')}
                            >
                                <Text className={`${activeTab === tab ? 'text-[#8CC7C3]' : 'text-gray-600'} text-[15px]`}>
                                    {tab}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View className="p-4">
                        <View className="flex-row items-start">
                            <View className="flex-1">
                                <NearbyFacilities 
                                    listing={currentListing}
                                    activeTab={activeTab as 'Restaurant' | 'Bar' | 'Shop' | 'Safety'}
                                />
                            </View>
                        </View>
                    </View>
                </View>

                <View className="flex-row items-center justify-between my-3">
                    <TouchableOpacity 
                        className="bg-white p-3 rounded-full"
                        onPress={() => setShowFilters(true)}
                    >
                        <Feather name="info" size={24} color="black" />
                    </TouchableOpacity>

                    <View className="bg-white rounded-full flex-row items-center py-2 px-8">
                        <TouchableOpacity onPress={handlePreviousListing}>
                            <Feather 
                                name="chevron-left" 
                                size={24} 
                                color={currentIndex === 0 ? "#CCCCCC" : "black"} 
                            />
                        </TouchableOpacity>
                        <Text className="mx-6 font-medium">{currentIndex + 1}/{listings.length}</Text>
                        <TouchableOpacity onPress={handleNextListing}>
                            <Feather 
                                name="chevron-right" 
                                size={24} 
                                color={currentIndex === listings.length - 1 ? "#CCCCCC" : "black"} 
                            />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity className="bg-white p-3 rounded-full">
                        <Feather name="star" size={24} color="black" />
                    </TouchableOpacity>
                </View>

                <View className="items-center mb-4">
                    <TouchableOpacity 
                        className="bg-[#54B4AF] rounded-xl py-2.5 px-6"
                        onPress={navigateToViewMore}
                    >
                        <Text className="text-white text-base font-medium">View more →</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <SearchFilters 
                visible={showFilters}
                onDismiss={() => setShowFilters(false)}
                filters={getFilters()}
            />
        </View>
    );
};

export default SearchResults;