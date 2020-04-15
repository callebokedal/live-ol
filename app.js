// Init moment
moment().format()

const version = "1.0";

// Default settings 
const defaultSettings = {
  "version": version, 
  "competitionDayLimit": 7, 
  "competitionCacheTTL": 120, 
  "favoriteOrganizors": ["Sjövalla FK", "Lerums SOK"] 
}

let competitions;
let classes;

getCompetitions = () => {
  debug("getCompetitions");

  let settings = loadSettings(defaultSettings)
  let cachedCompetitions = getCompetitionsListCache(settings)

  if(Object.keys(cachedCompetitions).length > 0) {
    // Return cahced list
    console.log("Return cached competitions: " + JSON.stringify(cachedCompetitions))

    let filtered = filterCompetitions(cachedCompetitions, settings)
    debug("cache filtered: " + JSON.stringify(filtered))
    generateCompetitionsList(filtered)
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

        let filtered = filterCompetitions(competitions, settings)
        debug("xhr filtered: " + JSON.stringify(filtered))

        saveCompetitionsListCache(filtered)
        generateCompetitionsList(filtered)
      } else {
        console.log("No response!")
      }
    });
  }
};

filterCompetitions = (competitions, settings) => {
  //debug("before filter: " + competitions)
  // Get settings
  let filterDays = 7;
  if(Number.isInteger(settings.competitionDayLimit)) {
    filterDays = settings.competitionDayLimit
  }
  let favoriteOrganizors = []
  if($('#onlyOrganizerFavorites')[0].checked && Array.isArray(settings.favoriteOrganizors) && settings.favoriteOrganizors.length > 0) {
    favoriteOrganizors = settings.favoriteOrganizors
  }

  // Filter by day and organizors
  let filtered = competitions.filter( (c,i,ary) => {
    let d = moment().diff(c.date, 'days');
    let dayInScope = d >= 0 && d <= filterDays && c.timediff == 0;
    if($('#onlyOrganizerFavorites')[0].checked) {
      let organizerInScope = favoriteOrganizors.length == 0 || favoriteOrganizors.indexOf(c.organizer) >= 0
      return dayInScope && organizerInScope
    } else {
      return dayInScope
    }
  });
  return filtered;
}

debug = (str) => {
  console.log(str)
}

saveCompetitionsListCache = (data) => {
  let now = moment();
  debug("saveCompetitionsListCache: " + JSON.stringify(data))
  localStorage.setItem("cachedCompetitionsTimestamp", JSON.stringify(now));
  localStorage.setItem("cachedCompetitions", JSON.stringify(data));
}

removeCompetitionsListCache = () => {
  localStorage.removeItem("cachedCompetitionsTimestamp");
  localStorage.removeItem("cachedCompetitions"); 
}

getCompetitionsListCache = (settings) => {
  let cachedCompetitionsTimestamp = localStorage.getItem("cachedCompetitionsTimestamp") ? JSON.parse(localStorage.getItem("cachedCompetitionsTimestamp")) : moment()

  let secondsSinceLastFetch = moment().diff(cachedCompetitionsTimestamp,'seconds');
  //debug("secondsSinceLastFetch: " + secondsSinceLastFetch)

  let cachedCompetitions = {}
  //debug("settings.competitionCacheTTL: " + settings.competitionCacheTTL)
  if(secondsSinceLastFetch <= settings.competitionCacheTTL) {
    // Return cached list
    cachedCompetitions = localStorage.getItem("cachedCompetitions") ? JSON.parse(localStorage.getItem("cachedCompetitions")) : {};
  }
  return cachedCompetitions
}

generateFavoriteSVGMarkup = (isFavorite) => {
  let html = ''
  if(isFavorite) {
    html += '<svg class="bi bi-star-fill text-warning" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">'
    html += '<path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.283.95l-3.523 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>'
    html += '</svg>'
  } else {
    html += '<svg class="bi bi-star text-secondary" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">'
    html += '<path fill-rule="evenodd" d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.523-3.356c.329-.314.158-.888-.283-.95l-4.898-.696L8.465.792a.513.513 0 00-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767l-3.686 1.894.694-3.957a.565.565 0 00-.163-.505L1.71 6.745l4.052-.576a.525.525 0 00.393-.288l1.847-3.658 1.846 3.658a.525.525 0 00.393.288l4.052.575-2.906 2.77a.564.564 0 00-.163.506l.694 3.957-3.686-1.894a.503.503 0 00-.461 0z" clip-rule="evenodd"/>'
    html += '</svg>'
  }
  return html
}

