var express = require("express");
var app = express();
const https = require("https");
const functions = require('firebase-functions');
var forecast = {};
const marineForecastRefreshInterval = 2 * 60 * 60 * 1000; //refresh every two hours

function handleMarineForecastResponse(fullForecast) {
    /* below regex finds strings like ".TONIGHT...Wind W 10 to" */
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
    console.log("Forecast covers from "+forecast.periods[0].name+" through "+forecast.periods[forecast.periods.length-1].name);
}

function refreshMarineForecast() {
    let fullForecast="";

    const options = { 
        hostname: 'tgftp.nws.noaa.gov',
        method: 'GET',
        path: '/data/forecasts/marine/coastal/pz/pzz750.txt',
        port: 443
    }
    
    const req = https.request(options, res => {
        res.on('data', chunk=>{
            fullForecast+=chunk;
        });
        res.on('end', ()=>handleMarineForecastResponse(fullForecast));
    })
    
    req.on('error', error=>console.error(error));
    req.end();
}

app.listen(3000, () => {
    console.log("Starting server...");

    refreshMarineForecast();
    setInterval(refreshMarineForecast, marineForecastRefreshInterval);

    app.get("/SanDiego", (req, res, next)=>{
        console.log("New request received");
        res.json(forecast);
    })
});

exports.app = functions.https.onRequest(app);