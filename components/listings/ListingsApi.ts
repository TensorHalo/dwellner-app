// @/components/listings/ListingsApi.ts
import { ListingData } from "@/types/listingData";
import { ModelPreference } from "@/types/chatInterface";
import { getAuthTokens } from "@/utils/authTokens";

export class ListingsApi {
    private static API_ENDPOINT = 'https://api.dwellner.ca/api/v0/listing_detail';
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
                    'id-token': this.idToken
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
            listing_id: response.ListingKey,
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
            listing_url: response.ListingURL || '',
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