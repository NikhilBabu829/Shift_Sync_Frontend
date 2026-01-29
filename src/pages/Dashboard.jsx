import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import CircularProgress from '@mui/material/CircularProgress';
import { Box, Button, Snackbar} from '@mui/material'
import AppBar from '@mui/material/AppBar'
import Container from '@mui/material/Container'
import { Avatar, IconButton, Menu, MenuItem, Tooltip } from '@mui/material'
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';

import LogoutIcon from '@mui/icons-material/Logout';

const settings = ["Logout", "Clock-In", "Clock-Out"]

function Dashboard(){

    const [params] = useSearchParams()
    const tokenFromURL = params.get("token")
    const msgFromURL = params.get("message")
    const [loading, setLoading] = useState(true)
    const [currentUser, setCurrentUser] = useState(null)
    const location = useLocation()
    const navigate = useNavigate()
    let userChecked = false
    const getToken = localStorage.getItem("aes52")
    const [displaySnackBar, setDisplaySnackBar] = useState(false)
    const [snackBarText, setSnackBarText] = useState("")

    const [anchorElUser, setAnchorElUser] = useState(null)

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
            const request = await fetch("http://localhost:3000/api/staff-auth", {method : "GET", headers : {'Content-Type' : 'application/json', 'authorization' : authorizationString}}) 
            if(request.ok){
                const response = await request.json()
                setCurrentUser(response.user)
                userChecked = true
                setLoading(false)
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
            checkUser()
        }else{
            const msg = new URLSearchParams({
                message : "You Need to Login"
            })
            navigate(`/staff-login?${msg}`)
        }
    }, [])

    return loading && userChecked ? 
    (
        <Box sx={{minHeight : "100vh", display : "flex", alignItems : "center", justifyContent : "center"}}>
            <CircularProgress/>
        </Box> ) 
        : (
        <>
            <AppBar position="static">
                <Container maxWidth="xl" sx={{display : "flex", alignItems : "center", justifyContent : "space-between", padding : {xs : "3%", md : "2%", lg : "1%"}}}>
                    <Typography variant="h5" color="white">Shift-Sync</Typography>
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
