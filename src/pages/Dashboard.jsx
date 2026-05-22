import apiFetch from '../utils/apiFetch.js'
import { getSocket, disconnectSocket } from '../utils/socketClient.js'
import { registerPushNotifications } from '../utils/pushNotifications.js'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box, Button, Typography, CircularProgress, Avatar, Paper,
  TextField, IconButton, Snackbar, InputAdornment, Chip,
  Badge, Popover, Divider,
} from '@mui/material'

import DashboardIcon        from '@mui/icons-material/Dashboard'
import AccessTimeIcon       from '@mui/icons-material/AccessTime'
import ExitToAppIcon        from '@mui/icons-material/ExitToApp'
import SwapHorizIcon        from '@mui/icons-material/SwapHoriz'
import FaceIcon             from '@mui/icons-material/Face'
import CalendarMonthIcon    from '@mui/icons-material/CalendarMonth'
import LogoutIcon           from '@mui/icons-material/Logout'
import SmartToyIcon         from '@mui/icons-material/SmartToy'
import SendIcon             from '@mui/icons-material/Send'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import NotificationsIcon    from '@mui/icons-material/Notifications'
import HelpOutlineIcon      from '@mui/icons-material/HelpOutline'
import SearchIcon           from '@mui/icons-material/Search'
import WarningAmberIcon     from '@mui/icons-material/WarningAmber'
import ArrowForwardIcon     from '@mui/icons-material/ArrowForward'
import StorefrontIcon       from '@mui/icons-material/Storefront'
import EventNoteIcon        from '@mui/icons-material/EventNote'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import CancelOutlinedIcon   from '@mui/icons-material/CancelOutlined'
import BeachAccessIcon        from '@mui/icons-material/BeachAccess'
import EventAvailableIcon     from '@mui/icons-material/EventAvailable'
import { MenuItem, Select, FormControl, InputLabel, Modal, Switch, Tooltip } from '@mui/material'

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000)
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// Returns remaining time until shift end, or overtime if already past it.
// endOfShift is "HH:MM"; handles midnight-crossing shifts (e.g. "00:30").
function shiftTimeRemaining(endOfShift, now) {
  if (!endOfShift) return null
  const [h, m] = endOfShift.split(':').map(Number)
  const end = new Date(now)
  end.setHours(h, m, 0, 0)
  // If end appears to be earlier than now by more than 12 hours it's tomorrow
  if (end < now && now - end > 12 * 60 * 60 * 1000) end.setDate(end.getDate() + 1)
  const diffMs = end - now
  const abs = Math.abs(diffMs)
  const rh = Math.floor(abs / 3_600_000)
  const rm = Math.floor((abs % 3_600_000) / 60_000)
  return { overtime: diffMs < 0, h: rh, m: rm }
}

// Brand colour tokens
const BLUE   = '#1a3a6b'
const ACCENT = '#2563eb'
const BASE   = import.meta.env.VITE_API_BASE_URL

