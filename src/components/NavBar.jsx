import { AppContext } from "../ContextProvider";
import Typography from '@mui/material/Typography'
import { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Container from '@mui/material/Container'
import { Avatar, IconButton, Menu, MenuItem, Tooltip } from '@mui/material'

// Navigation options available to a logged-in staff member
const MENU_ITEMS = [
    { label: "My Schedule", path: "/my-roster" },
    { label: "Clock-In",    path: "/staff-clock-in" },
    { label: "Clock-Out",   path: "/staff-clock-out" },
    { label: "Logout",      path: null }, // path is null — handled programmatically
]

// Top app bar for staff-facing pages; receives the staff user object as a prop
export default function NavBar({user}){

    const {userIsLoggedIn, setUserLoggedIn, setCurrentUser, currentUser} = useContext(AppContext)
    const navigate = useNavigate()

    // Anchor element for the avatar dropdown menu; null means the menu is closed
    const [anchorElUser, setAnchorElUser] = useState(null)

    // Opens the avatar dropdown by capturing the click target as the menu anchor
    const handleUserOptions = (event)=>{
        setAnchorElUser(event.currentTarget);
    }

    // Closes the avatar dropdown
    const handleCloseUserMenu = () => {
        setAnchorElUser(null);
    };

    // Routes to the selected menu item or triggers logout
    function handleMenuItemClick(item) {
        handleCloseUserMenu()
        if (item.label === "Logout") {
            // Remove JWT and reset global auth state before redirecting home
            localStorage.removeItem("aes52"); localStorage.removeItem("userRole");
            setUserLoggedIn(false)
            setCurrentUser(null)
            navigate("/")
        } else {
            navigate(item.path)
        }
    }

    // Sync the context's currentUser whenever the prop-supplied user changes
    useEffect(()=>{
        setCurrentUser(user)
    }, [currentUser])

    return (
        <AppBar position="static">
            <Container maxWidth="xl" sx={{display : "flex", alignItems : "center", justifyContent : "space-between", padding : {xs : "3%", md : "2%", lg : "1%"}}}>
                <Typography variant="h5" color="white" sx={{ cursor: "pointer" }} onClick={() => navigate("/dashboard")}>Shift Sync</Typography>
                <Tooltip title="Open settings">
                    <IconButton sx={{ p: 0 }} onClick={handleUserOptions}>
                        {/* Show profile picture if available, otherwise fallback to MUI default avatar */}
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
                    {MENU_ITEMS.map((item) => (
                        <MenuItem key={item.label} onClick={() => handleMenuItemClick(item)}>
                        <Typography sx={{ textAlign: 'center' }}>{item.label}</Typography>
                        </MenuItem>
                    ))}
                </Menu>
            </Container>
        </AppBar>
    )
}
