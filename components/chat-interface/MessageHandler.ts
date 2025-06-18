// @/components/chat-interface/MessageHandler.ts
import { ChatMessage, ApiResponse } from '@/types/chatInterface';
import { ListingData } from '@/types/listingData';

export class MessageHandler {
    static processApiResponse(apiResponse: any): {
        textMessages: ChatMessage[];
        listingsMessage?: ChatMessage;
    } {
        // Handle response format from new API
        let response: any;
        
        if (Array.isArray(apiResponse)) {
            response = apiResponse[0];
        } else if (typeof apiResponse === 'object' && apiResponse !== null) {
            response = apiResponse;
        } else {
            throw new Error('Unexpected API response format');
        }
        
        // Extract fields from new API response
        const responseGroup = Date.now();
        const { resp, show_listings_flag, model_preference, listing_ids } = response;
        
        // Cache model_preference as-is
        const preservedModelPreference = model_preference ? { ...model_preference } : null;
        
        // Get first listing from new format
        let firstListing = null;
        let listing = response.listing;
        
        if (listing && Array.isArray(listing) && listing.length > 0) {
            firstListing = listing[0];
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
            modelPreference: preservedModelPreference,
            listingIds: listing_ids
        }));
    
        let listingsMessage: ChatMessage | undefined;
    
        // Process listings if we have data and show_listings_flag is true
        if (show_listings_flag && firstListing) {
            try {
                // Determine if rental based on model preference
                const isRental = preservedModelPreference?.rent_or_purchase?.toLowerCase() === 'rent';
                
                // Parse JSON strings from new API format
                const addressData = this.parseJsonString(firstListing.address);
                const mapData = this.parseJsonString(firstListing.map);
                const detailsData = this.parseJsonString(firstListing.details);
                const condominiumData = this.parseJsonString(firstListing.condominium);
                const taxesData = this.parseJsonString(firstListing.taxes);
                
                // Cache ALL the new data - don't transform, just store everything
                const cachedListing = {
                    // Store all raw data from new API
                    ...firstListing,
                    // Parse JSON fields for easier access
                    parsedAddress: addressData,
                    parsedMap: mapData,
                    parsedDetails: detailsData,
                    parsedCondominium: condominiumData,
                    parsedTaxes: taxesData,
                    // Add computed fields
                    isRental: isRental,
                    responseGroup: responseGroup
                };
                
                // Create minimal listing for display (keeping it simple)
                const listings: ListingData[] = [{
                    // Use new field names directly
                    listing_id: firstListing.mlsNumber || firstListing.id?.toString() || '',
                    address: this.formatAddress(addressData),
                    city: addressData?.city || '',
                    coordinates: {
                        latitude: mapData?.latitude || 0,
                        longitude: mapData?.longitude || 0
                    },
                    list_price: firstListing.listPrice || 0,
                    property_type: detailsData?.propertyType || 'Unknown',
                    photos_count: firstListing.photoCount || 0,
                    bathrooms_total: detailsData?.numBathrooms || 0,
                    bedrooms_total: detailsData?.numBedrooms || 0,
                    
                    // Cache all raw data for later use
                    rawData: cachedListing,
                    
                    // Process images with correct CDN URL
                    media: this.processImages(firstListing.images),
                    
                    // Basic required fields
                    architectural_style: [],
                    bathrooms_partial: detailsData?.numBathroomsPlus || null,
                    common_interest: '',
                    country: addressData?.country || '',
                    parking_features: [],
                    listing_url: '',
                    tags: Array.isArray(firstListing.tags) ? firstListing.tags : [],
                    isRental: isRental
                }];
                
                console.log('Cached listing data:', cachedListing);
    
                listingsMessage = {
                    id: Date.now() + textMessages.length,
                    text: '',
                    sender: 'bot',
                    listings,
                    responseGroup,
                    modelPreference: preservedModelPreference,
                    listingIds: listing_ids
                };
            } catch (error) {
                console.error('Error processing listing data:', error);
            }
        }
    
        return { textMessages, listingsMessage };
    }

    // Helper to safely parse JSON strings
    private static parseJsonString(value: any): any {
        if (!value) return {};
        if (typeof value === 'object') return value;
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch (error) {
                console.warn('Failed to parse JSON string:', value);
                return {};
            }
        }
        return {};
    }

    // Helper to format address
    private static formatAddress(addressData: any): string {
        if (!addressData) return 'Address unavailable';
        
        const parts = [];
        if (addressData.streetNumber) parts.push(addressData.streetNumber);
        if (addressData.streetName) parts.push(addressData.streetName);
        if (addressData.streetSuffix) parts.push(addressData.streetSuffix);
        if (addressData.streetDirection) parts.push(addressData.streetDirection);
        if (addressData.unitNumber) parts.push(`Unit ${addressData.unitNumber}`);
        if (addressData.city) parts.push(addressData.city);
        if (addressData.state) parts.push(addressData.state);
        if (addressData.zip) parts.push(addressData.zip);
        
        return parts.length > 0 ? parts.join(' ') : 'Address unavailable';
    }

    // Helper to process images with CDN URL
    private static processImages(images: any): string[] {
        if (!images) return [];
        
        let imageArray = images;
        
        // Parse JSON string if needed
        if (typeof images === 'string') {
            try {
                imageArray = JSON.parse(images);
            } catch (error) {
                console.warn('Failed to parse images JSON:', images);
                return [];
            }
        }
        
        if (!Array.isArray(imageArray)) return [];
        
        console.log('Processing images in MessageHandler:', imageArray);
        const urls = imageArray.map(filename => `https://cdn.repliers.io/${filename}`);
        console.log('Generated CDN URLs:', urls);
        return urls;
    }
}