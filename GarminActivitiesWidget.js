//
// Garmin Widget
//
// Requires Profile visibility set to All / Public
// https://connect.garmin.com/modern/settings/privacySettings
//
// Made using info found at http://sergeykrasnov.ru/subsites/dev/garmin-connect-statisics/web_api.php
//
// How-to:
// formatting: line1: [["padding:5", "activity", "padding:5"], ["activity-data", "padding:15" "activity-data"]]
// activities supported: workout, walk, run, bike
// activity-data supported: activities, calories, distance, duration, activedays
// padding can be added in all positions by adding "padding:25" where 25 is value of padding
// Please make an issue on GitHub if you have suggestions for datafields or activities to support.
//
// User Input Start
const widgetTitle = "Workouts";
const userName = "Lanjelin";
const timeFrame = "week"; // "week" or a number representing trailing days
const dataLayout = {
  line1: [["total"], ["calories", "activedays"]],
  line2: [
    ["workout", "padding:90"],
    ["activities", "duration", "calories"],
  ],
  line3: [["run"], ["activities", "duration", "calories", "distance"]],
};
const day_array = ["M", "T", "W", "T", "F", "S", "S"]; // Days used for activedays
const spacerBottom = 10; // lift the content from the bottom
const weekStartsOnSunday = false;
const maxActivities = 15; // limit amount of data pulled
const bg_color1 = Color.dynamic(new Color("#fefefe"), new Color("#272727"));
const bg_color2 = Color.dynamic(new Color("#f1f1f1"), new Color("#1d1d1d"));
const title_font = Font.semiboldRoundedSystemFont(26);
const text_font = Font.semiboldRoundedSystemFont(16);
const text_color = Color.dynamic(new Color("#1d1d1d"), new Color("#f1f1f1"));
const text_complete = Color.green();
const text_incomplete = Color.dynamic(Color.lightGray(), Color.lightGray());
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
  g.locations = [
    0, 0.9, 0.91, 0.92, 0.93, 0.94, 0.95, 0.96, 0.97, 0.98, 0.99, 1,
  ];
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
  w.spacing = 2;
  w.backgroundGradient = g;
  // Adding title
  let titleStack = w.addStack();
  titleStack.cornerRadius = 4;
  let wtitle = titleStack.addText(widgetTitle);
  wtitle.font = title_font;
  wtitle.textColor = text_color;
  wtitle.leftAlignText();
  w.addSpacer(5);
  // Getting data
  let garminData = await getFromGarmin(userName, 1, maxActivities);
  let activitiesResults = await getActivities(garminData, timeFrame);
  // Function to generate text
  function pickAndChoose(activities, values, r) {
    const prefix = {
      total: "🔥",
      workout: "🏋️",
      walk: "🚶",
      run: "🏃",
      bike: "🚴",
    };
    const suffix = {
      activities: "★",
      distance: "km",
      duration: "min",
      calories: "kcal",
      activedays: "",
    };
    for (let activity of activities) {
      if (activity.includes("padding")) {
        r.addSpacer(parseInt(activity.split(":")[1]));
      } else {
        r.addText(prefix[activity]);
        for (let value of values) {
          let err = false;
          if (value.includes("padding")) {
            r.addSpacer(parseInt(value.split(":")[1]));
          } else {
            r.addSpacer(5);
            let val;
            if (value == "distance") {
              val = (activitiesResults[activity][value] / 1000)
                .toFixed(2)
                .toString();
            } else if (value == "duration") {
              val = (activitiesResults[activity][value] / 60)
                .toFixed(0)
                .toString();
            } else if (value == "calories" || value == "activities") {
              val = activitiesResults[activity][value].toString();
            } else if (value == "activedays") {
              val = "";
              day_array.forEach(function (day, i) {
                let daytxt = r.addText(day);
                daytxt.font = text_font;
                if (activitiesResults[activity][value].includes(i)) {
                  daytxt.textColor = text_complete;
                } else {
                  daytxt.textColor = text_incomplete;
                }
              });
            } else {
              console.log(
                value +
                  " not supported yet, but please make an issue/suggestion on GitHub 😊"
              );
              err = true;
            }
            if (!err) {
              let valtxt = r.addText(val);
              valtxt.textColor = text_color;
              valtxt.font = text_font;
              let suftxt = r.addText(suffix[value]);
              suftxt.textColor = text_color;
              suftxt.font = text_font;
            }
          }
        }
      }
    }
  }
  // Iterating through data
  let table = w.addStack();
  table.layoutVertically();
  for (const [line, values] of Object.entries(dataLayout)) {
    let row = table.addStack();
    pickAndChoose(values[0], values[1], row);
  }
  w.addSpacer(spacerBottom);
  return w;
}

