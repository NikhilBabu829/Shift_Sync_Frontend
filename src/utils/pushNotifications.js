const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const raw = atob(base64)
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

/**
 * Registers the service worker, subscribes to Web Push using the server's VAPID key,
 * and saves the subscription to the backend. Role must be 'staff' or 'manager'.
 * Pass the auth token so the right endpoint is called.
 */
export async function registerPushNotifications(token, role = 'staff') {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready

        const keyRes = await fetch(`${BASE}/api/push-vapid-key`)
        const { publicKey } = await keyRes.json()

        const existing = await reg.pushManager.getSubscription()
        if (existing) await existing.unsubscribe()

        const subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
        })

        const endpoint = role === 'manager'
            ? `${BASE}/api/push-subscribe-manager`
            : `${BASE}/api/push-subscribe`

        await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ subscription })
        })
    } catch (err) {
        console.error('Push registration failed:', err)
    }
}
