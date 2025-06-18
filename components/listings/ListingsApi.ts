// @/components/listings/ListingsApi.ts
import { ListingData } from "@/types/listingData";
import { ModelPreference } from "@/types/chatInterface";
import { getAuthTokens } from "@/utils/authTokens";

export class ListingsApi {
    private static API_ENDPOINT = 'https://api.deephome.ca/api/v0/listing_detail';
    private accessToken: string;
    private idToken: string;

    constructor(accessToken: string, idToken: string) {
        this.accessToken = accessToken;
        this.idToken = idToken;
    }

    async fetchListingDetail(
        listingId: string, 
        preferences: ModelPreference
    ): Promise<ListingData> {
        try {
            const response = await fetch(ListingsApi.API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`,
                    'id-token': this.idToken,
                    'Connection': 'keep-alive'
                },
                body: JSON.stringify({
                    listing_id: listingId,
                    preferences: JSON.stringify(preferences)
                })
            });

            if (!response.ok) {
                const responseText = await response.text();
                console.error('API error response:', responseText);
                
                if (response.status === 401 || responseText.includes('token is required')) {
                    const tokens = await getAuthTokens();
                    if (tokens?.accessToken && tokens?.idToken) {
                        this.accessToken = tokens.accessToken;
                        this.idToken = tokens.idToken;
                        return this.fetchListingDetail(listingId, preferences);
                    }
                }
                
                throw new Error(`HTTP error! status: ${response.status}, message: ${responseText}`);
            }

            const apiResponse = await response.json();
            console.log('Raw listing detail API response:', JSON.stringify(apiResponse, null, 2));

            // Handle the new response format where data is wrapped in "response" object
            let listingData = apiResponse.response || apiResponse;

            if (!listingData) {
                throw new Error('No listing data found in response');
            }

            // Cache and transform the new API response
            return this.cacheAndTransformListing(listingData, preferences);

        } catch (error) {
            console.error('Error fetching listing detail:', error);
            throw error;
        }
    }

    private cacheAndTransformListing(listing: any, preferences: ModelPreference): ListingData {
        try {
            // Determine if rental based on preferences
            const isRental = preferences?.rent_or_purchase?.toLowerCase() === 'rent';

            // Parse JSON fields from new API format
            const addressData = this.parseJsonString(listing.address);
            const mapData = this.parseJsonString(listing.map);
            const detailsData = this.parseJsonString(listing.details);
            const condominiumData = this.parseJsonString(listing.condominium);
            const taxesData = this.parseJsonString(listing.taxes);
            const timestampsData = this.parseJsonString(listing.timestamps);

            // Cache ALL the raw data
            const cachedData = {
                ...listing,
                // Parse JSON fields for easier access
                parsedAddress: addressData,
                parsedMap: mapData,
                parsedDetails: detailsData,
                parsedCondominium: condominiumData,
                parsedTaxes: taxesData,
                parsedTimestamps: timestampsData,
                // Add computed fields
                isRental: isRental,
                fetchedAt: new Date().toISOString()
            };

            // Transform to ListingData format (keeping it minimal)
            const transformedListing: ListingData = {
                // Basic identification
                listing_id: listing.mlsNumber || listing.id?.toString() || '',
                
                // Address info
                address: this.formatAddress(addressData),
                city: addressData?.city || '',
                country: addressData?.country || '',
                
                // Location
                coordinates: {
                    latitude: mapData?.latitude || 0,
                    longitude: mapData?.longitude || 0
                },
                
                // Basic property info
                list_price: listing.listPrice || 0,
                property_type: detailsData?.propertyType || 'Unknown',
                bathrooms_total: detailsData?.numBathrooms || 0,
                bedrooms_total: detailsData?.numBedrooms || 0,
                bathrooms_partial: detailsData?.numBathroomsPlus || null,
                photos_count: listing.photoCount || 0,
                
                // Cache all raw data for future use
                rawData: cachedData,
                
                // Process images with correct CDN URL
                media: this.processImages(listing.images),
                
                // Required fields (minimal defaults)
                architectural_style: [],
                common_interest: '',
                parking_features: [],
                listing_url: '',
                tags: Array.isArray(listing.tags) ? listing.tags : [],
                isRental: isRental
            };

            console.log('Cached and transformed listing:', transformedListing);
            return transformedListing;

        } catch (error) {
            console.error('Error caching and transforming listing:', error);
            throw new Error(`Failed to process listing data: ${error}`);
        }
    }

    // Helper to safely parse JSON strings
    private parseJsonString(value: any): any {
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
    private formatAddress(addressData: any): string {
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
    private processImages(images: any): string[] {
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
        
        console.log('Processing images in ListingsApi:', imageArray);
        const urls = imageArray.map(filename => `https://cdn.repliers.io/${filename}`);
        console.log('Generated CDN URLs:', urls);
        return urls;
    }
}