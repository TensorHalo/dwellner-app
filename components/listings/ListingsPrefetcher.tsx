// @/components/listings/ListingsPrefetcher.ts
import { ListingData } from '@/types/listingData';
import { ModelPreference } from '@/types/chatInterface';
import { ListingsApi } from './ListingsApi';
import { getAuthTokens } from '@/utils/authTokens';

class ListingsPrefetcher {
    private static instance: ListingsPrefetcher | null = null;
    private api: ListingsApi | null = null;
    private cachedListings: Map<string, ListingData> = new Map();

    private constructor() {}

    static getInstance(): ListingsPrefetcher {
        if (!this.instance) {
            this.instance = new ListingsPrefetcher();
        }
        return this.instance;
    }

    async initialize(accessToken: string) {
        try {
            const tokens = await getAuthTokens();
            if (!tokens?.accessToken || !tokens?.idToken) {
                throw new Error('Missing required tokens');
            }
            
            this.api = new ListingsApi(tokens.accessToken, tokens.idToken);
            console.log('ListingsPrefetcher initialized with tokens');
        } catch (error) {
            console.error('Error initializing ListingsPrefetcher:', error);
            throw error;
        }
    }

    initializeCache(listings: ListingData[]) {
        this.cachedListings.clear();
        
        listings.forEach(listing => {
            if (listing && listing.listing_id) {
                console.log('Caching listing with ID:', listing.listing_id);
                this.cachedListings.set(listing.listing_id, listing);
            }
        });
        
        console.log('Cache initialized with', this.cachedListings.size, 'listings');
        console.log('Cached IDs:', Array.from(this.cachedListings.keys()));
    }

    getUncachedIds(allIds: string[]): string[] {
        const uncachedIds = allIds.filter(id => !this.cachedListings.has(id));
        console.log('Looking for IDs:', allIds);
        console.log('Currently cached IDs:', Array.from(this.cachedListings.keys()));
        console.log('Need to fetch IDs:', uncachedIds);
        return uncachedIds;
    }

    async fetchMissingListings(
        allIds: string[],
        modelPreference: ModelPreference,
        onProgress?: (current: number, total: number) => void
    ): Promise<ListingData[]> {
        if (!this.api) {
            console.log('API not initialized, attempting to initialize...');
            const tokens = await getAuthTokens();
            if (!tokens?.accessToken || !tokens?.idToken) {
                throw new Error('No valid tokens available');
            }
            this.api = new ListingsApi(tokens.accessToken, tokens.idToken);
        }

        const uncachedIds = this.getUncachedIds(allIds);
        
        if (uncachedIds.length === 0) {
            console.log('No missing listings to fetch');
            return this.getOrderedListings(allIds);
        }

        console.log(`Fetching ${uncachedIds.length} missing listings`);
        let completed = 0;

        for (const id of uncachedIds) {
            try {
                console.log('Fetching listing:', id);
                const listing = await this.api.fetchListingDetail(id, modelPreference);
                
                if (listing) {
                    console.log('Received listing with ID:', listing.listing_id);
                    this.cachedListings.set(listing.listing_id, listing);
                }
                
                completed++;
                onProgress?.(completed, uncachedIds.length);
                
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`Error fetching listing ${id}:`, error);
                // If we get a token error, try to reinitialize the API
                if (error instanceof Error && 
                    (error.message.includes('401') || 
                     error.message.includes('token'))) {
                    const tokens = await getAuthTokens();
                    if (tokens?.accessToken && tokens?.idToken) {
                        this.api = new ListingsApi(tokens.accessToken, tokens.idToken);
                    }
                }
            }
        }

        const finalListings = this.getOrderedListings(allIds);
        console.log('Final listings count:', finalListings.length);
        return finalListings;
    }

    private getOrderedListings(orderedIds: string[]): ListingData[] {
        const results = orderedIds
            .map(id => this.cachedListings.get(id))
            .filter((listing): listing is ListingData => listing !== undefined);
        
        return results;
    }

    clear() {
        this.cachedListings.clear();
    }
}

export default ListingsPrefetcher;