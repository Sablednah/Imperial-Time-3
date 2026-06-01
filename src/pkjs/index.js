// PebbleKit JS — runs on the phone.
// Fetches weather (hourly) and WH40K quotes (every 10 min), sends to watch via AppMessage.
// Uses XMLHttpRequest — fetch() is not available in the PebbleKit JS runtime.

var KEY_WEATHER = 0;
var KEY_QUOTE   = 1;

// ── XHR helper ────────────────────────────────────────────────────────────────

function xhrGet(url, responseType, onSuccess, onError) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.responseType = responseType;
    xhr.onload = function() {
        if (xhr.status === 200) {
            onSuccess(xhr.response);
        } else {
            onError('HTTP ' + xhr.status);
        }
    };
    xhr.onerror = function() { onError('XHR network error'); };
    xhr.send();
}

// ── Weather ───────────────────────────────────────────────────────────────────

function getWeatherDescription(code) {
    if (code === 0)  return 'Clear';
    if (code <= 3)   return 'Cloudy';
    if (code <= 48)  return 'Fog';
    if (code <= 55)  return 'Drizzle';
    if (code <= 57)  return 'Fz.Drizzle';
    if (code <= 65)  return 'Rain';
    if (code <= 67)  return 'Fz.Rain';
    if (code <= 75)  return 'Snow';
    if (code <= 77)  return 'Snow Grns';
    if (code <= 82)  return 'Showers';
    if (code <= 86)  return 'Snow Shwrs';
    if (code <= 99)  return 'T-Storm';
    return 'Unknown';
}

function fetchWeather(lat, lon) {
    var url = 'https://api.open-meteo.com/v1/forecast' +
        '?latitude=' + lat +
        '&longitude=' + lon +
        '&current=temperature_2m,weather_code';

    xhrGet(url, 'json', function(data) {
        var temp = Math.round(data.current.temperature_2m);
        var desc = getWeatherDescription(data.current.weather_code);
        var msg  = {};
        msg[KEY_WEATHER] = temp + '°C ' + desc;
        Pebble.sendAppMessage(msg,
            function()  { console.log('Weather sent'); },
            function(e) { console.log('Weather send failed: ' + JSON.stringify(e)); }
        );
    }, function(err) {
        console.log('Weather fetch error: ' + err);
    });
}

function requestWeather() {
    navigator.geolocation.getCurrentPosition(
        function(pos) {
            fetchWeather(pos.coords.latitude, pos.coords.longitude);
        },
        function(err) {
            console.log('Geolocation error: ' + err.message);
        },
        { timeout: 15000, maximumAge: 300000 }
    );
}

// ── Quote ─────────────────────────────────────────────────────────────────────

function fetchQuote() {
    xhrGet('http://sabletopia.co.uk/ids2/quote.php', 'text', function(text) {
        var quote = '++ THOUGHT FOR THE DAY ++|' + text.trim();
        var msg   = {};
        msg[KEY_QUOTE] = quote;
        Pebble.sendAppMessage(msg,
            function()  { console.log('Quote sent'); },
            function(e) { console.log('Quote send failed: ' + JSON.stringify(e)); }
        );
    }, function(err) {
        console.log('Quote fetch error: ' + err);
    });
}

// ── Startup ───────────────────────────────────────────────────────────────────

Pebble.addEventListener('ready', function() {
    console.log('PebbleKit JS ready');
    requestWeather();
    fetchQuote();
    setInterval(requestWeather, 60 * 60 * 1000);   // refresh weather hourly
    setInterval(fetchQuote,     10 * 60 * 1000);    // refresh quote every 10 min
});

Pebble.addEventListener('appmessage', function(e) {
    console.log('Message from watch: ' + JSON.stringify(e.payload));
});
