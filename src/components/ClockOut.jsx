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
const shiftTypes = ['7:00-15:30', '8:00-16:30', '10:00-18:30', '13:30-22:00', '15:00-23:30', '16:00-00:30']
const BASE = 'http://localhost:3000'

export default function ClockOut() {
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
            const res = await fetch(`${BASE}/api/staff-auth`, {
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
            const res = await fetch(`${BASE}/api/org-config`, {
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

    async function handleClockOut(e) {
        e.preventDefault()
        if (!orgCoords?.lat || !orgCoords?.lng) {
            showSnack('Organisation HQ coordinates not set. Contact your manager.', 'error')
            return
        }

        setLoading(true)
        showSnack('Verifying your location…', 'info')

        let pos
        try {
            pos = await getPosition()
        } catch {
            setLoading(false)
            showSnack('Could not get your location. Please enable GPS and try again.', 'error')
            return
        }

        const { latitude, longitude, accuracy } = pos.coords

        if (accuracy > 35) {
            setLoading(false)
            showSnack(`Location accuracy too low (${Math.round(accuracy)}m). Move to an open area and try again.`, 'warning')
            return
        }

        // Geo-fence check (±0.01° wider tolerance for clock-out)
        const tolerance = 0.01
        const withinLat = latitude >= orgCoords.lat - tolerance && latitude <= orgCoords.lat + tolerance
        const withinLng = longitude >= orgCoords.lng - tolerance && longitude <= orgCoords.lng + tolerance

        if (!withinLat || !withinLng) {
            setLoading(false)
            showSnack('You are outside the work premises. Clock-out is only allowed on-site.', 'error')
            return
        }

        // Verify clocked in today
        try {
            const clockInsRes = await fetch(`${BASE}/api/view-all-clockins/${currentUser._id}`, {
                headers: { authorization: `Bearer ${token}` }
            })
            const clockIns = await clockInsRes.json()

            if (!clockInsRes.ok || clockIns.length === 0) {
                setLoading(false)
                navigate('/dashboard?message=You have not clocked in today')
                return
            }

            const lastClockIn = clockIns[clockIns.length - 1]
            const today = new Date()
            const clockInDate = new Date(lastClockIn.dateClockedIn)

            if (today.getDate() !== clockInDate.getDate() ||
                today.getMonth() !== clockInDate.getMonth() ||
                today.getFullYear() !== clockInDate.getFullYear()) {
                setLoading(false)
                navigate('/dashboard?message=You have not clocked in today')
                return
            }

            // Late/early check — diffMs positive = clocked out after shift end = late
            const [shiftStart, shiftEnd] = shift.split('-')
            const [endH, endM] = shiftEnd.split(':').map(Number)
            const shiftEndTime = new Date()
            shiftEndTime.setHours(endH, endM, 0, 0)
            const diffMs = today - shiftEndTime
            const isLate = diffMs > 0
            const absDiff = Math.abs(diffMs)
            const diffH = Math.floor(absDiff / (1000 * 60 * 60))
            const diffMin = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60))

            const data = {
                startOfShift: shiftStart,
                endOfShift: shiftEnd,
                timeClockedOut: today.toLocaleTimeString(),
                dateClockedOut: today.toDateString(),
                isLate,
                clockInId: lastClockIn._id
            }

            const res = await fetch(`${BASE}/api/staff-clock-out`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
                body: JSON.stringify(data)
            })

            if (res.ok) {
                const msg = isLate
                    ? `Clocked out — ${diffH}h ${diffMin}m late. See you next time!`
                    : `Clocked out — ${diffH}h ${diffMin}m early. Great work today!`
                showSnack(msg, isLate ? 'warning' : 'success')
                setTimeout(() => navigate('/dashboard?message=Clock Out Successful'), 2500)
            } else {
                const body = await res.json()
                showSnack(body.message || 'Clock-out failed. Please try again.', 'error')
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

                    <AccessTimeIcon sx={{ fontSize: 56, color: '#dc2626', mb: 1 }} />
                    <Typography variant="h4" fontWeight={800} color={BLUE} gutterBottom>Clock Out</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                        Select your shift and confirm your location to clock out.
                    </Typography>

                    <form onSubmit={handleClockOut}>
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
                            sx={{ bgcolor: '#dc2626', py: 1.8, fontWeight: 700, fontSize: 16, borderRadius: 2, textTransform: 'none', '&:hover': { bgcolor: '#b91c1c' } }}
                        >
                            {loading ? <CircularProgress size={22} color="inherit" /> : 'Clock Out'}
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
