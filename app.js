// Init moment
moment().format()
// console.log(moment.locale())
// moment.locale("x-pseudo");
// console.log(moment.locale())
// moment.updateLocale();
// console.log(moment.locale())
//let now = moment();
//let today = now.format('YYYY-MM-DD');


// Default settings (with my secret, whoops!)
const defaultSettings = {
  //"deviceId": Math.random().toString(36).substr(2, 9),
  "competitionDayLimit": 7, 
  "favoriteOrganizors": ["Sjövalla FK"] //,
  //"updateInterval": 30,
  //"timeZone": "Europe/Stockholm"
}

let competitions;
let classes;

getCompetitions = () => {
  console.log("getCompetitions");



  var xhr = new XMLHttpRequest();
  xhr.open("GET", "https://liveresultat.orientering.se/api.php?method=getcompetitions");
  xhr.send(null);

  xhr.addEventListener("loadend", function() {
    var json = JSON.parse(xhr.response);
    if (xhr.status === 401) {
      console.log("Can't access competitions")
    } else if (xhr.status === 200 && json.competitions) {
      competitions = json.competitions;
      console.log(competitions[0])

      // Get settings
      let settings = loadSettings(defaultSettings)
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

      generateCompetitionsList(filtered)
    } else {
      console.log("No response!")
    }
  });
};

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
  console.log("get classes")
}

filterClasses = (id) => {
  console.log("filter classes - " + id) 
}

loadSettings = (defaultSettings) => {
  console.log("loadSettings");
  var settings = localStorage.getItem("settings") ? JSON.parse(localStorage.getItem("settings")) : defaultSettings;

  localStorage.setItem("settings", JSON.stringify(settings));
  return settings;
}

saveSettings = (defaultSettings) => {
  console.log("load settings")
}


/* EVENT LISTENERS */
$( document ).ready(function() {
  console.log( "ready!" );
  // Classes dropdown
  //$('.dropdown-toggle').dropdown()

  // Get recent competitions
  getCompetitions()
});
document.addEventListener("DOMContentLoaded", function() {



  // save
//  document.getElementById("settings-form").addEventListener("submit", function(e){
//    e.preventDefault();
//    saveSettings(defaultSettings);
//    if (settings = loadSettings()) {
//      showElement(document.getElementById("table"));
//      getDepartures(null);
//    }
//  });

  //getCompetitions()

  // go!
  //if (settings = loadSettings(defaultSettings)) getAccessToken(getDepartures(null));
  //if (!settings.skipWelcome) showElement(document.getElementById("welcome"));
});