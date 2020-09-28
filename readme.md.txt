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

    # Visit 
    localhost:8080

