// @/types/listingData.ts
export interface ListingData {
    // Basic identification
    listing_id: string;
    
    // Address and location
    address: string;
    city: string;
    country: string;
    coordinates: {
        latitude: number;
        longitude: number;
    };
    
    // Basic property info
    list_price: number;
    property_type: string;
    bathrooms_total: number;
    bedrooms_total: number;
    bathrooms_partial: number | null;
    photos_count: number;
    
    // Media URLs (full CDN URLs)
    media: string[]; // Array of full image URLs from CDN
    
    // Required legacy fields (minimal)
    architectural_style: string[];
    common_interest: string;
    parking_features: string[];
    listing_url: string;
    tags: string[];
    isRental?: boolean;
    
    // Cache ALL raw data from new API for future use
    rawData?: any; // Stores complete API response data for future access
}