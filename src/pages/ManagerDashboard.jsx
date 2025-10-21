import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import { Box, Button, Typography } from "@mui/material";

export default function ManagerDashboard(){

    const [currentManager, setCurrentManager] = useState("")
    const [maangerLoggedIn, setManagerLoggedIn] = useState(false)

    const managerToken = localStorage.getItem("aes52")
    const navigate = useNavigate()

    async function checkManagerAuth(){
        const authorizationString = managerToken
        try{
            const request = await fetch("http://localhost:3000/api/manager-auth", {method : "GET", headers : {'Content-Type' : 'application/json', 'authorization' : `Bearer ${authorizationString}`}})
            if(request.ok){
                const response = await request.json()
                setManagerLoggedIn(true)
                setCurrentManager(response.manager)
            }
        }catch{
            navigate("/manager-login")
        }
    } 

    useEffect(()=>{
        if(managerToken.length > 0){
            checkManagerAuth()
        }else{
            navigate("/manager-login")
        }
    }, [managerToken])

    return (
        <>
            <Box sx={{textAlign : "center", paddingTop : "3%", paddingBottom : "3%"}}>
                <Typography variant="h1" color="primary" sx={{fontSize : {xs : "3rem", lg : "4rem"}}}>Hi</Typography>
                <Button variant="outlined" color="primary" onClick={()=>{navigate("/invite-staff")}}>
                    Invite a New Staff Member?
                </Button>
            </Box>
        </>
    )

}
