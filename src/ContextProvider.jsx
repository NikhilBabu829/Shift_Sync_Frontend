import { createContext, useCallback, useState } from "react"

// Shared context object — consumed via useContext(AppContext) throughout the app
export const AppContext = createContext()

// Wraps the entire app to provide global auth and loading state to all children
export default function ContextProvider({children}){

    // Whether a staff member is currently authenticated
    const [userIsLoggedIn, setUserLoggedIn] = useState(false)
    // The currently authenticated staff member's profile object
    const [currentUser, setCurrentUser] = useState(null)
    // Global loading flag used by pages that need a full-screen spinner
    const [loading, setLoading] = useState(false)
    // The currently authenticated manager's profile object
    const [currentManager, setCurrentManager] = useState(null)

    return (
        <AppContext.Provider value={{ userIsLoggedIn, setUserLoggedIn, currentUser, setCurrentUser, loading, setLoading, currentManager, setCurrentManager  }}>
            {children}
        </AppContext.Provider>
    )

}
