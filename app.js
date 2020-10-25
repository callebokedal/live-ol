'use strict';

// Init moment
moment().format()
moment.locale('sv');

const version = "1.4.7";

const dp = DOMPurify;
var dp_config = {
  USE_PROFILES: {html: true},
  //RETURN_DOM_FRAGMENT: true, 
  //RETURN_DOM: false,
  //ALLOWED_TAGS: ['table','tr','td','div','span','small','p'],
  //KEEP_CONTENT: false,
  ADD_TAGS: ['script', 'tr'],
  ADD_ATTR: ['onclick','class']
};
let safe = DOMPurify.sanitize

//const ScreenState = Object.freeze({"competitionsAll":1, "competitieonsFiltered":2, "classResultsAll":3, "classResultsFiltered":4, "clubResultsAll":5, "clubResultsFiltered":6})

// Default settings 
const defaultSettings = {
  "version": version, 
  "competitionDayLimit": 31, 
  "competitionCacheTTL": 120, 
  "onlyClubFavorites": false,
  "onlyPersonFavorites": false,
  "favoriteOrganizors": ["Sjövalla FK"],
  "filterOrganizors": [],
  "bookmarks": [],
  "lastPassingTimer": false,
  "resultTimer": false,
  "currentCompetition": ""
}

const hashCache = new Map();
let loadHash = (key) => {
  //debug("load: " + key)
  if(hashCache.has(key)) {
    //debug(hashCache.get(key))
    return hashCache.get(key)
  } else {
    return ""
  }
}
let saveHash = (key, value) => {
  //debug("key + value: " + key + "=" + value)
  hashCache.set(key, value)
}

// Results are cached - we need to store local copy
const resultCache = new Map();
let loadResult = (key) => {
  if(resultCache.has(key)) {
    return resultCache.get(key)
  } else {
    return {}
  }
}
let saveResult = (key, data) => {
  resultCache.set(key,data)
}

// api.php?method=getcompetitions
let getCompetitions = (scrollToY) => {
  debug("getCompetitions");
  startLastPassTimer();

  let settings = loadSettings(defaultSettings)
  let cachedCompetitions = getCompetitionsListCache(settings)

  if(Object.keys(cachedCompetitions).length > 0) {

    let filtered = filterCompetitions(cachedCompetitions, settings)
    //debug("cache filtered: " + JSON.stringify(filtered))
    generateCompetitionsList(filtered)
  } else {
    // Fetch new data

    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://liveresultat.orientering.se/api.php?method=getcompetitions");
    xhr.send(null);

    xhr.addEventListener("loadend", function() {
      var json = JSON.parse(xhr.response.replace(/\t/g, '')); // Work around: JSON.parse does not handle tab characters?
      if (xhr.status === 401) {
        console.log("Can't access competitions")
      } else if (xhr.status === 200 && json.competitions) {
        //debug("competitions: " + JSON.stringify(clean))
        let competitions = json.competitions;
        let filtered = filterCompetitions(competitions, settings)

        saveCompetitionsListCache(filtered)
        generateCompetitionsList(filtered)
      } else {
        console.log("No response!")
      }
    });
  }
  if(scrollToY) {
    // Scroll to Y
    window.scrollTo({
      top: scrollToY,
      left: 0
    });
  }
};

let filterCompetitions = (competitions, settings) => {
  //debug("before filter: " + competitions)
  // Get settings
  let filterDays = 31;
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
    let dayInScope = d >= 0 && d <= filterDays && c.timediff == 0; // timediff==0 "ensure local events, to some extent"
    if($('#onlyOrganizerFavorites')[0].checked) {
      let organizerInScope = favoriteOrganizors.length == 0 || favoriteOrganizors.indexOf(c.organizer) >= 0
      return dayInScope && organizerInScope
    } else {
      return dayInScope
    }
  });
  return filtered;
}

let debug = (str) => {
  console.log(str)
}

let saveCompetitionsListCache = (data) => {
  let now = moment();
  debug("saveCompetitionsListCache: " + JSON.stringify(data))
  localStorage.setItem("cachedCompetitionsTimestamp", JSON.stringify(now));
  localStorage.setItem("cachedCompetitions", JSON.stringify(data));
}

let removeCompetitionsListCache = () => {
  localStorage.removeItem("cachedCompetitionsTimestamp");
  localStorage.removeItem("cachedCompetitions"); 
}

let getCompetitionsListCache = (settings) => {
  let cachedCompetitionsTimestamp = localStorage.getItem("cachedCompetitionsTimestamp") ? JSON.parse(localStorage.getItem("cachedCompetitionsTimestamp")) : moment()

  let secondsSinceLastFetch = moment().diff(cachedCompetitionsTimestamp,'seconds');
  //debug("secondsSinceLastFetch: " + secondsSinceLastFetch)

  let cachedCompetitions = []
  //debug("settings.competitionCacheTTL: " + settings.competitionCacheTTL)
  if(secondsSinceLastFetch <= settings.competitionCacheTTL) {
    // Return cached list
    // cachedCompetitions = localStorage.getItem("cachedCompetitions") ? JSON.parse(localStorage.getItem("cachedCompetitions")) : {};
    cachedCompetitions = localStorage.getItem("cachedCompetitions") ? JSON.parse(localStorage.getItem("cachedCompetitions")) : [];
  }
  return cachedCompetitions
}

/*

    let _getCheckLists = (boardId) => {
      return new Promise((resolve, reject) => {

        //console.log("_getCheckLists: " + boardId)

        var xhr = new XMLHttpRequest();
        xhr.addEventListener("loadend", function() {
          if (xhr.status === 401) {
            console.log("Unauthorized")
            reject(xhr.status + " " + xhr.statusText + ": " + xhr.response);
          } else if (xhr.status === 200) {
            let json = JSON.parse(xhr.response);

            json.forEach((checklist, idx) => {
              boardData.checklists.push(checklist)
            });
            resolve();
          }
        });

        xhr.open("GET", "https://api.trello.com/1/boards/" + boardId + "/checklists?key=" + getAPIKey() + "&token=" + getToken());
        xhr.send(null); 
      });
    }
*/

let _getCompetitionList = (cid) => {
  return new Promise((resolve, reject) => {

    var xhr = new XMLHttpRequest();

    xhr.addEventListener("loadend", function () {
      var json = JSON.parse(xhr.response);
      if (xhr.status === 401) {
        reject("Can't access competitions");
      } else if (xhr.status === 200 && json.competitions) {
        //debug("competitions: " + JSON.stringify(json))
        let competitions = json.competitions;
        if (competitions.some(el => el.id == cid)) {
          let competition = competitions.find(el => el.id == cid);
          if (competition !== undefined) {
            //debug("resolve: " + competition.name)
            resolve(competition.name);
          } else {
            //debug("reject - no hit")
            reject("No hit!"); // Impossible case?
          }
        } else {
          //debug("reject - okänt namn")
          resolve("Okänt namn");
        }
      } else {
        //debug("reject - no response")
        reject("No response!");
      }
    });

    xhr.open("GET", "https://liveresultat.orientering.se/api.php?method=getcompetitions");
    xhr.send(null);
  });
}

