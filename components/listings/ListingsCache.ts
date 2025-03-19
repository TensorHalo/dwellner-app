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
        
        // Check if this is a rental listing
        const isRental = this.determineIfRental(firstListing, preference);
        
        // Ensure the isRental property is set
        if (firstListing.isRental === undefined) {
            firstListing = {
                ...firstListing,
                isRental
            };
        }
        
        console.log('Initializing cache with first listing fields:', {
            listing_id: firstListing.listing_id,
            address: firstListing.address,
            listAgentKey: firstListing.listAgentKey,
            isRental: firstListing.isRental
        });
        
        // If rent_or_purchase is available in preference, log it
        if (preference && preference.rent_or_purchase) {
            console.log(`Model preference indicates: ${preference.rent_or_purchase}`);
        }
        
        // Store the listing exactly as received - no modifications
        const listingKey = firstListing.listing_id.replace('C', '');
        this.cachedListings.set(listingKey, firstListing);
    }

    cacheListing(listing: ListingData) {
        if (!listing?.listing_id) return;
        
        // Ensure isRental is set if it's undefined
        if (listing.isRental === undefined) {
            const isRental = this.determineIfRental(listing, this.modelPreference);
            listing = {
                ...listing,
                isRental
            };
        }
        
        console.log('Caching listing with listing key:', listing.listing_id, 'isRental:', listing.isRental);
        
        const listingKey = listing.listing_id.replace('C', '');
        this.cachedListings.set(listingKey, listing);
    }

    private determineIfRental(listing: ListingData, preference: ModelPreference | null): boolean {
        // First check: explicit isRental property
        if (listing.isRental !== undefined) {
            return listing.isRental;
        }
        
        // Second check: model preference
        if (preference?.rent_or_purchase) {
            return preference.rent_or_purchase.toLowerCase() === 'rent';
        }
        
        // Third check: TotalActualRent vs ListPrice fields (if available)
        if (listing.hasOwnProperty('TotalActualRent')) {
            const hasTotalActualRent = listing.TotalActualRent !== null && 
                                     listing.TotalActualRent !== undefined;
            if (hasTotalActualRent) {
                return true;
            }
        }
        
        // Fourth check: property type
        if (listing.property_type) {
            const propertyType = listing.property_type.toLowerCase();
            if (propertyType.includes('apartment') || propertyType.includes('condo')) {
                // These are more commonly rentals
                return true;
            }
        }
        
        // Default to false if no rental indicators are found
        return false;
    }

    getListing(listingId: string): ListingData | null {
        const listing = this.cachedListings.get(listingId);
        
        // Log when retrieving a listing
        if (listing) {
            console.log('Retrieved listing from cache:', {
                id: listingId,
                agent: listing.listAgentKey,
                isRental: listing.isRental
            });
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