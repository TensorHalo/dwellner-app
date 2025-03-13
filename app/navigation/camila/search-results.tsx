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
import ViewAllListings from '@/components/ViewAllListings';
import { getCognitoUserId } from '@/utils/cognitoConfig';
import { isFavorite, toggleFavorite } from '@/utils/favoritesUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    const [isChangingCard, setIsChangingCard] = useState(false);
    const [changeDirection, setChangeDirection] = useState<'next' | 'prev' | null>(null);
    const [showViewAll, setShowViewAll] = useState(false);
    const [isFavorited, setIsFavorited] = useState(false);
    const [cognitoId, setCognitoId] = useState<string | null>(null);

    // Animation refs
    const cardAnimatedValue = useRef(new Animated.Value(0)).current;
    const nextCardAnimatedValue = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef<ScrollView>(null);
    const [loadingProgress, setLoadingProgress] = useState(0);

    // For tracking current and next listings during animation
    const [currentListingData, setCurrentListingData] = useState<ListingData | null>(null);
    const [nextListingData, setNextListingData] = useState<ListingData | null>(null);

    // Service refs
    const listingsApiRef = useRef<ListingsApi | null>(null);
    const cache = ListingsCache.getInstance();
    const MAX_VISIBLE_LISTINGS = 6;
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

    useEffect(() => {
        const getUserId = async () => {
            try {
                const pendingDataStr = await AsyncStorage.getItem('pendingUserData');
                if (pendingDataStr) {
                    const pendingData = JSON.parse(pendingDataStr);
                    if (pendingData.cognito_id) {
                        setCognitoId(pendingData.cognito_id);
                        // await AsyncStorage.setItem('userId', pendingData.cognito_id);
                        // console.log(pendingData.cognito_id)
                        return;
                    }
                }
            } catch (error) {
                console.error('Error getting cognito ID:', error);
            }
        };
        
        getUserId();
    }, []);

    useEffect(() => {
        const checkFavoriteStatus = async () => {
            if (cognitoId && currentListingData) {
                const favorited = await isFavorite(cognitoId, currentListingData.listing_id);
                setIsFavorited(favorited);
            }
        };
        
        checkFavoriteStatus();
    }, [cognitoId, currentListingData?.listing_id]);

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
            if (showViewAll) {
                setShowViewAll(false);
                setActiveTopTab('Featured');
                return true;
            }
            if (showListingCard) {
                hideListingCard();
                return true;
            }
            return false;
        });

        return () => backHandler.remove();
    }, [showListingCard, showViewAll]);

    // Set current listing data when listings or currentIndex changes
    useEffect(() => {
        if (listings.length > 0 && currentIndex < listings.length) {
            setCurrentListingData(listings[currentIndex]);
        }
    }, [listings, currentIndex]);

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
                setCurrentListingData(initialListings[0]);
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

    const scrollToTop = () => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    };

    const animateCardChange = (direction: 'next' | 'prev', nextListing: ListingData) => {
        // Set the next listing data to use during animation
        setNextListingData(nextListing);
        setIsChangingCard(true);
        setChangeDirection(direction);
        
        // Reset animation values
        cardAnimatedValue.setValue(0);
        nextCardAnimatedValue.setValue(0);
        
        // Animate the card transition
        Animated.parallel([
            Animated.timing(cardAnimatedValue, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(nextCardAnimatedValue, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            // After animation completes, update the current listing
            setCurrentListingData(nextListing);
            setIsChangingCard(false);
            setChangeDirection(null);
            cardAnimatedValue.setValue(0);
            nextCardAnimatedValue.setValue(0);
            scrollToTop();
        });
    };

    const handleNextListing = async () => {
        if (currentIndex >= MAX_VISIBLE_LISTINGS - 1 || isChangingCard) return;

        const nextListingId = cache.getListingIds()[currentIndex + 1];
        if (!nextListingId) return;

        const nextListing = cache.getListing(nextListingId);
        if (nextListing) {
            // Start animation
            animateCardChange('next', nextListing);
            
            // Update state
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
                    
                    // Start animation
                    animateCardChange('next', listingData);
                    
                    // Update state
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
        if (currentIndex > 0 && !isChangingCard) {
            const prevListing = listings[currentIndex - 1];
            
            // Start animation
            animateCardChange('prev', prevListing);
            
            // Update state
            setCurrentIndex(prev => prev - 1);
            setCurrentMediaIndex(0);
        }
    };

    const handleToggleFavorite = async () => {
        if (!cognitoId || !currentListingData || !modelPreference) return;
        
        // Optimistically update UI
        setIsFavorited(prev => !prev);
        
        try {
            const newStatus = await toggleFavorite(
                cognitoId,
                currentListingData.listing_id,
                modelPreference
            );
            
            if (newStatus !== isFavorited) {
                setIsFavorited(newStatus);
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
            setIsFavorited(prev => !prev);
        }
    };

    const showListingDetails = () => {
        setShowListingCard(true);
    };

    const hideListingCard = () => {
        setShowListingCard(false);
    };

    const handleBackPress = () => {
        router.back();
    };

    const navigateToViewMore = () => {
        if (!cache.getListingIds() || cache.getListingIds().length === 0 || !modelPreference) {
            Alert.alert('Error', 'No listings available');
            return;
        }

        setShowViewAll(true);
        setActiveTopTab('View all');
    };

    const switchToFeatured = () => {
        setShowViewAll(false);
        setActiveTopTab('Featured');
    };

    // Card animation interpolations
    const currentCardAnimation = {
        transform: [
            {
                translateY: cardAnimatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, changeDirection === 'next' ? -SCREEN_HEIGHT : SCREEN_HEIGHT],
                }),
            },
            {
                scale: cardAnimatedValue.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 0.95, 0.9],
                }),
            },
            {
                rotateX: cardAnimatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', changeDirection === 'next' ? '30deg' : '-30deg'],
                }),
            },
        ],
        opacity: cardAnimatedValue.interpolate({
            inputRange: [0, 0.7, 1],
            outputRange: [1, 0.7, 0],
        }),
    };

    const nextCardAnimation = {
        transform: [
            {
                translateY: nextCardAnimatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [changeDirection === 'next' ? SCREEN_HEIGHT : -SCREEN_HEIGHT, 0],
                }),
            },
            {
                scale: nextCardAnimatedValue.interpolate({
                    inputRange: [0, 0.7, 1],
                    outputRange: [0.9, 0.95, 1],
                }),
            },
            {
                rotateX: nextCardAnimatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [changeDirection === 'next' ? '-30deg' : '30deg', '0deg'],
                }),
            },
        ],
        opacity: nextCardAnimatedValue.interpolate({
            inputRange: [0, 0.3, 1],
            outputRange: [0, 0.7, 1],
        }),
    };

    if (!listings.length || !currentListing || !currentListingData) {
        return (
            <View className="flex-1 bg-gray-100 items-center justify-center">
                <Text>Loading listings...</Text>
            </View>
        );
    }

    // Main card content to render the listing information
    const renderListingContent = (listing: ListingData) => (
        <View className="bg-white rounded-3xl overflow-hidden mb-0 mx-4 mt-4">
            {/* Main Listing Card */}
            <ListingCard
                listing={listing}
                currentMediaIndex={currentMediaIndex}
                onMediaIndexChange={setCurrentMediaIndex}
            />

            {/* Nearby Section */}
            <View className="mt-4 pb-4 border-b border-gray-100">
                <NearbyFacilitiesGallery 
                    listing={listing}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />
            </View>

            {/* Additional Info */}
            <View className="py-4 border-b border-gray-100">
                <ListingAdditionalInfo listing={listing} />
            </View>

            {/* Location Map */}
            <View className="py-4 border-b border-gray-100">
                <ListingMap 
                    listing={listing}
                    visible={true}
                    showHeader={true}
                />
            </View>

            {/* Agent Contact Information */}
            {listing.listAgentKey && (
                <View className="py-4">
                    <ListingAgentInfo 
                        listAgentKey={listing.listAgentKey}
                    />
                </View>
            )}
        </View>
    );

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
                            onPress={switchToFeatured}
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
                            onPress={navigateToViewMore}
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

            <View className="flex-1 bg-gray-100" style={{ position: 'relative' }}>
                {!showViewAll ? (
                    // Featured detailed listing view
                    <>
                        {/* Current card */}
                        <Animated.View 
                            style={[
                                styles.cardContainer,
                                isChangingCard ? currentCardAnimation : null
                            ]}
                            pointerEvents={isChangingCard ? 'none' : 'auto'}
                        >
                            <ScrollView 
                                ref={scrollViewRef}
                                className="flex-1"
                                contentContainerStyle={{ paddingBottom: 100 }}
                                showsVerticalScrollIndicator={false}
                            >
                                {renderListingContent(currentListingData)}
                            </ScrollView>
                        </Animated.View>

                        {/* Next card (only visible during transition) */}
                        {isChangingCard && nextListingData && (
                            <Animated.View 
                                style={[
                                    styles.cardContainer,
                                    styles.nextCardContainer,
                                    nextCardAnimation
                                ]}
                                pointerEvents="none"
                            >
                                <ScrollView 
                                    className="flex-1"
                                    contentContainerStyle={{ paddingBottom: 100 }}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {renderListingContent(nextListingData)}
                                </ScrollView>
                            </Animated.View>
                        )}
                        
                        {/* Loading Overlay - positioned correctly */}
                        <LoadingOverlay 
                            visible={isLoading} 
                            progress={loadingProgress}
                        />
                        
                        {/* Fixed Floating Controls */}
                        <View style={styles.floatingControls}>
                            <TouchableOpacity 
                                style={styles.infoButton}
                                onPress={handleOpenListingUrl}
                            >
                                <Feather name="info" size={24} color="white" />
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.favoriteButton}
                                onPress={handleToggleFavorite}
                            >
                                <Feather 
                                    name="heart" 
                                    size={24} 
                                    color={isFavorited ? "#FF4757" : "black"} 
                                />
                            </TouchableOpacity>

                            <View style={styles.navigationControls}>
                                <TouchableOpacity 
                                    onPress={handlePreviousListing}
                                    disabled={currentIndex === 0 || isChangingCard}
                                    style={styles.navButton}
                                >
                                    <Feather 
                                        name="chevron-up" 
                                        size={24} 
                                        color={(currentIndex === 0 || isChangingCard) ? "#CCCCCC" : "black"} 
                                    />
                                </TouchableOpacity>
                                
                                <Text style={styles.paginationText}>
                                    {currentIndex + 1}/{Math.min(MAX_VISIBLE_LISTINGS, cache.getListingIds().length)}
                                </Text>
                                
                                <TouchableOpacity 
                                    onPress={handleNextListing}
                                    disabled={isLoading || isChangingCard || currentIndex >= MAX_VISIBLE_LISTINGS - 1}
                                    style={styles.navButton}
                                >
                                    <Feather 
                                        name="chevron-down" 
                                        size={24} 
                                        color={(isLoading || isChangingCard || currentIndex >= MAX_VISIBLE_LISTINGS - 1) ? "#CCCCCC" : "black"} 
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </>
                ) : (
                    // View All listings component
                    <ViewAllListings 
                        listingIds={cache.getListingIds()}
                        modelPreference={modelPreference}
                        onBackToFeatured={switchToFeatured}
                    />
                )}
            </View>
            
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
    cardContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#F8F8F8',
        zIndex: 10, // Content layer
    },
    nextCardContainer: {
        zIndex: 5, // Below the main content
    },
    floatingControls: {
        position: 'absolute',
        right: 16,
        bottom: 120,
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 100, // Controls on top
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
    }
});

export default SearchResults;