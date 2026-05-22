import apiFetch from '../utils/apiFetch.js';
import { useEffect, useState } from "react";
import {
  Box, Typography, Button, Link, Paper,
  AppBar, Toolbar, IconButton, Avatar, Snackbar,
} from "@mui/material";
import HelpOutlineIcon   from "@mui/icons-material/HelpOutline";
import GoogleIcon        from "@mui/icons-material/Google";
import SecurityIcon      from "@mui/icons-material/Security";
import VerifiedUserIcon  from "@mui/icons-material/VerifiedUser";
import AccessTimeIcon    from "@mui/icons-material/AccessTime";
import { useNavigate, useSearchParams, Link as RouterLink } from "react-router-dom";

// Brand colour tokens
const BLUE   = "#1a3a6b";
const ACCENT = "#2563eb";

// Google OAuth login page for staff — handles token from redirect and existing session validation
export default function StaffLogin() {
  // Read URL query params injected by the OAuth callback redirect
  const [params]                                 = useSearchParams();
  // JWT token returned by the backend after successful Google OAuth
  const tokenFromParams                          = params.get("token");
  // Error flag set by the backend when the Google account is not registered as staff
  const errorFromParams                          = params.get("error");
  // General message to display in the snackbar (e.g. "Please login to continue")
  const messageFromParams                        = params.get("message") || params.get("msg");
  // JWT stored from a previous session — used to auto-redirect if still valid
  const existingToken                            = localStorage.getItem("aes52");
  // Controls snackbar visibility
  const [displaySnackbar, setDisplaySnackbar]    = useState(false);
  // Text shown inside the snackbar notification
  const [snackbarMessage, setSnackbarMessage]    = useState("");
  const navigate                                 = useNavigate();

  // On mount: handle OAuth redirect result, show messages, or auto-login from stored token
  useEffect(() => {
    if (errorFromParams) {
      setSnackbarMessage("This Google account is not registered as staff. Please use your work account or ask your manager for an invite.");
      setDisplaySnackbar(true);
      return;
    }
    if (messageFromParams) {
      setSnackbarMessage(messageFromParams);
      setDisplaySnackbar(true);
    }
    if (tokenFromParams) {
      // Validate the new OAuth token; if valid, store it and go to dashboard (or pending swap)
      apiFetch(`${import.meta.env.VITE_API_BASE_URL}/api/staff-auth`, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenFromParams}` },
      }).then((res) => {
        if (res.ok) {
          localStorage.removeItem("aes52");
          localStorage.setItem("aes52", tokenFromParams);
          localStorage.setItem("userRole", "staff");
          const pendingSwapId = localStorage.getItem("pendingSwapAcceptId");
          const pendingDeclineId = localStorage.getItem("pendingSwapDeclineId");
          if (pendingSwapId) {
            localStorage.removeItem("pendingSwapAcceptId");
            navigate(`/accept-swap/${pendingSwapId}`);
          } else if (pendingDeclineId) {
            localStorage.removeItem("pendingSwapDeclineId");
            navigate(`/decline-swap/${pendingDeclineId}`);
          } else {
            navigate("/dashboard");
          }
        } else {
          setSnackbarMessage("Unauthorised, please login again.");
          setDisplaySnackbar(true);
        }
      });
    } else if (existingToken) {
      // Validate the stored token to skip the login screen if the session is still active
      apiFetch(`${import.meta.env.VITE_API_BASE_URL}/api/staff-auth`, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${existingToken}` },
      }).then((res) => {
        if (res.ok) {
          localStorage.setItem("userRole", "staff");
          const pendingSwapId = localStorage.getItem("pendingSwapAcceptId");
          const pendingDeclineId = localStorage.getItem("pendingSwapDeclineId");
          if (pendingSwapId) {
            localStorage.removeItem("pendingSwapAcceptId");
            navigate(`/accept-swap/${pendingSwapId}`);
          } else if (pendingDeclineId) {
            localStorage.removeItem("pendingSwapDeclineId");
            navigate(`/decline-swap/${pendingDeclineId}`);
          } else {
            navigate("/dashboard");
          }
        } else {
          setSnackbarMessage("Session expired, please login again.");
          setDisplaySnackbar(true);
        }
      });
    }
  }, []);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f0f4f8", display: "flex", flexDirection: "column" }}>

      {/* ── TOP NAV ── */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: "#ffffff", borderBottom: "1px solid #e5e7eb" }}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#111827", letterSpacing: "-0.5px", cursor: "pointer" }} onClick={() => navigate("/")}>
            Shift Sync
          </Typography>
          <IconButton sx={{ color: "#6b7280" }}>
            <HelpOutlineIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* ── MAIN CONTENT ── */}
      <Box sx={{
        flex: 1, display: "flex", alignItems: "center",
        px: { xs: 2, md: 8 }, py: { xs: 4, md: 6 }, gap: { md: 8 },
      }}>

        {/* Left — marketing copy, only visible on desktop */}
        <Box sx={{ flex: 1, display: { xs: "none", md: "block" } }}>
          <Typography variant="h2" sx={{ fontWeight: 800, lineHeight: 1.15, color: "#111827", mb: 2 }}>
            Your shifts,{" "}
            <Box component="span" sx={{ color: ACCENT }}>always</Box>
            {" "}in reach.
          </Typography>
          <Typography variant="body1" sx={{ color: "#6b7280", mb: 4, maxWidth: 420, lineHeight: 1.7 }}>
            Clock in from site, swap shifts with colleagues, and manage your schedule — all in one place. Sign in with your work Google account to get started.
          </Typography>
          {/* Feature icon row — purely decorative trust signals */}
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Avatar sx={{ bgcolor: BLUE, width: 48, height: 48 }}>
              <SecurityIcon fontSize="small" />
            </Avatar>
            <Avatar sx={{ bgcolor: "#f0f4f8", border: "1px solid #d1d5db", color: "#374151", width: 48, height: 48, fontWeight: 700 }}>
              <AccessTimeIcon fontSize="small" />
            </Avatar>
            <Avatar sx={{ bgcolor: "#22c55e", width: 48, height: 48 }}>
              <VerifiedUserIcon fontSize="small" />
            </Avatar>
          </Box>
        </Box>

        {/* Right — login card */}
        <Box sx={{ width: { xs: "100%", md: 440 }, flexShrink: 0 }}>
          <Paper elevation={2} sx={{ borderRadius: 3, p: { xs: 3, md: 5 }, border: "1px solid #e5e7eb" }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#111827", mb: 0.5 }}>
              Staff Login
            </Typography>
            <Typography variant="body2" sx={{ color: "#6b7280", mb: 4 }}>
              Sign in with the Google account linked to your staff profile.
            </Typography>

            {/* Initiates the Google OAuth redirect via the backend */}
            <Button
              fullWidth
              variant="contained"
              startIcon={<GoogleIcon />}
              onClick={() => window.location.assign(`${import.meta.env.VITE_API_BASE_URL}/api/staff-login`)}
              sx={{
                bgcolor: BLUE,
                color: "#fff",
                fontWeight: 600,
                py: 1.5,
                borderRadius: 2,
                fontSize: "1rem",
                textTransform: "none",
                "&:hover": { bgcolor: "#142e58" },
                mb: 2.5,
              }}
            >
              Continue with Google
            </Button>

            <Typography variant="caption" sx={{ display: "block", textAlign: "center", color: "#9ca3af", lineHeight: 1.6 }}>
              Access is limited to existing staff accounts.{" "}
              <Box component="span" sx={{ color: "#6b7280" }}>New staff must be added by a manager.</Box>
            </Typography>

            {/* Link to manager login for users who landed on the wrong page */}
            <Box sx={{ mt: 3, pt: 3, borderTop: "1px solid #f3f4f6", textAlign: "center" }}>
              <Typography variant="body2" sx={{ color: "#6b7280" }}>
                Are you a manager?{" "}
                <Link
                  component={RouterLink}
                  to="/manager-login"
                  underline="hover"
                  sx={{ color: ACCENT, fontWeight: 600 }}
                >
                  Manager Login
                </Link>
              </Typography>
            </Box>
          </Paper>

          {/* Carousel progress dots — decorative */}
          <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mt: 3 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#d1d5db" }} />
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#9ca3af" }} />
          </Box>
        </Box>
      </Box>

      {/* ── FOOTER ── */}
      <Box sx={{
        borderTop: "1px solid #e5e7eb", bgcolor: "#ffffff",
        px: { xs: 3, md: 8 }, py: 3,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 2,
      }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#111827" }}>Shift Sync</Typography>
          <Typography variant="caption" sx={{ color: "#9ca3af" }}>
            © 2024 Shift Sync. Architectural precision for your workforce.
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {["Privacy Policy", "Terms of Service", "Contact Support"].map((item) => (
            <Link key={item} href="#" underline="hover" sx={{ fontSize: "0.8rem", color: "#6b7280" }}>
              {item}
            </Link>
          ))}
        </Box>
      </Box>

      {/* Snackbar for OAuth errors, expired sessions and redirected messages */}
      <Snackbar
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        open={displaySnackbar}
        message={snackbarMessage}
        autoHideDuration={5000}
        onClose={() => setDisplaySnackbar(false)}
      />
    </Box>
  );
}