// Since cid can be sent via URL, we need to ba able to get name (LiveResults API does not support this!?)
let getCompetitionNameById = (cid) => {

    let settings = loadSettings(defaultSettings)
    debug("getCompetitionNameById") // + JSON.stringify(settings));

    // Try 1

    //let settings = loadSettings(defaultSettings)
    //let competitions = []
    let cachedCompetitions = getCompetitionsListCache(settings) // [{"id":17609,"name":"KOL-MILA Sträcka 5","organizer":"Köping-Kolsva OK","date":"2020-07-22","timediff":0},{"id":176 ...

    //debug(cachedCompetitions)

    if(cachedCompetitions.some( el => el.id == cid)) {

      // Find by Id
      let competition = cachedCompetitions.find( el => el.id == cid ) // [{"id":17609,"name":"KOL-MILA Sträcka 5","organizer":"Köping-Kolsva OK","date":"2020-07-22","timediff":0},{"id":176 ...
      if(competition !== undefined) {
        return competition.name
      }
    } 

    // Try 2
    // Fetch new data

    Promise.all([
        _getCompetitionList(cid)
      ]).then((value) => {
        //debug("done: " + value)
        settings.competitonName = value

        document.getElementById("competitionName").innerHTML = safe(value)
        return value
      }).catch(function(msg) {
        //debug('Failed to load competition name - no match found');
        //debug(msg)

        document.getElementById("competitionName").innerHTML = safe("Okänt namn")
      })
};

