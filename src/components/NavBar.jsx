import { AppContext } from "../ContextProvider";
import Typography from '@mui/material/Typography'
import { useContext, useEffect, useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Container from '@mui/material/Container'
import { Avatar, IconButton, Menu, MenuItem, Tooltip } from '@mui/material'

const settings = ["Logout", "Clock-In", "Clock-Out"]

export default function NavBar({user}){

    const {userIsLoggedIn, setUserLoggedIn, setCurrentUser, currentUser} = useContext(AppContext)

    const [anchorElUser, setAnchorElUser] = useState(null)

    const handleUserOptions = (event)=>{
        setAnchorElUser(event.currentTarget);
    }

    const handleCloseUserMenu = () => {
        setAnchorElUser(null);
    };

    useEffect(()=>{
        setCurrentUser(user)
    }, [currentUser])

    return (
        <AppBar position="static">
            <Container maxWidth="xl" sx={{display : "flex", alignItems : "center", justifyContent : "space-between", padding : {xs : "3%", md : "2%", lg : "1%"}}}>
                <Typography variant="h5" color="white">Shift Sync</Typography>
                <Tooltip title="Open settings">
                    <IconButton sx={{ p: 0 }} onClick={handleUserOptions}>
                        <Avatar alt="Remy Sharp" src={user?.profile_picture || undefined}/>
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
                        <MenuItem key={setting} onClick={handleCloseUserMenu}>
                        <Typography sx={{ textAlign: 'center' }}>{setting}</Typography>
                        </MenuItem>
                    ))}
                </Menu>
            </Container>
        </AppBar>
    )
}
