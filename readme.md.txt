# Live-OL

Detta är en mobilanpassad version av [liveresultat.orientering.se](https://liveresultat.orientering.se/).
Baserad på [github.com/petlof/liveresults](https://github.com/petlof/liveresults).

För att använda applikationen, besök [callebokedal.github.io/live-ol](https://callebokedal.github.io/live-ol).

## Ytterligare information/funktioner
- Välj favoritlag i listan för alla tävlingar
- Välj favoritlöpare i resultattabell

## Använda Docker för utveckling
    # Build image to use
    docker build -t simple-nginx .

    # Run container
    docker run --rm -d -p 8080:80 -it --mount type=bind,source="$(pwd)"/lib,target=/usr/share/nginx/html/lib,readonly --mount type=bind,source="$(pwd)"/favicon,target=/usr/share/nginx/html/favicon,readonly --mount type=bind,source="$(pwd)"/favicon.ico,target=/usr/share/nginx/html/favicon.ico,readonly --mount type=bind,source="$(pwd)"/app.js,target=/usr/share/nginx/html/app.js,readonly --mount type=bind,source="$(pwd)"/index.html,target=/usr/share/nginx/html/index.html,readonly simple-nginx

    docker run --rm -d -p 8080:80 -it --mount type=bind,source="$(pwd)",target=/usr/share/nginx/html,readonly simple-nginx

    # Visit 
    localhost:8080

# API

## https://liveresultat.orientering.se/api.php?method=getcompetitions?method=getcompetitions

{ "competitions": [
    {"id": 18585, "name": "Veteran-SM 2021 Lång", "organizer": "Köping-Kolsva OK", "date": "2021-08-29", "timediff": 0},
    {"id": 18651, "name": "Pomorze Sprint Cup  E 4 World Ranking Event 2021", "organizer": "UMKS KWIDZYN POLSKA", "date": "2021-08-29", "timediff": 0},
    {"id": 18831, "name": "SFK Påsk-Cup E4", "organizer": "Sjövalla FK", "date": "2021-04-05", "timediff": 0}
    ...
]}

## https://liveresultat.orientering.se/api.php?method=getlastpassings&comp=18828&last_hash=[<hash_id>]

status	"NOT MODIFIED"

eller

´´´javascript
{ "status": "OK", "passings" : [
    {"passtime": "13:57:02",
        "runnerName": " Ramon Zamborain, eduardo / BERICAT GARCÍA, DAVID",
        "class": "ABSOLUTA",
        "control": 1000,
        "controlName" : "",
        "time": "diskv." },
    {"passtime": "13:57:02",
        "runnerName": "Pili Sánchez Aranda",
        "class": "F-SENIOR B",
        "control": 1000,
        "controlName" : "",
        "time": "felst." },
    {"passtime": "13:57:02",
        "runnerName": "Samuel Gracia Sánchez",
        "class": "M-JUNIOR",
        "control": 1000,
        "controlName" : "",
        "time": "143:44" }], "hash": "38c0e2ef2341b8404afbdcf1c3c43e64"
}
´´´

## https://liveresultat.orientering.se/api.php?method=getclasses&comp=18828&last_hash=[<hash_id>]

