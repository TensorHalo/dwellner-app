// @/components/SimpleAgentContact.tsx
import React, { useState } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    StyleSheet,
    Alert
} from 'react-native';
import { ListingData } from '@/types/listingData';

interface SimpleAgentContactProps {
    listing: ListingData;
}

const SimpleAgentContact: React.FC<SimpleAgentContactProps> = ({ listing }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState('');

    // Get brokerage name from rawData if available
    const getBrokerageName = () => {
        try {
            if (listing.rawData?.parsedOffice?.brokerageName) {
                return listing.rawData.parsedOffice.brokerageName;
            }
            if (listing.rawData?.office) {
                const officeData = typeof listing.rawData.office === 'string' 
                    ? JSON.parse(listing.rawData.office) 
                    : listing.rawData.office;
                return officeData?.brokerageName || 'Real Estate Brokerage';
            }
        } catch (error) {
            console.warn('Error getting brokerage name:', error);
        }
        return 'Real Estate Brokerage';
    };

    const handleContactAgent = () => {
        // For now, just show placeholder alert since no real API call
        Alert.alert(
            'Contact Request', 
            'This would send your message to the listing agent. Email destination: placeholder@agent.com',
            [{ text: 'OK' }]
        );
        
        // Clear form
        setName('');
        setEmail('');
        setPhone('');
        setMessage('');
    };

    const brokerageName = getBrokerageName();

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={styles.brokerageTitle}>{brokerageName}</Text>
            </View>
            
            <View style={styles.formContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Name"
                    placeholderTextColor="#999"
                    value={name}
                    onChangeText={setName}
                />
                
                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                
                <TextInput
                    style={styles.input}
                    placeholder="Phone"
                    placeholderTextColor="#999"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                />
                
                <TextInput
                    style={[styles.input, styles.messageInput]}
                    placeholder="Message"
                    placeholderTextColor="#999"
                    value={message}
                    onChangeText={setMessage}
                    multiline={true}
                    numberOfLines={4}
                    textAlignVertical="top"
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
        borderRadius: 16,
        margin: 16,
        paddingVertical: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    headerContainer: {
        alignItems: 'center',
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
        marginHorizontal: 20,
        marginBottom: 20,
    },
    brokerageTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
    },
    formContainer: {
        paddingHorizontal: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        backgroundColor: '#FAFAFA',
        marginBottom: 16,
        color: '#333',
    },
    messageInput: {
        height: 100,
        paddingTop: 12,
    },
    contactButton: {
        backgroundColor: '#8CD0CB',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    contactButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default SimpleAgentContact;