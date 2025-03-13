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
        this.modelPreference = { ...preference };
        
        console.log('Initializing cache with first listing fields:', {
            listing_id: firstListing.listing_id,
            address: firstListing.address,
            listAgentKey: firstListing.listAgentKey
        });
        
        // Store the listing exactly as received - no modifications
        const listingKey = firstListing.listing_id.replace('C', '');
        this.cachedListings.set(listingKey, firstListing);
    }

    cacheListing(listing: ListingData) {
        if (!listing?.listing_id) return;
        console.log('Caching listing with listing key:', listing.listing_id);
        const listingKey = listing.listing_id.replace('C', '');
        this.cachedListings.set(listingKey, listing);
    }

    getListing(listingId: string): ListingData | null {
        const listing = this.cachedListings.get(listingId);
        
        // Log when retrieving a listing
        if (listing) {
            console.log('Retrieved listing from cache, agent key:', listing.listAgentKey);
        } else {
            console.log('Listing not found in cache:', listingId);
        }
        
        return listing || null;
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