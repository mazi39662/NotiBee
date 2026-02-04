import { ref } from 'vue';
import { Network } from '@capacitor/network';

const isOnline = ref<boolean>(true);

// Initialize network status
Network.getStatus().then(status => {
    isOnline.value = status.connected;
});

// Listen for network changes
Network.addListener('networkStatusChange', status => {
    isOnline.value = status.connected;
});

export const useNetworkService = () => {
    return {
        isOnline
    };
};
