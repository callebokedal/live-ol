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

const hashCache = new Map();
loadHash = (key) => {
  debug("load: " + key)
  if(hashCache.has(key)) {
    debug(hashCache.get(key))
    return hashCache.get(key)
  } else {
    return ""
  }
}
saveHash = (key, value) => {
  debug("key + value: " + key + "=" + value)
  hashCache.set(key, value)
}

// Results are cached - we need to stor local copy
const resultCache = new Map();
loadResult = (key) => {
  if(resultCache.has(key)) {
    return resultCache.get(key)
  } else {
    return {}
  }
}
saveResult = (key, data) => {
  resultCache.set(key,data)
}

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
        //debug("competitions: " + JSON.stringify(json))
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

generateFavoriteSVG = (isFavorite) => {
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

// Stopwatch, Triangle, Watch, Diamond half
// 0 - OK --> "Check box"
// 1 - DNS (Did Not Start) --> didNotStartSVG 
// 2 - DNF (Did not finish) --> didNotFinishSVG
// 3 - MP (Missing Punch) --> missingPunchSVG
// 4 - DSQ (Disqualified) --> "Cone striped"
// 5 - OT (Over (max) time) --> overTimeSVG
// 9 - Not Started Yet --> "Alarm" ?
// 10 - Not Started Yet --> 
// 11 - Walk Over (Resigned before the race started) --> 
// 12 - Moved up (The runner have been moved to a higher class) --> 
const didNotStartSVG = '<svg class="bi bi-exclamation-octagon-fill text-danger" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M11.46.146A.5.5 0 0011.107 0H4.893a.5.5 0 00-.353.146L.146 4.54A.5.5 0 000 4.893v6.214a.5.5 0 00.146.353l4.394 4.394a.5.5 0 00.353.146h6.214a.5.5 0 00.353-.146l4.394-4.394a.5.5 0 00.146-.353V4.893a.5.5 0 00-.146-.353L11.46.146zM8 4a.905.905 0 00-.9.995l.35 3.507a.552.552 0 001.1 0l.35-3.507A.905.905 0 008 4zm.002 6a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd"/></svg>'
const didNotFinishSVG = '<svg class="bi bi-x text-danger" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M11.854 4.146a.5.5 0 010 .708l-7 7a.5.5 0 01-.708-.708l7-7a.5.5 0 01.708 0z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M4.146 4.146a.5.5 0 000 .708l7 7a.5.5 0 00.708-.708l-7-7a.5.5 0 00-.708 0z" clip-rule="evenodd"/></svg>'
const missingPunchSVG = '<svg class="bi bi-x-square text-danger" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M14 1H2a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V2a1 1 0 00-1-1zM2 0a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V2a2 2 0 00-2-2H2z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M11.854 4.146a.5.5 0 010 .708l-7 7a.5.5 0 01-.708-.708l7-7a.5.5 0 01.708 0z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M4.146 4.146a.5.5 0 000 .708l7 7a.5.5 0 00.708-.708l-7-7a.5.5 0 00-.708 0z" clip-rule="evenodd"/></svg>'
const overTimeSVG = '<svg class="bi bi-clock-history text-danger" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M8.515 1.019A7 7 0 008 1V0a8 8 0 01.589.022l-.074.997zm2.004.45a7.003 7.003 0 00-.985-.299l.219-.976c.383.086.76.2 1.126.342l-.36.933zm1.37.71a7.01 7.01 0 00-.439-.27l.493-.87a8.025 8.025 0 01.979.654l-.615.789a6.996 6.996 0 00-.418-.302zm1.834 1.79a6.99 6.99 0 00-.653-.796l.724-.69c.27.285.52.59.747.91l-.818.576zm.744 1.352a7.08 7.08 0 00-.214-.468l.893-.45a7.976 7.976 0 01.45 1.088l-.95.313a7.023 7.023 0 00-.179-.483zm.53 2.507a6.991 6.991 0 00-.1-1.025l.985-.17c.067.386.106.778.116 1.17l-1 .025zm-.131 1.538c.033-.17.06-.339.081-.51l.993.123a7.957 7.957 0 01-.23 1.155l-.964-.267c.046-.165.086-.332.12-.501zm-.952 2.379c.184-.29.346-.594.486-.908l.914.405c-.16.36-.345.706-.555 1.038l-.845-.535zm-.964 1.205c.122-.122.239-.248.35-.378l.758.653a8.073 8.073 0 01-.401.432l-.707-.707z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M8 1a7 7 0 104.95 11.95l.707.707A8.001 8.001 0 118 0v1z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M7.5 3a.5.5 0 01.5.5v5.21l3.248 1.856a.5.5 0 01-.496.868l-3.5-2A.5.5 0 017 9V3.5a.5.5 0 01.5-.5z" clip-rule="evenodd"/></svg>'
const olSVG = '<svg class="bi bi-diamond-half" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M6.95.435c.58-.58 1.52-.58 2.1 0l6.515 6.516c.58.58.58 1.519 0 2.098L9.05 15.565c-.58.58-1.519.58-2.098 0L.435 9.05a1.482 1.482 0 010-2.098L6.95.435zM8 .989a.493.493 0 00-.35.145L1.134 7.65a.495.495 0 000 .7l6.516 6.516a.493.493 0 00.35.145V.989z" clip-rule="evenodd" transform="rotate(45 10 10)"/></svg>'
const logoSVG = '<svg class="bi bi-diamond-half" width="2em" height="2em" viewBox="0 0 16 16" fill="orange" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M6.95.435c.58-.58 1.52-.58 2.1 0l6.515 6.516c.58.58.58 1.519 0 2.098L9.05 15.565c-.58.58-1.519.58-2.098 0L.435 9.05a1.482 1.482 0 010-2.098L6.95.435zM8 .989a.493.493 0 00-.35.145L1.134 7.65a.495.495 0 000 .7l6.516 6.516a.493.493 0 00.35.145V.989z" clip-rule="evenodd" transform="rotate(45 10 10)"/></svg>'
 //transform="rotate(45 10 10) translate(0 0)"
generateResultTimeStatus = (status) => {
  if(status == "ej start") {
    return didNotStartSVG + '<small class="pl-1">Ej start</small>'
  } else if(status == "utgått") {
    return didNotFinishSVG + '<small class="pl-1">Utgått</small>'
  } else if(status == "felst.") {
    return missingPunchSVG + '<small class="pl-1">Felstämplat</small>'
  } else {
    return olSVG + '<small class="pl-1">' + status + '</small>'
  }
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

      html += '<tr>'
        html += '<td class="" scope="row">'
        html += '<div class="mb-1 d-flex">'
          html += '<small class=" align-middle">' + data.organizer + '</small>'
          if(settings.favoriteOrganizors.indexOf(data.organizer) !== -1) {
            html += '<a href="#" class="flex-grow-1 mr-1 ml-1 small" onclick="quickRemoveFavoriteOrganizer(\'' + data.organizer + '\')">' 
            html += generateFavoriteSVG(true)
          } else {
            html += '<a href="#" class="flex-grow-1 mr-1 ml-1 small" onclick="quickAddFavoriteOrganizer(\'' + data.organizer + '\')">' 
            html += generateFavoriteSVG(false)
          }
          html += '</a>'
          html += '<small class="">' + data.date + '</small>'
        html += '</div>'
        html += '<h6 class="d-flex align-items-end flex-column mb-1 mt-1 mr-1"><a href="#cid=' + data.id + '" onclick="showCompetitionResults(' + data.id + ', \'' + data.name + '\')" class="text-warning">' + data.name + '</a></h6>'
        html += '</td>'
      html += '</tr>'
    });

    document.getElementById("competitions").innerHTML = html;
  } else {
    document.getElementById("competitions").innerHTML = "<li class='list-group-item'>Inga tävlingar att visa</li>"  ;
  }
}

