// @/app/camila/search-results.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity,
    Dimensions,
    Animated,
    StyleSheet,
    BackHandler,
    Platform
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import MapView, { Marker, Region } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import { ListingData } from '@/types/listingData';
import SearchFilters from '@/components/SearchFilters';
import ListingCard, { getFilters } from '@/components/ListingCard';
import NearbyFacilities from '@/components/NearbyFacilities';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MAX_VISIBLE_LISTINGS = 8;
// const GOOGLE_MAPS_API_KEY = 'YOUR_API_KEY';

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

const SearchResults = () => {
    const router = useRouter();
    const { listingsData } = useLocalSearchParams();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [listings, setListings] = useState<ListingData[]>([]);
    const [activeTab, setActiveTab] = useState('Restaurant');
    const [showFilters, setShowFilters] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [mapReady, setMapReady] = useState(false);
    const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
    const [facilities, setFacilities] = useState<any[]>([]);
    const slideAnim = useRef(new Animated.Value(0)).current;
    const mapRef = useRef<MapView>(null);
    const [showListingCard, setShowListingCard] = useState(false);
    const cardSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    const currentListing = listings[currentIndex];
    const visibleListingsCount = Math.min(MAX_VISIBLE_LISTINGS, listings.length);

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (showListingCard) {
                hideListingCard();
                return true;
            }
            if (showMap) {
                toggleMap();
                return true;
            }
            return false;
        });

        return () => backHandler.remove();
    }, [showMap, showListingCard]);

    useEffect(() => {
        if (!listingsData) {
            console.log('No listings data provided');
            return;
        }
    
        try {
            const decodedData = decodeURIComponent(listingsData as string);
            const parsedListings = JSON.parse(decodedData);
            
            if (!Array.isArray(parsedListings)) {
                throw new Error('Parsed listings is not an array');
            }
    
            const validatedListings = parsedListings.map(listing => ({
                listing_id: listing.listing_id || '',
                address: listing.address || '',
                city: listing.City || '',
                architectural_style: Array.isArray(listing.architectural_style) ? listing.architectural_style : [],
                bathrooms_partial: listing.bathrooms_partial || null,
                bathrooms_total: listing.bathrooms_total || 0,
                bedrooms_total: listing.bedrooms_total || 0,
                common_interest: listing.common_interest || '',
                country: listing.country || '',
                coordinates: {
                    latitude: listing.coordinates?.latitude || 0,
                    longitude: listing.coordinates?.longitude || 0
                },
                list_price: listing.list_price || 0,
                parking_features: Array.isArray(listing.parking_features) ? listing.parking_features : [],
                property_type: listing.property_type || 'Unknown',
                photos_count: listing.photos_count || 0,
                media: Array.isArray(listing.media) ? listing.media : []
            }));
    
            setListings(validatedListings);
        } catch (error) {
            console.error('Error parsing listings:', error);
            setListings([]);
        }
    }, [listingsData]);

    const fetchNearbyFacilities = async () => {
        if (!listings[currentIndex]) return;
        const currentListing = listings[currentIndex];
        const facilityTypes = ['restaurant', 'bar', 'store', 'police'];
        const allFacilities: any[] = [];

        for (const type of facilityTypes) {
            const radius = type === 'police' ? 5000 : 1000;
            const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${currentListing.coordinates.latitude},${currentListing.coordinates.longitude}&radius=${radius}&type=${type}&key=${GOOGLE_MAPS_API_KEY}`;

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
                        type: type
                    }));

                    allFacilities.push(...typedFacilities);
                }
            } catch (error) {
                console.error(`Error fetching ${type} facilities:`, error);
            }
        }

        setFacilities(allFacilities);
    };

    const handleMarkerPress = () => {
        if (!showMap) return;
        setShowListingCard(true);
        if (mapRef.current && currentListing) {
            mapRef.current.animateToRegion({
                latitude: currentListing.coordinates.latitude,
                longitude: currentListing.coordinates.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01
            }, 500);
        }
        showListingDetails();
    };

    const toggleMap = () => {
        if (showMap) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
            }).start(() => {
                setShowMap(false);
                setShowListingCard(false);
            });
        } else {
            setShowMap(true);
            Animated.spring(slideAnim, {
                toValue: -SCREEN_HEIGHT + 100,
                useNativeDriver: true,
                damping: 15,
                stiffness: 100
            }).start();
        }
    };

    const handleNextListing = () => {
        if (currentIndex === MAX_VISIBLE_LISTINGS - 1 || currentIndex === listings.length - 1) {
            navigateToViewMore();
        } else {
            setCurrentIndex(prev => prev + 1);
            setCurrentMediaIndex(0);
        }
    };

    const handlePreviousListing = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setCurrentMediaIndex(0);
        }
    };

    const navigateToViewMore = () => {
        router.push({
            pathname: '/camila/view-more',
            params: { listingsData: encodeURIComponent(JSON.stringify(listings)) },
        });
    };

    // Handle back button press
    const handleBackPress = () => {
        if (showMap) {
            toggleMap();
            return;
        }
        router.back();
    };

    useEffect(() => {
        if (showMap && currentListing) {
            const loadFacilities = async () => {
                await fetchNearbyFacilities();
                if (mapRef.current) {
                    const { coordinates } = currentListing;
                    mapRef.current.animateToRegion({
                        latitude: coordinates.latitude,
                        longitude: coordinates.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01
                    }, 500);
                }
            };
            loadFacilities();
        }
    }, [showMap, currentListing]);
    
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
            toValue: SCREEN_HEIGHT,
            useNativeDriver: true,
            damping: 15,
            stiffness: 100
        }).start(() => {
            setShowListingCard(false);
        });
    };

    if (!listings.length) {
        return (
            <View className="flex-1 bg-gray-100 items-center justify-center">
                <Text>Loading listings...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-100">
            <Stack.Screen 
                options={{
                    title: "Search result",
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: '#F8F8F8' },
                    headerLeft: () => (
                        <TouchableOpacity onPress={handleBackPress} className="pl-4">
                            <Text><Feather name="arrow-left" size={24} color="black" /></Text>
                        </TouchableOpacity>
                    ),
                }}
            />

            {/* Map View (positioned behind the content) */}
            <View style={StyleSheet.absoluteFill}>
                <MapView
                    ref={mapRef}
                    style={{ flex: 1 }}
                    initialRegion={currentRegion || undefined}
                    onMapReady={() => setMapReady(true)}
                    showsUserLocation={false}
                >
                    {showMap && currentListing && (
                        <>
                            <Marker
                                coordinate={currentListing.coordinates}
                                onPress={handleMarkerPress}
                            >
                                <TouchableOpacity 
                                    className="bg-white rounded-2xl px-3 py-2 shadow-lg"
                                    onPress={handleMarkerPress}
                                    activeOpacity={0.7}
                                >
                                    <Text className="font-medium text-base">
                                        ${currentListing.list_price?.toLocaleString()}
                                    </Text>
                                </TouchableOpacity>
                            </Marker>
                            {facilities.map((facility, index) => (
                                <Marker
                                    key={`facility-${index}`}
                                    coordinate={facility.coordinates}
                                >
                                    <View style={{
                                        backgroundColor: PLACE_COLORS[facility.type as keyof typeof PLACE_COLORS],
                                        padding: 8,
                                        borderRadius: 20,
                                    }}>
                                        <MaterialIcons 
                                            name={PLACE_ICONS[facility.type as keyof typeof PLACE_ICONS]} 
                                            size={20} 
                                            color="white" 
                                        />
                                    </View>
                                </Marker>
                            ))}
                        </>
                    )}
                </MapView>
            </View>

            {showListingCard && showMap && (
                <Animated.View
                    className="absolute w-full px-4 pb-8"
                    style={[
                        {
                            bottom: 0,
                            transform: [{ translateY: cardSlideAnim }],
                            maxHeight: SCREEN_HEIGHT * 0.7,
                            backgroundColor: 'white',
                            borderTopLeftRadius: 20,
                            borderTopRightRadius: 20,
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
                        listing={currentListing}
                        showActions={true}
                        currentMediaIndex={currentMediaIndex}
                        onMediaIndexChange={setCurrentMediaIndex}
                        onClose={hideListingCard}
                        onFavorite={() => {/* Handle favorite */}}
                    />
                </Animated.View>
            )}

            <Animated.View 
                style={[
                    { 
                        flex: 1, 
                        backgroundColor: '#F8F8F8',
                    }, 
                    { 
                        transform: [{ translateY: slideAnim }] 
                    }
                ]}
            >
                <View className="items-center mb-1">
                    <TouchableOpacity 
                        className="bg-white rounded-full py-1.5 px-5"
                        onPress={() => setShowFilters(true)}
                    >
                        <Text className="text-gray-800 text-sm">View Search Filters</Text>
                    </TouchableOpacity>
                </View>

                <View className="flex-1 px-4">
                    <View className="bg-white rounded-3xl overflow-hidden mb-0 scale-95">
                        <ListingCard
                            listing={currentListing}
                            currentMediaIndex={currentMediaIndex}
                            onMediaIndexChange={setCurrentMediaIndex}
                            onAddressPress={toggleMap}
                        />
                    </View>

                    <View className="bg-white rounded-3xl overflow-hidden mt-1 scale-95">
                        <View className="flex-row justify-around border-b border-gray-100">
                            {['Restaurant', 'Bar', 'Shop', 'Safety'].map((tab) => (
                                <TouchableOpacity 
                                    key={tab}
                                    className={`py-3 px-4 ${activeTab === tab ? 'border-b-2 border-[#8CC7C3]' : ''}`}
                                    onPress={() => setActiveTab(tab as 'Restaurant' | 'Bar' | 'Shop' | 'Safety')}
                                >
                                    <Text className={`${activeTab === tab ? 'text-[#8CC7C3]' : 'text-gray-600'} text-[15px]`}>
                                        {tab}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View className="p-4">
                            <View className="flex-row items-start">
                                <View className="flex-1">
                                    <NearbyFacilities 
                                        listing={currentListing}
                                        activeTab={activeTab as 'Restaurant' | 'Bar' | 'Shop' | 'Safety'}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>

                    <View className="flex-row items-center justify-center my-3 px-8">
                        <TouchableOpacity 
                            className="bg-white p-3 rounded-full mr-2"
                            onPress={() => setShowFilters(true)}
                        >
                            <Feather name="info" size={24} color="black" />
                        </TouchableOpacity>

                        <View className="bg-white rounded-full flex-row items-center py-2 px-8">
                            <TouchableOpacity onPress={handlePreviousListing}>
                                <Feather 
                                    name="chevron-left" 
                                    size={24} 
                                    color={currentIndex === 0 ? "#CCCCCC" : "black"} 
                                />
                            </TouchableOpacity>
                            <Text className="mx-6 font-medium">{currentIndex + 1}/{visibleListingsCount}</Text>
                            <TouchableOpacity onPress={handleNextListing}>
                                <Feather 
                                    name="chevron-right" 
                                    size={24} 
                                    color="black" 
                                />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity className="bg-white p-3 rounded-full ml-2">
                            <Feather name="star" size={24} color="black" />
                        </TouchableOpacity>
                    </View>

                    <View className="items-center mb-4">
                        <TouchableOpacity 
                            className="bg-[#54B4AF] rounded-xl py-2.5 px-6"
                            onPress={navigateToViewMore}
                        >
                            <Text className="text-white text-base font-medium">View more →</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <SearchFilters 
                    visible={showFilters}
                    onDismiss={() => setShowFilters(false)}
                    filters={getFilters()}
                />
            </Animated.View>
        </View>
    );
};

export default SearchResults;