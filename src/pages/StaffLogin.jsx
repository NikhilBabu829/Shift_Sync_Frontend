import apiFetch from '../utils/apiFetch.js';
import { Box, Container, Typography, Button, IconButton, Snackbar } from "@mui/material"
import { useNavigate, useSearchParams } from "react-router-dom"
import GoogleButton from '@mui/icons-material/Android'
import { useContext, useEffect, useState } from "react";
import { AppContext } from "../ContextProvider";

function StaffLogin(){

    const [params] = useSearchParams();
    const messageFromParams = params.get("message")
    const tokenFromParams = params.get("token")
    const msgFromParams = params.get("msg")
    const navigate = useNavigate()
    const existingToken = localStorage.getItem("aes52")
    const [displaySnackbar, setDisplaySnackbar] = useState(false)
    const [snackbarMessage, setDisplaySnackbarMessage] = useState("")

    const { setCurrentUser } = useContext(AppContext)

    function handleSnackBarClose(){
      setDisplaySnackbar(false)
      setDisplaySnackbarMessage("")
    }

    useEffect(()=>{
      if(tokenFromParams != null && tokenFromParams.length > 0){
        apiFetch(`${import.meta.env.VITE_API_BASE_URL}/api/staff-auth`, {method : "GET", headers : {'Content-Type' : 'application/json', 'Authorization' : `Bearer ${tokenFromParams}`}}).then((response) => {
          if(response.status == 200 && response.ok){
            localStorage.removeItem("aes52")
            localStorage.setItem("aes52", `${tokenFromParams}`)
            navigate("/dashboard")
          }else{
            setDisplaySnackbar(true)
            setDisplaySnackbarMessage("Unauthorised, please login again")
          }
        })
      }
      else{
        apiFetch(`${import.meta.env.VITE_API_BASE_URL}/api/staff-auth`, {method : "GET", headers : {'Content-Type' : 'application/json', 'Authorization' : `Bearer ${existingToken}`}}).then((response)=>{
          if(response.status == 200 && response.ok){
            navigate(`/dashboard`, {state : {"from" : "staff-login", "token" : existingToken}})
          }else{
            setDisplaySnackbar(true)
            setDisplaySnackbarMessage("session expired, please login again")
          }
        })
      }
    }, [])
    
    return (
        <>
            <Box sx={{minHeight : "100vh", display : 'flex', justifyContent : "center", alignItems : "center", flexDirection : 'column'}}>
                <Container maxWidth="lg" sx={{textAlign : "center"}}>
                  <Typography variant="h1" color="primary" sx={{fontSize : {xs : "3rem"}}}>Staff Login</Typography>
                  <Box sx={{marginTop : {xs : "5%", lg : "1%"}}}>
                    <Button variant="contained" color="error" endIcon={<GoogleButton/>} onClick={()=>{window.location.assign(`${import.meta.env.VITE_API_BASE_URL}/api/staff-login`)}}>
                      Login with 
                    </Button>
                    <Typography variant="subtitle2" color="warning" sx={{marginTop : {xs : "3%", md : "1%"}}}>*Access is limited to existing staff accounts. New staff must be added by a manager.*</Typography>
                  </Box>
                </Container>
            </Box>
            {
              displaySnackbar ? (
                <Snackbar
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  open={displaySnackbar}
                  message={snackbarMessage}
                  autoHideDuration={5000}
                  onClose={handleSnackBarClose}
                />
              ) : (<></>)
            }
        </>
    )

}

export default StaffLogin
