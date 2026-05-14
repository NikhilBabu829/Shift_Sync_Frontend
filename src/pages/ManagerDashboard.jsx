import apiFetch from '../utils/apiFetch.js';
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, Typography, CircularProgress, Avatar, Chip,
  LinearProgress, TextField, InputAdornment, IconButton, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Snackbar, Alert
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon from "@mui/icons-material/Person";
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

const BLUE = "#1a3a6b";
const ACCENT = "#2563eb";
const BASE = import.meta.env.VITE_API_BASE_URL;

const NAV_ITEMS = [
  { icon: <DashboardIcon fontSize="small" />, label: "Overview" },
  { icon: <PeopleIcon fontSize="small" />, label: "Roster" },
  { icon: <AccessTimeIcon fontSize="small" />, label: "Attendance" },
  { icon: <PersonIcon fontSize="small" />, label: "Directory" },
  { icon: <SwapHorizIcon fontSize="small" />, label: "Shift Swaps" },
  { icon: <SettingsIcon fontSize="small" />, label: "Settings" },
];

const WEEKLY_DATA = [
  { day: "MON", actual: 88, target: 80 },
  { day: "TUE", actual: 75, target: 80 },
  { day: "WED", actual: 92, target: 80 },
  { day: "THU", actual: 68, target: 80 },
  { day: "FRI", actual: 96, target: 80 },
  { day: "SAT", actual: 42, target: 60 },
  { day: "SUN", actual: 38, target: 60 },
];

const SAMPLE_LEDGER = [
  { name: "Marcus Chen",     role: "Inventory Lead",     dept: "Operations", shift: "08:00 – 16:00", status: "ON TIME",  statusColor: "#16a34a" },
  { name: "Sarah Jenkins",   role: "Operations Analyst", dept: "Finance",    shift: "07:30 – 19:45", status: "OVERTIME", statusColor: "#dc2626" },
  { name: "David Wilson",    role: "Front Desk",          dept: "Reception",  shift: "09:15 – 17:30", status: "LATE IN",  statusColor: "#d97706" },
  { name: "Elena Rodriguez", role: "Senior Associate",    dept: "HR",         shift: "09:00 – 17:00", status: "ON TIME",  statusColor: "#16a34a" },
];

