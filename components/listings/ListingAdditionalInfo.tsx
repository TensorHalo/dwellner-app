// @/components/listings/ListingAdditionalInfo.tsx
import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Modal,
    ScrollView,
    Pressable
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ListingData } from '@/types/listingData';
import { useRouter } from 'expo-router';

interface InfoTooltipProps {
    title: string;
    description: string;
    visible: boolean;
    onClose: () => void;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ 
    title, 
    description, 
    visible, 
    onClose 
}) => {
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable 
                style={styles.tooltipBackdrop}
                onPress={onClose}
            >
                <View style={styles.tooltipContainer}>
                    <View style={styles.tooltipContent}>
                        <Text style={styles.tooltipTitle}>{title}</Text>
                        <Text style={styles.tooltipDescription}>{description}</Text>
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
};

interface AboutSpaceModalProps {
    publicRemarks: string;
    visible: boolean;
    onClose: () => void;
}

const AboutSpaceModal: React.FC<AboutSpaceModalProps> = ({
    publicRemarks,
    visible,
    onClose
}) => {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={styles.aboutSpaceContainer}>
                <View style={styles.aboutSpaceHeader}>
                    <TouchableOpacity onPress={onClose} style={styles.backButton}>
                        <Feather name="chevron-left" size={24} color="black" />
                    </TouchableOpacity>
                    <Text style={styles.aboutSpaceTitle}>About this space</Text>
                    <View style={{ width: 24 }} />
                </View>
                
                <ScrollView style={styles.aboutSpaceContent}>
                    <Text style={styles.aboutSpaceText}>
                        {publicRemarks}
                    </Text>
                </ScrollView>
            </View>
        </Modal>
    );
};

interface ListingAdditionalInfoProps {
    listing: ListingData;
}

