import { Container, Typography, FormControl, FormLabel, FormHelperText, TextField, Button, Snackbar } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import * as EmailValidator from 'email-validator'
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppContext } from "../ContextProvider";
import Box from '@mui/material/Box';

export default function ManagerLogin(){

    const [email, setEmail] = useState("")
    const [pass, setPass] = useState("")
    const {currentManager, setCurrentManager} = useContext(AppContext)
    const [displaySnakBar, setSnackBar] = useState(false)
    const [snackBarText, setSnackBarText] = useState("")
    const navigate = useNavigate()
    const [params] = useSearchParams()

    function handleSnackBarClose(){
        setSnackBar(false)
    }

    useEffect(()=>{
        let msg = params.get('msg')
        if(msg !== null){
            console.log("came to this one")
            setSnackBar(true)
            setSnackBarText(msg)
            setTimeout(()=>{
                params.set("msg", null)
            })
        }
        else{
            setSnackBar(false)
            setSnackBarText("")
        }
    }, [])

    async function handleFormSubmit(e){
        e.preventDefault()
        if(!EmailValidator.validate(email)){
            const msg = new URLSearchParams({
                msg : "Please Check the email you used, and try again!"
            })
            window.location.replace(`http://localhost:5173/manager-login?${msg}`)
        }
        const emailId = email
        const password = pass
        try{
            const request = await fetch("http://localhost:3000/api/manager-login", {method : "POST", headers : {'Content-Type' : 'application/json'}, body : JSON.stringify({email : emailId, password : password})})
            if(request.ok){
                const response = await request.json()
                setCurrentManager(response.manager)
                localStorage.setItem("aes52", response.token)
                navigate("/manager-dashboard")
            }
        }catch{
            navigate("/manager-login")
        }
    }

    return (
        <>
            <Container maxWidth="md" sx={{textAlign : "center", paddingTop : {xs : "4%", md : "3%", lg : "2%"}, paddingBottom : {xs : "4%", md : "3%", lg : "2%"}}}> 
                <Typography variant="h1" color="warning">Manger Login</Typography>
                <Box maxWidth="xs" sx={{minHeight : "100vh", minWidth : "100%" , display : "flex", alignItems : "center", justifyContent : "center", position : "absolute", top:"0", left : "0"}}>
                <form onSubmit={handleFormSubmit}>
                    <FormControl>
                        <TextField
                          id="email"
                          label="email"
                          name="email"
                          value={email}
                          placeholder="example@gmail.com"
                          onChange={(e)=>{setEmail(e.target.value)}}
                        />
                        <TextField
                          id="password"
                          label="password"
                          name="password"
                          value={pass}
                          onChange={(e)=>{setPass(e.target.value)}}
                        />
                        <Button variant="outlined" color="error" type="submit">
                          Log in
                        </Button>
                    </FormControl>
                </form>
                </Box>
            </Container>
            {
                displaySnakBar ? 
                (
                    <Snackbar
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        open={displaySnakBar}
                        message={snackBarText}
                        autoHideDuration={2000}
                        onClose={handleSnackBarClose}
                    />
                ) : (
                    <></>
                )
            }
        </>
    )
} 
