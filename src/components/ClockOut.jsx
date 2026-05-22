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

// Brand colour token
const BLUE = '#1a3a6b'
// Available shift time windows the staff member can select when clocking out
const shiftTypes = ['7:00-15:30', '8:00-16:30', '10:00-18:30', '13:30-22:00', '15:00-23:30', '16:00-00:30']
// Backend base URL from the environment
const BASE = import.meta.env.VITE_API_BASE_URL

// GPS-verified clock-out page for staff
export default function ClockOut() {
    const navigate = useNavigate()
    // JWT stored after Google OAuth login
    const token = localStorage.getItem('aes52')

    // Authenticated staff profile loaded on mount
    const [currentUser, setCurrentUser] = useState(null)
    // Organisation HQ lat/lng (legacy fallback) used for the geo-fence check
    const [orgCoords, setOrgCoords] = useState(null)
    // Array of named site locations for multi-site geo-fencing; falls back to orgCoords if empty
    const [orgLocations, setOrgLocations] = useState([])
    // Organisation display name shown in the location chip
    const [orgName, setOrgName] = useState('')
    // The shift type the staff member selects before clocking out
    const [shift, setShift] = useState(shiftTypes[0])
    // True while the clock-out API call is in flight
    const [loading, setLoading] = useState(false)
    // False until auth and org config have loaded; prevents flashing an empty page
    const [pageReady, setPageReady] = useState(false)
    // Controls the bottom snackbar notification
    const [snack, setSnack] = useState({ open: false, msg: '', severity: 'info' })

    // Opens the bottom snackbar with a message and severity level
    function showSnack(msg, severity = 'info') {
        setSnack({ open: true, msg, severity })
    }

    // Validates the stored JWT and loads the staff profile; redirects to login on failure
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

    // Fetches organisation config including all site locations for geo-fencing
    async function fetchOrgConfig() {
        try {
            const res = await apiFetch(`${BASE}/api/org-config`, {
                headers: { authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setOrgCoords(data.hq_coordinates)
                setOrgLocations(data.locations || [])
                setOrgName(data.org_name)
            } else {
                showSnack('Could not load organisation location. Contact your manager.', 'warning')
            }
        } catch {
            showSnack('Could not load organisation config.', 'warning')
        }
    }

    // On mount: redirect if no token, then run auth check and org config fetch
    useEffect(() => {
        if (!token) { navigate('/staff-login?message=Please login to continue'); return }
        ;(async () => {
            const authed = await checkAuth()
            if (authed) await fetchOrgConfig()
            setPageReady(true)
        })()
    }, [])

    // Wraps navigator.geolocation.getCurrentPosition in a Promise for async/await use
    function getPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 0
            })
        })
    }

    // Collects multiple GPS readings spaced intervalMs apart to detect spoofed static coordinates
    async function collectGPSPolls(count = 3, intervalMs = 1500) {
        const polls = []
        for (let i = 0; i < count; i++) {
            const pos = await getPosition()
            polls.push({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, timestamp: Date.now() })
            if (i < count - 1) await new Promise(r => setTimeout(r, intervalMs))
        }
        return polls
    }

    // Returns the great-circle distance in metres between two lat/lng points
    function haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3;
        const p1 = lat1 * Math.PI/180;
        const p2 = lat2 * Math.PI/180;
        const dp = (lat2-lat1) * Math.PI/180;
        const dl = (lon2-lon1) * Math.PI/180;
        const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
        return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
    }

    // Main clock-out handler: collects GPS polls, runs spoof and geo-fence checks, validates a prior clock-in, then posts to backend
    async function handleClockOut(e) {
        e.preventDefault()
        // Build effective site list: prefer named locations array, fall back to legacy HQ coord
        const effectiveLocations = orgLocations.length > 0
            ? orgLocations
            : (orgCoords?.lat && orgCoords?.lng ? [{ name: 'HQ', ...orgCoords }] : [])
        if (effectiveLocations.length === 0) {
            showSnack('No site locations configured. Contact your manager.', 'error')
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
            // Map browser geolocation error codes to user-friendly messages
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

        // Spoof Detection Logic — identical readings across all polls indicates a static mock
        const isIdentical = polls.length === 3 && polls.every(p => p.lat === polls[0].lat && p.lng === polls[0].lng);
        if (isIdentical) {
            setLoading(false)
            showSnack('Spoofed location detected (static mock). Please disable VPN or mock location tools.', 'error')
            return
        }

        // Speed-based spoof check — movement faster than 100 km/h over 50m is physically impossible at desk-level
        if (polls.length === 3) {
            const distMeters = haversineDistance(polls[0].lat, polls[0].lng, polls[2].lat, polls[2].lng);
            const timeSecs = (polls[2].timestamp - polls[0].timestamp) / 1000;
            if (timeSecs > 0) {
                const speedKmph = (distMeters / timeSecs) * 3.6;
                if (speedKmph > 100 && distMeters > 50) {
                    setLoading(false)
                    showSnack('Spoofed location detected (impossible speed). Please disable VPN or mock location tools.', 'error')
                    return
                }
            }
        }

        const primary = polls[0]
        const { lat: latitude, lng: longitude, accuracy } = primary

        // Reject readings with too-low accuracy (likely indoors or obstructed GPS)
        if (accuracy > 35) {
            setLoading(false)
            showSnack(`Location accuracy too low (${Math.round(accuracy)}m). Move to an open area and try again.`, 'warning')
            return
        }

        // Geo-fence check (±0.01° wider tolerance for clock-out): must be within any site location
        const tolerance = 0.01
        const withinAnySite = effectiveLocations.some(loc =>
            latitude  >= loc.lat - tolerance && latitude  <= loc.lat + tolerance &&
            longitude >= loc.lng - tolerance && longitude <= loc.lng + tolerance
        )
        if (!withinAnySite) {
            setLoading(false)
            showSnack('You are outside all work premises. Clock-out is only allowed on-site.', 'error')
            return
        }

        // Verify clocked in today before allowing clock-out
        try {
            const clockInsRes = await apiFetch(`${BASE}/api/view-all-clockins/${currentUser._id}`, {
                headers: { authorization: `Bearer ${token}` }
            })
            const clockIns = await clockInsRes.json()

            if (!clockInsRes.ok || clockIns.length === 0) {
                setLoading(false)
                navigate('/dashboard?message=You have not clocked in today')
                return
            }

            // Only allow clock-out if the most recent clock-in was today
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

            // Late/early check — positive diffMs = clocking out after shift end = overtime
            const [shiftStart, shiftEnd] = shift.split('-')
            const [endH, endM] = shiftEnd.split(':').map(Number)
            const shiftEndTime = new Date()
            shiftEndTime.setHours(endH, endM, 0, 0)
            const diffMs = today - shiftEndTime
            const isLate = diffMs > 0
            const absDiff = Math.abs(diffMs)
            const diffH = Math.floor(absDiff / (1000 * 60 * 60))
            const diffMin = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60))

            // Build the clock-out payload linking back to today's clock-in record
            const data = {
                startOfShift: shiftStart,
                endOfShift: shiftEnd,
                timeClockedOut: today.toLocaleTimeString(),
                dateClockedOut: today.toDateString(),
                isLate,
                clockInId: lastClockIn._id
            }

            const res = await apiFetch(`${BASE}/api/staff-clock-out`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
                body: JSON.stringify(data)
            })

            if (res.ok) {
                // Show an early/late message then redirect to dashboard
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

    // Clears the JWT and navigates to the landing page
    function handleLogout() {
        localStorage.removeItem('aes52')
        localStorage.removeItem('userRole')
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
                    <Typography variant="h6" fontWeight={700} color="#fff" sx={{ cursor: "pointer" }} onClick={() => navigate("/dashboard")}>Shift Sync</Typography>
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

                    {/* Org location chip — green if HQ coordinates are set */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 3 }}>
                        <LocationOnIcon sx={{ color: BLUE, fontSize: 18 }} />
                        <Typography variant="body2" color="text.secondary">
                            {orgName || 'Your Organisation'}
                        </Typography>
                        {(orgLocations.length > 0 || orgCoords?.lat)
                            ? <Chip
                                label={orgLocations.length > 1 ? `${orgLocations.length} sites` : 'Location set'}
                                size="small"
                                sx={{ bgcolor: '#dcfce7', color: '#16a34a', fontWeight: 700, fontSize: 10 }}
                              />
                            : <Chip label="No location" size="small" sx={{ bgcolor: '#fee2e2', color: '#dc2626', fontWeight: 700, fontSize: 10 }} />
                        }
                    </Box>

                    <AccessTimeIcon sx={{ fontSize: 56, color: '#dc2626', mb: 1 }} />
                    <Typography variant="h4" fontWeight={800} color={BLUE} gutterBottom>Clock Out</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                        Select your shift and confirm your location to clock out.
                    </Typography>

                    <form onSubmit={handleClockOut}>
                        {/* Shift selector — used to compute late/early status against shift end time */}
                        <FormControl fullWidth sx={{ mb: 4 }}>
                            <FormLabel sx={{ textAlign: 'left', fontWeight: 600, color: BLUE, mb: 1 }}>Shift</FormLabel>
                            <Select value={shift} onChange={(e) => setShift(e.target.value)} size="small">
                                {shiftTypes.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                            </Select>
                        </FormControl>

                        {/* Submit button disabled while loading or when org HQ is not configured */}
                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            size="large"
                            disabled={loading || (orgLocations.length === 0 && !orgCoords?.lat)}
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

            {/* Bottom snackbar for GPS errors and clock-out outcome */}
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
