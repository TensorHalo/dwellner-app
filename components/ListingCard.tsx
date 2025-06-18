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
    // Use media URLs directly (they should already be full CDN URLs from MessageHandler/ListingsApi)
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
        mediaItems.forEach((url, index) => {
            if (url) {
                initialStates[url] = { loading: true, error: false };
            }
        });
        setImageStates(initialStates);
        console.log('ListingCard mediaItems:', mediaItems);
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

    const handleImageLoad = (imageUrl: string) => {
        setImageStates(prev => ({
            ...prev,
            [imageUrl]: { ...prev[imageUrl], loading: false, error: false }
        }));
    };

    const handleImageError = (imageUrl: string) => {
        setImageStates(prev => ({
            ...prev,
            [imageUrl]: { ...prev[imageUrl], loading: false, error: true }
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

    // Parse address for display - split into street address and city info
    const parseAddress = () => {
        try {
            // Check if rawData has parsed address info
            if (listing.rawData?.parsedAddress) {
                const addr = listing.rawData.parsedAddress;
                const streetParts = [];
                if (addr.streetNumber) streetParts.push(addr.streetNumber);
                if (addr.streetName) streetParts.push(addr.streetName);
                if (addr.streetSuffix) streetParts.push(addr.streetSuffix);
                if (addr.streetDirection) streetParts.push(addr.streetDirection);
                if (addr.unitNumber) streetParts.push(`Unit ${addr.unitNumber}`);
                
                const streetAddress = streetParts.join(' ');
                const cityInfo = [addr.city, addr.state, addr.zip].filter(Boolean).join(', ');
                
                return {
                    streetAddress: streetAddress || listing.address,
                    cityInfo: cityInfo
                };
            }
        } catch (error) {
            console.warn('Error parsing address:', error);
        }
        
        // Fallback to original address
        return {
            streetAddress: listing.address,
            cityInfo: listing.city || ''
        };
    };

    const renderMediaItem = ({ item, index }: { item: string, index: number }) => {
        const hasError = imageStates[item]?.error;

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
                            source={{ uri: item }}
                            style={styles.mediaImage}
                            resizeMode="cover"
                            onLoad={() => handleImageLoad(item)}
                            onError={() => handleImageError(item)}
                        />
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const renderGalleryItem = ({ item }: { item: string }) => {
        const hasError = imageStates[item]?.error;

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
                        source={{ uri: item }}
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
            </View>
        );
    };

    const { streetAddress, cityInfo } = parseAddress();

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
                        keyExtractor={(item, index) => `card-${item}-${index}`}
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
                        {mediaItems.length > 0 ? `${currentMediaIndex + 1}/${mediaItems.length}` : 'No photos'}
                    </Text>
                </View>

                {showActions && (
                    <View className="absolute top-3 left-3 flex-row">
                        {onClose && (
                            <TouchableOpacity
                                onPress={onClose}
                                className="bg-black/50 p-2 rounded-full mr-2"
                            >
                                <Feather name="x" size={20} color="white" />
                            </TouchableOpacity>
                        )}
                        {onFavorite && (
                            <TouchableOpacity
                                onPress={onFavorite}
                                className="bg-black/50 p-2 rounded-full"
                            >
                                <Feather name="heart" size={20} color="white" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            {/* Listing Info - Keep exactly like original but split address */}
            <View className="p-4">
                {/* Address - split into two lines */}
                <TouchableOpacity onPress={onAddressPress}>
                    <Text className="text-gray-900 text-xl font-semibold mb-1" numberOfLines={2}>
                        {streetAddress}
                    </Text>
                    {cityInfo && (
                        <Text className="text-gray-600 text-m font-semibold mb-3" numberOfLines={1}>
                            {cityInfo}
                        </Text>
                    )}
                </TouchableOpacity>

                {/* Price with rental tag */}
                <View className="flex-row items-start justify-between mb-2">
                    <Text className="text-lg font-bold text-gray-900 flex-1 mr-2">
                        {formatPrice()}{isRental ? ' monthly' : ''}
                    </Text>
                </View>
                
                {/* Property details - keep original format */}
                <Text className="text-gray-600 mb-2">
                    {listing.bedrooms_total || 0} bedrooms · {listing.bathrooms_total || 0} bathrooms · 0 parking
                </Text>
                
                {/* Property type */}
                <Text className="text-gray-600">
                    {listing.property_type}
                </Text>
            </View>

            {/* Full Screen Gallery Modal */}
            <Modal
                visible={galleryVisible}
                transparent={true}
                animationType="none"
                onRequestClose={closeGallery}
            >
                <Animated.View 
                    style={[styles.modalOverlay, { opacity: fadeAnim }]}
                >
                    <Animated.View 
                        style={[styles.modalContent, { transform: [{ scale: scaleAnim }] }]}
                    >
                        <View style={styles.modalHeader}>
                            <TouchableOpacity 
                                onPress={closeGallery}
                                style={styles.closeButton}
                            >
                                <Feather name="x" size={24} color="white" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>
                                {galleryIndex + 1} of {mediaItems.length}
                            </Text>
                        </View>

                        <FlatList
                            ref={galleryFlatListRef}
                            data={mediaItems}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onScroll={handleGalleryScroll}
                            renderItem={renderGalleryItem}
                            keyExtractor={(item, index) => `gallery-${item}-${index}`}
                            initialScrollIndex={galleryIndex}
                            getItemLayout={(data, index) => ({
                                length: SCREEN_WIDTH,
                                offset: SCREEN_WIDTH * index,
                                index,
                            })}
                        />
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
    },
    imageContainer: {
        width: '100%',
        height: '100%',
    },
    mediaImage: {
        width: '100%',
        height: '100%',
    },
    placeholderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        flex: 1,
        width: '100%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
    },
    closeButton: {
        padding: 10,
    },
    modalTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    galleryItemContainer: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT - 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    galleryImage: {
        width: '100%',
        height: '100%',
    },
    galleryPlaceholderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default ListingCard;