const ListingAdditionalInfo: React.FC<ListingAdditionalInfoProps> = ({ listing }) => {
    const router = useRouter();
    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
    const [showAboutSpace, setShowAboutSpace] = useState(false);
    
    // Function to format relative time
    const formatRelativeTime = (timestamp: string | undefined): string => {
        if (!timestamp) return 'Not available';
        
        const now = new Date();
        const time = new Date(timestamp);
        const diffInMs = now.getTime() - time.getTime();
        
        // Convert to seconds, minutes, hours, days, months, years
        const diffInSeconds = Math.floor(diffInMs / 1000);
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);
        const diffInMonths = Math.floor(diffInDays / 30);
        const diffInYears = Math.floor(diffInMonths / 12);
        
        if (diffInYears > 0) {
            return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
        } else if (diffInMonths > 0) {
            return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
        } else if (diffInDays > 0) {
            return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
        } else if (diffInHours > 0) {
            return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
        } else if (diffInMinutes > 0) {
            return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
        } else {
            return 'Just now';
        }
    };
    
    const getTooltipContent = (field: string): { title: string, description: string } => {
        switch (field) {
            case 'bedroomsBelowGrade':
                return {
                    title: 'Bedrooms Below Grade',
                    description: 'Bedrooms that are partially or fully below ground level, typically in a basement.'
                };
            case 'bedroomsAboveGrade':
                return {
                    title: 'Bedrooms Above Grade',
                    description: 'Bedrooms that are located on or above the main ground level of a building.'
                };
            case 'bathroomsPartial':
                return {
                    title: 'Bathrooms Partial',
                    description: 'Bathrooms that are partially equipped, typically including only a toilet and a sink, are considered partial bathrooms.'
                };
            default:
                return { title: '', description: '' };
        }
    };
    
    const showTooltip = (field: string) => {
        setActiveTooltip(field);
    };
    
    const hideTooltip = () => {
        setActiveTooltip(null);
    };
    
    // Function to get first 20 words
    const truncateToWords = (text: string | undefined, wordCount: number = 20): string => {
        if (!text) return 'No description available.';
        
        const words = text.split(' ');
        if (words.length <= wordCount) return text;
        
        return words.slice(0, wordCount).join(' ') + '...';
    };
    
    const addedTimeAgo = formatRelativeTime(listing.originalEntryTimestamp);
    const updatedTimeAgo = formatRelativeTime(listing.modificationTimestamp);
    const truncatedRemarks = truncateToWords(listing.publicRemarks, 20);
    const needsMoreButton = listing.publicRemarks && listing.publicRemarks.split(' ').length > 20;

    return (
        <View style={styles.container}>
            {/* Timestamps Section */}
            <View style={styles.section}>
                <View style={styles.timeRow}>
                    <View style={styles.timeItem}>
                        <Text style={styles.timeLabel}>Added:</Text>
                        <Text style={styles.timeValue}>{addedTimeAgo}</Text>
                    </View>
                    
                    <View style={styles.timeItem}>
                        <Text style={styles.timeLabel}>Updated:</Text>
                        <Text style={styles.timeValue}>{updatedTimeAgo}</Text>
                    </View>
                </View>
            </View>
            
            <View style={styles.separator} />
            
            {/* Details Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Details</Text>
                <Text style={styles.lastUpdated}>Modified {updatedTimeAgo}</Text>
                
                {/* Details Rows */}
                <View style={styles.detailsTable}>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Added</Text>
                        <Text style={styles.detailValue}>{addedTimeAgo}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Heating</Text>
                        <Text style={styles.detailValue}>
                            {listing.heating && listing.heating.length > 0 
                                ? listing.heating.join(', ') 
                                : 'Not provided'}
                        </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Basement</Text>
                        <Text style={styles.detailValue}>
                            {listing.basement && listing.basement.length > 0 
                                ? listing.basement.join(', ') 
                                : 'Not provided'}
                        </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Architectural Style</Text>
                        <Text style={styles.detailValue}>
                            {listing.architectural_style && listing.architectural_style.length > 0 
                                ? listing.architectural_style.join(', ') 
                                : 'Not provided'}
                        </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Structure Type</Text>
                        <Text style={styles.detailValue}>
                            {listing.structureType && listing.structureType.length > 0 
                                ? listing.structureType.join(', ') 
                                : 'Not provided'}
                        </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                        <View style={styles.labelWithIcon}>
                            <Text style={styles.detailLabel}>Bedrooms Below Grade</Text>
                            <TouchableOpacity 
                                onPress={() => showTooltip('bedroomsBelowGrade')}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Feather name="info" size={16} color="#999" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.detailValue}>
                            {listing.bedroomsBelowGrade !== undefined && listing.bedroomsBelowGrade !== null 
                                ? listing.bedroomsBelowGrade 
                                : 'Not provided'}
                        </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                        <View style={styles.labelWithIcon}>
                            <Text style={styles.detailLabel}>Bedrooms Above Grade</Text>
                            <TouchableOpacity 
                                onPress={() => showTooltip('bedroomsAboveGrade')}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Feather name="info" size={16} color="#999" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.detailValue}>
                            {listing.bedroomsAboveGrade !== undefined && listing.bedroomsAboveGrade !== null 
                                ? listing.bedroomsAboveGrade 
                                : 'Not provided'}
                        </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                        <View style={styles.labelWithIcon}>
                            <Text style={styles.detailLabel}>Bathrooms Partial</Text>
                            <TouchableOpacity 
                                onPress={() => showTooltip('bathroomsPartial')}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Feather name="info" size={16} color="#999" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.detailValue}>
                            {listing.bathroomsPartial !== undefined && listing.bathroomsPartial !== null 
                                ? listing.bathroomsPartial 
                                : 'Not provided'}
                        </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Sub-type</Text>
                        <Text style={styles.detailValue}>
                            {listing.subType || 'Not provided'}
                        </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Year Built</Text>
                        <Text style={styles.detailValue}>
                            {listing.yearBuilt || 'Not provided'}
                        </Text>
                    </View>
                </View>
            </View>
            
            <View style={styles.separator} />
            
            {/* Description Section */}
            <View style={styles.section}>
                {listing.publicRemarks ? (
                    <View>
                        <Text style={styles.descriptionText}>
                            {truncatedRemarks}
                            {needsMoreButton && (
                                <Text onPress={() => setShowAboutSpace(true)} style={styles.aboutButtonInline}>
                                    {" "}About this space <Feather name="chevron-right" size={12} color="#333" />
                                </Text>
                            )}
                        </Text>
                    </View>
                ) : (
                    <Text style={styles.noDescriptionText}>No description available.</Text>
                )}
            </View>

            {/* Info Tooltips */}
            {activeTooltip && (
                <InfoTooltip
                    title={getTooltipContent(activeTooltip).title}
                    description={getTooltipContent(activeTooltip).description}
                    visible={!!activeTooltip}
                    onClose={hideTooltip}
                />
            )}
            
            {/* About Space Modal */}
            <AboutSpaceModal
                publicRemarks={listing.publicRemarks || 'No description available.'}
                visible={showAboutSpace}
                onClose={() => setShowAboutSpace(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 16,
    },
    section: {
        padding: 16,
    },
    separator: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginHorizontal: 16,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    timeItem: {
        flex: 1,
    },
    timeLabel: {
        fontSize: 16,
        color: '#666',
        marginBottom: 4,
    },
    timeValue: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '500',
        color: '#54B4AF',
        marginBottom: 4,
    },
    lastUpdated: {
        fontSize: 14,
        color: '#999',
        marginBottom: 16,
    },
    detailsTable: {
        width: '100%',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
    labelWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailLabel: {
        fontSize: 16,
        color: '#666',
    },
    detailValue: {
        fontSize: 16,
        color: '#333',
        textAlign: 'right',
        flex: 1,
        marginLeft: 8,
    },
    descriptionText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#333',
    },
    noDescriptionText: {
        fontSize: 16,
        color: '#666',
        fontStyle: 'italic',
    },
    aboutButtonInline: {
        color: '#333',
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
    tooltipBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tooltipContainer: {
        width: '80%',
        backgroundColor: '#333',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    tooltipContent: {
        alignItems: 'center',
    },
    tooltipTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    tooltipDescription: {
        color: 'white',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    aboutSpaceContainer: {
        flex: 1,
        backgroundColor: 'white',
    },
    aboutSpaceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    backButton: {
        padding: 8,
    },
    aboutSpaceTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    aboutSpaceContent: {
        flex: 1,
        padding: 16,
    },
    aboutSpaceText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#333',
    },
});

export default ListingAdditionalInfo;