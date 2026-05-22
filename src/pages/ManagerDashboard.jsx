import apiFetch from '../utils/apiFetch.js';
import { getSocket, disconnectSocket } from '../utils/socketClient.js';
import { registerPushNotifications } from '../utils/pushNotifications.js';
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, Typography, CircularProgress, Avatar, Chip,
  LinearProgress, TextField, InputAdornment, IconButton, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Snackbar, Alert,
  Fab, Tooltip, Badge, Popover, Divider,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import SettingsIcon from "@mui/icons-material/Settings";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsIcon from "@mui/icons-material/Notifications";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PublishIcon from "@mui/icons-material/Publish";
import BoltIcon from "@mui/icons-material/Bolt";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import SendIcon from "@mui/icons-material/Send";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import EventNoteIcon from "@mui/icons-material/EventNote";
import StorefrontIcon from "@mui/icons-material/Storefront";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import BlockIcon from "@mui/icons-material/Block";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000)
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// Brand colour tokens
const BLUE = "#1a3a6b";
const ACCENT = "#2563eb";
// Backend base URL from the environment
const BASE = import.meta.env.VITE_API_BASE_URL;

// Maps clock-in status strings to their display colours
const STATUS_COLORS = {
  "ON TIME":  "#16a34a",
  "OVERTIME": "#dc2626",
  "LATE IN":  "#d97706",
};

// Sidebar navigation items with icons and labels
const NAV_ITEMS = [
  { icon: <DashboardIcon fontSize="small" />, label: "Overview" },
  { icon: <PeopleIcon fontSize="small" />, label: "Roster" },
  { icon: <AccessTimeIcon fontSize="small" />, label: "Attendance" },
  { icon: <PersonAddIcon fontSize="small" />, label: "Invite Staff" },
  { icon: <SwapHorizIcon fontSize="small" />, label: "Shift Swaps" },
  { icon: <StorefrontIcon fontSize="small" />, label: "Cover Requests" },
  { icon: <SettingsIcon fontSize="small" />, label: "Settings" },
];

