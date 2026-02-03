import { useNavigate, useSearchParams } from "react-router-dom"
import Typography from '@mui/material/Typography'
import { useEffect, useState } from "react"
import { Container, FormControl, FormLabel, Select, Button, Snackbar, TextField } from "@mui/material"
import AppBar from '@mui/material/AppBar'
import { IconButton, Menu, MenuItem, Tooltip, Avatar } from "@mui/material"
import LogoutIcon from '@mui/icons-material/Logout';

const shiftType = ['7:00-15:30', '8:00-16:30', '10:00-18:30', '13:30-22:00', '16:00-00:30']

export default function ClockIn(){

    const centerOfFenceLat =  53.36364350363377
    const centerOfFenceLong =  -6.248844488587223
    const geoFLongPlus = centerOfFenceLong + 0.001
    const geoFLongNeg = centerOfFenceLong - 0.001
    const geoFLatPlus = centerOfFenceLat + 0.001
    const geoLatNeg = centerOfFenceLat - 0.001

    const [longitude, setLongitude] = useState(0)
    const [latitude, setLatitude] = useState(0)
    const [currentLocationAccuracy, setCurrentLocationAccuracy] = useState(0)
    const [userAuthenticated, setUserAutenticated] = useState(false)
    const [passedAuth, setPassedAuth] = useState(false)
    const [currentUser, setCurrentUser] = useState(null)
    const [loading, setLoading] = useState(false)
    const [displaySnackBar, setSnackBar] = useState(false)
    const [displayMessage, setDisplayMessage] = useState("")
    const [shift, setSelectShift] = useState(shiftType[0])
    const [isLate, setIsLate] = useState(false)
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
        }catch{
            const msg = new URLSearchParams({
                    message : "Not Valid, Please Login Again!"
            })
            navigate(`/staff-login?${msg}`)
        }finally{

        }
    }

    useEffect(()=>{
        if(token == null || token.length == 0) return
        (async ()=>{
            const response = await checkUser()
            setUserAutenticated(response)
            setPassedAuth(true)
        })()
    }, [])

    useEffect(()=>{
        if (!passedAuth) return
        if(userAuthenticated){
            navigator.geolocation.getCurrentPosition((coords)=>{
                setLongitude(coords.coords.longitude)
                setLatitude(coords.coords.latitude)
                setCurrentLocationAccuracy(coords.coords.accuracy)
            }, (error) => {console.log(error)} ,{enableHighAccuracy : true, timeout : 1000, maximumAge : 0})
        }else{
            navigate("/staff-login?message=Please login to continue")
        }
    }, [userAuthenticated])

    async function clockInRequest(){
        console.log("We are in")
        const splitShift = shift.split("-")
        const shiftStart = splitShift[0]
        const shiftEnd = splitShift[1]
        const patternStartOfShift = shiftStart.split(":")
        const startOfShiftTime = new Date()
        startOfShiftTime.setHours(patternStartOfShift[0])
        startOfShiftTime.setMinutes(patternStartOfShift[1])
        startOfShiftTime.setSeconds(0)
        const currentTIme = new Date()
        let isLateString = ""

        const differenceInTime = startOfShiftTime - currentTIme
        const diffHours = Math.floor(differenceInTime / (1000 * 60 * 60));
        const diffMinutes = Math.floor((differenceInTime % (1000 * 60 * 60)) / (1000 * 60));
        const diffSeconds = Math.floor((differenceInTime % (1000 * 60)) / 1000); 

        if(differenceInTime < 0){
            setIsLate(true)
            isLateString = "late"
        }else if(differenceInTime >= 0){
            setIsLate(false)
            isLateString = "early"
        }else{
            setIsLate(false)
            isLateString = "on time"
        }

        console.log(`You are ${isLateString} by ${Math.abs(diffHours)} hours, ${Math.abs(diffMinutes)} minutes and ${Math.abs(diffSeconds)} seconds`)

        const data = {
            startOfShift : shiftStart,
            endOfShift : shiftEnd,
            timeClockedIn : currentTIme.toLocaleTimeString(),
            dateClockedIn : currentTIme.toDateString(),
            isLate : isLate
        }
        try{
            const authorizationString = `Bearer ${token}`
            const request = await fetch("http://localhost:3000/api/staff-clock-in", {method : "POST", headers : {"Content-Type" : "application/json", "authorization" : authorizationString}, body : JSON.stringify(data)})
            if(request.ok){
                const response = await request.json()
                if(response.msg){
                    setDisplayMessage(`You are ${isLateString} by ${Math.abs(diffHours)} hours, ${Math.abs(diffMinutes)} minutes and ${Math.abs(diffSeconds)} seconds`)
                    setSnackBar(true)
                }
            }
        }catch(err){
            console.log(err)
        }

    }

    function handleClockIn(e){
        e.preventDefault()
        if((longitude != 0 && longitude != null) && (latitude !=0 && latitude != null) && (currentLocationAccuracy <= 35)){
            if((longitude <= geoFLongPlus && longitude >= geoFLongNeg) && (latitude <= geoFLatPlus && latitude >= geoLatNeg)){
                clockInRequest()
            }else{
                console.log("You are outside the geo-fence area, clock in failed.")
                return
            }
        }else{
            setDisplayMessage("Location accuracy is low, please try again.")
            setSnackBar(true)
            return
        }
    }

    function handleCancelClock(){
        navigate("/dashboard")
    }

    return (
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

            <form onSubmit={handleClockIn}>
                <FormControl>
                    <FormLabel sx={{marginTop : "2%"}}>Select Shift Type</FormLabel>
                    <Select
                        value={shift}
                        onChange={(e)=>setSelectShift(e.target.value)}
                        sx={{width : "200px", marginTop : "1%"}}
                    >
                        {
                            shiftType.map((shift, index)=>(
                                <MenuItem key={index} value={shift}>{shift}</MenuItem>
                            ))
                        }
                    </Select>



                    <Button variant="contained" type="submit" color="warning" sx={{marginTop : "4%"}} onClick={handleClockIn}>
                      Clock In
                    </Button>

                </FormControl>
            </form>

            <Button variant="contained" color="primary" sx={{marginTop : "1%"}} onClick={handleCancelClock}>
              Cancel Clock In
            </Button>

            <Typography variant="body1" color="inherit" sx={{marginTop : "1%"}}>What Shall Happen Here?</Typography>
            <Typography variant="body1" sx={{maxWidth : "40%", marginTop : "1%"}} color="inherit">We will track your location and see if you are at the needed place, once you are, we are going to clock you In based on the time (the time is the current time you clicked the button) you clicked the button</Typography>

        </Container>
        </>
    )

}