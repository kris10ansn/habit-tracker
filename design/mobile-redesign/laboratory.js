// Ten deliberately extreme visual systems for the throwaway redesign prototype.
const labIcon = (name) =>
    `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const labStatus = (right = "● ◔ 100%") =>
    `<div class="phone-status"><b>9:41</b><span>${right}</span></div>`;
const labHeader = (eyebrow, title, action = "", back = true) =>
    `<div class="app-header ${back ? "has-back" : ""}">${back ? `<button class="bare-icon">${labIcon("arrow-left")}</button>` : ""}<div><span>${eyebrow}</span><h4>${title}</h4></div>${action ? `<button class="header-action">${action}</button>` : ""}</div>`;
const labNav = (items, active) =>
    `<nav class="mobile-nav">${items.map(([id, glyph, label]) => `<span class="${id === active ? "active" : ""}">${labIcon(glyph)}<small>${label}</small></span>`).join("")}</nav>`;

const mixNav = [
    ["today", "home", "PLAY"],
    ["month", "chart", "ALBUM"],
    ["settings", "more", "DECK"],
];
const mixtapeScreens = [
    {
        id: "today",
        title: "Today",
        kicker: "The day as a five-track playlist",
        body: `${labStatus("STEREO ▰▰▰")}<div class="app-content mix-content"><div class="mix-brand"><b>HABIT HI-FI</b><span>SEP 03 / SIDE A</span></div><section class="mix-player"><small>NOW PLAYING · TRACK 03</small><h4>JOURNAL</h4><div class="mix-reel"><i></i><i></i><em></em></div><p>03:20 / 20:00</p><div class="mix-controls"><button>↶</button><button class="play">▶</button><button>↷</button></div></section><div class="mix-tracks"><div class="played"><span>01</span><b>MORNING WALK</b><i>✓</i></div><div class="played"><span>02</span><b>READ 20 MIN</b><i>✓</i></div><div class="active"><span>03</span><b>JOURNAL</b><i>▶</i></div><div class="played"><span>04</span><b>NO SUGAR</b><i>✓</i></div><div><span>05</span><b>STRETCH</b><i>—</i></div></div></div>${labNav(mixNav, "today")}`,
    },
    {
        id: "month",
        title: "Month",
        kicker: "Monthly consistency as an album waveform",
        body: `${labStatus("STEREO ▰▰▰")}<div class="app-content mix-content"><div class="mix-brand"><b>MONTHLY ALBUM</b><span>SEP ’26</span></div><div class="mix-album-head"><div class="mix-cover"><i></i><b>76</b></div><p><small>HABIT / VOLUME 09</small><h4>September<br />Sessions</h4><span>5 tracks · 30 days</span></p></div><div class="mix-wave">${Array(
            31,
        )
            .fill(0)
            .map(
                (_, i) =>
                    `<i style="height:${8 + ((i * 13) % 37)}px" class="${i < 20 ? "on" : ""}"></i>`,
            )
            .join(
                "",
            )}</div><div class="mix-album-list"><div><span>A1</span><b>Morning walk</b><i>92%</i></div><div><span>A2</span><b>Read 20 min</b><i>82%</i></div><div><span>A3</span><b>Journal</b><i>48%</i></div><div><span>B1</span><b>No sugar</b><i>88%</i></div><div><span>B2</span><b>Stretch</b><i>66%</i></div></div></div>${labNav(mixNav, "month")}`,
    },
    {
        id: "habits",
        title: "Habits",
        kicker: "An editable track list",
        body: `${labStatus("STEREO ▰▰▰")}<div class="app-content mix-content">${labHeader("THE DECK", "Track library", "EDIT")}<div class="mix-library">${[
            ["01", "Morning walk", "03:20"],
            ["02", "Read 20 min", "20:00"],
            ["03", "Journal", "05:00"],
            ["04", "No sugar", "AVOID"],
            ["05", "Stretch", "08:00"],
        ]
            .map(
                (x) =>
                    `<div><span>${x[0]}</span><p><b>${x[1]}</b><small>${x[2]}</small></p><i>≡</i></div>`,
            )
            .join(
                "",
            )}</div><button class="mix-primary">+ RECORD NEW TRACK</button><p class="mix-note">EDIT exposes reorder, polarity, archive, and delete like controls on a mixing desk.</p></div>`,
    },
    {
        id: "sync",
        title: "Sync",
        kicker: "Sync as dubbing between decks",
        body: `${labStatus("STEREO ▰▰▰")}<div class="app-content mix-content">${labHeader("THE DECK", "Cloud dub")}<section class="mix-sync"><div class="mix-tape"><i></i><i></i><span>MASTER</span></div><b>DUB COMPLETE</b><p>Both decks match · 09:41</p></section><div class="mix-meters"><span><i style="height:80%"></i><b>PHONE</b></span><span><i style="height:80%"></i><b>CLOUD</b></span><span><i style="height:80%"></i><b>TABLET</b></span></div><button class="mix-primary">↻ DUB AGAIN</button><div class="mix-menu"><span>AUTO-DUB <b>ON</b></span><span>CONNECTED DECKS <b>02 →</b></span><span>ACCOUNT <b>KRISTIAN@… →</b></span><span>ADVANCED SERVER <b>→</b></span></div></div>${labNav(mixNav, "settings")}`,
    },
    {
        id: "devices",
        title: "Linked devices",
        kicker: "Every device is a playback deck",
        body: `${labStatus("STEREO ▰▰▰")}<div class="app-content mix-content">${labHeader("CLOUD DUB", "Connected decks", "+ ADD")}<div class="mix-decks"><section><div class="mix-mini-reel"><i></i><i></i></div><small>DECK A · MASTER</small><h4>Pixel 9</h4><p>Playing now</p><b>LIVE</b></section><section><div class="mix-mini-reel"><i></i><i></i></div><small>DECK B</small><h4>reMarkable 2</h4><p>Last played 8m ago</p><b>SYNCED</b></section></div><p class="mix-note">Ejecting a deck stops future dubbing but leaves its recording intact.</p></div>`,
    },
    {
        id: "link",
        title: "Link device",
        kicker: "Pairing as making a dub",
        body: `${labStatus("STEREO ▰▰▰")}<div class="app-content mix-content">${labHeader("CONNECTED DECKS", "Make a dub")}<div class="mix-cassette"><i></i><i></i><b>T4M 9QK</b><span>HABIT MIX / SIDE B</span></div><section class="mix-found"><small>DECK DETECTED</small><b>reMarkable 2</b><p>Code expires in 04:32</p></section><button class="mix-primary">START DUBBING →</button><button class="mix-outline">SCAN CASSETTE QR</button></div>`,
    },
];

const weatherNav = [
    ["today", "home", "NOW"],
    ["month", "calendar", "CLIMATE"],
    ["settings", "settings", "SOURCES"],
];
const weatherScreens = [
    {
        id: "today",
        title: "Today",
        kicker: "Habits create a personal weather system",
        body: `${labStatus("18°  ☁  100%")}<div class="app-content weather-content"><div class="wx-top"><span>OSLO · THU 03 SEP</span><button>${labIcon("cloud-check")}</button></div><section class="wx-sky"><div class="wx-sun"></div><i class="cloud c1"></i><i class="cloud c2"></i><div class="rain"></div><h4>Partly<br />accomplished.</h4><p>3 of 5 habits · clearing later</p></section><div class="wx-hourly"><span><small>WALK</small><b>☀</b><i>done</i></span><span><small>READ</small><b>☀</b><i>done</i></span><span><small>JOURNAL</small><b>☁</b><i>open</i></span><span><small>SUGAR</small><b>☀</b><i>clear</i></span><span><small>STRETCH</small><b>☂</b><i>open</i></span></div><section class="wx-next"><span>☁</span><p><small>NEXT WEATHER EVENT</small><b>Journal may clear the afternoon.</b></p><button>MARK</button></section></div>${labNav(weatherNav, "today")}`,
    },
    {
        id: "month",
        title: "Month",
        kicker: "A climate map instead of a spreadsheet",
        body: `${labStatus("18°  ☁  100%")}<div class="app-content weather-content"><div class="wx-top"><span>PERSONAL CLIMATE</span><button>SEP ’26⌄</button></div><div class="wx-climate-head"><p><small>MONTHLY OUTLOOK</small><h4>Mostly steady</h4><span>76% consistency</span></p><b>☀</b></div><div class="wx-calendar"><header><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></header><main>${["", "☀", "☀", "⛅", "☁", "☁", "☂", "☀", "☀", "☂", "☀", "⛅", "☁", "☁", "☀", "⛅", "☀", "☁", "☀", "☁", "☂", "☀", "☀", "☀", "⛅", "☀", "☁", "☁", "☀", "☀", "⛅", "", "", "", ""].map((x, i) => `<i class="${i === 3 ? "today" : ""}"><small>${i ? ((i - 1) % 30) + 1 : ""}</small><b>${x}</b></i>`).join("")}</main></div><div class="wx-forecast"><span><b>12</b><small>sunny streak</small></span><span><b>3</b><small>storm days</small></span><span><b>+8%</b><small>warmer</small></span></div></div>${labNav(weatherNav, "month")}`,
    },
    {
        id: "habits",
        title: "Habits",
        kicker: "Each habit is a weather source",
        body: `${labStatus("18°  ☁  100%")}<div class="app-content weather-content">${labHeader("WEATHER SOURCES", "Your habits", "EDIT")}<p class="wx-intro">Five forces shape your daily forecast.</p><div class="wx-sources">${[
            ["☀", "Morning walk", "warm front"],
            ["◐", "Read 20 minutes", "clear skies"],
            ["☁", "Journal", "pressure system"],
            ["◇", "No sugar", "protective high"],
            ["∿", "Stretch", "light breeze"],
        ]
            .map(
                (x) =>
                    `<div><span>${x[0]}</span><p><b>${x[1]}</b><small>${x[2]}</small></p><em>›</em></div>`,
            )
            .join(
                "",
            )}</div><button class="wx-primary">${labIcon("plus")} Add weather source</button><p class="wx-foot">Edit mode reveals the technical controls without changing the forecast view.</p></div>`,
    },
    {
        id: "sync",
        title: "Sync",
        kicker: "Sync as a forecast network",
        body: `${labStatus("18°  ☁  100%")}<div class="app-content weather-content">${labHeader("SOURCES · DATA", "Forecast network")}<section class="wx-radar"><i></i><i></i><i></i><span>${labIcon("cloud-check")}</span><b>ALL CLEAR</b><small>Updated just now</small></section><div class="wx-network"><div><p><b>Automatic updates</b><small>After every weather event</small></p><i class="toggle on"></i></div><div><p><b>Weather stations</b><small>2 devices reporting</small></p><span>›</span></div><div><p><b>Observer account</b><small>kristian@example.com</small></p><span>›</span></div><div><p><b>Advanced endpoint</b><small>Custom server</small></p><span>›</span></div></div><button class="wx-primary">Refresh forecast</button></div>${labNav(weatherNav, "settings")}`,
    },
    {
        id: "devices",
        title: "Linked devices",
        kicker: "Devices become reporting stations",
        body: `${labStatus("18°  ☁  100%")}<div class="app-content weather-content">${labHeader("FORECAST NETWORK", "Weather stations", "+ ADD")}<div class="wx-stations"><section><div class="wx-station-pin">${labIcon("phone")}</div><small>STATION 01 · HERE</small><h4>Pixel 9</h4><p>Reporting now · 18°C</p><i>LIVE</i></section><section><div class="wx-station-pin">${labIcon("tablet")}</div><small>STATION 02 · E-INK</small><h4>reMarkable 2</h4><p>Last report 8 minutes ago</p><i>CALM</i></section></div><section class="wx-advisory"><b>ACCESS ADVISORY</b><p>Removing a station stops future reports. It cannot clear data already stored there.</p></section></div>`,
    },
    {
        id: "link",
        title: "Link device",
        kicker: "Pairing as adding a weather station",
        body: `${labStatus("18°  ☁  100%")}<div class="app-content weather-content">${labHeader("WEATHER STATIONS", "Add station")}<div class="wx-beacon"><i></i><i></i><span>${labIcon("scan")}</span></div><h4 class="wx-center">Find its signal.</h4><p class="wx-copy">Scan the QR weather beacon shown on the other device.</p><button class="wx-primary">Open scanner</button><div class="wx-code">OR ENTER <b>T4M 9QK</b></div><p class="wx-foot">You’ll verify the station name before it joins the network.</p></div>`,
    },
];

const houseNav = [
    ["today", "home", "HOME"],
    ["month", "calendar", "HISTORY"],
    ["settings", "settings", "KEYS"],
];
const houseScreens = [
    {
        id: "today",
        title: "Today",
        kicker: "Your routine lives in a tiny house",
        body: `${labStatus("HOME ● 100%")}<div class="app-content house-content"><div class="hh-top"><span>03 SEP · AT HOME</span><button>${labIcon("cloud-check")}</button></div><h4>Walk through<br />your day.</h4><div class="hh-house"><div class="roof"></div><section class="room kitchen done"><span>☀</span><b>WALK</b><i>✓</i></section><section class="room study done"><span>▤</span><b>READ</b><i>✓</i></section><section class="room attic"><span>✎</span><b>JOURNAL</b><i>○</i></section><section class="room pantry done"><span>◇</span><b>NO SUGAR</b><i>✓</i></section><section class="room studio"><span>∿</span><b>STRETCH</b><i>○</i></section><div class="door">3 / 5</div></div><p class="hh-hint">Tap a room to enter it. Lit windows are complete.</p></div>${labNav(houseNav, "today")}`,
    },
    {
        id: "month",
        title: "Month",
        kicker: "A floor plan of monthly consistency",
        body: `${labStatus("HOME ● 100%")}<div class="app-content house-content">${labHeader("HOUSE HISTORY", "September", "2026⌄", false)}<div class="hh-overview"><p><small>HOUSE CONDITION</small><b>76% lived in</b><span>+8% from August</span></p><div class="tiny-house"><i></i><i></i></div></div><div class="hh-floorplan">${[
            ["PORCH", "Morning walk", "92%"],
            ["STUDY", "Read 20 min", "82%"],
            ["ATTIC", "Journal", "48%"],
            ["PANTRY", "No sugar", "88%"],
            ["STUDIO", "Stretch", "66%"],
        ]
            .map(
                (x, i) =>
                    `<section class="r${i}"><small>${x[0]}</small><b>${x[1]}</b><span>${x[2]}</span><div>${Array(
                        12,
                    )
                        .fill(0)
                        .map(
                            (_, j) =>
                                `<i class="${j < (i === 2 ? 5 : 9) ? "on" : ""}"></i>`,
                        )
                        .join("")}</div></section>`,
            )
            .join(
                "",
            )}</div><p class="hh-hint">Open a room to see all 30 days.</p></div>${labNav(houseNav, "month")}`,
    },
    {
        id: "habits",
        title: "Habits",
        kicker: "A room directory, not an edit form",
        body: `${labStatus("HOME ● 100%")}<div class="app-content house-content">${labHeader("HOUSE KEYS", "Room directory", "RENOVATE")}<p class="hh-intro">Five rooms are currently part of your routine.</p><div class="hh-directory">${[
            ["01", "Porch", "Morning walk"],
            ["02", "Study", "Read 20 minutes"],
            ["03", "Attic", "Journal"],
            ["04", "Pantry", "No sugar · avoid"],
            ["05", "Studio", "Stretch"],
        ]
            .map(
                (x) =>
                    `<div><span>${x[0]}</span><p><small>${x[1]}</small><b>${x[2]}</b></p><em>›</em></div>`,
            )
            .join(
                "",
            )}</div><button class="hh-primary">${labIcon("plus")} Add a room</button><p class="hh-hint">Renovate mode reveals rename, reorder, polarity, archive, and demolition.</p></div>`,
    },
    {
        id: "sync",
        title: "Sync",
        kicker: "Sync as a connected smart home",
        body: `${labStatus("HOME ● 100%")}<div class="app-content house-content">${labHeader("HOUSE KEYS · DATA", "Connected home")}<section class="hh-sync-house"><div class="roof"></div><div class="body">${labIcon("cloud-check")}<span></span><span></span></div><h4>Everything is home.</h4><p>Synced just now</p></section><div class="hh-home-menu"><div><span>${labIcon("refresh")}</span><p><b>Automatic homecoming</b><small>Sync after each change</small></p><i class="toggle on"></i></div><div><span>${labIcon("devices")}</span><p><b>Homes & devices</b><small>2 connected places</small></p><em>›</em></div><div><span>${labIcon("user")}</span><p><b>Key holder</b><small>kristian@example.com</small></p><em>›</em></div></div><button class="hh-primary">Bring everything home now</button></div>${labNav(houseNav, "settings")}`,
    },
    {
        id: "devices",
        title: "Linked devices",
        kicker: "Every device is another home",
        body: `${labStatus("HOME ● 100%")}<div class="app-content house-content">${labHeader("CONNECTED HOME", "Places", "+ KEY")}<div class="hh-places"><section><div class="tiny-home"><i></i><i></i></div><small>PRIMARY HOME</small><h4>Pixel 9</h4><p>Occupied now</p><b>THIS PLACE</b></section><section><div class="tiny-home tablet"><i></i><i></i></div><small>SECOND HOME</small><h4>reMarkable 2</h4><p>Visited 8 minutes ago</p><button>${labIcon("more")}</button></section></div><p class="hh-hint">Take away a key to stop future sync without erasing what is already inside.</p></div>`,
    },
    {
        id: "link",
        title: "Link device",
        kicker: "Pairing as handing over a key",
        body: `${labStatus("HOME ● 100%")}<div class="app-content house-content">${labHeader("PLACES", "Make a key")}<div class="hh-key"><i></i><b>T4M9QK</b><span>HABIT HOUSE</span></div><section class="hh-visitor"><span>${labIcon("tablet")}</span><p><small>AT THE DOOR</small><b>reMarkable 2</b><em>Code expires in 04:32</em></p></section><button class="hh-primary">Hand over key</button><button class="hh-outline">Scan key QR instead</button><p class="hh-hint">Only approve a device you recognize.</p></div>`,
    },
];

const missionNav = [
    ["today", "home", "OPS"],
    ["month", "chart", "MISSION"],
    ["settings", "settings", "SYSTEMS"],
];
const missionScreens = [
    {
        id: "today",
        title: "Today",
        kicker: "Daily habits as a launch sequence",
        body: `${labStatus("T+09:41  LINK")}<div class="app-content mission-content"><div class="mc-top"><b>HABIT CONTROL</b><span>03 SEP 2026</span><i>● NOMINAL</i></div><div class="mc-mission"><small>MISSION DAY 247</small><h4>LAUNCH<br />SEQUENCE</h4><div><b>60%</b><span>3 / 5 SYSTEMS GO</span></div></div><div class="mc-checklist"><div class="go"><span>SYS-01</span><b>MORNING WALK</b><i>GO</i></div><div class="go"><span>SYS-02</span><b>READ 20 MIN</b><i>GO</i></div><div><span>SYS-03</span><b>JOURNAL</b><i>HOLD</i></div><div class="go"><span>SYS-04</span><b>NO SUGAR</b><i>GO</i></div><div><span>SYS-05</span><b>STRETCH</b><i>HOLD</i></div></div><button class="mc-launch">MARK NEXT SYSTEM GO</button></div>${labNav(missionNav, "today")}`,
    },
    {
        id: "month",
        title: "Month",
        kicker: "Month review as mission telemetry",
        body: `${labStatus("T+09:41  LINK")}<div class="app-content mission-content"><div class="mc-top"><b>MISSION HISTORY</b><span>SEP 2026</span><i>● LIVE</i></div><div class="mc-telemetry-head"><p><small>MISSION SUCCESS</small><b>76.4%</b><span>+8.2 Δ</span></p><div class="mc-globe"><i></i></div></div><div class="mc-telemetry">${[
            ["WALK", 92],
            ["READ", 82],
            ["JOURNAL", 48],
            ["NO SUGAR", 88],
            ["STRETCH", 66],
        ]
            .map(
                (x, i) =>
                    `<section><header><b>${x[0]}</b><span>${x[1]}%</span></header><div>${Array(
                        30,
                    )
                        .fill(0)
                        .map(
                            (_, j) =>
                                `<i class="${j < 20 && (j + i) % 5 ? "go" : ""}"></i>`,
                        )
                        .join("")}</div></section>`,
            )
            .join(
                "",
            )}</div><div class="mc-event"><b>ANOMALY</b><p>Journal signal lost on 09 SEP.</p><span>REVIEW →</span></div></div>${labNav(missionNav, "month")}`,
    },
    {
        id: "habits",
        title: "Habits",
        kicker: "Habits as onboard systems",
        body: `${labStatus("T+09:41  LINK")}<div class="app-content mission-content">${labHeader("SYSTEMS", "Payload manifest", "CONFIG")}<div class="mc-manifest">${[
            ["01", "MORNING WALK", "NOMINAL"],
            ["02", "READ 20 MIN", "NOMINAL"],
            ["03", "JOURNAL", "WATCH"],
            ["04", "NO SUGAR", "NOMINAL"],
            ["05", "STRETCH", "WATCH"],
        ]
            .map(
                (x) =>
                    `<div><span>${x[0]}</span><p><b>${x[1]}</b><small>${x[2]}</small></p><i>›</i></div>`,
            )
            .join(
                "",
            )}</div><button class="mc-launch">+ ADD SYSTEM</button><p class="mc-foot">CONFIG mode enables order, polarity, archive, and deletion controls.</p></div>`,
    },
    {
        id: "sync",
        title: "Sync",
        kicker: "Sync as ground-station telemetry",
        body: `${labStatus("T+09:41  LINK")}<div class="app-content mission-content">${labHeader("SYSTEMS · DATA", "Telemetry link")}<section class="mc-link"><div class="mc-globe large"><i></i></div><span class="beam"></span><div class="satellite-icon">${labIcon("cloud-check")}</div><b>LINK ESTABLISHED</b><small>0 packets pending · just now</small></section><div class="mc-console"><div><span>AUTO LINK</span><b>ENABLED</b></div><div><span>GROUND STATIONS</span><b>02 →</b></div><div><span>OPERATOR</span><b>KRISTIAN@… →</b></div><div><span>ENDPOINT</span><b>DEFAULT →</b></div></div><button class="mc-launch">↻ TRANSMIT NOW</button></div>${labNav(missionNav, "settings")}`,
    },
    {
        id: "devices",
        title: "Linked devices",
        kicker: "Devices as ground stations",
        body: `${labStatus("T+09:41  LINK")}<div class="app-content mission-content">${labHeader("TELEMETRY LINK", "Ground stations", "+ LINK")}<div class="mc-stations"><section><header><span>GS-01</span><i>● ONLINE</i></header><div>${labIcon("phone")}</div><h4>PIXEL 9</h4><p>PRIMARY · NOW</p></section><section><header><span>GS-02</span><i>● ONLINE</i></header><div>${labIcon("tablet")}</div><h4>REMARKABLE 2</h4><p>LAST CONTACT · 8M</p></section></div><div class="mc-event neutral"><b>SECURITY</b><p>Revoking a station ends future telemetry. Local data stays aboard.</p></div></div>`,
    },
    {
        id: "link",
        title: "Link device",
        kicker: "Pairing as authorizing a ground station",
        body: `${labStatus("T+09:41  LINK")}<div class="app-content mission-content">${labHeader("GROUND STATIONS", "Authorize station")}<div class="mc-auth-code"><small>AUTHORIZATION TOKEN</small><b>T4M<br />9QK</b><span>EXPIRES T−04:32</span></div><section class="mc-request"><i>●</i><p><small>INCOMING STATION</small><b>REMARKABLE 2</b></p><span>IDENTIFIED</span></section><button class="mc-launch">AUTHORIZE LINK →</button><button class="mc-secondary">SCAN OPTICAL CODE</button></div>`,
    },
];

const ritualNav = [
    ["today", "spark", "DRAW"],
    ["month", "calendar", "SPREAD"],
    ["settings", "more", "DECK"],
];
const ritualScreens = [
    {
        id: "today",
        title: "Today",
        kicker: "Draw one symbolic habit at a time",
        body: `${labStatus("☽  100%")}<div class="app-content ritual-content"><div class="rd-top"><span>THE DAILY DRAW · III</span><button>${labIcon("cloud-check")}</button></div><div class="rd-card"><small>III · THE SCRIBE</small><div class="rd-symbol">✦<i></i><i></i></div><h4>JOURNAL</h4><p>Make a small mark<br />and the day remembers.</p><footer><span>2 DAY THREAD</span><b>OPEN</b></footer></div><div class="rd-dots"><i class="done"></i><i class="done"></i><i class="active"></i><i class="done"></i><i></i></div><button class="rd-primary">TURN THE CARD ✓</button><button class="rd-text">Draw another habit →</button></div>${labNav(ritualNav, "today")}`,
    },
    {
        id: "month",
        title: "Month",
        kicker: "A monthly spread of symbolic cards",
        body: `${labStatus("☽  100%")}<div class="app-content ritual-content"><div class="rd-top"><span>THE MONTHLY SPREAD</span><button>SEP ’26</button></div><h4 class="rd-title">The shape of<br />September</h4><div class="rd-spread"><section class="c1"><small>I</small><span>☀</span><b>WALK</b><i>92%</i></section><section class="c2"><small>II</small><span>◐</span><b>READ</b><i>82%</i></section><section class="c3"><small>III</small><span>✦</span><b>JOURNAL</b><i>48%</i></section><section class="c4"><small>IV</small><span>◇</span><b>NO SUGAR</b><i>88%</i></section><section class="c5"><small>V</small><span>∿</span><b>STRETCH</b><i>66%</i></section></div><section class="rd-reading"><small>THE READING</small><p>Your mornings are aligned. The Scribe asks for attention.</p></section></div>${labNav(ritualNav, "month")}`,
    },
    {
        id: "habits",
        title: "Habits",
        kicker: "A deck rather than a management list",
        body: `${labStatus("☽  100%")}<div class="app-content ritual-content">${labHeader("THE DECK", "Five rituals", "ARRANGE")}<div class="rd-deck">${[
            ["I", "☀", "Morning walk"],
            ["II", "◐", "Read 20 minutes"],
            ["III", "✦", "Journal"],
            ["IV", "◇", "No sugar · avoid"],
            ["V", "∿", "Stretch"],
        ]
            .map(
                (x) =>
                    `<div><small>${x[0]}</small><span>${x[1]}</span><b>${x[2]}</b></div>`,
            )
            .join(
                "",
            )}</div><button class="rd-primary">+ CREATE A CARD</button><p class="rd-note">Arrange reveals the practical controls. The symbolic deck stays clean the rest of the time.</p></div>`,
    },
    {
        id: "sync",
        title: "Sync",
        kicker: "Sync as sealing a shared archive",
        body: `${labStatus("☽  100%")}<div class="app-content ritual-content">${labHeader("THE DECK · DATA", "The archive")}<section class="rd-seal"><i></i><span>${labIcon("cloud-check")}</span><b>THE ARCHIVE IS WHOLE</b><small>Sealed just now</small></section><div class="rd-archive-menu"><div><p><b>Automatic sealing</b><small>After each change</small></p><i class="toggle on"></i></div><div><p><b>Linked readers</b><small>2 devices</small></p><span>›</span></div><div><p><b>Keeper</b><small>kristian@example.com</small></p><span>›</span></div><div><p><b>Hidden workings</b><small>Custom server</small></p><span>›</span></div></div><button class="rd-primary">SEAL AGAIN</button></div>${labNav(ritualNav, "settings")}`,
    },
    {
        id: "devices",
        title: "Linked devices",
        kicker: "Devices as readers of the same deck",
        body: `${labStatus("☽  100%")}<div class="app-content ritual-content">${labHeader("THE ARCHIVE", "Linked readers", "+ INVITE")}<div class="rd-readers"><section><small>THE NEAR READER</small><span>${labIcon("phone")}</span><h4>Pixel 9</h4><p>This reader · now</p><i>BOUND</i></section><section><small>THE PAPER READER</small><span>${labIcon("tablet")}</span><h4>reMarkable 2</h4><p>Last opened 8m ago</p><i>BOUND</i></section></div><p class="rd-note">Unbinding a reader ends future access without erasing its local cards.</p></div>`,
    },
    {
        id: "link",
        title: "Link device",
        kicker: "A theatrical but explicit approval ritual",
        body: `${labStatus("☽  100%")}<div class="app-content ritual-content">${labHeader("LINKED READERS", "Bind a reader")}<div class="rd-code"><small>THE SIX SIGNS</small><b>T 4 M<br />9 Q K</b><span>04:32 REMAINS</span></div><section class="rd-request"><span>${labIcon("tablet")}</span><p><small>ASKING TO BE BOUND</small><b>reMarkable 2</b></p></section><label class="rd-recognize"><i>✓</i><span>I recognize this reader.</span></label><button class="rd-primary">BIND TO THE ARCHIVE</button><button class="rd-text">Scan its sigil instead</button></div>`,
    },
];

const aquariumNav = [
    ["today", "spark", "TANK"],
    ["month", "chart", "REEF"],
    ["settings", "settings", "FILTER"],
];
const aquariumScreens = [
    {
        id: "today",
        title: "Today",
        kicker: "A living aquarium fed by completed habits",
        body: `${labStatus("12m  ◉  100%")}<div class="app-content aquarium-content"><div class="aq-top"><b>DAILY TANK</b><span>SEP 03 · 12M DEEP</span><button>${labIcon("cloud-check")}</button></div><section class="aq-tank"><i class="bubble b1"></i><i class="bubble b2"></i><i class="bubble b3"></i><div class="aq-light"></div><div class="fish f1 fed"><i></i><b>WALK</b></div><div class="fish f2 fed"><i></i><b>READ</b></div><div class="fish f3"><i></i><b>JOURNAL</b></div><div class="fish f4 fed"><i></i><b>NO SUGAR</b></div><div class="fish f5"><i></i><b>STRETCH</b></div><div class="aq-floor"><i></i><i></i><i></i></div><div class="aq-score"><b>3/5</b><small>FED TODAY</small></div></section><p class="aq-message">The tank gets brighter as you care for it.</p><button class="aq-primary">FEED THE JOURNAL FISH</button></div>${labNav(aquariumNav, "today")}`,
    },
    {
        id: "month",
        title: "Month",
        kicker: "Consistency becomes a coral reef",
        body: `${labStatus("12m  ◉  100%")}<div class="app-content aquarium-content"><div class="aq-top"><b>REEF LOG</b><span>SEP ’26</span><button>DEPTH⌄</button></div><section class="aq-reef"><div class="aq-moon"></div>${Array(
            30,
        )
            .fill(0)
            .map(
                (_, i) =>
                    `<i class="coral c${i % 5} ${i < 22 && i % 6 ? "alive" : ""}" style="--x:${(i * 37) % 94}%;--y:${10 + ((i * 23) % 72)}%"></i>`,
            )
            .join(
                "",
            )}<div class="aq-reef-score"><small>REEF HEALTH</small><b>76%</b><span>THRIVING</span></div></section><div class="aq-species-bars">${[
            ["WALK", 92],
            ["READ", 82],
            ["JOURNAL", 48],
            ["NO SUGAR", 88],
            ["STRETCH", 66],
        ]
            .map(
                (x) =>
                    `<div><b>${x[0]}</b><span><i style="width:${x[1]}%"></i></span><em>${x[1]}%</em></div>`,
            )
            .join(
                "",
            )}</div><p class="aq-note">Tap a species to reveal its 30-day current.</p></div>${labNav(aquariumNav, "month")}`,
    },
    {
        id: "habits",
        title: "Habits",
        kicker: "A calm species catalogue",
        body: `${labStatus("12m  ◉  100%")}<div class="app-content aquarium-content">${labHeader("LIFE SUPPORT", "Tank species", "CURATE")}<div class="aq-catalogue">${[
            ["☀", "Sunfin", "Morning walk"],
            ["◐", "Page ray", "Read 20 minutes"],
            ["✦", "Ink tetra", "Journal"],
            ["◇", "Sugar shield", "No sugar · avoid"],
            ["∿", "Ribbon eel", "Stretch"],
        ]
            .map(
                (x) =>
                    `<div><span>${x[0]}</span><p><small>${x[1]}</small><b>${x[2]}</b></p><i>›</i></div>`,
            )
            .join(
                "",
            )}</div><button class="aq-primary">+ INTRODUCE A SPECIES</button><p class="aq-note">Curate mode reveals habitat, order, archive, and removal controls.</p></div>`,
    },
    {
        id: "sync",
        title: "Sync",
        kicker: "Sync as a transparent filtration system",
        body: `${labStatus("12m  ◉  100%")}<div class="app-content aquarium-content">${labHeader("LIFE SUPPORT · DATA", "Water cycle")}<section class="aq-filter"><div class="aq-ring r1"></div><div class="aq-ring r2"></div><span>${labIcon("cloud-check")}</span><b>WATER IS CLEAR</b><small>All tanks match · just now</small></section><div class="aq-pipes"><div><i>↻</i><p><b>Continuous filtration</b><small>Sync after every feeding</small></p><span class="toggle on"></span></div><div><i>◉</i><p><b>Connected tanks</b><small>2 habitats</small></p><em>›</em></div><div><i>♙</i><p><b>Keeper</b><small>kristian@example.com</small></p><em>›</em></div></div><button class="aq-primary">CYCLE WATER NOW</button></div>${labNav(aquariumNav, "settings")}`,
    },
    {
        id: "devices",
        title: "Linked devices",
        kicker: "Devices as habitats in one water system",
        body: `${labStatus("12m  ◉  100%")}<div class="app-content aquarium-content">${labHeader("WATER CYCLE", "Connected tanks", "+ TANK")}<div class="aq-tanks"><section><div class="aq-mini-tank"><span>🐟</span><i></i></div><small>HABITAT 01 · HERE</small><h4>Pixel 9</h4><p>Clear · flowing now</p><b>PRIMARY</b></section><section><div class="aq-mini-tank"><span>🐠</span><i></i></div><small>HABITAT 02 · PAPER</small><h4>reMarkable 2</h4><p>Clear · 8m ago</p><b>HEALTHY</b></section></div><p class="aq-note">Disconnecting a tank stops new circulation; its local reef remains.</p></div>`,
    },
    {
        id: "link",
        title: "Link device",
        kicker: "Pairing as opening a safe water channel",
        body: `${labStatus("12m  ◉  100%")}<div class="app-content aquarium-content">${labHeader("CONNECTED TANKS", "Open a channel")}<div class="aq-sonar"><i></i><i></i><i></i><span>${labIcon("tablet")}</span></div><section class="aq-detected"><small>NEW HABITAT DETECTED</small><b>reMarkable 2</b><span>SONAR CODE · T4M 9QK</span><em>04:32 remaining</em></section><button class="aq-primary">OPEN WATER CHANNEL</button><button class="aq-outline">SCAN REEF MARKER</button><p class="aq-note">Confirm only a tank you can see.</p></div>`,
    },
];

const comicNav = [
    ["today", "spark", "STORY"],
    ["month", "calendar", "ISSUES"],
    ["settings", "more", "EXTRAS"],
];
const comicScreens = [
    {
        id: "today",
        title: "Today",
        kicker: "Your day unfolds as a comic strip",
        body: `${labStatus("POW!  100%")}<div class="app-content comic-content"><div class="cq-mast"><b>THE DAILY DOER</b><span>ISSUE #247 · 3 SEP</span></div><section class="cq-panel hero"><i>3/5</i><small>OUR HERO FACES…</small><h4>THE<br />UNFINISHED<br />DAY!</h4><span class="burst">POW!</span></section><div class="cq-strip"><section class="done"><small>1</small><span>🚶</span><b>WALK</b><i>DONE!</i></section><section class="done"><small>2</small><span>📖</span><b>READ</b><i>ZAP!</i></section><section><small>3</small><span>✎</span><b>JOURNAL</b><button>DO IT!</button></section><section class="done"><small>4</small><span>◇</span><b>NO SUGAR</b><i>NICE!</i></section></div><button class="cq-next">NEXT PANEL: STRETCH →</button></div>${labNav(comicNav, "today")}`,
    },
    {
        id: "month",
        title: "Month",
        kicker: "A month becomes a collectible issue",
        body: `${labStatus("POW!  100%")}<div class="app-content comic-content"><div class="cq-mast"><b>THE DAILY DOER</b><span>SEPTEMBER ANNUAL</span></div><div class="cq-cover"><small>30-DAY SPECIAL!</small><h4>THE<br />CONSISTENCY<br />CRUSADE</h4><div class="cq-burst"><b>76%</b><span>COMPLETE!</span></div><i>★</i></div><div class="cq-stats"><span><b>27</b><small>WALK WINS</small></span><span><b>14</b><small>INK MARKS</small></span><span><b>8</b><small>DAY STREAK</small></span></div><div class="cq-issues">${[
            1, 2, 3, 4, 5,
        ]
            .map(
                (x, i) =>
                    `<section><span>CH.${x}</span><div>${Array(6)
                        .fill(0)
                        .map(
                            (_, j) =>
                                `<i class="${j < 5 - (i % 3) ? "done" : ""}"></i>`,
                        )
                        .join(
                            "",
                        )}</div><b>${[92, 82, 48, 88, 66][i]}%</b></section>`,
            )
            .join("")}</div></div>${labNav(comicNav, "month")}`,
    },
    {
        id: "habits",
        title: "Habits",
        kicker: "A cast page hides the boring controls",
        body: `${labStatus("POW!  100%")}<div class="app-content comic-content">${labHeader("THE DAILY DOER", "Meet the cast", "EDIT CAST")}<div class="cq-cast">${[
            ["🚶", "THE STRIDER", "Morning walk"],
            ["📖", "PAGE MASTER", "Read 20 minutes"],
            ["✎", "THE SCRIBE", "Journal"],
            ["◇", "SUGAR SHIELD", "No sugar · avoid"],
            ["∿", "ELASTICA", "Stretch"],
        ]
            .map(
                (x, i) =>
                    `<div class="c${i}"><span>${x[0]}</span><p><small>${x[1]}</small><b>${x[2]}</b></p><i>›</i></div>`,
            )
            .join(
                "",
            )}</div><button class="cq-next">+ INTRODUCE A HERO</button><p class="cq-caption">EDIT CAST unlocks rename, reorder, polarity, archive, and the dreaded delete ray.</p></div>`,
    },
    {
        id: "sync",
        title: "Sync",
        kicker: "Sync gets a dramatic cloud-side plot",
        body: `${labStatus("POW!  100%")}<div class="app-content comic-content">${labHeader("EXTRAS · DATA", "Meanwhile…")}<section class="cq-sync-panel"><small>MEANWHILE, IN THE CLOUD!</small><div class="cq-cloud">${labIcon("cloud-check")}<i>ZAP!</i></div><h4>ALL STORIES<br />MATCH!</h4><p>Synced just now</p></section><div class="cq-options"><div><b>AUTO-CONTINUE</b><span>ON!</span></div><div><b>SIDEKICK DEVICES</b><span>02 →</span></div><div><b>SECRET IDENTITY</b><span>KRISTIAN →</span></div><div><b>ORIGIN SERVER</b><span>DEFAULT →</span></div></div><button class="cq-next">SYNC THE NEXT ISSUE!</button></div>${labNav(comicNav, "settings")}`,
    },
    {
        id: "devices",
        title: "Linked devices",
        kicker: "Every device joins the superhero team",
        body: `${labStatus("POW!  100%")}<div class="app-content comic-content">${labHeader("THE TEAM", "Trusted sidekicks", "+ RECRUIT")}<div class="cq-sidekicks"><section><span>${labIcon("phone")}</span><small>TEAM LEADER</small><h4>PIXEL 9</h4><b>ONLINE!</b><i class="burst">BAM!</i></section><section><span>${labIcon("tablet")}</span><small>INK SPECIALIST</small><h4>REMARKABLE 2</h4><b>8 MIN AGO</b><i class="burst">ZAP!</i></section></div><div class="cq-warning"><b>THE FINE PRINT!</b><p>Retiring a sidekick stops future issues. Its existing stories remain.</p></div></div>`,
    },
    {
        id: "link",
        title: "Link device",
        kicker: "A new-device origin story with explicit consent",
        body: `${labStatus("POW!  100%")}<div class="app-content comic-content">${labHeader("TRUSTED SIDEKICKS", "The origin story")}<section class="cq-origin"><small>ONE MYSTERIOUS DEVICE APPEARS…</small><span>${labIcon("tablet")}</span><h4>REMARKABLE 2</h4><i>WHOOSH!</i></section><div class="cq-code"><small>SECRET TEAM CODE</small><b>T4M 9QK</b><span>SELF-DESTRUCTS IN 04:32</span></div><label class="cq-check"><i>✓</i><span>Yep, that’s my device.</span></label><button class="cq-next">WELCOME TO THE TEAM!</button><button class="cq-ink">SCAN THE INK-MARK</button></div>`,
    },
];

