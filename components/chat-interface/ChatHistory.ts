// @/components/chat-interface/ChatHistory.ts
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { ChatMessage, ApiResponse } from '@/types/chatInterface';
import { MessageHandler } from "./MessageHandler";

export class ChatHistoryService {
    private client: DynamoDBClient;
    private readonly TABLE_NAME = "camila_chat_history";

    constructor() {
        this.client = new DynamoDBClient({
            region: "ca-central-1",
            credentials: {
                accessKeyId: 'AKIA3PW5YS7N3QIKX55D',
                secretAccessKey: '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'
            }
        });
    }

    async addChatHistory(userId: string, sessionId: string, response: ApiResponse): Promise<void> {
        try {
            const firstResponse = Array.isArray(response) ? response[0] : 
                                Array.isArray(response.response) ? response.response[0] : null;

            if (!firstResponse) {
                throw new Error('Invalid response format');
            }

            const { textMessages, listingsMessage } = MessageHandler.processApiResponse(response);
            const responseGroup = textMessages[0]?.responseGroup || Date.now();

            // Format split messages including the listings message if present
            const splitMessages = {
                L: textMessages.map((msg, index) => ({
                    M: {
                        text: { S: msg.text || '' },
                        index: { N: index.toString() },
                        timestamp: { S: new Date().toISOString() },
                        model_preference: msg.modelPreference ? {
                            M: Object.entries(msg.modelPreference).reduce((acc, [key, value]) => ({
                                ...acc,
                                [key]: { S: String(value) }
                            }), {})
                        } : { M: {} },
                        listing_ids: {
                            L: (msg.listingIds || []).map(id => ({ S: id }))
                        }
                    }
                }))
            };

            // Add listings message as the last split message if present
            if (listingsMessage) {
                splitMessages.L.push({
                    M: {
                        text: { S: '' },
                        index: { N: textMessages.length.toString() },
                        timestamp: { S: new Date().toISOString() },
                        listings: {
                            L: listingsMessage.listings?.map(listing => ({
                                M: {
                                    listing_id: { S: listing.listing_id },
                                    address: { S: listing.address },
                                    city: { S: listing.city },
                                    price: { N: listing.list_price.toString() }
                                }
                            })) || []
                        },
                        model_preference: listingsMessage.modelPreference ? {
                            M: Object.entries(listingsMessage.modelPreference).reduce((acc, [key, value]) => ({
                                ...acc,
                                [key]: { S: String(value) }
                            }), {})
                        } : { M: {} },
                        listing_ids: {
                            L: (listingsMessage.listingIds || []).map(id => ({ S: id }))
                        }
                    }
                });
            }

            // Create new message entry
            const newMessage = {
                L: [{
                    M: {
                        message_id: { S: responseGroup.toString() },
                        split_messages: splitMessages
                    }
                }]
            };

            // Update command to append the new message to the session's messages array
            const command = new UpdateItemCommand({
                TableName: this.TABLE_NAME,
                Key: {
                    "user_id": { S: userId },
                    "session_id": { S: sessionId }
                },
                UpdateExpression: "SET messages = list_append(if_not_exists(messages, :empty_list), :new_message)",
                ExpressionAttributeValues: {
                    ":empty_list": { L: [] },
                    ":new_message": newMessage
                }
            });

            await this.client.send(command);
            console.log('Successfully added chat history entry');

        } catch (error) {
            console.error('Error adding chat history:', {
                errorMessage: error.message,
                errorStack: error.stack
            });
            throw error;
        }
    }
}