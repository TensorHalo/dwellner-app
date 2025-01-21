// @/components/chat-interface/MessageHandler.ts
import { ChatMessage, ApiResponse } from '@/types/chatInterface';
import { ListingData } from '@/types/listingData';

export class MessageHandler {
    static processApiResponse(apiResponse: any): {
        textMessages: ChatMessage[];
        listingsMessage?: ChatMessage;
    } {
        const response = Array.isArray(apiResponse) ? apiResponse[0] : apiResponse;
        
        const responseGroup = Date.now();
        const { resp, show_listings_flag, model_preference, listing_ids, listing } = response;
        
        const textParts = resp.includes('\n\n') 
            ? resp.split('\n\n').filter(part => part.trim() !== '')
            : [resp];
        
        const textMessages: ChatMessage[] = textParts.map((text, i) => ({
            id: Date.now() + i,
            text: text.trim(),
            sender: 'bot',
            responseGroup,
            isTyping: false,
            displayedText: '',
            modelPreference: model_preference,
            listingIds: listing_ids
        }));

        let listingsMessage: ChatMessage | undefined;

        if (show_listings_flag && Array.isArray(listing) && listing[0]) {
            const firstListing = listing[0];
            const listings: ListingData[] = [{
                listing_id: firstListing.ListingId,
                address: firstListing.UnparsedAddress,
                city: firstListing.City,
                architectural_style: this.parseJsonArray(firstListing.ArchitecturalStyle),
                bathrooms_partial: firstListing.BathroomsPartial,
                bathrooms_total: firstListing.BathroomsTotalInteger,
                bedrooms_total: firstListing.BedroomsTotal,
                common_interest: firstListing.CommonInterest || '',
                country: firstListing.Country,
                coordinates: {
                    latitude: firstListing.Latitude,
                    longitude: firstListing.Longitude
                },
                list_price: firstListing.ListPrice || firstListing.TotalActualRent,
                parking_features: this.parseJsonArray(firstListing.ParkingFeatures),
                property_type: this.parseStructureType(firstListing.StructureType),
                photos_count: firstListing.PhotosCount || 0,
                listing_url: firstListing.ListingURL || '',
                media: Array.isArray(firstListing.Media) ? firstListing.Media :
                    typeof firstListing.Media === 'string' ? JSON.parse(firstListing.Media) : [],
                tags: Array.isArray(firstListing.tags) ? firstListing.tags : []  // Added tags processing
            }];

            listingsMessage = {
                id: Date.now() + textMessages.length,
                text: '',
                sender: 'bot',
                listings,
                responseGroup,
                modelPreference: model_preference,
                listingIds: listing_ids
            };
        }

        return { textMessages, listingsMessage };
    }

    private static parseJsonArray(value: any): string[] {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }
        return [];
    }

    private static parseStructureType(value: any): string {
        if (Array.isArray(value)) return value[0] || 'Unknown';
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed[0] : 'Unknown';
            } catch {
                return 'Unknown';
            }
        }
        return 'Unknown';
    }
}