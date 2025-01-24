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
                    'Authorization': `Bearer eyJraWQiOiIzY200STgwMVpudWRiUkY0b2xyeFF3SU1NbkVsd2FWWHBqbDdMRFc2cHZNPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJhYzZkMjUzOC0zMGYxLTcwYzYtNjBkZi03ZmE4MjcxOThkYTYiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuY2EtY2VudHJhbC0xLmFtYXpvbmF3cy5jb21cL2NhLWNlbnRyYWwtMV82eEV2Q0RuVDYiLCJjbGllbnRfaWQiOiJ1OGthN3JncmRzamdmZmY4dWlvNWRlZzdrIiwib3JpZ2luX2p0aSI6IjYwYjM1OTJmLWExNGItNDU3Ny1hN2Q3LWEyZDFhZGJmZTQzYyIsImV2ZW50X2lkIjoiODkyMTI2YmItNjAxZS00OGE5LWFhMzMtODYxMmIzMzczNjU4IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTczNzY0MzAzMSwiZXhwIjoxNzM3NzI5NDMxLCJpYXQiOjE3Mzc2NDMwMzEsImp0aSI6Ijc2YzJmM2Y1LTRiZjctNGNiMC04ZjMwLTgwNDcwMTZmNTBjMSIsInVzZXJuYW1lIjoiYWM2ZDI1MzgtMzBmMS03MGM2LTYwZGYtN2ZhODI3MTk4ZGE2In0.PvnrFGps9CMHVTabYNrIdW0KIWP4PrUS8uEputgyG3HthnbsD3xo77qa7wBubYfsbHdEQZMwRpb4qDO8WHFlic8gBAXewTI72p8rQ07MDpbViqj9ji16_y2cPGRwTyYcSzH9QYgMjHGS7SFl8jc30-T29FjXElADnX6CUGTtI14NEcosaOL-m7kxUxEUSsXQ2kcRJulZygA1NWNh4PrtU3qRnix8wlr4Cgt5WiwQygIiRkHP2UyY9ekf2FPDEZkKQCMpz1Frnrm25u3_b6YD1C65CRF8xU8AYQuxnBbwWu1X8z3G67mXkaK3JX9GKz9mha7iSM2ZfyRbSqF7kCxt8Q`
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