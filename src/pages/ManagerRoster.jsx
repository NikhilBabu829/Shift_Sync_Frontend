import React, { useEffect, useState, useCallback } from 'react'
import {
    Box, Typography, Container, Button, Paper, Dialog,
    DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
    FormControl, InputLabel, Select, IconButton, Snackbar, Alert,
    CircularProgress, Chip, Tooltip
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import { useNavigate } from 'react-router-dom'
import apiFetch from '../utils/apiFetch.js'

// Brand colour tokens
const BLUE = '#1a3a6b'
const ACCENT = '#2563eb'
// Backend base URL from the environment
const BASE = import.meta.env.VITE_API_BASE_URL
// Short day-of-week labels used in both the weekly and monthly calendar headers
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Strips the time component from a Date, returning an ISO date string (YYYY-MM-DD).
// Uses local date parts (not toISOString which is UTC) so midnight-local dates don't roll back a day in UTC+ timezones.
function toISO(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

// Returns the Monday of the week containing the given date
function getMondayOfWeek(date) {
    const d = new Date(date)
    const day = d.getDay()
    // Sunday (0) needs -6 to reach the preceding Monday; other days use 1 - day
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    d.setHours(0, 0, 0, 0)
    return d
}

// Returns an array of 7 Date objects starting from the given Monday
function getWeekDates(monday) {
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        return d
    })
}

// Builds a jagged array of weeks (each week is 7 Date objects) covering the given calendar month
function getMonthCalendarDates(year, month) {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDow = firstDay.getDay() // 0=Sun
    // Offset back to the preceding Monday so the grid always starts on a Monday
    const startOffset = startDow === 0 ? -6 : 1 - startDow
    const calStart = new Date(firstDay)
    calStart.setDate(firstDay.getDate() + startOffset)
    const weeks = []
    const cur = new Date(calStart)
    while (cur <= lastDay || (weeks.length < 5 && cur <= lastDay)) {
        const week = []
        for (let i = 0; i < 7; i++) {
            week.push(new Date(cur))
            cur.setDate(cur.getDate() + 1)
        }
        weeks.push(week)
        if (cur > lastDay) break
    }
    return weeks
}

