// app/camila/google-map.tsx
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
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import { ListingData } from '@/utils/firebase';
import ListingCard, { getFilters } from '@/components/ListingCard';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.7;

const DEFAULT_REGION = {
    latitude: 43.6629,
    longitude: -79.3957,
    latitudeDelta: 0.0122,
    longitudeDelta: 0.0121,
};

const GoogleMapView = () => {
    const router = useRouter();
    const { listingsData } = useLocalSearchParams();
    const [listings, setListings] = useState<ListingData[]>([]);
    const [selectedListing, setSelectedListing] = useState<ListingData | null>(null);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [mapReady, setMapReady] = useState(false);
    const [currentRegion, setCurrentRegion] = useState<Region>(DEFAULT_REGION);
    const slideAnim = useRef(new Animated.Value(CARD_HEIGHT)).current;
    const mapRef = useRef<MapView>(null);

    useEffect(() => {
        if (!listingsData) return;
        try {
            const decodedData = decodeURIComponent(listingsData as string);
            const parsedListings = JSON.parse(decodedData);
            setListings(parsedListings);

            if (parsedListings.length > 0 && parsedListings[0].coordinates) {
                const newRegion = {
                    latitude: parsedListings[0].coordinates.latitude,
                    longitude: parsedListings[0].coordinates.longitude,
                    latitudeDelta: 0.0122,
                    longitudeDelta: 0.0121,
                };
                setCurrentRegion(newRegion);
                
                if (mapReady && mapRef.current) {
                    mapRef.current.animateToRegion(newRegion, 1000);
                }
            }
        } catch (error) {
            console.error('Error parsing listings:', error);
        }
    }, [listingsData, mapReady]);

    const showListingCard = (listing: ListingData) => {
        setCurrentMediaIndex(0); // Reset media index when showing new listing
        setSelectedListing(listing);
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
            setSelectedListing(null);
            setCurrentMediaIndex(0);
        });
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View className="flex-1">
                <Stack.Screen 
                    options={{
                        title: "Map View",
                        headerShadowVisible: false,
                        headerStyle: { backgroundColor: '#F8F8F8' },
                        headerLeft: () => (
                            <TouchableOpacity 
                                onPress={() => router.back()} 
                                className="pl-4"
                            >
                                <Feather name="arrow-left" size={24} color="black" />
                            </TouchableOpacity>
                        ),
                    }}
                />

                <MapView
                    ref={mapRef}
                    style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                    initialRegion={currentRegion}
                    region={currentRegion}
                    onMapReady={() => setMapReady(true)}
                    showsUserLocation={false}
                    onPress={hideListingCard}
                >
                    {listings.map((listing) => (
                        <Marker
                            key={listing.listing_id}
                            coordinate={{
                                latitude: listing.coordinates.latitude,
                                longitude: listing.coordinates.longitude
                            }}
                            onPress={(e) => {
                                e.stopPropagation();
                                showListingCard(listing);
                            }}
                        >
                            <View className="bg-white rounded-2xl px-3 py-2 shadow-lg">
                                <Text className="font-medium text-base">
                                    ${listing.list_price?.toLocaleString()}
                                </Text>
                            </View>
                        </Marker>
                    ))}
                </MapView>

                <View className="absolute bottom-12 left-0 right-0 flex-row justify-center">
                    <View className="bg-white rounded-full py-3 px-8 shadow-xl">
                        <Text className="font-semibold text-base">{listings.length} listings</Text>
                    </View>
                </View>

                {selectedListing && (
                    <PanGestureHandler
                        onGestureEvent={({ nativeEvent }) => {
                            if (nativeEvent.translationY > 50) {
                                hideListingCard();
                            }
                        }}
                    >
                        <Animated.View
                            className="absolute w-full px-4 pb-8"
                            style={[
                                {
                                    bottom: 0,
                                    transform: [{ translateY: slideAnim }],
                                    maxHeight: CARD_HEIGHT,
                                }
                            ]}
                        >
                            <ListingCard 
                                listing={selectedListing}
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

export default GoogleMapView;