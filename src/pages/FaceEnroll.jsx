import * as faceapi from 'face-api.js'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
    Box, Button, Typography, CircularProgress, Alert,
    LinearProgress, Chip
} from '@mui/material'
import FaceIcon from '@mui/icons-material/Face'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import apiFetch from '../utils/apiFetch.js'

// Path where face-api.js model weights are served from the public folder
const MODEL_URL = '/models'
// Backend base URL from the environment
const BASE = import.meta.env.VITE_API_BASE_URL
// Brand colour token
const BLUE = '#1a3a6b'

// One-time face enrolment page — captures a 128-element face descriptor and stores it on the staff profile
export default function FaceEnroll() {
    // Support arriving via a one-time invite token in the URL (e.g. from an email link)
    const [params] = useSearchParams()
    const tokenFromParams = params.get('token')
    const navigate = useNavigate()

    // Ref to the <video> element used for the live camera preview
    const videoRef = useRef(null)
    // Ref to the MediaStream so tracks can be stopped on unmount or success
    const streamRef = useRef(null)

    // Enrolment flow stage: init | camera | ready | capturing | success | error
    const [stage, setStage] = useState('init')   // init | camera | ready | capturing | success | error
    // Status message shown below the camera frame
    const [message, setMessage] = useState('')
    // True once all three face-api.js model networks have loaded
    const [modelsLoaded, setModelsLoaded] = useState(false)

    // On mount: handle invite token, redirect if no auth, then start model loading
    useEffect(() => {
        if (tokenFromParams) {
            // Swap any existing JWT for the invite token from the email link
            localStorage.removeItem('aes52')
            localStorage.setItem('aes52', tokenFromParams)
        } else if (!localStorage.getItem('aes52')) {
            navigate('/staff-login')
            return
        }
        loadModels()
        // Stop camera tracks when the component unmounts
        return () => stopCamera()
    }, [])

    // Downloads the three face-api.js neural network models then starts the camera
    async function loadModels() {
        setStage('init')
        setMessage('Loading face recognition models…')
        try {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ])
            setModelsLoaded(true)
            setMessage('Starting camera…')
            await startCamera()
        } catch {
            setStage('error')
            setMessage('Failed to load face recognition models. Please refresh and try again.')
        }
    }

    // Requests the front camera, attaches the stream to the video element, and sets stage to 'ready'
    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
            })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current.play()
                    setStage('ready')
                    setMessage('')
                }
            }
        } catch {
            setStage('error')
            setMessage('Camera access denied. Please allow camera permission in your browser and refresh.')
        }
    }

    // Stops all camera tracks to release the device
    function stopCamera() {
        streamRef.current?.getTracks().forEach(t => t.stop())
    }

    // Runs a single face detection on the live video feed, extracts the 128-element descriptor, and POSTs it to the backend
    async function captureAndEnrol() {
        if (stage !== 'ready' || !videoRef.current) return
        setStage('capturing')
        setMessage('Looking for your face…')

        try {
            const detection = await faceapi
                .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
                .withFaceLandmarks(true)
                .withFaceDescriptor()

            if (!detection) {
                setStage('ready')
                setMessage('No face detected. Make sure your face is well-lit and centred in the frame.')
                return
            }

            setMessage('Face detected — saving…')
            // Convert Float32Array descriptor to a plain array for JSON serialisation
            const descriptor = Array.from(detection.descriptor)
            const token = localStorage.getItem('aes52')

            const res = await apiFetch(`${BASE}/api/register-face`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
                body: JSON.stringify({ faceDescriptor: descriptor })
            })

            if (res.ok) {
                stopCamera()
                setStage('success')
                setMessage('Face enrolled successfully.')
                // Brief pause so the success overlay is visible before navigating away
                setTimeout(() => navigate('/dashboard'), 2200)
            } else {
                const data = await res.json()
                setStage('ready')
                setMessage(data.message || 'Enrolment failed. Please try again.')
            }
        } catch {
            setStage('ready')
            setMessage('Something went wrong during capture. Please try again.')
        }
    }

    // Lets the user defer face enrolment and continue to the dashboard without enrolling
    function skip() {
        stopCamera()
        navigate('/dashboard')
    }

    // Convenience booleans derived from stage to simplify conditional rendering
    const isLoading = stage === 'init' || stage === 'camera'
    const isCapturing = stage === 'capturing'
    const isSuccess = stage === 'success'
    const isError = stage === 'error'
    const isReady = stage === 'ready'

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
            <Box sx={{ bgcolor: '#fff', borderRadius: 4, p: { xs: 3, sm: 5 }, maxWidth: 500, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(26,58,107,0.08)' }}>

                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <Box sx={{ bgcolor: '#eff6ff', borderRadius: '50%', p: 2, display: 'flex' }}>
                        <FaceIcon sx={{ fontSize: 40, color: BLUE }} />
                    </Box>
                </Box>

                <Typography variant="h5" fontWeight={800} color={BLUE} gutterBottom>
                    Face Enrolment
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    One-time setup. We use your face to verify your identity at clock-in — no image is stored, only a numeric descriptor.
                </Typography>

                {/* Camera frame — border highlights blue when the camera is live and ready */}
                <Box sx={{
                    position: 'relative', width: '100%', borderRadius: 3, overflow: 'hidden',
                    mb: 3, bgcolor: '#111', aspectRatio: '4/3',
                    border: isReady ? '3px solid #2563eb' : '3px solid transparent',
                    transition: 'border-color 0.3s'
                }}>
                    {/* Mirror the video so the preview feels like a selfie camera */}
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: (isReady || isCapturing || isSuccess) ? 'block' : 'none', transform: 'scaleX(-1)' }}
                    />

                    {/* Spinner + status text overlaid on the dark background while models load or capture runs */}
                    {(isLoading || isCapturing) && (
                        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                            <CircularProgress sx={{ color: '#fff' }} />
                            <Typography variant="caption" color="rgba(255,255,255,0.8)">{message}</Typography>
                        </Box>
                    )}

                    {/* Success overlay with checkmark once the descriptor is saved */}
                    {isSuccess && (
                        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(22,163,74,0.85)', gap: 1 }}>
                            <CheckCircleIcon sx={{ fontSize: 56, color: '#fff' }} />
                            <Typography variant="body1" fontWeight={700} color="#fff">Face enrolled!</Typography>
                        </Box>
                    )}

                    {/* "Camera live" badge when the stream is active and detection is possible */}
                    {isReady && (
                        <Chip
                            label="Camera live"
                            size="small"
                            sx={{ position: 'absolute', top: 10, right: 10, bgcolor: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 10 }}
                        />
                    )}
                </Box>

                {/* Loading progress bar shown while model weights are downloading */}
                {isLoading && <LinearProgress sx={{ mb: 2, borderRadius: 2 }} />}

                {/* Status or error message shown below the camera when idle */}
                {message && !isLoading && !isCapturing && (
                    <Alert
                        severity={isError ? 'error' : isSuccess ? 'success' : 'info'}
                        sx={{ mb: 2, textAlign: 'left' }}
                    >
                        {message}
                    </Alert>
                )}

                {/* Primary action button — enabled only when the camera is live and ready */}
                <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    disabled={!isReady}
                    onClick={captureAndEnrol}
                    sx={{ bgcolor: BLUE, py: 1.8, fontWeight: 700, borderRadius: 2, textTransform: 'none', mb: 1.5, '&:hover': { bgcolor: '#142e58' } }}
                >
                    {isCapturing ? <CircularProgress size={22} color="inherit" /> : 'Capture & Enrol'}
                </Button>

                {/* Skip link — face verification simply won't apply at clock-in if skipped */}
                <Button
                    variant="text"
                    fullWidth
                    onClick={skip}
                    disabled={isCapturing || isSuccess}
                    sx={{ color: 'text.secondary', textTransform: 'none', fontSize: 13 }}
                >
                    Skip for now — face verification won't apply at clock-in
                </Button>
            </Box>
        </Box>
    )
}