// Sidebar navigation items with icons and display labels
const NAV_ITEMS = [
  { icon: <DashboardIcon      fontSize="small" />, label: 'Overview'    },
  { icon: <CalendarMonthIcon  fontSize="small" />, label: 'My Schedule' },
  { icon: <AccessTimeIcon     fontSize="small" />, label: 'Clock In'    },
  { icon: <ExitToAppIcon      fontSize="small" />, label: 'Clock Out'   },
  { icon: <SwapHorizIcon      fontSize="small" />, label: 'Shift Swap'  },
  { icon: <StorefrontIcon     fontSize="small" />, label: 'Marketplace' },
  { icon: <BeachAccessIcon    fontSize="small" />, label: 'Leave'        },
  { icon: <EventAvailableIcon fontSize="small" />, label: 'Availability' },
  { icon: <FaceIcon           fontSize="small" />, label: 'Face Enrol'   },
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

  // Notification bell — list of in-session notifications and popover anchor
  const [notifications, setNotifications]     = useState([])
  const [notifAnchor, setNotifAnchor]         = useState(null)

  // Marketplace — open-cover shifts available for claiming
  const [openShifts, setOpenShifts]           = useState([])
  const [marketplaceLoading, setMarketplaceLoading] = useState(false)
  // Tracks which shift card is mid-claim to show per-card loading
  const [claimingId, setClaimingId]           = useState(null)

  // Availability state — weekly grid + specific date overrides
  const DAYS = [
    { label: 'Monday',    dow: 1 },
    { label: 'Tuesday',   dow: 2 },
    { label: 'Wednesday', dow: 3 },
    { label: 'Thursday',  dow: 4 },
    { label: 'Friday',    dow: 5 },
    { label: 'Saturday',  dow: 6 },
    { label: 'Sunday',    dow: 0 },
  ]
  // weeklyGrid: { [dayOfWeek]: { available, startTime, endTime, saving } }
  const [weeklyGrid, setWeeklyGrid]               = useState({})
  // dateOverrides: list of { date, available, startTime, endTime } entries
  const [dateOverrides, setDateOverrides]         = useState([])
  const [availLoading, setAvailLoading]           = useState(false)
  // New date override form state
  const [newOverrideDate, setNewOverrideDate]     = useState('')
  const [newOverrideStart, setNewOverrideStart]   = useState('')
  const [newOverrideEnd, setNewOverrideEnd]       = useState('')
  const [overrideAdding, setOverrideAdding]       = useState(false)

  // Leave request form and history state
  const [leaveRequests, setLeaveRequests]         = useState([])
  const [leaveLoading, setLeaveLoading]           = useState(false)
  const [leaveModalOpen, setLeaveModalOpen]       = useState(false)
  const [leaveForm, setLeaveForm]                 = useState({ leaveType: 'annual', startDate: '', endDate: '', notes: '' })
  const [leaveSubmitting, setLeaveSubmitting]     = useState(false)

  // Today's clock-in record for this staff member — null means not yet clocked in
  const [todayClockIn, setTodayClockIn] = useState(null)
  // Current time, ticked every minute to drive the shift-end countdown
  const [now, setNow] = useState(new Date())

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

  // Clears the stored token, disconnects the socket, and sends the user back to login
  function handleLogout() {
    localStorage.removeItem('aes52')
    localStorage.removeItem('userRole')
    disconnectSocket()
    navigate('/staff-login')
  }

  // Routes to the correct page when a sidebar nav item is clicked
  function handleNavClick(label) {
    setActiveNav(label)
    if (label === 'My Schedule')  navigate('/my-roster')
    if (label === 'Clock In')     navigate('/staff-clock-in')
    if (label === 'Clock Out')    navigate('/staff-clock-out')
    if (label === 'Shift Swap')   navigate('/staff-swap')
    if (label === 'Face Enrol')   navigate('/face-enroll')
    if (label === 'Marketplace')  fetchOpenShifts()
    if (label === 'Leave')        fetchLeaveRequests()
    if (label === 'Availability') fetchAvailability()
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

  // Checks whether the current staff member has already clocked in today
  async function fetchTodayClockIn() {
    try {
      const res = await apiFetch(`${BASE}/api/my-clockin-today`, {
        headers: { authorization: `Bearer ${getToken}` }
      })
      if (res.ok) {
        const data = await res.json()
        setTodayClockIn(data.clockIn || null)
      }
    } catch { /* non-critical */ }
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

  function addNotification(notif) {
    setNotifications(prev => [{ id: `${Date.now()}-${Math.random()}`, read: false, timestamp: new Date(), ...notif }, ...prev])
  }

  function dismissNotification(id) {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  async function fetchOpenShifts() {
    setMarketplaceLoading(true)
    try {
      const res = await apiFetch(`${BASE}/api/open-shifts`, {
        headers: { authorization: `Bearer ${getToken}` }
      })
      if (res.ok) {
        const data = await res.json()
        setOpenShifts(data.shifts || [])
      }
    } catch { /* will retry on next nav */ }
    finally { setMarketplaceLoading(false) }
  }

  async function claimShift(shiftId) {
    setClaimingId(shiftId)
    try {
      const res = await apiFetch(`${BASE}/api/claim-shift/${shiftId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${getToken}` }
      })
      const data = await res.json()
      if (res.ok) {
        setOpenShifts(prev => prev.filter(s => s._id !== shiftId))
        setSnackText('Shift claimed! Check My Schedule for details.')
      } else {
        setSnackText(data.message || 'Could not claim shift — please try again.')
      }
    } catch {
      setSnackText('Network error — please try again.')
    } finally {
      setClaimingId(null)
      setSnackOpen(true)
    }
  }

  async function fetchAvailability() {
    setAvailLoading(true)
    try {
      const res = await apiFetch(`${BASE}/api/my-availability`, {
        headers: { authorization: `Bearer ${getToken}` }
      })
      if (res.ok) {
        const data = await res.json()
        const grid = {}
        const overrides = []
        for (const entry of data.entries || []) {
          if (entry.type === 'weekly') {
            grid[entry.dayOfWeek] = { available: entry.available, startTime: entry.startTime || '', endTime: entry.endTime || '', saving: false }
          } else {
            overrides.push(entry)
          }
        }
        setWeeklyGrid(grid)
        setDateOverrides(overrides.sort((a, b) => a.date.localeCompare(b.date)))
      }
    } catch { /* non-critical */ }
    finally { setAvailLoading(false) }
  }

  async function saveWeeklyDay(dow, patch) {
    const current = weeklyGrid[dow] || { available: true, startTime: '', endTime: '' }
    const updated = { ...current, ...patch }
    setWeeklyGrid(prev => ({ ...prev, [dow]: { ...updated, saving: true } }))
    try {
      const res = await apiFetch(`${BASE}/api/my-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${getToken}` },
        body: JSON.stringify({
          type: 'weekly',
          dayOfWeek: dow,
          available: updated.available,
          startTime: updated.available && updated.startTime ? updated.startTime : null,
          endTime:   updated.available && updated.endTime   ? updated.endTime   : null,
        })
      })
      if (!res.ok) {
        const d = await res.json()
        setSnackText(d.message || 'Failed to save')
        setSnackOpen(true)
      }
    } catch {
      setSnackText('Network error')
      setSnackOpen(true)
    } finally {
      setWeeklyGrid(prev => ({ ...prev, [dow]: { ...prev[dow], saving: false } }))
    }
  }

  async function addDateOverride() {
    if (!newOverrideDate) { setSnackText('Please select a date'); setSnackOpen(true); return }
    setOverrideAdding(true)
    try {
      const res = await apiFetch(`${BASE}/api/my-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${getToken}` },
        body: JSON.stringify({
          type: 'date',
          date: newOverrideDate,
          available: false,
          startTime: null,
          endTime: null,
        })
      })
      const data = await res.json()
      if (res.ok) {
        setDateOverrides(prev => [...prev, data.entry].sort((a, b) => a.date.localeCompare(b.date)))
        setNewOverrideDate('')
        setNewOverrideStart('')
        setNewOverrideEnd('')
      } else {
        setSnackText(data.message || 'Failed to add override')
        setSnackOpen(true)
      }
    } catch {
      setSnackText('Network error')
      setSnackOpen(true)
    } finally { setOverrideAdding(false) }
  }

  async function removeDateOverride(date) {
    try {
      await apiFetch(`${BASE}/api/my-availability/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${getToken}` },
        body: JSON.stringify({ type: 'date', date })
      })
      setDateOverrides(prev => prev.filter(e => e.date !== date))
    } catch {
      setSnackText('Network error')
      setSnackOpen(true)
    }
  }

  async function fetchLeaveRequests() {
    setLeaveLoading(true)
    try {
      const res = await apiFetch(`${BASE}/api/my-leave-requests`, {
        headers: { authorization: `Bearer ${getToken}` }
      })
      if (res.ok) {
        const data = await res.json()
        setLeaveRequests(data.leaves || [])
      }
    } catch { /* non-critical */ }
    finally { setLeaveLoading(false) }
  }

  async function submitLeaveRequest() {
    if (!leaveForm.startDate || !leaveForm.endDate) {
      setSnackText('Please fill in start and end dates')
      setSnackOpen(true)
      return
    }
    setLeaveSubmitting(true)
    try {
      const res = await apiFetch(`${BASE}/api/leave-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${getToken}` },
        body: JSON.stringify(leaveForm)
      })
      const data = await res.json()
      if (res.ok) {
        setLeaveRequests(prev => [data.leave, ...prev])
        setLeaveModalOpen(false)
        setLeaveForm({ leaveType: 'annual', startDate: '', endDate: '', notes: '' })
        setSnackText('Leave request submitted — your manager will review it shortly')
        setSnackOpen(true)
      } else {
        setSnackText(data.message || 'Failed to submit leave request')
        setSnackOpen(true)
      }
    } catch {
      setSnackText('Network error — please try again')
      setSnackOpen(true)
    } finally {
      setLeaveSubmitting(false)
    }
  }

  // On mount: show any URL message, then validate auth or redirect to login
  useEffect(() => {
    if (msgFromURL) { setSnackText(msgFromURL); setSnackOpen(true) }
    if (getToken) {
      (async () => {
        const ok = await checkUser()
        setUserAuth(ok)
        if (ok) registerPushNotifications(getToken, 'staff')
      })()
      fetchShiftProposals()
      fetchTodayClockIn()
    } else {
      navigate(`/staff-login?${new URLSearchParams({ message: 'You Need to Login' })}`)
    }
  }, [])

  // Tick every minute while clocked in so the shift-end countdown stays current
  useEffect(() => {
    if (!todayClockIn) return
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [todayClockIn])

  // Scroll the chat message list to the bottom whenever messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Real-time socket listeners — connect once the user ID is known
  useEffect(() => {
    if (!currentUser?._id) return
    const socket = getSocket()
    socket.connect()
    socket.emit('join_room', { userId: currentUser._id, role: 'staff' })

    socket.on('shift_proposal_received', (proposal) => {
      setShiftProposals(prev => {
        const exists = prev.some(p => p._id === proposal._id)
        return exists ? prev : [...prev, proposal]
      })
      addNotification({
        type: 'shift_proposal_received',
        title: 'Shift Proposal',
        body: `Your manager proposed a shift on ${proposal.requestedDate} (${proposal.proposedStartTime} – ${proposal.proposedEndTime})`,
        actionData: { proposalId: proposal._id, requestedDate: proposal.requestedDate, proposedStartTime: proposal.proposedStartTime, proposedEndTime: proposal.proposedEndTime, notes: proposal.notes }
      })
    })

    socket.on('shift_request_resolved', ({ status, requestedDate }) => {
      addNotification({
        type: status === 'approved' ? 'shift_approved' : 'shift_denied',
        title: status === 'approved' ? 'Shift Request Approved' : 'Shift Request Denied',
        body: status === 'approved'
          ? `Your shift request for ${requestedDate} was approved and added to the roster.`
          : `Your shift request for ${requestedDate} was denied by your manager.`,
        actionData: null
      })
    })

    // Another staff member claimed a Marketplace shift — remove its card in real time
    socket.on('marketplace_shift_taken', ({ shiftId }) => {
      setOpenShifts(prev => prev.filter(s => s._id !== shiftId))
    })

    socket.on('cover_approved', ({ date, message }) => {
      addNotification({
        type: 'cover_approved',
        title: 'Cover Request Approved',
        body: message || `Your cover request for ${date} was approved — it's now live in the Marketplace.`,
        actionData: null
      })
    })

    socket.on('cover_rejected', ({ date, message }) => {
      addNotification({
        type: 'cover_rejected',
        title: 'Cover Request Rejected',
        body: message || `Your cover request for ${date} was not approved. You are still assigned to this shift.`,
        actionData: null
      })
    })

    socket.on('swap_approved', ({ withName, date, swapDate }) => {
      addNotification({
        type: 'swap_approved',
        title: 'Shift Swap Approved',
        body: `Your shift swap with ${withName} has been approved by your manager. You are now working on ${swapDate || date}.`,
        actionData: null
      })
    })

    // Staff A has proposed a swap — notify staff B in real time as well as by email
    socket.on('swap_request_received', ({ requesterName, date, shift_start_time, shift_end_time, swapDate, swap_shift_start_time, swap_shift_end_time }) => {
      addNotification({
        type: 'swap_request_received',
        title: 'Shift Swap Request',
        body: `${requesterName} wants to swap shifts — their shift on ${date} (${shift_start_time}–${shift_end_time}) for your shift on ${swapDate} (${swap_shift_start_time}–${swap_shift_end_time}). Check your email to accept.`,
        actionData: null
      })
    })

    socket.on('leave_approved', ({ leaveType, startDate, endDate }) => {
      const typeLabel = { sick: 'Sick Leave', annual: 'Annual Leave', personal: 'Personal Leave' }[leaveType] || leaveType
      setLeaveRequests(prev => prev.map(lr =>
        lr.startDate === startDate && lr.endDate === endDate && lr.leaveType === leaveType && lr.status === 'pending'
          ? { ...lr, status: 'approved' }
          : lr
      ))
      addNotification({
        type: 'leave_approved',
        title: 'Leave Request Approved',
        body: `Your ${typeLabel} from ${startDate} to ${endDate} has been approved.`,
        actionData: null
      })
    })

    // Manager reset this staff member's clock-in — clear the local banner and notify them
    socket.on('clockin_reset', ({ message }) => {
      setTodayClockIn(null)
      addNotification({
        type: 'clockin_reset',
        title: 'Clock-In Reset by Manager',
        body: message || 'Your manager has reset your clock-in. Please clock in again when you are ready.',
        actionData: null,
      })
    })

    socket.on('leave_denied', ({ leaveType, startDate, endDate, managerNotes }) => {
      const typeLabel = { sick: 'Sick Leave', annual: 'Annual Leave', personal: 'Personal Leave' }[leaveType] || leaveType
      setLeaveRequests(prev => prev.map(lr =>
        lr.startDate === startDate && lr.endDate === endDate && lr.leaveType === leaveType && lr.status === 'pending'
          ? { ...lr, status: 'denied', managerNotes: managerNotes || null }
          : lr
      ))
      addNotification({
        type: 'leave_denied',
        title: 'Leave Request Denied',
        body: `Your ${typeLabel} from ${startDate} to ${endDate} was not approved.${managerNotes ? ` Reason: ${managerNotes}` : ''}`,
        actionData: null
      })
    })

    return () => {
      socket.off('shift_proposal_received')
      socket.off('shift_request_resolved')
      socket.off('marketplace_shift_taken')
      socket.off('cover_approved')
      socket.off('cover_rejected')
      socket.off('swap_approved')
      socket.off('swap_request_received')
      socket.off('leave_approved')
      socket.off('leave_denied')
      socket.off('clockin_reset')
    }
  }, [currentUser?._id])

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
            {/* Top-level tabs */}
            <Box sx={{ display: 'flex' }}>
              {[
                { label: 'Dashboard', action: null },
                { label: 'My Shifts', action: () => navigate('/my-roster') },
              ].map(({ label, action }) => {
                const active = label === 'Dashboard'
                return (
                  <Box key={label} onClick={action || undefined} sx={{
                    px: 2, py: 1.9, cursor: action ? 'pointer' : 'default', fontSize: '0.875rem',
                    fontWeight: active ? 700 : 500,
                    color: active ? ACCENT : '#6b7280',
                    borderBottom: active ? `2px solid ${ACCENT}` : '2px solid transparent',
                    '&:hover': { color: BLUE }, transition: 'all 0.15s',
                  }}>
                    {label}
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
            <IconButton
              size="small"
              sx={{ color: notifAnchor ? ACCENT : '#6b7280' }}
              onClick={e => {
                setNotifAnchor(e.currentTarget)
                // Mark all as read when panel opens
                setNotifications(prev => prev.map(n => ({ ...n, read: true })))
              }}
            >
              <Badge
                badgeContent={notifications.filter(n => !n.read).length}
                color="error"
                max={99}
                sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 16, minWidth: 16 } }}
              >
                <NotificationsIcon fontSize="small" />
              </Badge>
            </IconButton>

            {/* ── NOTIFICATION POPOVER ── */}
            <Popover
              open={Boolean(notifAnchor)}
              anchorEl={notifAnchor}
              onClose={() => setNotifAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{ sx: { width: 380, maxHeight: 520, borderRadius: 3, mt: 1, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' } }}
            >
              {/* Header */}
              <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle1" fontWeight={700} color={BLUE}>Notifications</Typography>
                  {notifications.length > 0 && (
                    <Chip label={notifications.length} size="small" sx={{ bgcolor: '#eff6ff', color: ACCENT, fontWeight: 700, fontSize: 11 }} />
                  )}
                </Box>
                {notifications.length > 0 && (
                  <Button size="small" sx={{ color: '#6b7280', textTransform: 'none', fontSize: 12 }} onClick={() => setNotifications([])}>
                    Clear all
                  </Button>
                )}
              </Box>

              {/* Notification list */}
              <Box sx={{ overflowY: 'auto', maxHeight: 440 }}>
                {notifications.length === 0 ? (
                  <Box sx={{ py: 5, textAlign: 'center' }}>
                    <NotificationsIcon sx={{ color: '#d1d5db', fontSize: 36, mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">You're all caught up.</Typography>
                  </Box>
                ) : (
                  notifications.map((notif, idx) => {
                    const iconMap = {
                      shift_proposal_received: { icon: <EventNoteIcon sx={{ fontSize: 18 }} />,          color: ACCENT,    bg: '#eff6ff' },
                      swap_request_received:   { icon: <SwapHorizIcon sx={{ fontSize: 18 }} />,           color: '#7c3aed', bg: '#f5f3ff' },
                      swap_approved:           { icon: <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />,  color: '#16a34a', bg: '#f0fdf4' },
                      shift_approved:          { icon: <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />,  color: '#16a34a', bg: '#f0fdf4' },
                      shift_denied:            { icon: <CancelOutlinedIcon sx={{ fontSize: 18 }} />,      color: '#dc2626', bg: '#fef2f2' },
                      cover_approved:          { icon: <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />,  color: '#16a34a', bg: '#f0fdf4' },
                      cover_rejected:          { icon: <CancelOutlinedIcon sx={{ fontSize: 18 }} />,      color: '#dc2626', bg: '#fef2f2' },
                      leave_approved:          { icon: <BeachAccessIcon sx={{ fontSize: 18 }} />,         color: '#16a34a', bg: '#f0fdf4' },
                      leave_denied:            { icon: <BeachAccessIcon sx={{ fontSize: 18 }} />,         color: '#dc2626', bg: '#fef2f2' },
                      clockin_reset:           { icon: <AccessTimeIcon sx={{ fontSize: 18 }} />,          color: '#d97706', bg: '#fffbeb' },
                    }
                    const { icon, color, bg } = iconMap[notif.type] || { icon: <NotificationsIcon sx={{ fontSize: 18 }} />, color: '#6b7280', bg: '#f9fafb' }

                    return (
                      <Box key={notif.id}>
                        <Box sx={{ px: 2.5, py: 2, bgcolor: notif.read ? '#fff' : '#f8faff', '&:hover': { bgcolor: '#f9fafb' } }}>
                          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                            {/* Type icon */}
                            <Box sx={{ bgcolor: bg, color, borderRadius: 1.5, p: 0.75, display: 'flex', flexShrink: 0, mt: 0.25 }}>
                              {icon}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                                <Typography variant="body2" fontWeight={700} color={BLUE} sx={{ lineHeight: 1.4 }}>
                                  {notif.title}
                                </Typography>
                                <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>
                                  {timeAgo(notif.timestamp)}
                                </Typography>
                              </Box>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, lineHeight: 1.5 }}>
                                {notif.body}
                              </Typography>

                              {/* Action buttons for proposals */}
                              {notif.type === 'shift_proposal_received' && notif.actionData && (
                                <Box sx={{ display: 'flex', gap: 1, mt: 1.25 }}>
                                  <Button
                                    size="small" variant="contained"
                                    sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, textTransform: 'none', fontWeight: 600, fontSize: 12, py: 0.5, px: 1.5 }}
                                    onClick={() => {
                                      handleRespondToProposal(notif.actionData.proposalId, 'accept')
                                      dismissNotification(notif.id)
                                    }}
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    size="small" variant="outlined" color="error"
                                    sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12, py: 0.5, px: 1.5 }}
                                    onClick={() => {
                                      handleRespondToProposal(notif.actionData.proposalId, 'deny')
                                      dismissNotification(notif.id)
                                    }}
                                  >
                                    Decline
                                  </Button>
                                </Box>
                              )}
                            </Box>
                            {/* Dismiss button */}
                            <IconButton size="small" sx={{ color: '#d1d5db', p: 0.25, flexShrink: 0 }} onClick={() => dismissNotification(notif.id)}>
                              <CancelOutlinedIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Box>
                        </Box>
                        {idx < notifications.length - 1 && <Divider />}
                      </Box>
                    )
                  })
                )}
              </Box>
            </Popover>

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

          {/* Clock-in status banner — shown only on the Overview when clocked in today */}
          {activeNav === 'Overview' && todayClockIn && (
            <Box sx={{
              bgcolor: '#f0fdf4', border: '1px solid #86efac', borderRadius: 3, p: 3, mb: 3,
              display: 'flex', alignItems: 'center', gap: 2,
            }}>
              <Box sx={{ bgcolor: '#16a34a', borderRadius: 2, p: 1, display: 'flex', flexShrink: 0 }}>
                <AccessTimeIcon sx={{ color: '#fff', fontSize: 22 }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" fontWeight={700} color="#15803d">
                  You're clocked in for today
                </Typography>
                <Typography variant="body2" color="#166534">
                  Clocked in at <strong>{todayClockIn.timeClockedIn}</strong>
                  {todayClockIn.isLate && (
                    <Box component="span" sx={{ ml: 1, color: '#d97706', fontWeight: 600 }}>(Late)</Box>
                  )}
                </Typography>
                {(() => {
                  const rem = shiftTimeRemaining(todayClockIn.endOfShift, now)
                  if (!rem) return null
                  if (rem.overtime) {
                    return (
                      <Typography variant="body2" sx={{ mt: 0.5, color: '#dc2626', fontWeight: 600 }}>
                        {rem.h > 0 ? `${rem.h}h ${rem.m}m` : `${rem.m}m`} overtime — clock out when ready
                      </Typography>
                    )
                  }
                  return (
                    <Typography variant="body2" sx={{ mt: 0.5, color: '#166534' }}>
                      {rem.h > 0 ? `${rem.h}h ${rem.m}m` : `${rem.m}m`} remaining until {todayClockIn.endOfShift}
                    </Typography>
                  )
                })()}
              </Box>
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

          {/* ── MARKETPLACE PANEL ── shown when staff clicks the Marketplace nav item */}
          {activeNav === 'Marketplace' && (
            <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 3, p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
                <StorefrontIcon sx={{ color: ACCENT, fontSize: 22 }} />
                <Typography variant="subtitle1" fontWeight={700} color={BLUE}>Shift Marketplace</Typography>
                <Chip
                  label="Open Shifts"
                  size="small"
                  sx={{ bgcolor: '#eff6ff', color: ACCENT, fontWeight: 700, fontSize: 11 }}
                />
              </Box>

              {marketplaceLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : openShifts.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 5 }}>
                  <StorefrontIcon sx={{ fontSize: 44, color: '#d1d5db', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">No open shifts available right now.</Typography>
                  <Typography variant="caption" color="text.secondary">Check back later or ask your manager to post a shift.</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 2 }}>
                  {openShifts.map(shift => (
                    <Box
                      key={shift._id}
                      sx={{
                        border: '1px solid #e5e7eb', borderRadius: 2.5, p: 2.5,
                        bgcolor: '#fafafa', display: 'flex', flexDirection: 'column', gap: 1.5,
                        transition: 'box-shadow 0.15s', '&:hover': { boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }
                      }}
                    >
                      {/* Date badge */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Chip
                          label={shift.date}
                          size="small"
                          sx={{ bgcolor: '#eff6ff', color: ACCENT, fontWeight: 700, fontSize: 11 }}
                        />
                        <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600 }}>
                          {shift.shift_start_time} – {shift.shift_end_time}
                        </Typography>
                      </Box>

                      {/* Original owner info */}
                      <Box>
                        <Typography variant="body2" fontWeight={600} color={BLUE}>
                          {shift.belongs_to?.role || 'Staff'} — {shift.belongs_to?.department || 'General'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Posted by {shift.belongs_to?.staffName || 'a colleague'}
                        </Typography>
                      </Box>

                      <Button
                        variant="contained" size="small"
                        disabled={claimingId === shift._id}
                        startIcon={claimingId === shift._id ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : null}
                        sx={{
                          mt: 'auto', bgcolor: ACCENT, color: '#fff', textTransform: 'none',
                          fontWeight: 600, borderRadius: 2, '&:hover': { bgcolor: '#1d4ed8' },
                          '&.Mui-disabled': { bgcolor: '#93c5fd', color: '#fff' }
                        }}
                        onClick={() => claimShift(shift._id)}
                      >
                        {claimingId === shift._id ? 'Claiming…' : 'Claim Shift'}
                      </Button>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          )}

          {/* ── AVAILABILITY PANEL ── shown when staff clicks the Availability nav item */}
          {activeNav === 'Availability' && (
            <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 3, p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <EventAvailableIcon sx={{ color: ACCENT, fontSize: 22 }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} color={BLUE}>My Availability</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Set when you can work. Smart Match and roster scheduling will respect these settings.
                  </Typography>
                </Box>
              </Box>

              {availLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={28} /></Box>
              ) : (
                <>
                  {/* ── Weekly recurring grid ── */}
                  <Typography variant="subtitle2" fontWeight={700} color={BLUE} mb={1.5}>Weekly Pattern</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mb: 3 }}>
                    {DAYS.map(({ label, dow }) => {
                      const entry = weeklyGrid[dow] ?? { available: true, startTime: '', endTime: '' }
                      return (
                        <Box key={dow} sx={{
                          display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
                          border: '1px solid #e5e7eb', borderRadius: 2, px: 2, py: 1.25,
                          bgcolor: entry.available ? '#fafafa' : '#fef2f2',
                          opacity: entry.saving ? 0.6 : 1, transition: 'opacity 0.2s',
                        }}>
                          <Typography variant="body2" fontWeight={600} color={BLUE} sx={{ width: 100, flexShrink: 0 }}>
                            {label}
                          </Typography>
                          <Tooltip title={entry.available ? 'Click to mark unavailable' : 'Click to mark available'}>
                            <Switch
                              size="small"
                              checked={entry.available}
                              onChange={e => saveWeeklyDay(dow, { available: e.target.checked })}
                              disabled={entry.saving}
                              sx={{ '& .MuiSwitch-thumb': { bgcolor: entry.available ? '#16a34a' : '#dc2626' } }}
                            />
                          </Tooltip>
                          {entry.available ? (
                            <>
                              <TextField
                                size="small" type="time" label="From"
                                value={entry.startTime || ''}
                                onChange={e => setWeeklyGrid(prev => ({ ...prev, [dow]: { ...prev[dow], startTime: e.target.value } }))}
                                onBlur={() => saveWeeklyDay(dow, { startTime: entry.startTime })}
                                slotProps={{ inputLabel: { shrink: true } }}
                                sx={{ width: 130 }}
                              />
                              <TextField
                                size="small" type="time" label="To"
                                value={entry.endTime || ''}
                                onChange={e => setWeeklyGrid(prev => ({ ...prev, [dow]: { ...prev[dow], endTime: e.target.value } }))}
                                onBlur={() => saveWeeklyDay(dow, { endTime: entry.endTime })}
                                slotProps={{ inputLabel: { shrink: true } }}
                                sx={{ width: 130 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {entry.startTime && entry.endTime ? `${entry.startTime} – ${entry.endTime}` : 'All day'}
                              </Typography>
                            </>
                          ) : (
                            <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 600 }}>Unavailable</Typography>
                          )}
                        </Box>
                      )
                    })}
                  </Box>

                  {/* ── Specific date overrides ── */}
                  <Typography variant="subtitle2" fontWeight={700} color={BLUE} mb={1}>Specific Date Overrides</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    Mark a single date as unavailable regardless of your weekly pattern.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
                    <TextField
                      size="small" type="date" label="Date"
                      slotProps={{ inputLabel: { shrink: true } }}
                      value={newOverrideDate}
                      onChange={e => setNewOverrideDate(e.target.value)}
                      sx={{ width: 170 }}
                    />
                    <Button
                      variant="contained" size="small" disabled={overrideAdding || !newOverrideDate}
                      sx={{ bgcolor: '#dc2626', textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: '#b91c1c' } }}
                      onClick={addDateOverride}
                    >
                      {overrideAdding ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Mark Unavailable'}
                    </Button>
                  </Box>
                  {dateOverrides.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">No specific date overrides set.</Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {dateOverrides.map(e => (
                        <Chip
                          key={e.date}
                          label={e.date}
                          onDelete={() => removeDateOverride(e.date)}
                          size="small"
                          sx={{ bgcolor: '#fef2f2', color: '#dc2626', fontWeight: 600, '& .MuiChip-deleteIcon': { color: '#dc2626' } }}
                        />
                      ))}
                    </Box>
                  )}
                </>
              )}
            </Paper>
          )}

          {/* ── LEAVE PANEL ── shown when staff clicks the Leave nav item */}
          {activeNav === 'Leave' && (
            <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 3, p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <BeachAccessIcon sx={{ color: ACCENT, fontSize: 22 }} />
                  <Typography variant="subtitle1" fontWeight={700} color={BLUE}>My Leave Requests</Typography>
                </Box>
                <Button
                  variant="contained" size="small"
                  sx={{ bgcolor: ACCENT, textTransform: 'none', fontWeight: 600, borderRadius: 2, '&:hover': { bgcolor: '#1d4ed8' } }}
                  onClick={() => setLeaveModalOpen(true)}
                >
                  + Request Leave
                </Button>
              </Box>

              {leaveLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : leaveRequests.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 5 }}>
                  <BeachAccessIcon sx={{ fontSize: 44, color: '#d1d5db', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">No leave requests yet.</Typography>
                  <Typography variant="caption" color="text.secondary">Submit a request to notify your manager.</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {leaveRequests.map(lr => {
                    const statusColor = lr.status === 'approved' ? '#16a34a' : lr.status === 'denied' ? '#dc2626' : '#d97706'
                    const statusBg    = lr.status === 'approved' ? '#f0fdf4'  : lr.status === 'denied' ? '#fef2f2'  : '#fffbeb'
                    const typeLabel   = { sick: 'Sick Leave', annual: 'Annual Leave', personal: 'Personal Leave' }[lr.leaveType] || lr.leaveType
                    return (
                      <Box key={lr._id} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, p: 2, bgcolor: '#fafafa' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.75 }}>
                          <Typography variant="body2" fontWeight={700} color={BLUE}>{typeLabel}</Typography>
                          <Chip
                            label={lr.status.charAt(0).toUpperCase() + lr.status.slice(1)}
                            size="small"
                            sx={{ bgcolor: statusBg, color: statusColor, fontWeight: 700, fontSize: 11 }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {lr.startDate} → {lr.endDate}
                        </Typography>
                        {lr.notes && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                            Your note: {lr.notes}
                          </Typography>
                        )}
                        {lr.managerNotes && (
                          <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: '#dc2626' }}>
                            Manager: {lr.managerNotes}
                          </Typography>
                        )}
                      </Box>
                    )
                  })}
                </Box>
              )}
            </Paper>
          )}

          {/* ── LEAVE REQUEST MODAL ── */}
          <Modal open={leaveModalOpen} onClose={() => setLeaveModalOpen(false)}>
            <Box sx={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: 440, bgcolor: '#fff', borderRadius: 3, p: 4, boxShadow: 24, outline: 'none'
            }}>
              <Typography variant="h6" fontWeight={700} color={BLUE} mb={2.5}>Request Leave</Typography>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Leave Type</InputLabel>
                <Select
                  value={leaveForm.leaveType}
                  label="Leave Type"
                  onChange={e => setLeaveForm(f => ({ ...f, leaveType: e.target.value }))}
                >
                  <MenuItem value="annual">Annual Leave</MenuItem>
                  <MenuItem value="sick">Sick Leave</MenuItem>
                  <MenuItem value="personal">Personal Leave</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth size="small" label="Start Date" type="date" sx={{ mb: 2 }}
                slotProps={{ inputLabel: { shrink: true } }}
                value={leaveForm.startDate}
                onChange={e => setLeaveForm(f => ({ ...f, startDate: e.target.value }))}
              />
              <TextField
                fullWidth size="small" label="End Date" type="date" sx={{ mb: 2 }}
                slotProps={{ inputLabel: { shrink: true } }}
                value={leaveForm.endDate}
                onChange={e => setLeaveForm(f => ({ ...f, endDate: e.target.value }))}
              />
              <TextField
                fullWidth size="small" label="Notes (optional)" multiline rows={3} sx={{ mb: 3 }}
                value={leaveForm.notes}
                onChange={e => setLeaveForm(f => ({ ...f, notes: e.target.value }))}
              />
              <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
                <Button variant="outlined" sx={{ textTransform: 'none' }} onClick={() => setLeaveModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="contained" disabled={leaveSubmitting}
                  sx={{ bgcolor: ACCENT, textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: '#1d4ed8' } }}
                  onClick={submitLeaveRequest}
                >
                  {leaveSubmitting ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Submit Request'}
                </Button>
              </Box>
            </Box>
          </Modal>

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
