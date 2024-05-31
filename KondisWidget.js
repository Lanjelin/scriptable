// icon-color: purple; icon-glyph: calendar-alt;
//
// Kondis Widget
//
// Heisann, hyggelig at du kikker innom.
// De fleste innstillinger er tilgjengelige om en kjører scriptet fra scriptable app'en
// Nedenfor er et filter om det er ytterligere aktiviteter en vil filtrere bort.
// Scriptet krever iCloud, og om det er noen problemer med kjøring,
// slett mappen med navn kondis, som finnes i Scriptable-mappen i iCloud, og prøv igjen.
// Åpne gjerne et issue på github med forslag eller feil.
//
// User Input Start
const filterOutActivities = []; // hide activities based on name
// Styling
const spacerBottom = 0; // padding at bottom if needed
const numActivitiesMedium = 6;
const numActivitiesLarge = 18;
const bg_color1 = Color.dynamic(new Color("#fefefe"), new Color("#272727"));
const bg_color2 = Color.dynamic(new Color("#f1f1f1"), new Color("#1d1d1d"));
const text_font = Font.semiboldRoundedSystemFont(14);
const text_color = Color.dynamic(new Color("#1d1d1d"), new Color("#f1f1f1"));
// User Input End

// Adding filemanager
const iCloud = module.filename.includes("Documents/iCloud~");
const fm = iCloud ? FileManager.iCloud() : FileManager.local();
const path = fm.joinPath(fm.documentsDirectory(), "/kondis");
fm.createDirectory(path, true);
// Check where the script is running
if (config.runsInWidget) {
  // Widget function start
  let widget = await createWidget(await getSettings(fm, path));
  Script.setWidget(widget);
} else {
  if (!args.queryParameters.exit) {
    await displayConfigView(fm, path);
  } else {
    let widget = await createWidget(await getSettings(fm, path));
    widget.presentLarge();
  }
}
Script.complete();
// Widget function
async function createWidget(settings) {
  let [sport, distanceFrom, distanceTo, getCarousel, location] = settings;
  // Defining size dependent variables
  let t_size;
  let numActivities;
  let g_locations;
  if (config.widgetFamily == "medium") {
    g_locations = [
      0, 0.9, 0.91, 0.92, 0.93, 0.94, 0.95, 0.96, 0.97, 0.98, 0.99, 1,
    ];
    t_size = new Size(320, 120);
    numActivities = numActivitiesMedium;
  } else if (config.widgetFamily == "large" || config.widgetFamily == null) {
    g_locations = [
      0, 0.95, 0.955, 0.96, 0.965, 0.97, 0.975, 0.98, 0.985, 0.99, 0.995, 1,
    ];
    t_size = new Size(320, 320);
    numActivities = numActivitiesLarge;
  } else {
    g_locations = [
      0, 0.95, 0.955, 0.96, 0.965, 0.97, 0.975, 0.98, 0.985, 0.99, 0.995, 1,
    ];
    t_size = new Size(320, 0);
    numActivities = numActivitiesLarge;
  }
  // Background
  let g = new LinearGradient();
  g.locations = g_locations;
  g.colors = [
    bg_color1,
    bg_color2,
    bg_color2,
    bg_color1,
    bg_color2,
    bg_color2,
    bg_color1,
    bg_color2,
    bg_color2,
    bg_color1,
    bg_color2,
    bg_color2,
  ];
  // Making widget
  let w = new ListWidget();
  w.setPadding(10, 10, 10, 10);
  w.spacing = 0;
  w.backgroundGradient = g;
  // Adding title
  let titleStack = w.addStack();
  titleStack.size = new Size(320, 18);
  let kondisLogo = await getKondisLogo(fm, path);
  let wtitle = titleStack.addImage(kondisLogo);
  wtitle.url = "https://kondis.no";
  // Defining cache-file
  let fileName = "kondis-" + numActivities.toString() + ".json";
  let file = fm.joinPath(path, fileName);
  // Getting data
  let kondisActivities = await getKondisData(
    fm,
    file,
    sport,
    distanceFrom,
    distanceTo,
    location,
  );
  // Function to filter activities
  function getFilteredActivity() {
    if (kondisActivities.length == 0) {
      return false;
    } else {
      let hit = kondisActivities.shift();
      if (!getCarousel) {
        if ("carouselName" in hit["_source"]) {
          hit = getFilteredActivity();
        }
      }
      for (let filter of filterOutActivities) {
        if (hit["_source"]["name"].includes(filter)) {
          hit = getFilteredActivity();
        }
      }
      return hit;
    }
  }
  // Iterating and populating
  let t = w.addStack();
  t.layoutVertically();
  t.size = t_size;
  for (let i = 0; i < numActivities; i++) {
    let r = t.addStack();
    let rd = r.addStack();
    rd.size = new Size(50, 0);
    let rn = r.addStack();
    let activity = getFilteredActivity();
    if (activity) {
      activity = activity["_source"];
      let dateText = formatDate(activity["date"]);
      dt = rd.addText(dateText);
      dt.textColor = text_color;
      dt.font = text_font;
      rd.addSpacer(2);
      let nameText = activity["name"];
      let nt = rn.addText(nameText);
      nt.textColor = text_color;
      nt.font = text_font;
      nt.url = getEventUrl(activity["sportType"], activity["id"]);
    }
  }
  w.addSpacer(spacerBottom);
  return w;
}
// Format date for widget
function formatDate(day) {
  const d = new Date(day);
  return (
    String(d.getDate()).padStart(2, "0") +
    "." +
    String(d.getMonth() + 1).padStart(2, "0")
  );
}
// Get the correct event url
function getEventUrl(type, id) {
  const sports = {
    running: "l%C3%B8ping",
    skiing: "ski",
    cycling: "sykling",
    multisport: "multisport",
  };
  const baseUrl = "https://terminlista.kondis.no/";
  return baseUrl + sports[type] + "/event/" + id;
}
// Fething and formatting data
function pad2(num) {
  return num.toString().padStart(2, "0");
}
function getDate(year) {
  let date = new Date();
  return [
    pad2(date.getDate()),
    pad2(date.getMonth() + 1),
    date.getFullYear() + year,
  ].join("-");
}
// Display config webview
async function displayConfigView(fm, path, save) {
  let html = await new Request(
    "https://raw.githubusercontent.com/Lanjelin/scriptable/main/assets/html/kondis-settings.html",
  ).loadString();
  const wv = new WebView();
  await wv.loadHTML(html);
  await wv.waitForLoad();
  // Storing settings to file
  async function setSettings(fm, path, sport, from, to, carousel, location) {
    let settingsName = "settings.json";
    let settingsFile = fm.joinPath(path, settingsName);
    fm.writeString(
      settingsFile,
      JSON.stringify([
        sport,
        parseInt(from),
        parseInt(to),
        carousel === "true",
        location,
      ]),
    );
    return true;
  }
  // Watches for returned data from webview
  function watcher() {
    wv.evaluateJavaScript("console.log('watcher activated...');", true).then(
      (res) => {
        console.log("response: " + res);
        let [sport, from, to, carousel, location] = JSON.parse(res);
        let saved = setSettings(fm, path, sport, from, to, carousel, location);
        if (saved) {
          wv.evaluateJavaScript(
            "window.onScriptableMessage('Lagret instillinger.')",
          );
          const scriptUrl = URLScheme.forRunningScript() + "?exit=true";
          Safari.open(scriptUrl);
        } else {
          wv.evaluateJavaScript(
            "window.onScriptableMessage('Feilet ved lagring.')",
          );
        }
        watcher();
      },
    );
  }
  watcher();
  wv.present();
}
// Reading settings from file, or creating a new file
async function getSettings(fm, path) {
  let settingsName = "settings.json";
  let settingsFile = fm.joinPath(path, settingsName);
  if (fm.fileExists(settingsFile)) {
    await fm.downloadFileFromiCloud(settingsFile);
    return JSON.parse(fm.readString(settingsFile));
  } else {
    fm.writeString(
      settingsFile,
      JSON.stringify(["running", 5000, 10000, false, "rogaland"]),
    );
    return ["running", 5000, 10000, false, "rogaland"];
  }
}
// Return image
async function getKondisLogo(fm, path) {
  let imageName = "kondis.png";
  let imageFile = fm.joinPath(path, imageName);
  if (fm.fileExists(imageFile)) {
    await fm.downloadFileFromiCloud(imageFile);
    return fm.readImage(imageFile);
  } else {
    let img = await new Request(
      "https://raw.githubusercontent.com/Lanjelin/scriptable/main/assets/images/kondis.png",
    ).loadImage();
    fm.writeImage(imageFile, img);
    return fm.readImage(imageFile);
  }
}
// Return cached or external data
async function getKondisData(
  fm,
  file,
  sport,
  distanceFrom,
  distanceTo,
  location,
) {
  let parsedSettings = [sport, distanceFrom, distanceTo, location];
  if (fm.fileExists(file)) {
    await fm.downloadFileFromiCloud(file);
    let [timestamp, storedSettings, kondisData] = JSON.parse(
      fm.readString(file),
    );
    if (JSON.stringify(parsedSettings) === JSON.stringify(storedSettings)) {
      if (parseInt(timestamp) + 2 * 60 * 60 * 1000 >= Date.parse(new Date())) {
        return kondisData;
      }
    }
  }
  let kondisData = await getExternalKondisData(
    sport,
    distanceFrom,
    distanceTo,
    location,
  );
  let fileData = [Date.parse(new Date()), parsedSettings, kondisData];
  fm.writeString(file, JSON.stringify(fileData));
  return kondisData;
}
// Fetch data from kondis
async function getExternalKondisData(
  sportType,
  distanceFrom,
  distanceTo,
  address,
) {
  const area = [
    "agder",
    "innlandet",
    "møre og romsdal",
    "nordland",
    "oslo",
    "rogaland",
    "troms og finnmark",
    "trøndelag",
    "vestfold og telemark",
    "vestland",
    "viken",
  ];
  const api_url =
    "https://kondis-search.es.europe-north1.gcp.elastic-cloud.com/kondis-mainevents-v2/_search";
  const api_auth =
    "ApiKey V19yR2dIa0JzS1oxeldxdDNTcGs6d2xvUW8xd2NUbU8wRXA2QUR5UEZldw==";
  let api_body = {
    query: { bool: { must: [], filter: [] } },
    size: 50,
    from: 0,
    sort: [{ date: { order: "asc" } }],
  };
  if (["running", "skiing", "cycling", "multisport"].includes(sportType)) {
    api_body.query.bool.filter.push({ match_phrase: { sportType: sportType } });
  }
  let query_date = {
    range: { date: { gte: getDate(0), lte: getDate(5), format: "dd-MM-yyyy" } },
  };
  if (address == "" || address.toLowerCase() == "alle" || address == "false") {
    //pass
  } else if (area.includes(address.toLowerCase())) {
    var query_area = {
      match_phrase: { "address.area": address.toLowerCase() },
    };
    api_body.query.bool.filter.push(query_area);
  } else {
    var query_area = {
      match_phrase: { "address.town": address.toLowerCase() },
    };
    api_body.query.bool.filter.push(query_area);
  }
  let query_range = {
    range: { "distances.length": { gte: distanceFrom, lte: distanceTo } },
  };
  api_body.query.bool.filter.push(query_date);
  api_body.query.bool.filter.push(query_range);
  const request = new Request(api_url);
  request.headers = {
    "content-type": "application/json",
    authorization: api_auth,
  };
  request.method = "POST";
  request.body = JSON.stringify(api_body);
  let response = await request.loadJSON();
  return response.hits.hits;
}
