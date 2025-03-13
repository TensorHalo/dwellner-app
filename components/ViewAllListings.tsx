// @/components/ViewAllListings.tsx
import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    FlatList, 
    ActivityIndicator, 
    StyleSheet, 
    Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ListingData } from '@/types/listingData';
import { ModelPreference } from '@/types/chatInterface';
import ListingCardWithNoTags from '@/components/ListingCardWithNoTags';
import { ListingsViewAllApi } from '@/components/listings/ListingsViewAllApi';
import { getAuthTokens } from '@/utils/authTokens';
import { ListingsCache } from '@/components/listings/ListingsCache';
import ListingDetailGallery from '@/components/ListingDetailGallery';

interface ViewAllListingsProps {
    listingIds: string[];
    modelPreference: ModelPreference | null;
    onBackToFeatured?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ViewAllListings: React.FC<ViewAllListingsProps> = ({ 
    listingIds,
    modelPreference,
    onBackToFeatured
}) => {
    const router = useRouter();
    const [listings, setListings] = useState<ListingData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [mediaIndices, setMediaIndices] = useState<{ [key: string]: number }>({});
    const [error, setError] = useState<string | null>(null);
    
    // For the listing detail gallery
    const [selectedListing, setSelectedListing] = useState<ListingData | null>(null);
    const [showDetailGallery, setShowDetailGallery] = useState(false);
    
    // Get cache instance
    const cache = ListingsCache.getInstance();
    
    // Calculate footer height from global var or use a default
    const footerHeight = global.FOOTER_HEIGHT || 80;

    useEffect(() => {
        const loadListings = async () => {
            try {
                if (!listingIds || !listingIds.length) {
                    throw new Error('No listing IDs provided');
                }

                setIsLoading(true);
                setError(null);

                // Check if we have a full cache first
                let allCachedListings = cache.getAllCachedListings();
                
                // If we have all listings cached, use them
                if (allCachedListings.length >= listingIds.length) {
                    console.log('Using cached listings for view all:', allCachedListings.length);
                    
                    // Filter the cached listings to only include the ones in our listingIds
                    const filteredListings = allCachedListings.filter(listing => 
                        listingIds.includes(listing.listing_id) || 
                        listingIds.includes(listing.listing_id.replace('C', ''))
                    );
                    
                    if (filteredListings.length === listingIds.length) {
                        // We have all listings cached
                        console.log('All listings found in cache, no API call needed');
                        
                        // Initialize media indices
                        const indices: {[key: string]: number} = {};
                        filteredListings.forEach(listing => {
                            indices[listing.listing_id] = 0;
                        });
                        
                        setListings(filteredListings);
                        setMediaIndices(indices);
                        setIsLoading(false);
                        return;
                    }
                }

                // We need to fetch some or all listings from the API
                console.log('Fetching listings from API, cached:', cache.getAllCachedListings().length);
                console.log('Uncached listing IDs:', cache.getUncachedListingIds());

                // Get auth tokens
                const tokens = await getAuthTokens();
                if (!tokens?.accessToken || !tokens?.idToken) {
                    throw new Error('Authentication failed');
                }

                // Initialize API and fetch all listings
                const viewAllApi = new ListingsViewAllApi(tokens.accessToken, tokens.idToken);
                const allListings = await viewAllApi.fetchAllListings(listingIds);
                
                console.log(`Fetched ${allListings.length} listings from API`);
                
                // Cache all fetched listings
                allListings.forEach(listing => {
                    cache.cacheListing(listing);
                });
                
                // Initialize media indices
                const indices: {[key: string]: number} = {};
                allListings.forEach(listing => {
                    indices[listing.listing_id] = 0;
                });

                setListings(allListings);
                setMediaIndices(indices);
            } catch (err) {
                console.error('Error loading listings:', err);
                setError(err instanceof Error ? err.message : 'Failed to load listings');
                
                // Try to show any cached listings we do have if API fails
                const cachedListings = cache.getAllCachedListings();
                if (cachedListings.length > 0) {
                    console.log('Falling back to cached listings:', cachedListings.length);
                    
                    // Initialize media indices
                    const indices: {[key: string]: number} = {};
                    cachedListings.forEach(listing => {
                        indices[listing.listing_id] = 0;
                    });
                    
                    setListings(cachedListings);
                    setMediaIndices(indices);
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadListings();
    }, [listingIds]);

    const handleMediaIndexChange = (listingId: string, index: number) => {
        setMediaIndices(prev => ({
            ...prev,
            [listingId]: index
        }));
    };
    
    const handleAddressPress = (listing: ListingData) => {
        setSelectedListing(listing);
        setShowDetailGallery(true);
    };
    
    const closeDetailGallery = () => {
        setShowDetailGallery(false);
    };

    const renderListingItem = ({ item }: { item: ListingData }) => (
        <ListingCardWithNoTags
            listing={item}
            currentMediaIndex={mediaIndices[item.listing_id] || 0}
            onMediaIndexChange={(index) => handleMediaIndexChange(item.listing_id, index)}
            onAddressPress={() => handleAddressPress(item)}
        />
    );

    return (
        <View style={[styles.container, { paddingBottom: footerHeight }]}>
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#54B4AF" />
                    <Text style={styles.loadingText}>Loading listings...</Text>
                </View>
            ) : error && listings.length === 0 ? (
                <View style={styles.errorContainer}>
                    <Feather name="alert-circle" size={48} color="#FF6B6B" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity 
                        style={styles.backToHomeButton}
                        onPress={onBackToFeatured}
                    >
                        <Text style={styles.backToHomeText}>Back to Featured</Text>
                    </TouchableOpacity>
                </View>
            ) : listings.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Feather name="inbox" size={48} color="#A0A0A0" />
                    <Text style={styles.emptyText}>No listings found</Text>
                </View>
            ) : (
                <>
                    {error && (
                        <View style={styles.warningBanner}>
                            <Feather name="alert-triangle" size={16} color="#FF9500" />
                            <Text style={styles.warningText}>
                                {error} (Showing cached listings)
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
                            // Add extra padding at the bottom to account for the map button and footer
                            { paddingBottom: 120 }
                        ]}
                        maxToRenderPerBatch={5}
                        windowSize={5}
                    />

                    {/* Centered Map Button */}
                    <View style={[styles.mapButtonContainer, { bottom: footerHeight + 20 }]}>
                        <TouchableOpacity
                            style={styles.mapButton}
                            onPress={() => {
                                router.push({
                                    pathname: '/navigation/camila/google-map',
                                    params: { 
                                        listingsData: encodeURIComponent(JSON.stringify(listings))
                                    }
                                });
                            }}
                        >
                            <Text style={styles.mapButtonText}>Map</Text>
                            <Feather name="map" size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                    
                    {/* Listing Detail Gallery */}
                    <ListingDetailGallery
                        visible={showDetailGallery}
                        onClose={closeDetailGallery}
                        listing={selectedListing}
                        modelPreference={modelPreference}
                    />
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F8F8',
    },
    listContainer: {
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666',
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
    backToHomeButton: {
        marginTop: 24,
        backgroundColor: '#54B4AF',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 24,
    },
    backToHomeText: {
        color: 'white',
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
    mapButtonContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    mapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'black',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5,
    },
    mapButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
        marginRight: 8,
    }
});

export default ViewAllListings;