export default function ManagerDashboard() {
  const [currentManager, setCurrentManager] = useState(null);
  const [loading, setLoading]               = useState(true);
  const [activeNav, setActiveNav]           = useState("Overview");
  const [alertVisible, setAlertVisible]     = useState(true);
  const [pendingSwaps, setPendingSwaps]     = useState([
    { id: 1, requester: "Elena Rodriguez", requestedWith: "Marcus Chen", date: "Saturday AM", shift: "08:00 - 16:00" },
    { id: 2, requester: "David Wilson", requestedWith: "Sarah Jenkins", date: "Sunday PM", shift: "16:00 - 00:30" },
    { id: 3, requester: "Alex Morgan", requestedWith: "Elena Rodriguez", date: "Friday AM", shift: "07:00 - 15:30" }
  ]);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  const navigate = useNavigate();
  const managerToken = localStorage.getItem("aes52");

  async function checkManagerAuth() {
    try {
      const res = await apiFetch(`${BASE}/api/manager-auth`, {
        headers: { "Content-Type": "application/json", authorization: `Bearer ${managerToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentManager(data.manager);
        setLoading(false);
      } else {
          navigate("/manager-login");
      }
    } catch {
      navigate("/manager-login");
    }
  }

  useEffect(() => {
    if (!managerToken || managerToken.length === 0) { navigate("/manager-login"); return; }
    checkManagerAuth();
  }, []);

  function handleLogout() {
    localStorage.removeItem("aes52");
    navigate("/");
  }

  function handleApproveSwap(id) {
    setPendingSwaps(pendingSwaps.filter(swap => swap.id !== id));
    setSnack({ open: true, msg: "Swap Request Approved", severity: "success" });
  }

  function handleDenySwap(id) {
    setPendingSwaps(pendingSwaps.filter(swap => swap.id !== id));
    setSnack({ open: true, msg: "Swap Request Denied", severity: "error" });
  }

  function handleNavClick(label) {
    setActiveNav(label);
    if (label === "Roster") navigate("/manager-roster");
    if (label === "Directory") navigate("/invite-staff");
    if (label === "Attendance") window.open(`${BASE}/api/download-attendance`, "_blank");
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f0f4f8" }}>
        <CircularProgress />
      </Box>
    );
  }

  const orgName        = currentManager?.org_name   || "Your Organisation";
  const managerInitial = (currentManager?.first_name || "M")[0].toUpperCase();

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f0f4f8" }}>

      {/* ── LEFT SIDEBAR ── */}
      <Box sx={{
        width: 240, flexShrink: 0, bgcolor: "#fff", borderRight: "1px solid #e5e7eb",
        display: "flex", flexDirection: "column", position: "fixed", height: "100vh", zIndex: 10,
      }}>
        {/* Org identity */}
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

        {/* Nav links */}
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

        {/* Bottom actions */}
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

        {/* Top bar */}
        <Box sx={{
          bgcolor: "#fff", borderBottom: "1px solid #e5e7eb",
          px: 4, height: 60, display: "flex", alignItems: "center",
          justifyContent: "space-between", position: "sticky", top: 0, zIndex: 9,
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Typography variant="h6" fontWeight={800} color={BLUE} sx={{ letterSpacing: "-0.3px" }}>
              Shift Sync
            </Typography>
            <Box sx={{ display: "flex" }}>
              {["Dashboard", "Schedule", "Reports"].map((tab) => {
                const active = tab === "Dashboard";
                return (
                  <Box key={tab} sx={{
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

          {/* Page header */}
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
              >
                Post Roster
              </Button>
            </Box>
          </Box>

          {/* Stat cards */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 2fr" }, gap: 2.5, mb: 3 }}>

            {/* Currently on shift */}
            <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3, p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                <Box sx={{ bgcolor: "#eff6ff", borderRadius: 2, p: 1, display: "flex" }}>
                  <PeopleIcon sx={{ color: ACCENT, fontSize: 22 }} />
                </Box>
                <Chip label="+12%" size="small" sx={{ bgcolor: "#dcfce7", color: "#16a34a", fontWeight: 700, fontSize: 11 }} />
              </Box>
              <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 600, letterSpacing: "0.06em" }}>
                CURRENTLY ON SHIFT
              </Typography>
              <Typography variant="h4" fontWeight={800} color={BLUE} sx={{ mt: 0.5, mb: 1.5 }}>42 / 50</Typography>
              <LinearProgress
                variant="determinate" value={84}
                sx={{ borderRadius: 4, height: 6, bgcolor: "#e5e7eb", "& .MuiLinearProgress-bar": { bgcolor: ACCENT } }}
              />
            </Paper>

            {/* Pending swaps */}
            <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3, p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                <Box sx={{ bgcolor: "#fff7ed", borderRadius: 2, p: 1, display: "flex" }}>
                  <SwapHorizIcon sx={{ color: "#f97316", fontSize: 22 }} />
                </Box>
                <Box sx={{ display: "flex" }}>
                  {["S", "D"].map((initial, idx) => (
                    <Avatar key={initial} sx={{
                      width: 24, height: 24, bgcolor: ACCENT, fontSize: 10,
                      ml: idx === 0 ? 0 : -0.75, border: "2px solid #fff",
                    }}>
                      {initial}
                    </Avatar>
                  ))}
                </Box>
              </Box>
              <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 600, letterSpacing: "0.06em" }}>
                PENDING SWAPS
              </Typography>
              <Typography variant="h4" fontWeight={800} color={BLUE} sx={{ mt: 0.5, mb: 0.5 }}>{pendingSwaps.length}</Typography>
              <Typography variant="caption" sx={{ color: "#dc2626", fontWeight: 600 }}>
                {pendingSwaps.length} requiring immediate review
              </Typography>
            </Paper>

            {/* Swap Approvals */}
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
                          {swap.date} ({swap.shift})
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

            {/* Coverage alert */}
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
                {/* decorative rings */}
                <Box sx={{ position: "absolute", right: -24, top: "50%", transform: "translateY(-50%)", width: 130, height: 130, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.1)", pointerEvents: "none" }} />
                <Box sx={{ position: "absolute", right: -52, top: "50%", transform: "translateY(-50%)", width: 190, height: 190, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.06)", pointerEvents: "none" }} />
              </Box>
            )}
          </Box>

          {/* Chart + Quick Actions */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 280px" }, gap: 2.5, mb: 3 }}>

            {/* Weekly attendance bar chart */}
            <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3, p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} color={BLUE}>Weekly Attendance</Typography>
                  <Typography variant="caption" color="text.secondary">Comparative performance vs last week</Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 2 }}>
                  {[["Actual", ACCENT], ["Target", "#d1d5db"]].map(([label, color]) => (
                    <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color }} />
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "flex-end", gap: { xs: 1, sm: 2 }, height: 140, px: 0.5 }}>
                {WEEKLY_DATA.map(({ day, actual, target }) => (
                  <Box key={day} sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 0.75 }}>
                    <Box sx={{ width: "100%", display: "flex", alignItems: "flex-end", gap: "3px", height: 120 }}>
                      <Box sx={{ flex: 1, bgcolor: ACCENT, height: `${actual}%`, borderRadius: "3px 3px 0 0", minHeight: 4 }} />
                      <Box sx={{ flex: 1, bgcolor: "#d1d5db", height: `${target}%`, borderRadius: "3px 3px 0 0", minHeight: 4 }} />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, fontWeight: 600 }}>{day}</Typography>
                  </Box>
                ))}
              </Box>
            </Paper>

            {/* Quick actions + System health */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3, p: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <BoltIcon sx={{ color: "#f59e0b", fontSize: 18 }} />
                  <Typography variant="subtitle2" fontWeight={700} color={BLUE}>Quick Actions</Typography>
                </Box>
                {[
                  { label: "Bulk Message Staff",    action: () => {} },
                  { label: "Download Weekly CSV",   action: () => window.open(`${BASE}/api/download-attendance`, "_blank") },
                  { label: "Configure AI Roster",   action: () => navigate("/manager-roster") },
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

          {/* Today's Staff Ledger */}
          <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3, overflow: "hidden" }}>
            <Box sx={{ px: 3, py: 2.5, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb" }}>
              <Typography variant="subtitle1" fontWeight={700} color={BLUE}>Today's Staff Ledger</Typography>
              <Button
                variant="text" size="small" endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                sx={{ color: ACCENT, textTransform: "none", fontWeight: 600 }}
                onClick={() => window.open(`${BASE}/api/download-attendance`, "_blank")}
              >
                View Full Roster
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
                  {SAMPLE_LEDGER.map((row) => (
                    <TableRow key={row.name} sx={{ "&:last-child td": { border: 0 }, "&:hover": { bgcolor: "#f9fafb" } }}>
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
                          sx={{ bgcolor: row.statusColor + "18", color: row.statusColor, fontWeight: 700, fontSize: 10 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small" variant="outlined"
                          sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2, borderColor: "#e5e7eb", color: "#374151", fontSize: 12 }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

        </Box>
      </Box>

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
  );
}