// api.php?method=getclasses&comp=XXXX&last_hash=abcdefg
//let lastPassingsHash = ""
getLastPassings = (competitionId) => {
  debug("get results")
  let hashKey = "pass"+competitionId

  if(!Number.isInteger(competitionId)) {
    console.error("Illegal competitonsId: " + competitionId)
    return
  }

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

      debug(passings)
      debug(loadHash("pass"+competitionId))

      //class: "Svart mellan"
      //control: 1000
      //controlName: ""
      //passtime: "12:19:40"
      //runnerName: "Magnus O"
      //time: "ej start"

      let html = ""
      passings.forEach(data => {
        html += '<li class="list-group-item bg-light p-2">'
          html += '<small class="mr-2">' + data.passtime + '</small>'
          html += '<small class="mr-2 font-weight-bold">' + data.runnerName + '</small>'
          html += '<small class="mr-2">(' + data.class + ')</small>'
          //html += '<small class="mr-2">(' + data.controlName + ', ' + data.control + ')</small>'
          html += '<small class="mr-auto">' + generateResultTimeStatus(data.time) + '</small>'
        html += '</li>'
      });
      document.getElementById("passings").innerHTML = html;
    } else {
      console.log("No response!")
    }
  });
}

// api.php?method=getclasses&comp=XXXX&last_hash=abcdefg
//let lastClassesHash = ""
getClasses = (competitionId) => {
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
      classes.forEach((data, idx) => {
        //html += '<button type="button" class="btn btn-secondary mr-1 mb-1 mt-0 ml-0 pl-1 pr-1 pt-0 pb-0" onclick="getClassResult(' + competitionId + ',\'' + data.className + '\')">' + data.className + '</button>'
        html += '<button type="button" class="btn btn-secondary mr-2 mb-2 mt-0 ml-0 pl-2 pr-2 pt-0 pb-0" onclick="getClassResult(' + competitionId + ',\'' + data.className + '\')">' + data.className + '</button>'
      });
      //classes.forEach((data, idx) => {
      //  html += '<a class="dropdown-item" href="#">' + data.className + '</a>'
      //});

      document.getElementById("classes").innerHTML = html
      //data-toggle="dropdown"
      //$('#dropdownClassesButton').dropdown()
      //$('.dropdown-classes').dropdown('update')
      //$('.dropdown-classes').dropdown()
    } else {
      debug("what?")
    }
  });
}

