// app/navigation/camila/google-map.tsx
import React, { useEffect, useState, useRef } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    Dimensions, 
    Animated,
    StyleSheet,
    StatusBar,
    Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import MapView, { Marker, Region } from 'react-native-maps';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import { ListingData } from '@/types/listingData';
import ListingCard from '@/components/ListingCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    const insets = useSafeAreaInsets();
    const { listingsData } = useLocalSearchParams();
    const [listings, setListings] = useState<ListingData[]>([]);
    const [selectedListing, setSelectedListing] = useState<ListingData | null>(null);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [mapReady, setMapReady] = useState(false);
    const [currentRegion, setCurrentRegion] = useState<Region>(DEFAULT_REGION);
    const slideAnim = useRef(new Animated.Value(CARD_HEIGHT)).current;
    const mapRef = useRef<MapView>(null);

    // Calculate footer height from global var or use a default
    const footerHeight = global.FOOTER_HEIGHT || 80;

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
        <GestureHandlerRootView style={styles.rootContainer}>
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" />
                
                {/* Custom Header */}
                <View style={[
                    styles.header, 
                    { 
                        paddingTop: Platform.OS === 'ios' 
                            ? Math.max(insets.top, 12) 
                            : StatusBar.currentHeight 
                                ? StatusBar.currentHeight + 12 
                                : 24 
                    }
                ]}>
                    <TouchableOpacity 
                        onPress={() => router.back()} 
                        style={styles.backButton}
                    >
                        <Feather name="arrow-left" size={24} color="black" />
                    </TouchableOpacity>
                    
                    <Text style={styles.headerTitle}>Map View</Text>
                    
                    <View style={styles.headerRightPlaceholder} />
                </View>

                <MapView
                    ref={mapRef}
                    style={styles.map}
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
                            <View style={styles.markerContainer}>
                                <Text style={styles.markerText}>
                                    {listing.list_price ? `$${listing.list_price.toLocaleString()}` : '$0'}
                                </Text>
                            </View>
                        </Marker>
                    ))}
                </MapView>

                <View style={styles.listingCountContainer}>
                    <View style={styles.listingCountBadge}>
                        <Text style={styles.listingCountText}>
                            {listings.length} {listings.length === 1 ? 'listing' : 'listings'}
                        </Text>
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
                            style={[
                                styles.cardContainer,
                                {
                                    transform: [{ translateY: slideAnim }],
                                    bottom: footerHeight, // Position directly above the footer with no extra padding
                                }
                            ]}
                        >
                            <View style={styles.cardHandle}>
                                <View style={styles.handleBar} />
                            </View>
                            
                            <View style={styles.customActionContainer}>
                                <TouchableOpacity 
                                    style={styles.actionButton}
                                    onPress={() => {/* Handle favorite */}}
                                >
                                    <Feather name="heart" size={24} color="#FF6B6B" />
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={styles.actionButton}
                                    onPress={hideListingCard}
                                >
                                    <Feather name="x" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>
                            
                            <ListingCard 
                                listing={selectedListing}
                                showActions={false} // We're using our custom actions
                                currentMediaIndex={currentMediaIndex}
                                onMediaIndexChange={setCurrentMediaIndex}
                                // Not using the built-in actions
                                onClose={undefined}
                                onFavorite={undefined}
                                containerStyle={styles.listingCardContainer}
                            />
                        </Animated.View>
                    </PanGestureHandler>
                )}
                
                {/* Removed floating back button */}
            </View>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    rootContainer: {
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: '#F8F8F8',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
    },
    backButton: {
        padding: 8,
        backgroundColor: 'white',
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    headerRightPlaceholder: {
        width: 40,
    },
    map: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    markerContainer: {
        backgroundColor: 'white',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 5,
    },
    markerText: {
        fontWeight: '600',
        fontSize: 16,
    },
    listingCountContainer: {
        position: 'absolute',
        bottom: 120,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    listingCountBadge: {
        backgroundColor: 'white',
        borderRadius: 30,
        paddingVertical: 12,
        paddingHorizontal: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    listingCountText: {
        fontWeight: '600',
        fontSize: 16,
    },
    cardContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        paddingHorizontal: 12,
        maxHeight: CARD_HEIGHT,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        backgroundColor: 'white',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 10,
    },
    cardHandle: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 10,
    },
    handleBar: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#E0E0E0',
    },
    customActionContainer: {
        position: 'absolute',
        bottom: 300,
        left: 10,
        zIndex: 2,
        flexDirection: 'row',
    },
    actionButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 5,
    },
    listingCardContainer: {
        shadowOpacity: 0,
        elevation: 0,
        paddingBottom: 0, // Remove bottom padding to align perfectly with footer
    },
    // Removed floating back button style
});

export default GoogleMapView;