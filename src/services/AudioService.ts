import { ref } from 'vue';
import { storage } from './FirebaseService';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export const useAudioService = () => {
    const isRecording = ref(false);
    const recordingTime = ref(0);
    const audioBlob = ref<Blob | null>(null);
    let mediaRecorder: MediaRecorder | null = null;
    let timerInterval: any = null;
    const requestMicPermission = async () => {
        try {
            // If permissions API is available, check status
            if ((navigator as any).permissions && (navigator as any).permissions.query) {
                const status = await (navigator as any).permissions.query({ name: 'microphone' });
                if (status.state === 'granted') return true;
                if (status.state === 'denied') {
                    console.warn('🎤 Mic permission is explicitly denied');
                    return false;
                }
            }

            // Trigger the prompt by requesting a stream
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Immediately stop tracks to release the mic
            stream.getTracks().forEach(track => track.stop());
            console.log('🎤 Mic permission granted via prompt');
            return true;
        } catch (e) {
            console.error('🎤 Mic permission failed or denied', e);
            return false;
        }
    };

    const getSupportedMimeType = () => {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/aac',
            'audio/ogg',
            'audio/wav'
        ];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) return type;
        }
        return '';
    };

    const startRecording = async () => {
        try {
            console.log('🎤 Starting recording process...');
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Microphone API not supported in this browser/environment');
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('🎤 Stream acquired', stream.id);

            const mimeType = getSupportedMimeType();
            console.log('🎤 Using mimeType:', mimeType || 'default');

            try {
                mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
            } catch (recorderErr) {
                console.warn('🎤 Failed to create MediaRecorder with mimeType, trying default', recorderErr);
                mediaRecorder = new MediaRecorder(stream);
            }
            const chunks: BlobPart[] = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                audioBlob.value = new Blob(chunks, { type: mediaRecorder?.mimeType || 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            isRecording.value = true;
            recordingTime.value = 0;

            timerInterval = setInterval(() => {
                recordingTime.value++;
                if (recordingTime.value >= 60) {
                    stopRecording();
                }
            }, 1000);

        } catch (e) {
            console.error('Microphone access denied', e);
            throw e;
        }
    };

    const stopRecording = (): Promise<Blob> => {
        return new Promise((resolve) => {
            if (!mediaRecorder) return;

            const onStop = () => {
                isRecording.value = false;
                clearInterval(timerInterval);
                if (audioBlob.value) {
                    resolve(audioBlob.value);
                }
                mediaRecorder?.removeEventListener('stop', onStop);
            };

            mediaRecorder.addEventListener('stop', onStop);
            mediaRecorder.stop();
        });
    };

    const cancelRecording = () => {
        if (!mediaRecorder) return;
        mediaRecorder.onstop = null;
        mediaRecorder.stop();
        isRecording.value = false;
        clearInterval(timerInterval);
        recordingTime.value = 0;
    };

    const uploadAudio = async (blob: Blob, userId: string): Promise<string> => {
        const extension = blob.type.split('/')[1]?.split(';')[0] || 'webm';
        const fileName = `audio_${userId}_${Date.now()}.${extension}`;
        const audioFileRef = storageRef(storage, `audio_messages/${fileName}`);
        const metadata = { contentType: blob.type };
        await uploadBytes(audioFileRef, blob, metadata);
        return getDownloadURL(audioFileRef);
    };

    const deleteFromStorage = async (url: string) => {
        try {
            const fileRef = storageRef(storage, url);
            await deleteObject(fileRef);
        } catch (e) {
            console.warn('File might already be deleted', e);
        }
    };

    const initDB = (): Promise<IDBDatabase> => {
        return new Promise((resolve, reject) => {
            const indexedStore = self.indexedDB || (window as any).indexedDB;
            const request = indexedStore.open('NotiBeeAudio', 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (e: any) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('messages')) {
                    db.createObjectStore('messages');
                }
            };
        });
    };

    const saveAudioLocally = async (id: string, blob: Blob) => {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['messages'], 'readwrite');
            const store = transaction.objectStore('messages');
            const request = store.put(blob, id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(true);
        });
    };

    const getLocalAudio = async (id: string): Promise<string | null> => {
        const db = await initDB();
        return new Promise((resolve) => {
            const transaction = db.transaction(['messages'], 'readonly');
            const store = transaction.objectStore('messages');
            const request = store.get(id);
            request.onsuccess = () => {
                if (request.result) {
                    resolve(URL.createObjectURL(request.result));
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => resolve(null);
        });
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return {
        isRecording,
        recordingTime,
        requestMicPermission,
        startRecording,
        stopRecording,
        cancelRecording,
        uploadAudio,
        deleteFromStorage,
        saveAudioLocally,
        getLocalAudio,
        formatTime
    };
};
