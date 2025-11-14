import { Snackbar } from '@mui/material'
import Typography from '@mui/material/Typography'
import { useState } from 'react'

const shiftType = ['7:00-15:30', '8:00-16:30', '10:00-18:30', '13:30-22:00', '16:00-00:30']

export default function ClockOut(){

    const centerOfFenceLat =  53.36338289310367
    const centerOfFenceLong = -6.248976622205493
    const geoFLongPlus = centerOfFenceLong + 0.01
    const geoFLongNeg = centerOfFenceLong - 0.01
    const geoFLatPlus = centerOfFenceLat + 0.01
    const geoLatNeg = centerOfFenceLat - 0.01

    const [loading, setLoading] = useState(false)
    const [shiftSelection, setShiftSelection] = useState(shiftType[0])
    const [displayDisplaySnackBar, setDisplaySnackBar] = useState(false)
    const [snackBarText, setSnackBarText] = useState("")

    const token = localStorage.getItem("aes52")

    return (
        <>
            
        </>
    )

}
