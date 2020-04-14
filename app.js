// Init moment
moment().format()
// console.log(moment.locale())
// moment.locale("x-pseudo");
// console.log(moment.locale())
// moment.updateLocale();
// console.log(moment.locale())
//let now = moment();
//let today = now.format('YYYY-MM-DD');

const version = "1.0";

// Default settings 
const defaultSettings = {
  "version": version, 
  "competitionDayLimit": 7, 
  "competitionCacheTTL": 120, 
  "favoriteOrganizors": ["Sjövalla FK"] 
}

let competitions;
let classes;

getCompetitions = () => {
  debug("getCompetitions");

  let settings = loadSettings(defaultSettings)

  let cachedCompetitions = getCompetitionsListCache(settings)
  if(Object.keys(cachedCompetitions).length > 0) {
    // Return cahced list
    console.log("Return cached competitions")
    generateCompetitionsList(cachedCompetitions)
  } else {
    // Fetch new data

    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://liveresultat.orientering.se/api.php?method=getcompetitions");
    xhr.send(null);

    xhr.addEventListener("loadend", function() {
      var json = JSON.parse(xhr.response);
      if (xhr.status === 401) {
        console.log("Can't access competitions")
      } else if (xhr.status === 200 && json.competitions) {
        competitions = json.competitions;
        //debug(competitions[0])

        // Get settings
        let filterDays = 7;
        if(Number.isInteger(settings.competitionDayLimit)) {
          filterDays = settings.competitionDayLimit
        }
        let favoriteOrganizors = []
        if(Array.isArray(settings.favoriteOrganizors) && settings.favoriteOrganizors.length > 0) {
          favoriteOrganizors = settings.favoriteOrganizors
        }

        // Filter by day and organizors
        let filtered = competitions.filter( (c,i,ary) => {
          let d = moment().diff(c.date, 'days');
          let dayInScope = d >= 0 && d <= filterDays && c.timediff == 0;
          let organizerInScope = favoriteOrganizors.length == 0 || favoriteOrganizors.indexOf(c.organizer) >= 0
          return dayInScope && organizerInScope
        });

        debug(filtered)

        saveCompetitionsListCache(filtered)
        generateCompetitionsList(filtered)
      } else {
        console.log("No response!")
      }
    });
  }
};

debug = (str) => {
  console.log(str)
}

saveCompetitionsListCache = (data) => {
  let now = moment();
  debug("saveCompetitionsListCache ")
  localStorage.setItem("cachedCompetitionsTimestamp", JSON.stringify(now));
  localStorage.setItem("cachedCompetitions", JSON.stringify(data));
}

getCompetitionsListCache = (settings) => {
  let cachedCompetitionsTimestamp = localStorage.getItem("cachedCompetitionsTimestamp") ? JSON.parse(localStorage.getItem("cachedCompetitionsTimestamp")) : moment()

  let secondsSinceLastFetch = moment().diff(cachedCompetitionsTimestamp,'seconds');
  debug("secondsSinceLastFetch: " + secondsSinceLastFetch)

  let cachedCompetitions = {}
  debug("settings.competitionCacheTTL: " + settings.competitionCacheTTL)
  if(secondsSinceLastFetch <= settings.competitionCacheTTL) {
    // Return cached list
    cachedCompetitions = localStorage.getItem("cachedCompetitions") ? JSON.parse(localStorage.getItem("cachedCompetitions")) : {};
    
  }
  return cachedCompetitions
}

generateCompetitionsList = (data) => {
  if(data.length > 0) {
    let html = ""

    data.forEach(data => {
      let d = moment().diff(data.date, 'days');
      let badgeClass = "badge badge-white bg-white"
      if(d === 0) {
        badgeClass = "badge badge-dark"
      }

      html += '<li class="list-group-item bg-light">'
        html += '<div class="d-flex justify-content-between">'
          html += '<small class="' + badgeClass + '">' + data.date + '</small>'
          html += '<small class="">' + data.organizer + '</small>'  
        html += '</div>'
        html += '<h6 class="d-flex align-items-end flex-column mb-1 mt-1"><a href="#"' + data.id + ' class="name">' + data.name + '</a></h5>'
      html += '</li>'

    });

    document.getElementById("competitions").innerHTML = html;
  } else {
    document.getElementById("competitions").innerHTML = "<li class='list-group-item'>Inga tävlingar att visa</li>"  ;
  }
}

getClasses = () => {
  debug("get classes")
}

filterClasses = (id) => {
  debug("filter classes - " + id) 
}

loadSettings = (defaultSettings) => {
  console.log("loadSettings");
  let settings = localStorage.getItem("settings") ? JSON.parse(localStorage.getItem("settings")) : defaultSettings;
  if(settings.version !== version) {
    debug("Version diff: " + settings.version + " is not: " + version)
  }
  //localStorage.setItem("settings", JSON.stringify(settings));

  //let cachedCompetitions = localStorage.getItem("cachedCompetitions") ? JSON.parse(localStorage.getItem("cachedCompetitions")) : {};
  //localStorage.setItem("cachedCompetitions", JSON.stringify(cachedCompetitions));

  return settings;
}

saveSettings = (defaultSettings) => {
  debug("load settings")
}

// EVENT LISTENERS 
$( document ).ready(function() {
  debug( "ready!" );
  // Classes dropdown
  //$('.dropdown-toggle').dropdown()

  // Get recent competitions
  getCompetitions()
});