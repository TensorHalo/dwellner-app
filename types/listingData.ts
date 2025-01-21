// @/types/listingData.ts
export interface ListingData {
    listing_id: string;
    address: string;
    city: string;
    architectural_style: string[];
    bathrooms_partial: number | null;
    bathrooms_total: number;
    bedrooms_total: number;
    common_interest: string;
    country: string;
    coordinates: {
        latitude: number;
        longitude: number;
    };
    list_price: number;
    parking_features: string[];
    property_type: string;
    photos_count: number;
    listing_url: string;
    media: Array<{
        MediaKey: string;
        ResourceRecordKey: string;
        LongDescription: string | null;
        MediaURL: string;
        ModificationTimestamp: string;
        Order: number;
        PreferredPhotoYN: boolean;
        ResourceRecordId: string;
        ResourceName: string;
        MediaCategory: string;
    }>;
    tags: string[];
}