import { WebPlugin } from '@capacitor/core';
import type { ChatHeadPlugin } from './ChatHeadPlugin';

export class ChatHeadWeb extends WebPlugin implements ChatHeadPlugin {
    async checkPermission(): Promise<{ granted: boolean }> {
        console.log('Chat heads are not supported on web');
        return { granted: false };
    }

    async requestPermission(): Promise<{ granted?: boolean; message?: string }> {
        console.log('Chat heads are not supported on web');
        return { granted: false, message: 'Not supported on web' };
    }

    async showChatHead(): Promise<{ success: boolean }> {
        console.log('Chat heads are not supported on web');
        return { success: false };
    }

    async hideChatHead(): Promise<{ success: boolean }> {
        console.log('Chat heads are not supported on web');
        return { success: false };
    }

    async updateChatHead(): Promise<{ success: boolean }> {
        console.log('Chat heads are not supported on web');
        return { success: false };
    }

    async removeAllChatHeads(): Promise<{ success: boolean }> {
        console.log('Chat heads are not supported on web');
        return { success: false };
    }
}
