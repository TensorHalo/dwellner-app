// @/components/listings/ListingsCache.ts
import { ListingData } from "@/types/listingData";
import { ModelPreference } from "@/types/chatInterface";

export class ListingsCache {
    private static instance: ListingsCache | null = null;
    private cachedListings: Map<string, ListingData>;
    private listingIds: string[];
    private modelPreference: ModelPreference | null;

    private constructor() {
        this.cachedListings = new Map();
        this.listingIds = [];
        this.modelPreference = null;
    }

    static getInstance(): ListingsCache {
        if (!ListingsCache.instance) {
            ListingsCache.instance = new ListingsCache();
        }
        return ListingsCache.instance;
    }

    initializeWithFirstListing(firstListing: ListingData, allListingIds: string[], preference: ModelPreference) {
        this.clearCache();
        this.listingIds = allListingIds;
        this.modelPreference = preference;
        // Use ListingKey for caching
        const listingKey = firstListing.listing_id.replace('C', '');
        this.cachedListings.set(listingKey, firstListing);
        console.log('Initialized cache with listing:', listingKey);
    }

    cacheListing(listing: ListingData) {
        if (!listing?.listing_id) return;
        // Convert ListingId to ListingKey format
        const listingKey = listing.listing_id.replace('C', '');
        this.cachedListings.set(listingKey, listing);
        console.log('Cached listing:', listingKey);
    }

    getListing(listingId: string): ListingData | null {
        return this.cachedListings.get(listingId) || null;
    }

    getListingIds(): string[] {
        return this.listingIds;
    }

    getModelPreference(): ModelPreference | null {
        return this.modelPreference;
    }

    getAllCachedListings(): ListingData[] {
        return Array.from(this.cachedListings.values());
    }

    clearCache() {
        this.cachedListings.clear();
        this.listingIds = [];
        this.modelPreference = null;
    }

    // Get uncached listing IDs
    getUncachedListingIds(): string[] {
        return this.listingIds.filter(id => !this.cachedListings.has(id));
    }
}