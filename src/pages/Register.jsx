import apiFetch from '../utils/apiFetch.js';
import { useState } from 'react'
import {
  Box, Button, Typography, TextField, Snackbar,
  InputAdornment, CircularProgress, Divider, Checkbox, FormControlLabel,
  ToggleButton, ToggleButtonGroup, Chip
} from '@mui/material'
import {
  Business, Person, Email, Lock, MyLocation,
  GridView, AccessTime, PeopleAlt, CheckCircle, ArrowForward,
  CalendarMonth, CalendarViewWeek, Close as CloseIcon
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import * as EmailValidator from 'email-validator'

// Brand colour tokens
const BLUE = '#1a3a6b'
const ACCENT = '#2563eb'

// Feature list shown on the left-hand marketing panel
const features = [
  { icon: <GridView sx={{ fontSize: 20 }} />, title: 'Intuitive Rostering', desc: 'Design complex schedules with visual precision and zero friction.' },
  { icon: <AccessTime sx={{ fontSize: 20 }} />, title: 'Real-time Attendance', desc: 'Verify staff presence with geographic and temporal accuracy.' },
  { icon: <PeopleAlt sx={{ fontSize: 20 }} />, title: 'Central Directory', desc: 'A single source of truth for all organisational hierarchy and data.' },
]

// Organisation and manager account registration form
export default function Register() {
  const navigate = useNavigate()

  // All controlled form fields bundled into a single state object
  const [form, setForm] = useState({
    org_name: '', first_name: '', last_name: '',
    email: '', password: '', hq_lat: '', hq_lng: ''
  })
  // Whether shifts repeat weekly or monthly — sent to the backend to configure the roster
  const [rosterType, setRosterType] = useState('weekly')
  // List of role strings the organisation supports (e.g. "Shift Supervisor")
  const [roles, setRoles] = useState(['Staff Member', 'Shift Supervisor', 'Manager'])
  // Current value of the role chip input before it is committed on Enter/comma
  const [roleInput, setRoleInput] = useState('')
  // Whether the user has ticked the Terms of Service checkbox
  const [agreed, setAgreed] = useState(false)
  // True while the registration API request is in flight
  const [loading, setLoading] = useState(false)
  // True while the browser is resolving the user's GPS coordinates
  const [locating, setLocating] = useState(false)
  // Controls the bottom snackbar notification
  const [snack, setSnack] = useState({ open: false, msg: '' })

  // Returns a change handler for a specific form field, keeps other fields intact
  function set(field) {
    return (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  // Shows a bottom snackbar with the provided message
  function showSnack(msg) {
    setSnack({ open: true, msg })
  }

  // Requests the browser's current GPS position and populates the HQ lat/lng fields
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

  // Validates all fields then POSTs the registration payload to the backend
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
    if (roles.length === 0) { showSnack('Add at least one role for your organisation.'); return }

    setLoading(true)
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_BASE_URL}/api/manager-sign-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          password: form.password,
          org_name: form.org_name,
          hq_lat: form.hq_lat,
          hq_lng: form.hq_lng,
          rosterType,
          roles
        })
      })
      const data = await res.json()
      if (res.ok) {
        // Redirect to manager login with a success message in the URL
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

        {/* Left panel — marketing copy and feature list, hidden on mobile */}
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
          {/* Trust badges */}
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

            {/* Coordinates — filled manually or via GPS button */}
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
            {/* Button to auto-fill coordinates from the browser's geolocation API */}
            <Button
              variant="text" size="small" startIcon={locating ? <CircularProgress size={14} /> : <MyLocation sx={{ fontSize: 16 }} />}
              sx={{ color: ACCENT, textTransform: 'none', fontWeight: 600, mb: 2.5, pl: 0 }}
              onClick={useMyLocation} disabled={locating}
            >
              {locating ? 'Detecting location…' : 'Use my current location'}
            </Button>

            <Divider sx={{ my: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>ROSTER SCHEDULE TYPE</Typography>
            </Divider>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              How does your organisation plan shifts?
            </Typography>
            {/* Toggle between weekly and monthly rostering cadence */}
            <ToggleButtonGroup
              value={rosterType}
              exclusive
              onChange={(_, val) => { if (val) setRosterType(val) }}
              fullWidth
              size="small"
              sx={{ mb: 2.5 }}
            >
              <ToggleButton value="weekly" sx={{ gap: 1, textTransform: 'none', fontWeight: 600 }}>
                <CalendarViewWeek sx={{ fontSize: 18 }} /> Weekly
              </ToggleButton>
              <ToggleButton value="monthly" sx={{ gap: 1, textTransform: 'none', fontWeight: 600 }}>
                <CalendarMonth sx={{ fontSize: 18 }} /> Monthly
              </ToggleButton>
            </ToggleButtonGroup>
            {/* Contextual hint describing the selected roster cadence */}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2.5 }}>
              {rosterType === 'weekly'
                ? 'Managers submit a new roster each week (Mon–Sun).'
                : 'Managers submit a new roster covering the full calendar month.'}
            </Typography>

            <Divider sx={{ my: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>STAFF ROLES</Typography>
            </Divider>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Define the roles that exist in your organisation. These will be available when inviting staff.
            </Typography>

            {/* Role chip input — press Enter or comma to commit a role */}
            <Box
              sx={{
                border: '1px solid #e2e8f0', borderRadius: 2, p: 1.5, mb: 1,
                minHeight: 80, display: 'flex', flexWrap: 'wrap', gap: 0.75, alignContent: 'flex-start',
                '&:focus-within': { borderColor: ACCENT, boxShadow: '0 0 0 2px rgba(37,99,235,0.12)' }
              }}
            >
              {/* Render each committed role as a deletable chip */}
              {roles.map(r => (
                <Chip
                  key={r} label={r} size="small"
                  onDelete={() => setRoles(prev => prev.filter(x => x !== r))}
                  deleteIcon={<CloseIcon sx={{ fontSize: '13px !important' }} />}
                  sx={{ bgcolor: '#dbeafe', color: BLUE, fontWeight: 600, fontSize: 12, height: 26 }}
                />
              ))}
              {/* Native input sits inside the chip box for a tag-input UX */}
              <Box
                component="input"
                value={roleInput}
                onChange={e => setRoleInput(e.target.value)}
                onKeyDown={e => {
                  // Commit the role on Enter or comma; ignore empty/duplicate values
                  if ((e.key === 'Enter' || e.key === ',') && roleInput.trim()) {
                    e.preventDefault()
                    const r = roleInput.trim().replace(',', '')
                    if (r && !roles.includes(r)) setRoles(prev => [...prev, r])
                    setRoleInput('')
                  }
                }}
                placeholder={roles.length === 0 ? 'Type a role and press Enter…' : ''}
                sx={{
                  border: 'none', outline: 'none', fontSize: 14, flex: 1,
                  minWidth: 160, bgcolor: 'transparent', color: '#111827',
                  '&::placeholder': { color: '#9ca3af' }
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2.5 }}>
              Type a role name and press Enter to add. Click × to remove.
            </Typography>

            {/* Terms of Service agreement checkbox — submit is disabled without it */}
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

      {/* Snackbar for validation and server errors */}
      <Snackbar
        open={snack.open} message={snack.msg} autoHideDuration={3500}
        onClose={() => setSnack({ open: false, msg: '' })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}
