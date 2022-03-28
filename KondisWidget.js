//
// Kondis Widget
//
// User Input Start
const location = "rogaland";
const sport = "running"; // all, running, skiing, cycling or multisport
const distanceFrom = 5000; // distance in meters
const distanceTo = 10000; // distance in meters
const numActivities = 6; // how many activities to display, adjust for bigger widget sizes
const getCarousel = false; // get carousel runs?
const filterOutActivities = []; // hide activities based on name
// Styling
const spacerBottom = 0; // padding at bottom if needed
const widgetTitle = "Kondis";
const useImageAsTitle = true;
const bg_color1 = Color.dynamic(new Color("#fefefe"), new Color("#272727"));
const bg_color2 = Color.dynamic(new Color("#f1f1f1"), new Color("#1d1d1d"));
const title_font = Font.semiboldRoundedSystemFont(22);
const text_font = Font.semiboldRoundedSystemFont(14);
const text_color = Color.dynamic(new Color("#1d1d1d"), new Color("#f1f1f1"));
// User Input End

// Widget function start
let widget = await createWidget();
// Check where the script is running
if (config.runsInWidget) {
    Script.setWidget(widget);
} else {
    widget.presentMedium();
}
Script.complete();

async function createWidget() {
    // Background
    let g = new LinearGradient();
    g.locations = [0, 0.9, 0.91, 0.92, 0.93, 0.94, 0.95, 0.96, 0.97, 0.98, 0.99, 1];
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
    let w = new ListWidget()
    w.setPadding(10, 10, 10, 10);
    w.spacing = 0;
    w.backgroundGradient = g;
    // Adding title
    let titleStack = w.addStack();
    if (useImageAsTitle) {
        titleStack.size = new Size(320, 18);
        let img = await new Request("https://raw.githubusercontent.com/Lanjelin/scriptable/assets/images/main/kondis.png").loadImage();
        let wtitle = titleStack.addImage(img);
    } else {
        titleStack.size = new Size(320, 0);
        let wtitle = titleStack.addText(widgetTitle);
        wtitle.font = title_font;
        wtitle.textColor = text_color;
    }
    // Getting data
    let kondisActivities = await getKondisData(sport, distanceFrom, distanceTo, location);
    // Function to get corrwct url
    function getEventUrl(type, id) {
        const sports = { "running": "l%C3%B8ping", "skiing": "ski", "cycling": "sykling", "multisport": "multisport" }
        const baseUrl = "https://terminlista.kondis.no/"
        return baseUrl + sports[type] + "/event/" + id
    }
    // Function to filter activities
    function getFilteredActivity() {
        if (kondisActivities.length == 0) {
            return false
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
            return hit
        }
    }
    function formatDate(day) {
        const d = new Date(day);
        return (String(d.getDate())).padStart(2, "0") + "." + (String(d.getMonth() + 1).padStart(2, "0"));
    }
    // Iterating and populating
    let t = w.addStack()
    t.layoutVertically();
    if (config.widgetFamily == "medium" || config.widgetFamily == null) {
        t.size = new Size(320, 120);
    } else if (config.widgetFamily == "large") {
        t.size = new Size(320, 320);
    } else {
        t.size = new Size(320, 0);
    }
    for (let i = 0; i < numActivities; i++) {
        let r = t.addStack();
        let rd = r.addStack();
        rd.size = new Size(50, 0)
        let rn = r.addStack();
        let activity = getFilteredActivity();
        if (activity) {
            activity = activity["_source"];
            let dateText = formatDate(activity["date"]);
            dt = rd.addText(dateText)
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

// Fething and formatting data
function pad2(num) {
    return num.toString().padStart(2, "0")
}
function getDate(year) {
    let date = new Date();
    return [
        pad2(date.getDate()),
        pad2(date.getMonth() + 1),
        date.getFullYear() + year,
    ].join("-");
}
// Fetch data from kondis
async function getKondisData(sportType, distanceFrom, distanceTo, address) {
    const area = [
        "foslo",
        "rogaland",
        "møreogromsdal",
        "nordland",
        "viken",
        "innlandet",
        "vestfoldogtelemark",
        "agder",
        "vestland",
        "trøndelag",
        "tromsogfinnmark",
    ];
    const api_url = "https://appsolutely-search.es.europe-north1.gcp.elastic-cloud.com/kondis-mainevents-v2/_search"
    const api_auth = "ApiKey V19yR2dIa0JzS1oxeldxdDNTcGs6d2xvUW8xd2NUbU8wRXA2QUR5UEZldw=="
    let api_body = { "query": { "bool": { "must": [], "filter": [] } }, "size": 50, "from": 0, "sort": [{ "date": { "order": "asc" } }] }
    if (["running", "skiing", "cycling", "multisport"].includes(sportType)) {
        api_body.query.bool.filter.push({ "match_phrase": { "sportType": sportType } });
    }
    let query_date = { "range": { "date": { "gte": getDate(0), "lte": getDate(5), "format": "dd-MM-yyyy" } } }
    if (area.includes(address.replace(" ", "").toLocaleLowerCase())) {
        var query_area = { "match_phrase": { "address.area": address } };
    } else {
        var query_area = { "match_phrase": { "address.town": address } };
    }
    let query_range = { "range": { "distances.length": { "gte": distanceFrom, "lte": distanceTo } } }
    api_body.query.bool.filter.push(query_date)
    api_body.query.bool.filter.push(query_area)
    api_body.query.bool.filter.push(query_range)
    const request = new Request(api_url)
    request.headers = { "content-type": "application/json", "authorization": api_auth }
    request.method = "POST"
    request.body = JSON.stringify(api_body)
    let response = await request.loadJSON()
    return response.hits.hits;
}
