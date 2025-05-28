// @/components/chat-interface/ApiService.ts
import { ApiResponse } from "@/types/chatInterface";
import { getAuthTokens } from "@/utils/authTokens";

const API_CONFIG = {
    // CHAT_API_ENDPOINT: 'https://api.dwellner.ca/api/v0/text_v4'
    CHAT_API_ENDPOINT: 'https://api.deephome.ca/api/v0/text_v4'
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export class ChatApiService {
    private accessToken: string | null;
    private idToken: string | null;
    private lastTokenRefresh: number;

    constructor(accessToken: string, idToken: string) {
        this.accessToken = accessToken;
        this.idToken = idToken;
        this.lastTokenRefresh = Date.now();
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private shouldRefreshToken(): boolean {
        return !this.accessToken || !this.idToken || Date.now() - this.lastTokenRefresh > 55 * 60 * 1000;
    }

    private async refreshTokens(): Promise<boolean> {
        try {
            const tokens = await getAuthTokens();
            
            if (!tokens?.accessToken || !tokens?.idToken) {
                console.error('Missing required tokens during refresh');
                return false;
            }

            this.accessToken = tokens.accessToken;
            this.idToken = tokens.idToken;
            this.lastTokenRefresh = Date.now();
            return true;
        } catch (error) {
            console.error('Error refreshing tokens:', error);
            return false;
        }
    }

    private async makeApiCall(messageToSend: string, sessionId: string): Promise<ApiResponse> {
        if (this.shouldRefreshToken()) {
            const refreshed = await this.refreshTokens();
            if (!refreshed) {
                throw new Error('Failed to refresh tokens');
            }
        }

        try {
            console.log('Making API call for session:', sessionId);
            const requestBody = JSON.stringify({
                prompt: messageToSend,
                sessionId: sessionId
            });

            const response = await fetch(API_CONFIG.CHAT_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/plain, */*',
                    'Authorization': `Bearer ${this.accessToken}`,
                    'id-token': this.idToken,
                    'Connection': 'keep-alive'
                },
                body: requestBody
            });

            const responseText = await response.text();
            console.log('API Response status:', response.status);

            if (!response.ok) {
                console.error('API error response:', responseText);
                
                if (response.status === 401 || 
                    (response.status === 400 && responseText.includes('token'))) {
                    console.log('Token validation failed, attempting refresh...');
                    const refreshed = await this.refreshTokens();
                    if (refreshed) {
                        return this.makeApiCall(messageToSend, sessionId);
                    }
                }
                
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return JSON.parse(responseText);

        } catch (error) {
            console.error('Error in makeApiCall:', error);
            throw error;
        }
    }

    async sendMessage(messageToSend: string, sessionId: string, attemptCount = 0): Promise<ApiResponse> {
        try {
            const response = await this.makeApiCall(messageToSend, sessionId);
            return response;
        } catch (error) {
            console.error(`Error in sendMessage (attempt ${attemptCount + 1}):`, error);
            
            if (error instanceof Error && 
                (error.message.includes('404') || error.message.includes('500')) && 
                attemptCount < MAX_RETRIES) {
                const nextAttempt = attemptCount + 1;
                const delay = RETRY_DELAY * Math.pow(2, attemptCount);
                console.log(`Retrying after network error (attempt ${nextAttempt}/${MAX_RETRIES}) in ${delay}ms`);
                await this.delay(delay);
                return this.sendMessage(messageToSend, sessionId, nextAttempt);
            }

            throw error;
        }
    }
}