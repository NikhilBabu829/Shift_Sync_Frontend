import apiFetch from '../utils/apiFetch.js'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
    Box, Typography, Button, Chip, TextField, Select, MenuItem,
    FormControl, FormLabel, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, CircularProgress, Snackbar, Alert,
    IconButton, Tooltip, Badge
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import CalendarViewMonthIcon from '@mui/icons-material/CalendarViewMonth'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import LogoutIcon from '@mui/icons-material/Logout'
import SendIcon from '@mui/icons-material/Send'
import ForwardToInboxIcon from '@mui/icons-material/ForwardToInbox'
import DeleteIcon from '@mui/icons-material/Delete'
import InboxIcon from '@mui/icons-material/Inbox'
import CloseIcon from '@mui/icons-material/Close'

// Brand colour token
const BLUE = '#1a3a6b'
// Fixed width of the left sidebar in pixels
const SIDEBAR_WIDTH = 240

// Sidebar navigation items — "Invite Staff" is marked active for this page
const navItems = [
    { label: 'Manager Ledger', icon: <DashboardIcon fontSize="small" />, to: '/manager-dashboard' },
    { label: 'Roster', icon: <CalendarViewMonthIcon fontSize="small" />, to: '/manager-roster' },
    { label: 'Invite Staff', icon: <PersonAddIcon fontSize="small" />, to: '/invite-staff', active: true },
]

