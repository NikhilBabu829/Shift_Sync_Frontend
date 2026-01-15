import { useContext, useEffect, useState } from "react";
import { AppContext } from "../ContextProvider";
import NavBar from "../components/NavBar";
import InputLabel from '@mui/material/InputLabel';
import CircularProgress from '@mui/material/CircularProgress';
import { Box, Container, Typography, FormControl, Select, MenuItem, Button, Snackbar } from "@mui/material";
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { data, useNavigate, useSearchParams } from "react-router-dom";

export default function StaffSwap(){

    const {currentUser, userIsLoggedIn, authChecked, checkAuth, setLoading, loading, setCurrentUser} = useContext(AppContext)
    const [allStaffMembers, setStaffMembers] = useState([])
    const [loggedInUser, setLoggeddInUser] = useState()
    const [swapStartTime, setSwapStartTime] = useState(null)
    const [swapEndTime, setSwapEndTime] = useState(null)
    const [actualTime, setActualTime] = useState(null)
    const [actualEndTime, setActualEndTime] = useState(null)
    const [selectUser, setSelectUser] = useState("")
    const navigate = useNavigate()
    const [displaySnakBar, setDisplaySnackBar] = useState(false)
    const[snackBarText, setSnackBarText] = useState("")

    const userAuth = localStorage.getItem("aes52")

    function handleSnackBarClose(){
        setDisplaySnackBar(false)
    }

    async function handleFormSubmit(event){
        event.preventDefault()
        const swapUserId = selectUser
        const swapingTime = new Date(swapStartTime)
        const swappingEndTime = new Date(swapEndTime)
        const currentTime = new Date(actualTime)
        const currentEndTime = new Date(actualEndTime)
        const dataFormat = {
            date : currentTime.toDateString(),
            belongs_to : loggedInUser._id,
            shift_start_time : currentTime.toLocaleTimeString(),
            shift_end_time : currentEndTime.toLocaleTimeString(),
            swapDate : swapingTime.toDateString(),
            swap_belongs_to : swapUserId,
            swap_shift_start_time : swapingTime.toLocaleString(),
            swap_shift_end_time : swappingEndTime.toLocaleString()
        }
        const authorizationString = `Bearer ${userAuth}`
        const request = await fetch("http://localhost:3000/api/initiate-swap", {method : "POST", headers : {'Content-Type' : 'application/json', 'authorization' : authorizationString}, body : JSON.stringify(dataFormat)})
        if(request.ok){
            const response = await request.json()
            setSnackBarText(`${response.message}`)
            setDisplaySnackBar(true)
        }
    }

    async function makeAPICAll(){
        try{
            const authorizationString = `Bearer ${userAuth}`
            const request = await fetch("http://localhost:3000/api/staff", {method : "GET", headers : {'Content-Type' : 'application/json', 'authorization' : authorizationString}})
            if(request.ok){
                const response = await request.json()
                setLoggeddInUser(response.user)
                setStaffMembers(response.staffMembers)
                setLoading(false)
            }else{
                const msg = new useSearchParams({
                    reason : "You need to login, Your session may have expired"
                })
                navigate(`staff-login?${msg}`)
            }
        }catch{
            const msg = new useSearchParams({
                reason : "Something went wrong please, try again"
            })
            navigate(`staff-login?${msg}`)
        }finally{

        }
    } 

    useEffect(()=>{
        setLoading(true)
        if(userAuth && userAuth.length > 0 ){
            makeAPICAll()
        }else{
            navigate(`/staff-login`)
        }
    }, [userAuth])

    return loading ? 
    (
        <Box sx={{minHeight : "100vh", display : "flex", alignItems : "center", justifyContent : "center"}}>
            <CircularProgress/>
        </Box>
    ) : (
            <>
            <NavBar user={loggedInUser}/>
            <Container maxWidth="md" sx={{textAlign : "center", paddingTop : {xs : "4%", md : "3%", lg : "2%"}, paddingBottom : {xs : "4%", md : "3%", lg : "2%"}}}>
                <Typography variant="h1" color="warning" sx={{fontSize : {lg : "5rem", sm : "3rem", xs : "3rem"}}}>Swap Shifts</Typography>
                <Container maxWidth="md">
                    <form onSubmit={handleFormSubmit}>
                        <FormControl fullWidth>
                            <Select
                                id="swap_belongs_to"
                                labelId="swap_belongs_to"
                                label="Swap With?"
                                variant="filled"
                                value={selectUser}
                                name="selectedUser"
                                onChange={(e) => setSelectUser(e.target.value)}
                                color="white"
                            >
                                {
                                    allStaffMembers?.map((staff)=>(
                                        <MenuItem value={staff._id} key={staff._id}>{staff.staffName}</MenuItem>
                                    ))
                                }
                            </Select>
                            <InputLabel id="swap_belongs_to">Swap With?</InputLabel>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DemoContainer components={['DateTimePicker']}>
                                    <DateTimePicker label="Shift Start Time and Date (Their)" name="swapStartTimeAndDate" value={swapStartTime} onChange={(e)=> setSwapStartTime(e)}/>
                                </DemoContainer>
                            </LocalizationProvider>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DemoContainer components={['DateTimePicker']}>
                                    <DateTimePicker label="Shift End Time and Date (Their)" name="swapEndTimeAndDate" value={swapEndTime} onChange={(e)=> setSwapEndTime(e)}/>
                                </DemoContainer>
                            </LocalizationProvider>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DemoContainer components={['DateTimePicker']}>
                                    <DateTimePicker label="Shift Start Time and Date (Your)" name="timeAndDate" value={actualTime} onChange={(e)=> setActualTime(e)}/>
                                </DemoContainer>
                            </LocalizationProvider>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DemoContainer components={['DateTimePicker']}>
                                    <DateTimePicker label="Shift End Time and Date (Your)" name="timeEndAndDate" value={actualEndTime} onChange={(e)=> setActualEndTime(e)}/>
                                </DemoContainer>
                            </LocalizationProvider>
                            <Button variant="outlined" color="warning" type="submit" sx={{marginTop : "1%"}}>
                            Request Swap
                            </Button>
                        </FormControl>
                    </form>
                </Container>
            </Container>
            {
                displaySnakBar ? (
                    <Snackbar
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        open={displaySnakBar}
                        message={snackBarText}
                        autoHideDuration={2000}
                        onClose={handleSnackBarClose}
                    />
                ) : (<></>)
            }
        </>
    )
}
