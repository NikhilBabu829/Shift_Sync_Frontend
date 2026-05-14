import { useState } from 'react'
import {
  Box, Button, Typography, TextField, Snackbar,
  InputAdornment, CircularProgress, Divider, Checkbox, FormControlLabel
} from '@mui/material'
import {
  Business, Person, Email, Lock, MyLocation,
  GridView, AccessTime, PeopleAlt, CheckCircle, ArrowForward
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import * as EmailValidator from 'email-validator'

const BLUE = '#1a3a6b'
const ACCENT = '#2563eb'

const features = [
  { icon: <GridView sx={{ fontSize: 20 }} />, title: 'Intuitive Rostering', desc: 'Design complex schedules with visual precision and zero friction.' },
  { icon: <AccessTime sx={{ fontSize: 20 }} />, title: 'Real-time Attendance', desc: 'Verify staff presence with geographic and temporal accuracy.' },
  { icon: <PeopleAlt sx={{ fontSize: 20 }} />, title: 'Central Directory', desc: 'A single source of truth for all organisational hierarchy and data.' },
]

export default function Register() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    org_name: '', first_name: '', last_name: '',
    email: '', password: '', hq_lat: '', hq_lng: ''
  })
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [snack, setSnack] = useState({ open: false, msg: '' })

  function set(field) {
    return (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  function showSnack(msg) {
    setSnack({ open: true, msg })
  }

  function useMyLocation() {
    if (!navigator.geolocation) { showSnack('Geolocation not supported by your browser.'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(prev => ({
          ...prev,
          hq_lat: pos.coords.latitude.toFixed(6),
          hq_lng: pos.coords.longitude.toFixed(6)
        }))
        setLocating(false)
      },
      () => { showSnack('Could not get location. Enter coordinates manually.'); setLocating(false) }
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.org_name.trim()) { showSnack('Organisation name is required.'); return }
    if (!form.first_name.trim()) { showSnack('Manager first name is required.'); return }
    if (!form.last_name.trim()) { showSnack('Manager last name is required.'); return }
    if (!EmailValidator.validate(form.email)) { showSnack('Please enter a valid email address.'); return }
    if (form.password.length < 8) { showSnack('Password must be at least 8 characters.'); return }
    if (!form.hq_lat || !form.hq_lng) { showSnack('HQ coordinates are required. Use the location button or enter them manually.'); return }
    if (isNaN(parseFloat(form.hq_lat))) { showSnack('Latitude must be a valid number.'); return }
    if (isNaN(parseFloat(form.hq_lng))) { showSnack('Longitude must be a valid number.'); return }
    if (!agreed) { showSnack('Please agree to the Terms of Service to continue.'); return }

    setLoading(true)
    try {
      const res = await fetch('http://localhost:3000/api/manager-sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          password: form.password,
          org_name: form.org_name,
          hq_lat: form.hq_lat,
          hq_lng: form.hq_lng
        })
      })
      const data = await res.json()
      if (res.ok) {
        navigate('/manager-login?msg=Organisation registered! Please log in.')
      } else {
        showSnack(data.message || 'Registration failed. Please try again.')
      }
    } catch (err) {
      console.error('[Register] fetch error:', err)
      showSnack('Could not reach the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f0f4f8', display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid #e2e8f0', px: { xs: 3, md: 6 }, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography
          variant="h6" fontWeight={700} color={BLUE} sx={{ cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          Shift Sync
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">Already have an account?</Typography>
          <Button variant="text" sx={{ color: ACCENT, fontWeight: 600, textTransform: 'none' }} onClick={() => navigate('/manager-login')}>
            Log In
          </Button>
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'stretch', px: { xs: 2, md: 6 }, py: { xs: 4, md: 6 }, gap: 4, maxWidth: 1100, mx: 'auto', width: '100%' }}>

        {/* Left panel */}
        <Box sx={{ flex: 1, display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'center', pr: 4 }}>
          <Typography variant="h3" fontWeight={800} color={BLUE} lineHeight={1.2} sx={{ mb: 2 }}>
            Start Managing<br />Your Team in<br />Minutes
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.8 }}>
            The architectural ledger for modern workforce logistics. Professional structure for high-stakes decision making.
          </Typography>
          {features.map((f) => (
            <Box key={f.title} sx={{ display: 'flex', gap: 2, mb: 2.5, alignItems: 'flex-start' }}>
              <Box sx={{ bgcolor: '#dbeafe', p: 1, borderRadius: 2, color: ACCENT, flexShrink: 0, display: 'flex' }}>
                {f.icon}
              </Box>
              <Box>
                <Typography variant="body1" fontWeight={700} color={BLUE}>{f.title}</Typography>
                <Typography variant="body2" color="text.secondary">{f.desc}</Typography>
              </Box>
            </Box>
          ))}
          <Box sx={{ display: 'flex', gap: 3, mt: 4, flexWrap: 'wrap' }}>
            {['Enterprise Grade Security', '99.9% Uptime SLA', 'GDPR Compliant'].map(t => (
              <Box key={t} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CheckCircle sx={{ fontSize: 14, color: ACCENT }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{t}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Form panel */}
        <Box sx={{ width: { xs: '100%', md: 480 }, bgcolor: '#fff', borderRadius: 4, p: { xs: 3, md: 4.5 }, border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(26,58,107,0.07)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography variant="h5" fontWeight={800} color={BLUE} gutterBottom>
            Create Organisation
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Establish your administrative foundation today.
          </Typography>

          <form onSubmit={handleSubmit}>
            {/* Org name */}
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1 }}>
              Organisation Name
            </Typography>
            <TextField
              fullWidth size="small" placeholder="e.g. Alpha Corp"
              value={form.org_name} onChange={set('org_name')}
              InputProps={{ startAdornment: <InputAdornment position="start"><Business sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> }}
              sx={{ mb: 2.5, mt: 0.5 }}
            />

            {/* Manager name — two columns */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1 }}>
                  First Name
                </Typography>
                <TextField
                  fullWidth size="small" placeholder="Alex"
                  value={form.first_name} onChange={set('first_name')}
                  InputProps={{ startAdornment: <InputAdornment position="start"><Person sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> }}
                  sx={{ mt: 0.5 }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1 }}>
                  Last Name
                </Typography>
                <TextField
                  fullWidth size="small" placeholder="Rivera"
                  value={form.last_name} onChange={set('last_name')}
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Box>

            {/* Email */}
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1 }}>
              Business Email
            </Typography>
            <TextField
              fullWidth size="small" placeholder="alex@company.com"
              value={form.email} onChange={set('email')} type="email"
              InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> }}
              sx={{ mb: 2.5, mt: 0.5 }}
            />

            {/* Password */}
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 1 }}>
              Password
            </Typography>
            <TextField
              fullWidth size="small" type="password" placeholder="••••••••••••"
              value={form.password} onChange={set('password')}
              helperText="Must be at least 8 characters."
              InputProps={{ startAdornment: <InputAdornment position="start"><Lock sx={{ fontSize: 18, color: 'text.disabled' }} /></InputAdornment> }}
              sx={{ mb: 2.5, mt: 0.5 }}
            />

            <Divider sx={{ my: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>HQ LOCATION FOR GPS CLOCK-IN (OPTIONAL)</Typography>
            </Divider>

            {/* Coordinates */}
            <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
              <TextField
                flex={1} size="small" placeholder="Latitude (e.g. 53.3636)"
                label="Latitude" value={form.hq_lat} onChange={set('hq_lat')}
                sx={{ flex: 1 }}
              />
              <TextField
                flex={1} size="small" placeholder="Longitude (e.g. -6.2488)"
                label="Longitude" value={form.hq_lng} onChange={set('hq_lng')}
                sx={{ flex: 1 }}
              />
            </Box>
            <Button
              variant="text" size="small" startIcon={locating ? <CircularProgress size={14} /> : <MyLocation sx={{ fontSize: 16 }} />}
              sx={{ color: ACCENT, textTransform: 'none', fontWeight: 600, mb: 2.5, pl: 0 }}
              onClick={useMyLocation} disabled={locating}
            >
              {locating ? 'Detecting location…' : 'Use my current location'}
            </Button>

            {/* Terms */}
            <FormControlLabel
              control={<Checkbox size="small" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />}
              label={
                <Typography variant="body2" color="text.secondary">
                  By registering, I agree to Shift Sync's{' '}
                  <Box component="span" sx={{ color: ACCENT, cursor: 'pointer' }}>Terms of Service</Box>
                  {' '}and{' '}
                  <Box component="span" sx={{ color: ACCENT, cursor: 'pointer' }}>Privacy Policy</Box>.
                </Typography>
              }
              sx={{ mb: 2.5, alignItems: 'flex-start' }}
            />

            <Button
              fullWidth type="submit" variant="contained" size="large"
              disabled={loading || !agreed}
              endIcon={loading ? <CircularProgress size={18} color="inherit" /> : <ArrowForward />}
              sx={{ bgcolor: ACCENT, color: '#fff', fontWeight: 700, py: 1.5, borderRadius: 2, textTransform: 'none', fontSize: 16 }}
            >
              {loading ? 'Registering…' : 'Register Organisation'}
            </Button>
          </form>
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: '#fff', borderTop: '1px solid #e2e8f0', px: { xs: 3, md: 6 }, py: 2.5, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="body2" fontWeight={700} color={BLUE}>Shift Sync</Typography>
        <Box sx={{ display: 'flex', gap: 3 }}>
          {['Privacy Policy', 'Terms of Service', 'Contact Support'].map(t => (
            <Typography key={t} variant="caption" color="text.secondary" sx={{ cursor: 'pointer', '&:hover': { color: ACCENT } }}>{t}</Typography>
          ))}
        </Box>
      </Box>

      <Snackbar
        open={snack.open} message={snack.msg} autoHideDuration={3500}
        onClose={() => setSnack({ open: false, msg: '' })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}
