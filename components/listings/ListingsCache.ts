// @/components/listings/ListingsCache.ts
import { ListingData } from "@/types/listingData";
import { ModelPreference } from "@/types/chatInterface";

export class ListingsCache {
    private static instance: ListingsCache;
    private cache: Map<string, ListingData>;
    private currentModelPreference: ModelPreference | null;
    private listingIds: string[];

    private constructor() {
        this.cache = new Map();
        this.currentModelPreference = null;
        this.listingIds = [];
    }

    static getInstance(): ListingsCache {
        if (!ListingsCache.instance) {
            ListingsCache.instance = new ListingsCache();
        }
        return ListingsCache.instance;
    }

    initializeWithFirstListing(
        firstListing: ListingData, 
        listingIds: string[], 
        modelPreference: ModelPreference
    ) {
        this.cache.clear();  // Clear any existing cache
        this.cache.set(firstListing.listing_id, firstListing);
        this.listingIds = listingIds;
        this.currentModelPreference = modelPreference;
    }

    hasListing(listingId: string): boolean {
        return this.cache.has(listingId);
    }

    getListing(listingId: string): ListingData | undefined {
        return this.cache.get(listingId);
    }

    cacheListing(listing: ListingData) {
        this.cache.set(listing.listing_id, listing);
    }

    getModelPreference(): ModelPreference | null {
        return this.currentModelPreference;
    }

    getListingIds(): string[] {
        return this.listingIds;
    }

    getNextUncachedListingId(currentIndex: number): string | null {
        const nextIndex = currentIndex + 1;
        if (nextIndex >= this.listingIds.length) return null;

        const nextListingId = this.listingIds[nextIndex];
        return this.hasListing(nextListingId) ? null : nextListingId;
    }

    getAllCachedListings(): ListingData[] {
        return Array.from(this.cache.values());
    }

    clearCache() {
        this.cache.clear();
        this.currentModelPreference = null;
        this.listingIds = [];
    }
}

export default ListingsCache;