let generateFavoriteSVG = (isFavorite) => {
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

let generateFilterSVG = (isFiltered) => {
  let html = ''
  if(isFiltered) {
    //html += '<svg class="bi bi-star-fill text-warning" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">'
    //html += '<path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.283.95l-3.523 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>'
    //html += '</svg>'
    html += '<svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-dash-circle-fill text-warning" fill="currentColor" xmlns="http://www.w3.org/2000/svg">'
    html += '<path fill-rule="evenodd" d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM4.5 7.5a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7z"/>'
    html += '</svg>'
  } else {
    html += '<svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-dash-circle-fill text-secondary" fill="currentColor" xmlns="http://www.w3.org/2000/svg">'
    html += '<path fill-rule="evenodd" d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM4.5 7.5a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7z"/>'
    html += '</svg>'
    //html += '<svg class="bi bi-star text-secondary" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">'
    //html += '<path fill-rule="evenodd" d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.523-3.356c.329-.314.158-.888-.283-.95l-4.898-.696L8.465.792a.513.513 0 00-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767l-3.686 1.894.694-3.957a.565.565 0 00-.163-.505L1.71 6.745l4.052-.576a.525.525 0 00.393-.288l1.847-3.658 1.846 3.658a.525.525 0 00.393.288l4.052.575-2.906 2.77a.564.564 0 00-.163.506l.694 3.957-3.686-1.894a.503.503 0 00-.461 0z" clip-rule="evenodd"/>'
    //html += '</svg>'
  }
  return html
}

// Stopwatch, Triangle, Watch, Diamond half
// 0 - OK --> "Check box"
// 1 - DNS (Did Not Start) --> didNotStartSVG 
// 2 - DNF (Did not finish) --> didNotFinishSVG
// 3 - MP (Missing Punch) --> missingPunchSVG
// 4 - DSQ (Disqualified) --> "Cone striped"
// 5 - OT (Over (max) time) --> overTimeSVG
// 9 - Not Started Yet --> "Alarm" Clock ?
// 10 - Not Started Yet --> 
// 11 - Walk Over (Resigned before the race started) --> 
// 12 - Moved up (The runner have been moved to a higher class) --> 
const didNotStartSVG = '<svg class="bi bi-dash-circle-fill text-white-50" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M16 8A8 8 0 110 8a8 8 0 0116 0zM4 7.5a.5.5 0 000 1h8a.5.5 0 000-1H4z" clip-rule="evenodd"/></svg>'
const didNotFinishSVG = '<svg class="bi bi-x-circle-fill text-white-50" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M16 8A8 8 0 110 8a8 8 0 0116 0zm-4.146-3.146a.5.5 0 00-.708-.708L8 7.293 4.854 4.146a.5.5 0 10-.708.708L7.293 8l-3.147 3.146a.5.5 0 00.708.708L8 8.707l3.146 3.147a.5.5 0 00.708-.708L8.707 8l3.147-3.146z" clip-rule="evenodd"/></svg>'
const missingPunchSVG = '<svg class="bi bi-exclamation-circle-fill text-white-50" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M16 8A8 8 0 110 8a8 8 0 0116 0zM8 4a.905.905 0 00-.9.995l.35 3.507a.552.552 0 001.1 0l.35-3.507A.905.905 0 008 4zm.002 6a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd"/></svg>'
const overTimeSVG = '<svg class="bi bi-clock-history text-danger" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8.515 1.019A7 7 0 008 1V0a8 8 0 01.589.022l-.074.997zm2.004.45a7.003 7.003 0 00-.985-.299l.219-.976c.383.086.76.2 1.126.342l-.36.933zm1.37.71a7.01 7.01 0 00-.439-.27l.493-.87a8.025 8.025 0 01.979.654l-.615.789a6.996 6.996 0 00-.418-.302zm1.834 1.79a6.99 6.99 0 00-.653-.796l.724-.69c.27.285.52.59.747.91l-.818.576zm.744 1.352a7.08 7.08 0 00-.214-.468l.893-.45a7.976 7.976 0 01.45 1.088l-.95.313a7.023 7.023 0 00-.179-.483zm.53 2.507a6.991 6.991 0 00-.1-1.025l.985-.17c.067.386.106.778.116 1.17l-1 .025zm-.131 1.538c.033-.17.06-.339.081-.51l.993.123a7.957 7.957 0 01-.23 1.155l-.964-.267c.046-.165.086-.332.12-.501zm-.952 2.379c.184-.29.346-.594.486-.908l.914.405c-.16.36-.345.706-.555 1.038l-.845-.535zm-.964 1.205c.122-.122.239-.248.35-.378l.758.653a8.073 8.073 0 01-.401.432l-.707-.707z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M8 1a7 7 0 104.95 11.95l.707.707A8.001 8.001 0 118 0v1z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M7.5 3a.5.5 0 01.5.5v5.21l3.248 1.856a.5.5 0 01-.496.868l-3.5-2A.5.5 0 017 9V3.5a.5.5 0 01.5-.5z" clip-rule="evenodd"/></svg>'
//const notStartedSVG = '<svg class="bi bi-clock" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8 15A7 7 0 108 1a7 7 0 000 14zm8-7A8 8 0 110 8a8 8 0 0116 0z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M7.5 3a.5.5 0 01.5.5v5.21l3.248 1.856a.5.5 0 01-.496.868l-3.5-2A.5.5 0 017 9V3.5a.5.5 0 01.5-.5z" clip-rule="evenodd"/></svg>'
const notStartedSVG = '<svg class="bi bi-clock-fill text-white-50" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M16 8A8 8 0 110 8a8 8 0 0116 0zM8 3.5a.5.5 0 00-1 0V9a.5.5 0 00.252.434l3.5 2a.5.5 0 00.496-.868L8 8.71V3.5z" clip-rule="evenodd"/></svg>'
const olSVG = '<svg class="bi bi-diamond-half" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M6.95.435c.58-.58 1.52-.58 2.1 0l6.515 6.516c.58.58.58 1.519 0 2.098L9.05 15.565c-.58.58-1.519.58-2.098 0L.435 9.05a1.482 1.482 0 010-2.098L6.95.435zM8 .989a.493.493 0 00-.35.145L1.134 7.65a.495.495 0 000 .7l6.516 6.516a.493.493 0 00.35.145V.989z" clip-rule="evenodd" transform="rotate(45 10 10)"/></svg>'


  //
  //
  //<path fill-rule="evenodd" d="M8 11a3 3 0 100-6 3 3 0 000 6zm0 1a4 4 0 100-8 4 4 0 000 8z" clip-rule="evenodd"/>\
  //<path d="M9.5 8a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>\
const finishedSVG = '<svg class="bi bi-bullseye" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">\
  <path fill-rule="evenodd" d="M8 13A5 5 0 108 3a5 5 0 000 10zm0 1A6 6 0 108 2a6 6 0 000 12z" clip-rule="evenodd"/>\
  <path fill-rule="evenodd" d="M8 11a3 3 0 100-6 3 3 0 000 6zm0 1a4 4 0 100-8 4 4 0 000 8z" clip-rule="evenodd"/>\
</svg>'
const logoSVG = '<svg class="bi bi-diamond-half" width="2em" height="2em" viewBox="0 0 16 16" fill="orange" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M6.95.435c.58-.58 1.52-.58 2.1 0l6.515 6.516c.58.58.58 1.519 0 2.098L9.05 15.565c-.58.58-1.519.58-2.098 0L.435 9.05a1.482 1.482 0 010-2.098L6.95.435zM8 .989a.493.493 0 00-.35.145L1.134 7.65a.495.495 0 000 .7l6.516 6.516a.493.493 0 00.35.145V.989z" clip-rule="evenodd" transform="rotate(45 10 10)"/></svg>'
 //transform="rotate(45 10 10) translate(0 0)"
const bookmarkSVG = '<svg class="bi bi-bookmark text-secondary" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8 12l5 3V3a2 2 0 00-2-2H5a2 2 0 00-2 2v12l5-3zm-4 1.234l4-2.4 4 2.4V3a1 1 0 00-1-1H5a1 1 0 00-1 1v10.234z" clip-rule="evenodd"/></svg>'
const bookmarkedSVG = '<svg class="bi bi-bookmark-fill text-warning" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M3 3a2 2 0 012-2h6a2 2 0 012 2v12l-5-3-5 3V3z" clip-rule="evenodd"/></svg>'
const timerOffSVG = '<svg class="bi bi-arrow-repeat" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M2.854 7.146a.5.5 0 00-.708 0l-2 2a.5.5 0 10.708.708L2.5 8.207l1.646 1.647a.5.5 0 00.708-.708l-2-2zm13-1a.5.5 0 00-.708 0L13.5 7.793l-1.646-1.647a.5.5 0 00-.708.708l2 2a.5.5 0 00.708 0l2-2a.5.5 0 000-.708z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M8 3a4.995 4.995 0 00-4.192 2.273.5.5 0 01-.837-.546A6 6 0 0114 8a.5.5 0 01-1.001 0 5 5 0 00-5-5zM2.5 7.5A.5.5 0 013 8a5 5 0 009.192 2.727.5.5 0 11.837.546A6 6 0 012 8a.5.5 0 01.501-.5z" clip-rule="evenodd"/></svg>'
const timerOnSVG = '<svg class="bi bi-arrow-repeat text-primary" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M2.854 7.146a.5.5 0 00-.708 0l-2 2a.5.5 0 10.708.708L2.5 8.207l1.646 1.647a.5.5 0 00.708-.708l-2-2zm13-1a.5.5 0 00-.708 0L13.5 7.793l-1.646-1.647a.5.5 0 00-.708.708l2 2a.5.5 0 00.708 0l2-2a.5.5 0 000-.708z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M8 3a4.995 4.995 0 00-4.192 2.273.5.5 0 01-.837-.546A6 6 0 0114 8a.5.5 0 01-1.001 0 5 5 0 00-5-5zM2.5 7.5A.5.5 0 013 8a5 5 0 009.192 2.727.5.5 0 11.837.546A6 6 0 012 8a.5.5 0 01.501-.5z" clip-rule="evenodd"/></svg>'

let generateResultTimeStatus = (status) => {
  if(status == "ej start") {
    return didNotStartSVG.replace("white-50","secondary") + '<small class="pl-1">Ej start</small>'
  } else if(status == "utgått") {
    return didNotFinishSVG.replace("white-50","secondary") + '<small class="pl-1">Utgått</small>'
  } else if(status == "felst.") {
    return missingPunchSVG.replace("white-50","secondary") + '<small class="pl-1">Felstämplat</small>'
  } else {
    //return olSVG + '<small class="pl-1">' + status + '</small>'
    return finishedSVG.replace("white-50","secondary") + '<small class="pl-1">' + status + '</small>'
  }
}

// Display comptetions
let generateCompetitionsList = (data) => {
  if(data.length > 0) {
    let html = ""
    let settings = loadSettings()

    data.forEach(data => {
      let d = moment().diff(data.date, 'days');
      let badgeClass = "badge badge-white bg-white"
      if(d === 0) {
        badgeClass = "badge badge-dark"
      }

      html += '<table><tr>'
        html += '<td scope="row">'
        html += '<div class="mb-1 d-flex">'
          html += '<small class="align-middle">' + safe(data.organizer) + '</small>'
          if(settings.favoriteOrganizors.indexOf(data.organizer) !== -1) {
            html += '<a href="#" class="flex-grow-1 mr-1 ml-1 small" onclick="quickRemoveFavoriteOrganizer(\'' + safe(data.organizer) + '\');return false;">' 
            html += generateFavoriteSVG(true)
          } else {
            html += '<a href="#" class="flex-grow-1 mr-1 ml-1 small" onclick="quickAddFavoriteOrganizer(\'' + safe(data.organizer) + '\');return false;">' 
            html += generateFavoriteSVG(false)
          }
          html += '</a>'
          /*
          if(settings.filterOrganizors.indexOf(data.organizer) !== -1) {
            html += '<a href="#" class="flex-grow-1 mr-1 ml-1 small" onclick="quickRemoveFilterOrganizer(\'' + safe(data.organizer) + '\');return false;">' 
            html += generateFilterSVG(true)
          } else {
            html += '<a href="#" class="flex-grow-1 mr-1 ml-1 small" onclick="quickAddFilterOrganizer(\'' + safe(data.organizer) + '\');return false;">' 
            html += generateFilterSVG(false)
          }
          html += '</a>'*/
          html += '<small>' + safe(data.date) + ' ' +  moment(safe(data.date)).fromNow() + '</small>'
        html += '</div>'
        html += '<h6 class="d-flex align-items-end flex-column mb-1 mt-1 mr-1"><a href="#cid=' + safe(data.id) + '" onclick="showCompetitionResults(' + safe(data.id) + ', \'' + safe(data.name) + '\')" class="text-warning">' + safe(data.name) + '</a></h6>'
        html += '</td>'
      html += '</tr></table>'
    });
    document.getElementById("competitions").innerHTML = html;
  } else {
    document.getElementById("competitions").innerHTML = "<li class='list-group-item'>Inga tävlingar att visa</li>"  ;
  }
}

// api.php?method=getclasses&comp=XXXX&last_hash=abcdefg
let getLastPassings = (competitionId) => {
  //debug("getLastPassings")
  let hashKey = "pass"+competitionId

  if(!Number.isInteger(competitionId)) {
    console.error("Illegal competitonsId: " + competitionId)
    return
  }

  startLastPassTimer(competitionId)

  // Fetch new data
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "https://liveresultat.orientering.se/api.php?method=getlastpassings&comp=" + competitionId + "&last_hash=" + loadHash(hashKey));
  xhr.send(null);

  xhr.addEventListener("loadend", function() {
    var json = JSON.parse(xhr.response);
    if (xhr.status === 401) {
      console.log("Can't last passings")
    } else if (xhr.status === 200) {
      if(json.status == "NOT MODIFIED") {
        json = loadResult(hashKey)
      } else {
        saveResult(hashKey, json)
      }

      let passings = json.passings;
      saveHash("pass"+competitionId, json.hash);

      //debug(passings)
      //debug(loadHash("pass"+competitionId))

      let html = ""

      if(passings.length == 0) {
        html = '<small>Inga resultat att visa</small>'
      } else {
        passings.forEach(data => {
          html += '<li class="list-group-item bg-light p-2 d-flex">'
            html += '<small class="mr-2">' + safe(data.passtime) + '</small>'
            html += '<small class="mr-2 font-weight-bold">' + safe(data.runnerName) + '</small>'
            html += '<small class="mr-auto">' + safe(generateResultTimeStatus(data.time)) + '</small>'
            //html += '<small class="mr-2">(<a href="#" onclick="getClassResult(' + competitionId + ',\'' + safe(data.class) + '\');return false">' + safe(data.class) + '</a>)</small>'
            html += '<button type="button" class="btn btn-dark btn-sm pl-1 pr-1 pt-0 pb-0 text-warning ml-auto" onclick="getClassResult(' + competitionId + ',\'' + safe(data.class) + '\');">' + safe(data.class) + '</button>'
            //html += '<small class="mr-2">(' + data.controlName + ', ' + data.control + ')</small>'
          html += '</li>'
        });
      }
      document.getElementById("passings").innerHTML = html;
      //debug("last passings updated")
    } else {
      console.log("No response!")
    }
  });
}

