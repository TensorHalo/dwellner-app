// @/components/ListingCard.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    Image, 
    TouchableOpacity, 
    FlatList, 
    Dimensions,
    Linking,
    StyleSheet,
    ActivityIndicator,
    Modal,
    Animated,
    Pressable
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ListingData } from '@/types/listingData';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const MEDIA_HEIGHT = 200;

interface ListingCardProps {
    listing: ListingData;
    containerStyle?: object;
    showActions?: boolean;
    currentMediaIndex: number;
    onMediaIndexChange: (index: number) => void;
    onClose?: () => void;
    onFavorite?: () => void;
    onAddressPress?: () => void;
}

const ListingCard = ({ 
    listing, 
    containerStyle = {}, 
    showActions = false,
    currentMediaIndex = 0,
    onMediaIndexChange,
    onClose,
    onFavorite,
    onAddressPress
}: ListingCardProps) => {
    const mediaItems = listing.media || [];
    const address = listing?.address || 'Address not available';
    const [isRental, setIsRental] = useState<boolean>(false);
    
    // Initialize isRental state
    useEffect(() => {
        let rentalStatus = false;
        
        // First check the explicit isRental flag
        if (listing.isRental !== undefined) {
            rentalStatus = listing.isRental;
        } 
        // Then check the raw API fields if available
        else if (listing.TotalActualRent !== undefined) {
            rentalStatus = listing.TotalActualRent !== null;
        }
        // Finally check property type as fallback
        else if (listing.property_type) {
            const propertyType = listing.property_type.toLowerCase();
            if (propertyType.includes('apartment') || propertyType.includes('condo')) {
                rentalStatus = true;
            }
        }
        
        setIsRental(rentalStatus);
    }, [listing.listing_id, listing.isRental, listing.TotalActualRent]);
    
    // Track loading and error states for each image
    const [imageStates, setImageStates] = useState<{[key: string]: {loading: boolean, error: boolean}}>({});
    
    // State for full-screen gallery modal
    const [galleryVisible, setGalleryVisible] = useState(false);
    const [galleryIndex, setGalleryIndex] = useState(0);
    
    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    
    // Refs
    const galleryFlatListRef = useRef<FlatList>(null);
    const cardFlatListRef = useRef<FlatList>(null);

    // Initialize image states on component mount or when mediaItems change
    useEffect(() => {
        const initialStates: {[key: string]: {loading: boolean, error: boolean}} = {};
        mediaItems.forEach(item => {
            if (item?.MediaURL) {
                initialStates[item.MediaURL] = { loading: true, error: false };
            }
        });
        setImageStates(initialStates);
    }, [JSON.stringify(mediaItems)]);

    // Effect to animate modal entrance and exit
    useEffect(() => {
        if (galleryVisible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 0.9,
                    duration: 200,
                    useNativeDriver: true,
                })
            ]).start();
        }
    }, [galleryVisible, fadeAnim, scaleAnim]);

    // Effect to sync the gallery index with the card index
    useEffect(() => {
        if (galleryVisible && galleryFlatListRef.current) {
            galleryFlatListRef.current.scrollToIndex({
                index: galleryIndex,
                animated: false
            });
        }
    }, [galleryVisible, galleryIndex]);

    const handleMediaScroll = (event: any) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffset / (SCREEN_WIDTH - 32));
        if (onMediaIndexChange && index >= 0 && index < mediaItems.length) {
            onMediaIndexChange(index);
        }
    };

    const handleGalleryScroll = (event: any) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffset / SCREEN_WIDTH);
        if (index >= 0 && index < mediaItems.length) {
            setGalleryIndex(index);
            
            // Sync the card scroll position with gallery
            if (cardFlatListRef.current && !galleryVisible) {
                cardFlatListRef.current.scrollToIndex({
                    index,
                    animated: true
                });
            }
        }
    };

    const handleImageLoad = (mediaURL: string) => {
        setImageStates(prev => ({
            ...prev,
            [mediaURL]: { ...prev[mediaURL], loading: false, error: false }
        }));
    };

    const handleImageError = (mediaURL: string) => {
        setImageStates(prev => ({
            ...prev,
            [mediaURL]: { ...prev[mediaURL], loading: false, error: true }
        }));
    };

    const openGallery = (index: number) => {
        setGalleryIndex(index);
        setGalleryVisible(true);
    };

    const closeGallery = () => {
        setGalleryVisible(false);
    };

    // Format price with appropriate units
    const formatPrice = () => {
        if (!listing.list_price) return 'Price not available';
        return `$${listing.list_price.toLocaleString()} CAD`;
    };

    const RealtorWatermark = () => {
        const handlePress = () => {
            if (!listing?.listing_url) return;
            
            const url = listing.listing_url.startsWith('http') 
                ? listing.listing_url 
                : `https://${listing.listing_url}`;
                
            Linking.openURL(url).catch((err) => {
                console.error('Error opening listing URL:', err);
            });
        };
    
        return (
            <TouchableOpacity 
                onPress={handlePress}
                style={styles.watermarkContainer}
                activeOpacity={0.8}
            >
                <Image
                    source={require('@/assets/powered_by_realtor.png')}
                    style={styles.watermarkImage}
                    resizeMode="contain"
                />
            </TouchableOpacity>
        );
    };

    const renderMediaItem = ({ item, index }: { item: any, index: number }) => {
        if (item.MediaCategory && item.MediaCategory.toLowerCase() !== "property photo") {
            return (
                <View style={styles.mediaContainer}>
                    <TouchableOpacity
                        style={styles.videoContainer}
                        onPress={() => Linking.openURL(item.MediaURL)}
                    >
                        <View className="items-center">
                            <Feather name="play-circle" size={48} color="white" />
                            <Text className="text-white mt-4">Watch Virtual Tour</Text>
                        </View>
                    </TouchableOpacity>
                    <RealtorWatermark />
                </View>
            );
        }

        const isLoading = imageStates[item?.MediaURL]?.loading;
        const hasError = imageStates[item?.MediaURL]?.error;

        return (
            <View style={styles.mediaContainer}>
                {hasError && (
                    <View style={styles.placeholderContainer}>
                        <Feather name="image" size={48} color="#A0A0A0" />
                        <Text className="text-gray-600 mt-4 text-center px-4">
                            Pictures for this listing are not available
                        </Text>
                    </View>
                )}
                
                {!hasError && (
                    <TouchableOpacity 
                        style={styles.imageContainer} 
                        activeOpacity={0.9}
                        onPress={() => openGallery(index)}
                    >
                        <Image
                            source={{ uri: item.MediaURL }}
                            style={styles.mediaImage}
                            resizeMode="contain"
                            onLoad={() => handleImageLoad(item.MediaURL)}
                            onError={() => handleImageError(item.MediaURL)}
                        />
                    </TouchableOpacity>
                )}
                <RealtorWatermark />
            </View>
        );
    };

    const renderGalleryItem = ({ item }: { item: any }) => {
        if (item.MediaCategory && item.MediaCategory.toLowerCase() !== "property photo") {
            return (
                <View style={styles.galleryItemContainer}>
                    <TouchableOpacity
                        style={styles.videoContainer}
                        onPress={() => Linking.openURL(item.MediaURL)}
                    >
                        <View className="items-center">
                            <Feather name="play-circle" size={64} color="white" />
                            <Text className="text-white mt-4 text-lg">Watch Virtual Tour</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            );
        }

        const hasError = imageStates[item?.MediaURL]?.error;

        return (
            <View style={styles.galleryItemContainer}>
                {hasError && (
                    <View style={styles.galleryPlaceholderContainer}>
                        <Feather name="image" size={64} color="white" />
                        <Text className="text-white mt-4 text-center px-4">
                            Image not available
                        </Text>
                    </View>
                )}
                
                {!hasError && (
                    <Image
                        source={{ uri: item.MediaURL }}
                        style={styles.galleryImage}
                        resizeMode="contain"
                    />
                )}
            </View>
        );
    };

    // Render no media placeholder if there are no media items
    const renderNoMediaPlaceholder = () => {
        return (
            <View style={styles.mediaContainer}>
                <View style={styles.placeholderContainer}>
                    <Feather name="camera" size={48} color="#A0A0A0" />
                    <Text className="text-gray-600 mt-4 text-center">
                        No pictures available for this listing
                    </Text>
                </View>
                <RealtorWatermark />
            </View>
        );
    };

    return (
        <View className="bg-white rounded-3xl overflow-hidden mb-4" style={containerStyle}>
            <View className="relative">
                {mediaItems.length > 0 ? (
                    <FlatList
                        ref={cardFlatListRef}
                        data={mediaItems}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={handleMediaScroll}
                        renderItem={renderMediaItem}
                        keyExtractor={(item, index) => `card-${item?.MediaURL || index}-${index}`}
                        snapToInterval={SCREEN_WIDTH - 32}
                        decelerationRate="fast"
                        initialScrollIndex={currentMediaIndex}
                        getItemLayout={(data, index) => ({
                            length: SCREEN_WIDTH - 32,
                            offset: (SCREEN_WIDTH - 32) * index,
                            index,
                        })}
                    />
                ) : (
                    renderNoMediaPlaceholder()
                )}
                
                <View className="absolute top-3 right-4 bg-black/50 px-3 py-1 rounded-full">
                    <Text className="text-white text-sm">
                        {mediaItems.length > 0 ? `${currentMediaIndex + 1}/${mediaItems.length}` : '0/0'}
                    </Text>
                </View>

                {showActions && (
                    <View className="absolute right-4 top-4 flex-row space-x-2">
                        <TouchableOpacity 
                            className="bg-white rounded-full p-2 shadow"
                            onPress={onFavorite}
                        >
                            <Feather name="heart" size={24} color="black" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            className="bg-white rounded-full p-2 shadow"
                            onPress={onClose}
                        >
                            <Feather name="x" size={24} color="black" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <View className="p-4">
                {/* Address section */}
                <Text 
                    numberOfLines={2}
                    className="text-black font-bold text-lg mb-1"
                >
                    {address}
                </Text>
                
                {/* Price section - New layout */}
                <View className="mb-2">
                    <Text style={styles.priceText}>
                        {formatPrice()}
                        {isRental && <Text style={styles.monthlyText}> monthly</Text>}
                    </Text>
                </View>
                
                {/* Amenities section */}
                <View style={styles.amenitiesContainer}>
                    <Text style={styles.amenitiesText}>
                        {listing?.bedrooms_total || 0} bedrooms · {listing?.bathrooms_total || 0} bathrooms · {(listing?.parking_features || []).length} parking
                    </Text>
                </View>
                
                {/* Property type */}
                <Text style={styles.propertyTypeText}>
                    {listing?.property_type || 'Property'}
                </Text>
                
                {/* Square footage - only shown if available */}
                {listing?.lot_size_area && (
                    <Text style={styles.squareFootageText}>
                        {listing.lot_size_area.toLocaleString()} square feet
                    </Text>
                )}

                {/* Tags section */}
                {listing?.tags && listing.tags.length > 0 && (
                    <View className="flex-row flex-wrap gap-2 mt-3">
                        {listing.tags.map((tag, index) => (
                            <View 
                                key={index} 
                                className="bg-gray-100 rounded-full px-3 py-1"
                            >
                                <Text className="text-gray-600">{tag}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>
            
            {/* Full-screen Image Gallery Modal */}
            <Modal
                visible={galleryVisible}
                transparent={true}
                animationType="none"
                onRequestClose={closeGallery}
            >
                <Animated.View 
                    style={[
                        styles.galleryModalContainer, 
                        { 
                            opacity: fadeAnim,
                        }
                    ]}
                >
                    <Pressable 
                        style={styles.galleryBackdrop}
                        onPress={closeGallery}
                    />
                    
                    <Animated.View 
                        style={[
                            styles.galleryContent,
                            {
                                transform: [{ scale: scaleAnim }]
                            }
                        ]}
                    >
                        <FlatList
                            ref={galleryFlatListRef}
                            data={mediaItems}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onScroll={handleGalleryScroll}
                            renderItem={renderGalleryItem}
                            keyExtractor={(item, index) => `gallery-${item?.MediaURL || index}-${index}`}
                            initialScrollIndex={galleryIndex}
                            getItemLayout={(data, index) => ({
                                length: SCREEN_WIDTH,
                                offset: SCREEN_WIDTH * index,
                                index,
                            })}
                        />
                        
                        <View className="absolute top-6 right-6 left-6 flex-row justify-between items-center">
                            <View className="bg-black/50 px-3 py-1 rounded-full">
                                <Text className="text-white text-sm">
                                    {mediaItems.length > 0 ? `${galleryIndex + 1}/${mediaItems.length}` : '0/0'}
                                </Text>
                            </View>
                            
                            <TouchableOpacity 
                                style={styles.closeButton}
                                onPress={closeGallery}
                            >
                                <Feather name="x" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </Animated.View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    mediaContainer: {
        width: SCREEN_WIDTH - 32,
        height: MEDIA_HEIGHT,
        position: 'relative',
        backgroundColor: '#f0f0f0',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    imageContainer: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    mediaImage: {
        width: '100%',
        height: '100%',
    },
    placeholderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        padding: 16,
    },
    videoContainer: {
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    watermarkContainer: {
        position: 'absolute',
        left: 8,
        bottom: 8,
        zIndex: 10,
    },
    watermarkImage: {
        width: 100,
        height: 40,
    },
    // Updated Property details styles
    priceText: {
        fontSize: 18, // Larger font size
        fontWeight: 'bold',
        color: '#000',
    },
    monthlyText: {
        fontWeight: 'normal',
        fontSize: 16,
    },
    propertyTypeText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    amenitiesContainer: {
        marginBottom: 4,
    },
    amenitiesText: {
        fontSize: 14,
        color: '#333',
    },
    squareFootageText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 6,
    },
    // Gallery Modal Styles
    galleryModalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    galleryBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
    },
    galleryContent: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    galleryItemContainer: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    galleryImage: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.8,
    },
    galleryPlaceholderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default ListingCard;