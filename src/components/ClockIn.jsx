import apiFetch from '../utils/apiFetch.js';
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
    Box, Button, Container, Typography, MenuItem, Select,
    FormControl, FormLabel, Snackbar, Alert, CircularProgress,
    AppBar, Toolbar, Chip
} from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import LocationOnIcon from '@mui/icons-material/LocationOn'

const BLUE = '#1a3a6b'
const shiftTypes = ['7:00-15:30', '8:00-16:30', '10:00-18:30', '13:30-22:00', '16:00-00:30']
const BASE = import.meta.env.VITE_API_BASE_URL

export default function ClockIn() {
    const navigate = useNavigate()
    const token = localStorage.getItem('aes52')

    const [currentUser, setCurrentUser] = useState(null)
    const [orgCoords, setOrgCoords] = useState(null)
    const [orgName, setOrgName] = useState('')
    const [shift, setShift] = useState(shiftTypes[0])
    const [loading, setLoading] = useState(false)
    const [pageReady, setPageReady] = useState(false)
    const [snack, setSnack] = useState({ open: false, msg: '', severity: 'info' })

    function showSnack(msg, severity = 'info') {
        setSnack({ open: true, msg, severity })
    }

    async function checkAuth() {
        try {
            const res = await apiFetch(`${BASE}/api/staff-auth`, {
                headers: { authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setCurrentUser(data.user)
                return true
            }
        } catch { /* fall through */ }
        navigate('/staff-login?message=Please login to continue')
        return false
    }

    async function fetchOrgConfig() {
        try {
            const res = await apiFetch(`${BASE}/api/org-config`, {
                headers: { authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setOrgCoords(data.hq_coordinates)
                setOrgName(data.org_name)
            } else {
                showSnack('Could not load organisation location. Contact your manager.', 'warning')
            }
        } catch {
            showSnack('Could not load organisation config.', 'warning')
        }
    }

    useEffect(() => {
        if (!token) { navigate('/staff-login?message=Please login to continue'); return }
        ;(async () => {
            const authed = await checkAuth()
            if (authed) await fetchOrgConfig()
            setPageReady(true)
        })()
    }, [])

    function getPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 0
            })
        })
    }

    async function collectGPSPolls(count = 3, intervalMs = 1500) {
        const polls = []
        for (let i = 0; i < count; i++) {
            const pos = await getPosition()
            polls.push({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, timestamp: Date.now() })
            if (i < count - 1) await new Promise(r => setTimeout(r, intervalMs))
        }
        return polls
    }

    async function handleClockIn(e) {
        e.preventDefault()
        if (!orgCoords?.lat || !orgCoords?.lng) {
            showSnack('Organisation HQ coordinates not set. Contact your manager.', 'error')
            return
        }

        setLoading(true)
        showSnack('Verifying your location…', 'info')

        if (!navigator.geolocation) {
            setLoading(false)
            showSnack('Geolocation is not supported by your browser.', 'error')
            return
        }

        let polls
        try {
            polls = await collectGPSPolls(3, 1500)
        } catch (err) {
            setLoading(false)
            const code = err?.code
            if (code === 1) {
                showSnack('Location permission denied. Please allow location access in your browser settings and try again.', 'error')
            } else if (code === 2) {
                showSnack('Location unavailable. Make sure GPS is enabled and you have a signal.', 'error')
            } else if (code === 3) {
                showSnack('Location request timed out. Move to an area with better GPS signal and try again.', 'error')
            } else {
                showSnack('Could not get your location. Please enable GPS and try again.', 'error')
            }
            return
        }

        const primary = polls[0]
        const tolerance = 0.001
        const withinLat = primary.lat >= orgCoords.lat - tolerance && primary.lat <= orgCoords.lat + tolerance
        const withinLng = primary.lng >= orgCoords.lng - tolerance && primary.lng <= orgCoords.lng + tolerance

        if (!withinLat || !withinLng) {
            setLoading(false)
            showSnack('You are outside the work premises. Clock-in is only allowed on-site.', 'error')
            return
        }

        const [shiftStart, shiftEnd] = shift.split('-')
        const [startH, startM] = shiftStart.split(':').map(Number)
        const shiftStartTime = new Date()
        shiftStartTime.setHours(startH, startM, 0, 0)
        const now = new Date()
        const diffMs = now - shiftStartTime
        const isLate = diffMs > 0
        const absDiff = Math.abs(diffMs)
        const diffH = Math.floor(absDiff / (1000 * 60 * 60))
        const diffMin = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60))

        const data = {
            startOfShift: shiftStart,
            endOfShift: shiftEnd,
            timeClockedIn: now.toLocaleTimeString(),
            dateClockedIn: now.toDateString(),
            isLate,
            gpsCoordinates: polls
        }

        try {
            const res = await apiFetch(`${BASE}/api/staff-clock-in`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
                body: JSON.stringify(data)
            })
            if (res.ok) {
                const msg = isLate
                    ? `Clocked in — ${diffH}h ${diffMin}m late.`
                    : `Clocked in — ${diffH}h ${diffMin}m early. Have a great shift!`
                showSnack(msg, isLate ? 'warning' : 'success')
                setTimeout(() => navigate('/dashboard'), 2500)
            } else {
                const body = await res.json()
                showSnack(body.message || 'Clock-in failed. Please try again.', 'error')
            }
        } catch {
            showSnack('Could not reach the server. Please try again.', 'error')
        } finally {
            setLoading(false)
        }
    }

    function handleLogout() {
        localStorage.removeItem('aes52')
        navigate('/')
    }

    if (!pageReady) {
        return (
            <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f0f4f8' }}>
                <CircularProgress />
            </Box>
        )
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f0f4f8' }}>
            <AppBar position="sticky" elevation={0} sx={{ bgcolor: BLUE }}>
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="h6" fontWeight={700} color="#fff">Shift Sync</Typography>
                    <Typography variant="body1" color="rgba(255,255,255,0.8)">
                        Hi, <Box component="span" fontWeight={700} color="#fff">{currentUser?.staffName}</Box>
                    </Typography>
                    <Button
                        variant="text"
                        startIcon={<LogoutIcon />}
                        sx={{ color: 'rgba(255,255,255,0.75)', textTransform: 'none' }}
                        onClick={handleLogout}
                    >
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>

            <Container maxWidth="sm" sx={{ py: 8 }}>
                <Box sx={{ bgcolor: '#fff', borderRadius: 4, border: '1px solid #e2e8f0', p: 5, textAlign: 'center', boxShadow: '0 4px 24px rgba(26,58,107,0.07)' }}>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 3 }}>
                        <LocationOnIcon sx={{ color: BLUE, fontSize: 18 }} />
                        <Typography variant="body2" color="text.secondary">
                            {orgName || 'Your Organisation'} HQ
                        </Typography>
                        {orgCoords?.lat
                            ? <Chip label="Location set" size="small" sx={{ bgcolor: '#dcfce7', color: '#16a34a', fontWeight: 700, fontSize: 10 }} />
                            : <Chip label="No location" size="small" sx={{ bgcolor: '#fee2e2', color: '#dc2626', fontWeight: 700, fontSize: 10 }} />
                        }
                    </Box>

                    <AccessTimeIcon sx={{ fontSize: 56, color: BLUE, mb: 1 }} />
                    <Typography variant="h4" fontWeight={800} color={BLUE} gutterBottom>Clock In</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                        Select your shift and confirm your location to clock in.
                    </Typography>

                    <form onSubmit={handleClockIn}>
                        <FormControl fullWidth sx={{ mb: 4 }}>
                            <FormLabel sx={{ textAlign: 'left', fontWeight: 600, color: BLUE, mb: 1 }}>Shift</FormLabel>
                            <Select value={shift} onChange={(e) => setShift(e.target.value)} size="small">
                                {shiftTypes.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                            </Select>
                        </FormControl>

                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            size="large"
                            disabled={loading || !orgCoords?.lat}
                            sx={{ bgcolor: BLUE, py: 1.8, fontWeight: 700, fontSize: 16, borderRadius: 2, textTransform: 'none' }}
                        >
                            {loading ? <CircularProgress size={22} color="inherit" /> : 'Clock In'}
                        </Button>
                    </form>

                    <Button
                        variant="text"
                        sx={{ mt: 2, color: 'text.secondary', textTransform: 'none' }}
                        onClick={() => navigate('/dashboard')}
                    >
                        Cancel
                    </Button>
                </Box>
            </Container>

            <Snackbar
                open={snack.open}
                autoHideDuration={4000}
                onClose={() => setSnack(s => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))} sx={{ width: '100%' }}>
                    {snack.msg}
                </Alert>
            </Snackbar>
        </Box>
    )
}
