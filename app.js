// Init moment
moment().format()
moment.locale('sv');
//let now = moment();
//let today = now.format('YYYY-MM-DD');

// Default settings (with my secret, whoops!)
const defaultSettings = {
  "deviceId": Math.random().toString(36).substr(2, 9),
  "stopName": "Centralstationen, Göteborg",
  "updateInterval": 30,
  "timeZone": "Europe/Stockholm"
}

let competitions;
let classes;

getCompetitionsw = () => {
  console.log("getCompetitions");
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "https://liveresultat.orientering.se/api.php?method=getcompetitions");
  //xhr.setRequestHeader("Authorization", "Bearer " + localStorage.getItem("accessToken"));
  xhr.send(null);

  xhr.addEventListener("loadend", function() {
    var json = JSON.parse(xhr.response);
    if (xhr.status === 401) {
      //getAccessToken(getStops);
    } else if (xhr.status === 200 && json.competitions) {
      //generateDataList(json.LocationList.StopLocation);
      competitions = json.competitions;
      //console.log(competitions)
      console.log(competitions[0])
      let local = competitions.filter( (c,i,ary) => {
        //console.log(today)
        let d = moment().diff(c.date, 'days')
        return d >= 0 && d <= 7 && c.timediff == 0
        //return c.timediff == 0
      });
      //console.log(local)
      generateCompetitionsList(local)
    } else {
      console.log("No response!")
    }
  });
};

generateCompetitionsList = (data) => {
  let html = ""

  data.forEach(data => {
    //console.log(comp)
    html += "<li class='list-group-item'><span class='date'>" + data.date + "</span> <a href=#" + data.id + " class='name'>" + data.name + "</a> (<span class=''>" + data.organizer + "</span>)</li>"
  });

  document.getElementById("competitions").innerHTML = html;
  //<li class="list-group-item">Cras justo odio</li>


/*  <ul class="list-group">
  <li class="list-group-item">Cras justo odio</li>
  <li class="list-group-item">Dapibus ac facilisis in</li>
  <li class="list-group-item">Morbi leo risus</li>
  <li class="list-group-item">Porta ac consectetur ac</li>
  <li class="list-group-item">Vestibulum at eros</li>
</ul>*/
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

  getCompetitionsw()

  // go!
  //if (settings = loadSettings(defaultSettings)) getAccessToken(getDepartures(null));
  //if (!settings.skipWelcome) showElement(document.getElementById("welcome"));
});