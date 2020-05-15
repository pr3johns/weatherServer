var express = require("express");
var app = express();
const https = require("https");
const functions = require('firebase-functions');

function handleForecastResponse() {
    const regex = /^\.([^\.]*)\.\.\.(.*?\.)\s+\n/gsm;
    let resArray = Array.from(fullForecast.matchAll(regex));
    resArray.forEach((value,idx,arr)=>{
        console.log("Forecast for " + value[1]);
        console.log(value[2]);
    }
    );
}

var fullForecast="";
app.listen(3000, () => {
    console.log("Starting server...");

    const options = { 
        hostname: 'tgftp.nws.noaa.gov',
        method: 'GET',
        path: '/data/forecasts/marine/coastal/pz/pzz750.txt',
        port: 443
    }
    
    const req = https.request(options, res => {
        res.on('data', chunk=>{
            console.log('new chunk received...');
            fullForecast+=chunk;
        });
        res.on('end', ()=>handleForecastResponse());
    })
    
    req.on('error', error=>console.error(error));
    req.end();

    app.get("/SanDiego", (req, res, next)=>{
        console.log("New request received");
        res.json(["64F", "4ft"]);
    })
});

exports.app = functions.https.onRequest(app);