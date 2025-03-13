// @/components/ListingDetailGallery.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    Modal, 
    StyleSheet, 
    Dimensions, 
    ScrollView,
    Animated,
    StatusBar,
    Linking
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListingData } from '@/types/listingData';
import { ModelPreference } from '@/types/chatInterface';
import ListingCard from '@/components/ListingCard';
import NearbyFacilitiesGallery from '@/components/NearbyFacilitiesGallery';
import ListingAdditionalInfo from '@/components/listings/ListingAdditionalInfo';
import ListingMap from '@/components/listings/ListingMap';
import ListingAgentInfo from '@/components/listings/ListingAgentInfo';
import LoadingOverlay from '@/components/listings/LoadingOverlay';
import { ListingsApi } from '@/components/listings/ListingsApi';
import { getAuthTokens } from '@/utils/authTokens';
import { getCognitoUserId } from '@/utils/cognitoConfig';
import { isFavorite, toggleFavorite } from '@/utils/favoritesUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ListingDetailGalleryProps {
    visible: boolean;
    onClose: () => void;
    listing: ListingData | null;
    modelPreference: ModelPreference | null;
}

const ListingDetailGallery: React.FC<ListingDetailGalleryProps> = ({ 
    visible, 
    onClose, 
    listing,
    modelPreference
}) => {
    const insets = useSafeAreaInsets();
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [activeTab, setActiveTab] = useState('Restaurant');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [detailedListing, setDetailedListing] = useState<ListingData | null>(null);
    const [isFavorited, setIsFavorited] = useState(false);
    const [cognitoId, setCognitoId] = useState<string | null>(null);
    
    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const scrollViewRef = useRef<ScrollView>(null);
    const contentRef = useRef<View>(null);
    const [contentHeight, setContentHeight] = useState(SCREEN_HEIGHT);
    
    // Fetch full listing details when modal opens
    useEffect(() => {
        if (visible && listing && modelPreference) {
            fetchFullListingDetails();
        }
    }, [visible, listing?.listing_id]);
    
    // Animation effects
    useEffect(() => {
        if (visible) {
            // Reset the scroll position
            if (scrollViewRef.current) {
                scrollViewRef.current.scrollTo({ y: 0, animated: false });
            }
            
            // Start animations
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: SCREEN_HEIGHT,
                    duration: 250,
                    useNativeDriver: true,
                })
            ]).start();
        }
    }, [visible]);

    useEffect(() => {
        const getUserId = async () => {
            try {
                const pendingDataStr = await AsyncStorage.getItem('pendingUserData');
                if (pendingDataStr) {
                    const pendingData = JSON.parse(pendingDataStr);
                    if (pendingData.cognito_id) {
                        setCognitoId(pendingData.cognito_id);
                        // await AsyncStorage.setItem('userId', pendingData.cognito_id);
                        // console.log(pendingData.cognito_id)
                        return;
                    }
                }
            } catch (error) {
                console.error('Error getting cognito ID:', error);
            }
        };
        
        getUserId();
    }, []);

    useEffect(() => {
        const checkFavoriteStatus = async () => {
            if (cognitoId && detailedListing) {
                const favorited = await isFavorite(cognitoId, detailedListing.listing_id);
                setIsFavorited(favorited);
            }
        };
        
        checkFavoriteStatus();
    }, [cognitoId, detailedListing?.listing_id]);

    const handleToggleFavorite = async () => {
        if (!cognitoId || !detailedListing || !modelPreference) return;
        
        setIsFavorited(prev => !prev);
        
        try {
            const newStatus = await toggleFavorite(
                cognitoId,
                detailedListing.listing_id,
                modelPreference
            );
            
            if (newStatus !== isFavorited) {
                setIsFavorited(newStatus);
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
            setIsFavorited(prev => !prev);
        }
    };
    
    const fetchFullListingDetails = async () => {
        if (!listing || !modelPreference) return;
        
        // Check if we already have detailed listing data
        if (detailedListing && detailedListing.listing_id === listing.listing_id) {
            return;
        }
        
        setIsLoading(true);
        // Set initial listing data so we have something to show during loading
        setDetailedListing(listing);
        
        // Simulate progress for better visual effect
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 0.05;
            setLoadingProgress(Math.min(progress, 0.9)); // Cap at 90% until we actually complete
            if (progress >= 0.9) clearInterval(progressInterval);
        }, 100);
        
        try {
            const tokens = await getAuthTokens();
            if (!tokens?.accessToken || !tokens?.idToken) {
                throw new Error('Authentication failed');
            }
            
            const listingsApi = new ListingsApi(tokens.accessToken, tokens.idToken);
            const listingData = await listingsApi.fetchListingDetail(
                listing.listing_id,
                modelPreference
            );
            
            // Set the progress to 100% when done
            setLoadingProgress(1.0);
            clearInterval(progressInterval);
            
            // Update with the detailed data
            setDetailedListing(listingData);
        } catch (error) {
            console.error('Error fetching listing details:', error);
            // If we fail to fetch, the listing was already set above
            clearInterval(progressInterval);
            setLoadingProgress(1.0);
        } finally {
            // Give a small delay before hiding the loading overlay for smoother transition
            setTimeout(() => {
                setIsLoading(false);
            }, 300);
        }
    };
    
    const onContentLayout = (event) => {
        const { height } = event.nativeEvent.layout;
        setContentHeight(height);
    };
    
    // Main card content to render the listing information
    const renderListingContent = () => {
        if (!detailedListing) return null;
        
        return (
            <View className="bg-white rounded-3xl overflow-hidden mb-0 mx-4 mt-4">
                {/* Main Listing Card */}
                <ListingCard
                    listing={detailedListing}
                    currentMediaIndex={currentMediaIndex}
                    onMediaIndexChange={setCurrentMediaIndex}
                />

                {/* Nearby Section */}
                <View className="mt-4 pb-4 border-b border-gray-100">
                    <NearbyFacilitiesGallery 
                        listing={detailedListing}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                    />
                </View>

                {/* Additional Info */}
                <View className="py-4 border-b border-gray-100">
                    <ListingAdditionalInfo listing={detailedListing} />
                </View>

                {/* Location Map */}
                <View className="py-4 border-b border-gray-100">
                    <ListingMap 
                        listing={detailedListing}
                        visible={true}
                        showHeader={true}
                    />
                </View>

                {/* Agent Contact Information */}
                {detailedListing.listAgentKey && (
                    <View className="py-4">
                        <ListingAgentInfo 
                            listAgentKey={detailedListing.listAgentKey}
                        />
                    </View>
                )}
            </View>
        );
    };
    
    if (!listing) return null;
    
    // Calculate header height including safe area insets
    const headerHeight = 56 + (insets.top > 0 ? insets.top : 12);
    
    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <StatusBar barStyle="dark-content" />
            <Animated.View 
                style={[
                    styles.modalContainer,
                    { opacity: fadeAnim }
                ]}
            >
                <Animated.View 
                    style={[
                        styles.contentContainer,
                        { transform: [{ translateY: slideAnim }] }
                    ]}
                >
                    {/* Header */}
                    <View style={[styles.header, { paddingTop: insets.top }]}>
                        <View style={styles.headerContent}>
                            <TouchableOpacity 
                                onPress={onClose}
                                style={styles.backButton}
                            >
                                <Feather name="arrow-left" size={24} color="black" />
                            </TouchableOpacity>
                            
                            <Text style={styles.headerTitle}>Listing Details</Text>
                            
                            <View style={{ width: 24 }} />
                        </View>
                    </View>
                    
                    {/* Content */}
                    <View 
                        ref={contentRef}
                        style={styles.contentArea}
                        onLayout={onContentLayout}
                    >
                        <ScrollView
                            ref={scrollViewRef}
                            style={styles.scrollView}
                            contentContainerStyle={{ paddingBottom: 100 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {renderListingContent()}
                        </ScrollView>
                        
                        {/* Loading Overlay - positioned only over content area */}
                        {isLoading && (
                            <View style={[styles.loadingOverlayContainer]}>
                                <LoadingOverlay 
                                    visible={true} 
                                    progress={loadingProgress}
                                />
                            </View>
                        )}
                    </View>
                    
                    {/* Floating controls */}
                    <View style={styles.floatingControls}>
                        <TouchableOpacity 
                            style={styles.infoButton}
                            onPress={() => {
                                // Open listing URL if available
                                if (detailedListing?.listing_url) {
                                    const url = detailedListing.listing_url.startsWith('http') 
                                        ? detailedListing.listing_url 
                                        : `https://${detailedListing.listing_url}`;
                                    Linking.openURL(url).catch(err => console.error('Error opening URL:', err));
                                }
                            }}
                        >
                            <Feather name="info" size={24} color="white" />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.favoriteButton}
                            onPress={handleToggleFavorite}
                        >
                            <Feather 
                                name={isFavorited ? "heart" : "heart"} 
                                size={24} 
                                color={isFavorited ? "#FF4757" : "black"} 
                            />
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    contentContainer: {
        flex: 1,
        backgroundColor: 'white',
    },
    header: {
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
        zIndex: 10,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    contentArea: {
        flex: 1,
        position: 'relative',
    },
    scrollView: {
        flex: 1,
        backgroundColor: 'white',
    },
    loadingOverlayContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
    },
    floatingControls: {
        position: 'absolute',
        right: 16,
        bottom: 120,
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 100,
    },
    infoButton: {
        backgroundColor: '#54B4AF',
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 6,
    },
    favoriteButton: {
        backgroundColor: 'white',
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 6,
    },
});

export default ListingDetailGallery;