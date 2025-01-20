// @/components/listings/ListingsApi.ts
import { ListingData } from "@/types/listingData";
import { ModelPreference } from "@/types/chatInterface";

export class ListingsApi {
    private static API_ENDPOINT = 'https://api.dwellner.ca/api/v0/listing_detail';
    private authToken: string;

    constructor(authToken: string) {
        this.authToken = authToken;
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
                    'Authorization': `Bearer ${this.authToken}`,
                },
                body: JSON.stringify({
                    listing_id: listingId,
                    preferences: JSON.stringify(preferences)
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return this.transformResponseToListingData(data.response);
        } catch (error) {
            console.error('Error fetching listing detail:', error);
            throw error;
        }
    }

    private transformResponseToListingData(response: any): ListingData {
        return {
            listing_id: response.ListingId,
            address: response.UnparsedAddress,
            city: response.City,
            architectural_style: this.parseJsonString(response.ArchitecturalStyle),
            bathrooms_partial: response.BathroomsPartial,
            bathrooms_total: response.BathroomsTotalInteger,
            bedrooms_total: response.BedroomsTotal,
            common_interest: response.CommonInterest || '',
            country: response.Country,
            coordinates: {
                latitude: response.Latitude,
                longitude: response.Longitude
            },
            list_price: response.ListPrice || response.TotalActualRent,
            parking_features: this.parseJsonString(response.ParkingFeatures),
            property_type: this.parseJsonString(response.StructureType)[0] || 'Unknown',
            photos_count: response.PhotosCount || 0,
            media: Array.isArray(response.Media) ? response.Media : [],
            tags: Array.isArray(response.tags) ? response.tags : []
        };
    }

    private parseJsonString(value: string | any[]): any[] {
        if (Array.isArray(value)) return value;
        try {
            return JSON.parse(value);
        } catch {
            return [];
        }
    }
}