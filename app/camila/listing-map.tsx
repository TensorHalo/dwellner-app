// @/app/camila/listing-map.tsx
import React, { useEffect, useState, useRef } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity,
    Dimensions,
    Animated 
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import MapView, { Marker, Region } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import { ListingData } from '@/utils/firebase';
import ListingCard from '@/components/ListingCard';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.7;
const SLIDE_UP_THRESHOLD = 50;

interface Facility {
    name: string;
    rating: number | null;
    distance: number;
    coordinates: {
        latitude: number;
        longitude: number;
    };
    type: 'restaurant' | 'bar' | 'store' | 'police';
}

const PLACE_ICONS = {
    restaurant: 'restaurant',
    bar: 'local-bar',
    store: 'store',
    police: 'local-police'
};

const PLACE_COLORS = {
    restaurant: '#FF6B6B',
    bar: '#4ECDC4',
    store: '#45B7D1',
    police: '#2C3E50'
};

const ListingMapView = () => {
    const router = useRouter();
    const { listingData, returnPath } = useLocalSearchParams();
    const [listing, setListing] = useState<ListingData | null>(null);
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [mapReady, setMapReady] = useState(false);
    const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [showCard, setShowCard] = useState(false);
    const slideAnim = useRef(new Animated.Value(CARD_HEIGHT)).current;

    useEffect(() => {
        if (!listingData) return;
        
        try {
            const decodedData = decodeURIComponent(listingData as string);
            const parsedListing = JSON.parse(decodedData);
            setListing(parsedListing);

            if (parsedListing.coordinates) {
                setCurrentRegion({
                    latitude: parsedListing.coordinates.latitude,
                    longitude: parsedListing.coordinates.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                });
            }

            // Fetch nearby facilities
            fetchNearbyFacilities(parsedListing);
        } catch (error) {
            console.error('Error parsing listing data:', error);
        }
    }, [listingData]);

    const fetchNearbyFacilities = async (listingData: ListingData) => {
        const GOOGLE_MAPS_API_KEY = 'AIzaSyA1cRST4odpAAs30pWs5414iJebTTynDpo';
        const facilityTypes = ['restaurant', 'bar', 'store', 'police'];
        const allFacilities: Facility[] = [];

        for (const type of facilityTypes) {
            const radius = type === 'police' ? 5000 : 1000;
            const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${listingData.coordinates.latitude},${listingData.coordinates.longitude}&radius=${radius}&type=${type}&key=${GOOGLE_MAPS_API_KEY}`;

            try {
                const response = await fetch(url);
                const data = await response.json();

                if (data.status === 'OK' && data.results) {
                    const typedFacilities = data.results.slice(0, 4).map((place: any) => ({
                        name: place.name,
                        rating: place.rating || null,
                        distance: 0,
                        coordinates: {
                            latitude: place.geometry.location.lat,
                            longitude: place.geometry.location.lng
                        },
                        type: type as 'restaurant' | 'bar' | 'store' | 'police'
                    }));

                    allFacilities.push(...typedFacilities);
                }
            } catch (error) {
                console.error(`Error fetching ${type} facilities:`, error);
            }
        }

        setFacilities(allFacilities);
    };

    const showListingCard = () => {
        setShowCard(true);
        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            damping: 15,
            stiffness: 100
        }).start();
    };

    const hideListingCard = () => {
        Animated.spring(slideAnim, {
            toValue: CARD_HEIGHT,
            useNativeDriver: true,
            damping: 15,
            stiffness: 100
        }).start(() => {
            setShowCard(false);
        });
    };

    const handleGesture = (event: any) => {
        const { translationY } = event.nativeEvent;
        
        if (translationY > SLIDE_UP_THRESHOLD) {
            hideListingCard();
        }
        
        if (event.nativeEvent.state === 1) { // Started
            setIsDragging(true);
        } else if (event.nativeEvent.state === 5) { // Ended
            setIsDragging(false);
        }
    };

    const handleMapPress = () => {
        if (!isDragging) {
            showListingCard();
        }
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View className="flex-1">
                <Stack.Screen 
                    options={{
                        title: listing?.address || "Location Details",
                        headerShadowVisible: false,
                        headerStyle: { backgroundColor: '#F8F8F8' },
                        headerLeft: () => (
                            <TouchableOpacity 
                                onPress={() => {
                                    if (returnPath) {
                                        router.push(returnPath as string);
                                    } else {
                                        router.back();
                                    }
                                }} 
                                className="pl-4"
                            >
                                <Feather name="arrow-left" size={24} color="black" />
                            </TouchableOpacity>
                        ),
                    }}
                />

                {currentRegion && (
                    <MapView
                        style={{ flex: 1 }}
                        initialRegion={currentRegion}
                        onMapReady={() => setMapReady(true)}
                        showsUserLocation={false}
                        onPress={handleMapPress}
                    >
                        {/* Main listing marker */}
                        {listing && (
                            <Marker
                                coordinate={{
                                    latitude: listing.coordinates.latitude,
                                    longitude: listing.coordinates.longitude
                                }}
                                onPress={showListingCard}
                            >
                                <View className="bg-white rounded-2xl px-3 py-2 shadow-lg">
                                    <Text className="font-medium text-base">
                                        ${listing.list_price?.toLocaleString()}
                                    </Text>
                                </View>
                            </Marker>
                        )}

                        {/* Facility markers */}
                        {facilities.map((facility, index) => (
                            <Marker
                                key={`${facility.type}-${index}`}
                                coordinate={facility.coordinates}
                            >
                                <View 
                                    style={{ 
                                        backgroundColor: PLACE_COLORS[facility.type],
                                        padding: 8,
                                        borderRadius: 20,
                                    }}
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
                )}

                <View className="absolute bottom-12 left-0 right-0 flex-row justify-center">
                    <View className="bg-white rounded-full py-3 px-8 shadow-xl">
                        <Text className="font-semibold text-base">
                            {facilities.length} nearby places
                        </Text>
                    </View>
                </View>

                {listing && (
                    <PanGestureHandler onGestureEvent={handleGesture}>
                        <Animated.View
                            className="absolute w-full px-4 pb-8"
                            style={[
                                {
                                    bottom: 0,
                                    transform: [{ translateY: slideAnim }],
                                    maxHeight: CARD_HEIGHT,
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
                                listing={listing}
                                showActions={true}
                                currentMediaIndex={currentMediaIndex}
                                onMediaIndexChange={setCurrentMediaIndex}
                                onClose={hideListingCard}
                                onFavorite={() => {/* Handle favorite */}}
                            />
                        </Animated.View>
                    </PanGestureHandler>
                )}
            </View>
        </GestureHandlerRootView>
    );
};

export default ListingMapView;