//
// Garmin 
//
// Requires Profile visibility set to All / Public
// https://connect.garmin.com/modern/settings/privacySettings
//
// Made using info found at http://sergeykrasnov.ru/subsites/dev/garmin-connect-statisics/web_api.php
//

// User Input Start
const widgetTitle = "Workouts";
const userName = "Lanjelin";
const timeFrame = "week";   // "week" or number representing trailing days
const maxActivities = 15;   // limit amount of data pulled
const dataLayout = {
  line1: [["workout"], ["activities", "duration", "calories"]],
  line2: [["run"], ["activities", "duration", "calories"]],
  line3: [["padding:35", "total"], ["distance"]],
  line4: [["padding:35", "total"], ["calories"]],
};
// How-to
//
// formatting: line1: [["padding:5", "activity", "padding:5"], ["activity-data", "padding:15" "activity-data"]]
// activities supported: workout, walk, run, bike
// activity-data supported: activities, calories, distance, duration
// padding can be added in all positions by adding "padding:25" where 25 is value of padding
//
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
//  g.locations = [0, 0.48, 0.49, 0.5, 0.51, 0.52, 1];
//  g.locations = [0, 0.45, 0.46, 0.47, 0.48, 0.49, 0.5, 0.51, 0.52, 0.53, 0.54, 0.55, 1];
g.locations = [0, 0.9, 0.91, 0.92, 0.93, 0.94, 0.95, 0.96, 0.97, 0.98, 0.99, 1];
  g.colors = [
    Color.dynamic(new Color("#6DCFF6"), Color.lightGray()),
    Color.dynamic(new Color("#007CC3"), Color.darkGray()),
    Color.dynamic(new Color("#007CC3"), Color.darkGray()),
    Color.dynamic(new Color("#6DCFF6"), Color.lightGray()),
    Color.dynamic(new Color("#007CC3"), Color.darkGray()),
    Color.dynamic(new Color("#007CC3"), Color.darkGray()),
    Color.dynamic(new Color("#6DCFF6"), Color.lightGray()),
    Color.dynamic(new Color("#007CC3"), Color.darkGray()),
    Color.dynamic(new Color("#007CC3"), Color.darkGray()),
    Color.dynamic(new Color("#6DCFF6"), Color.lightGray()),
    Color.dynamic(new Color("#007CC3"), Color.darkGray()),
    Color.dynamic(new Color("#007CC3"), Color.darkGray()),
  ];
//  g.startPoint = new Point(0.1, 0.3);
//  g.endPoint = new Point(0.8, 0.95);
  // Making widget
  let w = new ListWidget()
  w.setPadding(10, 10, 10, 10);
  w.spacing = 2;
  w.backgroundGradient = g;
  // Adding title
  let titleStack = w.addStack();
  titleStack.cornerRadius = 4;
  let wtitle = titleStack.addText(widgetTitle);
  wtitle.font = Font.semiboldRoundedSystemFont(26);
  wtitle.textColor = new Color("#1d2e2d");
  wtitle.leftAlignText();
  w.addSpacer(5);  
  // Getting data
  let garminData = await getFromGarmin(userName, 1, maxActivities);
  let activitiesResults = await getActivities(garminData, timeFrame);
  // Function to generate text
  function pickAndChoose(activities, values, r){
    const prefix = {total: "🔥", workout: "🏋️", walk: "🚶", run: "🏃", bike: "🚴",}
    const suffix = {activities: "★", distance: "km", duration: "min", calories: "kcal",}
    for (let activity of activities){
      if (activity.includes("padding")){
        r.addSpacer(parseInt(activity.split(":")[1]));
      } else {
        r.addText(prefix[activity]);
        for (let value of values){
          if (value.includes("padding")){
            r.addSpacer(parseInt(value.split(":")[1]));
          } else {
            r.addSpacer(5);
            let val;
            if (value == "distance"){
              val = (activitiesResults[activity][value]/1000).toFixed(2).toString();
            } else if (value == "duration"){
              val = (activitiesResults[activity][value]/60).toFixed(0).toString();
            } else {
              val = (activitiesResults[activity][value]).toString();
            }
            let valtxt = r.addText(val);
            valtxt.textColor = new Color("#1d2e2d");
            valtxt.font = Font.semiboldRoundedSystemFont(16);
            let suftxt = r.addText(suffix[value]);
            suftxt.textColor = new Color("#1d2e2d");
            suftxt.font = Font.semiboldRoundedSystemFont(16);
          }
        }
      }
    }
  }
  // Iterating through data
  let table = w.addStack();
  table.layoutVertically();
  for (const [line, values] of Object.entries(dataLayout)){
    let row = table.addStack()
    pickAndChoose(values[0], values[1], row);
  }
  return w;
}

