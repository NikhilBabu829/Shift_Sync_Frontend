import Typography from '@mui/material/Typography'
import AppBar from '@mui/material/AppBar'
import Container from '@mui/material/Container'
import { Avatar, IconButton, Menu, MenuItem, Tooltip } from '@mui/material'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Top app bar used on manager-facing pages; no auth props needed (manager state is managed externally)
export default function NavBarMaanger(){
    // Menu options shown to the manager in the avatar dropdown
    const navigate = useNavigate()
    const settings = ["Logout", "Download Clock Data"]
    // Anchor element for the avatar dropdown menu; null means the menu is closed
    const [anchorElUser, setAnchorElUser] = useState(null)

    // Closes the avatar dropdown
    const handleCloseUserMenu = () => {
        setAnchorElUser(null);
    };

    // Opens the avatar dropdown by capturing the click target as the menu anchor
    const handleUserOptions = (event)=>{
        setAnchorElUser(event.currentTarget);
    }

    // Handles manager menu item clicks — triggers attendance download in a new tab
    function handleMenuClick(e){
        if(e.target.innerText === "Download Clock Data"){
            window.open(`${import.meta.env.VITE_API_BASE_URL}/api/download-attendance`, '_blank');
        }
    }

    return (
        <AppBar position="static">
            <Container maxWidth="xl" sx={{display : "flex", alignItems : "center", justifyContent : "space-between", padding : {xs : "3%", md : "2%", lg : "1%"}}}>
                <Typography variant="h5" color="white" sx={{ cursor: "pointer" }} onClick={() => navigate("/manager-dashboard")}>Shift Sync</Typography>
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
