import { useState, useContext, useEffect } from "react";
import {
  Box, Typography, TextField, Button, Link, Paper,
  AppBar, Toolbar, IconButton, InputAdornment, Snackbar, Avatar
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import SecurityIcon from "@mui/icons-material/Security";
import BarChartIcon from "@mui/icons-material/BarChart";
import * as EmailValidator from "email-validator";
import { useNavigate, useSearchParams, Link as RouterLink } from "react-router-dom";
import { AppContext } from "../ContextProvider";

export default function ManagerLogin() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const { setCurrentManager } = useContext(AppContext);
  const [displaySnackBar, setSnackBar] = useState(false);
  const [snackBarText, setSnackBarText] = useState("");
  const navigate = useNavigate();
  const [params] = useSearchParams();

  function handleSnackBarClose() {
    setSnackBar(false);
  }

  useEffect(() => {
    const msg = params.get("msg");
    if (msg !== null) {
      setSnackBar(true);
      setSnackBarText(msg);
    }
  }, []);

  async function handleFormSubmit(e) {
    e.preventDefault();
    if (!EmailValidator.validate(email)) {
      setSnackBar(true);
      setSnackBarText("Please check the email and password, and try again!");
      return;
    }
    try {
      const request = await fetch("http://localhost:3000/api/manager-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass }),
      });
      const data = await request.json();
      if (request.ok) {
        setCurrentManager(data.manager);
        localStorage.setItem("aes52", data.token);
        navigate("/manager-dashboard");
      } else {
        setSnackBar(true);
        setSnackBarText(data.message);
      }
    } catch (err) {
      setSnackBar(true);
      setSnackBarText("Something went wrong. " + err);
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f0f4f8", display: "flex", flexDirection: "column" }}>
      {/* Top Navbar */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: "#ffffff", borderBottom: "1px solid #e5e7eb" }}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#111827", letterSpacing: "-0.5px" }}>
            Shift Sync
          </Typography>
          <IconButton sx={{ color: "#6b7280" }}>
            <HelpOutlineIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          px: { xs: 2, md: 8 },
          py: { xs: 4, md: 6 },
          gap: { md: 8 },
        }}
      >
        {/* Left Side — Marketing */}
        <Box sx={{ flex: 1, display: { xs: "none", md: "block" } }}>
          <Typography variant="h2" sx={{ fontWeight: 800, lineHeight: 1.15, color: "#111827", mb: 2 }}>
            Precision in{" "}
            <Box component="span" sx={{ color: "#2563eb" }}>
              Workforce
            </Box>
            {" "}Management.
          </Typography>
          <Typography variant="body1" sx={{ color: "#6b7280", mb: 4, maxWidth: 420, lineHeight: 1.7 }}>
            Access your administrative dashboard to coordinate schedules, manage rosters, and oversee operational efficiency with architectural clarity.
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Avatar sx={{ bgcolor: "#1a3a6b", width: 48, height: 48 }}>
              <SecurityIcon fontSize="small" />
            </Avatar>
            <Avatar sx={{ bgcolor: "#f0f4f8", border: "1px solid #d1d5db", color: "#374151", width: 48, height: 48, fontWeight: 700 }}>
              A
            </Avatar>
            <Avatar sx={{ bgcolor: "#22c55e", width: 48, height: 48 }}>
              <BarChartIcon fontSize="small" />
            </Avatar>
          </Box>
        </Box>

        {/* Right Side — Login Card */}
        <Box sx={{ width: { xs: "100%", md: 440 }, flexShrink: 0 }}>
          <Paper
            elevation={2}
            sx={{ borderRadius: 3, p: { xs: 3, md: 5 }, border: "1px solid #e5e7eb" }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#111827", mb: 0.5 }}>
              Manager Login
            </Typography>
            <Typography variant="body2" sx={{ color: "#6b7280", mb: 3 }}>
              Enter your credentials to manage your organisation
            </Typography>

            <form onSubmit={handleFormSubmit}>
              {/* Email Field */}
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, color: "#6b7280", letterSpacing: "0.08em", display: "block", mb: 0.75 }}
              >
                WORK EMAIL
              </Typography>
              <TextField
                fullWidth
                id="email"
                name="email"
                type="email"
                value={email}
                placeholder="manager@alphacorp.com"
                onChange={(e) => setEmail(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: "#9ca3af", fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ mb: 3 }}
              />

              {/* Password Field */}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 600, color: "#6b7280", letterSpacing: "0.08em" }}
                >
                  PASSWORD
                </Typography>
                <Link href="#" underline="hover" sx={{ fontSize: "0.75rem", color: "#2563eb", fontWeight: 500 }}>
                  Forgot Password?
                </Link>
              </Box>
              <TextField
                fullWidth
                id="password"
                name="password"
                type={showPass ? "text" : "password"}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ color: "#9ca3af", fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPass(!showPass)}
                          edge="end"
                          size="small"
                          sx={{ color: "#9ca3af" }}
                        >
                          {showPass ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ mb: 3 }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                sx={{
                  bgcolor: "#1a3a6b",
                  color: "#fff",
                  fontWeight: 600,
                  py: 1.5,
                  borderRadius: 2,
                  fontSize: "1rem",
                  textTransform: "none",
                  "&:hover": { bgcolor: "#142e58" },
                  mb: 3,
                }}
              >
                Log In
              </Button>
            </form>

            <Typography variant="body2" sx={{ textAlign: "center", color: "#6b7280" }}>
              New to the platform?{" "}
              <Link
                component={RouterLink}
                to="/register"
                underline="hover"
                sx={{ color: "#2563eb", fontWeight: 600 }}
              >
                Organization Registration
              </Link>
            </Typography>
          </Paper>

          {/* Carousel dots */}
          <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mt: 3 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#9ca3af" }} />
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#d1d5db" }} />
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          borderTop: "1px solid #e5e7eb",
          bgcolor: "#ffffff",
          px: { xs: 3, md: 8 },
          py: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#111827" }}>
            Shift Sync
          </Typography>
          <Typography variant="caption" sx={{ color: "#9ca3af" }}>
            © 2024 Shift Sync. Architectural precision for your workforce.
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {["Privacy Policy", "Terms of Service", "Contact Support", "Security"].map((item) => (
            <Link key={item} href="#" underline="hover" sx={{ fontSize: "0.8rem", color: "#6b7280" }}>
              {item}
            </Link>
          ))}
        </Box>
      </Box>

      <Snackbar
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        open={displaySnackBar}
        message={snackBarText}
        autoHideDuration={3000}
        onClose={handleSnackBarClose}
      />
    </Box>
  );
}