const clockNav = [
    ["today", "home", "DIAL"],
    ["month", "chart", "CALIBRATE"],
    ["settings", "settings", "WORKS"],
];
const clockworkScreens = [
    {
        id: "today",
        title: "Today",
        kicker: "A precision instrument for the daily rhythm",
        body: `${labStatus("9:41  ⏱  100%")}<div class="app-content clock-content"><div class="cw-top"><b>HABIT CHRONOMETER</b><span>No. 247 · SEP 03</span></div><section class="cw-dial"><i class="tick t1"></i><i class="tick t2"></i><i class="tick t3"></i><i class="tick t4"></i><i class="hand"></i><div><small>DAILY WIND</small><b>60</b><span>PERCENT</span></div><em>3 OF 5</em></section><div class="cw-complications"><button class="done"><small>I</small><b>WALK</b><i>✓</i></button><button class="done"><small>II</small><b>READ</b><i>✓</i></button><button><small>III</small><b>JOURNAL</b><i>○</i></button><button class="done"><small>IV</small><b>SUGAR</b><i>✓</i></button><button><small>V</small><b>STRETCH</b><i>○</i></button></div><button class="cw-wind">WIND JOURNAL +1</button></div>${labNav(clockNav, "today")}`,
    },
    {
        id: "month",
        title: "Month",
        kicker: "Thirty days arranged as a mechanical calendar",
        body: `${labStatus("9:41  ⏱  100%")}<div class="app-content clock-content"><div class="cw-top"><b>PERPETUAL CALENDAR</b><span>SEP · 2026</span></div><section class="cw-calendar-dial"><div class="gear g1"></div><div class="gear g2"></div><div class="gear g3"></div><div class="cw-date-ring">${Array(
            30,
        )
            .fill(0)
            .map(
                (_, i) =>
                    `<i style="--r:${i * 12}deg" class="${i < 23 && i % 6 ? "on" : ""}"><b>${i + 1}</b></i>`,
            )
            .join(
                "",
            )}</div><span><small>MONTH RATE</small><b>76%</b><em>+8</em></span></section><div class="cw-rates">${[
            ["WALK", 92],
            ["READ", 82],
            ["JOURNAL", 48],
            ["NO SUGAR", 88],
            ["STRETCH", 66],
        ]
            .map(
                (x) =>
                    `<div><b>${x[0]}</b><i><span style="width:${x[1]}%"></span></i><em>${x[1]}%</em></div>`,
            )
            .join(
                "",
            )}</div><p class="cw-note">Select a mechanism for its daily record.</p></div>${labNav(clockNav, "month")}`,
    },
    {
        id: "habits",
        title: "Habits",
        kicker: "A registry of calibrated mechanisms",
        body: `${labStatus("9:41  ⏱  100%")}<div class="app-content clock-content">${labHeader("THE WORKS", "Five mechanisms", "CALIBRATE")}<div class="cw-registry">${[
            ["01", "SUN WHEEL", "Morning walk"],
            ["02", "PAGE ESCAPEMENT", "Read 20 minutes"],
            ["03", "INK SPRING", "Journal"],
            ["04", "SUGAR GOVERNOR", "No sugar · avoid"],
            ["05", "FLEX BALANCE", "Stretch"],
        ]
            .map(
                (x) =>
                    `<div><span>${x[0]}</span><p><small>${x[1]}</small><b>${x[2]}</b></p><i>◎</i></div>`,
            )
            .join(
                "",
            )}</div><button class="cw-wind">+ FIT A MECHANISM</button><p class="cw-note">Calibration mode exposes timing, order, polarity, archive, and removal.</p></div>`,
    },
    {
        id: "sync",
        title: "Sync",
        kicker: "Sync as two movements locking into phase",
        body: `${labStatus("9:41  ⏱  100%")}<div class="app-content clock-content">${labHeader("THE WORKS · DATA", "Phase lock")}<section class="cw-phase"><div class="gear big"></div><div class="gear small"></div><i></i><span>${labIcon("cloud-check")}</span><b>MOVEMENTS ALIGNED</b><small>Offset 0.00s · just now</small></section><div class="cw-controls"><div><p><b>Automatic winding</b><small>Align after every change</small></p><i class="toggle on"></i></div><div><p><b>Linked movements</b><small>2 instruments</small></p><span>›</span></div><div><p><b>Registered keeper</b><small>kristian@example.com</small></p><span>›</span></div></div><button class="cw-wind">ALIGN MOVEMENTS</button></div>${labNav(clockNav, "settings")}`,
    },
    {
        id: "devices",
        title: "Linked devices",
        kicker: "Devices as synchronized timepieces",
        body: `${labStatus("9:41  ⏱  100%")}<div class="app-content clock-content">${labHeader("PHASE LOCK", "Timepieces", "+ REGISTER")}<div class="cw-watches"><section><div class="cw-watch"><i></i><span>9:41</span></div><small>MASTER · No. 01</small><h4>Pixel 9</h4><p>Running now</p><b>±0.00s</b></section><section><div class="cw-watch square"><i></i><span>9:41</span></div><small>COMPANION · No. 02</small><h4>reMarkable 2</h4><p>Checked 8m ago</p><b>±0.02s</b></section></div><p class="cw-note">Unregistering prevents future alignment; local records remain intact.</p></div>`,
    },
    {
        id: "link",
        title: "Link device",
        kicker: "Pairing as registering a precision instrument",
        body: `${labStatus("9:41  ⏱  100%")}<div class="app-content clock-content">${labHeader("TIMEPIECES", "Register movement")}<div class="cw-key"><i></i><span></span><b>T4M 9QK</b></div><section class="cw-found"><small>MOVEMENT DETECTED</small><b>reMarkable 2</b><p>Registration window · 04:32</p></section><label class="cw-confirm"><i>✓</i><span>Serial and device name match.</span></label><button class="cw-wind">REGISTER & ALIGN</button><button class="cw-outline">SCAN SERIAL MARK</button></div>`,
    },
];

