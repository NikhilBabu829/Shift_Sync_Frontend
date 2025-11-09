import Typography from '@mui/material/Typography'
import AppBar from '@mui/material/AppBar'
import Container from '@mui/material/Container'

export default function NavBarMaanger(){

    return (
        <AppBar position="static">
            <Container maxWidth="xl" sx={{display : "flex", alignItems : "center", justifyContent : "space-between", padding : {xs : "3%", md : "2%", lg : "1%"}}}>
                <Typography variant="h5" color="white">Shift-Sync</Typography>
            </Container>
        </AppBar>
    )
}
