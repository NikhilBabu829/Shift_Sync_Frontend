import React, { useEffect, useState, useCallback } from 'react'
import {
    Box, Typography, Container, Button, Paper,
    IconButton, Snackbar, Alert, CircularProgress, Chip
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import { useNavigate } from 'react-router-dom'
import apiFetch from '../utils/apiFetch.js'

const BLUE = '#1a3a6b'
const ACCENT = '#2563eb'
const BASE = import.meta.env.VITE_API_BASE_URL
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function toISO(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

function getMondayOfWeek(date) {
    const d = new Date(date)
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    d.setHours(0, 0, 0, 0)
    return d
}

function getWeekDates(monday) {
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        return d
    })
}

function getMonthCalendarDates(year, month) {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDow = firstDay.getDay()
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

function formatDisplayDate(date) {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function StaffRoster() {
    const navigate = useNavigate()
    const staffToken = localStorage.getItem('aes52')

    const [rosterType, setRosterType] = useState(null)
    const [roster, setRoster] = useState([])
    const [loading, setLoading] = useState(true)

    const [weekMonday, setWeekMonday] = useState(() => getMondayOfWeek(new Date()))
    const today = new Date()
    const [monthYear, setMonthYear] = useState({ year: today.getFullYear(), month: today.getMonth() })

    const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' })
    function showSnack(msg, severity = 'success') { setSnack({ open: true, msg, severity }) }

    const fetchRoster = useCallback(async (from, to) => {
        try {
            const res = await apiFetch(`${BASE}/api/my-roster?from=${from}&to=${to}`)
            if (res.ok) {
                const data = await res.json()
                setRoster(data.roster || [])
            } else {
                showSnack('Failed to load your schedule', 'error')
            }
        } catch { showSnack('Failed to load your schedule', 'error') }
    }, [staffToken])

    useEffect(() => {
        if (!staffToken) { navigate('/staff-login'); return }
        ;(async () => {
            try {
                const res = await apiFetch(`${BASE}/api/org-config`)
                if (res.ok) {
                    const d = await res.json()
                    setRosterType(d.rosterType || 'weekly')
                } else {
                    setRosterType('weekly')
                }
            } catch {
                setRosterType('weekly')
            } finally {
                setLoading(false)
            }
        })()
    }, [])

    useEffect(() => {
        if (!rosterType) return
        if (rosterType === 'weekly') {
            const sunday = new Date(weekMonday)
            sunday.setDate(weekMonday.getDate() + 6)
            fetchRoster(toISO(weekMonday), toISO(sunday))
        } else {
            const first = new Date(monthYear.year, monthYear.month, 1)
            const last = new Date(monthYear.year, monthYear.month + 1, 0)
            fetchRoster(toISO(first), toISO(last))
        }
    }, [rosterType, weekMonday, monthYear, fetchRoster])

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

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f0f4f8', py: 4 }}>
            <Container maxWidth="xl">
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                    <IconButton onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h4" fontWeight={800} color={BLUE}>
                        My Schedule
                    </Typography>
                    <Chip
                        label={rosterType === 'monthly' ? 'Monthly View' : 'Weekly View'}
                        size="small"
                        sx={{ ml: 2, bgcolor: '#dbeafe', color: ACCENT, fontWeight: 600 }}
                    />
                </Box>

                {rosterType === 'weekly'
                    ? <WeeklyView
                        weekMonday={weekMonday}
                        setWeekMonday={setWeekMonday}
                        shiftsForDate={shiftsForDate}
                    />
                    : <MonthlyView
                        monthYear={monthYear}
                        setMonthYear={setMonthYear}
                        shiftsForDate={shiftsForDate}
                    />
                }
            </Container>

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

function ShiftBlock({ shift }) {
    const isOpenCover = shift.status === 'open_cover'
    return (
        <Box sx={{
            bgcolor: isOpenCover ? '#fef3c7' : '#dbeafe',
            borderRadius: 1, px: 1, py: 0.4, mb: 0.5
        }}>
            <Typography variant="caption" fontWeight={700}
                color={isOpenCover ? '#92400e' : BLUE}
                sx={{ display: 'block', fontSize: 10 }}>
                {isOpenCover ? 'Open for Cover' : 'Scheduled'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                {shift.shift_start_time} – {shift.shift_end_time}
            </Typography>
        </Box>
    )
}

function WeeklyView({ weekMonday, setWeekMonday, shiftsForDate }) {
    const weekDates = getWeekDates(weekMonday)
    const sunday = weekDates[6]
    const todayISO = toISO(new Date())

    function prevWeek() {
        const d = new Date(weekMonday); d.setDate(d.getDate() - 7); setWeekMonday(d)
    }
    function nextWeek() {
        const d = new Date(weekMonday); d.setDate(d.getDate() + 7); setWeekMonday(d)
    }
    function goToday() { setWeekMonday(getMondayOfWeek(new Date())) }

    return (
        <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 3, p: 3 }}>
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

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1.5 }}>
                {weekDates.map((date, i) => {
                    const iso = toISO(date)
                    const isToday = iso === todayISO
                    const dayShifts = shiftsForDate(iso)
                    return (
                        <Box key={iso} sx={{
                            borderRadius: 2,
                            border: isToday ? `2px solid ${ACCENT}` : '1px solid #e5e7eb',
                            bgcolor: isToday ? '#eff6ff' : '#fff',
                            p: 1.5, minHeight: 140, display: 'flex', flexDirection: 'column'
                        }}>
                            <Box sx={{ mb: 1 }}>
                                <Typography variant="caption" fontWeight={700}
                                    color={isToday ? ACCENT : 'text.secondary'}
                                    sx={{ display: 'block', textTransform: 'uppercase', fontSize: 10 }}>
                                    {DAY_NAMES[i]}
                                </Typography>
                                <Typography variant="body2" fontWeight={800} color={isToday ? ACCENT : BLUE}>
                                    {date.getDate()}
                                </Typography>
                            </Box>
                            <Box sx={{ flex: 1, overflowY: 'auto' }}>
                                {dayShifts.length === 0
                                    ? <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>No shift</Typography>
                                    : dayShifts.map(s => <ShiftBlock key={s._id} shift={s} />)
                                }
                            </Box>
                        </Box>
                    )
                })}
            </Box>
        </Paper>
    )
}

