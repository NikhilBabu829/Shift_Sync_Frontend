import { useNavigate, useSearchParams } from "react-router-dom"
import Typography from '@mui/material/Typography'
import { useEffect, useState } from "react"
import { Box, CircularProgress, Container, FormControl, FormLabel, FormHelperText, MenuItem, Select, Accordion, AccordionSummary, AccordionDetails, Button, Snackbar } from "@mui/material"

const shiftType = ['7:00-15:30', '8:00-16:30', '10:00-18:30', '13:30-22:00', '16:00-00:30']

export default function ClockIn(){

    const centerOfFenceLat =  53.36338289310367
    const centerOfFenceLong = -6.248976622205493
    const geoFLongPlus = centerOfFenceLong + 0.01
    const geoFLongNeg = centerOfFenceLong - 0.01
    const geoFLatPlus = centerOfFenceLat + 0.01
    const geoLatNeg = centerOfFenceLat - 0.01

    let message = "sample"

    const [loading, setLoading] = useState(false)
    const [displaySnackBar, setSnackBar] = useState(false)
    const [displayMessage, setDisplayMessage] = useState("")
    const [shift, setSelectShift] = useState(shiftType[0])
    const [geoFence, setGeoFence] = useState(false)
    const navigate = useNavigate()
    const [params] = useSearchParams()

    const token = localStorage.getItem("aes52")

    useEffect(()=>{
        let msg = params.get("message")
        console.log(msg)
        if(msg !== null){
            setSnackBar(true)
            setDisplayMessage(msg)
        }
        setLoading(true)
        checkRange()
    }, [])

    function checkRange(){
        setLoading(true)
        navigator.geolocation.getCurrentPosition((data)=>{
            const {latitude, longitude} = data.coords
            console.log("Long : " , longitude)
            console.log("lat : " , latitude)
            console.log("accuracy : " ,data.coords.accuracy)
            if(longitude >= geoFLongNeg && longitude <= geoFLongPlus && data.coords.accuracy <= 30){
                if(latitude >= geoLatNeg && latitude <= geoFLatPlus){
                    setLoading(false)
                    setGeoFence(true)
                }else{
                    setLoading(false)
                    setGeoFence(false)
                }
            }else{
                setLoading(false)
                setGeoFence(false)
            }
        },
            (err)=>{
                console.log(err)
            },
            {
                maximumAge : 0,
                enableHighAccuracy : true,
                timeout : 500
            }
        )
    }

    function handleSnackBarClose(){
        setSnackBar(false)
    }

    async function handleClockIn(e){
        e.preventDefault()
        if(!geoFence){
            console.log("Ran")
            const msg = new URLSearchParams({
                message : "Your Location Range is Poor, please try again!"
            })
            navigate(`/staff-clock-in?${msg}`)
        }
        console.log("Connected")
        const shiftPattern = shift.split("-")
        const startOfShift = shiftPattern[0]
        const patternStartOfShift = startOfShift.split(":")
        const endOfShift = shiftPattern[1]
        const date = new Date()
        date.setDate(date.getDate() - 4)
        const time = date.toLocaleTimeString()
        const day = date.toDateString()
        let isLate = false
        let lateString = ""

        const patternTime = new Date()
        patternTime.setDate(patternTime.getDate() - 4)
        patternTime.setHours(patternStartOfShift[0])
        patternTime.setMinutes(patternStartOfShift[1])
        patternTime.setSeconds(0)

        const differenceInTime = patternTime - date
        const diffHours = Math.floor(differenceInTime / (1000 * 60 * 60));
        const diffMinutes = Math.floor((differenceInTime % (1000 * 60 * 60)) / (1000 * 60));
        const diffSeconds = Math.floor((differenceInTime % (1000 * 60)) / 1000);

        if(differenceInTime > 0){
            isLate = false
            lateString = "early"
        }else if(differenceInTime < 0){
            isLate = true
            lateString = "late"
        }else{
            isLate = false
            lateString = "On Time"
        }

        console.log(`You are ${lateString} ${diffHours}H ${diffMinutes}M ${diffSeconds}S`)

        const data = {
            startOfShift : startOfShift,
            endOfShift : endOfShift,
            timeClockedIn : time,
            dateClockedIn : day,
            isLate : isLate
        }
        try{
            const authorizationString = `Bearer ${token}`
            const request = await fetch("http://localhost:3000/api/staff-clock-in", {method : 'POST', headers : {'Content-Type' : 'application/json', 'authorization' : authorizationString}, body : JSON.stringify(data)})
            if(request.ok){
                const response = await request.json()
                setSnackBar(true)
                setDisplayMessage(`You are ${lateString} ${diffHours}H ${diffMinutes}M ${diffSeconds}S`)
            }
        }catch(err){

        }

    }

    return (
        loading ? (
            <Box sx={{minHeight : "100vh", display : "flex", alignItems : "center", justifyContent : "center"}}>
                <CircularProgress/>
            </Box>
        ) : (
            <Container maxWidth="lg">
                <Typography variant="h1" color="primary">Staff Clock in</Typography>
                <Typography variant="body1" color="primary">Please fill in the below fields to clock in successfully</Typography>
                <form onSubmit={handleClockIn}>
                    <FormControl fullWidth>
                      <Select
                        id="shiftTypes"
                        labelId="Shift Pattern"
                        label="Shift Pattern"
                        variant="filled"
                        value={shift}
                        onChange={(e)=> setSelectShift(e.target.value)}
                        color="white"
                      >
                        {
                            shiftType.map((shift)=>(
                                <MenuItem value={shift} key={shift}>{shift}</MenuItem>
                            ))
                        }
                      </Select>
                      <Button type="submit" variant="outlined" color="primary">
                        Clock-In
                      </Button>
                    </FormControl>
                </form>
                <Box>
                    <Typography variant="body1" color="white">What happens Here</Typography>
                    <Typography variant="subtitle2" color="white">We will track your location and see if you are at the needed place, once you are, we are going to clock you in based on the time you clicked the button</Typography>
                </Box>
                {
                    displaySnackBar ? (
                        <Snackbar
                            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                            open={displaySnackBar}
                            message={displayMessage}
                            autoHideDuration={5000}
                            onClose={handleSnackBarClose}
                        />
                    ) : (<></>)
                }
            </Container>
        )
    )
}