// Fething and formatting data
// Fetch data from garmin
async function getFromGarmin(userName, start=1, limit=15) {
  const url = "https://connect.garmin.com/proxy/activitylist-service/activities/"+userName+"?start="+start+"&limit="+limit+"";
  const request = new Request(url);
  const response = await request.loadJSON();
  return response;
}
// Function to check if data is within timeframe
function withinTimeframe(days, date){
  if (days.toString() == "week"){
    const week = [6, 0, 1, 2, 3, 4, 5,];
    let firstday = new Date();
    firstday.setHours(0,0,1);
    firstday.setDate(firstday.getDate() - week[firstday.getDay()]);
    var diff = Math.abs(new Date() - new Date(date.replace(/-/g,'/')));
    var daysms = Math.abs(new Date() - firstday)
  } else {
    var daysms = parseInt(days)*(1000 * 3600 * 24);
    var diff = Math.abs(new Date() - new Date(date.replace(/-/g,'/')));
  }
  if (daysms > diff){
    return true;
  } else {
    return false;
  }
}
// Pulling the data we want
async function getActivities(data, timeFrame){
  const workoutID = [13];   // typekey: ['strength_training']
  const walkingID = [3, 9];    // typekey: ['hiking', 'walking']
  const runningID = [6, 1]; // typeKey: ['trail_running', 'running']
  const bikingID = [10, 2, 152]; // typekey: ['road_biking', 'cycling', 'virtual_ride']
  let res = {
    total: {
      activities: 0,
      calories: 0,
      distance: 0,
      duration: 0,
    },
    workout: {
      activities: 0,
      calories: 0,
      distance: 0,
      duration: 0,
    },
    walk: {
      activities: 0,
      calories: 0,
      distance: 0,
      duration: 0,
    },
    run: {
      activities: 0,
      calories: 0,
      distance: 0,
      duration: 0,     
    },
    bike: {
      activities: 0,
      calories: 0,
      distance: 0,
      duration: 0,
    },
  };
  for (let activity of data["activityList"]){
    if (withinTimeframe(timeFrame, activity["startTimeLocal"])){
      res.total.activities += 1;
      res.total.calories += activity["calories"];
      res.total.distance += activity["distance"];
      res.total.duration += activity["movingDuration"];
      if (workoutID.includes(activity["activityType"]["typeId"])){
        res.workout.activities += 1;
        res.workout.calories += activity["calories"];
        res.workout.duration += activity["movingDuration"];
      } else if (walkingID.includes(activity["activityType"]["typeId"])){
        res.walk.activities += 1;
        res.walk.calories += activity["calories"]; 
        res.walk.distance += activity["distance"]; 
        res.walk.duration += activity["movingDuration"]; 
      } else if (runningID.includes(activity["activityType"]["typeId"])){
        res.run.activities += 1;
        res.run.calories += activity["calories"]; 
        res.run.distance += activity["distance"]; 
        res.run.duration += activity["movingDuration"];
      } else if (bikingID.includes(activity["activityType"]["typeId"])){
        res.bike.activities += 1;
        res.bike.calories += activity["calories"]; 
        res.bike.distance += activity["distance"]; 
        res.bike.duration += activity["movingDuration"]; 
      } else {
        console.log(activity["activityType"]["typeId"]);
        console.log(activity["activityType"]["typeKey"]);        
      }
    }
  }
  return res;
}
