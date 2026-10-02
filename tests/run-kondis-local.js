// Run the widget in Node with small Scriptable API stand-ins; network calls are real.
// Usage: node run-local.mjs [sport] [minMetres] [maxMetres] [location] [carousel]
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import vm from "node:vm";

const settings = [
  process.argv[2] || "running",
  Number(process.argv[3] || 5000),
  Number(process.argv[4] || 10000),
  process.argv[5] || "rogaland",
  process.argv[6] === "true",
];
const dir = join(tmpdir(), "kondis-widget");
const entries = [];
let widget;
class Stack {
  addStack() { return new Stack(); }
  addImage() { return { url: null }; }
  addText(text) {
    const entry = { text, url: null };
    entries.push(entry);
    return entry;
  }
  addSpacer() {}
  layoutVertically() {}
}
class ListWidget extends Stack {
  setPadding() {}
}
class Request {
  constructor(url) {
    this.url = url;
    this.method = "GET";
    this.headers = {};
  }
  async loadJSON() {
    const response = await fetch(this.url, {
      method: this.method,
      headers: this.headers,
      body: this.body,
    });
    if (!response.ok) throw new Error(`${this.url}: HTTP ${response.status}: ${await response.text()}`);
    return response.json();
  }
  async loadImage() {
    const response = await fetch(this.url);
    if (!response.ok) throw new Error(`${this.url}: HTTP ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }
}
// Scriptable's FileManager is synchronous; keep its cache in memory.
const files = new Map();
const scriptableFiles = {
  documentsDirectory: () => dir,
  joinPath: (base, name) => join(base, name),
  createDirectory() {},
  fileExists: (path) => files.has(path),
  downloadFileFromiCloud: async () => {},
  readString: (path) => files.get(path),
  writeString: (path, data) => files.set(path, data),
  readImage: (path) => files.get(path),
  writeImage: (path, data) => files.set(path, data),
};
const context = vm.createContext({
  module: { filename: join(dir, "KondisWidget.js") },
  config: { runsInWidget: true, widgetFamily: "large" },
  args: { queryParameters: {} },
  FileManager: { local: () => scriptableFiles, iCloud: () => scriptableFiles },
  Script: { setWidget: (value) => { widget = value; }, complete() {} },
  Color: Object.assign(class { constructor(value) { this.value = value; } }, { dynamic: (light) => light }),
  Font: { semiboldRoundedSystemFont: (size) => size },
  Size: class { constructor(width, height) { this.width = width; this.height = height; } },
  LinearGradient: class {},
  ListWidget,
  Request,
  Date,
  console,
});
{
  scriptableFiles.writeString(join(dir, "kondis", "settings.json"), JSON.stringify([
    settings[0], settings[1], settings[2], settings[4], settings[3],
  ]));
  const source = await readFile(new URL("./KondisWidget.js", import.meta.url), "utf8");
  await vm.runInContext(`(async () => { ${source}\n})()`, context, { filename: "KondisWidget.js" });
  if (!widget) throw new Error("Widget was not created");
  const events = entries.filter((entry) => entry.url);
  for (const event of events) {
    const date = entries[entries.indexOf(event) - 1]?.text;
    console.log(`${date}  ${event.text}  ${event.url}`);
  }
  console.log(`Rendered ${events.length} events for ${settings[0]} in ${settings[3]}`);
}
