import apiFetch from '../utils/apiFetch.js';
import { useContext, useEffect, useState } from "react";
import { AppContext } from "../ContextProvider";
import {
  Box, Button, Typography, CircularProgress, Avatar, Paper,
  FormControl, Select, MenuItem, InputLabel, Snackbar, Alert,
} from "@mui/material";
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useNavigate } from "react-router-dom";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

// Brand colour tokens
const BLUE   = "#1a3a6b";
const ACCENT = "#2563eb";

// Shift swap request form — lets a staff member propose a shift trade with a colleague
export default function StaffSwap() {
  const { setLoading, loading, setCurrentUser } = useContext(AppContext);
  // All staff members in the organisation, used to populate the colleague selector
  const [allStaffMembers, setStaffMembers]       = useState([]);
  // The authenticated staff member's profile
  const [loggedInUser, setLoggedInUser]           = useState(null);
  // Start of the swap target's shift (the shift the logged-in user wants to take)
  const [swapStartTime, setSwapStartTime]         = useState(null);
  // End of the swap target's shift
  const [swapEndTime, setSwapEndTime]             = useState(null);
  // Start of the logged-in user's own shift (the one they want to give away)
  const [actualTime, setActualTime]               = useState(null);
  // End of the logged-in user's own shift
  const [actualEndTime, setActualEndTime]         = useState(null);
  // ID of the colleague chosen to swap with
  const [selectUser, setSelectUser]               = useState("");
  // True while the swap request API call is in flight
  const [submitting, setSubmitting]               = useState(false);
  // Controls the bottom snackbar notification
  const [snack, setSnack]                         = useState({ open: false, msg: "", severity: "success" });
  const navigate = useNavigate();
  // JWT stored after Google OAuth login
  const userAuth = localStorage.getItem("aes52");

  // Fetches both the logged-in user's profile and the full staff directory
  async function loadData() {
    try {
      const res = await apiFetch(`${import.meta.env.VITE_API_BASE_URL}/api/staff`, {
        headers: { "Content-Type": "application/json", authorization: `Bearer ${userAuth}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLoggedInUser(data.user);
        setCurrentUser(data.user);
        setStaffMembers(data.staffMembers);
        setLoading(false);
      } else {
        navigate(`/staff-login?${new URLSearchParams({ reason: "Session expired. Please log in again." })}`);
      }
    } catch {
      navigate(`/staff-login?${new URLSearchParams({ reason: "Something went wrong. Please try again." })}`);
    }
  }

  // On mount: guard against missing token then trigger the data load
  useEffect(() => {
    setLoading(true);
    if (userAuth && userAuth.length > 0) {
      loadData();
    } else {
      navigate("/staff-login");
    }
  }, []);

  // Validates the form, builds the swap payload, and POSTs to the backend
  async function handleFormSubmit(e) {
    e.preventDefault();
    if (!selectUser || !swapStartTime || !swapEndTime || !actualTime || !actualEndTime) {
      setSnack({ open: true, msg: "Please fill in all fields before submitting.", severity: "warning" });
      return;
    }
    setSubmitting(true);
    try {
      // Convert Dayjs picker values to native Date objects for serialisation
      const swapingTime    = new Date(swapStartTime);
      const swappingEnd    = new Date(swapEndTime);
      const currentStart   = new Date(actualTime);
      const currentEnd     = new Date(actualEndTime);
      const payload = {
        date:                 currentStart.toDateString(),
        belongs_to:           loggedInUser._id,
        shift_start_time:     currentStart.toLocaleTimeString(),
        shift_end_time:       currentEnd.toLocaleTimeString(),
        swapDate:             swapingTime.toDateString(),
        swap_belongs_to:      selectUser,
        swap_shift_start_time: swapingTime.toLocaleString(),
        swap_shift_end_time:  swappingEnd.toLocaleString(),
      };
      const res = await apiFetch(`${import.meta.env.VITE_API_BASE_URL}/api/initiate-swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${userAuth}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setSnack({ open: true, msg: data.message || "Swap request sent successfully.", severity: "success" });
        // Reset all form fields after a successful submission
        setSelectUser("");
        setSwapStartTime(null);
        setSwapEndTime(null);
        setActualTime(null);
        setActualEndTime(null);
      } else {
        setSnack({ open: true, msg: data.message || "Failed to submit swap request.", severity: "error" });
      }
    } catch {
      setSnack({ open: true, msg: "Network error — please try again.", severity: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f0f4f8" }}>
        <CircularProgress />
      </Box>
    );
  }

  // First letter of the staff member's name used as a fallback avatar initial
  const userInitial = (loggedInUser?.staffName || "S")[0].toUpperCase();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f0f4f8" }}>

      {/* Top bar with back navigation and user avatar */}
      <Box sx={{
        bgcolor: "#fff", borderBottom: "1px solid #e5e7eb",
        px: 4, height: 60, display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 9,
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/dashboard")}
            sx={{ color: "#6b7280", textTransform: "none", fontWeight: 500, minWidth: 0 }}
          >
            Back to Dashboard
          </Button>
          <Box sx={{ width: "1px", height: 20, bgcolor: "#e5e7eb", flexShrink: 0 }} />
          <Typography variant="h6" fontWeight={800} color={BLUE} sx={{ letterSpacing: "-0.3px", whiteSpace: "nowrap", cursor: "pointer" }} onClick={() => navigate("/dashboard")}>
            Shift Sync
          </Typography>
        </Box>
        <Avatar sx={{ width: 34, height: 34, bgcolor: ACCENT, fontSize: 14 }}>
          {userInitial}
        </Avatar>
      </Box>

      {/* Page content */}
      <Box sx={{ maxWidth: 680, mx: "auto", px: 3, py: 5 }}>

        {/* Page header with icon and description */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
          <Box sx={{ bgcolor: "#eff6ff", borderRadius: 2, p: 1.25, display: "flex" }}>
            <SwapHorizIcon sx={{ color: ACCENT, fontSize: 26 }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={800} color={BLUE}>Request a Shift Swap</Typography>
            <Typography variant="body2" color="text.secondary" mt={0.25}>
              Propose a shift trade with a colleague — your manager will review and approve.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ height: 1, bgcolor: "#e5e7eb", my: 3 }} />

        <form onSubmit={handleFormSubmit}>
          {/* "Your Shift" section — the shift the logged-in user wants to give away */}
          <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3, p: 3, mb: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={700} color={BLUE} sx={{ mb: 0.5 }}>
              Your Shift
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              The shift you want to give away.
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Start and end date-time pickers for the user's own shift */}
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateTimePicker
                  label="Your Shift Start"
                  value={actualTime}
                  onChange={setActualTime}
                  slotProps={{ textField: { size: "small", fullWidth: true, sx: { "& .MuiOutlinedInput-root": { borderRadius: 2 } } } }}
                />
              </LocalizationProvider>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateTimePicker
                  label="Your Shift End"
                  value={actualEndTime}
                  onChange={setActualEndTime}
                  slotProps={{ textField: { size: "small", fullWidth: true, sx: { "& .MuiOutlinedInput-root": { borderRadius: 2 } } } }}
                />
              </LocalizationProvider>
            </Box>
          </Paper>

          {/* "Swap With" section — colleague selector and their shift times */}
          <Paper elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: 3, p: 3, mb: 3 }}>
            <Typography variant="subtitle2" fontWeight={700} color={BLUE} sx={{ mb: 0.5 }}>
              Swap With
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              The colleague and their shift you want to take.
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Colleague dropdown populated from the org staff directory */}
              <FormControl size="small" fullWidth>
                <InputLabel id="swap-with-label">Select Colleague</InputLabel>
                <Select
                  labelId="swap-with-label"
                  label="Select Colleague"
                  value={selectUser}
                  onChange={(e) => setSelectUser(e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  {allStaffMembers.map((staff) => (
                    <MenuItem value={staff._id} key={staff._id}>{staff.staffName}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {/* Start and end date-time pickers for the colleague's shift */}
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateTimePicker
                  label="Their Shift Start"
                  value={swapStartTime}
                  onChange={setSwapStartTime}
                  slotProps={{ textField: { size: "small", fullWidth: true, sx: { "& .MuiOutlinedInput-root": { borderRadius: 2 } } } }}
                />
              </LocalizationProvider>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateTimePicker
                  label="Their Shift End"
                  value={swapEndTime}
                  onChange={setSwapEndTime}
                  slotProps={{ textField: { size: "small", fullWidth: true, sx: { "& .MuiOutlinedInput-root": { borderRadius: 2 } } } }}
                />
              </LocalizationProvider>
            </Box>
          </Paper>

          {/* Submit button — disabled while a request is in flight */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <CheckCircleOutlineIcon />}
            sx={{
              bgcolor: BLUE, color: "#fff", textTransform: "none", fontWeight: 700,
              borderRadius: 2, py: 1.5, fontSize: "1rem",
              "&:hover": { bgcolor: "#142e58" },
              "&:disabled": { bgcolor: "#93c5fd", color: "#fff" },
            }}
          >
            {submitting ? "Submitting…" : "Submit Swap Request"}
          </Button>
        </form>
      </Box>

      {/* Snackbar for validation errors, success, and network errors */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))} sx={{ width: "100%" }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
