// @/components/chat-interface/ApiService.ts
import { ApiResponse } from "@/types/chatInterface";

const API_CONFIG = {
    CHAT_API_ENDPOINT: 'https://api.dwellner.ca/api/v0/text_v4'
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 100;

export class ChatApiService {
    private accessToken: string;

    constructor(accessToken: string) {
        this.accessToken = accessToken;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async makeApiCall(messageToSend: string, sessionId: string): Promise<ApiResponse> {
        try {
            const requestBody = JSON.stringify({
                prompt: messageToSend,
                sessionId: sessionId
            });

            const response = await fetch(API_CONFIG.CHAT_API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/plain, */*',
                    'Authorization': `Bearer eyJraWQiOiIzY200STgwMVpudWRiUkY0b2xyeFF3SU1NbkVsd2FWWHBqbDdMRFc2cHZNPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJhYzZkMjUzOC0zMGYxLTcwYzYtNjBkZi03ZmE4MjcxOThkYTYiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuY2EtY2VudHJhbC0xLmFtYXpvbmF3cy5jb21cL2NhLWNlbnRyYWwtMV82eEV2Q0RuVDYiLCJjbGllbnRfaWQiOiJ1OGthN3JncmRzamdmZmY4dWlvNWRlZzdrIiwib3JpZ2luX2p0aSI6ImM0NmRmYzk0LTE3ZmYtNDAwMC04NTQ3LTM1MzUxOTgyM2I1ZCIsImV2ZW50X2lkIjoiODQ4ZTc4ZjUtYzA0MS00MWNkLTliZTYtNGFhMGNhMDdmNjE5IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTczNzUyNTE2OSwiZXhwIjoxNzM3NjExNTY5LCJpYXQiOjE3Mzc1MjUxNjksImp0aSI6IjViNDNiMzUxLWNkZDMtNDA5Ni1iNWZhLWFjOGY1YTQ5MzJlYyIsInVzZXJuYW1lIjoiYWM2ZDI1MzgtMzBmMS03MGM2LTYwZGYtN2ZhODI3MTk4ZGE2In0.mz808Mp7ZECL9Lr0p4J8H4IDPfbfHcKqI3PL3-SLreFFmcDVlZhKt5G3F-NocGxQr3FkXm1mpBlyVBaBIT1bpvVuds9_7FPij63MRhsp7OF416XbPpwFo3DqJBuE7gcxEj7wm8IRIM3VzGTG4JKMFQ25wz1xlulkNtti2Mxc4u0BjsG-FZnHvb9Spv5IhptyETujbBeRHD2sNOa_xktOEPj6Dvd9XjQfN6RQ06McBHNi8Bf4WOYk3w4opS1xPV_N9EsKgTQsxbk7NSaOx6Kopp8keNPKxDvmpA_EjR0G9YU21_weBlAzw64Xq36BDs6vbwQDmZtTeaNYfie8YMq1fw`
                },
                body: requestBody
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const jsonResponse = await response.json();
            return jsonResponse;

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
            console.error('Error in sendMessage:', error);
            
            if (error instanceof Error && 
                (error.message.includes('404') || error.message.includes('500')) && 
                attemptCount < MAX_RETRIES) {
                await this.delay(RETRY_DELAY);
                return this.sendMessage(messageToSend, sessionId, attemptCount + 1);
            }
            throw error;
        }
    }
}