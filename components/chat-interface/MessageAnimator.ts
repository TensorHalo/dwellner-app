// @/components/chat-interface/MessageAnimator.ts
import { ChatMessage } from '@/types/chatInterface';

export class MessageAnimator {
    private typingTimeoutRef: { current: NodeJS.Timeout | null };
    private static CHAR_DELAY = 10;
    private static MESSAGE_DELAY_MIN = 50;
    private static MESSAGE_DELAY_MAX = 100;

    constructor(typingTimeoutRef: { current: NodeJS.Timeout | null }) {
        this.typingTimeoutRef = typingTimeoutRef;
    }

    private createDelay(ms: number): Promise<void> {
        return new Promise(resolve => {
            this.typingTimeoutRef.current = setTimeout(resolve, ms);
        });
    }

    async animateMessages(
        messages: ChatMessage[],
        updateMessage: (index: number, updates: Partial<ChatMessage>) => void
    ): Promise<void> {
        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            if (message.sender === 'bot' && !message.listings) {
                updateMessage(i, { isTyping: true, displayedText: '' });

                const text = message.text;
                const batchSize = 2; // Process characters in small batches for smoother animation
                
                for (let j = 0; j <= text.length; j += batchSize) {
                    await this.createDelay(MessageAnimator.CHAR_DELAY);
                    updateMessage(i, { displayedText: text.slice(0, j) });
                }

                updateMessage(i, { isTyping: false, displayedText: text });
                const randomDelay = Math.floor(Math.random() * 
                    (MessageAnimator.MESSAGE_DELAY_MAX - MessageAnimator.MESSAGE_DELAY_MIN + 1)) + 
                    MessageAnimator.MESSAGE_DELAY_MIN;
                await this.createDelay(randomDelay);
            }
        }
    }

    cleanup(): void {
        if (this.typingTimeoutRef.current) {
            clearTimeout(this.typingTimeoutRef.current);
        }
    }
}