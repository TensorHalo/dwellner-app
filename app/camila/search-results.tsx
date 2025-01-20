// @/app/camila/search-results.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity,
    Dimensions,
    Animated,
    StyleSheet,
    BackHandler,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import MapView, { Marker, Region } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import { ListingData } from '@/types/listingData';
import { ModelPreference } from '@/types/chatInterface';
import SearchFilters from '@/components/SearchFilters';
import ListingCard from '@/components/ListingCard';
import NearbyFacilities from '@/components/NearbyFacilities';
import ListingsCache from '@/components/listings/ListingsCache';
import { ListingsApi } from '@/components/listings/ListingsApi';
import { getAuthTokens } from '@/utils/authTokens';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MAX_VISIBLE_LISTINGS = 8;

const PLACE_ICONS = {
    restaurant: 'restaurant',
    bar: 'local-bar',
    store: 'store',
    police: 'local-police'
};

const PLACE_COLORS = {
    restaurant: '#FF6B6B',
    bar: '#4ECDC4',
    store: '#45B7D1',
    police: '#2C3E50'
};

const SearchResults = () => {
    const router = useRouter();
    const { listingsData } = useLocalSearchParams();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [listings, setListings] = useState<ListingData[]>([]);
    const [activeTab, setActiveTab] = useState('Restaurant');
    const [showFilters, setShowFilters] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [facilities, setFacilities] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [modelPreference, setModelPreference] = useState<ModelPreference | null>(null);
    const [showListingCard, setShowListingCard] = useState(false);

    // Animation refs
    const slideAnim = useRef(new Animated.Value(0)).current;
    const cardSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const mapRef = useRef<MapView>(null);

    // Service refs
    const listingsApiRef = useRef<ListingsApi | null>(null);
    const cache = ListingsCache.getInstance();

    const currentListing = listings[currentIndex];
    const visibleListingsCount = Math.min(MAX_VISIBLE_LISTINGS, listings.length);

    // Initialize API and setup cleanup
    useEffect(() => {
        const initApi = async () => {
            const tokens = await getAuthTokens();
            if (tokens?.accessToken) {
                listingsApiRef.current = new ListingsApi(tokens.accessToken);
            }
        };
        initApi();

        return () => {
            cache.clearCache();
        };
    }, []);

    // Handle back button
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (showListingCard) {
                hideListingCard();
                return true;
            }
            if (showMap) {
                toggleMap();
                return true;
            }
            return false;
        });

        return () => backHandler.remove();
    }, [showMap, showListingCard]);

    // Initialize listings from data
    useEffect(() => {
        if (!listingsData) return;

        try {
            const decodedData = decodeURIComponent(listingsData as string);
            const { listings: initialListings, modelPreference: pref, listingIds } = JSON.parse(decodedData);

            setModelPreference(pref);

            if (initialListings?.[0]) {
                // Store first listing in cache and display
                cache.initializeWithFirstListing(initialListings[0], listingIds, pref);
                setListings([initialListings[0]]);
                
                // Start prefetching next listing
                prefetchNextListing();
            }
        } catch (error) {
            console.error('Error initializing listings:', error);
        }
    }, [listingsData]);

    const fetchListingDetail = async (listingId: string) => {
        if (!listingsApiRef.current || !modelPreference) return null;
        try {
            const listingData = await listingsApiRef.current.fetchListingDetail(
                listingId,
                modelPreference
            );
            cache.cacheListing(listingData);
            return listingData;
        } catch (error) {
            console.error('Error fetching listing detail:', error);
            return null;
        }
    };

    const prefetchNextListing = async () => {
        const nextListingId = cache.getNextUncachedListingId(currentIndex);
        if (nextListingId && !isLoading) {
            setIsLoading(true);
            await fetchListingDetail(nextListingId);
            setIsLoading(false);
        }
    };

    // Prefetch next listing when current index changes
    useEffect(() => {
        prefetchNextListing();
    }, [currentIndex]);

    const handleNextListing = async () => {
        if (currentIndex === MAX_VISIBLE_LISTINGS - 1) {
            navigateToViewMore();
            return;
        }

        const nextListingId = cache.getListingIds()[currentIndex + 1];
        if (!nextListingId) return;

        const nextListing = cache.getListing(nextListingId);
        if (nextListing) {
            setListings(prev => [...prev, nextListing]);
            setCurrentIndex(prev => prev + 1);
            setCurrentMediaIndex(0);
        } else {
            setIsLoading(true);
            const fetchedListing = await fetchListingDetail(nextListingId);
            setIsLoading(false);

            if (fetchedListing) {
                setListings(prev => [...prev, fetchedListing]);
                setCurrentIndex(prev => prev + 1);
                setCurrentMediaIndex(0);
            }
        }
    };

    const handlePreviousListing = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setCurrentMediaIndex(0);
        }
    };

    // Keep your existing UI-related functions
    const toggleMap = () => {
        if (showMap) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
            }).start(() => {
                setShowMap(false);
                setShowListingCard(false);
            });
        } else {
            setShowMap(true);
            Animated.spring(slideAnim, {
                toValue: -SCREEN_HEIGHT + 100,
                useNativeDriver: true,
                damping: 15,
                stiffness: 100
            }).start();
        }
    };

    const showListingDetails = () => {
        setShowListingCard(true);
        Animated.spring(cardSlideAnim, {
            toValue: 0,
            useNativeDriver: true,
            damping: 15,
            stiffness: 100
        }).start();
    };

    const hideListingCard = () => {
        Animated.spring(cardSlideAnim, {
            toValue: SCREEN_HEIGHT,
            useNativeDriver: true,
            damping: 15,
            stiffness: 100
        }).start(() => {
            setShowListingCard(false);
        });
    };

    const handleBackPress = () => {
        if (showMap) {
            toggleMap();
            return;
        }
        router.back();
    };

    const navigateToViewMore = () => {
        const allListings = cache.getAllCachedListings();
        router.push({
            pathname: '/camila/view-more',
            params: { 
                listingsData: encodeURIComponent(JSON.stringify({
                    listings: allListings,
                    modelPreference
                }))
            }
        });
    };

    if (!listings.length || !currentListing) {
        return (
            <View className="flex-1 bg-gray-100 items-center justify-center">
                <Text>Loading listings...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-100">
            <Stack.Screen 
                options={{
                    title: "Search result",
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: '#F8F8F8' },
                    headerLeft: () => (
                        <TouchableOpacity onPress={handleBackPress} className="pl-4">
                            <Text><Feather name="arrow-left" size={24} color="black" /></Text>
                        </TouchableOpacity>
                    ),
                }}
            />

            {/* Map View (positioned behind the content)
            <View style={StyleSheet.absoluteFill}>
                <MapView
                    ref={mapRef}
                    style={{ flex: 1 }}
                    initialRegion={currentRegion || undefined}
                    onMapReady={() => setMapReady(true)}
                    showsUserLocation={false}
                >
                    {showMap && currentListing && (
                        <>
                            <Marker
                                coordinate={currentListing.coordinates}
                                onPress={handleMarkerPress}
                            >
                                <TouchableOpacity 
                                    className="bg-white rounded-2xl px-3 py-2 shadow-lg"
                                    onPress={handleMarkerPress}
                                    activeOpacity={0.7}
                                >
                                    <Text className="font-medium text-base">
                                        ${currentListing.list_price?.toLocaleString()}
                                    </Text>
                                </TouchableOpacity>
                            </Marker>
                            {facilities.map((facility, index) => (
                                <Marker
                                    key={`facility-${index}`}
                                    coordinate={facility.coordinates}
                                >
                                    <View style={{
                                        backgroundColor: PLACE_COLORS[facility.type as keyof typeof PLACE_COLORS],
                                        padding: 8,
                                        borderRadius: 20,
                                    }}>
                                        <MaterialIcons 
                                            name={PLACE_ICONS[facility.type as keyof typeof PLACE_ICONS]} 
                                            size={20} 
                                            color="white" 
                                        />
                                    </View>
                                </Marker>
                            ))}
                        </>
                    )}
                </MapView>
            </View> */}

            {showListingCard && showMap && (
                <Animated.View
                    className="absolute w-full px-4 pb-8"
                    style={[
                        {
                            bottom: 0,
                            transform: [{ translateY: cardSlideAnim }],
                            maxHeight: SCREEN_HEIGHT * 0.7,
                            backgroundColor: 'white',
                            borderTopLeftRadius: 20,
                            borderTopRightRadius: 20,
                            shadowColor: "#000",
                            shadowOffset: {
                                width: 0,
                                height: -2,
                            },
                            shadowOpacity: 0.25,
                            shadowRadius: 3.84,
                            elevation: 5,
                        }
                    ]}
                >
                    <View className="w-full items-center py-2">
                        <View className="w-10 h-1 rounded-full bg-gray-300" />
                    </View>
                    
                    <ListingCard 
                        listing={currentListing}
                        showActions={true}
                        currentMediaIndex={currentMediaIndex}
                        onMediaIndexChange={setCurrentMediaIndex}
                        onClose={hideListingCard}
                        onFavorite={() => {/* Handle favorite */}}
                    />
                </Animated.View>
            )}

            <Animated.View 
                style={[
                    { 
                        flex: 1, 
                        backgroundColor: '#F8F8F8',
                    }, 
                    { 
                        transform: [{ translateY: slideAnim }] 
                    }
                ]}
            >
                <View className="items-center mb-1">
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
                            onAddressPress={toggleMap}
                        />
                    </View>

                    <View className="bg-white rounded-3xl overflow-hidden mt-1 scale-95">
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

                    <View className="flex-row items-center justify-center my-3 px-8">
                        <TouchableOpacity 
                            className="bg-white p-3 rounded-full mr-2"
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
                            <Text className="mx-6 font-medium">{currentIndex + 1}/{visibleListingsCount}</Text>
                            <TouchableOpacity onPress={handleNextListing}>
                                <Feather 
                                    name="chevron-right" 
                                    size={24} 
                                    color="black" 
                                />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity className="bg-white p-3 rounded-full ml-2">
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
                    modelPreference={modelPreference}
                />
            </Animated.View>
        </View>
    );
};

export default SearchResults;