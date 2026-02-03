import { Box, Button, CircularProgress, Container, FormControl, MenuItem, Select, Snackbar, AppBar, Toolbar, Tooltip, FormLabel } from '@mui/material'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import LogoutIcon from '@mui/icons-material/Logout';
import { IconButton, Avatar } from '@mui/material'

const shiftType = ['7:00-15:30', '8:00-16:30', '10:00-18:30', '13:30-22:00','15:00-23:30' , '16:00-00:30']

export default function ClockOut(){

    const centerOfFenceLat =  53.36364350363377
    const centerOfFenceLong =  -6.248844488587223
    const geoFLongPlus = centerOfFenceLong + 0.01
    const geoFLongNeg = centerOfFenceLong - 0.01
    const geoFLatPlus = centerOfFenceLat + 0.01
    const geoLatNeg = centerOfFenceLat - 0.01

    const [loading, setLoading] = useState(false)
    const [shiftSelection, setShiftSelection] = useState(shiftType[0])
    const [longitude, setLongitude] = useState(0)
    const [latitude, setLatitude] = useState(0)
    const [currentLocationAccuracy, setCurrentLocationAccuracy] = useState(0)
    const [displayDisplaySnackBar, setDisplaySnackBar] = useState(false)
    const [snackBarText, setSnackBarText] = useState("")
    const [geoFence, setGeoFence] = useState(false)
    const [isLate, setIsLate] = useState(false)
    const [currentUser, setCurrentUser] = useState(null)
    const [passedAuth, setPassedAuth] = useState(false)
    const navigate = useNavigate()

    const [params] = useSearchParams()

    const token = localStorage.getItem("aes52")

    async function checkUser(){
        try{
            const authorizationString = `Bearer ${token}`
            const request = await fetch("http://localhost:3000/api/staff-auth", {method : "GET", headers : {'Content-Type' : 'application/json', 'authorization' : authorizationString}}) 
            if(request.ok){
                const response = await request.json()
                if(response.user){
                    setCurrentUser(response.user)
                    return true
                }
            }else{
                const msg = new URLSearchParams({
                    message : "Not Valid, Please Login Again!"
                })
                navigate(`/staff-login?${msg}`)
            }
        }catch(err){
            console.log(err)
        }
    }

    useEffect(()=>{
        if(token == null || token.length == 0) return
        (async ()=>{
            const response = await checkUser()
            setPassedAuth(response)
        })()
    },[token])

    useEffect(()=>{
        if(!passedAuth) return
        if(passedAuth){
            navigator.geolocation.getCurrentPosition((coords)=>{
                const {latitude, longitude, accuracy} = coords.coords
                setLatitude(latitude)
                setLongitude(longitude)
                setCurrentLocationAccuracy(accuracy)
            }, (error) => {console.log(error)} ,{enableHighAccuracy : true, timeout : 1000, maximumAge : 0})
        }else{
            navigate("/staff-login?message=Please login to continue")
        }
    }, [passedAuth])
    
    async function clockOutRequest(){
        try{
            // TODO: use the user id to get all the clock in they have made till date, compare those clocks in to see if they have a clock in for the current date, if they do allow them to clock out or else show a message saying they are not allowed to clock out as they havent clocked in yet.
            const currentUserId = currentUser._id
            console.log(currentUserId)
            const authorizationString = `Bearer ${token}`
            console.log(authorizationString)
            const request = await fetch(`http://localhost:3000/api/see-staff/${currentUserId}`, { method : "GET", headers : { 'Content-Type' : 'application/json', 'authorization' : authorizationString }})
            const response = await request.json()
            console.log(response)
        }catch(err){
            console.log(err)
        }
    }

    function handleClockOut(e){
        e.preventDefault()
        if((longitude != 0 && longitude != null) && (latitude !=0 && latitude != null) && (currentLocationAccuracy <= 35)){
            if((longitude <= geoFLongPlus && longitude >= geoFLongNeg) && (latitude <= geoFLatPlus && latitude >= geoLatNeg)){
                clockOutRequest()
            }else{
                console.log("You are outside the geo-fence area, clock out failed.")
                return
            }
        }else{
            // setDisplayMessage("Location accuracy is low, please try again.")
            // setSnackBar(true)
            return
        }
    }

    function handleCancelClock(){
        navigate("/dashboard")
    }

    return(
        // TODO: this whole page does not have a snackbar integrated to show messages to the user
        <>
        <AppBar position="absolute">
                <Container maxWidth="xl" sx={{display : "flex", alignItems : "center", justifyContent : "space-between", padding : {xs : "3%", md : "2%", lg : "1%"}}}>
                    <Typography variant="h5" color="white">Shift-Sync</Typography>
                    <Typography variant="h5" color="primary">Hi <Typography variant='inherit' component="span" color="warning">{currentUser?.staffName}</Typography></Typography>
                    <Button variant="text" color="error" startIcon={<LogoutIcon />}>
                      Logout
                    </Button>
                    <Tooltip title="Open settings"> {/* TODO: add options here for the profile picture button, in order to do so you have to handle the click on the icon button and then add the options, refer the dashboard menu to see how it was implemented */}
                        <IconButton sx={{ p: 0 }} >
                            <Avatar alt="Remy Sharp" src={currentUser?.profile_picture || undefined}/>
                        </IconButton>
                    </Tooltip>
                </Container>
            </AppBar>
        {/* TODO: see if you can reuse the navbar in the dashboard page. */}
        <Container maxWidth="lg" sx={{paddingTop : "1%", paddingBottom : "1%", minHeight : "100vh", minWidth : "100%", display : "flex", justifyContent : "center", alignItems : "center", flexDirection : "column"}}>

            <form onSubmit={handleClockOut}>
                <FormControl>
                    <FormLabel sx={{marginTop : "2%"}}>Select Shift Type</FormLabel>
                    <Select
                        value={shiftSelection}
                        onChange={(e)=>setShiftSelection(e.target.value)}
                        sx={{width : "200px", marginTop : "1%"}}
                    >
                        {
                            shiftType.map((shift, index)=>(
                                <MenuItem key={index} value={shift}>{shift}</MenuItem>
                            ))
                        }
                    </Select>



                    <Button variant="contained" type="submit" color="warning" sx={{marginTop : "4%"}} onClick={handleClockOut}>
                      Clock Out
                    </Button>

                </FormControl>
            </form>

            <Button variant="contained" color="primary" sx={{marginTop : "1%"}} onClick={handleCancelClock}>
              Cancel Clock Out
            </Button>

            <Typography variant="body1" color="inherit" sx={{marginTop : "1%"}}>What Shall Happen Here?</Typography>
            <Typography variant="body1" sx={{maxWidth : "40%", marginTop : "1%"}} color="inherit">We will track your location and see if you are at the needed place, once you are, we are going to clock you Out based on the time (the time is the current time you clicked the button) you clicked the button</Typography>

        </Container>
        </>
    )
    
}
