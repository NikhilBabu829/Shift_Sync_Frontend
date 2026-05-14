import { useState } from 'react'
import {
  Box, Button, Container, Typography, Grid, Card, CardContent,
  AppBar, Toolbar, Chip, Avatar, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper
} from '@mui/material'
import {
  AccessTime, SwapHoriz, PeopleAlt, LocationOn,
  AutoAwesome, BarChart, CheckCircle, ArrowForward
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'

const NAV_BG = '#0f2a5c'
const BLUE = '#1a3a6b'
const ACCENT = '#2563eb'

const features = [
  {
    icon: <AccessTime sx={{ fontSize: 32, color: ACCENT }} />,
    title: 'GPS-Verified Clock-In',
    desc: 'Staff can only clock in from your premises. Built-in velocity checks and spoof detection prevent buddy punching before it happens.'
  },
  {
    icon: <SwapHoriz sx={{ fontSize: 32, color: ACCENT }} />,
    title: 'Fluid Shift Swapping',
    desc: 'Staff post and claim shifts in a self-managed marketplace. Every swap goes through manager approval — no more group chats.'
  },
  {
    icon: <AutoAwesome sx={{ fontSize: 32, color: ACCENT }} />,
    title: 'AI-Powered Coverage',
    desc: 'When a shift opens up, the system finds the 3 best-fit staff and notifies them automatically. No calls, no guessing.'
  },
  {
    icon: <PeopleAlt sx={{ fontSize: 32, color: ACCENT }} />,
    title: 'Central Staff Directory',
    desc: 'One place for every staff member, role, and invite. Onboard new staff in seconds with a secure email link.'
  },
  {
    icon: <BarChart sx={{ fontSize: 32, color: ACCENT }} />,
    title: 'Attendance Ledger',
    desc: 'Every clock-in and clock-out logged. Export a full attendance report to Excel any time — no setup required.'
  },
  {
    icon: <LocationOn sx={{ fontSize: 32, color: ACCENT }} />,
    title: 'NLP Shift Manager',
    desc: 'Staff can drop a shift, report sick, or check their schedule by just typing a message — powered by Gemini AI.'
  }
]

const sampleLedger = [
  { name: 'Marcus Chen', role: 'Inventory Lead', shift: '08:00 – 16:00', status: 'ON TIME', statusColor: '#16a34a' },
  { name: 'Sarah Jenkins', role: 'Operations Analyst', shift: '07:30 – 19:45', status: 'OVERTIME', statusColor: '#dc2626' },
  { name: 'David Wilson', role: 'Front Desk', shift: '09:15 – 17:30', status: 'LATE IN', statusColor: '#d97706' },
  { name: 'Elena Rodriguez', role: 'Senior Associate', shift: '09:00 – 17:00', status: 'ON TIME', statusColor: '#16a34a' },
]

export default function App() {
  const navigate = useNavigate()
  const [ledgerVisible] = useState(true)

  return (
    <Box sx={{ bgcolor: '#f0f4f8', minHeight: '100vh' }}>

      {/* ── NAV ── */}
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: NAV_BG }}>
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 6 } }}>
          <Typography variant="h6" fontWeight={700} color="#fff" letterSpacing={0.5}>
            Shift Sync
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              variant="text"
              sx={{ color: 'rgba(255,255,255,0.75)', fontWeight: 500, textTransform: 'none' }}
              onClick={() => navigate('/manager-login')}
            >
              Manager Login
            </Button>
            <Button
              variant="text"
              sx={{ color: 'rgba(255,255,255,0.75)', fontWeight: 500, textTransform: 'none' }}
              onClick={() => navigate('/staff-login')}
            >
              Staff Login
            </Button>
            <Button
              variant="contained"
              sx={{ bgcolor: ACCENT, color: '#fff', textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 3 }}
              onClick={() => navigate('/register')}
            >
              Register Organisation
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* ── HERO ── */}
      <Box sx={{ bgcolor: NAV_BG, color: '#fff', py: { xs: 8, md: 12 }, px: { xs: 3, md: 8 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Chip
                label="WORKFORCE MANAGEMENT"
                size="small"
                sx={{ bgcolor: 'rgba(37,99,235,0.25)', color: '#93c5fd', mb: 2, fontWeight: 600, letterSpacing: 1 }}
              />
              <Typography variant="h2" fontWeight={800} lineHeight={1.15} sx={{ fontSize: { xs: '2.4rem', md: '3.2rem' } }}>
                Architecting Your{' '}
                <Box component="span" sx={{ color: '#60a5fa' }}>Workforce.</Box>
              </Typography>
              <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.65)', mt: 3, mb: 4, fontWeight: 400, lineHeight: 1.7 }}>
                The precision ledger for modern shift management. Reduce complexity with GPS clock-in,
                automated swap matching, and AI-powered coverage — built for small organisations.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForward />}
                  sx={{ bgcolor: ACCENT, color: '#fff', fontWeight: 700, px: 4, py: 1.5, borderRadius: 2, textTransform: 'none' }}
                  onClick={() => navigate('/register')}
                >
                  Get Started Free
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  sx={{ borderColor: 'rgba(255,255,255,0.4)', color: '#fff', fontWeight: 600, px: 4, py: 1.5, borderRadius: 2, textTransform: 'none' }}
                  onClick={() => navigate('/manager-login')}
                >
                  Log In
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              {/* Dashboard preview card */}
              <Box sx={{ bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 3, p: 3, border: '1px solid rgba(255,255,255,0.1)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography fontWeight={700} color="#fff">Today's Attendance</Typography>
                  <Chip label="LIVE" size="small" sx={{ bgcolor: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 10 }} />
                </Box>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {[['42', 'On Shift'], ['1,284', 'Hrs This Week'], ['98%', 'On-Time Rate']].map(([val, label]) => (
                    <Grid item xs={4} key={label}>
                      <Box sx={{ bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 2, p: 1.5, textAlign: 'center' }}>
                        <Typography variant="h5" fontWeight={800} color="#60a5fa">{val}</Typography>
                        <Typography variant="caption" color="rgba(255,255,255,0.55)">{label}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
                {sampleLedger.slice(0, 3).map((row) => (
                  <Box key={row.name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 30, height: 30, bgcolor: ACCENT, fontSize: 12 }}>{row.name[0]}</Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600} color="#fff">{row.name}</Typography>
                        <Typography variant="caption" color="rgba(255,255,255,0.45)">{row.role}</Typography>
                      </Box>
                    </Box>
                    <Chip label={row.status} size="small" sx={{ bgcolor: row.statusColor + '22', color: row.statusColor, fontWeight: 700, fontSize: 10 }} />
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* ── FEATURES ── */}
      <Box sx={{ py: { xs: 8, md: 12 }, px: { xs: 3, md: 8 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="overline" sx={{ color: ACCENT, fontWeight: 700, letterSpacing: 2 }}>
              PRECISION ENGINEERING FOR SMALL TEAMS
            </Typography>
            <Typography variant="h3" fontWeight={800} color={BLUE} sx={{ mt: 1 }}>
              Everything you need,<br />nothing you don't.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2, maxWidth: 540, mx: 'auto' }}>
              Bespoke tools designed to eliminate administrative friction and restore focus to your core mission.
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {features.map((f) => (
              <Grid item xs={12} sm={6} md={4} key={f.title}>
                <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, height: '100%', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 8px 30px rgba(26,58,107,0.10)' } }}>
                  <CardContent sx={{ p: 3.5 }}>
                    <Box sx={{ mb: 2 }}>{f.icon}</Box>
                    <Typography variant="h6" fontWeight={700} color={BLUE} gutterBottom>{f.title}</Typography>
                    <Typography variant="body2" color="text.secondary" lineHeight={1.7}>{f.desc}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ── OPERATIONAL LEDGER ── */}
      <Box sx={{ bgcolor: '#fff', py: { xs: 6, md: 10 }, px: { xs: 3, md: 8 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 4, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" fontWeight={800} color={BLUE}>The Operational Ledger</Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>Real-time transparency into your daily workforce activity.</Typography>
            </Box>
            <Button variant="outlined" size="small" sx={{ borderColor: '#e2e8f0', color: 'text.secondary', textTransform: 'none', borderRadius: 2 }}>
              Export CSV
            </Button>
          </Box>
          {ledgerVisible && (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    {['STAFF MEMBER', 'ROLE', 'SHIFT', 'STATUS'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, letterSpacing: 0.8, color: 'text.secondary', py: 1.5 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sampleLedger.map((row) => (
                    <TableRow key={row.name} sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 34, height: 34, bgcolor: ACCENT, fontSize: 13 }}>{row.name[0]}</Avatar>
                          <Typography variant="body2" fontWeight={600}>{row.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell><Typography variant="body2" color="text.secondary">{row.role}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{row.shift}</Typography></TableCell>
                      <TableCell>
                        <Chip label={row.status} size="small" sx={{ bgcolor: row.statusColor + '18', color: row.statusColor, fontWeight: 700, fontSize: 10 }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Container>
      </Box>

      {/* ── CTA ── */}
      <Box sx={{ bgcolor: BLUE, py: { xs: 8, md: 10 }, px: { xs: 3, md: 8 }, textAlign: 'center' }}>
        <Container maxWidth="md">
          <Typography variant="h3" fontWeight={800} color="#fff" lineHeight={1.2}>
            Ready to master your<br />workforce management?
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.65)', mt: 2, mb: 5 }}>
            Join small organisations that have architected a better way to work with Shift Sync.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForward />}
              sx={{ bgcolor: '#fff', color: BLUE, fontWeight: 700, px: 5, py: 1.8, borderRadius: 2, textTransform: 'none', '&:hover': { bgcolor: '#f0f4f8' } }}
              onClick={() => navigate('/register')}
            >
              Register Your Organisation
            </Button>
            <Button
              variant="outlined"
              size="large"
              sx={{ borderColor: 'rgba(255,255,255,0.4)', color: '#fff', fontWeight: 600, px: 4, py: 1.8, borderRadius: 2, textTransform: 'none' }}
              onClick={() => navigate('/manager-login')}
            >
              Manager Login
            </Button>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 5, mt: 6, flexWrap: 'wrap' }}>
            {[
              [<CheckCircle sx={{ fontSize: 16 }} />, 'GPS-Verified Attendance'],
              [<CheckCircle sx={{ fontSize: 16 }} />, 'AI Shift Coverage'],
              [<CheckCircle sx={{ fontSize: 16 }} />, 'No Credit Card Required'],
            ].map(([icon, text]) => (
              <Box key={text} sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(255,255,255,0.65)' }}>
                {icon}
                <Typography variant="body2">{text}</Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ── FOOTER ── */}
      <Box sx={{ bgcolor: '#0f172a', py: 4, px: { xs: 3, md: 8 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="body1" fontWeight={700} color="#fff">Shift Sync</Typography>
              <Typography variant="caption" color="rgba(255,255,255,0.35)">© 2024 Shift Sync. Architectural precision for your workforce.</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 3 }}>
              {['Privacy Policy', 'Terms of Service', 'Contact Support'].map(link => (
                <Typography key={link} variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', cursor: 'pointer', '&:hover': { color: '#fff' } }}>
                  {link}
                </Typography>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

    </Box>
  )
}
