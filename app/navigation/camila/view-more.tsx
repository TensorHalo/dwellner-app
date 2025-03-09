// app/navigation/camila/view-more.tsx
import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    FlatList, 
    ActivityIndicator, 
    StyleSheet, 
    Dimensions, 
    StatusBar, 
    Platform 
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ListingData } from '@/types/listingData';
import { ModelPreference } from '@/types/chatInterface';
import ListingCardWithNoTags from '@/components/ListingCardWithNoTags';
import SearchFilters from '@/components/SearchFilters';
import { ListingsViewAllApi } from '@/components/listings/ListingsViewAllApi';
import { getAuthTokens } from '@/utils/authTokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ParsedListingsData {
    listingIds: string[];
    modelPreference: ModelPreference;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ViewMore = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { listingsData } = useLocalSearchParams();
    const [listings, setListings] = useState<ListingData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [mediaIndices, setMediaIndices] = useState<{ [key: string]: number }>({});
    const [showFilters, setShowFilters] = useState(false);
    const [modelPreference, setModelPreference] = useState<ModelPreference | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Calculate footer height from global var or use a default
    const footerHeight = global.FOOTER_HEIGHT || 80;

    useEffect(() => {
        const fetchAllListings = async () => {
            try {
                if (!listingsData) {
                    throw new Error('No listing data provided');
                }

                setIsLoading(true);
                setError(null);

                // Parse the listing data
                const decodedData = decodeURIComponent(listingsData as string);
                const parsed: ParsedListingsData = JSON.parse(decodedData);
                
                if (!parsed.listingIds || !Array.isArray(parsed.listingIds)) {
                    throw new Error('Invalid listing IDs');
                }

                // Store model preference
                setModelPreference(parsed.modelPreference);

                // Get auth tokens
                const tokens = await getAuthTokens();
                if (!tokens?.accessToken || !tokens?.idToken) {
                    throw new Error('Authentication failed');
                }

                // Initialize API and fetch all listings
                const viewAllApi = new ListingsViewAllApi(tokens.accessToken, tokens.idToken);
                const allListings = await viewAllApi.fetchAllListings(parsed.listingIds);
                
                console.log(`Fetched ${allListings.length} listings`);
                
                // Initialize media indices
                const indices: {[key: string]: number} = {};
                allListings.forEach(listing => {
                    indices[listing.listing_id] = 0;
                });

                setListings(allListings);
                setMediaIndices(indices);
            } catch (err) {
                console.error('Error fetching listings:', err);
                setError(err instanceof Error ? err.message : 'Failed to load listings');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllListings();
    }, [listingsData]);

    const handleMediaIndexChange = (listingId: string, index: number) => {
        setMediaIndices(prev => ({
            ...prev,
            [listingId]: index
        }));
    };

    const renderListingItem = ({ item }: { item: ListingData }) => (
        <ListingCardWithNoTags
            listing={item}
            currentMediaIndex={mediaIndices[item.listing_id] || 0}
            onMediaIndexChange={(index) => handleMediaIndexChange(item.listing_id, index)}
            onAddressPress={() => {
                // If you need to handle address press (e.g., show on map)
            }}
        />
    );

    return (
        <View style={[styles.container, { paddingBottom: footerHeight }]}>
            <StatusBar barStyle="dark-content" />
            
            {/* Custom Header with safe area insets */}
            <View style={[
                styles.header, 
                { paddingTop: Platform.OS === 'ios' ? Math.max(insets.top, 12) : StatusBar.currentHeight + 12 }
            ]}>
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={styles.backButton}
                >
                    <Feather name="arrow-left" size={24} color="black" />
                </TouchableOpacity>
                
                <Text style={styles.headerTitle}>All Listings</Text>
                
                {modelPreference && (
                    <TouchableOpacity 
                        onPress={() => setShowFilters(true)}
                        style={styles.filterButton}
                    >
                        <Feather name="sliders" size={20} color="black" />
                    </TouchableOpacity>
                )}
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#54B4AF" />
                    <Text style={styles.loadingText}>Loading listings...</Text>
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Feather name="alert-circle" size={48} color="#FF6B6B" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity 
                        style={styles.backToHomeButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.backToHomeText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            ) : listings.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Feather name="inbox" size={48} color="#A0A0A0" />
                    <Text style={styles.emptyText}>No listings found</Text>
                </View>
            ) : (
                <>
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
                </>
            )}

            <SearchFilters 
                visible={showFilters}
                onDismiss={() => setShowFilters(false)}
                modelPreference={modelPreference}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F8F8',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    filterButton: {
        padding: 8,
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

export default ViewMore;