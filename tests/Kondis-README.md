# Kondis Scriptable widget

`KondisWidget.js` runs on iPhone in [Scriptable](https://scriptable.app/). It fetches upcoming `mainEvents` with Firestore's public `documents:runQuery` REST API. The captured `Listen/channel` URL is a transient browser session (its `SID`/`gsessionid` cannot be reused); the widget does not need it, an API key, or the old Elasticsearch credential.

## Run outside iPhone

Install Node.js 20 or newer, then run from this directory:

```sh
node run-local.mjs
node run-local.mjs running 5000 10000 alle true
node run-local.mjs cycling 20000 100000 oslo false
```

Arguments are sport, minimum distance in metres, maximum distance in metres, county/town (`alle` for any), and whether to show carousel events. The runner executes the **actual widget file** with minimal Scriptable API stand-ins, makes real network requests, and prints the rendered dates, titles and event links. It stores Scriptable files in memory, so it does not modify iCloud or the iPhone. A network connection and public Firestore read access are required. This verifies data fetching/filtering/rendered text, **not** Scriptable's native layout or the iOS appearance; check those in Scriptable's widget preview on an iPhone.

The widget caches successful results for two hours on the phone. Its Firestore cache filename differs from the old Elasticsearch cache so previously saved results will not mask the migration. Settings remain in `kondis/settings.json` in Scriptable's documents directory.
