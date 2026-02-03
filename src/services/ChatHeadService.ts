import { ref } from 'vue';
import ChatHead from './ChatHeadPlugin';
import { Capacitor } from '@capacitor/core';

class ChatHeadService {
    private hasPermission = ref(false);
    private _isSupported = ref(false);

    constructor() {
        this._isSupported.value = Capacitor.getPlatform() === 'android';
        if (this._isSupported.value) {
            this.checkPermission();
        }
    }

    /**
     * Check if overlay permission is granted
     */
    async checkPermission(): Promise<boolean> {
        if (!this._isSupported.value) return false;

        try {
            const result = await ChatHead.checkPermission();
            this.hasPermission.value = result.granted;
            return result.granted;
        } catch (error) {
            console.error('Error checking chat head permission:', error);
            return false;
        }
    }

    /**
     * Request overlay permission from user
     */
    async requestPermission(): Promise<boolean> {
        if (!this._isSupported.value) {
            console.warn('Chat heads are only supported on Android');
            return false;
        }

        try {
            await ChatHead.requestPermission();
            // Wait a bit for user to grant permission, then check again
            await new Promise(resolve => setTimeout(resolve, 1000));
            return await this.checkPermission();
        } catch (error) {
            console.error('Error requesting chat head permission:', error);
            return false;
        }
    }

    /**
     * Show a chat head for a bee with their custom avatar
     */
    async showChatHead(
        beeId: string,
        message: string,
        customization: { top: string; body: string; eyes: string; accessories?: string[] },
        unreadCount: number = 1
    ): Promise<boolean> {
        if (!this._isSupported.value) return false;

        // Check permission first
        if (!this.hasPermission.value) {
            const granted = await this.requestPermission();
            if (!granted) return false;
        }

        try {
            // Generate bee avatar as base64 or send customization JSON
            const avatarData = await this.generateBeeAvatarData(customization);

            await ChatHead.showChatHead({
                beeId,
                message: message.substring(0, 100), // Truncate long messages
                avatarData,
                unreadCount
            });

            return true;
        } catch (error) {
            console.error('Error showing chat head:', error);
            return false;
        }
    }

    /**
     * Update an existing chat head
     */
    async updateChatHead(
        beeId: string,
        message: string,
        customization: { top: string; body: string; eyes: string; accessories?: string[] },
        unreadCount: number
    ): Promise<boolean> {
        if (!this._isSupported.value) return false;

        try {
            const avatarData = await this.generateBeeAvatarData(customization);

            await ChatHead.updateChatHead({
                beeId,
                message: message.substring(0, 100),
                avatarData,
                unreadCount
            });

            return true;
        } catch (error) {
            console.error('Error updating chat head:', error);
            return false;
        }
    }

    /**
     * Hide the chat head
     */
    async hideChatHead(): Promise<boolean> {
        if (!this._isSupported.value) return false;

        try {
            await ChatHead.hideChatHead();
            return true;
        } catch (error) {
            console.error('Error hiding chat head:', error);
            return false;
        }
    }

    /**
     * Remove all chat heads
     */
    async removeAllChatHeads(): Promise<boolean> {
        if (!this._isSupported.value) return false;

        try {
            await ChatHead.removeAllChatHeads();
            return true;
        } catch (error) {
            console.error('Error removing chat heads:', error);
            return false;
        }
    }

    /**
     * Generate bee avatar data from customization
     * This can either be a base64 image or JSON customization data
     */
    private async generateBeeAvatarData(
        customization: { top: string; body: string; eyes: string; accessories?: string[] }
    ): Promise<string> {
        try {
            // Option 1: Send customization as JSON (Android will render it)
            return JSON.stringify(customization);

            // Option 2: Render bee to canvas and convert to base64 (more reliable)
            // Uncomment this if you want to render the bee in JS and send as image
            /*
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 200;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) return JSON.stringify(customization);
      
            // Draw bee parts here (simplified example)
            // You would need to load and draw the actual SVG parts
            ctx.fillStyle = '#ffbf00';
            ctx.beginPath();
            ctx.arc(100, 100, 80, 0, Math.PI * 2);
            ctx.fill();
      
            // Add stripes
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 60, 200, 20);
            ctx.fillRect(0, 120, 200, 20);
      
            return canvas.toDataURL('image/png');
            */
        } catch (error) {
            console.error('Error generating bee avatar:', error);
            return JSON.stringify(customization);
        }
    }

    /**
     * Get permission status
     */
    getPermissionStatus(): boolean {
        return this.hasPermission.value;
    }

    /**
     * Check if chat heads are supported on this platform
     */
    isSupported(): boolean {
        return this._isSupported.value;
    }
}

// Export singleton instance
export const useChatHeadService = (() => {
    let instance: ChatHeadService | null = null;

    return () => {
        if (!instance) {
            instance = new ChatHeadService();
        }
        return instance;
    };
})();
