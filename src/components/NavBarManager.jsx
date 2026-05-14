import Typography from '@mui/material/Typography'
import AppBar from '@mui/material/AppBar'
import Container from '@mui/material/Container'
import { Avatar, IconButton, Menu, MenuItem, Tooltip } from '@mui/material'
import { useState } from 'react'

export default function NavBarMaanger(){
    const settings = ["Logout", "Download Clock Data"]
    const [anchorElUser, setAnchorElUser] = useState(null)

    const handleCloseUserMenu = () => {
        setAnchorElUser(null);
    };

    const handleUserOptions = (event)=>{
        setAnchorElUser(event.currentTarget);
    }

    function handleMenuClick(e){
        if(e.target.innerText === "Download Clock Data"){
            window.open('http://localhost:3000/api/download-attendance', '_blank');
        }
    }

    return (
        <AppBar position="static">
            <Container maxWidth="xl" sx={{display : "flex", alignItems : "center", justifyContent : "space-between", padding : {xs : "3%", md : "2%", lg : "1%"}}}>
                <Typography variant="h5" color="white">Shift Sync</Typography>
                <Tooltip title="Open settings">
                    <IconButton sx={{ p: 0 }} onClick={handleUserOptions}>
                        <Avatar alt="Remy Sharp"/>
                    </IconButton>
                </Tooltip>
                <Menu
                    sx={{ mt: '45px' }}
                    id="menu-appbar"
                    anchorEl={anchorElUser}
                    anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                    }}
                    keepMounted
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                    }}
                    open={Boolean(anchorElUser)}
                    onClose={handleCloseUserMenu}
                    >
                    {settings.map((setting) => (
                        <MenuItem key={setting} onClick={handleMenuClick}>
                        <Typography sx={{ textAlign: 'center' }}>{setting}</Typography>
                        </MenuItem>
                    ))}
                </Menu>
            </Container>
        </AppBar>
    )
}
