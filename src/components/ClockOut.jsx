import { Box, Button, CircularProgress, Container, FormControl, MenuItem, Select, Snackbar } from '@mui/material'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const shiftType = ['7:00-15:30', '8:00-16:30', '10:00-18:30', '13:30-22:00','15:00-23:30' , '16:00-00:30']

export default function ClockOut(){

    const centerOfFenceLat =  53.36338289310367
    const centerOfFenceLong = -6.248976622205493
    const geoFLongPlus = centerOfFenceLong + 0.01
    const geoFLongNeg = centerOfFenceLong - 0.01
    const geoFLatPlus = centerOfFenceLat + 0.01
    const geoLatNeg = centerOfFenceLat - 0.01

    const [loading, setLoading] = useState(false)
    const [shiftSelection, setShiftSelection] = useState(shiftType[0])
    const [displayDisplaySnackBar, setDisplaySnackBar] = useState(false)
    const [snackBarText, setSnackBarText] = useState("")
    const [geoFence, setGeoFence] = useState(false)
    const [isLate, setIsLate] = useState(false)
    const navigate = useNavigate()

    const [params] = useSearchParams()

    const token = localStorage.getItem("aes52")

    useEffect(()=>{
        const message = params.get("message")
        setLoading(true)
        if(message != null){
            setDisplaySnackBar(true)
            setSnackBarText(message)
        }
        checkRange()
    }, [params])

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
                const msg = new URLSearchParams({
                    message : "Accuracy of Location is very poor, please try again!"
                })
                navigate(`/dashboard?${msg}`)
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
        setDisplaySnackBar(false)
    }

    async function handleClockIn(e){
        e.preventDefault()
        if(!geoFence){
            const msg = new URLSearchParams({
                message : "Location Accuracy is very Low please try again!"
            })
            navigate(`/staff-clock-out?${msg}`)
        }
        const splitShift = shiftSelection.split("-")
        const shiftStart = splitShift[0]
        const shiftEnd = splitShift[1]
        const patternEndOfShift = shiftEnd.split(":")
        const endOfShiftTime = new Date()
        endOfShiftTime.setHours(patternEndOfShift[0])
        endOfShiftTime.setMinutes(patternEndOfShift[1])
        endOfShiftTime.setSeconds(0)
        const currentTIme = new Date()
        let isLateString = ""

        const differenceInTime = endOfShiftTime - currentTIme
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
            timeClockedOut : currentTIme.toLocaleTimeString(),
            dateClockedOut : currentTIme.toDateString(),
            isLate : isLate
        }
        try{
            const authorizationString = `Bearer ${token}`
            const request = await fetch("http://localhost:3000/api/staff-clock-out", {method : "POST", headers : {"Content-Type" : "application/json", "authorization" : authorizationString}, body : JSON.stringify(data)})
            if(request.ok){
                const response = await request.json()
                setDisplaySnackBar(true)
                setSnackBarText(`You are ${isLateString} by ${Math.abs(diffHours)} hours, ${Math.abs(diffMinutes)} minutes and ${Math.abs(diffSeconds)} seconds`)
            }
        }catch(err){
            console.log(err)
        }
    }

    return (
        loading ? (
            <Box sx={{minHeight : "100vh", display : "flex", alignItems : "center", justifyContent : "center"}}>
                <CircularProgress/>
            </Box>
        ) : (
            <Container maxWidth="lg">
                <Typography variant="h1" color="primary">Staff Clock Out</Typography>
                <Typography variant="body1" color="primary">Please fill in the below fields to clock Out successfully</Typography>
                <form onSubmit={handleClockIn}>
                    <FormControl fullWidth>
                      <Select
                        id="shiftTypes"
                        labelId="Shift Pattern"
                        label="Shift Pattern"
                        variant="filled"
                        value={shiftSelection}
                        onChange={(e)=> setShiftSelection(e.target.value)}
                        color="white"
                      >
                        {
                            shiftType.map((shift)=>(
                                <MenuItem value={shift} key={shift}>{shift}</MenuItem>
                            ))
                        }
                      </Select>
                      <Button type="submit" variant="outlined" color="primary">
                        Clock-Out
                      </Button>
                    </FormControl>
                </form>
                <Box>
                    <Typography variant="body1" color="white">What happens Here</Typography>
                    <Typography variant="subtitle2" color="white">We will track your location and see if you are at the needed place, once you are, we are going to clock you Out based on the time you clicked the button</Typography>
                </Box>
                {
                    displayDisplaySnackBar ? (
                        <Snackbar
                            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                            open={displayDisplaySnackBar}
                            message={snackBarText}
                            autoHideDuration={5000}
                            onClose={handleSnackBarClose}
                        />
                    ) : (<></>)
                }
            </Container>
        )
    )

}
