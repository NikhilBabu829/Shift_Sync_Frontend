import { Container, Typography, FormControl, FormLabel, FormHelperText, TextField, Button, Snackbar } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import * as EmailValidator from 'email-validator'
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppContext } from "../ContextProvider";

export default function ManagerLogin(){

    const [email, setEmail] = useState("")
    const [pass, setPass] = useState("")
    const {currentManager, setCurrentManager} = useContext(AppContext)
    const [params] = useSearchParams()
    let msg = params.get('msg')    
    const [displaySnakBar, setSnackBar] = useState(false)
    const [snackBarText, setSnackBarText] = useState("")

    function handleSnackBarClose(){
        setSnackBar(false)
    }

    const navigate = useNavigate()

    useEffect(()=>{
        if(msg !== null){
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
        let emailId;
        if(EmailValidator.validate(email)){
            emailId = email
        }else{
            navigate("/manager-login")
        }
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
                <form onSubmit={handleFormSubmit}>
                    <FormControl>
                        <TextField
                          id="email"
                          label="email"
                          name="email"
                          value={email}
                          placeholder="example@gmail.com"
                          type="email"
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
