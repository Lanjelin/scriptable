var username = "lanjelin";

let widget = await createWidget();

// Check where the script is running
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentSmall();
}
Script.complete();

async function createWidget() {
  // Function to spawn text
  function moreText(stack, text) {
    let theText = stack.addText(text);
    theText.leftAlignText();
    theText.font = Font.semiboldSystemFont(16);
    theText.textColor = new Color("#2c3d3c");
  }

  // Create new empty ListWidget instance
  let widget = new ListWidget();
  widget.setPadding(0, 12, 0, 0);

  // Set gradient background
  let startColor = new Color("#e74c3c");
  let endColor = new Color("#f39c12");
  let gradient = new LinearGradient();
  gradient.colors = [startColor, endColor];
  gradient.locations = [0, 1];
  widget.backgroundGradient = gradient;

  // Add widget heading
  let heading = widget.addText("DuinoCoin");
  heading.leftAlignText();
  heading.font = Font.boldSystemFont(22);
  heading.textColor = new Color("#1c2d2c");

  // Spacer between heading and values
  widget.addSpacer(8);

  // Fetch values data
  let duinoJson = await getDuinoJson();
  let ducoStats = await getDucoStats();
  let duinoBalance = getDuinoBalance(duinoJson);
  let duinoValue = getDuinoValue(ducoStats);
  let duinoMiners = getDuinoMiners(duinoJson);
  let duinoRate = getDuinoRate(duinoJson);
  let duinoDiffMiners = getDiffMiners(duinoJson);

  // Add the values
  moreText(widget, "Bal: " + duinoBalance.toFixed(2).toString() + " ᕲ");
  moreText(widget, "    ~$ " + (duinoValue * duinoBalance).toFixed(4));

  widget.addSpacer(8);

  moreText(
    widget,
    "Miners: " +
      duinoDiffMiners[0] +
      "/" +
      duinoDiffMiners[1] +
      "/" +
      duinoDiffMiners[2]
  );
  moreText(widget, "Rate: " + duinoRate + "H/s");

  // Return the created widget
  return widget;
}

async function getDuinoJson() {
  // Query url
  const url = "https://server.duinocoin.com/users/" + username;
  // Initialize new request
  const request = new Request(url);
  // Execute the request and parse the response as json
  const response = await request.loadJSON();
  // Return the returned data
  return response;
}

async function getDucoStats() {
  // Query url
  //   const url = "https://duco.sytes.net/statistics.json";
  const url = "https://server.duinocoin.com/statistics";
  // Initialize new request
  const request = new Request(url);
  // Execute the request and parse the response as json
  const response = await request.loadJSON();
  // Return the returned data
  return response;
}

function getDuinoBalance(duinoJson) {
  // Parse the balance
  const balance = duinoJson.result.balance.balance;
  return balance;
}

function getDuinoValue(dStats) {
  // Parse the balance
  const value = dStats["Duco price"];
  return value;
}

function getDuinoMiners(duinoJson) {
  // Parse active miners
  const miners = duinoJson.result.miners.length;
  return miners;
}

function getDiffMiners(duinoJson) {
  let esp = 0;
  let avr = 0;
  let pc = 0;
  let oth = 0;
  for (var i = 0; i < duinoJson.result.miners.length; i++) {
    let soft = duinoJson.result.miners[i].software;
    if (soft.includes("ESP")) {
      esp += 1;
    } else if (soft.includes("AVR")) {
      avr += 1;
    } else if (soft.includes("PC")) {
      pc += 1;
    } else {
      oth += 1;
    }
  }
  return [avr, esp, pc, oth];
}

function getDuinoRate(duinoJson) {
  // Parse mining rate
  let rate = 0;
  for (var i = 0; i < duinoJson.result.miners.length; i++) {
    rate += duinoJson.result.miners[i].hashrate;
  }
  // We want SI Symbols
  suffRate = abbreviateNumber(rate);
  return suffRate;
}

function abbreviateNumber(number) {
  var SI_SYMBOL = ["", "k", "M", "G", "T", "P", "E"];
  // what tier? (determines SI symbol)
  var tier = (Math.log10(Math.abs(number)) / 3) | 0;
  // if zero, we don't need a suffix
  if (tier == 0) return number;
  // get suffix and determine scale
  var suffix = SI_SYMBOL[tier];
  var scale = Math.pow(10, tier * 3);
  // scale the number
  var scaled = number / scale;
  // format number and add suffix
  return scaled.toFixed(1) + suffix;
}
