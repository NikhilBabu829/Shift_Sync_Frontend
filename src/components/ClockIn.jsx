import * as faceapi from 'face-api.js'
import apiFetch from '../utils/apiFetch.js'
import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import {
    Box, Button, Container, Typography,
    Snackbar, Alert, CircularProgress,
    AppBar, Toolbar, Chip
} from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import FaceIcon from '@mui/icons-material/Face'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'

// Brand colour token
const BLUE = '#1a3a6b'
// Backend base URL from the environment
const BASE = import.meta.env.VITE_API_BASE_URL
// Path where face-api.js model weights are served from the public folder
const MODEL_URL = '/models'

// GPS-verified, face-authenticated clock-in page for staff
export default function ClockIn() {
    const navigate = useNavigate()
    // JWT stored after Google OAuth login
    const token = localStorage.getItem('aes52')
    // Ref to the <video> element used for the live camera preview
    const videoRef = useRef(null)
    // Ref to the MediaStream so tracks can be stopped on unmount
    const streamRef = useRef(null)
    // Ref to the setTimeout handle for the live face-detection polling loop
    const liveDetectionTimer = useRef(null)

    // Authenticated staff profile loaded on mount
    const [currentUser, setCurrentUser] = useState(null)
    // Organisation HQ lat/lng (legacy fallback) used for the geo-fence check
    const [orgCoords, setOrgCoords] = useState(null)
    // Array of named site locations for multi-site geo-fencing; falls back to orgCoords if empty
    const [orgLocations, setOrgLocations] = useState([])
    // Organisation display name shown in the location chip
    const [orgName, setOrgName] = useState('')
    // Today's assigned shift from the roster; undefined = still loading, null = no shift today
    const [todayShift, setTodayShift] = useState(undefined) // undefined = loading, null = no shift
    // True while the clock-in API call is in flight
    const [loading, setLoading] = useState(false)
    // Descriptive status text shown inside the loading button
    const [loadingStep, setLoadingStep] = useState('')
    // False until all initial data fetches complete; prevents flashing an empty page
    const [pageReady, setPageReady] = useState(false)
    // Controls the bottom snackbar notification
    const [snack, setSnack] = useState({ open: false, msg: '', severity: 'info' })

    // Whether the face-api.js model weights have finished loading
    const [faceModelsLoaded, setFaceModelsLoaded] = useState(false)
    // Whether the user has a stored face descriptor (enrolled)
    const [faceEnrolled, setFaceEnrolled] = useState(false)
    // True once the camera stream is attached to the video element and playing
    const [cameraReady, setCameraReady] = useState(false)
    // Updated every 700ms by the live detection loop — true when a face is visible
    const [faceInFrame, setFaceInFrame] = useState(false)   // live detection result

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
                // A face descriptor is a Float32Array of exactly 128 values
                setFaceEnrolled(Array.isArray(data.user?.faceDescriptor) && data.user.faceDescriptor.length === 128)
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

    // Fetches the staff member's shift for today from the roster
    async function fetchTodayShift() {
        try {
            const res = await apiFetch(`${BASE}/api/my-shift-today`, {
                headers: { authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setTodayShift(data.shift) // null if no shift today
            } else {
                setTodayShift(null)
            }
        } catch {
            setTodayShift(null)
        }
    }

    // Downloads and initialises the three face-api.js neural network models from the public folder
    async function loadFaceModels() {
        try {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ])
            setFaceModelsLoaded(true)
        } catch {
            // Model loading failure doesn't block clock-in
        }
    }

    // Lightweight live detection loop — no descriptor, just presence check.
    // Runs every 700ms to give the user instant "face in frame" feedback.
    async function runLiveDetection() {
        if (!videoRef.current || !faceModelsLoaded) return
        try {
            const result = await faceapi.detectSingleFace(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4, inputSize: 160 })
            )
            setFaceInFrame(!!result)
        } catch { /* ignore */ }
        liveDetectionTimer.current = setTimeout(runLiveDetection, 700)
    }

    // On mount: check auth then kick off org config, model loading, and shift fetching in parallel
    useEffect(() => {
        if (!token) { navigate('/staff-login?message=Please login to continue'); return }
        ;(async () => {
            const authed = await checkAuth()
            if (authed) await Promise.all([fetchOrgConfig(), loadFaceModels(), fetchTodayShift()])
            setPageReady(true)
        })()
        return () => {
            // Stop camera tracks and clear the detection timer on unmount
            streamRef.current?.getTracks().forEach(t => t.stop())
            clearTimeout(liveDetectionTimer.current)
        }
    }, [])

    // Start the camera stream only after both faceEnrolled is confirmed (so the
    // video element is in the DOM) and models are loaded. Previously this ran
    // before React re-rendered with faceEnrolled=true, so videoRef.current was
    // null and the stream was never attached.
    useEffect(() => {
        if (!faceEnrolled || !faceModelsLoaded) return
        let cancelled = false
        ;(async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
                if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
                streamRef.current = stream
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    // onloadedmetadata fires asynchronously for new streams, but
                    // guard against the edge case where metadata is already present.
                    if (videoRef.current.readyState >= 1) {
                        videoRef.current.play()
                        setCameraReady(true)
                    } else {
                        videoRef.current.onloadedmetadata = () => {
                            if (cancelled) return
                            videoRef.current.play()
                            setCameraReady(true)
                        }
                    }
                }
            } catch {
                // Camera failure doesn't block clock-in
            }
        })()
        return () => { cancelled = true }
    }, [faceEnrolled, faceModelsLoaded])

    // Start the live detection loop once the camera is ready
    useEffect(() => {
        if (cameraReady && faceModelsLoaded) {
            runLiveDetection()
        }
        return () => clearTimeout(liveDetectionTimer.current)
    }, [cameraReady, faceModelsLoaded])

    // Wraps navigator.geolocation.getCurrentPosition in a Promise for async/await use
    function getPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true, timeout: 8000, maximumAge: 0
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
        const R = 6371e3
        const p1 = lat1 * Math.PI / 180, p2 = lat2 * Math.PI / 180
        const dp = (lat2 - lat1) * Math.PI / 180, dl = (lon2 - lon1) * Math.PI / 180
        const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2
        return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
    }

    // Attempts up to 5 face-api.js detections on the video feed, returning the 128-element descriptor or null
    async function captureFaceDescriptor() {
        if (!faceModelsLoaded || !cameraReady || !videoRef.current) return null
        // Retry up to 5 times with 600ms between attempts — all within the GPS
        // polling window (3s), so retries add zero wait time for the user.
        for (let attempt = 0; attempt < 5; attempt++) {
            try {
                const detection = await faceapi
                    .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.45 }))
                    .withFaceLandmarks(true)
                    .withFaceDescriptor()
                if (detection) return Array.from(detection.descriptor)
            } catch { /* try next attempt */ }
            if (attempt < 4) await new Promise(r => setTimeout(r, 600))
        }
        return null
    }

    // Main clock-in handler: validates org locations, collects GPS + face in parallel, runs spoof checks, then posts to backend
    async function handleClockIn(e) {
        e.preventDefault()
        // Build effective site list: prefer named locations array, fall back to legacy HQ coord
        const effectiveLocations = orgLocations.length > 0
            ? orgLocations
            : (orgCoords?.lat && orgCoords?.lng ? [{ name: 'HQ', ...orgCoords }] : [])
        if (effectiveLocations.length === 0) {
            showSnack('No site locations configured. Contact your manager.', 'error')
            return
        }
        if (!navigator.geolocation) {
            showSnack('Geolocation is not supported by your browser.', 'error')
            return
        }

        setLoading(true)
        setLoadingStep('Verifying location & face…')

        // ── Run GPS collection and face capture in parallel ──────────────
        // Face descriptor takes ~0.5–1s; GPS takes ~3s. Running together
        // means face adds zero extra time to the user-perceived wait.
        let polls, faceDescriptor
        try {
            const [gpsResult, faceResult] = await Promise.allSettled([
                collectGPSPolls(3, 1500),
                captureFaceDescriptor()
            ])

            if (gpsResult.status === 'rejected') {
                const code = gpsResult.reason?.code
                if (code === 1) showSnack('Location permission denied. Please allow location access.', 'error')
                else if (code === 2) showSnack('Location unavailable. Make sure GPS is enabled.', 'error')
                else if (code === 3) showSnack('Location timed out. Move to an area with better GPS signal.', 'error')
                else showSnack('Could not get your location. Please enable GPS and try again.', 'error')
                setLoading(false)
                setLoadingStep('')
                return
            }

            polls = gpsResult.value
            faceDescriptor = faceResult.status === 'fulfilled' ? faceResult.value : null
        } catch {
            showSnack('Unexpected error during verification. Please try again.', 'error')
            setLoading(false)
            setLoadingStep('')
            return
        }

        // ── GPS spoof checks ─────────────────────────────────────────────
        // Identical readings across all polls suggests a static mock location app
        const isIdentical = polls.length === 3 && polls.every(p => p.lat === polls[0].lat && p.lng === polls[0].lng)
        if (isIdentical) {
            setLoading(false)
            setLoadingStep('')
            showSnack('Spoofed location detected. Please disable mock location tools.', 'error')
            return
        }

        // Impossible speed between first and last poll also indicates spoofing
        if (polls.length === 3) {
            const distMeters = haversineDistance(polls[0].lat, polls[0].lng, polls[2].lat, polls[2].lng)
            const timeSecs = (polls[2].timestamp - polls[0].timestamp) / 1000
            if (timeSecs > 0 && (distMeters / timeSecs) * 3.6 > 100 && distMeters > 50) {
                setLoading(false)
                setLoadingStep('')
                showSnack('Spoofed location detected (impossible speed). Please disable mock location tools.', 'error')
                return
            }
        }

        // Geo-fence check: staff must be within ±0.001° (~100m) of at least one site location
        const primary = polls[0]
        const tolerance = 0.001
        const withinAnySite = effectiveLocations.some(loc =>
            primary.lat >= loc.lat - tolerance && primary.lat <= loc.lat + tolerance &&
            primary.lng >= loc.lng - tolerance && primary.lng <= loc.lng + tolerance
        )
        if (!withinAnySite) {
            setLoading(false)
            setLoadingStep('')
            showSnack('You are outside all work premises. Clock-in is only allowed on-site.', 'error')
            return
        }

        if (faceEnrolled && !faceDescriptor) {
            showSnack('Face not detected — proceeding without face verification.', 'warning')
        }

        // ── Build payload — shift times come from the roster, not user selection ──
        const now = new Date()
        const [startH, startM] = todayShift.shift_start_time.split(':').map(Number)
        const shiftStartTime = new Date()
        shiftStartTime.setHours(startH, startM, 0, 0)
        // Positive diffMs means clocking in after the shift start = late
        const diffMs = now - shiftStartTime
        const isLate = diffMs > 0
        const absDiff = Math.abs(diffMs)
        const diffH = Math.floor(absDiff / (1000 * 60 * 60))
        const diffMin = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60))

        // Include faceDescriptor only if one was captured
        const data = {
            gpsCoordinates: polls,
            ...(faceDescriptor && { faceDescriptor })
        }

        setLoadingStep('Clocking you in…')
        try {
            const res = await apiFetch(`${BASE}/api/staff-clock-in`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
                body: JSON.stringify(data)
            })
            if (res.ok) {
                const body = await res.json()

                // Weak face match — ask the staff member to re-clock, do not proceed to dashboard
                if (body.requiresReclock) {
                    const fv = body.faceVerification
                    showSnack(
                        `Face matched but confidence is low (distance: ${fv?.distance?.toFixed(3)}). Please re-position your face and try again.`,
                        'warning'
                    )
                    setLoading(false)
                    setLoadingStep('')
                    return
                }

                // Compose a late/early message based on the diff from shift start
                const msg = isLate
                    ? `Clocked in — ${diffH}h ${diffMin}m late.`
                    : `Clocked in — ${diffH}h ${diffMin}m early. Have a great shift!`
                showSnack(msg, isLate ? 'warning' : 'success')

                // Show additional face verification outcome from the backend
                const fv = body.faceVerification
                if (fv?.registered && fv?.isVerified === true) {
                    showSnack(`Face verified ✓ (distance: ${fv.distance?.toFixed(3)})`, 'success')
                } else if (fv?.registered && fv?.isVerified === null) {
                    showSnack('Face enrolled but no descriptor was captured this session.', 'info')
                }

                if (body.gpsWarning) showSnack('GPS anomaly flagged — your manager has been notified.', 'warning')
                // Wait for the user to read the snack before navigating away
                setTimeout(() => navigate('/dashboard'), 2500)
            } else {
                const body = await res.json()
                if (body.faceMismatch) {
                    showSnack('Face verification failed. Your manager has been notified. Clock-in denied.', 'error')
                } else {
                    showSnack(body.message || 'Clock-in failed. Please try again.', 'error')
                }
            }
        } catch {
            showSnack('Could not reach the server. Please try again.', 'error')
        } finally {
            setLoading(false)
            setLoadingStep('')
        }
    }

    // Stops the camera stream, clears the detection timer, removes the JWT, and navigates home
    function handleLogout() {
        streamRef.current?.getTracks().forEach(t => t.stop())
        clearTimeout(liveDetectionTimer.current)
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
                    <Button variant="text" startIcon={<LogoutIcon />}
                        sx={{ color: 'rgba(255,255,255,0.75)', textTransform: 'none' }} onClick={handleLogout}>
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>

            <Container maxWidth="sm" sx={{ py: 8 }}>
                <Box sx={{ bgcolor: '#fff', borderRadius: 4, border: '1px solid #e2e8f0', p: 5, textAlign: 'center', boxShadow: '0 4px 24px rgba(26,58,107,0.07)' }}>

                    {/* Org location indicator */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 3 }}>
                        <LocationOnIcon sx={{ color: BLUE, fontSize: 18 }} />
                        <Typography variant="body2" color="text.secondary">{orgName || 'Your Organisation'}</Typography>
                        {/* Green chip showing site count, red if no locations configured */}
                        {(orgLocations.length > 0 || orgCoords?.lat)
                            ? <Chip
                                label={orgLocations.length > 1 ? `${orgLocations.length} sites` : 'Location set'}
                                size="small"
                                sx={{ bgcolor: '#dcfce7', color: '#16a34a', fontWeight: 700, fontSize: 10 }}
                              />
                            : <Chip label="No location" size="small" sx={{ bgcolor: '#fee2e2', color: '#dc2626', fontWeight: 700, fontSize: 10 }} />
                        }
                    </Box>

                    <AccessTimeIcon sx={{ fontSize: 56, color: BLUE, mb: 1 }} />
                    <Typography variant="h4" fontWeight={800} color={BLUE} gutterBottom>Clock In</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Select your shift and confirm your location to clock in.
                    </Typography>

                    {/* Camera preview — only rendered if the user has enrolled their face */}
                    {faceEnrolled && (
                        <Box sx={{ mb: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                                <FaceIcon sx={{ fontSize: 16, color: BLUE }} />
                                <Typography variant="caption" fontWeight={600} color={BLUE}>Face Verification</Typography>
                                {/* Live chip updates on every detection poll */}
                                {cameraReady
                                    ? <Chip
                                        label={faceInFrame ? 'Face detected ✓' : 'No face in frame'}
                                        size="small"
                                        icon={faceInFrame ? <CheckCircleOutlineIcon sx={{ fontSize: '12px !important' }} /> : undefined}
                                        sx={{
                                            bgcolor: faceInFrame ? '#dcfce7' : '#fef9c3',
                                            color: faceInFrame ? '#16a34a' : '#92400e',
                                            fontWeight: 700, fontSize: 10,
                                            transition: 'all 0.3s'
                                        }}
                                    />
                                    : <Chip label="Loading…" size="small" sx={{ bgcolor: '#f3f4f6', color: '#6b7280', fontSize: 10 }} />
                                }
                            </Box>
                            {/* Camera feed container — border turns green when a face is detected */}
                            <Box sx={{
                                position: 'relative', width: '100%', maxWidth: 240, mx: 'auto',
                                borderRadius: 2, overflow: 'hidden', bgcolor: '#111', aspectRatio: '4/3',
                                border: faceInFrame ? '2px solid #16a34a' : cameraReady ? '2px solid #e5e7eb' : '2px solid #e5e7eb',
                                transition: 'border-color 0.3s'
                            }}>
                                {/* Mirror the video horizontally so the preview feels natural */}
                                <video ref={videoRef} autoPlay muted playsInline
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraReady ? 'block' : 'none', transform: 'scaleX(-1)' }} />
                                {/* Spinner overlay while waiting for the camera to initialise */}
                                {!cameraReady && (
                                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CircularProgress size={24} sx={{ color: '#fff' }} />
                                    </Box>
                                )}
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                Face is captured automatically when you clock in.
                            </Typography>
                        </Box>
                    )}

                    {/* Warning banner if face is not enrolled — clock-in still works without it */}
                    {!faceEnrolled && (
                        <Alert severity="warning" sx={{ mb: 3, textAlign: 'left' }}>
                            Face not enrolled — clock-in will proceed without face verification.{' '}
                            <Box component="span" sx={{ cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
                                onClick={() => navigate('/face-enroll')}>
                                Enrol now
                            </Box>
                        </Alert>
                    )}

                    {/* Today's assigned shift — shows loading, no-shift, or shift times with window info */}
                    {todayShift === undefined ? (
                        // Still fetching shift data
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                            <CircularProgress size={20} />
                        </Box>
                    ) : todayShift === null ? (
                        // No shift assigned for today
                        <Box sx={{ mb: 3, p: 2, bgcolor: '#fef2f2', borderRadius: 2, border: '1px solid #fecaca' }}>
                            <Typography variant="body2" fontWeight={600} color="#dc2626" gutterBottom>
                                No shift scheduled for today
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Contact your manager if you believe this is an error.
                            </Typography>
                        </Box>
                    ) : (() => {
                        // Compute the clock-in window — opens 30 minutes before shift start
                        const [startH, startM] = todayShift.shift_start_time.split(':').map(Number)
                        const openAt = new Date()
                        openAt.setHours(startH, startM - 30, 0, 0)
                        const windowOpen = new Date() >= openAt
                        const opensStr = openAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        return (
                            <Box sx={{ mb: 3 }}>
                                <Box sx={{ p: 2, bgcolor: '#f0f9ff', borderRadius: 2, border: '1px solid #bae6fd', mb: windowOpen ? 0 : 1.5 }}>
                                    <Typography variant="caption" fontWeight={700} color="#0369a1" sx={{ display: 'block', mb: 0.5 }}>
                                        Today's Shift
                                    </Typography>
                                    <Typography variant="h6" fontWeight={800} color={BLUE}>
                                        {todayShift.shift_start_time} – {todayShift.shift_end_time}
                                    </Typography>
                                </Box>
                                {/* Inform the user when the clock-in button will become enabled */}
                                {!windowOpen && (
                                    <Box sx={{ p: 1.5, bgcolor: '#fffbeb', borderRadius: 2, border: '1px solid #fde68a', mt: 1 }}>
                                        <Typography variant="caption" fontWeight={600} color="#92400e">
                                            Clock-in opens at {opensStr} (30 min before shift)
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        )
                    })()}

                    <form onSubmit={handleClockIn}>
                        {/* Button disabled if loading, org has no location, no shift, or the window hasn't opened */}
                        <Button type="submit" variant="contained" fullWidth size="large"
                            disabled={loading || (orgLocations.length === 0 && !orgCoords?.lat) || !todayShift || (() => {
                                if (!todayShift) return true
                                const [h, m] = todayShift.shift_start_time.split(':').map(Number)
                                const openAt = new Date()
                                openAt.setHours(h, m - 30, 0, 0)
                                return new Date() < openAt
                            })()}
                            sx={{ bgcolor: BLUE, py: 1.8, fontWeight: 700, fontSize: 16, borderRadius: 2, textTransform: 'none' }}>
                            {loading
                                ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <CircularProgress size={20} color="inherit" />
                                    <Typography variant="body2" fontWeight={600} color="inherit">{loadingStep}</Typography>
                                  </Box>
                                : 'Clock In'
                            }
                        </Button>
                    </form>

                    <Button variant="text" sx={{ mt: 2, color: 'text.secondary', textTransform: 'none' }}
                        onClick={() => navigate('/dashboard')}>
                        Cancel
                    </Button>
                </Box>
            </Container>

            {/* Bottom snackbar for GPS errors, face verification results, and clock-in outcome */}
            <Snackbar open={snack.open} autoHideDuration={4000}
                onClose={() => setSnack(s => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))} sx={{ width: '100%' }}>
                    {snack.msg}
                </Alert>
            </Snackbar>
        </Box>
    )
}
