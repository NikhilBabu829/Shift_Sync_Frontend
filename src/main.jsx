import { createTheme, CssBaseline, ThemeProvider } from '@mui/material'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './StyleSheets/index.css'

import App from './App'
import StaffLogin from './pages/StaffLogin'
import Dashboard from './pages/Dashboard'
import ContextProvider from './ContextProvider'
import StaffSwap from './pages/StaffSwap'
import ManagerLogin from './pages/ManagerLogin'
import ManagerDashboard from './pages/ManagerDashboard'
import ManagerInvite from './pages/ManagerInvite'
import ClockIn from './components/ClockIn'
import ClockOut from './components/ClockOut'
import Register from './pages/Register'

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: '#1a3a6b' },
    secondary: { main: '#2563eb' },
    background: { default: '#f0f4f8', paper: '#ffffff' },
    text: { primary: '#111827', secondary: '#6b7280' }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
  }
})

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />
  },
  {
    path: "/staff-login",
    element: <StaffLogin />
  },
  {
    path: "/dashboard",
    element: <Dashboard />
  },
  {
    path: "/staff-swap",
    element: <StaffSwap />
  },
  {
    path: "/manager-login",
    element: <ManagerLogin />
  },
  {
    path: "/manager-dashboard",
    element: <ManagerDashboard />
  },
  {
    path: "/invite-staff",
    element: <ManagerInvite />
  },
  {
    path: "/register",
    element: <Register />
  },
  {
    path: "/staff-clock-in",
    element: <ClockIn />
  },
  {
    path: "/staff-clock-out",
    element: <ClockOut />
  }
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <ContextProvider>
      <RouterProvider router={router} />
    </ContextProvider>
  </ThemeProvider>
)

