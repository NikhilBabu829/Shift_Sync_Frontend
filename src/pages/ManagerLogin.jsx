import { Container, Typography, FormControl, FormLabel, FormHelperText, TextField, Button } from "@mui/material";
import { useContext, useState } from "react";
import * as EmailValidator from 'email-validator'
import { useNavigate } from "react-router-dom";
import { AppContext } from "../ContextProvider";

export default function ManagerLogin(){

    const [email, setEmail] = useState("")
    const [pass, setPass] = useState("")
    const {currentManager, setCurrentManager} = useContext(AppContext)

    const navigate = useNavigate()

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
        </>
    )
} 
