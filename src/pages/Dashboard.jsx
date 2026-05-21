import apiFetch from '../utils/apiFetch.js'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box, Button, Typography, CircularProgress, Avatar, Paper,
  TextField, IconButton, Snackbar, InputAdornment, Chip,
} from '@mui/material'

import DashboardIcon        from '@mui/icons-material/Dashboard'
import AccessTimeIcon       from '@mui/icons-material/AccessTime'
import ExitToAppIcon        from '@mui/icons-material/ExitToApp'
import SwapHorizIcon        from '@mui/icons-material/SwapHoriz'
import FaceIcon             from '@mui/icons-material/Face'
import LogoutIcon           from '@mui/icons-material/Logout'
import SmartToyIcon         from '@mui/icons-material/SmartToy'
import SendIcon             from '@mui/icons-material/Send'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import NotificationsIcon    from '@mui/icons-material/Notifications'
import HelpOutlineIcon      from '@mui/icons-material/HelpOutline'
import SearchIcon           from '@mui/icons-material/Search'
import WarningAmberIcon     from '@mui/icons-material/WarningAmber'
import ArrowForwardIcon     from '@mui/icons-material/ArrowForward'

// Brand colour tokens
const BLUE   = '#1a3a6b'
const ACCENT = '#2563eb'
const BASE   = import.meta.env.VITE_API_BASE_URL

// Sidebar navigation items with icons and display labels
const NAV_ITEMS = [
  { icon: <DashboardIcon  fontSize="small" />, label: 'Overview'   },
  { icon: <AccessTimeIcon fontSize="small" />, label: 'Clock In'   },
  { icon: <ExitToAppIcon  fontSize="small" />, label: 'Clock Out'  },
  { icon: <SwapHorizIcon  fontSize="small" />, label: 'Shift Swap' },
  { icon: <FaceIcon       fontSize="small" />, label: 'Face Enrol' },
]

// Quick-action cards rendered in the main content area
const ACTION_CARDS = [
  {
    label:    'Clock In',
    sublabel: 'Start Shift',
    desc:     'Record your arrival with GPS verification. Make sure you are on-site before clocking in.',
    bg:       '#eff6ff',
    iconBg:   ACCENT,
    icon:     <AccessTimeIcon sx={{ color: '#fff', fontSize: 26 }} />,
    btnText:  'Start Your Shift',
    navTo:    '/staff-clock-in',
  },
  {
    label:    'Clock Out',
    sublabel: 'End Shift',
    desc:     'Log your departure and close out your shift record for the day.',
    bg:       '#fff7ed',
    iconBg:   '#f97316',
    icon:     <ExitToAppIcon sx={{ color: '#fff', fontSize: 26 }} />,
    btnText:  'End Your Shift',
    navTo:    '/staff-clock-out',
  },
  {
    label:    'Shift Swap',
    sublabel: 'Propose a Trade',
    desc:     'Can\'t make your shift? Propose a swap with a colleague — your manager will review and approve.',
    bg:       '#f0fdf4',
    iconBg:   '#16a34a',
    icon:     <SwapHorizIcon sx={{ color: '#fff', fontSize: 26 }} />,
    btnText:  'Request a Swap',
    navTo:    '/staff-swap',
  },
]

