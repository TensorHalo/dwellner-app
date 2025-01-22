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
                    'Authorization': `Bearer eyJraWQiOiIzY200STgwMVpudWRiUkY0b2xyeFF3SU1NbkVsd2FWWHBqbDdMRFc2cHZNPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJhYzZkMjUzOC0zMGYxLTcwYzYtNjBkZi03ZmE4MjcxOThkYTYiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuY2EtY2VudHJhbC0xLmFtYXpvbmF3cy5jb21cL2NhLWNlbnRyYWwtMV82eEV2Q0RuVDYiLCJjbGllbnRfaWQiOiJ1OGthN3JncmRzamdmZmY4dWlvNWRlZzdrIiwib3JpZ2luX2p0aSI6ImM0NmRmYzk0LTE3ZmYtNDAwMC04NTQ3LTM1MzUxOTgyM2I1ZCIsImV2ZW50X2lkIjoiODQ4ZTc4ZjUtYzA0MS00MWNkLTliZTYtNGFhMGNhMDdmNjE5IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTczNzUyNTE2OSwiZXhwIjoxNzM3NjExNTY5LCJpYXQiOjE3Mzc1MjUxNjksImp0aSI6IjViNDNiMzUxLWNkZDMtNDA5Ni1iNWZhLWFjOGY1YTQ5MzJlYyIsInVzZXJuYW1lIjoiYWM2ZDI1MzgtMzBmMS03MGM2LTYwZGYtN2ZhODI3MTk4ZGE2In0.mz808Mp7ZECL9Lr0p4J8H4IDPfbfHcKqI3PL3-SLreFFmcDVlZhKt5G3F-NocGxQr3FkXm1mpBlyVBaBIT1bpvVuds9_7FPij63MRhsp7OF416XbPpwFo3DqJBuE7gcxEj7wm8IRIM3VzGTG4JKMFQ25wz1xlulkNtti2Mxc4u0BjsG-FZnHvb9Spv5IhptyETujbBeRHD2sNOa_xktOEPj6Dvd9XjQfN6RQ06McBHNi8Bf4WOYk3w4opS1xPV_N9EsKgTQsxbk7NSaOx6Kopp8keNPKxDvmpA_EjR0G9YU21_weBlAzw64Xq36BDs6vbwQDmZtTeaNYfie8YMq1fw`,
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
            tags: Array.isArray(response.tags) ? response.tags : []  // Added tags processing
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