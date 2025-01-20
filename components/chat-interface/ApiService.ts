// @/components/chat-interface/ApiService.ts
import { ApiResponse } from "@/types/chatInterface";

const API_CONFIG = {
    CHAT_API_ENDPOINT: 'https://api.dwellner.ca/api/v0/text_v4'
};

const MAX_RETRIES = 500;
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
                    'Authorization': `Bearer eyJraWQiOiIzY200STgwMVpudWRiUkY0b2xyeFF3SU1NbkVsd2FWWHBqbDdMRFc2cHZNPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJhYzZkMjUzOC0zMGYxLTcwYzYtNjBkZi03ZmE4MjcxOThkYTYiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuY2EtY2VudHJhbC0xLmFtYXpvbmF3cy5jb21cL2NhLWNlbnRyYWwtMV82eEV2Q0RuVDYiLCJjbGllbnRfaWQiOiJ1OGthN3JncmRzamdmZmY4dWlvNWRlZzdrIiwib3JpZ2luX2p0aSI6IjQyMTQ4MWU2LTg5YTItNDE1ZC05MmUyLTM2ODhhOWExYjliMSIsImV2ZW50X2lkIjoiYTU4MjU2NDQtY2M0ZC00NTJlLWFiYzEtOTVlOWI3ZDI0MmI5IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTczNzM1NTgxMiwiZXhwIjoxNzM3NDQyMjEyLCJpYXQiOjE3MzczNTU4MTIsImp0aSI6Ijk4YzA3YTEzLTQxYWMtNDY3NS1hZjViLTE4ZTA5ZjU2N2VhOSIsInVzZXJuYW1lIjoiYWM2ZDI1MzgtMzBmMS03MGM2LTYwZGYtN2ZhODI3MTk4ZGE2In0.P_V68NoUve3-LfFauLUVhO2V7mlfVvO_DUhJFAId6RUkXU_vA4-DZ_kHV1DX3ls6xXrHK9mcabZEx6JX8l_1P6VB-WS0s8exC389q3kDgPJNWaYqwU79MoSzrS8MQe_j8Wz5U2mfktFPAk5-beFnjhZD45b6jtgWZPdNIGDA6DnyHtTml8P6M59GS3M8kgJWx4G5mJKzmAzenPiMKrg8nlUgvw4NTM98gu3dFtzze5PYM_DchmXeVHlqPLImDut21CtkT6_lgumJlXgF9N1LAynZQARFjRfbhDTlxfKcIMy9FsnVYDPLhT9pwcBAicNWRsyrcsozFmLd-Dg4JLoiWw`
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