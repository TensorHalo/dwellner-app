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
import ListingAdditionalInfo from '@/components/listings/ListingAdditionalInfo';
import ListingAgentInfo from '@/components/listings/ListingAgentInfo';

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
    const MAX_VISIBLE_LISTINGS = 10;
    const currentListing = listings[currentIndex];
    const [isNextListingReady, setIsNextListingReady] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const prefetchingRef = useRef<{ [key: string]: boolean }>({});

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
            return false;
        });

        return () => backHandler.remove();
    }, [showListingCard]);

    // Initialize listings from data
    useEffect(() => {
        if (!listingsData) return;
    
        try {
            const decodedData = decodeURIComponent(listingsData as string);
            const { listings: initialListings, modelPreference: pref, listingIds } = JSON.parse(decodedData);
    
            if (initialListings?.[0]) {
                console.log('Initial listing received with fields:', Object.keys(initialListings[0]).join(', '));
            
                if (initialListings[0].originalEntryTimestamp) {
                    console.log('First listing already has timestamp data:', {
                        originalEntryTimestamp: initialListings[0].originalEntryTimestamp,
                        modificationTimestamp: initialListings[0].modificationTimestamp
                    });
                } else {
                    console.log('First listing missing additional fields');
                }
                
                cache.initializeWithFirstListing(initialListings[0], listingIds, pref);
                setListings([initialListings[0]]);
                setModelPreference(pref);
        
                // Immediately trigger prefetch for the second listing
                if (listingIds.length > 1) {
                    const secondListingId = listingIds[1];
                    // We'll perform this after the component is fully mounted and tokens are available
                    const prefetchSecondListing = async () => {
                        try {
                            // Wait for tokens and API to be initialized
                            const tokens = await getAuthTokens();
                            if (!tokens?.accessToken || !tokens?.idToken) {
                                console.error('No valid tokens for prefetching second listing');
                                return;
                            }
    
                            if (!listingsApiRef.current) {
                                listingsApiRef.current = new ListingsApi(tokens.accessToken, tokens.idToken);
                            }
    
                            // Check if already cached first
                            const cachedListing = cache.getListing(secondListingId);
                            if (cachedListing) {
                                console.log('Second listing already cached:', secondListingId);
                                setIsNextListingReady(true);
                                return;
                            }
    
                            // Start prefetch
                            console.log('Immediately prefetching second listing:', secondListingId);
                            prefetchingRef.current[secondListingId] = true;
                            
                            const listingData = await listingsApiRef.current.fetchListingDetail(
                                secondListingId,
                                pref
                            );
                            
                            if (listingData && isMounted.current) {
                                console.log('Successfully prefetched second listing:', secondListingId);
                                cache.cacheListing(listingData);
                                setIsNextListingReady(true);
                            }
                        } catch (error) {
                            console.error('Error prefetching second listing:', error);
                        } finally {
                            if (secondListingId) {
                                prefetchingRef.current[secondListingId] = false;
                            }
                        }
                    };
    
                    // Execute the prefetch
                    prefetchSecondListing();
                }
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
        router.back();
    };

    const navigateToViewMore = () => {
        if (!cache.getListingIds() || cache.getListingIds().length === 0 || !modelPreference) {
            Alert.alert('Error', 'No listings available');
            return;
        }

        router.push({
            pathname: '/navigation/camila/view-more',
            params: { 
                listingsData: encodeURIComponent(JSON.stringify({
                    listingIds: cache.getListingIds(),
                    modelPreference: modelPreference
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
                            />
                        </View>
                    </View>

                    {/* Nearby Section */}
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

                    {/* Additional Info */}
                    <View className="px-4 mt-4">
                        <ListingAdditionalInfo listing={currentListing} />
                    </View>

                    {/* Location Map - Integrated Section */}
                    <View className="px-4 mt-2">
                        <View className="bg-white rounded-3xl overflow-hidden scale-100">
                            <ListingMap 
                                listing={currentListing}
                                visible={true}
                                showHeader={true}
                            />
                        </View>
                    </View>

                    {/* Agent Contact Information */}
                    <View className="px-4 mt-4 mb-8">
                        <View className="bg-white rounded-3xl overflow-hidden scale-100">
                            <ListingAgentInfo 
                                listAgentKey={currentListing.listAgentKey}
                            />
                        </View>
                    </View>
                </ScrollView>

                {/* Placeholder for fixed controls */}
                <View style={styles.controlsSpacer} />
            
                {/* Fixed Floating Controls */}
                <View style={[styles.floatingControls, { bottom: Math.max(120, insets.bottom + 100) }]}>
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
        height: 0, 
    }
});

export default SearchResults;