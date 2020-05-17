var express = require("express");
var app = express();
const https = require("https");
const functions = require('firebase-functions');

const marineForecastRefreshInterval = 2 * 60 * 60 * 1000; //refresh every two hours

function handleMarineForecastResponse(fullForecast) {
    var forecast = {response: "OK"};
    /* below regex finds strings like ".TONIGHT...Wind W 10 to" */
    const dailyForecastRegex = /^\.([^\.]*)\.\.\.(.*?\.)\s+\n/gsm;

    /* finds the timestamp of the forecast */
    const forecastTimestampRegex = /[0-9]* [AP]M.*/;
    let match;

    if((match=forecastTimestampRegex.exec(fullForecast)) !== null) {
        forecast.timeStamp = match[0];
        console.log("Refreshed marine forecast, updated by NOAA at: " + forecast.timeStamp);
        forecast.periods = [];

        for(let period=1; (match=dailyForecastRegex.exec(fullForecast)) !== null; period++) {
            forecast.periods.push({name: match[1], period: period, marineSummary: match[2]});
        }
        if(forecast.periods.length>0) {
            console.log("Forecast covers from "+forecast.periods[0].name+" through "+forecast.periods[forecast.periods.length-1].name);
        }
        else{
            console.log("Marine forecast parsing error, can't find daily summary strings.");
            forecast = {response: "Marine forecast parsing error, can't find daily summary strings."};
        }
    
    } else {
        console.error("Marine forecast format must have changed, can't get timestamp.");
        forecast = {response: "Marine forecast parsing failure."};
    }

    return forecast;
}

function refreshMarineForecast(onCompletion) {
    let fullForecast="";

    const options = { 
        hostname: 'tgftp.nws.noaa.gov',
        method: 'GET',
        path: '/data/forecasts/marine/coastal/pz/pzz750.txt',
        port: 443
    }
    
    const req = https.request(options, res => {
        res.on('data', chunk=>fullForecast+=chunk);
        res.on('end', ()=> {
                onCompletion(handleMarineForecastResponse(fullForecast));
            });
    }); 
    
    req.on('error', error=>{
        console.error(error);
        onCompletion({response: "Marine forecast network request failure."});
    });
    req.end();
}

app.listen(3000, () => {
    console.log("Starting server...");

    app.get("/SanDiego", (req, res, next)=>{
        console.log("New request received");
        refreshMarineForecast(((lastestForecast)=>res.json(lastestForecast)));
    })
});

exports.app = functions.https.onRequest(app);