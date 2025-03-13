// @/app/navigation/collect/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    FlatList, 
    ActivityIndicator, 
    StyleSheet, 
    Dimensions,
    StatusBar,
    ScrollView
} from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ListingCardWithNoTags from '@/components/ListingCardWithNoTags';
import ListingDetailGallery from '@/components/ListingDetailGallery';
import { ListingData } from '@/types/listingData';
import { ModelPreference } from '@/types/chatInterface';
import { ListingsCache } from '@/components/listings/ListingsCache';
import { ListingsViewAllApi } from '@/components/listings/ListingsViewAllApi';
import { getUserFavoriteItems, FavoriteListingItem } from '@/utils/favoritesUtils';
import { getAuthTokens } from '@/utils/authTokens';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CollectIndex() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [initialLoad, setInitialLoad] = useState(true);
    const [listings, setListings] = useState<ListingData[]>([]);
    const [favoriteItems, setFavoriteItems] = useState<FavoriteListingItem[]>([]);
    const [mediaIndices, setMediaIndices] = useState<{ [key: string]: number }>({});
    const [error, setError] = useState<string | null>(null);
    
    // For the detail gallery when tapping on a listing
    const [selectedListing, setSelectedListing] = useState<ListingData | null>(null);
    const [selectedPreference, setSelectedPreference] = useState<ModelPreference | null>(null);
    const [showDetailGallery, setShowDetailGallery] = useState(false);
    
    // For user identification
    const [cognitoId, setCognitoId] = useState<string | null>(null);
    
    // Cache instance
    const cache = ListingsCache.getInstance();
    
    // Calculate footer height from global var or use a default
    const footerHeight = global.FOOTER_HEIGHT || 80;

    // Get user ID on component mount
    useEffect(() => {
        const getUserId = async () => {
            try {
                const pendingDataStr = await AsyncStorage.getItem('pendingUserData');
                if (pendingDataStr) {
                    const pendingData = JSON.parse(pendingDataStr);
                    if (pendingData.cognito_id) {
                        setCognitoId(pendingData.cognito_id);
                        return;
                    }
                }
            } catch (error) {
                console.error('Error getting cognito ID:', error);
            }
        };
        
        getUserId();
    }, []);

    // Fetch favorites when cognitoId is available - initial load
    useEffect(() => {
        if (cognitoId && initialLoad) {
            loadFavorites();
            setInitialLoad(false);
        }
    }, [cognitoId, initialLoad]);

    // Use the useFocusEffect to reload data every time the screen comes into focus
    useFocusEffect(
        useCallback(() => {
            // Don't reload if it's the initial load or we don't have cognitoId yet
            if (!initialLoad && cognitoId) {
                console.log('Screen focused, reloading favorites');
                loadFavorites(false); // Pass false to indicate it's not the initial load
            }
        }, [cognitoId, initialLoad])
    );

    const loadFavorites = async (showLoadingIndicator = true) => {
        if (!cognitoId) return;
        
        if (showLoadingIndicator) {
            setIsLoading(true);
        }
        
        try {
            // Get user's favorite items from DynamoDB
            const items = await getUserFavoriteItems(cognitoId);
            
            // Only update if the favorites have actually changed
            const currentIds = favoriteItems.map(item => item.listingId).sort().join(',');
            const newIds = items.map(item => item.listingId).sort().join(',');
            
            if (currentIds !== newIds) {
                console.log('Favorites have changed, updating UI');
                setFavoriteItems(items);
                
                if (items.length === 0) {
                    setListings([]);
                    if (showLoadingIndicator) {
                        setIsLoading(false);
                    }
                    return;
                }
                
                // Load the listings data for each favorite
                await loadListingsData(items);
            } else {
                console.log('Favorites unchanged, no update needed');
                if (showLoadingIndicator) {
                    setIsLoading(false);
                }
            }
        } catch (error) {
            console.error('Error loading favorites:', error);
            setError('Failed to load saved listings');
            if (showLoadingIndicator) {
                setIsLoading(false);
            }
        }
    };

    const loadListingsData = async (items: FavoriteListingItem[]) => {
        try {
            // Get auth tokens
            const tokens = await getAuthTokens();
            if (!tokens?.accessToken || !tokens?.idToken) {
                throw new Error('Authentication failed');
            }
            
            // Initialize listings API
            const listingsApi = new ListingsViewAllApi(tokens.accessToken, tokens.idToken);
            
            // Collect listing IDs
            const listingIds = items.map(item => item.listingId);
            
            // Initialize media indices
            const indices: {[key: string]: number} = { ...mediaIndices };
            
            // Check for cached listings first
            const cachedListings: ListingData[] = [];
            const uncachedIds: string[] = [];
            
            for (const id of listingIds) {
                const cachedListing = cache.getListing(id);
                if (cachedListing) {
                    cachedListings.push(cachedListing);
                    if (!indices[id]) indices[id] = 0;
                } else {
                    uncachedIds.push(id);
                }
            }
            
            // If we have all cached, no need for API calls
            if (uncachedIds.length === 0) {
                console.log('Using all cached favorites');
                const orderedListings = orderListingsByFavorites(cachedListings, items);
                setListings(orderedListings);
                setMediaIndices(indices);
                setIsLoading(false);
                return;
            }
            
            // Some listings need to be fetched
            console.log(`Fetching ${uncachedIds.length} uncached listings`);
            const fetchedListings = await listingsApi.fetchAllListings(uncachedIds);
            
            // Cache the fetched listings
            fetchedListings.forEach(listing => {
                cache.cacheListing(listing);
                indices[listing.listing_id] = 0;
            });
            
            // Combine cached and fetched listings
            const allListings = [...cachedListings, ...fetchedListings];
            
            // Order listings to match the order of favorites
            const orderedListings = orderListingsByFavorites(allListings, items);
            
            setListings(orderedListings);
            setMediaIndices(indices);
        } catch (error) {
            console.error('Error loading listings data:', error);
            setError('Failed to load some listings');
            
            // If we have some cached listings, show those at least
            if (listings.length > 0) {
                setIsLoading(false);
            } else {
                throw error; // Re-throw to trigger the outer catch block
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    // Order listings to match the order of favorites (by savedAt timestamp)
    const orderListingsByFavorites = (listings: ListingData[], favorites: FavoriteListingItem[]): ListingData[] => {
        // Create a map for quick ID lookups
        const listingsMap = new Map<string, ListingData>();
        listings.forEach(listing => {
            listingsMap.set(listing.listing_id, listing);
        });
        
        // Return listings in the same order as favorites
        return favorites
            .map(fav => listingsMap.get(fav.listingId))
            .filter((listing): listing is ListingData => listing !== undefined);
    };

    const handleMediaIndexChange = (listingId: string, index: number) => {
        setMediaIndices(prev => ({
            ...prev,
            [listingId]: index
        }));
    };
    
    const handleAddressPress = (listing: ListingData) => {
        // Find the model preference for this listing
        const favItem = favoriteItems.find(item => item.listingId === listing.listing_id);
        if (favItem) {
            setSelectedListing(listing);
            setSelectedPreference(favItem.modelPreference);
            setShowDetailGallery(true);
        }
    };
    
    const closeDetailGallery = () => {
        setShowDetailGallery(false);
        
        // Reload favorites after closing details in case user toggled favorite in detail view
        loadFavorites(false);
    };

    const refreshFavorites = () => {
        if (cognitoId) {
            loadFavorites(true);
        }
    };

    const renderListingItem = ({ item }: { item: ListingData }) => (
        <ListingCardWithNoTags
            listing={item}
            currentMediaIndex={mediaIndices[item.listing_id] || 0}
            onMediaIndexChange={(index) => handleMediaIndexChange(item.listing_id, index)}
            onAddressPress={() => handleAddressPress(item)}
        />
    );

    // Empty state component
    const renderEmptyState = () => (
        <ScrollView 
            contentContainerStyle={styles.emptyStateContainer}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.iconContainer}>
                <Feather name="home" size={64} color="#54B4AF" />
            </View>
            <Text style={styles.emptyStateTitle}>No Saved Listings Yet</Text>
            <Text style={styles.emptyStateText}>
                Save your favorite properties by tapping the heart icon while viewing listings.
            </Text>
        </ScrollView>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <Stack.Screen 
                options={{
                    headerShown: false,
                }}
            />

            {/* Custom Header */}
            <View style={[
                styles.header, 
                { paddingTop: insets.top > 0 ? insets.top : 12 }
            ]}>
                <Text style={styles.headerTitle}>Saved Listings</Text>
                
                {/* {listings.length > 0 && (
                    <TouchableOpacity 
                        style={styles.refreshButton}
                        onPress={refreshFavorites}
                    >
                        <Feather name="refresh-cw" size={20} color="#54B4AF" />
                    </TouchableOpacity>
                )} */}
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#54B4AF" />
                    <Text style={styles.loadingText}>Loading your saved listings...</Text>
                </View>
            ) : error && listings.length === 0 ? (
                <View style={styles.errorContainer}>
                    <Feather name="alert-circle" size={48} color="#FF6B6B" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity 
                        style={styles.retryButton}
                        onPress={refreshFavorites}
                    >
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            ) : listings.length === 0 ? (
                renderEmptyState()
            ) : (
                <>
                    {error && (
                        <View style={styles.warningBanner}>
                            <Feather name="alert-triangle" size={16} color="#FF9500" />
                            <Text style={styles.warningText}>
                                {error} (Showing available listings)
                            </Text>
                        </View>
                    )}
                    <FlatList
                        data={listings}
                        renderItem={renderListingItem}
                        keyExtractor={(item) => item.listing_id.toString()}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={[
                            styles.listContainer,
                            { paddingBottom: footerHeight + 20 }
                        ]}
                        maxToRenderPerBatch={5}
                        windowSize={5}
                    />
                </>
            )}
            
            {/* Listing Detail Gallery */}
            <ListingDetailGallery
                visible={showDetailGallery}
                onClose={closeDetailGallery}
                listing={selectedListing}
                modelPreference={selectedPreference}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    header: {
        backgroundColor: 'white',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
        position: 'relative',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    refreshButton: {
        position: 'absolute',
        right: 16,
        paddingHorizontal: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    errorText: {
        marginTop: 16,
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 24,
        backgroundColor: '#54B4AF',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 24,
    },
    retryButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    warningBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 149, 0, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginBottom: 8,
        marginHorizontal: 16,
        borderRadius: 8,
    },
    warningText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#FF9500',
    },
    listContainer: {
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    emptyStateContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(84, 180, 175, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyStateTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
        maxWidth: '80%',
    },
    exploreButton: {
        backgroundColor: '#54B4AF',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 30,
    },
    exploreButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});