activateClassButtons = (className) => {
  $("#classes button").each((idx,btn) => {
    if(btn.innerHTML === className) {
      $(btn).addClass("active")
      $(btn).addClass("btn-primary")
      $(btn).removeClass("btn-secondary")
    } else {
      $(btn).removeClass("active")
      $(btn).removeClass("btn-primary")
      $(btn).addClass("btn-secondary")
    }
  });
}

// api.php?comp=10259&method=getclassresults&unformattedTimes=true&class=Öppen-1
//let lastClassResultHash = ""
getClassResult = (competitionId, className) => {
  $("#resultLabel")[0].innerHTML = "Resultat - " + className
  debug("get classresult: " + competitionId + ", " + className)
  let hashKey = "className"+competitionId+className
  //debug(e)
  //$(e).toggleClass("active")
  //$(e).toggleClass("btn-primary")
  //$(e).toggleClass("btn-secondary")
  activateClassButtons(className)

  // Fetch new data
  var xhr = new XMLHttpRequest();
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
      saveHash(hashKey, json.hash);

      debug(classResult)

      let html = ""
      classResult.forEach((data, idx) => {
        //html += '<button type="button" class="btn btn-sm btn-secondary mr-1 mb-1 mt-0 ml-0 pl-1 pr-1 pt-0 pb-0" onclick="getClassResult(' + competitionId + ',\'' + data.className + '\')">' + data.className + '</button>'
        //html += JSON.stringify(data)

        // 43:40 == 262000
        // +01:25 == 8500
        // 3704500 == ?

        // {"place": "1", "name": "Nina Djerf", "club": "Lerums SOK", "result": "60:38", "status" : 0, "timeplus": "+00:00", "progress": 100 , "start": 3746300}
        // {"place": "1", "name": "Nina Djerf", "club": "Lerums SOK", "result": "363800", "status" : 0, "timeplus": "0", "progress": 100 , "start": 3746300}
        // 1 Nina Djerf  Lerums SOK  start: 10:24:23  result: 60:38 (1) timeplus: +00:00

        // 3746300 * 10 milliseconds -> to UTC -> 10:24:23

        // {"place":"3","name":"Leif Orienterare","club":"Sjövalla FK","result":"38:11","status":0,"timeplus":"+05:41","progress":100,"start":3716900}
        html += '<tr>'
          html += '<th class="text-center" scope="row">' + data.place + '<br>' + generateFavoriteSVG(false) + '</th>'
          html += '<td class="">' + data.name + '<br><a href="#" title="Visa klubbresultat" class="small text-warning" onclick="getClubResult(\'' + competitionId + '\',\'' + data.club + '\')">' + data.club + '</a></td>'
          html += '<td class="small text-center"">' + moment(data.start * 10).subtract(1,'hour').format("hh:mm:ss") + '</td>' // Summertime. What happens in wintertime??
          html += '<td class="small text-center"">' + data.result + '</td>'
          html += '<td class="small text-center"">' + data.timeplus + '</td>'
        html += '</tr><!-- ' + data.status + ', ' + data.progress + ' -->'
      });
      //classes.forEach((data, idx) => {
      //  html += '<a class="dropdown-item" href="#">' + data.className + '</a>'
      //});

      document.getElementById("resultRows").innerHTML = html
    } else {
      debug("what?" + xhr.status + ", " + json.status)
      debug(json)
    }
  });
}

