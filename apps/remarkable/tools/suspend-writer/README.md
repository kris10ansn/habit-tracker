# suspend-writer

A host-side spike that renders the reMarkable suspend image **outside** the QML app. It hosts the
app's own `src/js/SuspendDraw.js` in a `QJSEngine` with a thin QPainter-backed Canvas2D shim, so the
exact same renderer the app uses produces a PNG — no QML, no device.

Proof of concept only: no settings/opt-in check, no backup, no `.sleep-sig` dedup. It always writes.

## Build & run

```sh
./build.sh                                    # host build via pkg-config (Qt5Core/Gui/Qml) + moc
./suspend-writer --roster <roster.json> [--month <YYYY-MM.json>] [--today YYYY-MM-DD] [--out suspended.png]
```

| Flag       | Required | Default       | Notes                                                       |
| ---------- | -------- | ------------- | ----------------------------------------------------------- |
| `--roster` | yes      | —             | Roster file (identity + config + display order).            |
| `--month`  | no       | `{}`          | The month whose entries to draw. Omitted → an empty grid.   |
| `--today`  | no       | system date   | `YYYY-MM-DD`. Sets which day is highlighted and the cutoff. |
| `--out`    | no       | `suspended.png` | Output PNG path.                                           |

## Input JSON shapes

These are the **same files the app's stores write** under its `data/` dir. ADR
[`0002-month-partitioned-habit-storage.md`](../../docs/adr/0002-month-partitioned-habit-storage.md)
is the source of truth; the tool reads the same envelopes (`roster.habits`, `month.entries`) and
degrades to empty if either is missing or malformed.

**`roster.json`** — identity + config, no entries. Array order is display order:

```json
{
  "habits": [
    { "id": "<habitId>", "name": "Read", "negative": false, "hideFromSleep": false, "updatedAt": 1782148800000 }
  ]
}
```

- `negative` — polarity. A negative habit defaults to marked (X) and is *cleared* with `o`.
- `hideFromSleep` — when `true`, the habit is omitted from the suspend image.

**`YYYY-MM.json`** — one month's entries, keyed by habit id then by date. Each cell is
`{ state, updatedAt }`; `state` is `"x"` (marked), `"o"` (explicitly cleared), or `""` (tombstone):

```json
{
  "month": "2026-06",
  "entries": {
    "<habitId>": {
      "2026-06-01": { "state": "x", "updatedAt": 1782148800000 }
    }
  }
}
```

The tool flattens each cell to its `state` string and drops empties — mirroring
`HabitsModel.toArray` / `statesOf`, the projection `SuspendDraw` expects. Entry ids absent from the
roster are ignored (orphans never render), matching the app's fold-by-id.

## How the JS is reused

`QJSEngine` is not a full QML JS runtime, so `main.cpp`:

- strips QML's `.import` / `.pragma` lines and IIFE-wraps each module to return its named exports,
  mirroring `import "X.js" as X`;
- supplies a minimal `Qt.formatDate` stand-in (the only QML global `DateUtils.js` reaches);
- injects file contents as engine globals (`rosterJson`, `monthJson`) parsed with `JSON.parse` —
  never string-concatenated into source, so quotes/newlines in data can't break the script.

Text fidelity caveat: host `sans-serif` ≠ the device font, so this validates layout and logic, not
pixel-exact device output.