const terrainNav = [
    ["today", "spark", "ROUTE"],
    ["month", "chart", "MAP"],
    ["settings", "settings", "CAMP"],
];
const topographicScreens = [
    {
        id: "today",
        title: "Today",
        kicker: "Habits become waypoints on a daily trail",
        body: `${labStatus("842m  △  100%")}<div class="app-content terrain-content"><div class="tp-top"><b>DAILY ROUTE</b><span>SEP 03 · OSLO</span><button>${labIcon("cloud-check")}</button></div><section class="tp-map"><svg viewBox="0 0 320 310" aria-hidden="true"><path class="contour c1" d="M-20 60C48 5 105 104 175 39S301 17 351 81"/><path class="contour c2" d="M-20 102C61 43 97 139 183 76S287 57 354 115"/><path class="contour c3" d="M-20 154C65 92 111 182 195 123S302 116 360 166"/><path class="contour c4" d="M-20 208C58 152 121 235 203 177S309 177 354 215"/><path class="route" d="M30 268C71 245 57 207 103 191S116 139 171 134 213 84 282 48"/></svg>${[
            ["p1", "✓", "WALK"],
            ["p2", "✓", "READ"],
            ["p3", "3", "JOURNAL"],
            ["p4", "✓", "SUGAR"],
            ["p5", "5", "STRETCH"],
        ]
            .map(
                (x) =>
                    `<i class="pin ${x[0]}"><b>${x[1]}</b><span>${x[2]}</span></i>`,
            )
            .join(
                "",
            )}<div class="tp-elevation"><small>ASCENT</small><b>3 / 5</b><span>60% OF ROUTE</span></div></section><button class="tp-primary">REACH JOURNAL WAYPOINT</button></div>${labNav(terrainNav, "today")}`,
    },
    {
        id: "month",
        title: "Month",
        kicker: "Monthly consistency as terrain, not cells",
        body: `${labStatus("842m  △  100%")}<div class="app-content terrain-content"><div class="tp-top"><b>SEPTEMBER RANGE</b><span>2026</span><button>LAYERS⌄</button></div><section class="tp-month-map"><svg viewBox="0 0 320 260" aria-hidden="true"><path d="M-5 66C54 13 111 94 173 43S279 19 330 67"/><path d="M-5 99C71 52 109 132 185 79S278 55 331 104"/><path d="M-5 143C75 91 124 170 194 119S279 104 335 151"/><path d="M-5 190C68 142 127 219 204 165S294 155 335 197"/></svg><div class="tp-peaks"><i class="peak p1"><b>92</b><span>WALK</span></i><i class="peak p2"><b>82</b><span>READ</span></i><i class="peak p3"><b>48</b><span>JOURNAL</span></i><i class="peak p4"><b>88</b><span>SUGAR</span></i><i class="peak p5"><b>66</b><span>STRETCH</span></i></div><span class="tp-scale">LOW ······· HIGH</span></section><div class="tp-summary"><div><small>ROUTE COVERED</small><b>76%</b></div><div><small>LONGEST RIDGE</small><b>8 days</b></div><span>+8% vs AUG</span></div><p class="tp-note">Tap a peak to isolate its 30-day contour.</p></div>${labNav(terrainNav, "month")}`,
    },
    {
        id: "habits",
        title: "Habits",
        kicker: "A clean field guide to your routes",
        body: `${labStatus("842m  △  100%")}<div class="app-content terrain-content">${labHeader("BASE CAMP", "Route guide", "EDIT MAP")}<div class="tp-guide">${[
            ["△", "SUN RIDGE", "Morning walk"],
            ["⌁", "PAPER PASS", "Read 20 minutes"],
            ["✎", "INK TRAIL", "Journal"],
            ["◇", "SUGAR BYPASS", "No sugar · avoid"],
            ["∿", "FLEX SWITCHBACK", "Stretch"],
        ]
            .map(
                (x, i) =>
                    `<div><span>${x[0]}</span><p><small>ROUTE 0${i + 1} · ${x[1]}</small><b>${x[2]}</b></p><i>›</i></div>`,
            )
            .join(
                "",
            )}</div><button class="tp-primary">+ CHART A ROUTE</button><p class="tp-note">Edit Map opens waypoint order, target, polarity, archive, and deletion.</p></div>`,
    },
    {
        id: "sync",
        title: "Sync",
        kicker: "Sync as a base-camp radio check",
        body: `${labStatus("842m  △  100%")}<div class="app-content terrain-content">${labHeader("BASE CAMP · DATA", "Radio check")}<section class="tp-radio"><div class="tp-rings"><i></i><i></i><i></i></div><span>${labIcon("cloud-check")}</span><small>BASE CAMP TO ALL UNITS</small><b>LOUD & CLEAR</b><em>Checked just now</em></section><div class="tp-camp-menu"><div><p><b>Automatic check-ins</b><small>After every waypoint</small></p><i class="toggle on"></i></div><div><p><b>Field units</b><small>2 connected devices</small></p><span>›</span></div><div><p><b>Expedition lead</b><small>kristian@example.com</small></p><span>›</span></div></div><button class="tp-primary">RADIO CHECK NOW</button></div>${labNav(terrainNav, "settings")}`,
    },
    {
        id: "devices",
        title: "Linked devices",
        kicker: "Devices as field units on the same expedition",
        body: `${labStatus("842m  △  100%")}<div class="app-content terrain-content">${labHeader("BASE CAMP", "Field units", "+ UNIT")}<div class="tp-units"><section><div class="tp-badge">△<i>01</i></div><small>LEAD UNIT · HERE</small><h4>Pixel 9</h4><p>At base camp · now</p><b>ONLINE</b></section><section><div class="tp-badge">▱<i>02</i></div><small>PAPER UNIT</small><h4>reMarkable 2</h4><p>Last check-in · 8m</p><b>ONLINE</b></section></div><p class="tp-note">Retiring a field unit stops check-ins. Its downloaded route stays available.</p></div>`,
    },
    {
        id: "link",
        title: "Link device",
        kicker: "Pairing as activating a field beacon",
        body: `${labStatus("842m  △  100%")}<div class="app-content terrain-content">${labHeader("FIELD UNITS", "Activate beacon")}<div class="tp-beacon"><div class="tp-rings"><i></i><i></i><i></i></div><span>△</span><b>T4M 9QK</b><small>BEACON · 04:32</small></div><section class="tp-detected"><span>${labIcon("tablet")}</span><p><small>UNIT IN RANGE</small><b>reMarkable 2</b></p><i>IDENTIFIED</i></section><button class="tp-primary">ADD TO EXPEDITION</button><button class="tp-outline">SCAN MAP MARKER</button><p class="tp-note">Verify the unit in front of you before adding it.</p></div>`,
    },
];

