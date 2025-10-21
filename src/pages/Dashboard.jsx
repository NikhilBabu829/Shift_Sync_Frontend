import Typography from '@mui/material/Typography'
import { useContext, useEffect, useState } from 'react'
import { AppContext } from '../ContextProvider'
import { useNavigate } from 'react-router-dom'
import CircularProgress from '@mui/material/CircularProgress';
import { Box, Button} from '@mui/material'
import NavBar from '../components/NavBar'
import { Token } from '@mui/icons-material';
function Dashboard(){

    const { updateUserLoggedInStatus } = useContext(AppContext)
    const [loading, setLoading] = useState(false)
    const [currentUser, setCurrentUser] = useState({})
    const navigate = useNavigate()
    let userChecked = false
    const getToken = localStorage.getItem("aes52")

    async function checkUser(){
        try{
            const authorizationString = `Bearer ${getToken}`
            const request = await fetch("http://localhost:3000/api/staff-auth", {method : "GET", headers : {'Content-Type' : 'application/json', 'authorization' : authorizationString}}) 
            if(request.ok){
                const response = await request.json()
                setCurrentUser(response.user)
                userChecked = true
                setLoading(false)
            }else{
                const msg = new URLSearchParams({
                    message : "Not Valid, Please Login Again!"
                })
                navigate(`/staff-login?${msg}`)
            }
        }catch{
            const msg = new URLSearchParams({
                    message : "Not Valid, Please Login Again!"
            })
            navigate(`/staff-login?${msg}`)
        }finally{

        }
    }

    useEffect(()=>{
        setLoading(true)
        if(getToken != null && getToken.length > 0){
            checkUser()
        }else{
            const msg = new URLSearchParams({
                message : "You Need to Login"
            })
            navigate(`/staff-login?${msg}`)
        }
    }, [getToken])

    useEffect(()=>{
        
    }, [currentUser])

    return loading ? 
    (
        <Box sx={{minHeight : "100vh", display : "flex", alignItems : "center", justifyContent : "center"}}>
            <CircularProgress/>
        </Box> ) 
        : (
        <>
            <NavBar user={currentUser}/>
            <Box sx={{textAlign : "center", paddingTop : "3%", paddingBottom : "3%"}}>
                <Typography variant="h1" color="primary" sx={{fontSize : {xs : "3rem", lg : "4rem"}}}>Hi <Typography variant='inherit' component="span" color="warning">{currentUser.staffName}</Typography></Typography>
                <Button variant="outlined" color="primary" onClick={()=>{navigate("/staff-swap")}}>
                    Plan a swap?
                </Button>
            </Box>
        </>
    )
}

export default Dashboard