// api.php?method=getclasses&comp=XXXX&last_hash=abcdefg
let getClasses = (competitionId) => {
  debug("get classes: " + competitionId)
  let hashKey = "classes"+competitionId

  if(!Number.isInteger(competitionId)) {
    console.error("Illegal competitonsId: " + competitionId)
    return
  }

  // Fetch new data
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "https://liveresultat.orientering.se/api.php?method=getclasses&comp=" + competitionId + "&last_hash=" + loadHash(hashKey));
  xhr.send(null);

  xhr.addEventListener("loadend", function() {
    var json = JSON.parse(xhr.response);
    if (xhr.status === 401) {
      console.log("Can't last passings")
    } else if (xhr.status === 200) {
      if(json.status == "NOT MODIFIED") {
        json = loadResult(hashKey)
      } else {
        saveResult(hashKey, json)
      }
      let classes = json.classes;
      saveHash(hashKey, json.hash);

      let html = ""
      if(classes.length == 0) {
        html = '<small>Inga klasser att visa</small>'
      } else {

        // Sort
        classes.sort((a,b) => {
          return a.className.length - b.className.length || a.className - b.className;
        }).forEach((data, idx) => {
          html += '<button type="button" class="btn btn-dark text-warning mr-2 mb-2 mt-0 ml-0 pl-2 pr-2 pt-0 pb-0" onclick="getClassResult(' + safe(competitionId) + ',\'' + safe(data.className) + '\')">' + safe(data.className) + '</button>'
        }); 
      }

      document.getElementById("classes").innerHTML = html
    } else {
      debug("what?")
    }
  });
}

let activateClassButtons = (className) => {
  $("#classes button").each((idx,btn) => {
    if(btn.innerHTML === className) {
      $(btn).addClass("active")
      //$(btn).addClass("btn-warning")
      $(btn).addClass("btn-primary")
      $(btn).removeClass("btn-dark")
      $(btn).addClass("text-white")
      $(btn).removeClass("text-warning")
    } else {
      $(btn).removeClass("active")
      //$(btn).removeClass("btn-warning")
      $(btn).removeClass("btn-primary")
      $(btn).addClass("btn-dark")
      $(btn).removeClass("text-white")
      $(btn).addClass("text-warning")
    }
  });
}

