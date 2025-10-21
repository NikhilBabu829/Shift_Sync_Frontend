import { createTheme, CssBaseline, ThemeProvider } from '@mui/material'
import React from 'react'
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

const theme =  createTheme({
  palette : {
    mode : "dark"
  }
})

const router = createBrowserRouter([
  {
    path : "/",
    element : <App />
  },
  {
    path : "/staff-login",
    element : <StaffLogin />
  },
  {
    path : "/dashboard",
    element : <Dashboard />
  },
  {
    path : "/staff-swap",
    element : <StaffSwap />
  },
  {
    path : "/manager-login",
    element : <ManagerLogin />
  },
  {
    path : "/manager-dashboard",
    element : <ManagerDashboard />
  },
  {
    path : "/invite-staff",
    element : <ManagerInvite />
  }
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider theme={theme}>
    <CssBaseline/>
    <ContextProvider>
      <RouterProvider router={router}/>
    </ContextProvider>
  </ThemeProvider>
)

