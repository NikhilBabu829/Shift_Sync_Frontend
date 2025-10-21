import { createContext, useCallback, useState } from "react"
 
export const AppContext = createContext()

export default function ContextProvider({children}){

    const [userIsLoggedIn, setUserLoggedIn] = useState(false)
    const [currentUser, setCurrentUser] = useState(null)
    const [loading, setLoading] = useState(false)
    const [currentManager, setCurrentManager] = useState(null)
 
    return (
        <AppContext.Provider value={{ userIsLoggedIn, setUserLoggedIn, currentUser, setCurrentUser, loading, setLoading, currentManager, setCurrentManager  }}>
            {children}
        </AppContext.Provider>
    )

}


