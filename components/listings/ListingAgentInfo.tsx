// @/components/listings/ListingAgentInfo.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Linking,
    ActivityIndicator
} from 'react-native';
import { getAuthTokens } from '@/utils/authTokens';
import { AgentData } from '@/types/agentData';
import { Feather } from '@expo/vector-icons';

interface ListingAgentInfoProps {
    listAgentKey: string | null;
}

const ListingAgentInfo: React.FC<ListingAgentInfoProps> = ({ listAgentKey }) => {
    const [agentData, setAgentData] = useState<AgentData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    useEffect(() => {
        if (listAgentKey) {
            fetchAgentData(listAgentKey);
        } else {
            setIsLoading(false);
            setError('No agent information available');
        }
    }, [listAgentKey]);

    const fetchAgentData = async (agentKey: string) => {
        try {
            setIsLoading(true);
            setError(null);

            const tokens = await getAuthTokens();
            if (!tokens?.accessToken || !tokens?.idToken) {
                throw new Error('Authentication tokens not available');
            }

            const apiUrl = `https://api.dwellner.ca/api/v0/crea/lead-details/${agentKey}`;
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokens.accessToken}`,
                    'id-token': tokens.idToken
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const responseData = data.response;

            if (!responseData) {
                throw new Error('No agent data received');
            }

            // Find the agent photo URL
            let photoUrl = null;
            if (responseData.Media && responseData.Media.length > 0) {
                const photo = responseData.Media.find((m: any) => 
                    m.MediaCategory === 'Member Photo' && m.PreferredPhotoYN === true
                );
                if (photo) {
                    photoUrl = photo.MediaURL;
                } else if (responseData.Media[0].MediaURL) {
                    photoUrl = responseData.Media[0].MediaURL;
                }
            }

            // Find website URL
            let websiteUrl = null;
            if (responseData.MemberSocialMedia && responseData.MemberSocialMedia.length > 0) {
                const website = responseData.MemberSocialMedia.find((m: any) => 
                    m.SocialMediaType === 'Website'
                );
                if (website) {
                    websiteUrl = website.SocialMediaUrlOrId;
                }
            }

            // Format social media data
            const socialMedia = responseData.MemberSocialMedia ? 
                responseData.MemberSocialMedia.map((item: any) => ({
                    socialMediaType: item.SocialMediaType,
                    socialMediaUrlOrId: item.SocialMediaUrlOrId
                })) : [];

            // Parse agent data
            const agent: AgentData = {
                memberKey: responseData.MemberKey,
                firstName: responseData.MemberFirstName,
                lastName: responseData.MemberLastName,
                nickname: responseData.MemberNickname,
                jobTitle: responseData.JobTitle,
                agencyName: responseData.OfficeName,
                officeKey: responseData.OfficeKey,
                officePhone: responseData.MemberOfficePhone,
                officePhoneExt: responseData.MemberOfficePhoneExt,
                cellPhone: responseData.MemberPager, // Using pager field for cell phone as per API response
                fax: responseData.MemberFax,
                email: responseData.MemberEmailYN,
                address1: responseData.MemberAddress1,
                address2: responseData.MemberAddress2,
                city: responseData.MemberCity,
                stateOrProvince: responseData.MemberStateOrProvince,
                postalCode: responseData.MemberPostalCode,
                country: responseData.MemberCountry,
                photoUrl: photoUrl,
                websiteUrl: websiteUrl,
                socialMedia: socialMedia
            };

            setAgentData(agent);
            setIsLoading(false);
        } catch (error) {
            console.error('Error fetching agent data:', error);
            setError('Failed to load agent information');
            setIsLoading(false);
        }
    };

    const handleContactAgent = () => {
        // This would be implemented in the future
        console.log('Contact agent with:', { name, email, phone });
        // Reset form
        setName('');
        setEmail('');
        setPhone('');
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#54B4AF" />
                <Text style={styles.loadingText}>Loading agent information...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
            </View>
        );
    }

    if (!agentData) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>No agent information available</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Contact</Text>
            </View>

            <View style={styles.agentInfoContainer}>
                {agentData.photoUrl ? (
                    <Image
                        source={{ uri: agentData.photoUrl }}
                        style={styles.agentPhoto}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={styles.placeholderPhoto}>
                        <Feather name="user" size={60} color="#CCCCCC" />
                    </View>
                )}

                <Text style={styles.agentName}>
                    {agentData.firstName} {agentData.lastName}
                </Text>

                {agentData.officeKey && (
                    <TouchableOpacity>
                        <Text style={styles.agencyName}>
                            {agentData.agencyName || "Keller Williams Select Realty"}
                        </Text>
                    </TouchableOpacity>
                )}

                {agentData.officePhone && (
                    <TouchableOpacity 
                        onPress={() => Linking.openURL(`tel:${agentData.officePhone}`)}
                        style={styles.phoneContainer}
                    >
                        <Text style={styles.phoneNumber}>
                            {agentData.officePhone}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.divider} />

            <View style={styles.formContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Name*"
                    value={name}
                    onChangeText={setName}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Email*"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Phone*"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                />

                <TouchableOpacity
                    style={styles.contactButton}
                    onPress={handleContactAgent}
                >
                    <Text style={styles.contactButtonText}>Contact Agent</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderRadius: 24,
        overflow: 'hidden',
        width: '100%',
    },
    loadingContainer: {
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        borderRadius: 24,
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
        fontSize: 16,
    },
    errorContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        borderRadius: 24,
    },
    errorText: {
        color: '#FF6B6B',
        fontSize: 16,
    },
    header: {
        padding: 16,
        backgroundColor: 'white',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '500',
        color: '#54B4AF',
    },
    agentInfoContainer: {
        alignItems: 'center',
        padding: 20,
    },
    agentPhoto: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 16,
    },
    placeholderPhoto: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    agentName: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    agencyName: {
        fontSize: 18,
        color: '#000',
        textAlign: 'center',
        textDecorationLine: 'underline',
        marginBottom: 8,
    },
    phoneContainer: {
        marginVertical: 8,
    },
    phoneNumber: {
        fontSize: 18,
        color: '#000',
        textAlign: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E5E5',
        marginHorizontal: 20,
        marginVertical: 10,
    },
    formContainer: {
        padding: 20,
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: 25,
        marginBottom: 16,
        paddingHorizontal: 20,
        fontSize: 16,
    },
    contactButton: {
        backgroundColor: '#54B4AF',
        borderRadius: 25,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    contactButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    }
});

export default ListingAgentInfo;