let getStatusText = (code) => {
// 0 - OK
// 1 - DNS (Did Not Start)
// 2 - DNF (Did not finish)
// 3 - MP (Missing Punch)
// 4 - DSQ (Disqualified)
// 5 - OT (Over (max) time)
// 9 - Not Started Yet
// 10 - Not Started Yet
// 11 - Walk Over (Resigned before the race started)
// 12 - Moved up (The runner have been moved to a higher class)
  switch(code) {
    case 0:
      return "OK"
      break;
    case 1:
      return "Ej start"
      break;
    case 2:
      return "Avbrutit"
      break;
    case 3:
      return "Felstämplat"
      break;
    case 4:
      return "Diskad"
      break;
    case 5:
      return "Över maxtid"
      break;
    case 9:
      return "Ej startat ännu"
      break;
    case 10:
      return "Ej startat ännu"
      break;
    case 11:
      return "Återbud"
      break;
    case 12:
      return "Bytt klass"
      break;
    default:
      debug("Unknown status")
  }
}

// api.php?comp=10259&method=getclassresults&includetotal=true&unformattedTimes=true&class=Öppen-1
let getClassResult = (competitionId, className) => {
  className = decodeURIComponent(className)
  $("#resultLabel")[0].innerHTML = "Resultat - " + className
  debug("get classresult: " + competitionId + ", " + className)

  // Update URL/navigation
  debug("hash to set for class: " + "#cid=" + competitionId + "&class=" + encodeURIComponent(className))
  history.pushState({"view": VIEWS.OVERVIEW}, "", "#cid=" + competitionId + "&class=" + encodeURIComponent(className))
  // history.pushState({page: 1}, "title 1", "?page=1")

  let hashKey = "className"+competitionId+className
  activateClassButtons(className)

  // Temp fix
  getLastPassings(competitionId)

  // Fetch new data
  var xhr = new XMLHttpRequest();
  //xhr.open("GET", "https://liveresultat.orientering.se/api.php?method=getclassresults&includetotal=true&comp=" + competitionId + "&unformattedTimes=false&class=" + className + "&last_hash=" + loadHash(hashKey));
  xhr.open("GET", "https://liveresultat.orientering.se/api.php?method=getclassresults&comp=" + competitionId + "&unformattedTimes=false&class=" + className + "&last_hash=" + loadHash(hashKey));
  xhr.send(null);

  xhr.addEventListener("loadend", function() {
    var json = JSON.parse(xhr.response);
    if (xhr.status === 401) {
      console.log("Can't last passings")
    } else if (xhr.status === 200) {
      if(json.status == "NOT MODIFIED") {
        json = loadResult(hashKey)
      } else {
        saveResult(hashKey, json)
      }
      let classResult = json.results;
      let splitControls = json.splitcontrols;
      saveHash(hashKey, json.hash);

      //debug(classResult)

      let html = ""
      let dirtySettings = loadSettings()

      // Get radio/split controls
      debug("splitControls")
      console.dir(splitControls)
      let nrSplitControls = splitControls.length;
      console.log(nrSplitControls)

      // Render class results
      classResult.forEach((data, idx) => {

      // 0 - OK --> "Check box"
      // 1 - DNS (Did Not Start) --> didNotStartSVG 
      // 2 - DNF (Did not finish) --> didNotFinishSVG
      // 3 - MP (Missing Punch) --> missingPunchSVG
      // 4 - DSQ (Disqualified) --> "Cone striped"
      // 5 - OT (Over (max) time) --> overTimeSVG
      // 9 - Not Started Yet --> "Alarm" Clock ?
      // 10 - Not Started Yet --> 
      // 11 - Walk Over (Resigned before the race started) --> 
      // 12 - Moved up (The runner have been moved to a higher class) --> 

        // DT_RowClass: "new_result"

        // {"place":"3","name":"Leif Orienterare","club":"Sjövalla FK","result":"38:11","status":0,"timeplus":"+05:41","progress":100,"start":3716900}
        html += '<tr>'
          if(data.status === 9 || data.status === 10) {
            html += '<td class="text-center" scope="row">' + notStartedSVG + '</td>'
          } else if(data.status === 1) {
            html += '<td class="text-center" scope="row">' + didNotStartSVG + '</td>'
          } else if(data.status === 2) {
            html += '<td class="text-center" scope="row">' + didNotFinishSVG + '</td>'
          } else if(data.status === 3) {
            html += '<td class="text-center" scope="row">' + missingPunchSVG + '</td>'
          } else {
            html += '<td class="text-center" scope="row">' + safe(data.place) + '</td>'
          }
          if(isBookmarked(data.name, dirtySettings)) {
            //html += '<td class="text-center" scope="row">' + safe(data.place) + '</td>'
            html += '<td class="text-nowrap"><span class="font-weight-bold d-inline-block text-truncate" style="max-width:80%">' + safe(data.name) + '</span>'
              + '<a href="#" title="Avmarkera" class="align-top d-inline-block ml-2 mt-0 link" onclick="toggleBookmark(\'' + safe(data.name) + '\', this);return false;">' + safe(generateFavoriteSVG(true)) + '</a>'
          } else {
            html += '<td class="text-nowrap"><span class="font-weight-bold d-inline-block text-truncate" style="max-width:60%;">' + safe(data.name) + '</span>'
              + '<a href="#" title="Bokmärk" class="align-top d-inline-block ml-2 mt-0 link" onclick="toggleBookmark(\'' + safe(data.name) + '\', this);return false;">' + safe(generateFavoriteSVG(false)) + '</a>'
          }
          html += '<br><a href="#" title="Visa klubbresultat" class="small text-warning" onclick="getClubResult(\'' + competitionId + '\',\'' + safe(data.club) + '\');return false;">' + safe(data.club) + '</a></td>'
          html += '<td class="small text-center">' + moment(data.start * 10).subtract(1,'hour').format("HH:mm") + '</td>' // Summertime. What happens in wintertime??
          if((data.status === 9 || data.status === 10) && data.place == "" && data.start != "") {
            // Runner is out - calculate predicted time
            html += '<td class="small text-center" colspan="2">' + getStatusText(data.status) + '</td>'
          }
          else if(data.status !== 0) {
            html += '<td class="small text-center" colspan="2">' + getStatusText(data.status) + '</td>'
          } else {
            html += '<td class="small text-center">' + safe(data.result) + '</td>'
            if(data.DT_RowClass === "new_result") {
              html += '<td class="small text-center">' + safe(data.timeplus).replace("+00:00","") + '<br><span class="badge badge-light">Ny</span></td>' 
            } else {
              html += '<td class="small text-center">' + safe(data.timeplus).replace("+00:00","") + '</td>' 
            }
          }
        html += '</tr><!-- ' + safe(data.status) + ', ' + safe(data.progress) + ' -->'
      });

      document.getElementById("resultRows").innerHTML = html
    } else {
      //debug("what?" + xhr.status + ", " + json.status)
      debug(json)
    }
  });
}

