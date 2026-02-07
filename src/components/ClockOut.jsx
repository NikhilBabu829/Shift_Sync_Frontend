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

    // TODO when i click the clockout button we are going to check if the user is already clocked in for the day, if they are we let them to clock out or else we are going to send them back to the dashboard with a message saying they have to clock in in order for them to clock out.
    // TODO have the clock out and clock in models be in sync, (this is a backend change) the clock out is going to have a referece to the clock in document

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
            const currentUserId = currentUser._id
            const authorizationString = `Bearer ${token}`
            const request = await fetch(`http://localhost:3000/api/view-all-clockins/${currentUserId}`, { method : "GET", headers : { 'Content-Type' : 'application/json', 'authorization' : authorizationString }})
            const response = await request.json()
            if(request.ok && response.length >= 0 ){
                let clockedOutLate = ""
                const possibleCurrentClockIn = response[response.length - 1]
                const currentDate = new Date()
                console.log(currentDate.toLocaleTimeString())
                const clockInDate = new Date(possibleCurrentClockIn.dateClockedIn)
                if(currentDate.getDate() == clockInDate.getDate()){
                    const splitShift = shiftSelection.split("-")
                    const shiftStart = splitShift[0]
                    const shiftEnd = splitShift[1]
                    const patternEndOfShift = shiftEnd.split(":")
                    const endOfShiftTime = new Date()
                    endOfShiftTime.setHours(patternEndOfShift[0], patternEndOfShift[1], 0)
                    console.log(endOfShiftTime.toLocaleTimeString())
                    const differenceInTime = Math.abs(currentDate - endOfShiftTime)
                    console.log(differenceInTime)
                    const diffHours = Math.floor(differenceInTime / (1000 * 60 * 60));
                    const diffMinutes = Math.floor((differenceInTime % (1000 * 60 * 60)) / (1000 * 60));
                    const diffSeconds = Math.floor((differenceInTime % (1000 * 60)) / 1000); 

                    if(differenceInTime < 0){
                        setIsLate(true)
                        clockedOutLate = "late"
                    }else if(differenceInTime >= 0){
                        setIsLate(false)
                        clockedOutLate = "early"
                    }else{
                        setIsLate(false)
                        clockedOutLate = "on time"
                    }

                    console.log(`You are ${clockedOutLate} by ${Math.abs(diffHours)} hours, ${Math.abs(diffMinutes)} minutes and ${Math.abs(diffSeconds)} seconds`)

                    const data = {
                        startOfShift : shiftStart,
                        endOfShift : shiftEnd,
                        timeClockedOut : currentDate.toLocaleTimeString(),
                        dateClockedOut : currentDate.toDateString(),
                        isLate : isLate
                    }

                    const authorizationString = `Bearer ${token}`
                    const clockOutRequest = await fetch('http://localhost:3000/api/staff-clock-out', {method : "POST", headers : {"Content-Type" : "application/json", "authorization" : authorizationString}, body : JSON.stringify(data)})
                    if(clockOutRequest.ok){
                        const clockOutResponse = await clockOutRequest.json()
                        console.log(clockOutResponse)
                        navigate("/dashboard?message=Clock Out Successful")
                    }else{
                        navigate("/dashboard?message=Clock Out Failed, Please Try Again")
                    }

                }else{
                    navigate("/dashboard?message=You cannot clock out as you have not clocked in today")
                }
            }
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
