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
                    'Authorization': `Bearer eyJraWQiOiIzY200STgwMVpudWRiUkY0b2xyeFF3SU1NbkVsd2FWWHBqbDdMRFc2cHZNPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJhYzZkMjUzOC0zMGYxLTcwYzYtNjBkZi03ZmE4MjcxOThkYTYiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuY2EtY2VudHJhbC0xLmFtYXpvbmF3cy5jb21cL2NhLWNlbnRyYWwtMV82eEV2Q0RuVDYiLCJjbGllbnRfaWQiOiJ1OGthN3JncmRzamdmZmY4dWlvNWRlZzdrIiwib3JpZ2luX2p0aSI6IjlmNTE5NDdkLTY4ZTUtNDUxYS05NjljLTViYTA4MGIzYmE2ZCIsImV2ZW50X2lkIjoiNTY0YTliZDYtMjNhMi00OWJiLWFiNWYtZGRjMjNmYjdhYjg0IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTczNzcyMzU5NSwiZXhwIjoxNzM3ODA5OTk0LCJpYXQiOjE3Mzc3MjM1OTUsImp0aSI6Ijg2YjFmNGI5LWExYTQtNDQ3My05NWE4LTg0NTM4NjExYzYzNSIsInVzZXJuYW1lIjoiYWM2ZDI1MzgtMzBmMS03MGM2LTYwZGYtN2ZhODI3MTk4ZGE2In0.jTfjM6YoQsWYlTxuuSD20ePQgR7XDaRNYb9k1K70IfcMg8sfqpAr30OZevfWyZujIlg0479lVWSjsXjTTxaVZ7cPaGcJ5GIdqdlgQFFoNUXkU_uR7tIC6KMkKyTQZkOKoTvhRn7wLQFPkWhrPxj3YEyCJVjWYnwfs-J4kGkG-MFEmUu-NjnmRL42ad6e22t9m-LuKr5fNAJ5oUDSogk0v2oapgcmGp1vw9eiNDeiYUam9nVvdhoFRqPtEkiupNakbVjl0OGftXq7yGzWTOiYiIidCzPWAjwf5AdiEmhRjf9xTZXzrA3Ep3oK2eYHCMH5wT-zDwxJ2U_LGTCPUUweLA`,
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