generateCompetitionsList = (data) => {
  if(data.length > 0) {
    let html = ""
    let settings = loadSettings()

    data.forEach(data => {
      let d = moment().diff(data.date, 'days');
      let badgeClass = "badge badge-white bg-white"
      if(d === 0) {
        badgeClass = "badge badge-dark"
      }

      html += '<li class="list-group-item bg-light p-2">'
        html += '<div class="d-flex mb-1">'
          html += '<small class="' + badgeClass + ' mr-auto">' + data.date + '</small>'
          
          // Favorite
          html += '<small class="mr-2">' + data.organizer + '</small>'
          if(settings.favoriteOrganizors.indexOf(data.organizer) !== -1) {
            html += '<a href="#" class="d-inline-flex" onclick="quickRemoveFavoriteOrganizer(\'' + data.organizer + '\')">' 
            html += generateFavoriteSVGMarkup(true)
          } else {
            html += '<a href="#" class="d-inline-flex" onclick="quickAddFavoriteOrganizer(\'' + data.organizer + '\')">' 
            html += generateFavoriteSVGMarkup(false)
          } 
          html += '</a>'

        html += '</div>'
        html += '<h6 class="d-flex align-items-end flex-column mb-1 mt-1"><a href="#"' + data.id + ' class="name">' + data.name + '</a></h6>'
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

generateSettingsList = () => {

    let settings = loadSettings()
    debug("loaded settings" + JSON.stringify(settings))
    let html = '<ul class="list-group">'
    html += '<li class="list-group-item bg-light">'
    html += 'Visa ' + settings.competitionDayLimit + ' dagar gamla tävlingar'
    html += '</li>'

    html += '<li class="list-group-item bg-light">'
    html += '<strong>Favoritklubbar:</strong>'
    html += '</li>'

    if(settings.favoriteOrganizors.length == 0) {
        html += '<li class="list-group-item bg-light">'
        html += 'Inga valda (Välj på resultatsida).'
        html += '</li>'
    } else {
      settings.favoriteOrganizors.forEach((org,idx) => {
        html += '<li class="list-group-item bg-light d-flex">'
        html += '<span class="p-0 flex-grow-1 align-self-center">' + org + '</span><button type="button" class="btn btn-danger btn-sm" onclick="removeFavoriteOrganizer(\'' + org + '\')">Ta bort</button>'
        html += '</li>'
      }); 
    }

    html += '</ul>'
    html += '<small class="p-2">Version: ' + settings.version + '</small>'

    document.getElementById("settings").innerHTML = html;
}

quickAddFavoriteOrganizer = (organizerName) => {
  let settings = loadSettings()
  settings.favoriteOrganizors.push(organizerName)
  saveSettings(settings)
  getCompetitions()
}
quickRemoveFavoriteOrganizer = (organizerName) => {
  let settings = loadSettings()
  settings.favoriteOrganizors = settings.favoriteOrganizors.filter(name => name !== organizerName)
  if(settings.favoriteOrganizors.length == 0) {
    $('#onlyOrganizerFavorites')[0].checked = false
  }
  saveSettings(settings)
  getCompetitions()
}

removeFavoriteOrganizer = (organizerName) => {
  debug("removeFavoriteOrganizer: " + organizerName)
  let settings = loadSettings()
  debug("settings before: " + JSON.stringify(settings))
  settings.favoriteOrganizors = settings.favoriteOrganizors.filter(name => name !== organizerName)
  debug("settings after: " + JSON.stringify(settings))
  if(settings.favoriteOrganizors.length == 0) {
    $('#onlyOrganizerFavorites')[0].checked = false
  }
  saveSettings(settings)
}

//loadSettings = (defaultSettings) => {
loadSettings = () => {
  //debug("loadSettings - defaultSettings: " + JSON.stringify(defaultSettings));
  let settings = localStorage.getItem("settings") ? JSON.parse(localStorage.getItem("settings")) : defaultSettings;
  debug("load settings: " + JSON.stringify(settings))
  if(settings.version !== version) {
    debug("Version diff: " + settings.version + " is not: " + version)
  }
  return settings;
}

saveSettings = (settings) => {
  debug("save settings: " + JSON.stringify(settings))
  localStorage.setItem("settings", JSON.stringify(settings))
  generateSettingsList(settings)
}

// EVENT LISTENERS 
$( document ).ready(function() {
  debug( "ready!" );
  // Classes dropdown
  //$('.dropdown-toggle').dropdown()

  // Get recent competitions
  getCompetitions()

  $('#settingsBackdrop').on('show.bs.modal', function (e) {
    debug("Settings show")
    generateSettingsList()
  })
  $('#settingsBackdrop').on('hide.bs.modal', function (e) {
    debug("Settings dismissed")
    getCompetitions()
  })

  $('#onlyOrganizerFavorites').change(function (e) {
    debug("onlyOrganizerFavorites: " + $('#onlyOrganizerFavorites')[0].checked)
    if(!$('#onlyOrganizerFavorites')[0].checked) {
      removeCompetitionsListCache()
    }
    getCompetitions()
  })
});

