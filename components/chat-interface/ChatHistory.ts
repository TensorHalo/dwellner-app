// @/components/chat-interface/ChatHistory.ts 
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb"; 
import { ApiResponse } from "@/types/chatInterface";

export class ChatHistoryService { 
    private client: DynamoDBClient; 
    private readonly TABLE_NAME = "dwellner_users";

    constructor() {
        this.client = new DynamoDBClient({
            region: "us-east-1",
            credentials: {
                accessKeyId: "AKIAWDARUP7MHJ5IRB3Y",
                secretAccessKey: "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"
            }
        });
    }
    
    async addChatHistory(userId: string, sessionId: string, response: ApiResponse): Promise<void> {
        try {
            // console.log('Raw response:', JSON.stringify(response, null, 2));
            const firstResponse = Array.isArray(response) ? response[0] : 
                                Array.isArray(response.response) ? response.response[0] : null;
    
            if (!firstResponse) {
                throw new Error('Invalid response format');
            }
    
            const modelPreferenceMap = firstResponse.model_preference === null ? 
                { M: { } } : // Empty map for null model_preference
                { 
                    M: Object.entries(firstResponse.model_preference || {}).reduce((acc, [key, value]) => ({
                        ...acc,
                        [key]: { S: String(value ?? '') }
                    }), {})
                };
    
            const listingIdsArray = Array.isArray(firstResponse.listing_ids) ? 
                firstResponse.listing_ids.map(id => ({ S: String(id) })) : [];
    
            const historyEntry = {
                M: {
                    timestamp: { S: new Date().toISOString() },
                    sessionId: { S: sessionId },
                    response: { 
                        M: {
                            resp: { S: firstResponse.resp || '' },
                            show_listings_flag: { BOOL: Boolean(firstResponse.show_listings_flag) },
                            listing_ids: { L: listingIdsArray },
                            model_preference: modelPreferenceMap
                        }
                    }
                }
            };
    
            // console.log('Constructed history entry:', JSON.stringify(historyEntry, null, 2));
    
            const command = new UpdateItemCommand({
                TableName: this.TABLE_NAME,
                Key: {
                    "pk": { S: `USER#${userId}` },
                    "sk": { S: `PROFILE#${userId}` }
                },
                UpdateExpression: "SET chat_history = list_append(if_not_exists(chat_history, :empty_list), :history_entry)",
                ExpressionAttributeValues: {
                    ":empty_list": { L: [] },
                    ":history_entry": { L: [historyEntry] }
                }
            });
    
            await this.client.send(command);
            console.log('Successfully added chat history entry');
        } catch (error) {
            console.error('Error details:', {
                error,
                errorMessage: error.message,
                errorStack: error.stack
            });
            throw error;
        }
    }
}