const bloomNav = [
    ["today", "spark", "GROW"],
    ["month", "chart", "COLONY"],
    ["settings", "settings", "LAB"],
];
const bloomScreens = [
    {
        id: "today",
        title: "Today",
        kicker: "Your habits form one evolving organism",
        body: `${labStatus("BIO ● 100%")}<div class="app-content bloom-content"><div class="cb-top"><b>DAILY ORGANISM</b><span>SPECIMEN 247 · 03 SEP</span><button>${labIcon("cloud-check")}</button></div><section class="cb-organism"><div class="cell c1 alive"><i></i><b>WALK</b></div><div class="cell c2 alive"><i></i><b>READ</b></div><div class="cell c3"><i></i><b>JOURNAL</b></div><div class="cell c4 alive"><i></i><b>SUGAR</b></div><div class="cell c5"><i></i><b>STRETCH</b></div><span class="membrane"></span><div class="cb-core"><b>60%</b><small>VITALITY</small></div></section><p class="cb-reading"><b>Stable growth.</b> Two cells are waiting for a signal.</p><button class="cb-primary">ACTIVATE JOURNAL CELL</button></div>${labNav(bloomNav, "today")}`,
    },
    {
        id: "month",
        title: "Month",
        kicker: "Thirty organisms bloom into a colony",
        body: `${labStatus("BIO ● 100%")}<div class="app-content bloom-content"><div class="cb-top"><b>COLONY STUDY</b><span>SEP · 2026</span><button>GENOME⌄</button></div><div class="cb-colony">${Array(
            30,
        )
            .fill(0)
            .map(
                (_, i) =>
                    `<i class="v${(i * 7) % 5} ${i < 23 && i % 6 ? "alive" : ""}"><span></span></i>`,
            )
            .join(
                "",
            )}</div><div class="cb-colony-score"><p><small>COLONY VITALITY</small><b>76%</b><span>+8% growth</span></p><div><i></i><i></i><i></i></div></div><div class="cb-genes">${[
            ["WALK", 92],
            ["READ", 82],
            ["INK", 48],
            ["SUGAR", 88],
            ["FLEX", 66],
        ]
            .map(
                (x) =>
                    `<span><b>${x[0]}</b><i style="--p:${x[1]}%"></i><em>${x[1]}</em></span>`,
            )
            .join(
                "",
            )}</div><p class="cb-note">Select a gene to see where it expressed.</p></div>${labNav(bloomNav, "month")}`,
    },
    {
        id: "habits",
        title: "Habits",
        kicker: "A genome library instead of an edit list",
        body: `${labStatus("BIO ● 100%")}<div class="app-content bloom-content">${labHeader("GROWTH LAB", "Habit genome", "SEQUENCE")}<div class="cb-genome">${[
            ["A–01", "SOL", "Morning walk"],
            ["C–02", "LEX", "Read 20 minutes"],
            ["G–03", "INK", "Journal"],
            ["T–04", "SHD", "No sugar · avoid"],
            ["A–05", "FLX", "Stretch"],
        ]
            .map(
                (x) =>
                    `<div><span><i></i><i></i><i></i></span><p><small>${x[0]} · ${x[1]}</small><b>${x[2]}</b></p><em>›</em></div>`,
            )
            .join(
                "",
            )}</div><button class="cb-primary">+ CULTURE A GENE</button><p class="cb-note">Sequence mode reveals schedule, order, polarity, dormancy, and deletion.</p></div>`,
    },
    {
        id: "sync",
        title: "Sync",
        kicker: "Sync as safe replication between colonies",
        body: `${labStatus("BIO ● 100%")}<div class="app-content bloom-content">${labHeader("GROWTH LAB · DATA", "Replication")}<section class="cb-replication"><div class="cell left alive"><i></i></div><div class="cb-strand"><i></i><i></i><i></i><i></i><i></i></div><div class="cell right alive"><i></i></div><span>${labIcon("cloud-check")}</span><b>REPLICATION COMPLETE</b><small>Both colonies identical · just now</small></section><div class="cb-lab-menu"><div><p><b>Continuous replication</b><small>After every mutation</small></p><i class="toggle on"></i></div><div><p><b>Living colonies</b><small>2 devices</small></p><span>›</span></div><div><p><b>Lead researcher</b><small>kristian@example.com</small></p><span>›</span></div></div><button class="cb-primary">REPLICATE AGAIN</button></div>${labNav(bloomNav, "settings")}`,
    },
    {
        id: "devices",
        title: "Linked devices",
        kicker: "Devices become living colonies",
        body: `${labStatus("BIO ● 100%")}<div class="app-content bloom-content">${labHeader("REPLICATION", "Living colonies", "+ CULTURE")}<div class="cb-cultures"><section><div class="cb-petri"><i></i><i></i><i></i><i></i></div><small>CULTURE 01 · PRIMARY</small><h4>Pixel 9</h4><p>Active growth · now</p><b>HEALTHY</b></section><section><div class="cb-petri alt"><i></i><i></i><i></i><i></i></div><small>CULTURE 02 · PAPER</small><h4>reMarkable 2</h4><p>Observed · 8m ago</p><b>HEALTHY</b></section></div><p class="cb-note">Quarantining a culture stops new replication; existing cells remain local.</p></div>`,
    },
    {
        id: "link",
        title: "Link device",
        kicker: "Pairing as deliberately seeding a new colony",
        body: `${labStatus("BIO ● 100%")}<div class="app-content bloom-content">${labHeader("LIVING COLONIES", "Seed a culture")}<div class="cb-seed"><div class="cell alive"><i></i></div><span></span><div class="cb-petri"><i></i><i></i><i></i></div><b>T4M 9QK</b><small>SEED WINDOW · 04:32</small></div><section class="cb-candidate"><span>${labIcon("tablet")}</span><p><small>STERILE CULTURE FOUND</small><b>reMarkable 2</b></p><i>READY</i></section><label class="cb-confirm"><i>✓</i><span>I recognize this culture.</span></label><button class="cb-primary">SEED THIS COLONY</button><button class="cb-outline">SCAN SPECIMEN LABEL</button></div>`,
    },
];

