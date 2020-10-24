const SendNotification = require('./onesignalnotif');
const express = require('express');
const app = express()
const port = 3000;
const APP_ID = "930d0241-ea95-4276-bca9-abeff2c58260";
const INTERVAL_BETWEEN_NOTIF = 120;
var firebase = require("firebase");


firebase.initializeApp({
    apiKey: "AIzaSyBH8G0QwPsgf2qEOV4m8H9AEq8sbkBGYkQ",
    authDomain: "binimise-e206e.firebaseapp.com",
    databaseURL: "https://binimise-e206e.firebaseio.com",
    projectId: "binimise-e206e",
    storageBucket: "binimise-e206e.appspot.com",
    messagingSenderId: "535852554124",
    appId: "1:535852554124:web:ffaaae2d908fef3f7128a9",
    measurementId: "G-YYS15ZTB39"
  });

var dbRef = firebase.database().ref();

let getCurrentDate = () => {
    let date = new Date();
    let dd = date.getDate();
    let mm = date.getMonth();
    mm += 1;
    if(mm < 10) mm = "0" + mm;
    let yy = date.getFullYear();
    yy = yy - 2000;
    date = mm + "-" + dd + "-" + yy;
    return date;
}

let wardsRef = dbRef.child("areas");
wardsRef.once("value",function(data){
  let wards = data.val();
  for(let index = 0; index < wards.length; index++){
    addListenerForNotif(wards[index].id);
  }
});

function addListenerForNotif(areaCode) {
  let str = "areaCode/"+ areaCode +"/"+ getCurrentDate();
  let usersRef = dbRef.child(str);
  usersRef.on("value",function(d){
      let data = d.val();
      if(!data) return;
      let drivers = data.drivers;
      let users = data.users;
      for(var phoneNumber in drivers){
          var driverDetails = drivers[phoneNumber];
          if(driverDetails.status.status == "true" || driverDetails.status.status){
            sendNotificationToUser({ ...users, areaCode }, driverDetails.location.real_time);
          }
      }
  });
}

let sendNotificationToUser = async (users, latLong) => {
  let tokens = [];
  Object.values(users).map(user => {
    if(!user.userType || user.userType == "driver") return;
    if(!showNotifBasedOnTime(user.lastSentNotif)) return;
    let distance = distanceBetweenLatLong(user.latLong.lat, user.latLong.long, latLong.lat, latLong.long);
    if(distance < 0.3){
      tokens.push(user.token);
      updateUserLastSentNotif(user, new Date().getTime())
    }
  });
  sendOneSignalNotif(tokens);
}

let showNotifBasedOnTime = (lastSentNotif) => {
    return !((Date.now() - lastSentNotif)/60000 < INTERVAL_BETWEEN_NOTIF);
} 

let sendOneSignalNotif = tokens => {
  if(tokens.length > 0){
    var message = { 
      app_id: APP_ID,
      contents: {"en": "Hi there is a garbage truck nearby you"},
      include_player_ids: [ ...tokens ],
      android_sound: "notif",
      existing_android_channel_id: "alertNotif"
    };
    SendNotification(message);
  }
}

const distanceBetweenLatLong = (lat1, lon1, lat2, lon2)  => {
  var R = 6371; // km
  var dLat = toRad(lat2-lat1);
  var dLon = toRad(lon2-lon1);
  var lat1 = toRad(lat1);
  var lat2 = toRad(lat2);

  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
	Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c;
  return d;
}

// Converts numeric degrees to radians
function toRad(Value) 
{
	return Value * Math.PI / 180;
}


const updateUserLastSentNotif = (userInfo, lastSentNotif) => {
  let str = 'areaCode/' + userInfo.areaCode + "/" + getCurrentDate() + "/users/" + userInfo.phoneNumber;
  let usersRef = dbRef.child(str);
  usersRef.update({lastSentNotif}).then(() => {}).catch(() => {})
}

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})