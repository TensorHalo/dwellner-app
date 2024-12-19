import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import ListingCard from './ListingCard';
import { ListingData } from '@/utils/firebase';

interface ListingsMessageProps {
    listings: ListingData[];
}

const ListingsMessage: React.FC<ListingsMessageProps> = ({ listings }) => {
    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.container}>
                {listings.map((listing, index) => (
                    <ListingCard key={`${listing.listing_id}-${index}`} listing={listing} />
                ))}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 4,
        paddingVertical: 8,
    },
});

export default ListingsMessage;