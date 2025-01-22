// @/components/listings/ListingMap.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
    View, 
    Text, 
    Animated, 
    Dimensions,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Platform
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { ListingData } from '@/types/listingData';
import ListingCard from '../ListingCard';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.7;
const GOOGLE_MAPS_API_KEY = 'AIzaSyA1cRST4odpAAs30pWs5414iJebTTynDpo';

interface Facility {
    name: string;
    coordinates: {
        latitude: number;
        longitude: number;
    };
    type: 'restaurant' | 'bar' | 'store' | 'police';
}

interface ListingMapProps {
    listing: ListingData;
    visible: boolean;
    onClose: () => void;
}

const FACILITY_TYPES = {
    restaurant: { icon: "restaurant", color: '#FF6B6B' },
    bar: { icon: "local-bar", color: '#4ECDC4' },
    store: { icon: "storefront", color: '#45B7D1' },
    police: { icon: "local-police", color: '#2C3E50' }
} as const;

const ListingMap = ({ listing, visible, onClose }: ListingMapProps) => {
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [loading, setLoading] = useState(true);
    const [showListingCard, setShowListingCard] = useState(false);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const cardSlideAnim = useRef(new Animated.Value(CARD_HEIGHT)).current;
    const mapRef = useRef(null);

    const initialRegion = {
        latitude: listing.coordinates.latitude,
        longitude: listing.coordinates.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
    };

    const fetchNearbyFacilities = useCallback(async () => {
        setLoading(true);
        try {
            const facilityTypes = ['restaurant', 'bar', 'store', 'police'] as const;
            const allFacilities: Facility[] = [];

            for (const type of facilityTypes) {
                const response = await fetch(
                    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
                    `location=${listing.coordinates.latitude},${listing.coordinates.longitude}&` +
                    `radius=${type === 'police' ? 5000 : 1000}&` +
                    `type=${type}&` +
                    `key=${GOOGLE_MAPS_API_KEY}`
                );

                const data = await response.json();
                if (data.status === 'OK' && data.results) {
                    const typeFacilities = data.results.slice(0, 5).map(place => ({
                        name: place.name,
                        coordinates: {
                            latitude: place.geometry.location.lat,
                            longitude: place.geometry.location.lng
                        },
                        type
                    }));
                    allFacilities.push(...typeFacilities);
                }
            }
            setFacilities(allFacilities);
        } catch (error) {
            console.error('Error fetching facilities:', error);
        } finally {
            setLoading(false);
        }
    }, [listing.coordinates]);

    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true
            }).start();
            fetchNearbyFacilities();
        }
    }, [visible, fetchNearbyFacilities]);

    const hideMap = () => {
        hideListingCard();
        Animated.spring(slideAnim, {
            toValue: SCREEN_HEIGHT,
            useNativeDriver: true
        }).start(() => onClose());
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
            toValue: CARD_HEIGHT,
            useNativeDriver: true,
            damping: 15,
            stiffness: 100
        }).start(() => setShowListingCard(false));
    };

    if (!visible) return null;

    return (
        <GestureHandlerRootView style={styles.container}>
            <PanGestureHandler
                onGestureEvent={({ nativeEvent }) => {
                    if (nativeEvent.translationY > 50) {
                        hideMap();
                    }
                }}
            >
                <Animated.View style={[styles.mapContainer, { transform: [{ translateY: slideAnim }] }]}>
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        initialRegion={initialRegion}
                        {...(Platform.OS === 'ios' ? {} : { provider: 'google' })}
                    >
                        {/* Main listing marker */}
                        <Marker
                            coordinate={{
                                latitude: listing.coordinates.latitude,
                                longitude: listing.coordinates.longitude
                            }}
                            onPress={showListingDetails}
                        >
                            <View style={styles.mainMarker}>
                                <Text style={styles.priceText}>
                                    ${listing.list_price?.toLocaleString()}
                                </Text>
                            </View>
                        </Marker>

                        {/* Facility markers */}
                        {facilities.map((facility, index) => (
                            <Marker
                                key={`${facility.type}-${index}`}
                                coordinate={facility.coordinates}
                            >
                                <View style={[
                                    styles.facilityMarker,
                                    { backgroundColor: FACILITY_TYPES[facility.type].color }
                                ]}>
                                    <MaterialIcons
                                        name={FACILITY_TYPES[facility.type].icon}
                                        size={20}
                                        color="white"
                                    />
                                </View>
                            </Marker>
                        ))}
                    </MapView>

                    {loading && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#54B4AF" />
                        </View>
                    )}

                    <TouchableOpacity style={styles.closeButton} onPress={hideMap}>
                        <MaterialIcons name="close" size={24} color="black" />
                    </TouchableOpacity>

                    <View style={styles.facilitiesCountContainer}>
                        <View style={styles.facilitiesCountBadge}>
                            <Text style={styles.facilitiesCountText}>
                                {facilities.length} nearby places
                            </Text>
                        </View>
                    </View>

                    {showListingCard && (
                        <Animated.View style={[styles.listingCardContainer, { transform: [{ translateY: cardSlideAnim }] }]}>
                            <View style={styles.handleContainer}>
                                <View style={styles.handle} />
                            </View>
                            
                            <ListingCard 
                                listing={listing}
                                showActions={true}
                                currentMediaIndex={currentMediaIndex}
                                onMediaIndexChange={setCurrentMediaIndex}
                                onClose={hideListingCard}
                                onFavorite={() => {}}
                            />
                        </Animated.View>
                    )}
                </Animated.View>
            </PanGestureHandler>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        zIndex: 1000,
    },
    mapContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
    },
    map: {
        flex: 1,
    },
    mainMarker: {
        backgroundColor: 'white',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    priceText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'black',
    },
    facilityMarker: {
        padding: 8,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: 'white',
        padding: 8,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    facilitiesCountContainer: {
        position: 'absolute',
        bottom: 32,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    facilitiesCountBadge: {
        backgroundColor: 'white',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    facilitiesCountText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'black',
    },
    listingCardContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 16,
        maxHeight: CARD_HEIGHT,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
    },
});

export default ListingMap;