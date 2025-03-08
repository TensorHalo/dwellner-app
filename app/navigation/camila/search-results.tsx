// @/app/navigation/camila/search-results.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    Dimensions, 
    Animated, 
    StyleSheet, 
    BackHandler, 
    Alert, 
    Linking,
    ScrollView,
    StatusBar,
    Platform
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ListingData } from '@/types/listingData';
import { ModelPreference } from '@/types/chatInterface';
import SearchFilters from '@/components/SearchFilters';
import ListingCard from '@/components/ListingCard';
import { ListingsCache } from '@/components/listings/ListingsCache';
import { ListingsApi } from '@/components/listings/ListingsApi';
import { getAuthTokens } from '@/utils/authTokens';
import ListingMap from '@/components/listings/ListingMap';
import ListingsPrefetcher from '@/components/listings/ListingsPrefetcher';
import LoadingOverlay from '@/components/listings/LoadingOverlay';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NearbyFacilitiesGallery from '@/components/NearbyFacilitiesGallery';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

const SearchResults = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
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
    const [activeTopTab, setActiveTopTab] = useState('Featured');

    // Animation refs
    const slideAnim = useRef(new Animated.Value(0)).current;
    const cardSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const [loadingProgress, setLoadingProgress] = useState(0);

    // Service refs
    const listingsApiRef = useRef<ListingsApi | null>(null);
    const cache = ListingsCache.getInstance();
    const MAX_VISIBLE_LISTINGS = 5; // Changed from 8 to 5
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
            if (tokens?.accessToken && tokens?.idToken) {
                listingsApiRef.current = new ListingsApi(tokens.accessToken, tokens.idToken);
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
            if (!tokens?.accessToken || !tokens?.idToken) {
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
                    pathname: '/navigation/camila/view-more',
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
            <StatusBar barStyle="dark-content" />
            <Stack.Screen 
                options={{
                    headerShown: false,
                }}
            />

            {/* Custom Header */}
            <View style={[
                styles.headerContainer, 
                { paddingTop: insets.top > 0 ? insets.top : 12 }
            ]}>
                <View className="flex-row items-center px-4">
                    <TouchableOpacity onPress={handleBackPress} className="mr-4">
                        <Feather name="arrow-left" size={24} color="black" />
                    </TouchableOpacity>
                    
                    <View className="flex-1 flex-row justify-center">
                        <TouchableOpacity 
                            onPress={() => setActiveTopTab('Featured')}
                            className="px-4"
                            style={styles.tabButton}
                        >
                            <Text className={`text-lg ${activeTopTab === 'Featured' ? 'font-semibold text-[#54B4AF]' : 'text-gray-600'}`}>
                                Featured
                            </Text>
                            {activeTopTab === 'Featured' && (
                                <View style={styles.activeTabIndicator} />
                            )}
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            onPress={() => {
                                setActiveTopTab('View all');
                                navigateToViewMore();
                            }}
                            className="px-4"
                            style={styles.tabButton}
                        >
                            <Text className={`text-lg ${activeTopTab === 'View all' ? 'font-semibold text-[#54B4AF]' : 'text-gray-600'}`}>
                                View all
                            </Text>
                            {activeTopTab === 'View all' && (
                                <View style={styles.activeTabIndicator} />
                            )}
                        </TouchableOpacity>
                    </View>
                    
                    <TouchableOpacity 
                        onPress={() => setShowFilters(true)}
                        className="ml-4"
                    >
                        <Feather name="sliders" size={24} color="black" />
                    </TouchableOpacity>
                </View>
            </View>

            {showListingCard && showMap && (
                <Animated.View
                    className="absolute w-full px-4 pb-8 z-20"
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
                <ScrollView 
                    className="flex-1"
                    contentContainerStyle={{ paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Main Listing Card */}
                    <View className="px-4 pt-4">
                        <View className="bg-white rounded-3xl overflow-hidden mb-0 scale-100">
                            <ListingCard
                                listing={currentListing}
                                currentMediaIndex={currentMediaIndex}
                                onMediaIndexChange={setCurrentMediaIndex}
                                onAddressPress={handleAddressPress}
                            />
                        </View>
                    </View>

                    {/* Nearby Section - Redesigned */}
                    <View className="px-4 mt-4">
                        <View className="bg-white rounded-3xl overflow-hidden scale-100">
                            {/* Nearby Facilities Gallery */}
                            <NearbyFacilitiesGallery 
                                listing={currentListing}
                                activeTab={activeTab}
                                onTabChange={setActiveTab}
                            />
                        </View>
                    </View>
                </ScrollView>

                {/* Placeholder for fixed controls - This ensures scrolling content doesn't get hidden behind the controls */}
                <View style={styles.controlsSpacer} />
            
            {/* Fixed Floating Controls */}
            <View style={[styles.floatingControls, { bottom: Math.max(120, insets.bottom + 90) }]}>
                <TouchableOpacity 
                    style={styles.infoButton}
                    onPress={handleOpenListingUrl}
                >
                    <Feather name="info" size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.favoriteButton}>
                    <Feather name="star" size={24} color="black" />
                </TouchableOpacity>

                <View style={styles.navigationControls}>
                    <TouchableOpacity 
                        onPress={handlePreviousListing}
                        disabled={currentIndex === 0}
                        style={styles.navButton}
                    >
                        <Feather 
                            name="chevron-up" 
                            size={24} 
                            color={currentIndex === 0 ? "#CCCCCC" : "black"} 
                        />
                    </TouchableOpacity>
                    
                    <Text style={styles.paginationText}>
                        {currentIndex + 1}/{Math.min(MAX_VISIBLE_LISTINGS, cache.getListingIds().length)}
                    </Text>
                    
                    <TouchableOpacity 
                        onPress={handleNextListing}
                        disabled={isLoading || currentIndex >= MAX_VISIBLE_LISTINGS - 1}
                        style={styles.navButton}
                    >
                        <Feather 
                            name="chevron-down" 
                            size={24} 
                            color={(isLoading || currentIndex >= MAX_VISIBLE_LISTINGS - 1) ? "#CCCCCC" : "black"} 
                        />
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

const styles = StyleSheet.create({
    headerContainer: {
        backgroundColor: 'white', 
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
        zIndex: 10,
    },
    tabButton: {
        paddingVertical: 12,
        position: 'relative',
        alignItems: 'center',
    },
    activeTabIndicator: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: '#54B4AF',
        borderRadius: 3,
    },
    floatingControls: {
        position: 'absolute',
        right: 16,
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 10,
    },
    infoButton: {
        backgroundColor: '#54B4AF',
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 6,
    },
    favoriteButton: {
        backgroundColor: 'white',
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 6,
    },
    navigationControls: {
        backgroundColor: 'white',
        borderRadius: 30,
        paddingVertical: 8,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 6,
    },
    navButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    paginationText: {
        fontSize: 16,
        fontWeight: '500',
        marginVertical: 4,
    },
    controlsSpacer: {
        height: 0, // No spacer needed as we're positioning controls higher
    }
});

export default SearchResults;