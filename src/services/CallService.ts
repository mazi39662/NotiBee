import Peer, { MediaConnection } from 'peerjs';
import { ref, watch } from 'vue';
import { useUserService } from './UserService';
import { collection, addDoc } from 'firebase/firestore';
import { db } from './FirebaseService';
import { Haptics } from '@capacitor/haptics';

export interface CallState {
    isCalling: boolean;
    incomingCall: boolean;
    activeCall: boolean;
    remotePeerId: string | null;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    callType: 'audio' | 'video';
    error?: string;
    lastReaction?: { sender: string; emoji: string; id: number; metadata?: any };
    peerReady: boolean;
}



const callState = ref<CallState>({
    isCalling: false,
    incomingCall: false,
    activeCall: false,
    remotePeerId: null,
    localStream: null,
    remoteStream: null,
    callType: 'audio',
    peerReady: false
});


let peer: Peer | null = null;
let currentCall: MediaConnection | null = null;
let ringInterval: any = null;
let heartbeatInterval: any = null;
let isInitializing = false;



export const useCallService = () => {
    const { userBeeId } = useUserService();

    const initPeer = () => {
        if (peer || isInitializing || !userBeeId.value) return;

        isInitializing = true;
        // Clear errors whenever we try to (re)initialize
        callState.value.error = undefined;




        peer = new Peer(userBeeId.value, {
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun3.l.google.com:19302' },
                    { urls: 'stun:stun4.l.google.com:19302' },
                ],
            },
            debug: 0, // 0 = no logs, stops library-level error spam in subscriber's console
        });


        peer.on('open', (id) => {
            isInitializing = false;
            callState.value.peerReady = true;
            startHeartbeat();
        });



        peer.on('call', async (call) => {
            currentCall = call;
            callState.value.incomingCall = true;
            callState.value.remotePeerId = call.peer;

            // Start ringing haptics
            startRingingHaptics();
        });

        peer.on('error', (err) => {

            if (err.type === 'unavailable-id') {
                // If the ID is taken, it usually means the server hasn't cleared the old session yet.
                // We'll wait longer (5 seconds) and only try once more to avoid a loop.
                isInitializing = false;
                destroyPeer();
                if (!callState.value.error) { // Use error field as a 'tried once' flag
                    callState.value.error = 'Syncing...'; // Temporary internal flag
                    setTimeout(() => initPeer(), 5000);
                } else {
                    // If it happens again, just stop and wait for a manual action or the next app resume
                    callState.value.error = undefined;
                }
                return;
            }



            if (err.type === 'peer-unavailable') {
                return;
            }

            if (err.type === 'network') {
                // If we're recently resumed, don't show the error immediately, try to reconnect first
                setTimeout(() => {
                    if (!peer?.open) peer?.reconnect();
                }, 2000);
                return;
            }

            if (err.type === 'disconnected' || err.type === 'server-error') {
                isInitializing = false; // Allow retries
                peer?.reconnect();
            }
        });




        peer.on('disconnected', () => {
            stopHeartbeat();
            peer?.reconnect();
        });
    };

    const startHeartbeat = () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(() => {
            if (peer && !peer.destroyed && peer.open) {
                // Sending a fake message or just checking status to keep socket alive
                (peer as any).socket.send({ type: 'HEARTBEAT' });
            }
        }, 15000); // Pulse every 15s to keep signaling server happy
    };

    const stopHeartbeat = () => {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
    };


    const destroyPeer = () => {
        if (peer) {
            stopHeartbeat();
            stopRingingHaptics();
            try {
                // Remove all listeners first to prevent callbacks firing during destruction
                peer.off('open');
                peer.off('call');
                peer.off('error');
                peer.off('disconnected');

                peer.disconnect();
                peer.destroy();
            } catch (e) {
                // Silently handle websocket already closed errors
            }
            peer = null;
            isInitializing = false;
            callState.value.peerReady = false;
        }
    };






    const startRingingHaptics = () => {
        if (ringInterval) return;
        Haptics.vibrate({ duration: 500 });
        ringInterval = setInterval(() => {
            if (callState.value.incomingCall) {
                Haptics.vibrate({ duration: 500 });
            } else {
                stopRingingHaptics();
            }
        }, 1500);

        // Auto-stop after 20 seconds if not answered (Updated from 10s)
        setTimeout(async () => {
            if (callState.value.incomingCall) {
                const remoteId = callState.value.remotePeerId;
                stopRingingHaptics();

                // Reset internal state
                resetState();

                // Trigger local "Missed Call" notification if possible
                if (remoteId) {
                    const { sendMissedCallNotification } = await import('./PushService').then(m => m.usePushService());
                    sendMissedCallNotification(remoteId);
                }
            }
        }, 20000);
    };



    const stopRingingHaptics = () => {
        if (ringInterval) {
            clearInterval(ringInterval);
            ringInterval = null;
        }
    };

    const startCall = async (recipientId: string) => {
        if (!peer || !callState.value.peerReady) {
            initPeer();
            // Wait up to 3 seconds for peer to become ready
            let attempts = 0;
            while (!callState.value.peerReady && attempts < 6) {
                await new Promise(r => setTimeout(r, 500));
                attempts++;
            }
        }

        if (!callState.value.peerReady) {
            callState.value.error = 'Communication hub is still warming up. Please try again in a few seconds! 🐝';
            return;
        }

        callState.value.isCalling = true;

        callState.value.remotePeerId = recipientId;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            callState.value.localStream = stream;

            // 1. Send signaling request via Firebase
            const inboxRef = collection(db, 'users', recipientId, 'inbox');
            await addDoc(inboxRef, {
                from: userBeeId.value,
                type: 'CALL_REQUEST',
                timestamp: new Date().toISOString(),
                peerId: userBeeId.value,
            });


            // 2. The recipient will see this and we wait for them to call us or we call them
            // In this P2P flow, the "Caller" initiates the PeerJS call once they are ready
            const call = peer!.call(recipientId, stream);
            handleCall(call);

            // 🕒 20s Timeout for Caller (Auto-end if no answer)
            setTimeout(() => {
                if (callState.value.isCalling && !callState.value.activeCall) {
                    endCall();
                }
            }, 20000);

        } catch (err) {
            callState.value.error = 'Could not access microphone.';
            callState.value.isCalling = false;
        }
    };


    const handleCall = (call: MediaConnection) => {
        currentCall = call;

        call.on('stream', (remoteStream) => {
            callState.value.remoteStream = remoteStream;
            callState.value.activeCall = true;
            callState.value.isCalling = false;
            callState.value.incomingCall = false;
            stopRingingHaptics();
        });

        call.on('close', () => {
            endCall();
        });

        call.on('error', (err) => {
            endCall();
        });
    };

    const answerCall = async () => {
        if (!currentCall) return;
        stopRingingHaptics();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            callState.value.localStream = stream;
            currentCall.answer(stream);
            handleCall(currentCall);
        } catch (err) {
            callState.value.error = 'Could not access microphone.';
            rejectCall();
        }
    };

    const rejectCall = async () => {
        stopRingingHaptics();
        if (currentCall) {
            currentCall.close();
        }

        // Notify the other side via signaling if possible
        if (callState.value.remotePeerId) {
            const inboxRef = collection(db, 'users', callState.value.remotePeerId, 'inbox');
            await addDoc(inboxRef, {
                from: userBeeId.value,
                type: 'CALL_REJECTED',
                timestamp: new Date().toISOString()
            });
        }

        resetState();
    };

    const endCall = async () => {
        stopRingingHaptics();

        // Notify remote peer via signaling
        if (callState.value.remotePeerId) {
            const inboxRef = collection(db, 'users', callState.value.remotePeerId, 'inbox');
            await addDoc(inboxRef, {
                from: userBeeId.value,
                type: 'CALL_ENDED',
                timestamp: new Date().toISOString()
            });
        }

        if (currentCall) currentCall.close();
        if (callState.value.localStream) {
            callState.value.localStream.getTracks().forEach(track => track.stop());
        }
        resetState();
    };

    const resetState = () => {
        callState.value = {
            ...callState.value,
            isCalling: false,
            incomingCall: false,
            activeCall: false,
            remotePeerId: null,
            localStream: null,
            remoteStream: null,
            callType: 'audio',
            error: undefined
        };
        currentCall = null;
    };


    const sendReaction = async (recipientId: string, emoji: string, metadata?: any) => {
        if (!userBeeId.value) return;
        const inboxRef = collection(db, 'users', recipientId, 'inbox');
        await addDoc(inboxRef, {
            from: userBeeId.value,
            type: 'CALL_REACTION',
            emoji: emoji,
            message: emoji, // Ensure compatibility with BuzzService listener
            metadata: metadata || null,
            timestamp: new Date().toISOString()
        });
    };

    return {
        callState,
        initPeer,
        destroyPeer,
        startCall,
        answerCall,
        rejectCall,
        endCall,
        stopRingingHaptics,
        sendReaction
    };


};
