// @/components/listings/ListingMap.tsx
import React, { useEffect, useState, useRef } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity,
    StyleSheet,
    Dimensions
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import { ListingData } from '@/types/listingData';
import { getAuthTokens } from '@/utils/authTokens';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface ListingMapProps {
    listing: ListingData;
    visible: boolean;
    onClose?: () => void;
    showHeader?: boolean;
}

interface Facility {
    name: string;
    rating: number | null;
    coordinates: {
        latitude: number;
        longitude: number;
    };
    type: 'restaurant' | 'bar' | 'shop' | 'safety';
    placeId: string;
}

const PLACE_ICONS = {
    restaurant: 'restaurant',
    bar: 'local-bar',
    shop: 'store',
    safety: 'local-police'
};

const PLACE_COLORS = {
    restaurant: '#FF6B6B',
    bar: '#4ECDC4',
    shop: '#45B7D1',
    safety: '#2C3E50'
};

const ListingMap: React.FC<ListingMapProps> = ({ 
    listing, 
    visible, 
    onClose,
    showHeader = false
}) => {
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [mapReady, setMapReady] = useState(false);
    const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [idToken, setIdToken] = useState<string | null>(null);
    const isMounted = useRef(true);
    const mapRef = useRef<MapView | null>(null);
    const [listingId, setListingId] = useState<string>('');
    
    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Initialize tokens
    useEffect(() => {
        const initTokens = async () => {
            try {
                const tokens = await getAuthTokens();
                if (tokens?.accessToken && tokens?.idToken && isMounted.current) {
                    setAccessToken(tokens.accessToken);
                    setIdToken(tokens.idToken);
                }
            } catch (error) {
                console.error('Error initializing tokens:', error);
            }
        };
        
        initTokens();
    }, []);

    // Reset map and region when listing changes
    useEffect(() => {
        if (listing?.coordinates) {
            // Set more zoomed out region
            const newRegion = {
                latitude: listing.coordinates.latitude,
                longitude: listing.coordinates.longitude,
                latitudeDelta: 0.02, // Increased zoom out (from 0.01 to 0.02)
                longitudeDelta: 0.02, // Increased zoom out (from 0.01 to 0.02)
            };
            
            setCurrentRegion(newRegion);
            
            // Check if listing has changed
            if (listingId !== listing.listing_id) {
                setListingId(listing.listing_id);
                setFacilities([]); // Reset facilities when listing changes
                
                // Reset map view to initial position if map is ready and ref exists
                if (mapReady && mapRef.current) {
                    mapRef.current.animateToRegion(newRegion, 100);
                }
            }
        }
    }, [listing, listingId]);

    // Fetch facilities when visible and tokens are available
    useEffect(() => {
        if (visible && accessToken && idToken && listing.coordinates) {
            fetchNearbyFacilities();
        }
    }, [visible, accessToken, idToken, listing.coordinates, listingId]);

    // Reset map view when the map becomes ready
    useEffect(() => {
        if (mapReady && mapRef.current && currentRegion) {
            mapRef.current.animateToRegion(currentRegion, 100);
        }
    }, [mapReady, currentRegion]);

    const fetchNearbyFacilities = async () => {
        if (!listing.coordinates || !accessToken || !idToken) {
            return;
        }

        try {
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
            
            // Combine all facility types into one array
            let allFacilities: Facility[] = [];
            
            if (data.response.restaurants) {
                const restaurants = data.response.restaurants.map((place, index) => ({
                    name: place.name,
                    rating: place.rating || null,
                    coordinates: {
                        latitude: place.geometry.location.lat,
                        longitude: place.geometry.location.lng
                    },
                    type: 'restaurant' as const,
                    placeId: `restaurant-${place.place_id}-${index}` // Ensure uniqueness with type prefix and index
                }));
                allFacilities = [...allFacilities, ...restaurants];
            }
            
            if (data.response.bars) {
                const bars = data.response.bars.map((place, index) => ({
                    name: place.name,
                    rating: place.rating || null,
                    coordinates: {
                        latitude: place.geometry.location.lat,
                        longitude: place.geometry.location.lng
                    },
                    type: 'bar' as const,
                    placeId: `bar-${place.place_id}-${index}` // Ensure uniqueness with type prefix and index
                }));
                allFacilities = [...allFacilities, ...bars];
            }
            
            if (data.response.shops) {
                const shops = data.response.shops.map((place, index) => ({
                    name: place.name,
                    rating: place.rating || null,
                    coordinates: {
                        latitude: place.geometry.location.lat,
                        longitude: place.geometry.location.lng
                    },
                    type: 'shop' as const,
                    placeId: `shop-${place.place_id}-${index}` // Ensure uniqueness with type prefix and index
                }));
                allFacilities = [...allFacilities, ...shops];
            }
            
            if (data.response.safety) {
                const safety = data.response.safety.map((place, index) => ({
                    name: place.name,
                    rating: place.rating || null,
                    coordinates: {
                        latitude: place.geometry.location.lat,
                        longitude: place.geometry.location.lng
                    },
                    type: 'safety' as const,
                    placeId: `safety-${place.place_id}-${index}` // Ensure uniqueness with type prefix and index
                }));
                allFacilities = [...allFacilities, ...safety];
            }

            if (isMounted.current) {
                setFacilities(allFacilities);
            }
        } catch (error) {
            console.error('Error fetching nearby facilities:', error);
        }
    };

    if (!visible || !currentRegion) return null;

    // Generate a unique key for MapView to force re-render when listing changes
    const mapKey = `map-${listing.listing_id || 'default'}`;

    return (
        <View style={styles.container}>
            {showHeader && (
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Location</Text>
                </View>
            )}

            <MapView
                key={mapKey}
                ref={mapRef}
                style={styles.map}
                initialRegion={currentRegion}
                onMapReady={() => setMapReady(true)}
                showsUserLocation={false}
                zoomEnabled={true}
                zoomControlEnabled={true}
                scrollEnabled={true}
                rotateEnabled={true}
                pitchEnabled={true}
            >
                {/* Main listing marker */}
                {listing && (
                    <Marker
                        coordinate={{
                            latitude: listing.coordinates.latitude,
                            longitude: listing.coordinates.longitude
                        }}
                        key="main-listing-marker"
                    >
                        <View style={styles.mainMarker}>
                            <Text style={styles.markerText}>
                                ${listing.list_price?.toLocaleString()}
                            </Text>
                        </View>
                    </Marker>
                )}

                {/* Facility markers */}
                {facilities.map((facility) => (
                    <Marker
                        key={facility.placeId}
                        coordinate={facility.coordinates}
                    >
                        <View 
                            style={[
                                styles.facilityMarker,
                                { backgroundColor: PLACE_COLORS[facility.type] }
                            ]}
                        >
                            <MaterialIcons 
                                name={PLACE_ICONS[facility.type]} 
                                size={20} 
                                color="white" 
                            />
                        </View>
                    </Marker>
                ))}
            </MapView>

            {onClose && (
                <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={onClose}
                >
                    <MaterialIcons name="close" size={24} color="black" />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        backgroundColor: 'white',
        borderRadius: 24,
        overflow: 'hidden',
        width: '100%',
        height: 450, // Increased from 300 to 450
    },
    header: {
        padding: 16,
        backgroundColor: 'white',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '500',
        color: '#54B4AF',
    },
    map: {
        width: '100%',
        flex: 1,
    },
    mainMarker: {
        backgroundColor: 'white',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    markerText: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    facilityMarker: {
        padding: 6,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 8,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
});

export default ListingMap;