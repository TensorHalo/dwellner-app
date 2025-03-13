// @/components/chat-interface/MessageHandler.ts
import { ChatMessage, ApiResponse } from '@/types/chatInterface';
import { ListingData } from '@/types/listingData';

export class MessageHandler {
    static processApiResponse(apiResponse: any): {
        textMessages: ChatMessage[];
        listingsMessage?: ChatMessage;
    } {
        // Handle different response formats
        let response: any;
        
        if (Array.isArray(apiResponse)) {
            response = apiResponse[0];
        } else if (typeof apiResponse === 'object' && apiResponse !== null) {
            response = apiResponse;
        } else {
            throw new Error('Unexpected API response format');
        }
        
        // Extract fields
        const responseGroup = Date.now();
        const { resp, show_listings_flag, model_preference, listing_ids } = response;
        
        // Ensure model_preference retains all original fields from API
        const preservedModelPreference = model_preference ? { ...model_preference } : null;
        
        // Detect and handle different formats of the listing field
        let firstListing = null;
        let listing = response.listing;
        
        if (listing) {
            if (Array.isArray(listing)) {
                if (listing.length > 0) {
                    firstListing = listing[0];
                }
            } else if (typeof listing === 'object' && listing !== null) {
                firstListing = listing;
            }
        }
        
        // Process text messages
        const textParts = resp && resp.includes('\n\n') 
            ? resp.split('\n\n').filter((part: string) => part.trim() !== '')
            : [resp];
        
        const textMessages: ChatMessage[] = textParts.map((text: string, i: number) => ({
            id: Date.now() + i,
            text: text?.trim() || '',
            sender: 'bot',
            responseGroup,
            isTyping: false,
            displayedText: '',
            // Use the preserved model preference with all fields intact
            modelPreference: preservedModelPreference,
            listingIds: listing_ids
        }));
    
        let listingsMessage: ChatMessage | undefined;
    
        // Process listings only if we have the data and show_listings_flag is true
        if (show_listings_flag && firstListing) {
            try {
                // Create formatted listing data
                const listings: ListingData[] = [{
                    listing_id: firstListing.ListingKey,
                    address: firstListing.UnparsedAddress || 'Address unavailable',
                    city: firstListing.City || '',
                    architectural_style: this.parseJsonArray(firstListing.ArchitecturalStyle),
                    bathrooms_partial: firstListing.BathroomsPartial,
                    bathrooms_total: firstListing.BathroomsTotalInteger,
                    bedrooms_total: firstListing.BedroomsTotal,
                    common_interest: firstListing.CommonInterest || '',
                    country: firstListing.Country || '',
                    coordinates: {
                        latitude: firstListing.Latitude || 0,
                        longitude: firstListing.Longitude || 0
                    },
                    list_price: firstListing.ListPrice || firstListing.TotalActualRent || 0,
                    parking_features: this.parseJsonArray(firstListing.ParkingFeatures),
                    property_type: this.parseStructureType(firstListing.StructureType),
                    photos_count: firstListing.PhotosCount || 0,
                    listing_url: firstListing.ListingURL || '',
                    media: Array.isArray(firstListing.Media) ? firstListing.Media :
                        typeof firstListing.Media === 'string' ? JSON.parse(firstListing.Media) : [],
                    tags: Array.isArray(firstListing.tags) ? firstListing.tags : [],
                    
                    // Add all additional fields with explicit null fallbacks
                    originalEntryTimestamp: firstListing.OriginalEntryTimestamp || null,
                    modificationTimestamp: firstListing.ModificationTimestamp || null,
                    publicRemarks: firstListing.PublicRemarks || null,
                    heating: this.parseJsonArray(firstListing.Heating),
                    basement: this.parseJsonArray(firstListing.Basement),
                    structureType: this.parseJsonArray(firstListing.StructureType),
                    bedroomsBelowGrade: firstListing.BedroomsBelowGrade || null,
                    bedroomsAboveGrade: firstListing.BedroomsAboveGrade || null,
                    bathroomsPartial: firstListing.BathroomsPartial || null,
                    subType: firstListing.PropertySubType || null,
                    yearBuilt: firstListing.YearBuilt || null,
                    listAgentKey: firstListing.ListAgentKey || null
                }];
    
                listingsMessage = {
                    id: Date.now() + textMessages.length,
                    text: '',
                    sender: 'bot',
                    listings,
                    responseGroup,
                    // Use the preserved model preference with all fields intact
                    modelPreference: preservedModelPreference,
                    listingIds: listing_ids
                };
            } catch (error) {
                console.error('Error processing listing data:', error);
            }
        }
    
        return { textMessages, listingsMessage };
    }

    private static parseJsonArray(value: any): string[] {
        if (!value) return [];
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
        if (!value) return 'Unknown';
        if (Array.isArray(value)) return value[0] || 'Unknown';
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed[0] : 'Unknown';
            } catch {
                return value || 'Unknown';
            }
        }
        return 'Unknown';
    }
}