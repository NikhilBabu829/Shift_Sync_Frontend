import Typography from '@mui/material/Typography'
import { useContext, useEffect, useState } from 'react'
import { AppContext } from '../ContextProvider'
import { useNavigate, useSearchParams } from 'react-router-dom'
import CircularProgress from '@mui/material/CircularProgress';
import { Box, Button, Snackbar} from '@mui/material'
import { Token } from '@mui/icons-material';
import AppBar from '@mui/material/AppBar'
import Container from '@mui/material/Container'
import { Avatar, IconButton, Menu, MenuItem, Tooltip } from '@mui/material'

// import ClockIn from '../components/ClockIn'

const settings = ["Logout", "Clock-In", "Clock-Out"]

function Dashboard(){

    const params = useSearchParams()
    const [loading, setLoading] = useState(true)
    const [currentUser, setCurrentUser] = useState(null)
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
            <Box sx={{textAlign : "center", paddingTop : "3%", paddingBottom : "3%"}}>
                <Typography variant="h1" color="primary" sx={{fontSize : {xs : "3rem", lg : "4rem"}}}>Hi <Typography variant='inherit' component="span" color="warning">{currentUser?.staffName}</Typography></Typography>
                <Button variant="outlined" color="primary" onClick={()=>{navigate("/staff-swap")}}>
                    Plan a swap?
                </Button>
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
