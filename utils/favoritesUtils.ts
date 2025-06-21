// @/utils/favoritesUtils.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
    DynamoDBDocumentClient, 
    UpdateCommand,
    GetCommand
} from "@aws-sdk/lib-dynamodb";
import { ModelPreference } from "@/types/chatInterface";
import AsyncStorage from '@react-native-async-storage/async-storage';

const TABLE_NAME = "dwellner_users";
const MAX_FAVORITES = 20;

const docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        removeUndefinedValues: true,
        convertClassInstanceToMap: true
    }
});

export interface FavoriteListingItem {
    listingId: string;
    modelPreference: ModelPreference;
    savedAt: string;
}

// Get user's favorite items from DynamoDB
export const getUserFavoriteItems = async (cognitoId: string): Promise<FavoriteListingItem[]> => {
    try {
        // First try getting from local storage for immediate UI update
        const localFavoritesStr = await AsyncStorage.getItem(`favorites_items_${cognitoId}`);
        let favoriteItems: FavoriteListingItem[] = localFavoritesStr ? JSON.parse(localFavoritesStr) : [];
        
        // Then fetch from DynamoDB to make sure we're in sync
        try {
            const command = new GetCommand({
                TableName: TABLE_NAME,
                Key: {
                    pk: `USER#${cognitoId}`,
                    sk: `PROFILE#${cognitoId}`
                }
            });
            
            const response = await docClient.send(command);
            if (response.Item && response.Item.favorites) {
                favoriteItems = response.Item.favorites;
                
                // Update local storage to match DB
                await AsyncStorage.setItem(`favorites_items_${cognitoId}`, JSON.stringify(favoriteItems));
            }
        } catch (error) {
            console.error('Error fetching favorites from DynamoDB:', error);
            // We'll still use the local favorites if DynamoDB fetch fails
        }
        
        return favoriteItems;
    } catch (error) {
        console.error('Error getting user favorite items:', error);
        return [];
    }
};

// Get just the listing IDs for quick checks
export const getUserFavorites = async (cognitoId: string): Promise<string[]> => {
    const favoriteItems = await getUserFavoriteItems(cognitoId);
    return favoriteItems.map(item => item.listingId);
};

// Toggle a listing as favorite (add if not exists, remove if exists)
export const toggleFavorite = async (
    cognitoId: string,
    listingId: string,
    modelPreference: ModelPreference
): Promise<boolean> => {
    try {
        // Get current favorite items
        const favoriteItems = await getUserFavoriteItems(cognitoId);
        
        // Check if this listing is already a favorite
        const existingIndex = favoriteItems.findIndex(item => item.listingId === listingId);
        const isFavorite = existingIndex !== -1;
        
        let newFavoriteItems: FavoriteListingItem[];
        const now = new Date().toISOString();
        
        if (isFavorite) {
            // Remove from favorites if it exists
            newFavoriteItems = favoriteItems.filter(item => item.listingId !== listingId);
        } else {
            // Add to favorites if it doesn't exist
            const newFavoriteItem: FavoriteListingItem = {
                listingId,
                modelPreference,
                savedAt: now
            };
            
            // Add new item to beginning of array so newest items are first
            newFavoriteItems = [newFavoriteItem, ...favoriteItems];
            
            // Limit to MAX_FAVORITES items by removing oldest ones
            if (newFavoriteItems.length > MAX_FAVORITES) {
                newFavoriteItems = newFavoriteItems.slice(0, MAX_FAVORITES);
            }
        }
        
        // Update local storage immediately for responsive UI
        await AsyncStorage.setItem(`favorites_items_${cognitoId}`, JSON.stringify(newFavoriteItems));
        
        // Then update DynamoDB
        const command = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
                pk: `USER#${cognitoId}`,
                sk: `PROFILE#${cognitoId}`
            },
            UpdateExpression: "SET favorites = :favorites, updated_at = :updateTime",
            ExpressionAttributeValues: {
                ':favorites': newFavoriteItems,
                ':updateTime': now
            },
            ReturnValues: 'ALL_NEW'
        });
        
        await docClient.send(command);
        
        // Return new status
        return !isFavorite;
    } catch (error) {
        console.error('Error toggling favorite:', error);
        
        // Revert local storage changes if DB update fails
        const favoriteItems = await getUserFavoriteItems(cognitoId);
        await AsyncStorage.setItem(`favorites_items_${cognitoId}`, JSON.stringify(favoriteItems));
        
        return false;
    }
};

// Check if a listing is in favorites
export const isFavorite = async (
    cognitoId: string,
    listingId: string
): Promise<boolean> => {
    try {
        const favorites = await getUserFavorites(cognitoId);
        return favorites.includes(listingId);
    } catch (error) {
        console.error('Error checking if listing is favorite:', error);
        return false;
    }
};