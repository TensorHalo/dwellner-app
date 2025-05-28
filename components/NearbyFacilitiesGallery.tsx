import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    Image, 
    TouchableOpacity, 
    FlatList, 
    Dimensions, 
    ActivityIndicator, 
    StyleSheet 
} from 'react-native';
import { ListingData } from '@/types/listingData';
import { getAuthTokens } from '@/utils/authTokens';

const SCREEN_WIDTH = Dimensions.get('window').width;
const FACILITY_IMAGE_HEIGHT = 200;

interface Facility {
    name: string;
    rating: number | null;
    distance?: number;
    photoUrl: string | null;
    placeId: string;
}

interface NearbyFacilitiesGalleryProps {
    listing: ListingData;
    activeTab: string;
    onTabChange: (tab: 'Restaurant' | 'Bar' | 'Shop' | 'Safety') => void;
}

const NearbyFacilitiesGallery: React.FC<NearbyFacilitiesGalleryProps> = ({ 
    listing, 
    activeTab, 
    onTabChange 
}) => {
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentFacilityIndex, setCurrentFacilityIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [idToken, setIdToken] = useState<string | null>(null);

    // Initialize tokens
    useEffect(() => {
        const initTokens = async () => {
            try {
                const tokens = await getAuthTokens();
                if (tokens?.accessToken && tokens?.idToken) {
                    setAccessToken(tokens.accessToken);
                    setIdToken(tokens.idToken);
                }
            } catch (error) {
                console.error('Error initializing tokens:', error);
            }
        };
        
        initTokens();
    }, []);

    const fetchNearbyPlaces = async () => {
        if (!listing.coordinates || !accessToken || !idToken) {
            setError(!listing.coordinates ? 'No coordinates available' : 'Authentication error');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { latitude, longitude } = listing.coordinates;
            
            const apiUrl = `https://api.deephome.ca/api/v0/listing/details/nearby/${latitude},${longitude}`;
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                    'id-token': idToken,
                    'Connection': 'keep-alive'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Select the appropriate facility type based on activeTab
            let facilitiesData: any[] = [];
            
            if (activeTab === 'Restaurant' && data.response.restaurants) {
                facilitiesData = data.response.restaurants;
            } else if (activeTab === 'Bar' && data.response.bars) {
                facilitiesData = data.response.bars;
            } else if (activeTab === 'Shop' && data.response.shops) {
                facilitiesData = data.response.shops;
            } else if (activeTab === 'Safety' && data.response.safety) {
                facilitiesData = data.response.safety;
            }

            if (facilitiesData.length > 0) {
                const formattedFacilities: Facility[] = facilitiesData.map(place => {
                    // Get the first photo if available
                    const photoUrl = place.photos && place.photos.length > 0 ? 
                        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${place.photos[0].photo_reference}&key=AIzaSyA1cRST4odpAAs30pWs5414iJebTTynDpo` : 
                        null;
                    
                    return {
                        name: place.name,
                        rating: place.rating || null,
                        distance: place.distance,
                        photoUrl,
                        placeId: place.place_id
                    };
                });

                setFacilities(formattedFacilities);
                setCurrentFacilityIndex(0);
                setError(null);
            } else {
                setError(`No ${activeTab.toLowerCase()} facilities found nearby`);
                setFacilities([]);
            }
        } catch (err) {
            console.error('Error in fetchNearbyPlaces:', err);
            setError('Error fetching nearby places');
            setFacilities([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (accessToken && idToken) {
            fetchNearbyPlaces();
        }
    }, [listing.coordinates, activeTab, accessToken, idToken]);

    const handleScroll = (event) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffset / SCREEN_WIDTH);
        if (index >= 0 && index < facilities.length) {
            setCurrentFacilityIndex(index);
        }
    };

    const renderFacilityItem = ({ item, index }) => {
        return (
            <View style={styles.facilityImageContainer}>
                {item.photoUrl ? (
                    <Image 
                        source={{ uri: item.photoUrl }}
                        style={styles.facilityImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={styles.noImageContainer}>
                        <Text style={styles.noImageText}>No image available</Text>
                    </View>
                )}
                
                {/* Name overlay at bottom of image for cleaner design */}
                {/* <View style={styles.nameOverlay}>
                    <Text style={styles.overlayText} numberOfLines={1}>
                        {item.name}
                    </Text>
                </View> */}
            </View>
        );
    };

    // Display metric (rating or distance) based on the active tab
    const getMetricDisplay = (facility: Facility) => {
        if (activeTab === 'Safety' && facility.distance) {
            return `${(facility.distance / 1000).toFixed(1)}km`;
        } else {
            return facility.rating ? facility.rating.toFixed(1) : 'N/A';
        }
    };

    const currentFacility = facilities[currentFacilityIndex];

    return (
        <View style={styles.container}>
            {/* Header with "Nearby" title and current facility info */}
            <View style={styles.headerContainer}>
                <Text style={styles.nearbyTitle}>Nearby</Text>
                {!loading && facilities.length > 0 && currentFacility && (
                    <View style={styles.facilityInfoContainer}>
                        <Text style={styles.facilityName} numberOfLines={1}>
                            {currentFacility.name}
                        </Text>
                        <Text style={styles.facilityRating}>
                            {getMetricDisplay(currentFacility)}
                        </Text>
                    </View>
                )}
            </View>

            {/* Facility Images Gallery */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#54B4AF" />
                    <Text style={styles.loadingText}>Loading nearby {activeTab.toLowerCase()}s...</Text>
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : facilities.length === 0 ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>No {activeTab.toLowerCase()} facilities found nearby</Text>
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={facilities}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    renderItem={renderFacilityItem}
                    keyExtractor={(item) => item.placeId}
                    onScroll={handleScroll}
                    decelerationRate="fast"
                    snapToInterval={SCREEN_WIDTH - 32}
                    contentContainerStyle={styles.galleryContent}
                />
            )}

            {/* Pagination indicator - moved to center bottom of image */}
            {facilities.length > 0 && !loading && (
                <View style={styles.paginationContainer}>
                    <Text style={styles.paginationText}>
                        {currentFacilityIndex + 1}/{facilities.length}
                    </Text>
                </View>
            )}

            {/* Category tabs */}
            <View style={styles.tabsContainer}>
                {['Restaurant', 'Bar', 'Shop', 'Safety'].map((tab) => (
                    <TouchableOpacity 
                        key={tab}
                        style={[
                            styles.tabButton,
                            activeTab === tab ? styles.activeTabButton : null
                        ]}
                        onPress={() => onTabChange(tab as 'Restaurant' | 'Bar' | 'Shop' | 'Safety')}
                    >
                        <Text 
                            style={[
                                styles.tabText,
                                activeTab === tab ? styles.activeTabText : null
                            ]}
                        >
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderRadius: 24,
        overflow: 'hidden',
        paddingBottom: 8,
    },
    headerContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 6,
    },
    nearbyTitle: {
        fontSize: 20,
        fontWeight: '500',
        color: '#54B4AF',
        marginBottom: 4,
    },
    facilityInfoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    facilityName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        paddingRight: 8,
    },
    facilityRating: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    loadingContainer: {
        height: FACILITY_IMAGE_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#777',
    },
    errorContainer: {
        height: FACILITY_IMAGE_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    errorText: {
        fontSize: 16,
        color: '#777',
        textAlign: 'center',
        paddingHorizontal: 24,
    },
    galleryContent: {
        paddingHorizontal: 0,
    },
    facilityImageContainer: {
        width: SCREEN_WIDTH - 32,
        height: FACILITY_IMAGE_HEIGHT,
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 4,
    },
    facilityImage: {
        width: '100%',
        height: '100%',
    },
    noImageContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#eee',
    },
    noImageText: {
        fontSize: 16,
        color: '#777',
    },
    paginationContainer: {
        position: 'absolute',
        bottom: 64,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    paginationText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
        overflow: 'hidden',
    },
    tabsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 0,
        paddingTop: 4,
        marginTop: 4,
        paddingHorizontal: 16,
    },
    tabButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        alignItems: 'center',
    },
    activeTabButton: {
        borderBottomWidth: 2,
        borderBottomColor: '#54B4AF',
    },
    tabText: {
        fontSize: 15,
        color: '#999',
    },
    activeTabText: {
        color: '#54B4AF',
        fontWeight: '500',
    },
    nameOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    overlayText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '500',
    },
});

export default NearbyFacilitiesGallery;