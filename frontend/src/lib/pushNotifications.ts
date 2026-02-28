import api from '@/services/api';

/**
 * Utility to convert base64 VAPID public key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Registers the Service Worker and subscribes the user to Web Push
 */
export async function subscribeToPushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push notifications are not supported by the browser.');
        return false;
    }

    try {
        // Check permission first
        let permission = Notification.permission;
        if (permission === 'default') {
            permission = await Notification.requestPermission();
        }

        if (permission !== 'granted') {
            console.warn('Notification permission not granted.');
            return false;
        }

        // Register Service Worker if not registered
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered with scope:', registration.scope);

        // Wait for the service worker to become active
        await navigator.serviceWorker.ready;

        // Check if user is already subscribed
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) {
            console.log('User is already subscribed to push notifications.');
            // Optional: Update subscription on backend to be safe
            await sendSubscriptionToBackend(existingSubscription);
            return true;
        }

        // Get VAPID public key from backend or environment
        let vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

        if (!vapidPublicKey) {
            // Fallback: fetch from backend
            try {
                const response = await api.get('/notifications/push/public-key');
                vapidPublicKey = response.data.public_key;
            } catch (e) {
                console.error('API failed to return VAPID key', e);
            }
        }

        if (!vapidPublicKey) {
            console.error('VAPID public key not found in environment or backend.');
            return false;
        }

        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

        const newSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey,
        });

        // Send subscription to backend
        await sendSubscriptionToBackend(newSubscription);
        console.log('Successfully subscribed to push notifications!');

        return true;
    } catch (error) {
        console.error('Failed to subscribe to push notifications:', error);
        return false;
    }
}

/**
 * Unsubscribes the user from Web Push
 */
export async function unsubscribeFromPushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            // Stop push on browser side
            const successful = await subscription.unsubscribe();

            if (successful) {
                // Stop push on server side
                await removeSubscriptionFromBackend(subscription.endpoint);
                console.log('Successfully unsubscribed from push notifications.');
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Error during push unsubscribe:', error);
        return false;
    }
}

/**
 * Check current push subscription status
 */
export async function checkPushSubscriptionStatus() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return false;
    }

    if (Notification.permission !== 'granted') {
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        return !!subscription;
    } catch (error) {
        return false;
    }
}

// API Helpers
async function sendSubscriptionToBackend(subscription: PushSubscription) {
    try {
        await api.post('/notifications/push/subscribe', subscription);
    } catch (error) {
        console.error('Failed to send push subscription to backend:', error);
        throw error;
    }
}

async function removeSubscriptionFromBackend(endpoint: string) {
    try {
        await api.post('/notifications/push/unsubscribe', { endpoint });
    } catch (error) {
        console.error('Failed to remove push subscription from backend:', error);
        throw error;
    }
}