// Staff invitation page — send email invites, set role/department, and manage pending invites
export default function ManagerInvite() {
    // List of email addresses that have been confirmed (chip tags in the email input)
    const [emails, setEmails] = useState([])
    // Current value being typed in the email chip input before Enter/comma is pressed
    const [currentEmail, setCurrentEmail] = useState('')
    // Role assigned to all invitees in this batch
    const [role, setRole] = useState('')
    // Roles pulled from the organisation's settings
    const [orgRoles, setOrgRoles] = useState([])
    // Department assigned to all invitees in this batch
    const [department, setDepartment] = useState('General')
    // Optional personal message appended to the invitation email
    const [message, setMessage] = useState('')
    // Invitations that have been sent but not yet accepted
    const [pendingInvites, setPendingInvites] = useState([])
    // True while initial data is being fetched
    const [loading, setLoading] = useState(true)
    // True while the invitation POST is in flight
    const [sending, setSending] = useState(false)
    // Authenticated manager's profile
    const [currentManager, setCurrentManager] = useState(null)
    // Controls the bottom snackbar notification
    const [snack, setSnack] = useState({ open: false, msg: '', severity: 'info' })
    // Ref to the hidden native email input so clicking the chip box focuses it
    const emailInputRef = useRef(null)

    const navigate = useNavigate()
    // JWT stored after manager email/password login
    const managerToken = localStorage.getItem('aes52')

    // Opens the bottom snackbar with a message and severity level
    function showSnack(msg, severity = 'info') {
        setSnack({ open: true, msg, severity })
    }

    // On mount: redirect if no token, otherwise fetch all required data
    useEffect(() => {
        if (!managerToken) { navigate('/manager-login?msg=You need to login'); return }
        fetchData()
    }, [managerToken])

    // Loads manager auth, pending invitations, and org roles in parallel
    const fetchData = async () => {
        setLoading(true)
        try {
            const [authRes, invitesRes, rolesRes] = await Promise.all([
                apiFetch('/api/manager-auth'),
                apiFetch('/api/pending-invitations'),
                apiFetch('/api/org-roles')
            ])
            if (authRes.ok) {
                const authData = await authRes.json()
                setCurrentManager(authData.user)
            } else {
                navigate('/manager-login')
                return
            }
            if (invitesRes.ok) {
                const invitesData = await invitesRes.json()
                setPendingInvites(invitesData.pending || [])
            }
            if (rolesRes.ok) {
                const rolesData = await rolesRes.json()
                const fetched = rolesData.roles || []
                setOrgRoles(fetched)
                // Pre-select the first available role so the dropdown is never empty
                if (fetched.length > 0) setRole(fetched[0])
            }
        } catch (err) {
            console.error('Error fetching data:', err)
        } finally {
            setLoading(false)
        }
    }

    // Commits the typed email to the chip list on Enter or comma, removes the last on Backspace
    const handleEmailKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            const email = currentEmail.trim().replace(',', '')
            if (email && !emails.includes(email)) {
                setEmails(prev => [...prev, email])
                setCurrentEmail('')
            }
        } else if (e.key === 'Backspace' && !currentEmail && emails.length > 0) {
            // Remove the most recently added email chip
            setEmails(prev => prev.slice(0, -1))
        }
    }

    // Removes a specific email chip from the list
    const removeEmail = (emailToRemove) => {
        setEmails(prev => prev.filter(e => e !== emailToRemove))
    }

    // Collects confirmed chips and any partially typed email, then POSTs the invitation payload
    const handleSendInvitations = async (e) => {
        e.preventDefault()
        // Include whatever is currently typed even if Enter wasn't pressed
        const allEmails = [...emails]
        if (currentEmail.trim()) allEmails.push(currentEmail.trim())
        if (allEmails.length === 0) return

        setSending(true)
        try {
            const res = await apiFetch('/api/staff-add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: allEmails, role, department, message })
            })
            if (res.ok) {
                // Reset the form after a successful batch send
                setEmails([])
                setCurrentEmail('')
                setMessage('')
                showSnack(`Invitation${allEmails.length > 1 ? 's' : ''} sent!`, 'success')
                // Refresh the pending invitations list
                fetchData()
            } else {
                const body = await res.json()
                showSnack(body.message || 'Failed to send invitations.', 'error')
            }
        } catch {
            showSnack('Could not reach the server.', 'error')
        } finally {
            setSending(false)
        }
    }

    // Deletes a pending invitation by ID so the invitee can no longer use the link
    const handleRevoke = async (id) => {
        try {
            const res = await apiFetch(`/api/revoke-invitation/${id}`, { method: 'DELETE' })
            if (res.ok) { showSnack('Invitation revoked.', 'info'); fetchData() }
        } catch { showSnack('Failed to revoke invitation.', 'error') }
    }

    // Re-sends the invitation email for an existing pending invite
    const handleResend = async (id) => {
        try {
            const res = await apiFetch(`/api/resend-invitation/${id}`, { method: 'POST' })
            if (res.ok) showSnack('Invitation resent!', 'success')
            else showSnack('Failed to resend invitation.', 'error')
        } catch { showSnack('Could not reach the server.', 'error') }
    }

    // Clears the JWT and redirects to the landing page
    const handleLogout = () => {
        localStorage.removeItem('aes52')
        navigate('/')
    }

    if (loading && !currentManager) {
        return (
            <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f0f4f8' }}>
                <CircularProgress />
            </Box>
        )
    }

    // First letter of the manager's first name used as a fallback avatar initial
    const managerInitial = currentManager?.first_name ? currentManager.first_name[0].toUpperCase() : 'M'

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f0f4f8' }}>

            {/* Sidebar — dark blue, fixed position */}
            <Box sx={{
                width: SIDEBAR_WIDTH, bgcolor: BLUE, position: 'fixed', top: 0, left: 0,
                height: '100vh', display: 'flex', flexDirection: 'column', zIndex: 1200
            }}>
                {/* Brand name and tagline */}
                <Box sx={{ px: 3, pt: 3, pb: 2 }}>
                    <Typography variant="h6" fontWeight={800} color="#fff" letterSpacing={0.5} sx={{ cursor: "pointer" }} onClick={() => navigate("/manager-dashboard")}>Shift Sync</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>Workforce Management</Typography>
                </Box>

                {/* Sidebar navigation links */}
                <Box sx={{ flex: 1, mt: 1 }}>
                    {navItems.map(item => (
                        <Box
                            key={item.label}
                            component={Link}
                            to={item.to}
                            sx={{
                                display: 'flex', alignItems: 'center', gap: 1.5,
                                px: 3, py: 1.5, textDecoration: 'none',
                                // Active item gets a white left border and brighter text
                                bgcolor: item.active ? 'rgba(255,255,255,0.15)' : 'transparent',
                                borderLeft: item.active ? '3px solid #fff' : '3px solid transparent',
                                color: item.active ? '#fff' : 'rgba(255,255,255,0.65)',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#fff' },
                                transition: 'all 0.15s'
                            }}
                        >
                            {item.icon}
                            <Typography variant="body2" fontWeight={item.active ? 700 : 400}>{item.label}</Typography>
                        </Box>
                    ))}
                </Box>

                {/* Logout button at the bottom of the sidebar */}
                <Box sx={{ px: 3, pb: 3, borderTop: '1px solid rgba(255,255,255,0.1)', pt: 2 }}>
                    <Button
                        startIcon={<LogoutIcon fontSize="small" />}
                        onClick={handleLogout}
                        sx={{ color: 'rgba(255,255,255,0.65)', textTransform: 'none', '&:hover': { color: '#fff' }, pl: 0 }}
                    >
                        Log out
                    </Button>
                </Box>
            </Box>

            {/* Main area — offset by the sidebar width */}
            <Box sx={{ flex: 1, ml: `${SIDEBAR_WIDTH}px`, display: 'flex', flexDirection: 'column' }}>

                {/* Sticky top bar with manager avatar */}
                <Box sx={{
                    height: 64, bgcolor: '#fff', borderBottom: '1px solid #e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                    px: 4, gap: 2, position: 'sticky', top: 0, zIndex: 1100
                }}>
                    {/* Manager initial avatar shown in the top-right corner */}
                    <Box sx={{
                        width: 36, height: 36, borderRadius: '50%', bgcolor: '#2563eb',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 14
                    }}>
                        {managerInitial}
                    </Box>
                </Box>

                {/* Page content */}
                <Box sx={{ p: 5, flex: 1 }}>
                    {/* Breadcrumb */}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Staff Schedule › <Box component="span" color="text.primary" fontWeight={600}>Invite Team Members</Box>
                    </Typography>
                    <Typography variant="h4" fontWeight={800} color={BLUE} sx={{ mb: 4 }}>Invite Team Members</Typography>

                    {/* Two-column layout: invitation form on the left, pending invites table on the right */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 4, alignItems: 'start' }}>

                        {/* Invitation Details Card */}
                        <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', p: 4 }}>
                            <Typography variant="h6" fontWeight={700} color={BLUE} sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e2e8f0' }}>
                                Invitation Details
                            </Typography>

                            <Box component="form" onSubmit={handleSendInvitations} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                                {/* Email chip input — clicking anywhere in the box focuses the hidden input */}
                                <Box>
                                    <FormLabel sx={{ fontWeight: 600, color: BLUE, fontSize: 13, mb: 0.75, display: 'block' }}>
                                        Email Addresses
                                    </FormLabel>
                                    <Box
                                        onClick={() => emailInputRef.current?.focus()}
                                        sx={{
                                            border: '1px solid #e2e8f0', borderRadius: 2, p: 1.5,
                                            minHeight: 110, cursor: 'text',
                                            display: 'flex', flexWrap: 'wrap', gap: 0.75, alignContent: 'flex-start',
                                            '&:focus-within': { borderColor: '#2563eb', boxShadow: '0 0 0 2px rgba(37,99,235,0.12)' },
                                            transition: 'border-color 0.15s, box-shadow 0.15s'
                                        }}
                                    >
                                        {/* Render each confirmed email as a deletable chip */}
                                        {emails.map(email => (
                                            <Chip
                                                key={email}
                                                label={email}
                                                size="small"
                                                onDelete={() => removeEmail(email)}
                                                deleteIcon={<CloseIcon sx={{ fontSize: '14px !important' }} />}
                                                sx={{ bgcolor: '#e8f0fe', color: BLUE, fontWeight: 500, fontSize: 12, height: 26 }}
                                            />
                                        ))}
                                        {/* Native input for the tag-input UX */}
                                        <Box
                                            component="input"
                                            ref={emailInputRef}
                                            value={currentEmail}
                                            onChange={e => setCurrentEmail(e.target.value)}
                                            onKeyDown={handleEmailKeyDown}
                                            placeholder={emails.length === 0 ? 'Type email and press Enter...' : ''}
                                            sx={{
                                                border: 'none', outline: 'none', fontSize: 14,
                                                flex: 1, minWidth: 180, bgcolor: 'transparent',
                                                color: '#111827', '&::placeholder': { color: '#9ca3af' }
                                            }}
                                        />
                                    </Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Separate multiple emails with commas or press Enter.
                                    </Typography>
                                </Box>

                                {/* Role and Department selectors side-by-side */}
                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                    {/* Role dropdown populated from org-level roles */}
                                    <FormControl size="small">
                                        <FormLabel sx={{ fontWeight: 600, color: BLUE, fontSize: 13, mb: 0.75 }}>Role</FormLabel>
                                        <Select value={role} onChange={e => setRole(e.target.value)} sx={{ borderRadius: 2 }}
                                            displayEmpty renderValue={v => v || 'Select role'}>
                                            {orgRoles.length === 0
                                                ? <MenuItem disabled value=""><em>No roles defined — add them in Settings</em></MenuItem>
                                                : orgRoles.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)
                                            }
                                        </Select>
                                    </FormControl>
                                    {/* Free-text department field */}
                                    <FormControl size="small">
                                        <FormLabel sx={{ fontWeight: 600, color: BLUE, fontSize: 13, mb: 0.75 }}>Department</FormLabel>
                                        <TextField size="small" placeholder="e.g. Logistics"
                                            value={department} onChange={e => setDepartment(e.target.value)}
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                                    </FormControl>
                                </Box>

                                {/* Optional personal message appended to the invitation email body */}
                                <Box>
                                    <FormLabel sx={{ fontWeight: 600, color: BLUE, fontSize: 13, mb: 0.75, display: 'block' }}>
                                        Personal Message <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}>(Optional)</Box>
                                    </FormLabel>
                                    <TextField
                                        multiline
                                        rows={3}
                                        fullWidth
                                        size="small"
                                        placeholder="Add a note to the invitation email..."
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                    />
                                </Box>

                                {/* Form action buttons */}
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, pt: 1, borderTop: '1px solid #e2e8f0' }}>
                                    <Button
                                        variant="outlined"
                                        onClick={() => navigate('/manager-dashboard')}
                                        sx={{ borderColor: BLUE, color: BLUE, textTransform: 'none', borderRadius: 2 }}
                                    >
                                        Cancel
                                    </Button>
                                    {/* Disabled while sending or when no emails have been added */}
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        startIcon={sending ? <CircularProgress size={14} color="inherit" /> : <SendIcon fontSize="small" />}
                                        disabled={sending || (emails.length === 0 && !currentEmail.trim())}
                                        sx={{ bgcolor: '#2563eb', textTransform: 'none', borderRadius: 2, fontWeight: 600, '&:hover': { bgcolor: BLUE } }}
                                    >
                                        Send Invitations
                                    </Button>
                                </Box>
                            </Box>
                        </Paper>

                        {/* Pending Invitations table */}
                        <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <Box sx={{ px: 4, py: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0' }}>
                                <Typography variant="h6" fontWeight={700} color={BLUE}>Pending Invitations</Typography>
                                {/* Badge shows the total count of unaccepted invitations */}
                                <Chip
                                    label={`${pendingInvites.length} Active`}
                                    size="small"
                                    sx={{ bgcolor: '#dbeafe', color: '#1e40af', fontWeight: 700, fontSize: 11 }}
                                />
                            </Box>

                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: BLUE }}>
                                            {['Email', 'Role', 'Sent Date', 'Actions'].map(col => (
                                                <TableCell key={col} align={col === 'Actions' ? 'right' : 'left'}
                                                    sx={{ color: '#fff', fontWeight: 600, fontSize: 13, py: 1.75, borderBottom: 'none' }}>
                                                    {col}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {pendingInvites.length === 0 ? (
                                            // Empty state when there are no outstanding invitations
                                            <TableRow>
                                                <TableCell colSpan={4} sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
                                                    <InboxIcon sx={{ fontSize: 48, opacity: 0.25, display: 'block', mx: 'auto', mb: 1 }} />
                                                    <Typography variant="body2">No pending invitations.</Typography>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            pendingInvites.map(invite => (
                                                <TableRow key={invite._id} hover sx={{ '&:last-child td': { border: 0 } }}>
                                                    <TableCell sx={{ fontSize: 13, color: '#111827' }}>{invite.email}</TableCell>
                                                    <TableCell sx={{ fontSize: 13, color: '#111827' }}>{invite.role}</TableCell>
                                                    <TableCell sx={{ fontSize: 13, color: '#6b7280' }}>
                                                        {new Date(invite.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {/* Re-send the invite email */}
                                                        <Tooltip title="Resend invitation">
                                                            <IconButton size="small" onClick={() => handleResend(invite._id)} sx={{ color: '#2563eb', mr: 0.5 }}>
                                                                <ForwardToInboxIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        {/* Revoke/delete the invite so the link no longer works */}
                                                        <Tooltip title="Revoke invitation">
                                                            <IconButton size="small" onClick={() => handleRevoke(invite._id)} sx={{ color: '#dc2626' }}>
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Box>
                </Box>
            </Box>

            {/* Snackbar for send success/failure and revoke/resend feedback */}
            <Snackbar
                open={snack.open}
                autoHideDuration={3500}
                onClose={() => setSnack(s => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))} sx={{ width: '100%' }}>
                    {snack.msg}
                </Alert>
            </Snackbar>
        </Box>
    )
}
