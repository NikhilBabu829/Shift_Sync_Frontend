import { useSearchParams } from "react-router-dom"

function ClockIn(){

    const centerOfFenceLat =  53.36338289310367
    const centerOfFenceLong = -6.248976622205493
    const geoFLongPlus = centerOfFenceLong + 0.01
    const geoFLongNeg = centerOfFenceLong - 0.01
    const geoFLatPlus = centerOfFenceLat + 0.01
    const geoLatNeg = centerOfFenceLat - 0.01

    let message = "sample"

    function checkRange(coords){
        const {latitude, longitude} = coords
        console.log("long Neg" , geoFLongNeg)
        console.log("long Plus" , geoFLongPlus)
        console.log("long" , longitude)
        if(longitude >= geoFLongNeg && longitude <= geoFLongPlus){
            if(latitude >= geoLatNeg && latitude <= geoFLatPlus){
                return true
            }else{
                return false
            }
        }else{
            return false
        }
    }
    return new Promise((resolve, reject)=>{
        navigator.geolocation.getCurrentPosition((data)=>{
            const {latitude, longitude} = data.coords
            console.log("Long : " , longitude)
            console.log("lat : " , latitude)
            console.log("accuracy : " ,data.coords.accuracy)
            const response = checkRange(data.coords)
            if(response){
                const msg = {
                    message : "You are in Range and Clocked In",
                    result : true
                }
                resolve(msg)
            }
            else{
                const msg = {
                    message : "Not in Range, please try again",
                    result : false
                }
                reject(msg)
            }
        },
            (err)=>{
                console.log(err)
            },
            {
                maximumAge : 0,
                enableHighAccuracy : true,
                timeout : 500
            }
        )
    })
}

export default ClockIn;