// Main manager dashboard — shows live attendance, swap approvals, shift request approvals, weekly chart, and AI assistant
export default function ManagerDashboard() {
  // Authenticated manager's profile
  const [currentManager, setCurrentManager] = useState(null);
  // True while the initial auth check is pending
  const [loading, setLoading]               = useState(true);
  // Which sidebar nav item is highlighted
  const [activeNav, setActiveNav]           = useState("Overview");
  // Which top-bar tab is active
  const [activeTopTab, setActiveTopTab]     = useState("Dashboard");
  // Whether the coverage alert banner is visible (can be dismissed)
  const [alertVisible, setAlertVisible]     = useState(true);
  // Pending shift swap requests awaiting manager approval
  const [pendingSwaps, setPendingSwaps]         = useState([]);
  // Pending staff shift requests (staff requesting to be added to a roster)
  const [pendingShiftRequests, setPendingShiftRequests] = useState([]);
  // Per-request time inputs keyed by request ID, used before approving a shift request
  const [requestTimes, setRequestTimes]                 = useState({});
  // Today's clock-in/out records for the ledger table
  const [todayLedger, setTodayLedger]       = useState([]);
  // Per-day attendance data for the weekly bar chart
  const [weeklyData, setWeeklyData]         = useState([]);
  // How many staff are currently on shift vs. total scheduled
  const [shiftStats, setShiftStats]         = useState({ onShift: 0, total: 0 });
  // Controls the bottom snackbar notification
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  // Organisation roles shown in the Settings panel
  const [orgRoles, setOrgRoles]             = useState([]);
  // Current value of the new-role text field in Settings
  const [roleInput, setRoleInput]           = useState('');
  // True while a role add/remove API call is in flight
  const [rolesSaving, setRolesSaving]       = useState(false);
  // Notification bell — list of in-session notifications and popover anchor
  const [notifications, setNotifications]           = useState([]);
  const [notifAnchor, setNotifAnchor]               = useState(null);
  // Cover requests awaiting manager approval (status: pending_cover)
  const [pendingCoverShifts, setPendingCoverShifts] = useState([]);
  // Shifts currently live in the Marketplace (status: open_cover)
  const [activeOpenShifts, setActiveOpenShifts]     = useState([]);
  // ID of the shift currently being approved/rejected/cancelled (per-card loading)
  const [coverActionId, setCoverActionId]           = useState(null);
  // Whether the floating AI chat panel is open
  const [chatOpen, setChatOpen]             = useState(false);
  // Message thread for the manager AI assistant
  const [chatMessages, setChatMessages]     = useState([
    { role: 'model', content: "Hi! I'm your AI assistant. You can ask me to invite staff, create roster shifts, remove a shift, or check the roster. Try: \"Invite john@example.com as Kitchen Staff\" or \"Add a shift for Alice on Friday 9am to 5pm\"." }
  ]);
  // Current value of the chat text input
  const [chatInput, setChatInput]           = useState('');
  // True while waiting for the AI API response
  const [chatLoading, setChatLoading]       = useState(false);
  // Ref used to auto-scroll the chat to the latest message
  const chatEndRef                          = useRef(null);
  const navigate = useNavigate();
  // JWT stored after manager email/password login
  const managerToken = localStorage.getItem("aes52");

  // Loads pending swap requests and maps them to a display-friendly shape
  async function fetchPendingSwaps() {
    try {
      const res = await apiFetch(`${BASE}/api/pending-swaps`, {
        headers: { authorization: `Bearer ${managerToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = (data.pendingSwaps || []).map(swap => ({
          id: swap._id,
          requester: swap.belongs_to?.staffName || 'Unknown',
          requestedWith: swap.swap_belongs_to?.staffName || 'Unknown',
          date: swap.swapDate || swap.date || '',
          shift: `${swap.swap_shift_start_time || ''} – ${swap.swap_shift_end_time || ''}`
        }));
        setPendingSwaps(mapped);
      }
    } catch { /* keep empty */ }
  }

  // Loads staff-initiated shift requests that need manager approval
  async function fetchPendingShiftRequests() {
    try {
      const res = await apiFetch(`${BASE}/api/pending-shift-requests`, {
        headers: { authorization: `Bearer ${managerToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingShiftRequests(data.requests || []);
      }
    } catch { /* keep empty */ }
  }

  // Loads today's clock-in/out records for the staff ledger table
  async function fetchTodayLedger() {
    try {
      const res = await apiFetch(`${BASE}/api/today-ledger`, {
        headers: { authorization: `Bearer ${managerToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTodayLedger(data.ledger || []);
      }
    } catch { /* keep empty */ }
  }

  // Loads per-day clock-in counts for the past 7 days, used in the bar chart
  async function fetchWeeklyAttendance() {
    try {
      const res = await apiFetch(`${BASE}/api/weekly-attendance`, {
        headers: { authorization: `Bearer ${managerToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.weeklyAttendance?.length) setWeeklyData(data.weeklyAttendance);
      }
    } catch { /* keep empty */ }
  }

  // Loads how many staff are currently on shift vs. the total scheduled for today
  async function fetchShiftStats() {
    try {
      const res = await apiFetch(`${BASE}/api/shift-stats`, {
        headers: { authorization: `Bearer ${managerToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setShiftStats({ onShift: data.onShift, total: data.total });
      }
    } catch { /* keep default */ }
  }

  // Loads the organisation's defined roles for display and editing in the Settings panel
  async function fetchOrgRoles() {
    try {
      const res = await apiFetch(`${BASE}/api/org-roles`, {
        headers: { authorization: `Bearer ${managerToken}` }
      });
      if (res.ok) { const d = await res.json(); setOrgRoles(d.roles || []); }
    } catch { /* non-critical */ }
  }

  function addNotification(notif) {
    setNotifications(prev => [{ id: `${Date.now()}-${Math.random()}`, read: false, timestamp: new Date(), ...notif }, ...prev])
  }

  function dismissNotification(id) {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  async function fetchPendingCoverShifts() {
    try {
      const res = await apiFetch(`${BASE}/api/pending-cover-shifts`, {
        headers: { authorization: `Bearer ${managerToken}` }
      })
      if (res.ok) { const d = await res.json(); setPendingCoverShifts(d.shifts || []) }
    } catch { /* keep empty */ }
  }

  async function fetchActiveOpenShifts() {
    try {
      const res = await apiFetch(`${BASE}/api/active-open-shifts`, {
        headers: { authorization: `Bearer ${managerToken}` }
      })
      if (res.ok) { const d = await res.json(); setActiveOpenShifts(d.shifts || []) }
    } catch { /* keep empty */ }
  }

  // Adds a new role to the organisation's role list via the API
  async function handleAddRole() {
    const role = roleInput.trim()
    if (!role) return
    setRolesSaving(true)
    try {
      const res = await apiFetch(`${BASE}/api/org-roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({ role })
      })
      const data = await res.json()
      if (res.ok) { setOrgRoles(data.roles); setRoleInput(''); setSnack({ open: true, msg: 'Role added.', severity: 'success' }); }
      else setSnack({ open: true, msg: data.message || 'Failed to add role.', severity: 'error' })
    } catch { setSnack({ open: true, msg: 'Network error.', severity: 'error' }) }
    finally { setRolesSaving(false) }
  }

  // Removes an existing role from the organisation's role list via the API
  async function handleRemoveRole(role) {
    try {
      const res = await apiFetch(`${BASE}/api/org-roles/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({ role })
      })
      const data = await res.json()
      if (res.ok) { setOrgRoles(data.roles); setSnack({ open: true, msg: 'Role removed.', severity: 'info' }); }
      else setSnack({ open: true, msg: data.message || 'Failed to remove role.', severity: 'error' })
    } catch { setSnack({ open: true, msg: 'Network error.', severity: 'error' }) }
  }

  // Validates the manager's JWT and, on success, kicks off all data fetches in parallel
  async function checkManagerAuth() {
    try {
      const res = await apiFetch(`${BASE}/api/manager-auth`, {
        headers: { "Content-Type": "application/json", authorization: `Bearer ${managerToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentManager(data.user);
        setLoading(false);
        // Kick off all dashboard data fetches after confirming the session is valid
        fetchPendingSwaps();
        fetchPendingShiftRequests();
        fetchTodayLedger();
        fetchWeeklyAttendance();
        fetchShiftStats();
        fetchOrgRoles();
        fetchPendingCoverShifts();
        fetchActiveOpenShifts();
        registerPushNotifications(managerToken, 'manager');
      } else {
        localStorage.removeItem("aes52");
        localStorage.removeItem("userRole");
        navigate("/manager-login?msg=Your session has expired. Please log in again.");
      }
    } catch {
      localStorage.removeItem("aes52");
      localStorage.removeItem("userRole");
      navigate("/manager-login?msg=Could not verify your session. Please log in again.");
    }
  }

  // On mount: redirect if no token, otherwise run the auth check
  useEffect(() => {
    if (!managerToken || managerToken.length === 0) { navigate("/manager-login?msg=Please log in to continue."); return; }
    checkManagerAuth();
  }, []);

  // Real-time socket listeners — connect once the manager is authenticated
  useEffect(() => {
    if (!currentManager?._id) return
    const socket = getSocket()
    socket.connect()

    // Re-emit join_room on every (re)connection so the socket stays in the managers room
    // after network drops or server restarts — Socket.io rooms are in-memory and reset on disconnect
    const handleConnect = () => socket.emit('join_room', { role: 'manager' })
    socket.on('connect', handleConnect)
    if (socket.connected) socket.emit('join_room', { role: 'manager' })

    // Staff member accepted a proposal — add it back to the list for final confirmation
    socket.on('shift_proposal_responded', (request) => {
      setPendingShiftRequests(prev => {
        const exists = prev.some(r => r._id === request._id)
        return exists
          ? prev.map(r => r._id === request._id ? request : r)
          : [...prev, request]
      })
      addNotification({
        type: 'shift_proposal_responded',
        title: 'Staff Accepted Shift Proposal',
        body: `${request.staffMember?.staffName || 'A staff member'} agreed to the shift on ${request.requestedDate} (${request.proposedStartTime} – ${request.proposedEndTime}) — ready to confirm`,
        actionData: { requestId: request._id, staffName: request.staffMember?.staffName, requestedDate: request.requestedDate }
      })
    })

    // A staff member dropped a shift via AI chat — add it to the pending cover queue
    socket.on('cover_request_pending', (shift) => {
      setPendingCoverShifts(prev => {
        const exists = prev.some(s => s._id === shift.shiftId)
        if (exists) return prev
        return [...prev, {
          _id: shift.shiftId,
          date: shift.date,
          shift_start_time: shift.shift_start_time,
          shift_end_time: shift.shift_end_time,
          belongs_to: { _id: shift.staffId }
        }]
      })
      addNotification({
        type: 'cover_request_pending',
        title: 'Cover Request Needs Approval',
        body: `A staff member needs cover for their shift on ${shift.date} (${shift.shift_start_time} – ${shift.shift_end_time})`,
        actionData: { shiftId: shift.shiftId, date: shift.date }
      })
    })

    // A staff member claimed an open shift — remove it from the active open shifts list
    socket.on('shift_claimed', ({ shiftId, date, claimerName, shift_start_time, shift_end_time }) => {
      setActiveOpenShifts(prev => prev.filter(s => s._id !== shiftId))
      addNotification({
        type: 'shift_claimed',
        title: 'Open Shift Claimed',
        body: `${claimerName || 'A staff member'} claimed the shift on ${date} (${shift_start_time} – ${shift_end_time})`,
        actionData: null
      })
    })

    // Both staff members agreed to a swap — awaiting manager approval
    socket.on('swap_pending_approval', ({ staffAName, staffBName, date, swapDate }) => {
      addNotification({
        type: 'swap_pending_approval',
        title: 'Shift Swap Needs Approval',
        body: `${staffAName} and ${staffBName} have agreed to swap shifts (${date} ↔ ${swapDate || date}). Review it in the dashboard.`,
        actionData: null
      })
    })

    return () => {
      socket.off('connect', handleConnect)
      socket.off('shift_proposal_responded')
      socket.off('cover_request_pending')
      socket.off('shift_claimed')
      socket.off('swap_pending_approval')
    }
  }, [currentManager?._id]);

  async function handleApproveCover(id) {
    setCoverActionId(id)
    try {
      const res = await apiFetch(`${BASE}/api/approve-cover/${id}`, {
        method: 'POST',
        headers: { authorization: `Bearer ${managerToken}` }
      })
      if (res.ok) {
        setPendingCoverShifts(prev => prev.filter(s => s._id !== id))
        // Reload active open shifts so the newly approved shift appears
        await fetchActiveOpenShifts()
        setSnack({ open: true, msg: 'Cover approved — shift is now live in the Marketplace', severity: 'success' })
      } else {
        const d = await res.json()
        setSnack({ open: true, msg: d.message || 'Approval failed', severity: 'error' })
      }
    } catch { setSnack({ open: true, msg: 'Network error — please try again', severity: 'error' }) }
    finally { setCoverActionId(null) }
  }

  async function handleRejectCover(id) {
    setCoverActionId(id)
    try {
      const res = await apiFetch(`${BASE}/api/reject-cover/${id}`, {
        method: 'POST',
        headers: { authorization: `Bearer ${managerToken}` }
      })
      if (res.ok) {
        setPendingCoverShifts(prev => prev.filter(s => s._id !== id))
        setSnack({ open: true, msg: 'Cover request rejected — shift returned to staff member', severity: 'info' })
      } else {
        const d = await res.json()
        setSnack({ open: true, msg: d.message || 'Rejection failed', severity: 'error' })
      }
    } catch { setSnack({ open: true, msg: 'Network error — please try again', severity: 'error' }) }
    finally { setCoverActionId(null) }
  }

  async function handleCancelOpenShift(id) {
    setCoverActionId(id)
    try {
      const res = await apiFetch(`${BASE}/api/cancel-open-shift/${id}`, {
        method: 'POST',
        headers: { authorization: `Bearer ${managerToken}` }
      })
      if (res.ok) {
        setActiveOpenShifts(prev => prev.filter(s => s._id !== id))
        setSnack({ open: true, msg: 'Shift pulled from Marketplace — returned to original staff member', severity: 'info' })
      } else {
        const d = await res.json()
        setSnack({ open: true, msg: d.message || 'Cancellation failed', severity: 'error' })
      }
    } catch { setSnack({ open: true, msg: 'Network error — please try again', severity: 'error' }) }
    finally { setCoverActionId(null) }
  }

  // Clears the JWT, disconnects the socket, and navigates to the landing page
  function handleLogout() {
    localStorage.removeItem("aes52");
    localStorage.removeItem("userRole");
    disconnectSocket();
    navigate("/");
  }

  // Approves a pending swap request and removes it from the list on success
  async function handleApproveSwap(id) {
    try {
      const res = await apiFetch(`${BASE}/api/swap-final-approval/${id}`, {
        method: 'POST',
        headers: { "Content-Type": "application/json", authorization: `Bearer ${managerToken}` }
      });
      if (res.ok) {
        setPendingSwaps(prev => prev.filter(s => s.id !== id));
        setSnack({ open: true, msg: "Swap Approved — confirmation emails sent", severity: "success" });
      } else {
        const data = await res.json();
        setSnack({ open: true, msg: data.message || "Approval failed", severity: "error" });
      }
    } catch {
      setSnack({ open: true, msg: "Network error — please try again", severity: "error" });
    }
  }

  // Denies a pending swap request and removes it from the list on success
  async function handleDenySwap(id) {
    try {
      const res = await apiFetch(`${BASE}/api/deny-swap/${id}`, {
        method: 'POST',
        headers: { "Content-Type": "application/json", authorization: `Bearer ${managerToken}` }
      });
      if (res.ok) {
        setPendingSwaps(prev => prev.filter(s => s.id !== id));
        setSnack({ open: true, msg: "Swap Request Denied", severity: "error" });
      } else {
        setSnack({ open: true, msg: "Failed to deny swap", severity: "error" });
      }
    } catch {
      setSnack({ open: true, msg: "Network error — please try again", severity: "error" });
    }
  }

  // Updates the locally stored start/end time for a specific shift request (used in the proposal form)
  function setRequestTime(id, field, value) {
    setRequestTimes(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  // Manager sends a time proposal to the staff member rather than directly adding to roster.
  // The request moves to 'proposed' status; the staff member must accept before the roster is updated.
  async function handleProposeShiftTime(req) {
    const times = requestTimes[req._id] || {};
    const startTime = times.startTime || req.requestedStartTime || '';
    const endTime   = times.endTime   || req.requestedEndTime   || '';
    if (!startTime || !endTime) {
      setSnack({ open: true, msg: 'Please enter a start time and end time to propose.', severity: 'warning' });
      return;
    }
    try {
      const res = await apiFetch(`${BASE}/api/shift-request-propose/${req._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({ startTime, endTime })
      });
      if (res.ok) {
        setPendingShiftRequests(prev => prev.filter(r => r._id !== req._id));
        setRequestTimes(prev => { const next = { ...prev }; delete next[req._id]; return next; });
        setSnack({ open: true, msg: 'Time proposal sent — awaiting staff response', severity: 'success' });
      } else {
        const data = await res.json();
        setSnack({ open: true, msg: data.message || 'Proposal failed', severity: 'error' });
      }
    } catch {
      setSnack({ open: true, msg: 'Network error — please try again', severity: 'error' });
    }
  }

  // Manager confirms a staff-agreed proposal, which creates the roster shift and Google Calendar event.
  async function handleConfirmShiftRequest(id) {
    try {
      const res = await apiFetch(`${BASE}/api/shift-request-resolve/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({ action: 'confirm' })
      });
      if (res.ok) {
        setPendingShiftRequests(prev => prev.filter(r => r._id !== id));
        setSnack({ open: true, msg: 'Shift confirmed — added to roster and Google Calendar', severity: 'success' });
      } else {
        const data = await res.json();
        setSnack({ open: true, msg: data.message || 'Confirmation failed', severity: 'error' });
      }
    } catch {
      setSnack({ open: true, msg: 'Network error — please try again', severity: 'error' });
    }
  }

  // Denies a shift request or proposal at any stage and removes it from the list
  async function handleDenyShiftRequest(id) {
    try {
      const res = await apiFetch(`${BASE}/api/shift-request-resolve/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({ action: 'deny' })
      });
      if (res.ok) {
        setPendingShiftRequests(prev => prev.filter(r => r._id !== id));
        setRequestTimes(prev => { const next = { ...prev }; delete next[id]; return next; });
        setSnack({ open: true, msg: 'Shift request denied', severity: 'info' });
      } else {
        setSnack({ open: true, msg: 'Failed to deny request', severity: 'error' });
      }
    } catch {
      setSnack({ open: true, msg: 'Network error — please try again', severity: 'error' });
    }
  }

  // Scrolls the chat panel to the latest message whenever messages or the open state change
  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatOpen]);

  // Sends the manager's message to the AI assistant endpoint and appends the response
  async function sendChatMessage() {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: text }]);
    setChatLoading(true);
    try {
      const res = await apiFetch(`${BASE}/api/manager-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      if (res.ok) {
        setChatMessages(prev => [...prev, { role: 'model', content: data.result?.message || 'Done.' }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'model', content: data.message || 'Something went wrong. Please try again.' }]);
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'model', content: 'Could not reach the AI service. Is Ollama running?' }]);
    } finally {
      setChatLoading(false);
    }
  }

  // Triggers an attendance Excel download and saves the file to the user's device
  async function downloadAttendance() {
    try {
      const res = await apiFetch(`${BASE}/api/download-attendance`, {
        headers: { authorization: `Bearer ${managerToken}` },
      });
      if (!res.ok) {
        setSnack({ open: true, msg: "Failed to download attendance report", severity: "error" });
        return;
      }
      const blob = await res.blob();
      // Create a temporary object URL and trigger a browser download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "attendance_export.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setSnack({ open: true, msg: "Failed to download attendance report", severity: "error" });
    }
  }

  // Routes sidebar nav clicks to the correct page or panel action
  function handleNavClick(label) {
    setActiveNav(label);
    if (label === "Roster") navigate("/manager-roster");
    if (label === "Invite Staff") navigate("/invite-staff");
    // "Attendance" triggers an immediate download rather than navigating to a new page
    if (label === "Attendance") downloadAttendance();
    if (label === "Settings") fetchOrgRoles();
    if (label === "Shift Swaps")     fetchPendingSwaps();
    if (label === "Cover Requests") { fetchPendingCoverShifts(); fetchActiveOpenShifts(); }
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f0f4f8" }}>
        <CircularProgress />
      </Box>
    );
  }

  // Derived display values computed from the manager profile
  const orgName        = currentManager?.org_name   || "Your Organisation";
  const managerInitial = (currentManager?.first_name || "M")[0].toUpperCase();
  // Percentage of scheduled staff currently on shift, used for the progress bar
  const onShiftPct     = shiftStats.total > 0 ? Math.round((shiftStats.onShift / shiftStats.total) * 100) : 0;
  // Maximum bar height normaliser for the weekly attendance chart
  const maxActual      = weeklyData.length ? Math.max(...weeklyData.map(d => d.actual), ...weeklyData.map(d => d.target), 1) : 1;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f0f4f8" }}>

      {/* ── LEFT SIDEBAR ── */}
      <Box sx={{
        width: 240, flexShrink: 0, bgcolor: "#fff", borderRight: "1px solid #e5e7eb",
        display: "flex", flexDirection: "column", position: "fixed", height: "100vh", zIndex: 10,
      }}>
        {/* Manager avatar and organisation name at the top of the sidebar */}
        <Box sx={{ p: 3, borderBottom: "1px solid #e5e7eb" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar sx={{ bgcolor: BLUE, width: 38, height: 38, fontSize: 15, fontWeight: 700 }}>
              {managerInitial}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700} color={BLUE} noWrap>{orgName}</Typography>
              <Typography variant="caption" color="text.secondary">Staff Management</Typography>
            </Box>
          </Box>
        </Box>

        {/* Sidebar navigation items */}
        <Box sx={{ flex: 1, py: 1.5 }}>
          {NAV_ITEMS.map(({ icon, label }) => {
            const active = activeNav === label;
            return (
              <Box
                key={label}
                onClick={() => handleNavClick(label)}
                sx={{
                  display: "flex", alignItems: "center", gap: 1.5,
                  px: 3, py: 1.25, cursor: "pointer",
                  // Highlight the active nav item with an accent border and tinted background
                  bgcolor: active ? "#eff6ff" : "transparent",
                  borderRight: active ? `3px solid ${ACCENT}` : "3px solid transparent",
                  color: active ? ACCENT : "#6b7280",
                  "&:hover": { bgcolor: "#f9fafb", color: BLUE },
                  transition: "all 0.15s",
                }}
              >
                {icon}
                <Typography variant="body2" fontWeight={active ? 700 : 500}>{label}</Typography>
              </Box>
            );
          })}
        </Box>

        {/* Bottom sidebar actions — clock-in shortcut and logout */}
        <Box sx={{ p: 2, borderTop: "1px solid #e5e7eb" }}>
          <Button
            fullWidth variant="contained" startIcon={<DirectionsBusIcon />}
            sx={{ bgcolor: BLUE, color: "#fff", textTransform: "none", fontWeight: 600, borderRadius: 2, mb: 1, py: 1.1, "&:hover": { bgcolor: "#142e58" } }}
            onClick={() => navigate("/staff-clock-in")}
          >
            Clock In
          </Button>
          <Button
            fullWidth variant="text" startIcon={<LogoutIcon />}
            sx={{ color: "#6b7280", textTransform: "none", fontWeight: 500, justifyContent: "flex-start" }}
            onClick={handleLogout}
          >
            Log Out
          </Button>
        </Box>
      </Box>

      {/* ── MAIN AREA ── */}
      <Box sx={{ ml: "240px", flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Sticky top bar with tab navigation and search */}
        <Box sx={{
          bgcolor: "#fff", borderBottom: "1px solid #e5e7eb",
          px: 4, height: 60, display: "flex", alignItems: "center",
          justifyContent: "space-between", position: "sticky", top: 0, zIndex: 9,
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Typography variant="h6" fontWeight={800} color={BLUE} sx={{ letterSpacing: "-0.3px", cursor: "pointer" }} onClick={() => { setActiveNav("Overview"); setActiveTopTab("Dashboard"); }}>
              Shift Sync
            </Typography>
            {/* Top-level tabs: Dashboard stays on this page, Schedule goes to roster, Reports downloads CSV */}
            <Box sx={{ display: "flex" }}>
              {["Dashboard", "Schedule", "Reports"].map((tab) => {
                const active = activeTopTab === tab;
                return (
                  <Box key={tab} onClick={() => {
                    setActiveTopTab(tab);
                    if (tab === "Dashboard") setActiveNav("Overview");
                    if (tab === "Schedule") navigate("/manager-roster");
                    if (tab === "Reports") downloadAttendance();
                  }} sx={{
                    px: 2, py: 1.9, cursor: "pointer", fontSize: "0.875rem",
                    fontWeight: active ? 700 : 500,
                    color: active ? ACCENT : "#6b7280",
                    borderBottom: active ? `2px solid ${ACCENT}` : "2px solid transparent",
                    "&:hover": { color: BLUE }, transition: "all 0.15s",
                  }}>
                    {tab}
                  </Box>
                );
              })}
            </Box>
          </Box>
          {/* Right side: search, notification bell, help, avatar */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <TextField
              size="small" placeholder="Search operations..."
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: "#9ca3af", fontSize: 18 }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2, fontSize: "0.875rem" },
                },
              }}
              sx={{ width: 220 }}
            />
            <IconButton
              size="small"
              sx={{ color: notifAnchor ? ACCENT : "#6b7280" }}
              onClick={e => {
                setNotifAnchor(e.currentTarget)
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
              PaperProps={{ sx: { width: 400, maxHeight: 540, borderRadius: 3, mt: 1, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' } }}
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

              <Box sx={{ overflowY: 'auto', maxHeight: 460 }}>
                {notifications.length === 0 ? (
                  <Box sx={{ py: 5, textAlign: 'center' }}>
                    <NotificationsIcon sx={{ color: '#d1d5db', fontSize: 36, mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">No notifications yet.</Typography>
                  </Box>
                ) : (
                  notifications.map((notif, idx) => {
                    const iconMap = {
                      cover_request_pending:   { icon: <StorefrontIcon sx={{ fontSize: 18 }} />,          color: '#d97706', bg: '#fef9c3' },
                      shift_proposal_responded:{ icon: <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />,   color: ACCENT,    bg: '#eff6ff' },
                      shift_claimed:           { icon: <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />,   color: '#16a34a', bg: '#f0fdf4' },
                      swap_pending_approval:   { icon: <SwapHorizIcon sx={{ fontSize: 18 }} />,            color: '#7c3aed', bg: '#f5f3ff' },
                    }
                    const { icon, color, bg } = iconMap[notif.type] || { icon: <NotificationsIcon sx={{ fontSize: 18 }} />, color: '#6b7280', bg: '#f9fafb' }

                    return (
                      <Box key={notif.id}>
                        <Box sx={{ px: 2.5, py: 2, bgcolor: notif.read ? '#fff' : '#f8faff', '&:hover': { bgcolor: '#f9fafb' } }}>
                          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
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

                              {/* Approve & Post / Reject for cover requests */}
                              {notif.type === 'cover_request_pending' && notif.actionData && (
                                <Box sx={{ display: 'flex', gap: 1, mt: 1.25 }}>
                                  <Button
                                    size="small" variant="contained"
                                    sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, textTransform: 'none', fontWeight: 600, fontSize: 12, py: 0.5, px: 1.5 }}
                                    onClick={() => {
                                      handleApproveCover(notif.actionData.shiftId)
                                      dismissNotification(notif.id)
                                      setNotifAnchor(null)
                                    }}
                                  >
                                    Approve & Post
                                  </Button>
                                  <Button
                                    size="small" variant="outlined" color="error"
                                    sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12, py: 0.5, px: 1.5 }}
                                    onClick={() => {
                                      handleRejectCover(notif.actionData.shiftId)
                                      dismissNotification(notif.id)
                                    }}
                                  >
                                    Reject
                                  </Button>
                                </Box>
                              )}

                              {/* Confirm & Add to Roster for staff-agreed proposals */}
                              {notif.type === 'shift_proposal_responded' && notif.actionData && (
                                <Box sx={{ mt: 1.25 }}>
                                  <Button
                                    size="small" variant="contained"
                                    sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#1d4ed8' }, textTransform: 'none', fontWeight: 600, fontSize: 12, py: 0.5, px: 1.5 }}
                                    onClick={() => {
                                      handleConfirmShiftRequest(notif.actionData.requestId)
                                      dismissNotification(notif.id)
                                      setNotifAnchor(null)
                                    }}
                                  >
                                    Confirm & Add to Roster
                                  </Button>
                                </Box>
                              )}
                            </Box>
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

            <IconButton size="small" sx={{ color: "#6b7280" }}><HelpOutlineIcon /></IconButton>
            <Avatar sx={{ width: 34, height: 34, bgcolor: BLUE, fontSize: 14, cursor: "pointer" }}>
              {managerInitial}
            </Avatar>
          </Box>
        </Box>

        {/* Page content */}
        <Box sx={{ flex: 1, p: 4, overflowY: "auto" }}>

          {/* ── COVER REQUESTS PANEL — shown when "Cover Requests" nav item is active ── */}
          {activeNav === "Cover Requests" && (
            <Box>
              <Typography variant="h4" fontWeight={800} color={BLUE} gutterBottom>Cover Requests</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Review staff cover requests before they go live in the Marketplace, and manage shifts already posted.
              </Typography>

              {/* ── Pending Approval section ── */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} color={BLUE}>Awaiting Your Approval</Typography>
                {pendingCoverShifts.length > 0 && (
                  <Chip label={pendingCoverShifts.length} size="small" sx={{ bgcolor: "#fef2f2", color: "#dc2626", fontWeight: 700, fontSize: 11 }} />
                )}
              </Box>

              {pendingCoverShifts.length === 0 ? (
                <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3, p: 4, textAlign: "center", mb: 4 }}>
                  <CheckCircleOutlineIcon sx={{ color: "#d1d5db", fontSize: 40, mb: 0.5 }} />
                  <Typography variant="body2" color="text.secondary">No cover requests pending approval.</Typography>
                </Paper>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 4 }}>
                  {pendingCoverShifts.map(shift => {
                    const isActing = coverActionId === shift._id
                    return (
                      <Paper key={shift._id} elevation={0} sx={{ border: "1px solid #fde68a", borderRadius: 3, p: 3, bgcolor: "#fffbeb" }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
                          <Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                              <StorefrontIcon sx={{ color: "#d97706", fontSize: 18 }} />
                              <Typography variant="subtitle2" fontWeight={700} color={BLUE}>
                                {shift.belongs_to?.staffName || "A staff member"}
                                <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}> — {shift.date}</Box>
                              </Typography>
                              <Chip label="Pending Approval" size="small" sx={{ bgcolor: "#fef3c7", color: "#92400e", fontWeight: 700, fontSize: 10 }} />
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              {shift.shift_start_time} – {shift.shift_end_time}
                              {shift.belongs_to?.role ? ` · ${shift.belongs_to.role}` : ''}
                              {shift.belongs_to?.department ? ` · ${shift.belongs_to.department}` : ''}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <Button
                              variant="contained" size="small" disabled={isActing}
                              startIcon={isActing ? <CircularProgress size={12} color="inherit" /> : <CheckCircleOutlineIcon />}
                              sx={{ bgcolor: "#16a34a", "&:hover": { bgcolor: "#15803d" }, textTransform: "none", fontWeight: 600, borderRadius: 2, px: 2 }}
                              onClick={() => handleApproveCover(shift._id)}
                            >
                              Approve & Post
                            </Button>
                            <Button
                              variant="outlined" color="error" size="small" disabled={isActing}
                              startIcon={<BlockIcon />}
                              sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, px: 2 }}
                              onClick={() => handleRejectCover(shift._id)}
                            >
                              Reject
                            </Button>
                          </Box>
                        </Box>
                      </Paper>
                    )
                  })}
                </Box>
              )}

              {/* ── Live in Marketplace section ── */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} color={BLUE}>Live in Marketplace</Typography>
                {activeOpenShifts.length > 0 && (
                  <Chip label={activeOpenShifts.length} size="small" sx={{ bgcolor: "#eff6ff", color: ACCENT, fontWeight: 700, fontSize: 11 }} />
                )}
              </Box>

              {activeOpenShifts.length === 0 ? (
                <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3, p: 4, textAlign: "center" }}>
                  <StorefrontIcon sx={{ color: "#d1d5db", fontSize: 40, mb: 0.5 }} />
                  <Typography variant="body2" color="text.secondary">No shifts currently live in the Marketplace.</Typography>
                </Paper>
              ) : (
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" }, gap: 2 }}>
                  {activeOpenShifts.map(shift => {
                    const isActing = coverActionId === shift._id
                    return (
                      <Paper key={shift._id} elevation={0} sx={{ border: "1px solid #bfdbfe", borderRadius: 3, p: 3, bgcolor: "#eff6ff" }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
                          <Chip label={shift.date} size="small" sx={{ bgcolor: "#dbeafe", color: ACCENT, fontWeight: 700, fontSize: 11 }} />
                          <Chip label="Live" size="small" sx={{ bgcolor: "#dcfce7", color: "#15803d", fontWeight: 700, fontSize: 10 }} />
                        </Box>
                        <Typography variant="body2" fontWeight={600} color={BLUE}>
                          {shift.shift_start_time} – {shift.shift_end_time}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                          {shift.belongs_to?.staffName || "Staff"}
                          {shift.belongs_to?.role ? ` · ${shift.belongs_to.role}` : ''}
                        </Typography>
                        <Button
                          fullWidth variant="outlined" color="error" size="small"
                          disabled={isActing}
                          startIcon={isActing ? <CircularProgress size={12} color="inherit" /> : <BlockIcon />}
                          sx={{ mt: 2, textTransform: "none", fontWeight: 600, borderRadius: 2 }}
                          onClick={() => handleCancelOpenShift(shift._id)}
                        >
                          Pull from Marketplace
                        </Button>
                      </Paper>
                    )
                  })}
                </Box>
              )}
            </Box>
          )}

          {/* ── SHIFT SWAPS PANEL — shown when "Shift Swaps" nav item is active ── */}
          {activeNav === "Shift Swaps" && (
            <Box>
              <Typography variant="h4" fontWeight={800} color={BLUE} gutterBottom>Shift Swap Requests</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Review and action pending shift swap requests from your team.
              </Typography>
              {pendingSwaps.length === 0 ? (
                // Empty state when there are no swaps awaiting approval
                <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3, p: 6, textAlign: "center" }}>
                  <SwapHorizIcon sx={{ color: "#d1d5db", fontSize: 48, mb: 1 }} />
                  <Typography variant="body1" fontWeight={600} color="text.secondary">No pending swap requests</Typography>
                  <Typography variant="body2" color="text.disabled" mt={0.5}>Your team is all caught up.</Typography>
                </Paper>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {pendingSwaps.map((swap) => (
                    <Paper key={swap.id} elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3, p: 3 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                        <Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                            <SwapHorizIcon sx={{ color: ACCENT, fontSize: 18 }} />
                            <Typography variant="subtitle2" fontWeight={700} color={BLUE}>
                              {swap.requester} <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>wants to swap with</Box> {swap.requestedWith}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {swap.date}{swap.shift ? ` · ${swap.shift}` : ""}
                          </Typography>
                        </Box>
                        {/* Approve or deny action buttons for each swap */}
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Button
                            variant="contained" size="small"
                            sx={{ bgcolor: "#16a34a", "&:hover": { bgcolor: "#15803d" }, textTransform: "none", fontWeight: 600, borderRadius: 2, px: 2 }}
                            onClick={() => handleApproveSwap(swap.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outlined" color="error" size="small"
                            sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, px: 2 }}
                            onClick={() => handleDenySwap(swap.id)}
                          >
                            Deny
                          </Button>
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* ── SETTINGS PANEL — shown when "Settings" nav item is active ── */}
          {activeNav === "Settings" && (
            <Box sx={{ maxWidth: 600 }}>
              <Typography variant="h4" fontWeight={800} color={BLUE} gutterBottom>Settings</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Manage organisation-wide configuration.
              </Typography>

              <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3, p: 4 }}>
                <Typography variant="h6" fontWeight={700} color={BLUE} sx={{ mb: 0.5 }}>Staff Roles</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  These roles are available when inviting new staff members.
                </Typography>

                {/* Current roles displayed as deletable chips */}
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 3, minHeight: 40 }}>
                  {orgRoles.length === 0
                    ? <Typography variant="body2" color="text.disabled">No roles defined yet.</Typography>
                    : orgRoles.map(r => (
                      <Chip
                        key={r} label={r}
                        onDelete={() => handleRemoveRole(r)}
                        deleteIcon={<DeleteIcon sx={{ fontSize: "15px !important" }} />}
                        sx={{ bgcolor: "#dbeafe", color: BLUE, fontWeight: 600, fontSize: 13 }}
                      />
                    ))
                  }
                </Box>

                {/* Add new role input — commits on Enter or button click */}
                <Box sx={{ display: "flex", gap: 1.5 }}>
                  <TextField
                    size="small" placeholder="New role name…" value={roleInput}
                    onChange={e => setRoleInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddRole(); } }}
                    sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  <Button
                    variant="contained" startIcon={rolesSaving ? <CircularProgress size={14} color="inherit" /> : <AddIcon />}
                    onClick={handleAddRole} disabled={rolesSaving || !roleInput.trim()}
                    sx={{ bgcolor: ACCENT, textTransform: "none", fontWeight: 600, borderRadius: 2, whiteSpace: "nowrap" }}
                  >
                    Add Role
                  </Button>
                </Box>
              </Paper>
            </Box>
          )}

          {/* ── OVERVIEW (default) — shown for all nav items except Settings, Shift Swaps, and Cover Requests ── */}
          {activeNav !== "Settings" && activeNav !== "Shift Swaps" && activeNav !== "Cover Requests" && <>

          {/* Page header with quick-action buttons */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
            <Box>
              <Typography variant="h4" fontWeight={800} color={BLUE}>Manager Overview</Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                Real-time operational insight and architectural control over the {orgName} roster.
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Button
                variant="outlined" startIcon={<PersonAddIcon />}
                sx={{ borderColor: "#d1d5db", color: "#374151", textTransform: "none", fontWeight: 600, borderRadius: 2 }}
                onClick={() => navigate("/invite-staff")}
              >
                Invite Staff
              </Button>
              <Button
                variant="contained" startIcon={<PublishIcon />}
                sx={{ bgcolor: BLUE, color: "#fff", textTransform: "none", fontWeight: 600, borderRadius: 2, "&:hover": { bgcolor: "#142e58" } }}
                onClick={() => navigate("/manager-roster")}
              >
                Post Roster
              </Button>
            </Box>
          </Box>

          {/* Stat cards row — on-shift count, pending swaps, swap approvals, and coverage alert */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 2fr" }, gap: 2.5, mb: 3 }}>

            {/* Currently on shift card with percentage badge and progress bar */}
            <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3, p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                <Box sx={{ bgcolor: "#eff6ff", borderRadius: 2, p: 1, display: "flex" }}>
                  <PeopleIcon sx={{ color: ACCENT, fontSize: 22 }} />
                </Box>
                <Chip
                  label={shiftStats.total > 0 ? `${onShiftPct}%` : "–"}
                  size="small"
                  sx={{ bgcolor: "#dcfce7", color: "#16a34a", fontWeight: 700, fontSize: 11 }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 600, letterSpacing: "0.06em" }}>
                CURRENTLY ON SHIFT
              </Typography>
              <Typography variant="h4" fontWeight={800} color={BLUE} sx={{ mt: 0.5, mb: 1.5 }}>
                {shiftStats.onShift} / {shiftStats.total}
              </Typography>
              {/* Progress bar shows the fraction of scheduled staff currently on shift */}
              <LinearProgress
                variant="determinate" value={onShiftPct}
                sx={{ borderRadius: 4, height: 6, bgcolor: "#e5e7eb", "& .MuiLinearProgress-bar": { bgcolor: ACCENT } }}
              />
            </Paper>

            {/* Pending swaps count card with urgency hint */}
            <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3, p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                <Box sx={{ bgcolor: "#fff7ed", borderRadius: 2, p: 1, display: "flex" }}>
                  <SwapHorizIcon sx={{ color: "#f97316", fontSize: 22 }} />
                </Box>
              </Box>
              <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 600, letterSpacing: "0.06em" }}>
                PENDING SWAPS
              </Typography>
              <Typography variant="h4" fontWeight={800} color={BLUE} sx={{ mt: 0.5, mb: 0.5 }}>{pendingSwaps.length}</Typography>
              <Typography variant="caption" sx={{ color: pendingSwaps.length > 0 ? "#dc2626" : "#16a34a", fontWeight: 600 }}>
                {pendingSwaps.length > 0 ? `${pendingSwaps.length} requiring review` : "All caught up"}
              </Typography>
            </Paper>

            {/* Inline swap approvals panel — duplicates the full Shift Swaps panel for quick access */}
            <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3, p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <SwapHorizIcon sx={{ color: BLUE, fontSize: 18 }} />
                <Typography variant="subtitle2" fontWeight={700} color={BLUE}>Swap Approvals</Typography>
              </Box>
              {pendingSwaps.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No pending swap requests.</Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {pendingSwaps.map((swap) => (
                    <Box key={swap.id} sx={{ p: 2, border: "1px solid #e5e7eb", borderRadius: 2, display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "#f9fafb" }}>
                      <Box>
                        <Typography variant="body2" fontWeight={600} color={BLUE}>
                          {swap.requester} <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>wants to swap with</Box> {swap.requestedWith}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                          {swap.date} {swap.shift ? `(${swap.shift})` : ''}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button size="small" variant="contained" sx={{ bgcolor: "#16a34a", '&:hover': { bgcolor: "#15803d" }, minWidth: 0, px: 2 }} onClick={() => handleApproveSwap(swap.id)}>
                          Approve
                        </Button>
                        <Button size="small" variant="outlined" color="error" sx={{ minWidth: 0, px: 2 }} onClick={() => handleDenySwap(swap.id)}>
                          Deny
                        </Button>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>

            {/* Coverage alert banner — dismissable; prompts filling roster gaps */}
            {alertVisible && (
              <Box sx={{ bgcolor: BLUE, borderRadius: 3, p: 3, color: "#fff", position: "relative", overflow: "hidden" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <WarningAmberIcon sx={{ fontSize: 15, color: "#fbbf24" }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.65)" }}>
                    SHIFT COVERAGE ALERTS
                  </Typography>
                </Box>
                <Typography variant="h6" fontWeight={700} mb={0.75}>Weekend Shortage: Front Desk</Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", mb: 2.5, lineHeight: 1.65 }}>
                  Two gaps identified for Saturday AM shift. Recommend internal broadcast.
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    size="small" variant="outlined"
                    sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.4)", textTransform: "none", fontWeight: 600, borderRadius: 2 }}
                    onClick={() => setAlertVisible(false)}
                  >
                    Dismiss
                  </Button>
                  <Button
                    size="small" variant="contained"
                    sx={{ bgcolor: ACCENT, color: "#fff", textTransform: "none", fontWeight: 600, borderRadius: 2, "&:hover": { bgcolor: "#1d4ed8" } }}
                    onClick={() => navigate("/invite-staff")}
                  >
                    Fill Gaps
                  </Button>
                </Box>
                {/* Decorative concentric circle shapes in the banner background */}
                <Box sx={{ position: "absolute", right: -24, top: "50%", transform: "translateY(-50%)", width: 130, height: 130, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", pointerEvents: "none" }} />
                <Box sx={{ position: "absolute", right: -52, top: "50%", transform: "translateY(-50%)", width: 190, height: 190, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.06)", pointerEvents: "none" }} />
              </Box>
            )}
          </Box>

          {/* Shift Request Approvals panel — staff-initiated requests to work a specific day */}
          <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3, p: 3, mb: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <EventNoteIcon sx={{ color: BLUE, fontSize: 18 }} />
              <Typography variant="subtitle2" fontWeight={700} color={BLUE}>Shift Request Approvals</Typography>
              {/* Red badge shows the number of unreviewed requests */}
              {pendingShiftRequests.length > 0 && (
                <Chip label={pendingShiftRequests.length} size="small" sx={{ bgcolor: "#fef2f2", color: "#dc2626", fontWeight: 700, fontSize: 11, ml: 0.5 }} />
              )}
            </Box>
            {pendingShiftRequests.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No pending shift requests.</Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {pendingShiftRequests.map((req) => {
                  const isAgreed = req.status === 'staff_agreed';
                  const times = requestTimes[req._id] || {};
                  const proposeStart = times.startTime ?? req.requestedStartTime ?? '';
                  const proposeEnd   = times.endTime   ?? req.requestedEndTime   ?? '';

                  return (
                    <Box key={req._id} sx={{
                      p: 2.5, borderRadius: 2, bgcolor: isAgreed ? "#f0fdf4" : "#f9fafb",
                      border: isAgreed ? "1px solid #86efac" : "1px solid #e5e7eb"
                    }}>
                      {/* Header row: staff name, date, status badge, deny button */}
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 1 }}>
                        <Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                            <Typography variant="body2" fontWeight={600} color={BLUE}>
                              {req.staffMember?.staffName || 'Unknown'}
                              <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}> — {req.requestedDate}</Box>
                            </Typography>
                            {/* Badge shows which stage this request is at */}
                            <Chip
                              label={isAgreed ? 'Staff Agreed' : 'Pending Proposal'}
                              size="small"
                              sx={{
                                bgcolor: isAgreed ? "#dcfce7" : "#fef9c3",
                                color: isAgreed ? "#15803d" : "#854d0e",
                                fontWeight: 700, fontSize: 10
                              }}
                            />
                          </Box>
                          {req.notes && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                              Note: {req.notes}
                            </Typography>
                          )}
                          {/* For staff_agreed cards, show the agreed times at a glance */}
                          {isAgreed && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                              Agreed times: {req.proposedStartTime} – {req.proposedEndTime}
                            </Typography>
                          )}
                        </Box>
                        <Button size="small" variant="outlined" color="error" sx={{ minWidth: 0, px: 2 }} onClick={() => handleDenyShiftRequest(req._id)}>
                          Deny
                        </Button>
                      </Box>

                      {/* Action row differs by status */}
                      {isAgreed ? (
                        // Staff agreed — manager just needs to confirm to finalise the roster
                        <Box sx={{ mt: 1.5 }}>
                          <Button
                            size="small" variant="contained"
                            sx={{ bgcolor: "#16a34a", '&:hover': { bgcolor: "#15803d" }, px: 2 }}
                            onClick={() => handleConfirmShiftRequest(req._id)}
                          >
                            Confirm & Add to Roster
                          </Button>
                        </Box>
                      ) : (
                        // Pending — manager proposes a specific time back to the staff member
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 1.5, flexWrap: "wrap" }}>
                          <TextField
                            label="Propose start" type="time" size="small"
                            value={proposeStart}
                            onChange={e => setRequestTime(req._id, 'startTime', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ step: 300 }}
                            sx={{ width: 150 }}
                          />
                          <TextField
                            label="Propose end" type="time" size="small"
                            value={proposeEnd}
                            onChange={e => setRequestTime(req._id, 'endTime', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ step: 300 }}
                            sx={{ width: 150 }}
                          />
                          <Button
                            size="small" variant="contained"
                            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: "#1d4ed8" }, px: 2, whiteSpace: "nowrap" }}
                            onClick={() => handleProposeShiftTime(req)}
                          >
                            Send Proposal
                          </Button>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            )}
          </Paper>

          {/* Chart + Quick Actions row */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 280px" }, gap: 2.5, mb: 3 }}>

            {/* Weekly attendance bar chart — actual vs target per day */}
            <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3, p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} color={BLUE}>Weekly Attendance</Typography>
                  <Typography variant="caption" color="text.secondary">Clock-ins per day (last 7 days)</Typography>
                </Box>
                {/* Legend for the two bar colours */}
                <Box sx={{ display: "flex", gap: 2 }}>
                  {[["Actual", ACCENT], ["Target", "#d1d5db"]].map(([label, color]) => (
                    <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color }} />
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
              {weeklyData.length === 0 ? (
                <Box sx={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Typography variant="body2" color="text.secondary">No attendance data yet.</Typography>
                </Box>
              ) : (
                // Each day renders two bars side-by-side, heights normalised against maxActual
                <Box sx={{ display: "flex", alignItems: "flex-end", gap: { xs: 1, sm: 2 }, height: 140, px: 0.5 }}>
                  {weeklyData.map(({ day, actual, target }) => (
                    <Box key={day} sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 0.75 }}>
                      <Box sx={{ width: "100%", display: "flex", alignItems: "flex-end", gap: "3px", height: 120 }}>
                        <Box sx={{ flex: 1, bgcolor: ACCENT, height: `${Math.round((actual / maxActual) * 100)}%`, borderRadius: "3px 3px 0 0", minHeight: actual > 0 ? 4 : 0 }} />
                        <Box sx={{ flex: 1, bgcolor: "#d1d5db", height: `${Math.round((target / maxActual) * 100)}%`, borderRadius: "3px 3px 0 0", minHeight: target > 0 ? 4 : 0 }} />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, fontWeight: 600 }}>{day}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>

            {/* Quick actions and system health panel */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3, p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <BoltIcon sx={{ color: "#f59e0b", fontSize: 18 }} />
                  <Typography variant="subtitle2" fontWeight={700} color={BLUE}>Quick Actions</Typography>
                </Box>
                {/* Shortcut buttons for the most common manager actions */}
                {[
                  { label: "Manage Roster",          action: () => navigate("/manager-roster") },
                  { label: "Download Weekly CSV",    action: () => downloadAttendance() },
                  { label: "Invite Staff",           action: () => navigate("/invite-staff") },
                ].map(({ label, action }) => (
                  <Button
                    key={label} fullWidth variant="outlined" size="small"
                    sx={{ justifyContent: "flex-start", textTransform: "none", fontWeight: 500, borderColor: "#e5e7eb", color: "#374151", borderRadius: 2, mb: 1, py: 1 }}
                    onClick={action}
                  >
                    {label}
                  </Button>
                ))}
              </Paper>

              {/* System health indicator — static copy for now */}
              <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3, p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <FiberManualRecordIcon sx={{ color: "#16a34a", fontSize: 12 }} />
                  <Typography variant="caption" fontWeight={700} sx={{ letterSpacing: "0.08em", color: "#6b7280" }}>
                    SYSTEM HEALTH
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  All biometric clock-in points operational. Roster synchronization complete.
                </Typography>
              </Paper>
            </Box>
          </Box>

          {/* Today's Staff Ledger table — all clock-ins/outs recorded today */}
          <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3, overflow: "hidden" }}>
            <Box sx={{ px: 3, py: 2.5, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb" }}>
              <Typography variant="subtitle1" fontWeight={700} color={BLUE}>Today's Staff Ledger</Typography>
              {/* Triggers an Excel download of all attendance records */}
              <Button
                variant="text" size="small" endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                sx={{ color: ACCENT, textTransform: "none", fontWeight: 600 }}
                onClick={downloadAttendance}
              >
                Export Full Report
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f8fafc" }}>
                    {["STAFF MEMBER", "DEPARTMENT", "SHIFT TIME", "STATUS", "ACTIONS"].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, letterSpacing: 0.8, color: "#6b7280", py: 1.5 }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {todayLedger.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>
                        No clock-ins recorded today yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    todayLedger.map((row) => {
                      // Look up the colour for this row's status string
                      const statusColor = STATUS_COLORS[row.status] || "#6b7280";
                      return (
                        <TableRow key={String(row._id)} sx={{ "&:last-child td": { border: 0 }, "&:hover": { bgcolor: "#f9fafb" } }}>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                              <Avatar sx={{ width: 34, height: 34, bgcolor: ACCENT, fontSize: 13 }}>{row.name[0]}</Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>{row.name}</Typography>
                                <Typography variant="caption" color="text.secondary">{row.role}</Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">{row.dept}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.shift}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={row.status} size="small"
                              sx={{ bgcolor: statusColor + "18", color: statusColor, fontWeight: 700, fontSize: 10 }}
                            />
                          </TableCell>
                          {/* Shows clock-in time with clock-out if available, or "(active)" */}
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {row.timeClockedIn}{row.timeClockedOut ? ` → ${row.timeClockedOut}` : ' (active)'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          </>}

        </Box>
      </Box>

      {/* Snackbar for action feedback (approvals, denials, role changes) */}
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

      {/* ── AI CHAT PANEL (floating, shown when chatOpen) ── */}
      {chatOpen && (
        <Paper elevation={6} sx={{
          position: 'fixed', bottom: 90, right: 28, width: 360, height: 480,
          borderRadius: 3, display: 'flex', flexDirection: 'column', zIndex: 1300, overflow: 'hidden'
        }}>
          {/* Chat header with collapse button */}
          <Box sx={{
            px: 2, py: 1.5, bgcolor: BLUE, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SmartToyIcon sx={{ color: '#fff', fontSize: 20 }} />
              <Typography variant="subtitle2" fontWeight={700} color="#fff">AI Assistant</Typography>
            </Box>
            <IconButton size="small" onClick={() => setChatOpen(false)} sx={{ color: 'rgba(255,255,255,0.7)' }}>
              <KeyboardArrowDownIcon />
            </IconButton>
          </Box>

          {/* Scrollable message thread */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, bgcolor: '#f8fafc' }}>
            {chatMessages.map((msg, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {/* Avatar shown only for model messages */}
                {msg.role === 'model' && (
                  <Avatar sx={{ width: 28, height: 28, bgcolor: BLUE, mr: 1, flexShrink: 0, alignSelf: 'flex-end' }}>
                    <SmartToyIcon sx={{ fontSize: 16 }} />
                  </Avatar>
                )}
                <Box sx={{
                  maxWidth: '75%', px: 1.5, py: 1,
                  // Different bubble shape for user vs model messages
                  bgcolor: msg.role === 'user' ? ACCENT : '#fff',
                  color: msg.role === 'user' ? '#fff' : '#111827',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  fontSize: '0.82rem', lineHeight: 1.5,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                }}>
                  {msg.content}
                </Box>
              </Box>
            ))}
            {/* Typing indicator while waiting for the AI response */}
            {chatLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: BLUE }}>
                  <SmartToyIcon sx={{ fontSize: 16 }} />
                </Avatar>
                <Box sx={{ bgcolor: '#fff', borderRadius: '18px 18px 18px 4px', px: 1.5, py: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <CircularProgress size={14} thickness={5} />
                </Box>
              </Box>
            )}
            {/* Invisible sentinel element that is scrolled into view on new messages */}
            <div ref={chatEndRef} />
          </Box>

          {/* Chat input and send button */}
          <Box sx={{ p: 1.5, borderTop: '1px solid #e5e7eb', bgcolor: '#fff', display: 'flex', gap: 1 }}>
            <TextField
              size="small" fullWidth
              placeholder="Ask me anything…"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
              disabled={chatLoading}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, fontSize: '0.82rem' } }}
            />
            <IconButton
              onClick={sendChatMessage} disabled={chatLoading || !chatInput.trim()}
              sx={{ bgcolor: ACCENT, color: '#fff', borderRadius: 2, '&:hover': { bgcolor: '#1d4ed8' }, '&:disabled': { bgcolor: '#e5e7eb' } }}
            >
              <SendIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
        </Paper>
      )}

      {/* FAB to open or close the AI chat panel */}
      <Tooltip title={chatOpen ? 'Close AI Assistant' : 'Open AI Assistant'} placement="left">
        <Fab
          onClick={() => setChatOpen(o => !o)}
          sx={{
            position: 'fixed', bottom: 28, right: 28, zIndex: 1300,
            // Dark grey when chat is open, brand blue when closed
            bgcolor: chatOpen ? '#374151' : BLUE,
            color: '#fff', '&:hover': { bgcolor: chatOpen ? '#1f2937' : '#142e58' }
          }}
        >
          {chatOpen ? <KeyboardArrowDownIcon /> : <SmartToyIcon />}
        </Fab>
      </Tooltip>

    </Box>
  );
}
