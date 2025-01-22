import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Image, Animated } from 'react-native';
import { ListingData } from '@/types/listingData';
import MaskedView from '@react-native-masked-view/masked-view';

const GOOGLE_MAPS_API_KEY = 'AIzaSyA1cRST4odpAAs30pWs5414iJebTTynDpo';

interface Facility {
    name: string;
    rating: number | null;
    distance: number;
    photoUrl: string | null;
    placeId: string;
}

interface NearbyFacilitiesProps {
    listing: ListingData;
    activeTab: 'Restaurant' | 'Bar' | 'Shop' | 'Safety';
}

interface FacilityItemProps {
    facility: Facility;
    activeTab: string;
}

const PLACE_TYPES = {
    Restaurant: 'restaurant',
    Bar: 'bar',
    Shop: 'store',
    Safety: 'police'
};

const formatDistance = (meters: number): string => {
    return (meters / 1000).toFixed(1) + 'km';
};

const Skeleton = ({ width, height, style }) => {
    const animatedValue = new Animated.Value(0);

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const opacity = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    backgroundColor: '#E1E9EE',
                    opacity,
                    borderRadius: 4,
                },
                style,
            ]}
        />
    );
};

const LoadingFacilities = () => {
    return (
        <View className="flex-row">
            <View className="w-[140px] h-[120px] rounded-lg bg-gray-100 items-center justify-center">
                <ActivityIndicator size="large" color="#54B4AF" />
            </View>
            
            <View className="flex-1 ml-4 justify-between h-[120px]">
                {[1, 2, 3, 4].map((index) => (
                    <View key={index} className="flex-row justify-between items-center py-1">
                        <Skeleton width={150} height={20} style={{ marginRight: 8 }} />
                        <Skeleton width={40} height={20} />
                    </View>
                ))}
            </View>
        </View>
    );
};

const FacilityItem = ({ facility, activeTab }: FacilityItemProps) => {
    const metricValue = activeTab === 'Safety' 
        ? formatDistance(facility.distance)
        : facility.rating?.toFixed(1) || 'N/A';
    
    return (
        <View className="flex-row justify-between items-center py-1">
            <Text 
                numberOfLines={2} 
                ellipsizeMode="tail"
                className="text-black text-[15px] flex-1 pr-2"
            >
                {facility.name}
            </Text>
            <Text className="text-[15px] min-w-[45px] text-right">
                {metricValue}
            </Text>
        </View>
    );
};

const NearbyFacilities = ({ listing, activeTab }: NearbyFacilitiesProps) => {
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedFacilityPhoto, setSelectedFacilityPhoto] = useState<string | null>(null);
    const [photoLoading, setPhotoLoading] = useState(true);

    const getPhotoUrl = async (photoReference: string): Promise<string | null> => {
        try {
            const maxWidth = 400;
            return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_MAPS_API_KEY}`;
        } catch (err) {
            console.error('Error getting photo URL:', err);
            return null;
        }
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c * 1000;
    };

    const fetchNearbyPlaces = async () => {
        if (!listing.coordinates) {
            setError('No coordinates available');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const { latitude, longitude } = listing.coordinates;
            const placeType = PLACE_TYPES[activeTab];
            const radius = activeTab === 'Safety' ? 5000 : 1000;
            
            const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=${placeType}&key=${GOOGLE_MAPS_API_KEY}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.status === 'OK' && data.results && data.results.length > 0) {
                const nearbyFacilities = await Promise.all(
                    data.results.map(async (place: any) => ({
                        name: place.name,
                        rating: place.rating || null,
                        distance: calculateDistance(
                            latitude,
                            longitude,
                            place.geometry.location.lat,
                            place.geometry.location.lng
                        ),
                        photoUrl: place.photos?.[0] ? 
                            await getPhotoUrl(place.photos[0].photo_reference) : 
                            null,
                        placeId: place.place_id
                    }))
                );

                const sortedFacilities = activeTab === 'Safety' 
                    ? nearbyFacilities.sort((a, b) => a.distance - b.distance)
                    : nearbyFacilities.sort((a, b) => {
                        if (a.rating && b.rating) return b.rating - a.rating;
                        if (!a.rating && !b.rating) return a.distance - b.distance;
                        return a.rating ? -1 : 1;
                    });

                setFacilities(sortedFacilities.slice(0, 4));
                setSelectedFacilityPhoto(sortedFacilities[0]?.photoUrl || null);
            } else {
                setError(`No ${activeTab.toLowerCase()} facilities found nearby`);
                setSelectedFacilityPhoto(null);
            }
        } catch (err) {
            console.error('Error in fetchNearbyPlaces:', err);
            setError('Error fetching nearby places');
            setSelectedFacilityPhoto(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        setPhotoLoading(true);
        setError(null);
        fetchNearbyPlaces();
    }, [listing.coordinates, activeTab]);

    if (loading) {
        return <LoadingFacilities />;
    }

    if (error) {
        return (
            <View className="h-[120px] justify-center">
                <Text className="text-gray-500 text-center text-sm">{error}</Text>
            </View>
        );
    }

    return (
        <View className="flex-row">
            <View className="w-[140px] h-[120px] rounded-lg overflow-hidden">
                {selectedFacilityPhoto ? (
                    <>
                        <Image 
                            source={{ uri: selectedFacilityPhoto }}
                            className="w-full h-full"
                            resizeMode="cover"
                            onLoadStart={() => setPhotoLoading(true)}
                            onLoad={() => setPhotoLoading(false)}
                        />
                        {photoLoading && (
                            <View className="absolute w-full h-full items-center justify-center bg-gray-100">
                                <ActivityIndicator size="large" color="#54B4AF" />
                            </View>
                        )}
                    </>
                ) : (
                    <View className="w-full h-full items-center justify-center bg-gray-100">
                        <ActivityIndicator size="large" color="#54B4AF" />
                    </View>
                )}
            </View>
            
            <View className="flex-1 ml-4">
                <View className="justify-between h-[120px]">
                    {facilities.map((facility) => (
                        <FacilityItem
                            key={facility.placeId}
                            facility={facility}
                            activeTab={activeTab}
                        />
                    ))}
                </View>
            </View>
        </View>
    );
};

export default NearbyFacilities;