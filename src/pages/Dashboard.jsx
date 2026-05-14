import apiFetch from '../utils/apiFetch.js';
import Typography from '@mui/material/Typography'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import CircularProgress from '@mui/material/CircularProgress';
import { Box, Button, Snackbar, TextField, Paper, IconButton as MuiIconButton } from '@mui/material'
import AppBar from '@mui/material/AppBar'
import Container from '@mui/material/Container'
import { Avatar, IconButton, Menu, MenuItem, Tooltip } from '@mui/material'
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';

import LogoutIcon from '@mui/icons-material/Logout';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

const settings = ["Logout", "Clock-In", "Clock-Out"]

// TODO display if the user is currently clocked in or not, if they are clocked in display that they have to clock out

function Dashboard(){

    const [params] = useSearchParams()
    const tokenFromURL = params.get("token")
    const msgFromURL = params.get("message")
    const [loading, setLoading] = useState(true)
    const [currentUser, setCurrentUser] = useState(null)
    const location = useLocation()
    const navigate = useNavigate()
    const [userAuth, setUserAuth] = useState(false)
    let userChecked = false
    const getToken = localStorage.getItem("aes52")
    const [displaySnackBar, setDisplaySnackBar] = useState(false)
    const [snackBarText, setSnackBarText] = useState("")

    const [anchorElUser, setAnchorElUser] = useState(null)

    const [chatOpen, setChatOpen] = useState(false)

    const [chatMessages, setChatMessages] = useState([
        { role: 'model', text: "Hi! I'm your AI shift assistant. Tell me what you need — for example: \"I'm sick, can't work Tuesday\" or \"Who can cover me Friday afternoon?\"" }
    ])
    const [chatInput, setChatInput] = useState('')
    const [chatLoading, setChatLoading] = useState(false)
    const chatEndRef = useRef(null)

    const handleUserOptions = (event)=>{
        setAnchorElUser(event.currentTarget);
    }

    const handleCloseUserMenu = () => {
        setAnchorElUser(null);
    };

    const handleSnackBarClose = () => {
        setDisplaySnackBar(false)
    }

    const handleMenuClick = (e) => {
        if(e.target.innerText === "Clock-In"){
            navigate("/staff-clock-in")
        }else if(e.target.innerText === "Clock-Out"){
            navigate("/staff-clock-out")
        }
        else{
            console.log("Logout")
        }
    }

    const staffClockIn = ()=>{
        navigate("/staff-clock-in")
    }

    const staffClockOut = ()=>{
        navigate("/staff-clock-out")
    }

    const swafShift = ()=>{
        navigate("/staff-swap")
    }

    async function checkUser(){
        try{
            const authorizationString = `Bearer ${getToken}`
            const request = await apiFetch(`${import.meta.env.VITE_API_BASE_URL}/api/staff-auth`, {method : "GET", headers : {'Content-Type' : 'application/json', 'authorization' : authorizationString}})
            if(request.ok){
                const response = await request.json()
                setCurrentUser(response.user)
                userChecked = true
                setLoading(false)
                return true
            }else{
                const msg = new URLSearchParams({
                    message : "Not Valid, Please Login Again!"
                })
                navigate(`/staff-login?${msg}`)
            }
        }catch{
            const msg = new URLSearchParams({
                    message : "Not Valid, Please Login Again!"
            })
            navigate(`/staff-login?${msg}`)
        }finally{

        }
    }

    useEffect(()=>{
        if(msgFromURL != null && msgFromURL.length > 0){
            setSnackBarText(msgFromURL)
            setDisplaySnackBar(true)
        }
        if(location.state?.token){
            console.log("true")
        }
        if(getToken != null && getToken.length > 0){
            (async ()=>{
                const response = await checkUser()
                setUserAuth(response)
            })()
        }else{
            const msg = new URLSearchParams({
                message : "You Need to Login"
            })
            navigate(`/staff-login?${msg}`)
        }
    }, [])

    async function getUser(){
        try{
            const authorizationString = `Bearer ${getToken}`
            const request = await apiFetch(`${import.meta.env.VITE_API_BASE_URL}/api/view-all-clockins/${currentUser._id}`, {method : "GET", headers : {'Content-Type' : 'application/json', 'authorization' : authorizationString}})
            if(request.ok){
                const response = await request.json()
                console.log(response)
            }
        }catch(err){
            console.log(err)
        }
    }

    useEffect(()=>{
        if(!userAuth) return
        if(userAuth){
            getUser()
        }
    },[userAuth])

    useEffect(()=>{
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [chatMessages])

    async function sendChatMessage(){
        const text = chatInput.trim()
        if(!text || chatLoading) return

        setChatMessages(prev => [...prev, { role: 'user', text }])
        setChatInput('')
        setChatLoading(true)

        try{
            const authorizationString = `Bearer ${getToken}`
            const request = await apiFetch(`${import.meta.env.VITE_API_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'authorization': authorizationString },
                body: JSON.stringify({ message: text })
            })
            const response = await request.json()
            if(request.ok){
                setChatMessages(prev => [...prev, { role: 'model', text: response.result.message }])
            } else {
                setChatMessages(prev => [...prev, { role: 'model', text: response.message || 'Something went wrong. Please try again.' }])
            }
        }catch{
            setChatMessages(prev => [...prev, { role: 'model', text: 'Could not reach the server. Please check your connection.' }])
        }finally{
            setChatLoading(false)
        }
    }

    function handleChatKeyDown(e){
        if(e.key === 'Enter' && !e.shiftKey){
            e.preventDefault()
            sendChatMessage()
        }
    }

    return loading && userChecked ? 
    (
        <Box sx={{minHeight : "100vh", display : "flex", alignItems : "center", justifyContent : "center"}}>
            <CircularProgress/>
        </Box> ) 
        : (
        <>
            <AppBar position="static">
                <Container maxWidth="xl" sx={{display : "flex", alignItems : "center", justifyContent : "space-between", padding : {xs : "3%", md : "2%", lg : "1%"}}}>
                    <Typography variant="h5" color="white">Shift Sync</Typography>
                    <Typography variant="h5" color="primary">Hi <Typography variant='inherit' component="span" color="warning">{currentUser?.staffName}</Typography></Typography>
                    <Button variant="text" color="error" startIcon={<LogoutIcon />}>
                      Logout
                    </Button>
                    <Tooltip title="Open settings">
                        <IconButton sx={{ p: 0 }} onClick={handleUserOptions}>
                            <Avatar alt="Remy Sharp" src={currentUser?.profile_picture || undefined}/>
                        </IconButton>
                    </Tooltip>
                    <Menu
                        sx={{ mt: '45px' }}
                        id="menu-appbar"
                        anchorEl={anchorElUser}
                        anchorOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                        keepMounted
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
                        open={Boolean(anchorElUser)}
                        onClose={handleCloseUserMenu}
                        >
                        {settings.map((setting) => (
                            <MenuItem key={setting} onClick={handleMenuClick}>
                            <Typography sx={{ textAlign: 'center' }}>{setting}</Typography>
                            </MenuItem>
                        ))}
                    </Menu>
                </Container>
            </AppBar>
            <Box sx={{textAlign : "center", paddingTop : "3%", paddingBottom : "3%", paddingLeft : "2%", paddingRight : "2%"}}>
                <Box sx={{maxWidth : "100%", display : "flex", justifyContent : "space-evenly"}}>
                    <Card variant="outlined" sx={{minWidth : "18%", backgroundColor : "#ffb703"}}>
                        <CardContent>
                            <Box sx={{maxWidth : "100%"}}>
                                <Typography component="div">
                                    Clock In
                                </Typography>
                            </Box>
                        </CardContent>
                        <Box sx={{maxWidth : "100%", display : "flex", justifyContent : "center"}}>
                            <CardActions>
                                <Button variant='contained' size="small" color='inherit' onClick={staffClockIn}>Start your Shift</Button>
                            </CardActions>
                        </Box>
                    </Card>
                    <Card variant="outlined" sx={{minWidth : "18%", backgroundColor : "#002d44ff"}}>
                        <CardContent>
                            <Box sx={{maxWidth : "100%"}}>
                                <Typography component="div">
                                    Clock Out
                                </Typography>
                            </Box>
                        </CardContent>
                        <Box sx={{maxWidth : "100%", display : "flex", justifyContent : "center"}}>
                            <CardActions>
                                <Button variant='contained' size="small" color='inherit' onClick={staffClockOut}>End your Shift</Button>
                            </CardActions>
                        </Box>
                    </Card>
                    <Card variant="outlined" sx={{minWidth : "18%", backgroundColor : "#fb8500"}}>
                        <CardContent>
                            <Box sx={{maxWidth : "100%"}}>
                                <Typography component="div">
                                    Plan Swap?
                                </Typography>
                            </Box>
                        </CardContent>
                        <Box sx={{maxWidth : "100%", display : "flex", justifyContent : "center"}}>
                            <CardActions>
                                <Button variant='contained' size="small" color='inherit' onClick={swafShift}>Swap</Button>
                            </CardActions>
                        </Box>
                    </Card>
                </Box>
            </Box>
            {/* FAB — shown when chat is closed */}
            {!chatOpen && (
                <MuiIconButton
                    onClick={() => setChatOpen(true)}
                    sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1300, backgroundColor: '#1a3a6b', color: '#fff', width: 56, height: 56, boxShadow: 4, '&:hover': { backgroundColor: '#2563eb' } }}
                >
                    <SmartToyIcon />
                </MuiIconButton>
            )}

            {/* Chat panel — shown when open */}
            {chatOpen && (
                <Box sx={{ position: 'fixed', bottom: 24, right: 24, width: 360, zIndex: 1300 }}>
                    <Paper elevation={6} sx={{ borderRadius: 3, overflow: 'hidden' }}>

                        {/* Header */}
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, backgroundColor: '#1a3a6b' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SmartToyIcon sx={{ color: '#fff', fontSize: 20 }} />
                                <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 600 }}>AI Shift Assistant</Typography>
                            </Box>
                            <MuiIconButton size="small" onClick={() => setChatOpen(false)} sx={{ color: '#fff', p: 0.5 }}>
                                <KeyboardArrowDownIcon />
                            </MuiIconButton>
                        </Box>

                        {/* Message list */}
                        <Box sx={{ height: 320, overflowY: 'auto', px: 2, py: 2, backgroundColor: '#f0f4f8', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                            {chatMessages.map((msg, idx) => (
                                <Box key={idx} sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                    <Box sx={{
                                        maxWidth: '80%', px: 2, py: 1,
                                        borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                        backgroundColor: msg.role === 'user' ? '#2563eb' : '#fff',
                                        color: msg.role === 'user' ? '#fff' : '#1a1a1a',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
                                    }}>
                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                            {msg.text}
                                        </Typography>
                                    </Box>
                                </Box>
                            ))}
                            {chatLoading && (
                                <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                                    <Box sx={{ px: 2, py: 1, borderRadius: '18px 18px 18px 4px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}>
                                        <CircularProgress size={16} thickness={5} />
                                    </Box>
                                </Box>
                            )}
                            <div ref={chatEndRef} />
                        </Box>

                        {/* Input row */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderTop: '1px solid #e0e0e0', backgroundColor: '#fff' }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="e.g. I'm sick, can't work Tuesday..."
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={handleChatKeyDown}
                                disabled={chatLoading}
                                multiline
                                maxRows={3}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                            />
                            <MuiIconButton
                                onClick={sendChatMessage}
                                disabled={chatLoading || !chatInput.trim()}
                                sx={{ backgroundColor: '#2563eb', color: '#fff', '&:hover': { backgroundColor: '#1a3a6b' }, '&:disabled': { backgroundColor: '#ccc' }, borderRadius: 2, p: 1.2 }}
                            >
                                <SendIcon fontSize="small" />
                            </MuiIconButton>
                        </Box>
                    </Paper>
                </Box>
            )}

            {
                displaySnackBar ? (
                    <Snackbar
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        open={displaySnackBar}
                        message={snackBarText}
                        autoHideDuration={2000}
                        onClose={handleSnackBarClose}
                    />
                ) : (<></>)
            }
        </>
    )
}

export default Dashboard
