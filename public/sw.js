self.addEventListener('push', (event) => {
    if (!event.data) return
    const data = event.data.json()
    event.waitUntil(
        self.registration.showNotification(data.title || 'Shift Sync', {
            body: data.body || '',
            icon: data.icon || '/vite.svg',
            badge: data.icon || '/vite.svg',
            tag: data.tag || 'shift-sync',
            renotify: true,
            data: { url: data.url || '/' }
        })
    )
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    const target = event.notification.data?.url || '/'
    const fullTarget = self.location.origin + target
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    // Navigate the existing window to the target URL, then focus it
                    client.navigate(fullTarget)
                    return client.focus()
                }
            }
            if (clients.openWindow) return clients.openWindow(fullTarget)
        })
    )
})
