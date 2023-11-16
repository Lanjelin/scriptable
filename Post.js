// User config start
// Enter your postcode
const postNr = "4321";
// 0: raw data, 1: text dates, 2: num days
const textStyle = 2;
// Number of dates to show (1-5)
const numDates = 2;
// User config end

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
  let startColor = new Color("#f39c12");
  let endColor = new Color("#e74c3c");
  let gradient = new LinearGradient();
  gradient.colors = [startColor, endColor];
  gradient.locations = [0, 1];
  widget.backgroundGradient = gradient;

  // Add widget heading
  let heading = widget.addText("Post");
  heading.leftAlignText();
  heading.font = Font.boldSystemFont(22);
  heading.textColor = new Color("#1c2d2c");

  // Spacer between heading and values
  widget.addSpacer(5);

  // Fetch values data
  let postJson = await getPostJson();
  let dates = await getDelivery(postJson);

  // Add the values
  moreText(widget, dates[0]);
  i = 1;
  while ( i < numDates ) {
    widget.addSpacer(5);
    moreText(widget, dates[i]);
  }

  // Return the created widget
  return widget;
}

async function getPostJson() {
  // Endpoints
  const endpoints = ['raw', 'text', 'next'];

  // Query url
  const url = "https://post.gn.gy/" + endpoints[textStyle] + "/" + postNr + ".json";

  // Initialize new request
  const request = new Request(url);

  // Execute the request and parse the response as json
  const response = await request.loadJSON();

  // Return the returned data
  return response;
}

function getDelivery(data) {
  // Parse the date
  let date = data.delivery_dates;
  return date;
}
