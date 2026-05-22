import { io } from 'socket.io-client'

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

let socket = null

export function getSocket() {
    if (!socket) {
        socket = io(BASE, { withCredentials: true, autoConnect: false })
    }
    return socket
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect()
        socket = null
    }
}