// api.php?comp=10259&method=getcclubresults&unformattedTimes=true&club=Klyftamo
//let lastClubResultHash = ""
getClubResult = (competitionId, clubName) => {
  $("#resultLabel")[0].innerHTML = "Resultat - " + clubName
  debug("get clubresult: " + competitionId + ", " + clubName)
  let hashKey = "clubName"+competitionId+clubName
  //debug(e)
  //$(e).toggleClass("active")
  //$(e).toggleClass("btn-primary")
  //$(e).toggleClass("btn-secondary")
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
      let clubResult = json.results.sort(function(a,b) {
        let a1 = a.place.replace("-",2000)
        let b1 = b.place.replace("-",2000)
        return a1 - b1;
      });

      debug(clubResult)

      let html = ""
      clubResult.forEach((data, idx) => {
        html += '<tr>'
          html += '<th class="text-center" scope="row">' + data.place + '<br>' + generateFavoriteSVG(true) + '</th>'
          html += '<td class="">' + data.name + '<br><a href="#" title="Visa klassresultat" class="small text-warning" onclick="getClassResult(' + competitionId + ', \'' + data.class + '\')">' + data.class + '</a></td>'
          html += '<td class="small text-center"">' + moment(data.start * 10).subtract(1,'hour').format("hh:mm:ss") + '</td>' // Summertime. What happens in wintertime??
          html += '<td class="small text-center"">' + data.result + '</td>'
          html += '<td class="small text-center"">' + data.timeplus + '</td>'
        html += '</tr><!-- ' + data.status + ', ' + data.progress + ' -->'
      });
      //classes.forEach((data, idx) => {
      //  html += '<a class="dropdown-item" href="#">' + data.className + '</a>'
      //});

      document.getElementById("resultRows").innerHTML = html
    }
  });

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

showCompetitionScreen = () => {
  $('#competitonsLabel').addClass('active')
  $('#resultsLabel').removeClass('active text-white')
  $('#resultsLabel').addClass('disabled')
  $('#competitionsContainer').removeClass('d-none')
  $('#resultsContainer').addClass('d-none')
  document.getElementById("resultRows").innerHTML = ""
}
showResultScreen = (name) => {
  $('#competitonsLabel').removeClass('active')
  $('#resultsLabel').addClass('active text-white')
  $('#competitionsContainer').addClass('d-none')
  $('#resultsContainer').removeClass('d-none')
  document.getElementById("competitionName").innerHTML = name
}

showCompetitionResults = (competitionId, competitionName) => {
  showResultScreen(competitionName)
  getClasses(competitionId)
  getLastPassings(competitionId)
}

// EVENT LISTENERS 
$( document ).ready(function() {
  debug( "ready!" );
  // Classes dropdown
  //$('.dropdown-toggle').dropdown()

  //$("#logo").replaceWith(logoSVG)

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

