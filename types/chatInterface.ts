// @/types/chatInterface.ts
import { ListingData } from '@/types/listingData';

export interface ModelPreference {
    bedrooms: number;
    bedrooms_condition: string;
    bathrooms: number;
    location: string;
    rent_or_purchase: string;
    budget_min: number;
    budget_max: number;
    property_type: string;
    related: string;
    [key: string]: any;
}

export interface ChatMessage {
    id: number;
    text: string;
    sender: 'user' | 'bot';
    listings?: ListingData[];
    responseGroup?: number;
    isTyping?: boolean;
    displayedText?: string;
    modelPreference?: ModelPreference;
    listingIds?: string[];
    isLoading?: boolean;
}

export interface ApiResponse {
    response: Array<{
        resp: string;
        listing: any[];
        listing_ids: string[];
        show_listings_flag: boolean;
        model_preference: ModelPreference;
    }>;
}