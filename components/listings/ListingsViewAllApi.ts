// @/components/listings/ListingsViewAllApi.ts
import { ListingData } from "@/types/listingData";
import { getAuthTokens } from "@/utils/authTokens";

export class ListingsViewAllApi {
    private static API_ENDPOINT = 'https://api.dwellner.ca/api/v0/view_all';
    private accessToken: string;
    private idToken: string;

    constructor(accessToken: string, idToken: string) {
        this.accessToken = accessToken;
        this.idToken = idToken;
    }

    async fetchAllListings(listingIds: string[]): Promise<ListingData[]> {
        try {
            const response = await fetch(ListingsViewAllApi.API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.accessToken}`,
                    'id-token': this.idToken
                },
                body: JSON.stringify({
                    listing_ids: listingIds
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
                        return this.fetchAllListings(listingIds);
                    }
                }
                
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (!data.response || !Array.isArray(data.response)) {
                throw new Error('Invalid response format');
            }

            return data.response.map((item: any) => this.transformResponseToListingData(item));
        } catch (error) {
            console.error('Error fetching all listings:', error);
            throw error;
        }
    }

    private transformResponseToListingData(response: any): ListingData {
        // Determine if this is a rental or sale listing
        const isRental = response.TotalActualRent !== null && response.TotalActualRent !== undefined;
        
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
            tags: [], // No tags in view_all API response
            isRental: isRental,
            lot_size_area: response.LotSizeArea || null
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