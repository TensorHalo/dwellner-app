// @/components/listings/ListingMap.tsx
import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    Dimensions, 
    Animated, 
    TouchableOpacity,
    Platform
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';
import { ListingData } from '@/types/listingData';
import { getAuthTokens } from '@/utils/authTokens';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;
const MAP_HEIGHT = SCREEN_HEIGHT * 0.5; // Increased height

interface NearbyPlace {
    name: string;
    place_id: string;
    location: {
        lat: number;
        lng: number;
    };
    type: 'restaurant' | 'bar' | 'shop';
}

interface ListingMapProps {
    listing: ListingData;
    visible: boolean;
    onClose: () => void;
}

const ListingMap: React.FC<ListingMapProps> = ({ listing, visible, onClose }) => {
    const [slideAnim] = useState(new Animated.Value(SCREEN_HEIGHT));
    const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
    
    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                damping: 25,
                stiffness: 90
            }).start();
            
            if (listing?.coordinates) {
                fetchNearbyPlaces();
            }
        } else {
            Animated.spring(slideAnim, {
                toValue: SCREEN_HEIGHT,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, listing]);

    const fetchNearbyPlaces = async () => {
        try {
            const tokens = await getAuthTokens();
            if (!tokens?.accessToken || !tokens?.idToken) {
                console.error('No valid tokens for fetching nearby places');
                return;
            }
            
            const { latitude, longitude } = listing.coordinates;
            
            const apiUrl = `https://api.deephome.ca/api/v0/listing/details/nearby/${latitude},${longitude}`;
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokens.accessToken}`,
                    'id-token': tokens.idToken,
                    'Connection': 'keep-alive'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            const places: NearbyPlace[] = [];
            
            // Add restaurants
            if (data.response.restaurants) {
                data.response.restaurants.forEach((place: any) => {
                    places.push({
                        name: place.name,
                        place_id: place.place_id,
                        location: {
                            lat: place.geometry.location.lat,
                            lng: place.geometry.location.lng
                        },
                        type: 'restaurant'
                    });
                });
            }
            
            // Add bars
            if (data.response.bars) {
                data.response.bars.forEach((place: any) => {
                    places.push({
                        name: place.name,
                        place_id: place.place_id,
                        location: {
                            lat: place.geometry.location.lat,
                            lng: place.geometry.location.lng
                        },
                        type: 'bar'
                    });
                });
            }
            
            // Add shops
            if (data.response.shops) {
                data.response.shops.forEach((place: any) => {
                    places.push({
                        name: place.name,
                        place_id: place.place_id,
                        location: {
                            lat: place.geometry.location.lat,
                            lng: place.geometry.location.lng
                        },
                        type: 'shop'
                    });
                });
            }
            
            // Fix for duplicate keys - ensure each marker has a unique key
            const uniquePlaces = places.reduce((acc: NearbyPlace[], current) => {
                const isDuplicate = acc.some(item => item.place_id === current.place_id);
                if (!isDuplicate) {
                    acc.push(current);
                }
                return acc;
            }, []);
            
            setNearbyPlaces(uniquePlaces);
        } catch (error) {
            console.error('Error fetching nearby places:', error);
        }
    };

    const getMarkerColor = (type: string) => {
        switch (type) {
            case 'restaurant':
                return '#FF6B6B';
            case 'bar':
                return '#54B4AF';
            case 'shop':
                return '#7F7FFF';
            default:
                return '#888888';
        }
    };

    return visible ? (
        <Animated.View 
            style={[
                styles.container,
                { transform: [{ translateY: slideAnim }] }
            ]}
        >
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Location</Text>
                <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={onClose}
                >
                    <Feather name="x" size={24} color="black" />
                </TouchableOpacity>
            </View>
            
            {listing?.coordinates && (
                <View style={styles.mapContainer}>
                    <MapView
                        provider={PROVIDER_GOOGLE}
                        style={styles.map}
                        initialRegion={{
                            latitude: listing.coordinates.latitude,
                            longitude: listing.coordinates.longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        }}
                    >
                        {/* Main listing marker */}
                        <Marker
                            key="main-listing"
                            coordinate={{
                                latitude: listing.coordinates.latitude,
                                longitude: listing.coordinates.longitude,
                            }}
                            pinColor="red"
                            title={listing.address}
                        >
                            <View style={styles.mainMarkerContainer}>
                                <View style={styles.mainMarker}>
                                    <Feather name="home" size={18} color="white" />
                                </View>
                                <View style={styles.mainMarkerTriangle} />
                            </View>
                        </Marker>
                        
                        {/* Price bubble */}
                        <Marker
                            key="price-bubble"
                            coordinate={{
                                latitude: listing.coordinates.latitude,
                                longitude: listing.coordinates.longitude,
                            }}
                            anchor={{ x: 0.5, y: 1.5 }}
                        >
                            <View style={styles.priceBubble}>
                                <Text style={styles.priceText}>
                                    ${Math.round(listing.list_price).toLocaleString()}
                                </Text>
                            </View>
                        </Marker>
                        
                        {/* Nearby places markers */}
                        {nearbyPlaces.map((place, index) => (
                            <Marker
                                key={`${place.place_id}-${index}`} // Ensure unique keys
                                coordinate={{
                                    latitude: place.location.lat,
                                    longitude: place.location.lng,
                                }}
                                title={place.name}
                            >
                                <View style={[styles.placeMarker, { backgroundColor: getMarkerColor(place.type) }]}>
                                    <Feather 
                                        name={
                                            place.type === 'restaurant' ? 'utensils' : 
                                            place.type === 'bar' ? 'wine' : 'shopping-bag'
                                        } 
                                        size={16} 
                                        color="white" 
                                    />
                                </View>
                            </Marker>
                        ))}
                    </MapView>
                </View>
            )}
        </Animated.View>
    ) : null;
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
        zIndex: 1000,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EFEFEF',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '500',
        color: '#54B4AF',
    },
    closeButton: {
        padding: 8,
    },
    mapContainer: {
        height: MAP_HEIGHT,
        width: SCREEN_WIDTH,
        overflow: 'hidden',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    mainMarkerContainer: {
        alignItems: 'center',
    },
    mainMarker: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#E73C33',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    mainMarkerTriangle: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderBottomWidth: 0,
        borderTopWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#E73C33',
        marginTop: -1,
    },
    priceBubble: {
        backgroundColor: 'white',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    priceText: {
        fontWeight: 'bold',
        fontSize: 16,
        color: 'black',
    },
    placeMarker: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 3,
    },
    nearbyCountContainer: {
        position: 'absolute',
        bottom: 20,
        alignSelf: 'center',
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    nearbyCountText: {
        fontWeight: '500',
        fontSize: 16,
        color: '#333',
    },
});

export default ListingMap;