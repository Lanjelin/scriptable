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
  let fileName = "kondis-firestore-" + numActivities.toString() + ".json";
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
    while (kondisActivities.length > 0) {
      const hit = kondisActivities.shift();
      if (!getCarousel && "carouselName" in hit) continue;
      if (filterOutActivities.some((filter) => hit.name.includes(filter))) continue;
      return hit;
    }
    return null;
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
      let dateText = formatDate(activity.date);
      let dt = rd.addText(dateText);
      dt.textColor = text_color;
      dt.font = text_font;
      rd.addSpacer(2);
      let nt = rn.addText(activity.name);
      nt.textColor = text_color;
      nt.font = text_font;
      nt.url = getEventUrl(activity.sportType, activity.id);
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
// Format a Firestore timestamp for the query's date window.
function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
// Query the public Firestore REST API; Listen/channel is a browser session stream,
// not an endpoint that can be replayed independently by a widget.
async function getExternalKondisData(
  sportType,
  distanceFrom,
  distanceTo,
  address,
) {
  const area = [
    "agder", "innlandet", "møre og romsdal", "nordland", "oslo",
    "rogaland", "troms og finnmark", "trøndelag",
    "vestfold og telemark", "vestland", "viken",
    "akershus", "buskerud", "østfold", "vestfold", "telemark",
    "troms", "finnmark",
  ];
  const formerCounties = {
    viken: ["akershus", "buskerud", "østfold"],
    "vestfold og telemark": ["vestfold", "telemark"],
    "troms og finnmark": ["troms", "finnmark"],
  };
  const location = String(address || "").toLocaleLowerCase("no").trim();
  const allLocations = !location || location === "alle" || location === "false";
  const today = startOfToday();
  const end = new Date(today);
  end.setFullYear(end.getFullYear() + 5);
  end.setDate(end.getDate() + 1);
  const filters = [
    {
      fieldFilter: {
        field: { fieldPath: "date" },
        op: "GREATER_THAN_OR_EQUAL",
        value: { timestampValue: today.toISOString() },
      },
    },
    {
      fieldFilter: {
        field: { fieldPath: "date" },
        op: "LESS_THAN",
        value: { timestampValue: end.toISOString() },
      },
    },
  ];
  if (["running", "skiing", "cycling", "multisport"].includes(sportType)) {
    filters.push({
      fieldFilter: {
        field: { fieldPath: "sportType" },
        op: "EQUAL",
        value: { stringValue: sportType },
      },
    });
  }
  const query = {
    from: [{ collectionId: "mainEvents" }],
    select: { fields: [
      "date", "name", "sportType", "id", "distances", "address", "carouselName",
    ].map((fieldPath) => ({ fieldPath })) },
    where: { compositeFilter: { op: "AND", filters } },
    orderBy: [
      { field: { fieldPath: "date" }, direction: "ASCENDING" },
      { field: { fieldPath: "__name__" }, direction: "ASCENDING" },
    ],
    limit: 100,
  };
  const results = [];
  const url =
    "https://firestore.googleapis.com/v1/projects/kondisapp/databases/(default)/documents:runQuery";
  while (results.length < 50) {
    const request = new Request(url);
    request.method = "POST";
    request.headers = { "content-type": "application/json" };
    request.body = JSON.stringify({ structuredQuery: query });
    const response = await request.loadJSON();
    if (!Array.isArray(response)) {
      throw new Error("Firestore query failed: " + JSON.stringify(response));
    }
    const documents = response.filter((entry) => entry.document).map((entry) => entry.document);
    for (const document of documents) {
      const fields = document.fields || {};
      const place = fields.address?.mapValue?.fields || {};
      const actualLocation = area.includes(location) ? place.area : place.town;
      const normalizedLocation = actualLocation?.stringValue?.toLocaleLowerCase("no");
      if (!allLocations && normalizedLocation !== location &&
          !formerCounties[location]?.includes(normalizedLocation)) continue;
      const distances = fields.distances?.arrayValue?.values || [];
      if (!distances.some((distance) => {
        const length = distance.mapValue?.fields?.length;
        const metres = Number(length?.integerValue ?? length?.stringValue);
        return Number.isFinite(metres) && metres >= distanceFrom && metres <= distanceTo;
      })) continue;
      results.push({
        date: fields.date?.timestampValue,
        name: fields.name?.stringValue,
        sportType: fields.sportType?.stringValue,
        id: fields.id?.stringValue || document.name.split("/").pop(),
        ...(fields.carouselName ? { carouselName: fields.carouselName.stringValue } : {}),
      });
      if (results.length === 50) break;
    }
    if (documents.length < query.limit) break;
    const last = documents[documents.length - 1];
    query.startAt = {
      values: [
        { timestampValue: last.fields.date.timestampValue },
        { referenceValue: last.name },
      ],
      before: false,
    };
  }
  return results;
}