// Formats a Date as "D Mon" (e.g. "3 Jun") for the weekly view header
function formatDisplayDate(date) {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// Full month name lookup used in the monthly view header
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

// Manager roster page — displays and manages shifts in either weekly or monthly calendar view
export default function ManagerRoster() {
    const navigate = useNavigate()
    // JWT stored after manager email/password login
    const managerToken = localStorage.getItem('aes52')

    // 'weekly' or 'monthly' — read from the manager's organisation settings
    const [rosterType, setRosterType] = useState(null)
    // All staff members in the organisation, used to populate the shift dialog dropdown
    const [staffList, setStaffList] = useState([])
    // All shift records currently loaded for the visible date range
    const [roster, setRoster] = useState([])
    // True while the initial auth and staff data fetches are pending
    const [loading, setLoading] = useState(true)
    // Active department filter; 'All' means no filter applied
    const [activeDept, setActiveDept] = useState('All')

    // Weekly navigation — tracks the Monday of the currently displayed week
    const [weekMonday, setWeekMonday] = useState(() => getMondayOfWeek(new Date()))

    // Monthly navigation — tracks the year and month of the currently displayed month
    const today = new Date()
    const [monthYear, setMonthYear] = useState({ year: today.getFullYear(), month: today.getMonth() })

    // Controls the "Add Shift" dialog and pre-fills the date from the clicked calendar cell
    const [dialog, setDialog] = useState({ open: false, date: '' })
    // Form values inside the "Add Shift" dialog
    const [newShift, setNewShift] = useState({ staffId: '', date: '', startTime: '', endTime: '' })
    // True while the shift save API call is in flight
    const [saving, setSaving] = useState(false)

    // Controls the bottom snackbar notification
    const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' })
    function showSnack(msg, severity = 'success') { setSnack({ open: true, msg, severity }) }

    // Fetches all shifts within the given date range and updates the roster state
    const fetchRoster = useCallback(async (from, to, dept) => {
        try {
            const deptParam = dept && dept !== 'All' ? `&department=${encodeURIComponent(dept)}` : ''
            const res = await apiFetch(`${BASE}/api/roster?from=${from}&to=${to}${deptParam}`, {
                headers: { authorization: `Bearer ${managerToken}` }
            })
            if (res.ok) {
                const data = await res.json()
                setRoster(data.roster || [])
            }
        } catch { showSnack('Failed to load roster', 'error') }
    }, [managerToken])

    // On mount: redirect if no token, then fetch manager profile (for rosterType) and staff list in parallel
    useEffect(() => {
        if (!managerToken) { navigate('/manager-login'); return }
        ;(async () => {
            try {
                const [mgRes, staffRes] = await Promise.all([
                    apiFetch(`${BASE}/api/manager-auth`, { headers: { authorization: `Bearer ${managerToken}` } }),
                    apiFetch(`${BASE}/api/manager-staff`, { headers: { authorization: `Bearer ${managerToken}` } })
                ])
                if (mgRes.ok) {
                    const d = await mgRes.json()
                    setRosterType(d.user?.rosterType || 'weekly')
                }
                if (staffRes.ok) {
                    const d = await staffRes.json()
                    setStaffList(d.staff || [])
                }
            } catch { showSnack('Failed to load data', 'error') }
            finally { setLoading(false) }
        })()
    }, [])

    // Refetch the roster whenever the roster type, displayed period, or department filter changes
    useEffect(() => {
        if (!rosterType) return
        if (rosterType === 'weekly') {
            // Weekly view: fetch Mon → Sun of the current week
            const sunday = new Date(weekMonday)
            sunday.setDate(weekMonday.getDate() + 6)
            fetchRoster(toISO(weekMonday), toISO(sunday), activeDept)
        } else {
            // Monthly view: fetch 1st → last day of the current month
            const first = new Date(monthYear.year, monthYear.month, 1)
            const last = new Date(monthYear.year, monthYear.month + 1, 0)
            fetchRoster(toISO(first), toISO(last), activeDept)
        }
    }, [rosterType, weekMonday, monthYear, activeDept, fetchRoster])

    // Opens the Add Shift dialog, pre-filling the date from the clicked cell (or today if none)
    function openAddDialog(date) {
        setNewShift({ staffId: '', date: date || toISO(new Date()), startTime: '', endTime: '' })
        setDialog({ open: true, date: date || toISO(new Date()) })
    }

    // Closes the Add Shift dialog and clears its form state
    function closeDialog() {
        setDialog({ open: false, date: '' })
        setNewShift({ staffId: '', date: '', startTime: '', endTime: '' })
    }

    // Validates the dialog form then POSTs the new shift to the backend and appends it to the local roster
    async function handleSaveShift() {
        if (!newShift.staffId || !newShift.date || !newShift.startTime || !newShift.endTime) {
            showSnack('Please fill all fields', 'error'); return
        }
        setSaving(true)
        try {
            const res = await apiFetch(`${BASE}/api/roster`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', authorization: `Bearer ${managerToken}` },
                body: JSON.stringify({ staffId: newShift.staffId, date: newShift.date, startTime: newShift.startTime, endTime: newShift.endTime })
            })
            const data = await res.json()
            if (res.ok) {
                // Optimistically add the new shift to the displayed roster
                setRoster(prev => [...prev, data.shift])
                showSnack('Shift added')
                closeDialog()
            } else {
                showSnack(data.message || 'Failed to add shift', 'error')
            }
        } catch { showSnack('Network error', 'error') }
        finally { setSaving(false) }
    }

    // Deletes a shift by ID from the backend and removes it from the local roster
    async function handleDeleteShift(id) {
        try {
            const res = await apiFetch(`${BASE}/api/roster/remove/${id}`, {
                method: 'POST',
                headers: { authorization: `Bearer ${managerToken}` }
            })
            if (res.ok) {
                setRoster(prev => prev.filter(s => s._id !== id))
                showSnack('Shift removed', 'info')
            } else {
                showSnack('Failed to remove shift', 'error')
            }
        } catch { showSnack('Network error', 'error') }
    }

    // Returns all shifts whose date matches the given ISO date string
    function shiftsForDate(dateISO) {
        return roster.filter(s => s.date === dateISO)
    }

    if (loading) {
        return (
            <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f0f4f8' }}>
                <CircularProgress />
            </Box>
        )
    }

    // Unique sorted department list derived from the staff directory
    const departments = [...new Set(staffList.map(s => s.department).filter(Boolean))].sort()

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f0f4f8', py: 4 }}>
            <Container maxWidth="xl">
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <IconButton onClick={() => navigate('/manager-dashboard')} sx={{ mr: 2 }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h4" fontWeight={800} color={BLUE}>
                        {rosterType === 'monthly' ? 'Monthly' : 'Weekly'} Roster
                    </Typography>
                    {/* Global "Add Shift" button that opens the dialog without a pre-filled date */}
                    <Button variant="outlined" size="small" startIcon={<AddIcon />}
                        sx={{ ml: 'auto', borderColor: ACCENT, color: ACCENT, textTransform: 'none', fontWeight: 600 }}
                        onClick={() => openAddDialog('')}>
                        Add Shift
                    </Button>
                </Box>

                {/* Department filter chips — only rendered when the org has multiple departments */}
                {departments.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                        {['All', ...departments].map(dept => (
                            <Chip
                                key={dept}
                                label={dept}
                                onClick={() => setActiveDept(dept)}
                                variant={activeDept === dept ? 'filled' : 'outlined'}
                                sx={{
                                    fontWeight: 600,
                                    bgcolor: activeDept === dept ? ACCENT : 'transparent',
                                    color: activeDept === dept ? '#fff' : BLUE,
                                    borderColor: activeDept === dept ? ACCENT : '#d1d5db',
                                    '&:hover': { bgcolor: activeDept === dept ? ACCENT : '#dbeafe' }
                                }}
                            />
                        ))}
                    </Box>
                )}

                {/* Render the appropriate calendar view based on the organisation's roster type */}
                {rosterType === 'weekly'
                    ? <WeeklyView
                        weekMonday={weekMonday}
                        setWeekMonday={setWeekMonday}
                        shiftsForDate={shiftsForDate}
                        onAdd={openAddDialog}
                        onDelete={handleDeleteShift}
                        showDept={activeDept === 'All'}
                    />
                    : <MonthlyView
                        monthYear={monthYear}
                        setMonthYear={setMonthYear}
                        shiftsForDate={shiftsForDate}
                        onAdd={openAddDialog}
                        onDelete={handleDeleteShift}
                        showDept={activeDept === 'All'}
                    />
                }
            </Container>

            {/* Add Shift dialog — date, staff member, start and end time */}
            <Dialog open={dialog.open} onClose={closeDialog} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700, color: BLUE }}>Add Shift</DialogTitle>
                <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                    <TextField
                        label="Date" type="date" size="small" fullWidth
                        value={newShift.date}
                        onChange={e => setNewShift(s => ({ ...s, date: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                    />
                    {/* Staff member dropdown — filtered to active department when one is selected */}
                    <FormControl fullWidth size="small">
                        <InputLabel>Staff Member</InputLabel>
                        <Select value={newShift.staffId} label="Staff Member"
                            onChange={e => setNewShift(s => ({ ...s, staffId: e.target.value }))}>
                            {(activeDept === 'All' ? staffList : staffList.filter(st => st.department === activeDept))
                                .map(st => (
                                    <MenuItem key={st._id} value={st._id}>
                                        {st.staffName}
                                        {activeDept === 'All' && st.department && (
                                            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                                {st.department}
                                            </Typography>
                                        )}
                                    </MenuItem>
                                ))
                            }
                        </Select>
                    </FormControl>
                    {/* Start and end time fields side-by-side */}
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField label="Start" type="time" size="small" fullWidth
                            value={newShift.startTime}
                            onChange={e => setNewShift(s => ({ ...s, startTime: e.target.value }))}
                            InputLabelProps={{ shrink: true }} />
                        <TextField label="End" type="time" size="small" fullWidth
                            value={newShift.endTime}
                            onChange={e => setNewShift(s => ({ ...s, endTime: e.target.value }))}
                            InputLabelProps={{ shrink: true }} />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={closeDialog} color="inherit">Cancel</Button>
                    <Button onClick={handleSaveShift} variant="contained" disabled={saving}
                        sx={{ bgcolor: ACCENT, textTransform: 'none', fontWeight: 600 }}>
                        {saving ? <CircularProgress size={16} color="inherit" /> : 'Add Shift'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for shift add/remove feedback */}
            <Snackbar open={snack.open} autoHideDuration={4000}
                onClose={() => setSnack(s => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))} sx={{ width: '100%' }}>
                    {snack.msg}
                </Alert>
            </Snackbar>
        </Box>
    )
}

// A single shift entry rendered inside a calendar cell — shows staff name, time, and a delete button
function ShiftChip({ shift, onDelete, showDept }) {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#dbeafe', borderRadius: 1, px: 1, py: 0.3, mb: 0.5, gap: 0.5 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="caption" fontWeight={700} color={BLUE} noWrap sx={{ display: 'block' }}>
                    {shift.belongs_to?.staffName || 'Unknown'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                    {shift.shift_start_time} – {shift.shift_end_time}
                </Typography>
                {showDept && shift.belongs_to?.department && (
                    <Typography variant="caption" sx={{ fontSize: 9, color: ACCENT, display: 'block', fontWeight: 600 }}>
                        {shift.belongs_to.department}
                    </Typography>
                )}
            </Box>
            {/* Delete button removes the shift from the roster */}
            <Tooltip title="Remove">
                <IconButton size="small" onClick={() => onDelete(shift._id)} sx={{ p: 0.2, color: '#ef4444' }}>
                    <DeleteIcon sx={{ fontSize: 13 }} />
                </IconButton>
            </Tooltip>
        </Box>
    )
}

// 7-column weekly roster grid with prev/next week navigation and today highlighting
function WeeklyView({ weekMonday, setWeekMonday, shiftsForDate, onAdd, onDelete, showDept }) {
    // Array of 7 Date objects for the currently displayed week
    const weekDates = getWeekDates(weekMonday)
    const sunday = weekDates[6]
    // ISO string for today, used to highlight the current day cell
    const todayISO = toISO(new Date())

    // Navigates one week back
    function prevWeek() {
        const d = new Date(weekMonday)
        d.setDate(d.getDate() - 7)
        setWeekMonday(d)
    }
    // Navigates one week forward
    function nextWeek() {
        const d = new Date(weekMonday)
        d.setDate(d.getDate() + 7)
        setWeekMonday(d)
    }
    // Jumps back to the week containing today
    function goToday() { setWeekMonday(getMondayOfWeek(new Date())) }

    return (
        <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 3, p: 3 }}>
            {/* Week navigator — prev arrow, date range label, next arrow, Today button */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <IconButton onClick={prevWeek} size="small"><ArrowBackIosNewIcon fontSize="small" /></IconButton>
                <Typography variant="h6" fontWeight={700} color={BLUE} sx={{ flex: 1, textAlign: 'center' }}>
                    {formatDisplayDate(weekMonday)} – {formatDisplayDate(sunday)}, {weekMonday.getFullYear()}
                </Typography>
                <IconButton onClick={nextWeek} size="small"><ArrowForwardIosIcon fontSize="small" /></IconButton>
                <Button size="small" variant="outlined" onClick={goToday}
                    sx={{ textTransform: 'none', borderColor: '#d1d5db', color: 'text.secondary', fontWeight: 600, ml: 1 }}>
                    Today
                </Button>
            </Box>

            {/* 7-column grid — one column per day of the week */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1.5 }}>
                {weekDates.map((date, i) => {
                    const iso = toISO(date)
                    const isToday = iso === todayISO
                    const dayShifts = shiftsForDate(iso)
                    return (
                        <Box key={iso} sx={{
                            borderRadius: 2, border: isToday ? `2px solid ${ACCENT}` : '1px solid #e5e7eb',
                            bgcolor: isToday ? '#eff6ff' : '#fff', p: 1.5, minHeight: 140, display: 'flex', flexDirection: 'column'
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                <Box>
                                    {/* Day name (Mon–Sun) and date number */}
                                    <Typography variant="caption" fontWeight={700} color={isToday ? ACCENT : 'text.secondary'} sx={{ display: 'block', textTransform: 'uppercase', fontSize: 10 }}>
                                        {DAY_NAMES[i]}
                                    </Typography>
                                    <Typography variant="body2" fontWeight={800} color={isToday ? ACCENT : BLUE}>
                                        {date.getDate()}
                                    </Typography>
                                </Box>
                                {/* Add shift button for this day's cell */}
                                <Tooltip title="Add shift">
                                    <IconButton size="small" onClick={() => onAdd(iso)}
                                        sx={{ p: 0.3, color: ACCENT, '&:hover': { bgcolor: '#dbeafe' } }}>
                                        <AddIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            <Box sx={{ flex: 1, overflowY: 'auto' }}>
                                {dayShifts.length === 0
                                    ? <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>No shifts</Typography>
                                    : dayShifts.map(s => <ShiftChip key={s._id} shift={s} onDelete={onDelete} showDept={showDept} />)
                                }
                            </Box>
                        </Box>
                    )
                })}
            </Box>
        </Paper>
    )
}

// Month-grid roster view with prev/next month navigation, today highlighting, and a +2 overflow indicator
function MonthlyView({ monthYear, setMonthYear, shiftsForDate, onAdd, onDelete, showDept }) {
    const { year, month } = monthYear
    // Jagged array of weeks covering the full calendar month
    const weeks = getMonthCalendarDates(year, month)
    // ISO string for today, used to highlight the current day cell
    const todayISO = toISO(new Date())

    // Navigates one month back, wrapping from January to December of the previous year
    function prevMonth() {
        setMonthYear(prev => {
            if (prev.month === 0) return { year: prev.year - 1, month: 11 }
            return { year: prev.year, month: prev.month - 1 }
        })
    }
    // Navigates one month forward, wrapping from December to January of the next year
    function nextMonth() {
        setMonthYear(prev => {
            if (prev.month === 11) return { year: prev.year + 1, month: 0 }
            return { year: prev.year, month: prev.month + 1 }
        })
    }
    // Jumps back to the current calendar month
    function goToday() {
        const n = new Date()
        setMonthYear({ year: n.getFullYear(), month: n.getMonth() })
    }

    return (
        <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 3, p: 3 }}>
            {/* Month navigator — prev arrow, month/year label, next arrow, Today button */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <IconButton onClick={prevMonth} size="small"><ArrowBackIosNewIcon fontSize="small" /></IconButton>
                <Typography variant="h6" fontWeight={700} color={BLUE} sx={{ flex: 1, textAlign: 'center' }}>
                    {MONTH_NAMES[month]} {year}
                </Typography>
                <IconButton onClick={nextMonth} size="small"><ArrowForwardIosIcon fontSize="small" /></IconButton>
                <Button size="small" variant="outlined" onClick={goToday}
                    sx={{ textTransform: 'none', borderColor: '#d1d5db', color: 'text.secondary', fontWeight: 600, ml: 1 }}>
                    Today
                </Button>
            </Box>

            {/* Day-of-week header row */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.5 }}>
                {DAY_NAMES.map(d => (
                    <Typography key={d} variant="caption" fontWeight={700} color="text.secondary"
                        sx={{ textAlign: 'center', textTransform: 'uppercase', fontSize: 10 }}>
                        {d}
                    </Typography>
                ))}
            </Box>

            {/* Calendar grid — one row per week, one cell per day */}
            {weeks.map((week, wi) => (
                <Box key={wi} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.5 }}>
                    {week.map(date => {
                        const iso = toISO(date)
                        // Days outside the current month are shown at reduced opacity
                        const isCurrentMonth = date.getMonth() === month
                        const isToday = iso === todayISO
                        const dayShifts = shiftsForDate(iso)
                        return (
                            <Box key={iso} sx={{
                                borderRadius: 1.5,
                                border: isToday ? `2px solid ${ACCENT}` : '1px solid #e5e7eb',
                                bgcolor: isToday ? '#eff6ff' : isCurrentMonth ? '#fff' : '#f9fafb',
                                p: 1, minHeight: 80, cursor: isCurrentMonth ? 'default' : 'default',
                                opacity: isCurrentMonth ? 1 : 0.45
                            }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                    <Typography variant="caption" fontWeight={isToday ? 800 : 600}
                                        color={isToday ? ACCENT : BLUE} sx={{ fontSize: 11 }}>
                                        {date.getDate()}
                                    </Typography>
                                    {/* Only show the add-shift button for days in the current month */}
                                    {isCurrentMonth && (
                                        <Tooltip title="Add shift">
                                            <IconButton size="small" onClick={() => onAdd(iso)}
                                                sx={{ p: 0.2, color: ACCENT, '&:hover': { bgcolor: '#dbeafe' } }}>
                                                <AddIcon sx={{ fontSize: 13 }} />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </Box>
                                {/* Show at most 2 shift chips per cell to avoid overflow */}
                                {dayShifts.slice(0, 2).map(s => <ShiftChip key={s._id} shift={s} onDelete={onDelete} showDept={showDept} />)}
                                {/* "+N more" label when there are more than 2 shifts */}
                                {dayShifts.length > 2 && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                                        +{dayShifts.length - 2} more
                                    </Typography>
                                )}
                            </Box>
                        )
                    })}
                </Box>
            ))}
        </Paper>
    )
}
