import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Box, Typography, CircularProgress, Button, Paper } from '@mui/material'
import BlockIcon from '@mui/icons-material/Block'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import apiFetch from '../utils/apiFetch.js'

const BLUE   = '#1a3a6b'
const ACCENT = '#2563eb'
const BASE   = import.meta.env.VITE_API_BASE_URL

// Handles the shift swap decline link clicked by Staff B from their email.
// If not logged in, saves the swap ID and redirects to login first.
export default function DeclineSwap() {
    const { id }     = useParams()
    const navigate   = useNavigate()
    const [status, setStatus]   = useState('loading') // 'loading' | 'success' | 'error'
    const [message, setMessage] = useState('')

    useEffect(() => {
        const token = localStorage.getItem('aes52')

        if (!token) {
            localStorage.setItem('pendingSwapDeclineId', id)
            navigate('/staff-login?message=Please log in to decline the shift swap.')
            return
        }

        apiFetch(`${BASE}/api/staffB-declines/${id}`)
            .then(async (res) => {
                const data = await res.json()
                if (res.ok) {
                    setStatus('success')
                    setMessage(data.message || 'Swap request declined. The requester has been notified.')
                } else {
                    setStatus('error')
                    setMessage(data.message || 'Something went wrong. Please try again.')
                }
            })
            .catch(() => {
                setStatus('error')
                setMessage('Could not reach the server. Please check your connection and try again.')
            })
    }, [id])

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
            <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 3, p: { xs: 4, md: 6 }, maxWidth: 480, width: '100%', textAlign: 'center' }}>

                <Typography variant="h6" fontWeight={800} color={BLUE} sx={{ mb: 3 }}>
                    Shift Sync
                </Typography>

                {status === 'loading' && (
                    <>
                        <CircularProgress sx={{ color: ACCENT, mb: 2 }} />
                        <Typography variant="body1" color="text.secondary">
                            Declining shift swap request…
                        </Typography>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <BlockIcon sx={{ fontSize: 56, color: '#dc2626', mb: 2 }} />
                        <Typography variant="h6" fontWeight={700} color={BLUE} gutterBottom>
                            Swap Declined
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            {message}
                        </Typography>
                        <Button
                            variant="contained"
                            sx={{ bgcolor: BLUE, color: '#fff', textTransform: 'none', fontWeight: 600, borderRadius: 2, '&:hover': { bgcolor: '#142e58' } }}
                            onClick={() => navigate('/dashboard')}
                        >
                            Go to Dashboard
                        </Button>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <ErrorOutlineIcon sx={{ fontSize: 56, color: '#dc2626', mb: 2 }} />
                        <Typography variant="h6" fontWeight={700} color={BLUE} gutterBottom>
                            Something went wrong
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            {message}
                        </Typography>
                        <Button
                            variant="contained"
                            sx={{ bgcolor: BLUE, color: '#fff', textTransform: 'none', fontWeight: 600, borderRadius: 2, '&:hover': { bgcolor: '#142e58' } }}
                            onClick={() => navigate('/dashboard')}
                        >
                            Go to Dashboard
                        </Button>
                    </>
                )}

            </Paper>
        </Box>
    )
}