window.laboratoryConcepts = [
    {
        slug: "mixtape",
        number: "16",
        type: "Laboratory · Audio",
        title: "Mixtape",
        tagline:
            "Your day is a five-track record—press play and keep the side moving.",
        description:
            "Cassette mechanics turn completion into playback. Tracks replace rows, an album waveform replaces the monthly spreadsheet, and sync becomes an understandable deck-to-deck dub.",
        strengths: [
            "Immediate, tactile interactions",
            "Distinct retro identity",
            "Clear sequential focus",
        ],
        tradeoff:
            "The nostalgia is culturally specific and can overpower the actual habit content.",
        palette: ["#f6d44b", "#161616", "#ee4b32", "#f7f0dc"],
        screens: mixtapeScreens,
    },
    {
        slug: "weather",
        number: "17",
        type: "Laboratory · Ambient",
        title: "Weather Maker",
        tagline: "Every completed habit changes the weather around your day.",
        description:
            "An ambient, emotionally legible system: sunny habits, stormy gaps, climate history, weather stations, and forecasts. The metaphor compresses overview without turning performance into a wall of cells.",
        strengths: [
            "Month is readable at a glance",
            "Gentle emotional framing",
            "Naturally ambient widgets",
        ],
        tradeoff:
            "Weather symbols can feel judgmental unless clouds and rain are treated neutrally.",
        palette: ["#79c9ed", "#fff7df", "#f4b942", "#2d5e78"],
        screens: weatherScreens,
    },
    {
        slug: "house",
        number: "18",
        type: "Laboratory · Spatial",
        title: "Habit House",
        tagline: "Build a small home from the rooms of your routine.",
        description:
            "A spatial mental model makes habits into rooms, monthly progress into a floor plan, and devices into connected homes. It is cozy, concrete, and radically unlike a productivity dashboard.",
        strengths: [
            "Memorable spatial model",
            "Friendly and personal",
            "Editing has a natural renovate mode",
        ],
        tradeoff:
            "The house metaphor becomes strained for large habit libraries or shared accounts.",
        palette: ["#f4e4c6", "#9d533f", "#315f53", "#efad4d"],
        screens: houseScreens,
    },
    {
        slug: "mission",
        number: "19",
        type: "Laboratory · Instrumentation",
        title: "Mission Control",
        tagline: "Treat the day like a five-system launch sequence.",
        description:
            "Dense-but-purposeful aerospace instrumentation makes the user an operator. The flow reframes sync as visible telemetry with status, pending packets, ground stations, and explicit authorization.",
        strengths: [
            "Excellent system-status language",
            "Sync feels concrete",
            "Strong high-focus mode",
        ],
        tradeoff:
            "The militarized urgency is energizing for some people and stressful for others.",
        palette: ["#091924", "#ff6b35", "#4ee1c1", "#d9e3de"],
        screens: missionScreens,
    },
    {
        slug: "ritual",
        number: "20",
        type: "Laboratory · Symbolic",
        title: "Ritual Deck",
        tagline: "Draw a card, keep a promise, leave a mark.",
        description:
            "A contemplative card ritual replaces the checklist. Each habit receives a symbol, the month becomes a spread, and device approval becomes a deliberate binding ceremony with explicit recognition.",
        strengths: [
            "Turns checking-in into a ritual",
            "Beautiful single-task focus",
            "Strong personal symbolism",
        ],
        tradeoff:
            "Mystical language may reduce trust for users who want literal, utilitarian tools.",
        palette: ["#2b1535", "#f3e5c7", "#c29a46", "#b74b66"],
        screens: ritualScreens,
    },
    {
        slug: "aquarium",
        number: "21",
        type: "Laboratory · Living world",
        title: "Deep Sea",
        tagline: "Care for a quiet aquarium by caring for yourself.",
        description:
            "Habits become living species and consistency grows a coral reef. The month reads as ecosystem health, while sync is recast as a transparent filtration cycle shared by connected tanks.",
        strengths: [
            "Ambient and emotionally warm",
            "Progress creates a living artifact",
            "Distinctive month visualization",
        ],
        tradeoff:
            "Virtual-pet stakes could create guilt after an absence; nothing should visibly suffer.",
        palette: ["#061d2b", "#0a7180", "#61dfc7", "#ff8b6a"],
        screens: aquariumScreens,
    },
    {
        slug: "comic",
        number: "22",
        type: "Laboratory · Narrative",
        title: "Comic Quest",
        tagline: "Turn each ordinary day into a tiny six-panel adventure.",
        description:
            "Bold panels, captions, sound effects, and recurring heroes transform chores into episodic storytelling. Settings stay out of the main strip, and sync gets a legible cloud-side subplot.",
        strengths: [
            "Huge personality",
            "Makes small wins celebratory",
            "Naturally teaches flows in panels",
        ],
        tradeoff:
            "High visual energy competes with content and will need a reduced-motion, low-ink mode.",
        palette: ["#ffe34f", "#ef3e36", "#2a68d4", "#111111"],
        screens: comicScreens,
    },
    {
        slug: "clockwork",
        number: "23",
        type: "Laboratory · Precision",
        title: "Clockwork",
        tagline: "Wind the day into a precise little mechanism.",
        description:
            "Watchmaking language gives the app satisfying physical logic: habits are complications, the month a perpetual calendar, devices are movements, and sync is measurable phase alignment.",
        strengths: [
            "Premium, ownable craft",
            "Excellent microinteraction potential",
            "Precise sync mental model",
        ],
        tradeoff:
            "Ornamental precision may imply accuracy the habit data cannot meaningfully provide.",
        palette: ["#17201e", "#d4b06a", "#f2ead8", "#8da39a"],
        screens: clockworkScreens,
    },
    {
        slug: "terrain",
        number: "24",
        type: "Laboratory · Cartographic",
        title: "Topographic",
        tagline: "Find the path through your day, not a score against it.",
        description:
            "Habits become waypoints across shifting contour lines. Monthly progress forms terrain, devices become field units, and the improved sync flow behaves like a clear base-camp radio check.",
        strengths: [
            "Progress feels exploratory",
            "Dense data stays atmospheric",
            "Coherent device metaphor",
        ],
        tradeoff:
            "Maps imply direction and distance, which may not fit non-sequential routines.",
        palette: ["#e8e0c5", "#21493f", "#ea5b38", "#718c66"],
        screens: topographicScreens,
    },
    {
        slug: "cellular",
        number: "25",
        type: "Laboratory · Generative",
        title: "Cellular Bloom",
        tagline:
            "Grow a one-of-a-kind organism from the shape of your routine.",
        description:
            "Every completion expresses a cell; days become organisms and months become colonies. The visual artifact can be unique to each person while replication makes the sync model explicit and inspectable.",
        strengths: [
            "Most original visual artifact",
            "Scales from day to month",
            "Progress without conventional charts",
        ],
        tradeoff:
            "The abstract biology needs excellent labels so beauty never obscures state.",
        palette: ["#142b25", "#b8f46d", "#ff7b79", "#ecf4de"],
        screens: bloomScreens,
    },
];