// Predict time for runners out
let predictedTime = () => {
/*

        AjaxViewer.prototype.updatePredictedTimes = function () {
            if (this.currentTable != null && this.curClassName != null && this.serverTimeDiff && this.updateAutomatically) {
                try {
                    var data = this.currentTable.fnGetData();
                    var dt = new Date();
                    var currentTimeZoneOffset = -1 * new Date().getTimezoneOffset();
                    var eventZoneOffset = ((dt.dst() ? 2 : 1) + this.eventTimeZoneDiff) * 60;
                    var timeZoneDiff = eventZoneOffset - currentTimeZoneOffset;
                    var time = (dt.getSeconds() + (60 * dt.getMinutes()) + (60 * 60 * dt.getHours())) * 100
                        - (this.serverTimeDiff / 10) +
                        (timeZoneDiff * 6000);
                    for (var i = 0; i < data.length; i++) {
                        if ((data[i].status == 10 || data[i].status == 9) && data[i].place == "" && data[i].start != "") {
                            if (data[i].start < time) {
                                if (this.curClassSplits == null || this.curClassSplits.length == 0) {
                                    $("#" + this.resultsDiv + " tr:eq(" + (data[i].curDrawIndex + 1) + ") td:eq(4)").html("<i>(" + this.formatTime(time - data[i].start, 0, false) + ")</i>");
                                }
                                else {
                                    //find next split to reach
                                    var nextSplit = 0;
                                    for (var sp = this.curClassSplits.length - 1; sp >= 0; sp--) {
                                        if (data[i].splits[this.curClassSplits[sp].code] != "") {
                                            {
                                                nextSplit = sp + 1;
                                                break;
                                            }
                                        }
                                    }
                                    $("#" + this.resultsDiv + " tr:eq(" + (data[i].curDrawIndex + 1) + ") td:eq(" + (4 + nextSplit) + ")").html("<i>(" + this.formatTime(time - data[i].start, 0, false) + ")</i>");
                                }
                            }
                        }
                    }
                }
                catch (e) {
                }
            }
        };
*/
}

// api.php?comp=10259&method=getcclubresults&unformattedTimes=true&club=Klyftamo
let getClubResult = (competitionId, clubName) => {
  clubName = decodeURIComponent(clubName)

  $("#resultLabel")[0].innerHTML = "Resultat - " + safe(clubName)
  debug("get clubresult: " + competitionId + ", " + clubName)

  // Update URL
  debug("hash to set for club: " + "#cid=" + competitionId + "&class=" + encodeURIComponent(clubName))
  history.pushState({"view": VIEWS.OVERVIEW}, "", "#cid=" + competitionId + "&clubName=" + encodeURIComponent(clubName))

  let hashKey = "clubName"+competitionId+clubName
  activateClassButtons(clubName)

  // Fetch new data
  var xhr = new XMLHttpRequest();
  xhr.open("GET", "https://liveresultat.orientering.se/api.php?method=getclubresults&comp=" + competitionId + "&unformattedTimes=false&club=" + clubName + "&last_hash=" + loadHash(hashKey));
  xhr.send(null);

  xhr.addEventListener("loadend", function() {
    var json = JSON.parse(xhr.response);
    if (xhr.status === 401) {
      console.log("Can't last passings")
    } else if (xhr.status === 200) {
      if(json.status == "NOT MODIFIED") {
        json = loadResult(hashKey)
      } else {
        saveResult(hashKey, json)
      }
      saveHash(hashKey, json.hash);
      let clubResult = json.results.sort((a,b) => {
        let ap = a.place.replace("-",2000)
        let bp = b.place.replace("-",2000)
        return ap - bp;
      });

      //debug(clubResult)

      let html = ""
      let dirtySettings = loadSettings()
      //debug("dirty: " + JSON.stringify(dirtySettings))
      clubResult.forEach((data, idx) => {
        html += '<tr>'
          //html += '<td class="text-center" scope="row">' + safe(data.place) + '<br></td>'

          if(data.status === 9 || data.status === 10) {
            html += '<td class="text-center" scope="row">' + notStartedSVG + '</td>'
          } else if(data.status === 1) {
            html += '<td class="text-center" scope="row">' + didNotStartSVG + '</td>'
          } else if(data.status === 2) {
            html += '<td class="text-center" scope="row">' + didNotFinishSVG + '</td>'
          } else if(data.status === 3) {
            html += '<td class="text-center" scope="row">' + missingPunchSVG + '</td>'
          } else {
            html += '<td class="text-center" scope="row">' + safe(data.place) + '</td>'
          }

          if(isBookmarked(data.name, dirtySettings)) {
            html += '<td class="font-weight-bold">' + safe(data.name) + '<a href="#" title="Avmarkera" class="pl-1 link" onclick="toggleBookmark(\'' + safe(data.name) + '\', this);return false;">' + generateFavoriteSVG(true) + '</a><br>'
          } else {
            html += '<td class="font-weight-bold">' + safe(data.name) + '<a href="#" title="Bokmärk" class="pl-1 link" onclick="toggleBookmark(\'' + safe(data.name) + '\', this);return false;">' + generateFavoriteSVG(false) + '</a><br>'
          }
          //html += '<td class="">' + data.name + '<span class="pl-1 link" onclick="toggleBookmark(\'' + data.name + '\', this);return false;">' + bookmarkSVG + '</span><br>'
          html += '<a href="#" title="Visa klassresultat" class="small text-warning" onclick="getClassResult(' + competitionId + ', \'' + safe(data.class) + '\');return false;">' + safe(data.class) + '</a></td>'
          html += '<td class="small text-center"">' + moment(data.start * 10).subtract(1,'hour').format("HH:mm") + '</td>' // Summertime. What happens in wintertime??
          
          if(data.status !== 0) {
            html += '<td class="small text-center" colspan="2">' + getStatusText(data.status) + '</td>'
          } else {
            html += '<td class="small text-center">' + safe(data.result) + '</td>'
            html += '<td class="small text-center">' + safe(data.timeplus) + '</td>'
          }

          //html += '<td class="small text-center"">' + safe(data.result) + '</td>'
          //html += '<td class="small text-center"">' + safe(data.timeplus) + '</td>'
        html += '</tr><!-- ' + safe(data.status) + ', ' + safe(data.progress) + ' -->'
      });

      document.getElementById("resultRows").innerHTML = html
    }
  });

}

let resetDefaultSettings = () => {
  saveSettings(defaultSettings)
  generateSettingsList()
}

