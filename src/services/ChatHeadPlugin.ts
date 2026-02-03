import { registerPlugin } from '@capacitor/core';

export interface ChatHeadPlugin {
    /**
     * Check if overlay permission is granted
     */
    checkPermission(): Promise<{ granted: boolean }>;

    /**
     * Request overlay permission from user
     */
    requestPermission(): Promise<{ granted?: boolean; message?: string }>;

    /**
     * Show a chat head for a specific bee
     */
    showChatHead(options: {
        beeId: string;
        message: string;
        avatarData: string; // Base64 image or JSON customization
        unreadCount: number;
    }): Promise<{ success: boolean }>;

    /**
     * Hide a specific chat head
     */
    hideChatHead(): Promise<{ success: boolean }>;

    /**
     * Update an existing chat head
     */
    updateChatHead(options: {
        beeId: string;
        message: string;
        avatarData: string;
        unreadCount: number;
    }): Promise<{ success: boolean }>;

    /**
     * Remove all chat heads
     */
    removeAllChatHeads(): Promise<{ success: boolean }>;
}

const ChatHead = registerPlugin<ChatHeadPlugin>('ChatHead', {
    web: () => import('./web').then(m => new m.ChatHeadWeb()),
});

export default ChatHead;
