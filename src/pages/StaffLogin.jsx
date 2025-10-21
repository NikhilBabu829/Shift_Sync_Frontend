import { Box, Container, Typography, Button, IconButton } from "@mui/material"
import { useNavigate, useSearchParams } from "react-router-dom"
import GoogleButton from '@mui/icons-material/android'
import { useContext, useEffect } from "react";
import { AppContext } from "../ContextProvider";

function StaffLogin(){

    const [params] = useSearchParams();
    const token = params.get('token')
    const navigate = useNavigate()

    const { setCurrentUser } = useContext(AppContext)

    useEffect(()=>{
      if(token != null && token.length > 0){
        setCurrentUser(token)
        localStorage.setItem("aes52", token)
        if(localStorage.getItem("aes52")){
          navigate("/dashboard")
        }
      }
    }, [token])
    
    return (
        <>
            <Box sx={{minHeight : "100vh", display : 'flex', justifyContent : "center", alignItems : "center", flexDirection : 'column'}}>
                <Container maxWidth="lg" sx={{textAlign : "center"}}>
                  <Typography variant="h1" color="primary" sx={{fontSize : {xs : "3rem"}}}>Staff Login</Typography>
                  <Box sx={{marginTop : {xs : "5%", lg : "1%"}}}>
                    <Button variant="contained" color="error" endIcon={<GoogleButton/>} onClick={()=>{window.location.assign("http://localhost:3000/api/staff-login")}}>
                      Login with 
                    </Button>
                    <Typography variant="subtitle2" color="warning" sx={{marginTop : {xs : "3%", md : "1%"}}}>*Access is limited to existing staff accounts. New staff must be added by a manager.*</Typography>
                  </Box>
                </Container>
            </Box>
        </>
    )

}

export default StaffLogin