let generateSettingsList = () => {

    let settings = loadSettings()
    debug("loaded settings" + JSON.stringify(settings))
    let html = '<ul class="list-group">'
    html += '<li class="list-group-item bg-light">'
    html += 'Visa ' + safe(settings.competitionDayLimit) + ' dagar gamla tävlingar'
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
        html += '<span class="p-0 flex-grow-1 align-self-center">' + safe(org) + '</span><button type="button" class="btn btn-danger btn-sm" onclick="removeFavoriteOrganizer(\'' + safe(org) + '\')">Ta bort</button>'
        html += '</li>'
      }); 
    }

    html += '<li class="list-group-item bg-light">'
    html += '<button class="btn btn-danger" onclick="resetDefaultSettings();return false;">Återställ alla inställningar</button>'
    html += '</li>'

    html += '</ul>'
    html += '<small class="p-2">Version: ' + safe(settings.version) + '</small>'

    document.getElementById("settings").innerHTML = html;
}

let isBookmarked = (name, cachedSettings) => {
  let settings = cachedSettings || loadSettings()
  return settings && settings.bookmarks && settings.bookmarks.includes(name)
} 
let toggleBookmark = (name, el) => {
  let settings = loadSettings()
  if(isBookmarked(name, settings)) {
    settings.bookmarks = settings.bookmarks.filter(n => n !== name)
    saveSettings(settings)
    el.innerHTML = dp.sanitize(generateFavoriteSVG(false))
  } else {
    settings.bookmarks.push(name)
    saveSettings(settings)
    el.innerHTML = dp.sanitize(generateFavoriteSVG(true))
  }
}

let quickAddFavoriteOrganizer = (organizerName) => {
  let settings = loadSettings()
  settings.favoriteOrganizors.push(organizerName)
  saveSettings(settings)
  getCompetitions(window.scrollY)
}
let quickRemoveFavoriteOrganizer = (organizerName) => {
  let settings = loadSettings()
  settings.favoriteOrganizors = settings.favoriteOrganizors.filter(name => name !== organizerName)
  if(settings.favoriteOrganizors.length == 0) {
    $('#onlyOrganizerFavorites')[0].checked = false
  }
  saveSettings(settings)
  getCompetitions(window.scrollY)
}


// To be able to hide/filter some organizations
let quickAddFilterOrganizer = (organizerName) => {
  let settings = loadSettings()
  settings.filterOrganizors.push(organizerName)
  saveSettings(settings)
  getCompetitions(window.scrollY)
}
let quickRemoveFilterOrganizer = (organizerName) => {
  let settings = loadSettings()
  settings.filterOrganizors = settings.filterOrganizors.filter(name => name !== organizerName)
  /*if(settings.filterOrganizors.length == 0) {
    $('#onlyOrganizerFavorites')[0].checked = false
  }*/
  saveSettings(settings)
  getCompetitions(window.scrollY)
}

