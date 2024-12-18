import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, getDocs, initializeFirestore, collection, query, where } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyD63kr2INanIG_MyrPv2lFVH2EdQdK6OZI",
    authDomain: "appauth-b2f90.firebaseapp.com",
    projectId: "appauth-b2f90",
    storageBucket: "appauth-b2f90.firebasestorage.app",
    messagingSenderId: "519406639757",
    appId: "1:519406639757:web:235a78c774b64ef7aee0c4",
    measurementId: "G-FE63HBFM9H"
};

export interface ListingData {
    listing_id: string;
    address: string;
    city: string;
    architectural_style: string[];
    bathrooms_partial: number | null;
    bathrooms_total: number;
    bedrooms_total: number;
    common_interest: string;
    country: string;
    coordinates: {
        latitude: number;
        longitude: number;
    };
    list_price: number;
    parking_features: string[];
    property_type: string;
    photos_count: number;
    media: Array<{
        MediaKey: string;
        ResourceRecordKey: string;
        LongDescription: string | null;
        MediaURL: string;
        ModificationTimestamp: string;
        Order: number;
        PreferredPhotoYN: boolean;
        ResourceRecordId: string;
        ResourceName: string;
        MediaCategory: string;
    }>;
}

// Initialize Firebase
let app;
let db;

if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    db = initializeFirestore(app, {
        experimentalForceLongPolling: true,
    });
} else {
    app = getApp();
    db = getFirestore(app);
}

export const fetchListings = async (listingIds: string[]): Promise<ListingData[]> => {
    try {
        const listings: ListingData[] = [];
        const listingsRef = collection(db, 'listings');

        // Batch fetch listings in groups of 10 (Firestore limit)
        for (let i = 0; i < listingIds.length; i += 10) {
            const batch = listingIds.slice(i, i + 10);
            const q = query(listingsRef, where('listing_id', 'in', batch));
            const querySnapshot = await getDocs(q);
            
            querySnapshot.forEach((doc) => {
                listings.push(doc.data() as ListingData);
            });
        }

        return listings;
    } catch (error) {
        console.error('Error fetching listings:', error);
        return [];
    }
};

export { db };