// Fetch data from garmin
async function getFromGarmin(userName, start = 1, limit = 15) {
  const url =
    "https://connect.garmin.com/proxy/activitylist-service/activities/" +
    userName +
    "?start=" +
    start +
    "&limit=" +
    limit +
    "";
  const request = new Request(url);
  const response = await request.loadJSON();
  return response;
}
// Get day of week
function getDayNum(input) {
  const week = [6, 0, 1, 2, 3, 4, 5];
  if (weekStartsOnSunday) {
    week.push(week.shift());
  }
  let day = new Date(input.replace(" ", "T"));
  return week[day.getDay()];
}
// Function to check if data is within timeframe
function withinTimeframe(days, date) {
  if (days.toString() == "week") {
    const week = [6, 0, 1, 2, 3, 4, 5];
    if (weekStartsOnSunday) {
      week.push(week.shift());
    }
    let firstday = new Date();
    firstday.setHours(0, 0, 1);
    firstday.setDate(firstday.getDate() - week[firstday.getDay()]);
    var daysms = Math.abs(new Date() - firstday);
  } else {
    var daysms = parseInt(days) * (1000 * 3600 * 24);
  }
  var diff = Math.abs(new Date() - new Date(date.replace(/-/g, "/")));
  if (daysms > diff) {
    return true;
  } else {
    return false;
  }
}
// Pulling the data we want
async function getActivities(data, timeFrame) {
  const workoutID = [13]; // typekey: ['strength_training']
  const walkingID = [3, 9]; // typekey: ['hiking', 'walking']
  const runningID = [6, 1]; // typeKey: ['trail_running', 'running']
  const bikingID = [10, 2, 152]; // typekey: ['road_biking', 'cycling', 'virtual_ride']
  let res = {
    total: {
      activities: 0,
      calories: 0,
      distance: 0,
      duration: 0,
      activedays: [],
    },
    workout: {
      activities: 0,
      calories: 0,
      distance: 0,
      duration: 0,
      activedays: [],
    },
    walk: {
      activities: 0,
      calories: 0,
      distance: 0,
      duration: 0,
      activedays: [],
    },
    run: {
      activities: 0,
      calories: 0,
      distance: 0,
      duration: 0,
      activedays: [],
    },
    bike: {
      activities: 0,
      calories: 0,
      distance: 0,
      duration: 0,
      activedays: [],
    },
  };
  for (let activity of data["activityList"]) {
    if (withinTimeframe(timeFrame, activity["startTimeLocal"])) {
      res.total.activities += 1;
      res.total.calories += activity["calories"];
      res.total.distance += activity["distance"];
      res.total.duration += activity["movingDuration"];
      if (
        !res.total.activedays.includes(getDayNum(activity["startTimeLocal"]))
      ) {
        res.total.activedays.push(getDayNum(activity["startTimeLocal"]));
      }
      if (workoutID.includes(activity["activityType"]["typeId"])) {
        res.workout.activities += 1;
        res.workout.calories += activity["calories"];
        res.workout.duration += activity["movingDuration"];
        if (
          !res.workout.activedays.includes(
            getDayNum(activity["startTimeLocal"])
          )
        ) {
          res.workout.activedays.push(getDayNum(activity["startTimeLocal"]));
        }
      } else if (walkingID.includes(activity["activityType"]["typeId"])) {
        res.walk.activities += 1;
        res.walk.calories += activity["calories"];
        res.walk.distance += activity["distance"];
        res.walk.duration += activity["movingDuration"];
        if (
          !res.walk.activedays.includes(getDayNum(activity["startTimeLocal"]))
        ) {
          res.walk.activedays.push(getDayNum(activity["startTimeLocal"]));
        }
      } else if (runningID.includes(activity["activityType"]["typeId"])) {
        res.run.activities += 1;
        res.run.calories += activity["calories"];
        res.run.distance += activity["distance"];
        res.run.duration += activity["movingDuration"];
        if (
          !res.run.activedays.includes(getDayNum(activity["startTimeLocal"]))
        ) {
          res.run.activedays.push(getDayNum(activity["startTimeLocal"]));
        }
      } else if (bikingID.includes(activity["activityType"]["typeId"])) {
        res.bike.activities += 1;
        res.bike.calories += activity["calories"];
        res.bike.distance += activity["distance"];
        res.bike.duration += activity["movingDuration"];
        if (
          !res.bike.activedays.includes(getDayNum(activity["startTimeLocal"]))
        ) {
          res.bike.activedays.push(getDayNum(activity["startTimeLocal"]));
        }
      } else {
        console.log(activity["activityType"]["typeId"]);
        console.log(activity["activityType"]["typeKey"]);
      }
    }
  }
  return res;
}
