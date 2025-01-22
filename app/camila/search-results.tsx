// @/app/camila/search-results.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Animated, StyleSheet, BackHandler, Alert, Linking } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ListingData } from '@/types/listingData';
import { ModelPreference } from '@/types/chatInterface';
import SearchFilters from '@/components/SearchFilters';
import ListingCard from '@/components/ListingCard';
import NearbyFacilities from '@/components/NearbyFacilities';
import { ListingsCache } from '@/components/listings/ListingsCache';
import { ListingsApi } from '@/components/listings/ListingsApi';
import { getAuthTokens } from '@/utils/authTokens';
import ListingMap from '@/components/listings/ListingMap';
import ListingsPrefetcher from '@/components/listings/ListingsPrefetcher';
import LoadingOverlay from '@/components/listings/LoadingOverlay';

const SCREEN_HEIGHT = Dimensions.get('window').height;

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
    const [loadingProgress, setLoadingProgress] = useState(0);

    // Service refs
    const listingsApiRef = useRef<ListingsApi | null>(null);
    const cache = ListingsCache.getInstance();
    const MAX_VISIBLE_LISTINGS = 8;
    const currentListing = listings[currentIndex];
    const [isNextListingReady, setIsNextListingReady] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const prefetchingRef = useRef<{ [key: string]: boolean }>({});

    const handleAddressPress = () => {
        setShowMap(true);
    };

    const isMounted = useRef(true);

    useEffect(() => {
        return () => {
            isMounted.current = false;
            cache.clearCache();
        };
    }, []);

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

    useEffect(() => {
        const preference = cache.getModelPreference();
        if (preference) {
            console.log('Setting model preference from cache:', preference);
            setModelPreference(preference);
        }
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

            if (initialListings?.[0]) {
                cache.initializeWithFirstListing(initialListings[0], listingIds, pref);
                setListings([initialListings[0]]);
                setModelPreference(pref);
            }
        } catch (error) {
            console.error('Error initializing listings:', error);
        }
    }, [listingsData]);

    // Effect for prefetching next listing
    useEffect(() => {
        if (!listings.length || !cache.getModelPreference() || !listingsApiRef.current) return;
        
        const startPrefetch = async () => {
            const nextIndex = currentIndex + 1;
            if (nextIndex >= MAX_VISIBLE_LISTINGS) return;

            const nextListingId = cache.getListingIds()[nextIndex];
            if (!nextListingId || prefetchingRef.current[nextListingId]) return;

            // Check if already cached
            const cachedListing = cache.getListing(nextListingId);
            if (cachedListing) {
                setIsNextListingReady(true);
                return;
            }

            // Start prefetch
            try {
                prefetchingRef.current[nextListingId] = true;
                console.log('Starting prefetch for listing:', nextListingId);
                
                const listingData = await listingsApiRef.current.fetchListingDetail(
                    nextListingId,
                    cache.getModelPreference()!
                );
                
                if (listingData && isMounted.current) {
                    console.log('Successfully prefetched:', nextListingId);
                    cache.cacheListing(listingData);
                    setIsNextListingReady(true);
                }
            } catch (error) {
                console.error('Prefetch error:', error);
                setIsNextListingReady(false);
            } finally {
                prefetchingRef.current[nextListingId] = false;
            }
        };

        startPrefetch();
    }, [currentIndex, listings]);

    const handleOpenListingUrl = () => {
        if (!currentListing?.listing_url) return;

        const url = currentListing.listing_url.startsWith('http') 
            ? currentListing.listing_url 
            : `https://${currentListing.listing_url}`;

        Linking.openURL(url).catch(() => {
            Alert.alert('Error', 'Unable to open listing URL');
        });
    };

    const handleNextListing = async () => {
        if (currentIndex >= MAX_VISIBLE_LISTINGS - 1) return;

        const nextListingId = cache.getListingIds()[currentIndex + 1];
        if (!nextListingId) return;

        const nextListing = cache.getListing(nextListingId);
        if (nextListing) {
            setIsNextListingReady(false);
            setListings(prev => [...prev, nextListing]);
            setCurrentIndex(prev => prev + 1);
            setCurrentMediaIndex(0);
        } else {
            // If next listing isn't cached yet, show loading and wait
            setIsLoading(true);
            try {
                const listingData = await listingsApiRef.current?.fetchListingDetail(
                    nextListingId,
                    cache.getModelPreference()!
                );
                
                if (listingData) {
                    cache.cacheListing(listingData);
                    setListings(prev => [...prev, listingData]);
                    setCurrentIndex(prev => prev + 1);
                    setCurrentMediaIndex(0);
                }
            } catch (error) {
                console.error('Error fetching next listing:', error);
                Alert.alert('Error', 'Failed to load next listing');
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handlePreviousListing = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setCurrentMediaIndex(0);
        }
    };

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
            setShowMap(false);
            return;
        }
        router.back();
    };

    const navigateToViewMore = async () => {
        setIsLoading(true);
        setLoadingProgress(0);
    
        try {
            const prefetcher = ListingsPrefetcher.getInstance();
            
            const tokens = await getAuthTokens();
            if (!tokens?.accessToken) {
                throw new Error('No access token available');
            }
    
            prefetcher.initialize(tokens.accessToken);
    
            // Initialize cache with current listings
            const currentListings = cache.getAllCachedListings();
            prefetcher.initializeCache(currentListings);
    
            // Get uncached listing IDs
            const uncachedIds = cache.getUncachedListingIds();
            const totalToFetch = uncachedIds.length;
    
            if (totalToFetch === 0) {
                // If all listings are cached, navigate immediately
                router.push({
                    pathname: '/camila/view-more',
                    params: { 
                        listingsData: encodeURIComponent(JSON.stringify({
                            cachedListings: currentListings,
                            modelPreference: modelPreference
                        }))
                    }
                });
                return;
            }
    
            let fetchedCount = 0;
            const allListings = [...currentListings];
    
            // Fetch listings one by one to track progress
            for (const listingId of uncachedIds) {
                try {
                    const listingData = await listingsApiRef.current?.fetchListingDetail(
                        listingId,
                        modelPreference!
                    );
    
                    if (listingData) {
                        cache.cacheListing(listingData);
                        allListings.push(listingData);
                        fetchedCount++;
                        setLoadingProgress((fetchedCount / totalToFetch) * 100);
                    }
                } catch (error) {
                    console.error('Error fetching listing:', listingId, error);
                }
            }
    
            if (allListings.length === 0) {
                throw new Error('Failed to load listings');
            }
    
            router.push({
                pathname: '/camila/view-more',
                params: { 
                    listingsData: encodeURIComponent(JSON.stringify({
                        cachedListings: allListings,
                        modelPreference: modelPreference
                    }))
                }
            });
        } catch (error) {
            console.error('Error during prefetch:', error);
            Alert.alert('Error', 'Failed to load all listings. Please try again.');
        } finally {
            setIsLoading(false);
            setLoadingProgress(0);
        }
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
                        onAddressPress={handleAddressPress}
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
                            onAddressPress={handleAddressPress}
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
                            onPress={handleOpenListingUrl}
                        >
                            <Feather name="info" size={24} color="black" />
                        </TouchableOpacity>

                        <View className="bg-white rounded-full flex-row items-center py-2 px-8">
                            <TouchableOpacity 
                                onPress={handlePreviousListing}
                                disabled={currentIndex === 0}
                            >
                                <Feather 
                                    name="chevron-left" 
                                    size={24} 
                                    color={currentIndex === 0 ? "#CCCCCC" : "black"} 
                                />
                            </TouchableOpacity>
                            <Text className="mx-6 font-medium">
                                {currentIndex + 1}/{Math.min(MAX_VISIBLE_LISTINGS, cache.getListingIds().length)}
                            </Text>
                            <TouchableOpacity 
                                onPress={handleNextListing}
                                disabled={isLoading}
                            >
                                <Feather 
                                    name="chevron-right" 
                                    size={24} 
                                    color={isLoading ? "#CCCCCC" : "black"} 
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
            </Animated.View>
            {currentListing && (
                <ListingMap 
                    listing={currentListing}
                    visible={showMap}
                    onClose={() => setShowMap(false)}
                />
            )}
            <LoadingOverlay 
                visible={isLoading} 
                progress={loadingProgress} 
            />
            <SearchFilters 
                visible={showFilters}
                onDismiss={() => setShowFilters(false)}
                modelPreference={modelPreference}
            />
        </View>
    );
};

export default SearchResults;