// Staff dashboard with sidebar nav, quick-action cards, profile info, and AI chat panel
function Dashboard() {
  // Read redirect messages from the URL (e.g. after clock-out)
  const [params]             = useSearchParams()
  const msgFromURL           = params.get('message')
  // True while the initial auth check is pending
  const [loading, setLoading]         = useState(true)
  // The authenticated staff member's profile from the API
  const [currentUser, setCurrentUser] = useState(null)
  // Whether the auth check has confirmed the user is logged in
  const [userAuth, setUserAuth]       = useState(false)
  // Shift time proposals sent by the manager that the staff member can accept or decline
  const [shiftProposals, setShiftProposals] = useState([])
  // Which sidebar item is highlighted
  const [activeNav, setActiveNav]     = useState('Overview')
  // Controls bottom snackbar visibility
  const [snackOpen, setSnackOpen]     = useState(false)
  // Message shown in the bottom snackbar
  const [snackText, setSnackText]     = useState('')

  // Whether the floating AI chat panel is open
  const [chatOpen, setChatOpen]       = useState(false)
  // Message thread for the AI shift assistant chat
  const [chatMessages, setChatMessages] = useState([
    { role: 'model', text: "Hi! I'm your AI shift assistant. Tell me what you need — for example: \"I'm sick, can't work Tuesday\" or \"Who can cover me Friday afternoon?\"" },
  ])
  // Current value of the chat text input
  const [chatInput, setChatInput]   = useState('')
  // True while waiting for the AI API response
  const [chatLoading, setChatLoading] = useState(false)
  // Ref used to auto-scroll the chat to the latest message
  const chatEndRef = useRef(null)

  const location  = useLocation()
  const navigate  = useNavigate()
  // JWT stored after staff OAuth login
  const getToken  = localStorage.getItem('aes52')

  // Clears the stored token and sends the user back to login
  function handleLogout() {
    localStorage.removeItem('aes52')
    localStorage.removeItem('userRole')
    navigate('/staff-login')
  }

  // Routes to the correct page when a sidebar nav item is clicked
  function handleNavClick(label) {
    setActiveNav(label)
    if (label === 'Clock In')   navigate('/staff-clock-in')
    if (label === 'Clock Out')  navigate('/staff-clock-out')
    if (label === 'Shift Swap') navigate('/staff-swap')
    if (label === 'Face Enrol') navigate('/face-enroll')
  }

  // Verifies the stored JWT against the backend and loads the user profile
  async function checkUser() {
    try {
      const res = await apiFetch(`${BASE}/api/staff-auth`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${getToken}` },
      })
      if (res.ok) {
        const data = await res.json()
        setCurrentUser(data.user)
        setLoading(false)
        return true
      } else {
        navigate(`/staff-login?${new URLSearchParams({ message: 'Not Valid, Please Login Again!' })}`)
      }
    } catch {
      navigate(`/staff-login?${new URLSearchParams({ message: 'Not Valid, Please Login Again!' })}`)
    }
  }

  // Loads any pending time proposals sent by the manager for this staff member
  async function fetchShiftProposals() {
    try {
      const res = await apiFetch(`${BASE}/api/my-shift-proposals`, {
        headers: { authorization: `Bearer ${getToken}` }
      })
      if (res.ok) {
        const data = await res.json()
        setShiftProposals(data.proposals || [])
      }
    } catch { /* non-critical — proposals will show on next load */ }
  }

  // Staff member accepts or declines a manager's proposed shift time
  async function handleRespondToProposal(id, action) {
    try {
      const res = await apiFetch(`${BASE}/api/shift-proposal-respond/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${getToken}` },
        body: JSON.stringify({ action })
      })
      if (res.ok) {
        setShiftProposals(prev => prev.filter(p => p._id !== id))
        setSnackText(action === 'accept' ? 'Shift accepted — your manager will confirm shortly' : 'Proposal declined')
        setSnackOpen(true)
      }
    } catch {
      setSnackText('Network error — please try again')
      setSnackOpen(true)
    }
  }

  // On mount: show any URL message, then validate auth or redirect to login
  useEffect(() => {
    if (msgFromURL) { setSnackText(msgFromURL); setSnackOpen(true) }
    if (getToken) {
      (async () => { const ok = await checkUser(); setUserAuth(ok) })()
      fetchShiftProposals()
    } else {
      navigate(`/staff-login?${new URLSearchParams({ message: 'You Need to Login' })}`)
    }
  }, [])

  // Scroll the chat message list to the bottom whenever messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Sends the user's message to the AI chat endpoint and appends the response
  async function sendChatMessage() {
    const text = chatInput.trim()
    if (!text || chatLoading) return
    setChatMessages(prev => [...prev, { role: 'user', text }])
    setChatInput('')
    setChatLoading(true)
    try {
      const res = await apiFetch(`${BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${getToken}` },
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()
      setChatMessages(prev => [
        ...prev,
        { role: 'model', text: res.ok ? data.result.message : (data.message || 'Something went wrong. Please try again.') },
      ])
    } catch {
      setChatMessages(prev => [...prev, { role: 'model', text: 'Could not reach the server. Please check your connection.' }])
    } finally {
      setChatLoading(false)
    }
  }

  // Submits the chat message on Enter (but allows Shift+Enter for line breaks)
  function handleChatKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage() }
  }

  // True if the user has a stored 128-element face descriptor from enrolment
  const faceEnrolled   = Array.isArray(currentUser?.faceDescriptor) && currentUser.faceDescriptor.length === 128
  // First letter of the user's name used as a fallback avatar initial
  const userInitial    = (currentUser?.staffName || 'S')[0].toUpperCase()
  // Today's date formatted for display in the page header
  const today          = new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f0f4f8' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f0f4f8' }}>

      {/* ── SIDEBAR ── */}
      <Box sx={{
        width: 240, flexShrink: 0, bgcolor: '#fff', borderRight: '1px solid #e5e7eb',
        display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 10,
      }}>
        {/* User avatar and name at the top of the sidebar */}
        <Box sx={{ p: 3, borderBottom: '1px solid #e5e7eb' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={currentUser?.profile_picture || undefined}
              sx={{ bgcolor: ACCENT, width: 38, height: 38, fontSize: 15, fontWeight: 700 }}
            >
              {userInitial}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700} color={BLUE} noWrap>
                {currentUser?.staffName || 'Staff Member'}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {currentUser?.role || 'Staff'}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Sidebar navigation links */}
        <Box sx={{ flex: 1, py: 1.5 }}>
          {NAV_ITEMS.map(({ icon, label }) => {
            const active = activeNav === label
            return (
              <Box
                key={label}
                onClick={() => handleNavClick(label)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  px: 3, py: 1.25, cursor: 'pointer',
                  // Highlight the active nav item with an accent border and tinted background
                  bgcolor: active ? '#eff6ff' : 'transparent',
                  borderRight: active ? `3px solid ${ACCENT}` : '3px solid transparent',
                  color: active ? ACCENT : '#6b7280',
                  '&:hover': { bgcolor: '#f9fafb', color: BLUE },
                  transition: 'all 0.15s',
                }}
              >
                {icon}
                <Typography variant="body2" fontWeight={active ? 700 : 500}>{label}</Typography>
              </Box>
            )
          })}
        </Box>

        {/* Bottom sidebar actions — AI assistant toggle and logout */}
        <Box sx={{ p: 2, borderTop: '1px solid #e5e7eb' }}>
          <Button
            fullWidth variant="contained"
            startIcon={<SmartToyIcon />}
            sx={{ bgcolor: BLUE, color: '#fff', textTransform: 'none', fontWeight: 600, borderRadius: 2, mb: 1, py: 1.1, '&:hover': { bgcolor: '#142e58' } }}
            onClick={() => setChatOpen(o => !o)}
          >
            AI Assistant
          </Button>
          <Button
            fullWidth variant="text" startIcon={<LogoutIcon />}
            sx={{ color: '#6b7280', textTransform: 'none', fontWeight: 500, justifyContent: 'flex-start' }}
            onClick={handleLogout}
          >
            Log Out
          </Button>
        </Box>
      </Box>

      {/* ── MAIN AREA ── */}
      <Box sx={{ ml: '240px', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Sticky top bar with tab navigation and search */}
        <Box sx={{
          bgcolor: '#fff', borderBottom: '1px solid #e5e7eb',
          px: 4, height: 60, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 9,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Typography variant="h6" fontWeight={800} color={BLUE} sx={{ letterSpacing: '-0.3px', cursor: "pointer" }} onClick={() => { setActiveNav('Overview') }}>
              Shift Sync
            </Typography>
            {/* Top-level tabs — only "Dashboard" is currently active/functional */}
            <Box sx={{ display: 'flex' }}>
              {['Dashboard', 'My Shifts', 'History'].map((tab) => {
                const active = tab === 'Dashboard'
                return (
                  <Box key={tab} sx={{
                    px: 2, py: 1.9, cursor: 'pointer', fontSize: '0.875rem',
                    fontWeight: active ? 700 : 500,
                    color: active ? ACCENT : '#6b7280',
                    borderBottom: active ? `2px solid ${ACCENT}` : '2px solid transparent',
                    '&:hover': { color: BLUE }, transition: 'all 0.15s',
                  }}>
                    {tab}
                  </Box>
                )
              })}
            </Box>
          </Box>
          {/* Right side of top bar: search, notification bell, help, avatar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <TextField
              size="small" placeholder="Search..."
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#9ca3af', fontSize: 18 }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2, fontSize: '0.875rem' },
                },
              }}
              sx={{ width: 200 }}
            />
            <IconButton size="small" sx={{ color: '#6b7280' }}><NotificationsIcon /></IconButton>
            <IconButton size="small" sx={{ color: '#6b7280' }}><HelpOutlineIcon /></IconButton>
            <Avatar
              src={currentUser?.profile_picture || undefined}
              sx={{ width: 34, height: 34, bgcolor: ACCENT, fontSize: 14, cursor: 'pointer' }}
            >
              {userInitial}
            </Avatar>
          </Box>
        </Box>

        {/* Page content */}
        <Box sx={{ flex: 1, p: 4, overflowY: 'auto' }}>

          {/* Page header with greeting, date, and department badge */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
            <Box>
              <Typography variant="h4" fontWeight={800} color={BLUE}>
                Welcome back, {currentUser?.staffName?.split(' ')[0] || 'there'}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>{today}</Typography>
            </Box>
            <Chip
              label={currentUser?.department || 'General'}
              size="small"
              sx={{ bgcolor: '#eff6ff', color: ACCENT, fontWeight: 700, fontSize: 12, px: 0.5 }}
            />
          </Box>

          {/* Alert banner prompting the user to enrol their face if they haven't yet */}
          {!faceEnrolled && (
            <Box sx={{ bgcolor: BLUE, borderRadius: 3, p: 3, color: '#fff', mb: 3, position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <WarningAmberIcon sx={{ fontSize: 15, color: '#fbbf24' }} />
                <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.65)' }}>
                  ACTION REQUIRED
                </Typography>
              </Box>
              <Typography variant="h6" fontWeight={700} mb={0.75}>Face Not Enrolled</Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2.5, lineHeight: 1.65 }}>
                Face verification will be skipped at clock-in until you complete enrolment. This takes less than a minute.
              </Typography>
              <Button
                size="small" variant="contained" endIcon={<ArrowForwardIcon />}
                sx={{ bgcolor: ACCENT, color: '#fff', textTransform: 'none', fontWeight: 600, borderRadius: 2, '&:hover': { bgcolor: '#1d4ed8' } }}
                onClick={() => navigate('/face-enroll')}
              >
                Enrol Now
              </Button>
              {/* Decorative concentric circle shapes in the background */}
              <Box sx={{ position: 'absolute', right: -24, top: '50%', transform: 'translateY(-50%)', width: 130, height: 130, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', pointerEvents: 'none' }} />
              <Box sx={{ position: 'absolute', right: -52, top: '50%', transform: 'translateY(-50%)', width: 190, height: 190, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
            </Box>
          )}

          {/* Quick action cards — clock in, clock out, shift swap */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 2.5, mb: 3 }}>
            {ACTION_CARDS.map(({ label, sublabel, desc, bg, iconBg, icon, btnText, navTo }) => (
              <Paper
                key={label}
                elevation={0}
                sx={{ border: '1px solid #e5e7eb', borderRadius: 3, p: 3, bgcolor: '#fff', display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ bgcolor: iconBg, borderRadius: 2, p: 1.25, display: 'flex' }}>
                    {icon}
                  </Box>
                  <Chip
                    label={sublabel}
                    size="small"
                    sx={{ bgcolor: bg, color: iconBg, fontWeight: 700, fontSize: 10 }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight={700} color={BLUE} gutterBottom>{label}</Typography>
                  <Typography variant="body2" color="text.secondary" lineHeight={1.7}>{desc}</Typography>
                </Box>
                <Button
                  variant="contained" endIcon={<ArrowForwardIcon />}
                  sx={{
                    bgcolor: BLUE, color: '#fff', textTransform: 'none', fontWeight: 600,
                    borderRadius: 2, py: 1, '&:hover': { bgcolor: '#142e58' },
                  }}
                  onClick={() => navigate(navTo)}
                >
                  {btnText}
                </Button>
              </Paper>
            ))}
          </Box>

          {/* Shift proposals panel — shown only when the manager has sent proposals to this staff member */}
          {shiftProposals.length > 0 && (
            <Paper elevation={0} sx={{ border: '1px solid #93c5fd', borderRadius: 3, p: 3, mb: 3, bgcolor: '#eff6ff' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} color={BLUE}>Proposed Shifts</Typography>
                <Chip
                  label={shiftProposals.length}
                  size="small"
                  sx={{ bgcolor: ACCENT, color: '#fff', fontWeight: 700, fontSize: 11 }}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {shiftProposals.map(p => (
                  <Box key={p._id} sx={{ bgcolor: '#fff', border: '1px solid #bfdbfe', borderRadius: 2, p: 2 }}>
                    <Typography variant="body2" fontWeight={600} color={BLUE}>
                      {p.requestedDate}
                      <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}>
                        {' '}— {p.proposedStartTime} to {p.proposedEndTime}
                      </Box>
                    </Typography>
                    {p.notes && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                        Your note: {p.notes}
                      </Typography>
                    )}
                    {/* Accept or decline buttons — response is forwarded to the manager for final confirmation */}
                    <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                      <Button
                        size="small" variant="contained"
                        sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, textTransform: 'none', fontWeight: 600 }}
                        onClick={() => handleRespondToProposal(p._id, 'accept')}
                      >
                        Accept
                      </Button>
                      <Button
                        size="small" variant="outlined" color="error"
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                        onClick={() => handleRespondToProposal(p._id, 'deny')}
                      >
                        Decline
                      </Button>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Paper>
          )}

          {/* Profile summary card at the bottom of the main content area */}
          <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 3, p: 3 }}>
            <Typography variant="subtitle2" fontWeight={700} color={BLUE} mb={2}>Your Profile</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {[
                { label: 'Full Name',   value: currentUser?.staffName  || '—' },
                { label: 'Email',       value: currentUser?.email       || '—' },
                { label: 'Role',        value: currentUser?.role        || '—' },
                { label: 'Department',  value: currentUser?.department  || '—' },
                { label: 'Face Enrol',  value: faceEnrolled ? 'Enrolled' : 'Not enrolled' },
              ].map(({ label, value }) => (
                <Box key={label} sx={{ minWidth: 160 }}>
                  <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, letterSpacing: '0.06em', display: 'block' }}>
                    {label.toUpperCase()}
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color={BLUE} mt={0.25}>
                    {value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>

        </Box>
      </Box>

      {/* ── AI CHAT PANEL (floating, shown when chatOpen) ── */}
      {chatOpen && (
        <Box sx={{ position: 'fixed', bottom: 24, right: 24, width: 360, zIndex: 1300 }}>
          <Paper elevation={6} sx={{ borderRadius: 3, overflow: 'hidden' }}>
            {/* Chat header with collapse button */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, bgcolor: BLUE }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SmartToyIcon sx={{ color: '#fff', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 600 }}>AI Shift Assistant</Typography>
              </Box>
              <IconButton size="small" onClick={() => setChatOpen(false)} sx={{ color: '#fff', p: 0.5 }}>
                <KeyboardArrowDownIcon />
              </IconButton>
            </Box>
            {/* Scrollable message thread */}
            <Box sx={{ height: 320, overflowY: 'auto', px: 2, py: 2, bgcolor: '#f0f4f8', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {chatMessages.map((msg, idx) => (
                <Box key={idx} sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <Box sx={{
                    maxWidth: '80%', px: 2, py: 1,
                    // Different bubble shape for user vs model messages
                    borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    bgcolor: msg.role === 'user' ? ACCENT : '#fff',
                    color: msg.role === 'user' ? '#fff' : '#1a1a1a',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                  }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{msg.text}</Typography>
                  </Box>
                </Box>
              ))}
              {/* Typing indicator while waiting for the AI response */}
              {chatLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <Box sx={{ px: 2, py: 1, borderRadius: '18px 18px 18px 4px', bgcolor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}>
                    <CircularProgress size={16} thickness={5} />
                  </Box>
                </Box>
              )}
              {/* Invisible sentinel element that is scrolled into view on new messages */}
              <div ref={chatEndRef} />
            </Box>
            {/* Chat input and send button */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderTop: '1px solid #e0e0e0', bgcolor: '#fff' }}>
              <TextField
                fullWidth size="small"
                placeholder="e.g. I'm sick, can't work Tuesday..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={handleChatKeyDown}
                disabled={chatLoading}
                multiline maxRows={3}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />
              <IconButton
                onClick={sendChatMessage}
                disabled={chatLoading || !chatInput.trim()}
                sx={{ bgcolor: ACCENT, color: '#fff', '&:hover': { bgcolor: BLUE }, '&:disabled': { bgcolor: '#ccc' }, borderRadius: 2, p: 1.2 }}
              >
                <SendIcon fontSize="small" />
              </IconButton>
            </Box>
          </Paper>
        </Box>
      )}

      {/* ── AI FAB — shown when chat panel is collapsed ── */}
      {!chatOpen && (
        <IconButton
          onClick={() => setChatOpen(true)}
          sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1300, bgcolor: BLUE, color: '#fff', width: 56, height: 56, boxShadow: 4, '&:hover': { bgcolor: ACCENT } }}
        >
          <SmartToyIcon />
        </IconButton>
      )}

      {/* Snackbar for messages passed via URL query param (e.g. after clock-out) */}
      <Snackbar
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        open={snackOpen}
        message={snackText}
        autoHideDuration={3000}
        onClose={() => setSnackOpen(false)}
      />
    </Box>
  )
}

export default Dashboard
