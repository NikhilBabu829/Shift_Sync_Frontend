import apiFetch from '../utils/apiFetch.js';
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, Typography, CircularProgress, Avatar, Chip,
  LinearProgress, TextField, InputAdornment, IconButton, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Snackbar, Alert,
  Fab, Tooltip
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

  // Clears the JWT and navigates to the landing page
  function handleLogout() {
    localStorage.removeItem("aes52");
    localStorage.removeItem("userRole");
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
    if (label === "Shift Swaps") fetchPendingSwaps();
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
            <IconButton size="small" sx={{ color: "#6b7280" }}><NotificationsIcon /></IconButton>
            <IconButton size="small" sx={{ color: "#6b7280" }}><HelpOutlineIcon /></IconButton>
            <Avatar sx={{ width: 34, height: 34, bgcolor: BLUE, fontSize: 14, cursor: "pointer" }}>
              {managerInitial}
            </Avatar>
          </Box>
        </Box>

        {/* Page content */}
        <Box sx={{ flex: 1, p: 4, overflowY: "auto" }}>

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

          {/* ── OVERVIEW (default) — shown for all nav items except Settings and Shift Swaps ── */}
          {activeNav !== "Settings" && activeNav !== "Shift Swaps" && <>

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
