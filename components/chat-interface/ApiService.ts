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
                    'Authorization': `Bearer eyJraWQiOiIzY200STgwMVpudWRiUkY0b2xyeFF3SU1NbkVsd2FWWHBqbDdMRFc2cHZNPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJhYzZkMjUzOC0zMGYxLTcwYzYtNjBkZi03ZmE4MjcxOThkYTYiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuY2EtY2VudHJhbC0xLmFtYXpvbmF3cy5jb21cL2NhLWNlbnRyYWwtMV82eEV2Q0RuVDYiLCJjbGllbnRfaWQiOiJ1OGthN3JncmRzamdmZmY4dWlvNWRlZzdrIiwib3JpZ2luX2p0aSI6IjVlZjY1M2RhLTdmODQtNDEwZC1hZmIxLTU4MDVjMDg5Y2M0NCIsImV2ZW50X2lkIjoiYTJlZjU2ODYtZDY5YS00ZWIwLTk4OTktNDc4ZTE5Yjc3ZjgzIiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJhd3MuY29nbml0by5zaWduaW4udXNlci5hZG1pbiIsImF1dGhfdGltZSI6MTczNzQzNzg2MywiZXhwIjoxNzM3NTI0MjYzLCJpYXQiOjE3Mzc0Mzc4NjMsImp0aSI6ImQzMmI3OTczLWNjMWYtNGQ1ZC1iMDQzLWI3MjBlNzNjOGFlMyIsInVzZXJuYW1lIjoiYWM2ZDI1MzgtMzBmMS03MGM2LTYwZGYtN2ZhODI3MTk4ZGE2In0.EMOmhrpAPgQBxBCO1MxErzb1b-oo4MErb-dBQAcuxnKdP8Y5n8my39PZoGUVl9Yy_aMYQPNbRgNWWDlUnRkp6t77H8A2k9G2GOkCzvVSJTuIsOhJOYO6eFw_jVAjaZAtDweQRcbPBrJmq_6QaRvCHVK92PgaItgIuq6g4AXST1PXHQg5m5SQ44Op1o2c0y9_UxGlCWeaAk3ry_qA-q1t_MelCb_dKRbtpVlgtsuXsZzs4_kR_DF4InXiYlGrjsqYWbF8zIXp0Vwu7hLy0bRPitvXHBzjL91dnVXxfIoYomvS903Udshsjc-B64IH0kvaW-AIa4SnTjz3AEv-vfdPyg`
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