let removeFavoriteOrganizer = (organizerName) => {
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

let loadSettings = () => {
  //debug("loadSettings - defaultSettings: " + JSON.stringify(defaultSettings));
  let settings = localStorage.getItem("settings") ? JSON.parse(localStorage.getItem("settings")) : defaultSettings;
  //debug("load settings: " + JSON.stringify(settings))
  if(settings.version !== version) {
    debug("Version diff: " + settings.version + " is not: " + version)
  }
  // http://localhost:8000/#cid=17618&class=Mkt%20l%C3%A4tt%202%20km
  //        localhost:8000/#cid=17618&class=Mkt lätt 2 km455
  return settings;
}

let saveSettings = (settings) => {
  debug("save settings: " + JSON.stringify(settings))
  localStorage.setItem("settings", JSON.stringify(settings))
  generateSettingsList(settings)
}

let showCompetitionScreen = () => {
  $('#competitonsLabel').addClass('active')
  $('#resultsLabel').removeClass('active text-white')
  $('#resultsLabel').addClass('disabled')
  $('#competitionsContainer').removeClass('d-none')
  $('#resultsContainer').addClass('d-none')
  document.getElementById("resultRows").innerHTML = '<tr><td colspan="5">Välj klass</td></tr>'
  stopLastPassTimer()
  //generateCompetitionsList()
  debug("location.hash: " + location.hash)
  history.pushState({"view": VIEWS.OVERVIEW}, "")
  getCompetitions()
}
let showResultScreen = (name) => {
  $('#competitonsLabel').removeClass('active')
  $('#resultsLabel').addClass('active text-white')
  $('#competitionsContainer').addClass('d-none')
  $('#resultsContainer').removeClass('d-none')
  /*let settings = loadSettings()
  if(settings.onlyPersonFavorites) {
    $('#onlyPersonFavorites')[0].checked = true
  } else {
    $('#onlyPersonFavorites')[0].checked = false
  }*/
  document.getElementById("competitionName").innerHTML = safe(name)
  // startResultTimer() // TODO
}

let showCompetitionResults = (competitionId, competitionName) => {
  debug("hello: " + competitionId)

  // Save competition id
  settings.currentCompetition = competitionId
  history.pushState({"view": VIEWS.RESULT, "competitionId": competitionId}, "")

  //if(typeof competitionName === 'undefined') {
  //  competitionName = data.name
  //}

  showResultScreen(competitionName)
  getClasses(competitionId)
  getLastPassings(competitionId)
  //startLastPassTimer(competitionId)
}

const timerTTL = 15000 // 15 seconds according to API rules
let lastPassTimerStartTime
let lastPassTimer
let startLastPassTimer = (competitionId) => {
  //let timerElement = document.getElementById("lastPassingTimer");
  if(!settings.lastPassingTimer) {
    settings.lastPassingTimer = true;
    //timerElement.style='width: 0%;'
    lastPassTimerStartTime = Date.now();
    lastPassTimer = setInterval(tickLastPassTimer.bind(null,competitionId), 1000) // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind;
  }
}
let stopLastPassTimer = () => {
  //let timerElement = document.getElementById("lastPassingTimer");
  settings.lastPassingTimer = false;
  //timerElement.style='width: 0%;';
  lastPassTimerStartTime = Date.now();
  clearInterval(lastPassTimer);
}
let tickLastPassTimer = (competitionId) => {
  if(settings.lastPassingTimer) {
    let now = Date.now();
    //let timerElement = document.getElementById("lastPassingTimer");
    //timerElement.style='width: ' + Math.round(((now - lastPassTimerStartTime)/timerTTL)*100) + '%;';
    //document.getElementById("lastPassingsTitle").innerHTML = "(Uppdateras om " + Math.round((timerTTL - (now - lastPassTimerStartTime))/1000) + " s)";
    if(now - lastPassTimerStartTime > timerTTL) {
      //timerElement.style='width: 100%;';
      settings.lastPassingTimer = false;
      // Update and restart
      getLastPassings(competitionId);
      startLastPassTimer(competitionId);
    }
  }
}

let resultTimerStartTime
let resultTimer
let startResultTimer = () => {
  document.getElementById("resultTimerToggler").innerHTML = timerOnSVG;
  document.getElementById("resultTimer").style='width: 0%;';
  resultTimerStartTime = Date.now();
  resultTimer = setInterval(tickResultTimer, 500);
}
let stopResultTimer = () => {
  document.getElementById("resultTimerToggler").innerHTML = timerOffSVG;
  document.getElementById("resultTimer").style='width: 0%;';
  resultTimerStartTime = Date.now();
  clearInterval(resultTimer);
}
let tickResultTimer = () => {
  let now = Date.now();
  document.getElementById("resultTimer").style='width: ' + Math.round(((now - resultTimerStartTime)/timerTTL)*100) + '%;';
  //debug(Math.round(((now - resultTimerStartTime)/timerTTL)*100))
  //debug(now - resultTimerStartTime)
  if(now - resultTimerStartTime > timerTTL) {
    stopResultTimer();
  }
}
let togglerResultTimer = () => {
  //debug("togglerResultTimer")
  let settings = loadSettings();
  if(settings.resultTimer) {
    startResultTimer();
    settings.resultTimer = false;
  } else {
    stopResultTimer();
    settings.resultTimer = true;
  }
  saveSettings(settings);
}

// Utility function to get id for key in hash
// Ex: getHashIdValue("cid") for ...#cid=123&foo=abc -> 123
let getHashIdValue = (key) => {
  let matches = location.hash.match(new RegExp(key+'=([^&]*)'));
  return matches ? safe(matches[1]) : null;
}

//let loadStateFromURL = () => {
//}

/*// Update state with 'update'
let updateState = (update) => {
  debug("update hash: " + state + " with: " + update)
}*/

const VIEWS = {
  OVERVIEW: "overview", // Competition view
  RESULT: "result", // Result for a competition
  SETTINGS: "settings"  // Settings
}

// State controller
let state = {
  _view: VIEWS.OVERVIEW,
  _data: "",
  toggleView: (view, data) => {
    if (view == VIEWS.SETTINGS) {
      state._viewSettings(data);
    } else if (view == VIEWS.RESULT) {
      state._viewResults(data);
    } else {
      // Assume competitions overview
      state._viewOverview(data);
    }
  },
  _viewOverview: (data) => {
    getCompetitions();
  },
  _viewResults: (data) => {
    debug("_viewResults")
      if(data) {
        debug("data: " )
        debug(data)
        if(data.competitionId) {
          //showCompetitionResults(data.competitionId, data.competitionName)
          showCompetitionResults(data.competitionId, data.competitionName)
        }
      } 
  },
  _viewSettings: (data) => {
    getCompetitions()
  }
}


// EVENT LISTENERS 
$( document ).ready(() => {
    // ------------------ Initial setup start -----------------------------------
    debug("ready!");

    document.getElementById("appLabel").innerHTML = 'Live-OL Results (v' + version + ')';

    // Load state from URL
    //$("#logo").replaceWith(logoSVG)
    // Get recent competitions
    //$('#onlyOrganizerFavorites')[0].checked
    // Load settings
    let settings = loadSettings();

    // Update page according to settings
    if (settings.onlyClubFavorites) {
      $('#onlyOrganizerFavorites')[0].checked = true;
    }

    // Add settings from input/URL
    if (document.location.hash) {
      let cid = getHashIdValue("cid");
      //debug("hash is something: " + cid)
      if (cid != null) {
        // Display competition
        settings.competitionId = parseInt(cid);
        settings.competitionName = getCompetitionNameById(cid); // "Test" // TODO
        state.toggleView(VIEWS.RESULT, settings);

        // Load class result if applicable
        let className = getHashIdValue("class");
        if (className != null) {
          //debug("hash class is something: " + className)
          getClassResult(parseInt(cid), className);
          setTimeout(function () { activateClassButtons(className); }, 300); // Ugly fix



          //setTimeout(alert(className), 3000) // Ugly fix
        }

        // Load club result if applicable
        let clubName = getHashIdValue("clubName");
        if (clubName != null) {
          //debug("hash club is something: " + clubName)
          getClubResult(parseInt(cid), clubName);
        }
      }

    } else {
      state.toggleView(VIEWS.OVERVIEW);
    }


    // Save updated settings
    // Skip?
    // View page according to settings
    // getCompetitions()
    //let currentCompetition = -1
    //if(!Number.isNaN(Number.parseInt(document.location.hash.replace('#cid=','')))) {
    //  currentCompetition = Number.parseInt(document.location.hash.replace('#cid=',''))
    //startLastPassTimer()
    /*if(settings.resultTimer) {
      startResultTimer()
    } else {
      stopResultTimer()
    }
*/
    /*if(settings.lastPassingTimer) {
      document.getElementById("lastPassingTimerToggler").innerHTML = timerOffSVG
    } else {
      document.getElementById("lastPassingTimerToggler").innerHTML = timerOffSVG
    }*/
    /*
    if(settings.resultTimer) {
      document.getElementById("resultTimerToggler").innerHTML = timerOffSVG
    } else {
      document.getElementById("resultTimerToggler").innerHTML = timerOffSVG
    }*/
    //showResultScreen()
    //showCompetitionResults(currentCompetition)
    //} else {
    //}
    // --------------- Event handlers start -------------------------------------
    $('#settingsBackdrop').on('show.bs.modal', function (e) {
      //debug("Settings show")
      generateSettingsList();
    });
    $('#settingsBackdrop').on('hide.bs.modal', function (e) {
      //debug("Settings dismissed")
      getCompetitions();
    });

    $('#onlyOrganizerFavorites').change(function (e) {
      //debug("onlyOrganizerFavorites: " + $('#onlyOrganizerFavorites')[0].checked)
      if (!$('#onlyOrganizerFavorites')[0].checked) {
        removeCompetitionsListCache();
      }
      getCompetitions();
    });


    window.addEventListener('hashchange', function () {
      //debug('The hash has changed!')
      //debug(location.hash)
      let settings = loadSettings();
      let tmpCompetitionId = getHashIdValue("cid");
      if (tmpCompetitionId != settings.competitionId) {
        settings.competitionId = parseInt(tmpCompetitionId);
        saveSettings(settings);
        //let state = { "competitionId": competitionId}
        //history.pushState(state, "")
        //debug(state)
      }
    }, false);
    // --------------- Event handlers end -------------------------------------
    // ------------------ Initial setup end -------------------------------------
    /*window.addEventListener('hashchange', function() {
      //updateState(currentState)
      //debug(location.hash)
      updateState(location.hash)
    }, false);*/
    /*
      $('#resultTimerToggler').click(function (e) {
        togglerResultTimer()
      })
      */
    /*$('#onlyPersonFavorites').change(function (e) {
      if(!$('#onlyPersonFavorites')[0].checked) {
        debug("person favorites")
      }
      //getCompetitions()
    })*/
  });

