import { Container, FormControl, TextField, Typography, Button, Snackbar } from "@mui/material"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

export default function ManagerInvite(){

    const [toEmail, setToEmail] = useState("")
    const [displaySnakBar, setDisplaySnackBar] = useState(false)
    const[snackBarText, setSnackBarText] = useState("")
    const navigate = useNavigate()

    const managerToken = localStorage.getItem("aes52")

    useEffect(()=>{
        if(managerToken == null){
            const msg = new URLSearchParams({
                msg : "You need to login"
            })
            navigate(`/manager-login?${msg}`)
        }
    },[managerToken])

    function handleSnackBarClose(){
        setDisplaySnackBar(false)
    }

    async function handleFormSubmit(e){
        e.preventDefault()
        const authorizationString = `Bearer ${managerToken}`
        const to = toEmail
        console.log(to)
        try{
            const request = await fetch("http://localhost:3000/api/staff-add", {method : "POST", headers : {'Content-Type' : 'application/json', 'authorization' : authorizationString}, body : JSON.stringify({to})})
            if(request.ok){
                const response = await request.json()
                console.log(response)
                setSnackBarText(response.message)
                setDisplaySnackBar(true)
            }
        }catch{
            navigate("/manager-login")
        }
    }

    return (
         <>
            <Container maxWidth="md" sx={{textAlign : "center", paddingTop : {xs : "4%", md : "3%", lg : "2%"}, paddingBottom : {xs : "4%", md : "3%", lg : "2%"}}}> 
                <Typography variant="h1" color="warning">New Staff Invite</Typography>
                <form onSubmit={handleFormSubmit}>
                    <FormControl>
                        <TextField
                          id="email"
                          label="enter email of new staff"
                          name="email"
                          value={toEmail}
                          placeholder="example@gmail.com"
                          type="email"
                          onChange={(e)=>{setToEmail(e.target.value)}}
                        />
                        <Button variant="outlined" color="error" type="submit">
                          Send Invite
                        </Button>
                    </FormControl>
                </form>
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
                ) : (
                    <></>
                )
            }

        </>
    )
}
