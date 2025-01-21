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
                    'Authorization': `Bearer eyJraWQiOiIzY200STgwMVpudWRiUkY0b2xyeFF3SU1NbkVsd2FWWHBqbDdMRFc2cHZNPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJhYzZkMjUzOC0zMGYxLTcwYzYtNjBkZi03ZmE4MjcxOThkYTYiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuY2EtY2VudHJhbC0xLmFtYXpvbmF3cy5jb21cL2NhLWNlbnRyYWwtMV82eEV2Q0RuVDYiLCJjbGllbnRfaWQiOiJ1OGthN3JncmRzamdmZmY4dWlvNWRlZzdrIiwib3JpZ2luX2p0aSI6IjVlZjY1M2RhLTdmODQtNDEwZC1hZmIxLTU4MDVjMDg5Y2M0NCIsImV2ZW50X2lkIjoiYTJlZjU2ODYtZDY5YS00ZWIwLTk4OTktNDc4ZTE5Yjc3ZjgzIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTczNzQzNzg2MywiZXhwIjoxNzM3NTI0MjYzLCJpYXQiOjE3Mzc0Mzc4NjMsImp0aSI6ImQzMmI3OTczLWNjMWYtNGQ1ZC1iMDQzLWI3MjBlNzNjOGFlMyIsInVzZXJuYW1lIjoiYWM2ZDI1MzgtMzBmMS03MGM2LTYwZGYtN2ZhODI3MTk4ZGE2In0.EMOmhrpAPgQBxBCO1MxErzb1b-oo4MErb-dBQAcuxnKdP8Y5n8my39PZoGUVl9Yy_aMYQPNbRgNWWDlUnRkp6t77H8A2k9G2GOkCzvVSJTuIsOhJOYO6eFw_jVAjaZAtDweQRcbPBrJmq_6QaRvCHVK92PgaItgIuq6g4AXST1PXHQg5m5SQ44Op1o2c0y9_UxGlCWeaAk3ry_qA-q1t_MelCb_dKRbtpVlgtsuXsZzs4_kR_DF4InXiYlGrjsqYWbF8zIXp0Vwu7hLy0bRPitvXHBzjL91dnVXxfIoYomvS903Udshsjc-B64IH0kvaW-AIa4SnTjz3AEv-vfdPyg`,
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