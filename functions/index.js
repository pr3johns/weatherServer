var express = require("express");
var app = express();
const https = require("https");
const functions = require('firebase-functions');
var forecast = {};

function handleForecastResponse() {
    /* below regex finds ".TONIGHT...Wind W 10 to" */
    const dailyForecastRegex = /^\.([^\.]*)\.\.\.(.*?\.)\s+\n/gsm;

    /* finds the timestamp of the forecast */
    const forecastTimestampRegex = /[0-9]* [AP]M.*/;
    let match;

    if((match=forecastTimestampRegex.exec(fullForecast)) !== null) {
        forecast.timeStamp = match[0];
        console.log("Refreshed marine forecast, updated by NOAA at: " + forecast.timeStamp);
    } else {
        console.error("Marine forecast format must have changed, can't get timestamp.");
    }

    forecast.periods = [];

    for(let period=1; (match=dailyForecastRegex.exec(fullForecast)) !== null; period++) {
        forecast.periods.push({name: match[1], period: period, marineSummary: match[2]});
    }
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
        res.json(forecast);
    })
});

exports.app = functions.https.onRequest(app);