function MonthlyView({ monthYear, setMonthYear, shiftsForDate }) {
    const { year, month } = monthYear
    const weeks = getMonthCalendarDates(year, month)
    const todayISO = toISO(new Date())

    function prevMonth() {
        setMonthYear(prev => prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 })
    }
    function nextMonth() {
        setMonthYear(prev => prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 })
    }
    function goToday() {
        const n = new Date(); setMonthYear({ year: n.getFullYear(), month: n.getMonth() })
    }

    return (
        <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 3, p: 3 }}>
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

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.5 }}>
                {DAY_NAMES.map(d => (
                    <Typography key={d} variant="caption" fontWeight={700} color="text.secondary"
                        sx={{ textAlign: 'center', textTransform: 'uppercase', fontSize: 10 }}>
                        {d}
                    </Typography>
                ))}
            </Box>

            {weeks.map((week, wi) => (
                <Box key={wi} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.5 }}>
                    {week.map(date => {
                        const iso = toISO(date)
                        const isCurrentMonth = date.getMonth() === month
                        const isToday = iso === todayISO
                        const dayShifts = shiftsForDate(iso)
                        return (
                            <Box key={iso} sx={{
                                borderRadius: 1.5,
                                border: isToday ? `2px solid ${ACCENT}` : '1px solid #e5e7eb',
                                bgcolor: isToday ? '#eff6ff' : isCurrentMonth ? '#fff' : '#f9fafb',
                                p: 1, minHeight: 80,
                                opacity: isCurrentMonth ? 1 : 0.45
                            }}>
                                <Typography variant="caption" fontWeight={isToday ? 800 : 600}
                                    color={isToday ? ACCENT : BLUE} sx={{ fontSize: 11, display: 'block', mb: 0.5 }}>
                                    {date.getDate()}
                                </Typography>
                                {dayShifts.slice(0, 2).map(s => <ShiftBlock key={s._id} shift={s} />)}
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
