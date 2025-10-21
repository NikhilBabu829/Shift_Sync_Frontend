import { useEffect, useState } from 'react'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import { Fade, Button } from '@mui/material'
import Box from '@mui/material/Box';
import { useNavigate } from 'react-router-dom';

function App() {

  const homepageWords = ['Time to Sync Up', 'Time to Plan Your Shift', 'Welcome Back!', 'Nice to Have You Here', 'Time to Shine', 'Keep Up the Great Work', 'Welcome, Human.']

  const [homePageText, setHomePageText] = useState(0)
  const navigate = useNavigate()

  useEffect(()=>{

    const interval = setInterval(()=>{
      const randomIndex = Math.floor(Math.random() * (homepageWords.length - 1))
      setHomePageText(randomIndex)
    }, 1700)

    return ()=> clearInterval(interval)

  }, [])

  return (
    <>
    <Box sx={{display : "flex", flexDirection : "column", alignItems : "center", justifyContent : "center", minHeight : "100vh"}}>
      <Container maxWidth="lg" sx={{paddingTop : "2%", paddingBottom : "2%", textAlign : "center"}}>
        <Fade in timeout={700} key={homePageText}>
          <Typography variant="h1" color="primary" sx={{fontSize : {xs : '3rem'}, fontWeight : "bold"}}>{homepageWords[homePageText]}</Typography>
        </Fade>
        <Box sx={{display : "flex", justifyContent : "center", gap : "5%", marginTop : {xs : "5%", lg : "1%"}}}>
          <Button variant="outlined" color="warning" onClick={()=>navigate("/manager-login")}> 
            manager login
          </Button>
          <Button variant="outlined" color="success" onClick={()=>navigate("/staff-login", {state : {from : '/'}})}>
            staff Login
          </Button>
        </Box>
      </Container>
    </Box>
    </>
  )
}

export default App
