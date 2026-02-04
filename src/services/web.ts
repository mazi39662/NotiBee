import { WebPlugin } from '@capacitor/core';
import type { ChatHeadPlugin } from './ChatHeadPlugin';

export class ChatHeadWeb extends WebPlugin implements ChatHeadPlugin {
    async checkPermission(): Promise<{ granted: boolean }> {
        return { granted: false };
    }

    async requestPermission(): Promise<{ granted?: boolean; message?: string }> {
        return { granted: false, message: 'Not supported on web' };
    }

    async showChatHead(): Promise<{ success: boolean }> {
        return { success: false };
    }

    async hideChatHead(): Promise<{ success: boolean }> {
        return { success: false };
    }

    async updateChatHead(): Promise<{ success: boolean }> {
        return { success: false };
    }

    async removeAllChatHeads(): Promise<{ success: boolean }> {
        return { success: false };
    }
}
