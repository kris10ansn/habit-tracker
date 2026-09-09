const icon = (name, className = "") =>
    `<svg class="icon ${className}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;

const phoneStatus = (right = "● ◔ 100%") => `
    <div class="phone-status"><b>9:41</b><span>${right}</span></div>`;

const mobileNav = (items, active) => `
    <nav class="mobile-nav" aria-label="Concept navigation">
        ${items
            .map(
                ([id, glyph, label]) => `
                    <span class="${active === id ? "active" : ""}">
                        ${icon(glyph)}<small>${label}</small>
                    </span>`,
            )
            .join("")}
    </nav>`;

const header = ({ eyebrow = "", title, action = "", back = false }) => `
    <div class="app-header ${back ? "has-back" : ""}">
        ${back ? `<button class="bare-icon">${icon("arrow-left")}</button>` : ""}
        <div>${eyebrow ? `<span>${eyebrow}</span>` : ""}<h4>${title}</h4></div>
        ${action ? `<button class="header-action">${action}</button>` : ""}
    </div>`;

const mark = (state = "empty") => `
    <span class="habit-mark ${state}">${icon(state === "done" ? "check" : state === "missed" ? "close" : "minus")}</span>`;

const navQuiet = [
    ["today", "home", "Today"],
    ["month", "calendar", "Month"],
    ["settings", "settings", "Settings"],
];

const navSignal = [
    ["today", "check", "Today"],
    ["month", "chart", "Trends"],
    ["settings", "user", "You"],
];

const navJournal = [
    ["today", "edit", "Today"],
    ["month", "calendar", "Logbook"],
    ["settings", "more", "More"],
];

const quietScreens = [
    {
        id: "today",
        title: "Today",
        kicker: "Daily capture",
        body: `
            ${phoneStatus()}
            <div class="app-content">
                ${header({ eyebrow: "Thursday · Today", title: "3 September", action: icon("cloud-check") })}
                <section class="q-progress-card">
                    <div class="ring-progress"><b>3</b><span>of 5</span></div>
                    <div><span class="screen-kicker">Today’s rhythm</span><h5>Two small wins left.</h5><p>Your best Thursday this month.</p></div>
                </section>
                <div class="section-line"><b>Habits</b><button>${icon("edit")} Edit</button></div>
                <div class="q-habit-list">
                    <div class="q-habit-row"><div><b>Morning walk</b><span>12 day streak</span></div>${mark("done")}</div>
                    <div class="q-habit-row"><div><b>Read 20 minutes</b><span>4 day streak</span></div>${mark("done")}</div>
                    <div class="q-habit-row"><div><b>Journal</b><span>Tap when complete</span></div>${mark("empty")}</div>
                    <div class="q-habit-row avoid"><div><b>No sugar</b><span>Quietly avoided today</span></div>${mark("done")}</div>
                    <div class="q-habit-row"><div><b>Stretch</b><span>Tap when complete</span></div>${mark("empty")}</div>
                </div>
            </div>
            ${mobileNav(navQuiet, "today")}`,
    },
    {
        id: "month",
        title: "Month",
        kicker: "Aggregate calendar",
        body: `
            ${phoneStatus()}
            <div class="app-content">
                ${header({ eyebrow: "Your rhythm", title: "September", action: "2026⌄" })}
                <div class="q-month-score"><span><b>76%</b> consistency</span><small>+8% from August</small></div>
                <div class="filter-pills"><b>All habits</b><span>Walk</span><span>Read</span><span>No sugar</span></div>
                <section class="calendar-card aggregate-calendar">
                    <div class="calendar-week"><b>M</b><b>T</b><b>W</b><b>T</b><b>F</b><b>S</b><b>S</b></div>
                    <div class="calendar-days">
                        <i class="muted">31</i><i class="good">1<small>4/5</small></i><i class="good">2<small>5/5</small></i><i class="selected">3<small>3/5</small></i><i>4</i><i>5</i><i>6</i>
                        <i>7</i><i>8</i><i>9</i><i>10</i><i>11</i><i>12</i><i>13</i>
                        <i>14</i><i>15</i><i>16</i><i>17</i><i>18</i><i>19</i><i>20</i>
                        <i>21</i><i>22</i><i>23</i><i>24</i><i>25</i><i>26</i><i>27</i>
                        <i>28</i><i>29</i><i>30</i><i class="muted">1</i><i class="muted">2</i><i class="muted">3</i><i class="muted">4</i>
                    </div>
                </section>
                <section class="q-insight">
                    <span>${icon("spark")}</span><div><b>Strongest pattern</b><p>You complete morning habits 2× more often.</p></div><em>›</em>
                </section>
                <p class="interaction-note">Tap a day for its checklist · choose one habit to enter Habit Lens</p>
            </div>
            ${mobileNav(navQuiet, "month")}`,
    },
    {
        id: "habits",
        title: "Habits",
        kicker: "Read mode first",
        body: `
            ${phoneStatus()}
            <div class="app-content">
                ${header({ title: "Your habits", action: "Edit", back: true })}
                <p class="screen-intro">The things you’re tending right now.</p>
                <div class="q-roster">
                    <div><i class="habit-symbol">W</i><span><b>Morning walk</b><small>Positive · 12 day streak</small></span><em>›</em></div>
                    <div><i class="habit-symbol">R</i><span><b>Read 20 minutes</b><small>Positive · 4 day streak</small></span><em>›</em></div>
                    <div><i class="habit-symbol">J</i><span><b>Journal</b><small>Positive · 2 times this week</small></span><em>›</em></div>
                    <div><i class="habit-symbol inverse">N</i><span><b>No sugar</b><small>Avoid · 18 clean days</small></span><em>›</em></div>
                    <div><i class="habit-symbol">S</i><span><b>Stretch</b><small>Positive · 3 times this week</small></span><em>›</em></div>
                </div>
                <button class="full-outline">${icon("plus")} Add a habit</button>
                <div class="mode-explainer"><b>Edit stays off by default</b><span>Tap Edit to reveal drag handles, polarity, archive, and delete.</span></div>
            </div>`,
    },
    {
        id: "sync",
        title: "Sync",
        kicker: "Quiet, account-led",
        body: `
            ${phoneStatus()}
            <div class="app-content">
                ${header({ eyebrow: "Settings", title: "Data & devices", back: true })}
                <section class="q-sync-hero">
                    <span class="sync-medallion">${icon("cloud-check")}</span>
                    <div><b>Everything is up to date</b><p>Last synced just now</p></div>
                    <button>${icon("more")}</button>
                </section>
                <div class="settings-group">
                    <div><span>${icon("refresh")}</span><p><b>Automatic sync</b><small>After changes and when you return</small></p><i class="toggle on"></i></div>
                    <div><span>${icon("user")}</span><p><b>kristian@example.com</b><small>Your account</small></p><em>›</em></div>
                    <div><span>${icon("devices")}</span><p><b>Linked devices</b><small>2 devices</small></p><em>›</em></div>
                </div>
                <button class="full-outline">${icon("refresh")} Sync now</button>
                <div class="settings-group compact-group">
                    <div><span>${icon("settings")}</span><p><b>Advanced</b><small>Custom server · Diagnostics</small></p><em>›</em></div>
                </div>
                <p class="privacy-note">${icon("lock")} Your habits stay on this phone when you sign out.</p>
            </div>
            ${mobileNav(navQuiet, "settings")}`,
    },
    {
        id: "devices",
        title: "Linked devices",
        kicker: "Identity before controls",
        body: `
            ${phoneStatus()}
            <div class="app-content">
                ${header({ eyebrow: "Data & devices", title: "Linked devices", back: true })}
                <p class="screen-intro">Devices that can sync your Habit data.</p>
                <button class="primary-wide">${icon("plus")} Link a device</button>
                <div class="device-list">
                    <div><span class="device-icon">${icon("phone")}</span><p><b>Pixel 9</b><small>This device · active now</small></p><i class="current-badge">Current</i></div>
                    <div><span class="device-icon">${icon("tablet")}</span><p><b>reMarkable 2</b><small>Last synced 8 minutes ago</small></p><button>${icon("more")}</button></div>
                </div>
                <section class="q-info-card"><b>Lost a device?</b><p>Remove it here to stop future syncs. Its local copy is not remotely erased.</p></section>
            </div>`,
    },
    {
        id: "link",
        title: "Link device",
        kicker: "Camera first, code fallback",
        body: `
            ${phoneStatus()}
            <div class="app-content">
                ${header({ eyebrow: "Step 1 of 2", title: "Link a device", back: true })}
                <p class="screen-intro">On your other device, open <b>Settings → Connect</b>.</p>
                <div class="scan-window">
                    <i></i><i></i><i></i><i></i>
                    <span>${icon("scan")}</span>
                    <b>Scan its QR code</b>
                    <small>Nothing is captured until a code is found</small>
                </div>
                <button class="primary-wide">Open camera</button>
                <div class="or-divider"><span></span><b>or</b><span></span></div>
                <button class="full-outline">Enter 6-character code</button>
                <p class="privacy-note">${icon("shield")} You’ll verify the device name before approving it.</p>
            </div>`,
    },
];

const signalScreens = [
    {
        id: "today",
        title: "Today",
        kicker: "Fast, high-energy capture",
        body: `
            ${phoneStatus("▮▮▮ ◉ 100%")}
            <div class="app-content signal-content">
                <div class="s-topline"><span>THU · SEP 03</span><button>${icon("cloud-check")}</button></div>
                <h4 class="s-display">Keep the<br />signal going.</h4>
                <div class="s-score"><b>60</b><span>%<small>3 OF 5 TODAY</small></span><i>↑ 12</i></div>
                <div class="s-habits">
                    <div class="complete"><span>01</span><p><b>Morning walk</b><small>12 DAYS STRONG</small></p>${mark("done")}</div>
                    <div class="complete"><span>02</span><p><b>Read 20 min</b><small>4 DAYS STRONG</small></p>${mark("done")}</div>
                    <div><span>03</span><p><b>Journal</b><small>READY TO LOG</small></p>${mark("empty")}</div>
                    <div class="avoid"><span>04</span><p><b>No sugar</b><small>AVOID · CLEAN TODAY</small></p>${mark("done")}</div>
                    <div><span>05</span><p><b>Stretch</b><small>READY TO LOG</small></p>${mark("empty")}</div>
                </div>
            </div>
            ${mobileNav(navSignal, "today")}`,
    },
    {
        id: "month",
        title: "Month",
        kicker: "One-habit analytical lens",
        body: `
            ${phoneStatus("▮▮▮ ◉ 100%")}
            <div class="app-content signal-content">
                ${header({ eyebrow: "Trends · September", title: "Habit lens", action: "2026⌄" })}
                <div class="lens-tabs"><span>Walk</span><b>Read</b><span>Journal</span><span>No sugar</span></div>
                <section class="s-lens-score"><div><small>READ 20 MINUTES</small><b>82%</b><span>completion</span></div><div class="s-mini-chart"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></section>
                <section class="calendar-card signal-calendar">
                    <div class="calendar-week"><b>M</b><b>T</b><b>W</b><b>T</b><b>F</b><b>S</b><b>S</b></div>
                    <div class="calendar-days">
                        <i class="muted">31</i><i class="good">1</i><i class="good">2</i><i class="selected">3</i><i>4</i><i>5</i><i>6</i>
                        <i class="good">7</i><i class="good">8</i><i class="bad">9</i><i class="good">10</i><i class="good">11</i><i>12</i><i>13</i>
                        <i class="good">14</i><i class="good">15</i><i class="good">16</i><i class="bad">17</i><i class="good">18</i><i>19</i><i>20</i>
                        <i class="good">21</i><i class="good">22</i><i class="good">23</i><i class="good">24</i><i class="good">25</i><i>26</i><i>27</i>
                        <i>28</i><i>29</i><i>30</i><i class="muted">1</i><i class="muted">2</i><i class="muted">3</i><i class="muted">4</i>
                    </div>
                </section>
                <div class="s-stat-row"><span><b>7</b><small>BEST STREAK</small></span><span><b>4</b><small>THIS STREAK</small></span><span><b>3</b><small>MISSED</small></span></div>
            </div>
            ${mobileNav(navSignal, "month")}`,
    },
    {
        id: "habits",
        title: "Habits",
        kicker: "Stats first, controls on demand",
        body: `
            ${phoneStatus("▮▮▮ ◉ 100%")}
            <div class="app-content signal-content">
                ${header({ eyebrow: "Your system", title: "Habits", action: "EDIT", back: true })}
                <div class="s-total"><b>5</b><span>ACTIVE HABITS<small>76% OVERALL SIGNAL</small></span><button>${icon("plus")}</button></div>
                <div class="s-roster">
                    <div><i style="--score:92%"></i><p><b>Morning walk</b><small>POSITIVE · 12 DAY STREAK</small></p><strong>92</strong></div>
                    <div><i style="--score:82%"></i><p><b>Read 20 minutes</b><small>POSITIVE · 4 DAY STREAK</small></p><strong>82</strong></div>
                    <div><i style="--score:48%"></i><p><b>Journal</b><small>POSITIVE · 2 THIS WEEK</small></p><strong>48</strong></div>
                    <div class="negative"><i style="--score:88%"></i><p><b>No sugar</b><small>AVOID · 18 CLEAN DAYS</small></p><strong>88</strong></div>
                    <div><i style="--score:66%"></i><p><b>Stretch</b><small>POSITIVE · 3 THIS WEEK</small></p><strong>66</strong></div>
                </div>
                <div class="mode-explainer dark"><b>EDIT is a mode</b><span>It changes this calm score view into a sortable control surface.</span></div>
            </div>`,
    },
    {
        id: "sync",
        title: "Sync",
        kicker: "Observable system timeline",
        body: `
            ${phoneStatus("▮▮▮ ◉ 100%")}
            <div class="app-content signal-content">
                ${header({ eyebrow: "You · Data", title: "Sync signal", back: true })}
                <section class="s-sync-banner"><span>${icon("cloud-check")}</span><div><small>STATUS</small><b>LIVE</b><p>Synced 12 seconds ago</p></div><i></i></section>
                <div class="s-sync-actions"><button>${icon("refresh")} Sync now</button><button>${icon("settings")} Configure</button></div>
                <h5 class="label-heading">ACTIVITY</h5>
                <div class="sync-timeline">
                    <div><i></i><p><b>Sync complete</b><small>4 entries received · 12 sec ago</small></p></div>
                    <div><i></i><p><b>Morning walk updated</b><small>This phone · 2 min ago</small></p></div>
                    <div><i></i><p><b>reMarkable connected</b><small>8 min ago</small></p></div>
                </div>
                <div class="settings-group signal-settings"><div><span>${icon("refresh")}</span><p><b>Automatic sync</b><small>Recommended</small></p><i class="toggle on"></i></div><div><span>${icon("cloud")}</span><p><b>Custom server</b><small>Advanced</small></p><em>›</em></div></div>
            </div>
            ${mobileNav(navSignal, "settings")}`,
    },
    {
        id: "devices",
        title: "Linked devices",
        kicker: "A network, not a settings list",
        body: `
            ${phoneStatus("▮▮▮ ◉ 100%")}
            <div class="app-content signal-content">
                ${header({ eyebrow: "Sync network", title: "2 devices", action: "+ LINK", back: true })}
                <div class="network-map"><span class="network-center">H</span><i class="line l1"></i><i class="line l2"></i><span class="network-node n1">${icon("phone")}<small>PIXEL 9</small></span><span class="network-node n2">${icon("tablet")}<small>REMARKABLE</small></span></div>
                <div class="s-device-cards">
                    <div><span>${icon("phone")}</span><p><b>Pixel 9</b><small>THIS DEVICE · ACTIVE NOW</small></p><i>LIVE</i></div>
                    <div><span>${icon("tablet")}</span><p><b>reMarkable 2</b><small>SYNCED 8 MIN AGO</small></p><button>${icon("more")}</button></div>
                </div>
                <p class="privacy-note signal-note">${icon("shield")} Removing access stops future syncs. It never erases a device remotely.</p>
            </div>`,
    },
    {
        id: "link",
        title: "Link device",
        kicker: "Code-led confirmation",
        body: `
            ${phoneStatus("▮▮▮ ◉ 100%")}
            <div class="app-content signal-content">
                ${header({ eyebrow: "Connect · 01/02", title: "Enter code", back: true })}
                <p class="screen-intro">Type the code displayed on your other device.</p>
                <div class="code-boxes"><b>T</b><b>4</b><b>M</b><b>9</b><b>Q</b><b>K</b></div>
                <div class="request-found"><span>${icon("tablet")}</span><div><small>REQUEST FOUND</small><b>reMarkable 2</b><p>Code expires in 04:32</p></div><i>${icon("check")}</i></div>
                <section class="permission-card"><h5>THIS WILL ALLOW</h5><p>${icon("check")} Sync habits and entries</p><p>${icon("check")} Stay connected until revoked</p><p>${icon("close")} No remote device control</p></section>
                <button class="signal-primary">APPROVE REMARKABLE 2 →</button>
                <button class="signal-link">SCAN QR INSTEAD</button>
            </div>`,
    },
];

const journalScreens = [
    {
        id: "today",
        title: "Today",
        kicker: "A pocket ritual",
        body: `
            ${phoneStatus("••• 100%")}
            <div class="app-content journal-content">
                <div class="j-mast"><span>HABIT / 2026</span><button>${icon("cloud-check")}</button></div>
                <div class="j-date"><small>THURSDAY</small><h4>September 3</h4><p>Small marks, kept daily.</p></div>
                <div class="j-progress"><div><b>3</b><span>/ 5 marked</span></div><i><em style="width:60%"></em></i></div>
                <div class="j-list">
                    <div><span>01</span><p><b>Morning walk</b><small>12 day thread</small></p><i class="j-check checked">✓</i></div>
                    <div><span>02</span><p><b>Read 20 minutes</b><small>4 day thread</small></p><i class="j-check checked">✓</i></div>
                    <div><span>03</span><p><b>Journal</b><small>leave your mark</small></p><i class="j-check"></i></div>
                    <div><span>04</span><p><b>No sugar</b><small>avoid · clear so far</small></p><i class="j-check slash">/</i></div>
                    <div><span>05</span><p><b>Stretch</b><small>leave your mark</small></p><i class="j-check"></i></div>
                </div>
                <button class="j-note">+ Add a note about today</button>
            </div>
            ${mobileNav(navJournal, "today")}`,
    },
    {
        id: "month",
        title: "Month",
        kicker: "Week-by-week logbook",
        body: `
            ${phoneStatus("••• 100%")}
            <div class="app-content journal-content">
                ${header({ eyebrow: "Logbook · 2026", title: "September", action: "⌄" })}
                <div class="j-month-summary"><span><b>76%</b><small>kept</small></span><p>19 good days<br /><em>8% above August</em></p></div>
                <div class="j-week-card current"><header><b>WEEK 36</b><span>NOW · 4 DAYS</span></header><div class="j-week-days"><span><b>M</b><i>4/5</i></span><span><b>T</b><i>5/5</i></span><span class="today"><b>W</b><i>3/5</i></span><span><b>T</b><i>—</i></span><span><b>F</b><i>—</i></span><span><b>S</b><i>—</i></span><span><b>S</b><i>—</i></span></div><footer><span>Morning walk</span><i>● ● ● ○</i></footer></div>
                <div class="j-week-card"><header><b>WEEK 35</b><span>25—31 AUG</span></header><div class="j-week-strip"><i class="full"></i><i class="full"></i><i class="full"></i><i></i><i class="full"></i><i class="half"></i><i class="full"></i></div><footer><span>26 of 35 kept</span><i>74%</i></footer></div>
                <div class="j-week-card"><header><b>WEEK 34</b><span>18—24 AUG</span></header><div class="j-week-strip"><i class="full"></i><i class="half"></i><i></i><i class="full"></i><i class="full"></i><i class="full"></i><i class="half"></i></div><footer><span>24 of 35 kept</span><i>69%</i></footer></div>
                <p class="interaction-note">Open a week to see its daily checklist. No sideways scrolling.</p>
            </div>
            ${mobileNav(navJournal, "month")}`,
    },
    {
        id: "habits",
        title: "Habits",
        kicker: "A clean contents page",
        body: `
            ${phoneStatus("••• 100%")}
            <div class="app-content journal-content">
                ${header({ eyebrow: "Contents", title: "Active habits", action: "Arrange", back: true })}
                <p class="j-rule-note">Five practices in this volume</p>
                <ol class="j-roster">
                    <li><span><b>Morning walk</b><small>positive · since 14 May</small></span><i>→</i></li>
                    <li><span><b>Read 20 minutes</b><small>positive · since 02 June</small></span><i>→</i></li>
                    <li><span><b>Journal</b><small>positive · since 18 June</small></span><i>→</i></li>
                    <li><span><b>No sugar</b><small>avoid · since 01 August</small></span><i>→</i></li>
                    <li><span><b>Stretch</b><small>positive · since 22 August</small></span><i>→</i></li>
                </ol>
                <button class="j-add">NEW HABIT <b>＋</b></button>
                <div class="mode-explainer journal-note"><b>“Arrange” opens a temporary edit sheet</b><span>Drag, rename, change polarity, archive, or delete—then close it.</span></div>
            </div>`,
    },
    {
        id: "sync",
        title: "Sync",
        kicker: "A reassuring backup receipt",
        body: `
            ${phoneStatus("••• 100%")}
            <div class="app-content journal-content">
                ${header({ eyebrow: "More · Data", title: "Backup & sync", back: true })}
                <section class="j-receipt">
                    <header><span>SYNC RECEIPT</span><b>COMPLETE</b></header>
                    <div class="receipt-cloud">${icon("cloud-check")}</div>
                    <h5>Your logbook is safe.</h5><p>Last synced at 09:41<br />3 Sep 2026</p>
                    <dl><div><dt>Habits</dt><dd>5</dd></div><div><dt>Entries</dt><dd>482</dd></div><div><dt>Devices</dt><dd>2</dd></div></dl>
                </section>
                <button class="j-add">SYNC AGAIN <b>↻</b></button>
                <div class="j-menu"><div><b>Automatic sync</b><i class="toggle on"></i></div><div><b>Linked devices</b><span>2 →</span></div><div><b>Account</b><span>kristian@… →</span></div><div><b>Custom server</b><span>Advanced →</span></div></div>
            </div>
            ${mobileNav(navJournal, "settings")}`,
    },
    {
        id: "devices",
        title: "Linked devices",
        kicker: "A device ledger",
        body: `
            ${phoneStatus("••• 100%")}
            <div class="app-content journal-content">
                ${header({ eyebrow: "Backup & sync", title: "Device ledger", back: true })}
                <div class="j-ledger-meta"><span>ACCOUNT<br /><b>kristian@example.com</b></span><i>2 DEVICES</i></div>
                <div class="j-device-ledger">
                    <div><span>01</span><p><b>Pixel 9</b><small>added 28 Aug · used now</small></p><i class="stamp">THIS<br />DEVICE</i></div>
                    <div><span>02</span><p><b>reMarkable 2</b><small>added 30 Aug · used 8m ago</small></p><button>${icon("more")}</button></div>
                </div>
                <button class="j-add">LINK ANOTHER DEVICE <b>＋</b></button>
                <p class="j-footnote">Removing a line from this ledger revokes future access. It does not erase the device’s local notebook.</p>
            </div>`,
    },
    {
        id: "link",
        title: "Link device",
        kicker: "A deliberate two-step ritual",
        body: `
            ${phoneStatus("••• 100%")}
            <div class="app-content journal-content">
                ${header({ eyebrow: "Device ledger · New", title: "Approve a device", back: true })}
                <div class="j-stepper"><b>1</b><i></i><span>2</span><small>ENTER CODE</small><small>APPROVE</small></div>
                <p class="screen-intro">Copy the six characters shown on the device.</p>
                <div class="j-code"><span>T</span><span>4</span><span>M</span><span>9</span><span>Q</span><span>K</span></div>
                <section class="j-request-card"><span>${icon("tablet")}</span><div><small>REQUESTING DEVICE</small><b>reMarkable 2</b><p>Near Oslo · expires in 4 min</p></div></section>
                <label class="j-confirm-line"><i>✓</i><span>I recognize this device and want it to sync my logbook.</span></label>
                <button class="j-add filled">APPROVE &amp; LINK <b>→</b></button>
                <button class="j-note">Scan a QR code instead</button>
            </div>`,
    },
];

const navOrbit = [
    ["today", "spark", "Now"],
    ["month", "chart", "Orbit"],
    ["settings", "more", "Elsewhere"],
];

const orbitScreens = [
    {
        id: "today",
        title: "Today",
        kicker: "Radial one-thumb control",
        body: `
            ${phoneStatus("◌ ◉ 100%")}
            <div class="app-content orbit-content">
                <div class="o-top"><span>SEP 03 · THU</span><button>${icon("cloud-check")}</button></div>
                <h4>What will you<br /><em>move today?</em></h4>
                <div class="habit-orbit">
                    <div class="orbit-core"><b>3<span>/5</span></b><small>COMPLETE</small></div>
                    <button class="satellite sat-1 done"><b>Walk</b><i>✓</i></button>
                    <button class="satellite sat-2 done"><b>Read</b><i>✓</i></button>
                    <button class="satellite sat-3"><b>Journal</b><i>·</i></button>
                    <button class="satellite sat-4 done"><b>No sugar</b><i>✓</i></button>
                    <button class="satellite sat-5"><b>Stretch</b><i>·</i></button>
                </div>
                <p class="o-instruction">Tap a satellite. Long-press the center for yesterday.</p>
            </div>
            ${mobileNav(navOrbit, "today")}`,
    },
    {
        id: "month",
        title: "Month",
        kicker: "A month as concentric time",
        body: `
            ${phoneStatus("◌ ◉ 100%")}
            <div class="app-content orbit-content">
                ${header({ eyebrow: "Time map · 2026", title: "September", action: "⌄" })}
                <div class="orbit-month">
                    <div class="month-ring ring-outer"></div><div class="month-ring ring-mid"></div><div class="month-ring ring-inner"></div>
                    <div class="month-center"><b>76%</b><span>RHYTHM</span></div>
                    <i class="ring-label rl-1">W36</i><i class="ring-label rl-2">W35</i><i class="ring-label rl-3">W34</i>
                    <button class="ring-now">3</button>
                </div>
                <div class="o-legend"><span><i class="bright"></i>Full day</span><span><i></i>Partial</span><span><i class="gap"></i>Open</span></div>
                <section class="o-focus"><small>SELECTED · THU 03</small><div><b>3 complete</b><span>2 open</span><em>→</em></div></section>
                <p class="interaction-note orbit-note-copy">Rotate the rings to move through weeks. Pinch outward to reveal one habit.</p>
            </div>
            ${mobileNav(navOrbit, "month")}`,
    },
    {
        id: "habits",
        title: "Habits",
        kicker: "A spatial constellation",
        body: `
            ${phoneStatus("◌ ◉ 100%")}
            <div class="app-content orbit-content">
                ${header({ eyebrow: "Your constellation", title: "Five signals", action: "EDIT", back: true })}
                <div class="constellation">
                    <i class="const-line c1"></i><i class="const-line c2"></i><i class="const-line c3"></i><i class="const-line c4"></i>
                    <button class="const-node cn1"><b>W</b><span>Walk</span></button><button class="const-node cn2"><b>R</b><span>Read</span></button><button class="const-node cn3"><b>J</b><span>Journal</span></button><button class="const-node cn4 negative"><b>N</b><span>No sugar</span></button><button class="const-node cn5"><b>S</b><span>Stretch</span></button>
                </div>
                <button class="orbit-primary">${icon("plus")} CREATE SIGNAL</button>
                <div class="mode-explainer orbit-explain"><b>Edit unlocks the constellation</b><span>Drag to reprioritize. Drop at the edge to archive. Tap for rename and polarity.</span></div>
            </div>`,
    },
    {
        id: "sync",
        title: "Sync",
        kicker: "Sync as an ambient pulse",
        body: `
            ${phoneStatus("◌ ◉ 100%")}
            <div class="app-content orbit-content">
                ${header({ eyebrow: "Elsewhere · Network", title: "Continuity", back: true })}
                <div class="sync-pulse"><span class="pulse p1"></span><span class="pulse p2"></span><span class="pulse p3"></span><i>${icon("cloud-check")}</i><b>IN SYNC</b><small>09:41 · just now</small></div>
                <div class="o-metrics"><span><b>2</b><small>DEVICES</small></span><span><b>5</b><small>HABITS</small></span><span><b>482</b><small>ENTRIES</small></span></div>
                <div class="o-menu"><button>${icon("refresh")} PULSE NOW</button><button>${icon("devices")} DEVICES <span>2</span></button><button>${icon("user")} ACCOUNT <span>↗</span></button><button>${icon("settings")} ADVANCED <span>↗</span></button></div>
            </div>
            ${mobileNav(navOrbit, "settings")}`,
    },
    {
        id: "devices",
        title: "Linked devices",
        kicker: "Devices literally orbit the data",
        body: `
            ${phoneStatus("◌ ◉ 100%")}
            <div class="app-content orbit-content">
                ${header({ eyebrow: "Continuity", title: "Your network", action: "+ LINK", back: true })}
                <div class="o-device-orbit"><div class="data-core">H<small>YOUR DATA</small></div><div class="device-sphere ds1">${icon("phone")}<b>PIXEL 9</b><small>NOW</small></div><div class="device-sphere ds2">${icon("tablet")}<b>REMARKABLE</b><small>8M</small></div><i class="o-orbit-line"></i></div>
                <section class="o-focus"><small>SELECT A DEVICE</small><div><b>Tap an orb</b><span>View details or revoke</span><em>↗</em></div></section>
                <p class="o-instruction">A dimmed orb means it has not synced recently. Red means it needs attention.</p>
            </div>`,
    },
    {
        id: "link",
        title: "Link device",
        kicker: "A sci-fi pairing portal",
        body: `
            ${phoneStatus("◌ ◉ 100%")}
            <div class="app-content orbit-content">
                ${header({ eyebrow: "Network · New link", title: "Open a portal", back: true })}
                <div class="portal-scan"><span class="portal-ring pr1"></span><span class="portal-ring pr2"></span><span class="portal-ring pr3"></span><i>${icon("scan")}</i><b>ALIGN QR</b></div>
                <p class="o-instruction">Point this phone at the code on your other device.</p>
                <button class="orbit-primary">OPEN CAMERA</button>
                <button class="o-code-link">ENTER T4M9QK MANUALLY</button>
                <div class="o-security">${icon("shield")} <span>You will see the device identity before the portal opens.</span></div>
            </div>`,
    },
];

const navGarden = [
    ["today", "home", "Tend"],
    ["month", "calendar", "Garden"],
    ["settings", "settings", "Shed"],
];

const gardenScreens = [
    {
        id: "today",
        title: "Today",
        kicker: "Habits that visibly grow",
        body: `
            ${phoneStatus("⌁ ◉ 100%")}
            <div class="app-content garden-content">
                <div class="g-top"><span>THURSDAY · 03 SEP</span><button>${icon("cloud-check")}</button></div>
                <h4>Good morning.<br /><em>Your garden is awake.</em></h4>
                <section class="garden-bed">
                    <div class="plant p-walk grown"><i></i><i></i><b></b><span>Walk</span></div>
                    <div class="plant p-read grown"><i></i><i></i><b></b><span>Read</span></div>
                    <div class="plant p-journal"><i></i><i></i><b></b><span>Journal</span></div>
                    <div class="plant p-sugar grown"><i></i><i></i><b></b><span>No sugar</span></div>
                    <div class="plant p-stretch"><i></i><i></i><b></b><span>Stretch</span></div>
                    <div class="soil"></div>
                </section>
                <div class="g-today-score"><span><b>3 of 5 tended</b><small>Two plants need a little attention</small></span><i>60%</i></div>
                <button class="garden-primary">Tend next habit ${icon("arrow-right")}</button>
            </div>
            ${mobileNav(navGarden, "today")}`,
    },
    {
        id: "month",
        title: "Month",
        kicker: "A garden plot heatmap",
        body: `
            ${phoneStatus("⌁ ◉ 100%")}
            <div class="app-content garden-content">
                ${header({ eyebrow: "Your garden · 2026", title: "September", action: "⌄" })}
                <div class="g-season"><span><b>76%</b><small>THRIVING</small></span><p>Warmest streak<br /><strong>12 days</strong></p></div>
                <div class="filter-pills garden-pills"><b>Whole garden</b><span>Walk</span><span>Read</span></div>
                <section class="garden-calendar">
                    <div class="calendar-week"><b>M</b><b>T</b><b>W</b><b>T</b><b>F</b><b>S</b><b>S</b></div>
                    <div class="garden-plots"><i class="muted"></i><i class="lush">1</i><i class="lush">2</i><i class="selected">3</i><i>4</i><i>5</i><i>6</i><i class="lush">7</i><i class="lush">8</i><i class="dry">9</i><i class="lush">10</i><i>11</i><i>12</i><i>13</i><i class="lush">14</i><i>15</i><i>16</i><i>17</i><i>18</i><i>19</i><i>20</i><i>21</i><i>22</i><i>23</i><i>24</i><i>25</i><i>26</i><i>27</i><i>28</i><i>29</i><i>30</i><i class="muted"></i><i class="muted"></i><i class="muted"></i><i class="muted"></i></div>
                </section>
                <section class="g-tip">${icon("spark")}<div><b>Your reading plant likes weekdays.</b><p>Tap to see its month.</p></div><span>→</span></section>
            </div>
            ${mobileNav(navGarden, "month")}`,
    },
    {
        id: "habits",
        title: "Habits",
        kicker: "A seed library with arrange mode",
        body: `
            ${phoneStatus("⌁ ◉ 100%")}
            <div class="app-content garden-content">
                ${header({ eyebrow: "The potting shed", title: "Seed library", action: "Arrange", back: true })}
                <p class="screen-intro">Five habits are currently growing.</p>
                <div class="seed-library">
                    <div><i class="seed seed-a"></i><p><b>Morning walk</b><small>Strong · 12 day stem</small></p><span>›</span></div>
                    <div><i class="seed seed-b"></i><p><b>Read 20 minutes</b><small>Healthy · 4 day stem</small></p><span>›</span></div>
                    <div><i class="seed seed-c"></i><p><b>Journal</b><small>New growth</small></p><span>›</span></div>
                    <div><i class="seed seed-d"></i><p><b>No sugar</b><small>Protective · avoid habit</small></p><span>›</span></div>
                    <div><i class="seed seed-e"></i><p><b>Stretch</b><small>Needs attention</small></p><span>›</span></div>
                </div>
                <button class="garden-primary">${icon("plus")} Plant a new habit</button>
                <p class="g-footnote">Arrange mode reveals reorder, rename, polarity, archive, and delete tools.</p>
            </div>`,
    },
    {
        id: "sync",
        title: "Sync",
        kicker: "A connected greenhouse",
        body: `
            ${phoneStatus("⌁ ◉ 100%")}
            <div class="app-content garden-content">
                ${header({ eyebrow: "The potting shed", title: "Greenhouse", back: true })}
                <section class="g-sync-house"><div class="house-roof"></div><div class="house-body"><span>${icon("cloud-check")}</span><b>Your garden is safe</b><small>Synced just now</small></div></section>
                <div class="g-sync-grid"><div><b>5</b><span>PLANTS</span></div><div><b>482</b><span>MARKS</span></div><div><b>2</b><span>PLACES</span></div></div>
                <div class="g-menu"><div><span>${icon("refresh")}</span><p><b>Automatic tending</b><small>Sync after every change</small></p><i class="toggle on"></i></div><div><span>${icon("devices")}</span><p><b>Other gardens</b><small>2 linked devices</small></p><em>›</em></div><div><span>${icon("settings")}</span><p><b>Greenhouse settings</b><small>Account · custom server</small></p><em>›</em></div></div>
                <button class="garden-outline">Sync the garden now</button>
            </div>
            ${mobileNav(navGarden, "settings")}`,
    },
    {
        id: "devices",
        title: "Linked devices",
        kicker: "Every device is another planter",
        body: `
            ${phoneStatus("⌁ ◉ 100%")}
            <div class="app-content garden-content">
                ${header({ eyebrow: "Greenhouse", title: "Other gardens", back: true })}
                <p class="screen-intro">Your habits are growing in two places.</p>
                <div class="planters"><div class="planter current"><span>${icon("phone")}</span><i></i><b>Pixel 9</b><small>THIS GARDEN · NOW</small></div><div class="planter"><span>${icon("tablet")}</span><i></i><b>reMarkable 2</b><small>TENDED 8M AGO</small></div></div>
                <button class="garden-primary">${icon("plus")} Add another garden</button>
                <section class="g-tip">${icon("shield")}<div><b>Removing a garden</b><p>Stops future sync without erasing its local copy.</p></div></section>
            </div>`,
    },
    {
        id: "link",
        title: "Link device",
        kicker: "Grow the same habits elsewhere",
        body: `
            ${phoneStatus("⌁ ◉ 100%")}
            <div class="app-content garden-content">
                ${header({ eyebrow: "Greenhouse · New", title: "Add a garden", back: true })}
                <div class="g-link-illustration"><span class="little-pot">${icon("phone")}<i></i></span><em>•••••••</em><span class="little-pot">${icon("tablet")}<i></i></span></div>
                <h5 class="g-center-title">Bring this garden<br />to another device.</h5>
                <p class="g-center-copy">Scan the QR code shown there, or enter its six-character seed code.</p>
                <button class="garden-primary">${icon("scan")} Scan QR code</button>
                <button class="garden-outline">Enter seed code</button>
                <p class="privacy-note garden-note">${icon("shield")} You’ll confirm the device name before anything is shared.</p>
            </div>`,
    },
];

const navNative = [
    ["today", "check", "Today"],
    ["month", "calendar", "Review"],
    ["settings", "settings", "Settings"],
];

const nativeScreens = [
    {
        id: "today",
        title: "Today",
        kicker: "Platform-native restraint",
        body: `${phoneStatus()}<div class="app-content native-content"><div class="n-nav"><button>‹</button><b>Today</b><button>${icon("user")}</button></div><div class="n-date"><b>Thursday, September 3</b><span>3 of 5 complete</span><i><em style="width:60%"></em></i></div><div class="n-group"><label>YOUR HABITS</label><div><span class="n-glyph blue">${icon("check")}</span><p><b>Morning walk</b><small>12 day streak</small></p>${mark("done")}</div><div><span class="n-glyph blue">${icon("check")}</span><p><b>Read 20 minutes</b><small>4 day streak</small></p>${mark("done")}</div><div><span class="n-glyph gray">3</span><p><b>Journal</b><small>Not marked</small></p>${mark("empty")}</div><div><span class="n-glyph orange">${icon("shield")}</span><p><b>No sugar</b><small>Avoid · clean today</small></p>${mark("done")}</div><div><span class="n-glyph gray">5</span><p><b>Stretch</b><small>Not marked</small></p>${mark("empty")}</div></div></div>${mobileNav(navNative, "today")}`,
    },
    {
        id: "month",
        title: "Month",
        kicker: "Familiar calendar, useful summary",
        body: `${phoneStatus()}<div class="app-content native-content"><div class="n-nav"><button>${icon("arrow-left")}</button><b>September 2026</b><button>Today</button></div><div class="n-segment"><b>Overall</b><span>By habit</span></div><section class="calendar-card n-calendar"><div class="calendar-week"><b>M</b><b>T</b><b>W</b><b>T</b><b>F</b><b>S</b><b>S</b></div><div class="calendar-days"><i class="muted">31</i><i class="good">1<small>4/5</small></i><i class="good">2<small>5/5</small></i><i class="selected">3<small>3/5</small></i><i>4</i><i>5</i><i>6</i><i class="good">7</i><i class="good">8</i><i class="bad">9</i><i class="good">10</i><i>11</i><i>12</i><i>13</i><i>14</i><i>15</i><i>16</i><i>17</i><i>18</i><i>19</i><i>20</i><i>21</i><i>22</i><i>23</i><i>24</i><i>25</i><i>26</i><i>27</i><i>28</i><i>29</i><i>30</i><i class="muted">1</i><i class="muted">2</i><i class="muted">3</i><i class="muted">4</i></div></section><div class="n-summary"><label>SEPTEMBER SUMMARY</label><div><span><b>76%</b><small>Consistency</small></span><span><b>12</b><small>Best streak</small></span><span><b>3</b><small>Slip-ups</small></span></div></div></div>${mobileNav(navNative, "month")}`,
    },
    {
        id: "habits",
        title: "Habits",
        kicker: "Simple list until Edit",
        body: `${phoneStatus()}<div class="app-content native-content"><div class="n-nav"><button>${icon("arrow-left")}</button><b>Habits</b><button>Edit</button></div><div class="n-group n-roster"><label>ACTIVE · 5</label><div><span class="n-glyph blue">1</span><p><b>Morning walk</b><small>Positive</small></p><em>›</em></div><div><span class="n-glyph violet">2</span><p><b>Read 20 minutes</b><small>Positive</small></p><em>›</em></div><div><span class="n-glyph green">3</span><p><b>Journal</b><small>Positive</small></p><em>›</em></div><div><span class="n-glyph orange">4</span><p><b>No sugar</b><small>Avoid</small></p><em>›</em></div><div><span class="n-glyph red">5</span><p><b>Stretch</b><small>Positive</small></p><em>›</em></div></div><button class="n-add">${icon("plus")} Add habit</button><p class="n-foot">Edit reveals reorder and archive. Delete stays inside each habit’s detail page.</p></div>`,
    },
    {
        id: "sync",
        title: "Sync",
        kicker: "System settings hierarchy",
        body: `${phoneStatus()}<div class="app-content native-content"><div class="n-nav"><button>${icon("arrow-left")}</button><b>Sync</b><button></button></div><section class="n-sync-status"><span>${icon("cloud-check")}</span><p><b>Up to date</b><small>Last synced just now</small></p></section><div class="n-group"><label>SYNC</label><div><p><b>Automatic sync</b><small>When changes are made</small></p><i class="toggle on"></i></div><div><p><b>Sync now</b><small>Check for changes</small></p><em>›</em></div></div><div class="n-group"><label>ACCOUNT</label><div><span class="n-glyph blue">${icon("user")}</span><p><b>kristian@example.com</b><small>Signed in</small></p><em>›</em></div><div><span class="n-glyph gray">${icon("devices")}</span><p><b>Linked devices</b><small>2 devices</small></p><em>›</em></div></div><div class="n-group"><label>ADVANCED</label><div><p><b>Custom server</b><small>Not configured</small></p><em>›</em></div></div></div>${mobileNav(navNative, "settings")}`,
    },
    {
        id: "devices",
        title: "Linked devices",
        kicker: "Conventional and reassuring",
        body: `${phoneStatus()}<div class="app-content native-content"><div class="n-nav"><button>${icon("arrow-left")}</button><b>Linked devices</b><button>Add</button></div><div class="n-group n-device-group"><label>2 DEVICES</label><div><span class="n-device-icon">${icon("phone")}</span><p><b>Pixel 9</b><small>This device · active now</small></p><em>›</em></div><div><span class="n-device-icon">${icon("tablet")}</span><p><b>reMarkable 2</b><small>Last synced 8 min ago</small></p><em>›</em></div></div><div class="n-note"><b>About device access</b><p>Removing a device prevents future sync. It does not remotely erase data already stored there.</p></div><button class="n-danger">Sign out all other devices</button></div>`,
    },
    {
        id: "link",
        title: "Link device",
        kicker: "Plain two-method setup",
        body: `${phoneStatus()}<div class="app-content native-content"><div class="n-nav"><button>${icon("arrow-left")}</button><b>Link a device</b><button></button></div><div class="n-link-icon">${icon("devices")}</div><h5 class="n-center-title">Connect another device</h5><p class="n-center-copy">Scan the QR code shown by Habit on the other device.</p><button class="n-primary">${icon("scan")} Scan QR code</button><div class="or-divider"><span></span><b>OR ENTER CODE</b><span></span></div><div class="n-code-input">T4M9QK</div><button class="n-secondary">Continue</button><p class="privacy-note">${icon("shield")} You’ll confirm the device name before linking.</p></div>`,
    },
];

const navFocus = [
    ["today", "home", "Focus"],
    ["month", "calendar", "Review"],
    ["settings", "more", "More"],
];
const focusScreens = [
    {
        id: "today",
        title: "Today",
        kicker: "One habit at a time",
        body: `${phoneStatus("● ◔")}
            <div class="app-content focus-content"><div class="f-top"><span>3 SEP · 2 OF 5</span><button>${icon("more")}</button></div><div class="f-queue"><i class="done"></i><i class="active"></i><i></i><i></i><i></i></div><section class="f-card"><span class="f-number">02</span><small>NEXT UP</small><h4>Read for<br />20 minutes.</h4><p>Four days in a row. Keep this one small.</p><div class="f-timer">20:00</div></section><button class="f-done">${icon("check")} I did this</button><button class="f-skip">Not today <span>→</span></button><p class="f-hint">Swipe sideways to choose another habit</p></div>${mobileNav(navFocus, "today")}`,
    },
    {
        id: "month",
        title: "Month",
        kicker: "Small multiples, no calendar matrix",
        body: `${phoneStatus("● ◔")}<div class="app-content focus-content">${header({ eyebrow: "Review", title: "September", action: "2026⌄" })}<div class="f-month-lead"><b>76%</b><span>Your rhythm<br /><em>+8% from August</em></span></div><div class="f-multiples"><div><p><b>Morning walk</b><small>92%</small></p><i>${Array(
            31,
        )
            .fill(0)
            .map(
                (_, i) =>
                    `<em class="${i < 21 && i % 6 !== 4 ? "on" : ""}"></em>`,
            )
            .join(
                "",
            )}</i></div><div><p><b>Read 20 minutes</b><small>82%</small></p><i>${Array(
            31,
        )
            .fill(0)
            .map(
                (_, i) =>
                    `<em class="${i < 18 && i % 5 !== 2 ? "on" : ""}"></em>`,
            )
            .join(
                "",
            )}</i></div><div><p><b>Journal</b><small>48%</small></p><i>${Array(
            31,
        )
            .fill(0)
            .map(
                (_, i) =>
                    `<em class="${i < 16 && i % 3 === 0 ? "on" : ""}"></em>`,
            )
            .join(
                "",
            )}</i></div><div><p><b>No sugar</b><small>88%</small></p><i>${Array(
            31,
        )
            .fill(0)
            .map((_, i) => `<em class="${i < 23 && i !== 8 ? "on" : ""}"></em>`)
            .join(
                "",
            )}</i></div><div><p><b>Stretch</b><small>66%</small></p><i>${Array(
            31,
        )
            .fill(0)
            .map(
                (_, i) =>
                    `<em class="${i < 20 && i % 4 !== 1 ? "on" : ""}"></em>`,
            )
            .join(
                "",
            )}</i></div></div><p class="interaction-note">Every row is a whole month. Tap one to expand dates and edit marks.</p></div>${mobileNav(navFocus, "month")}`,
    },
    {
        id: "habits",
        title: "Habits",
        kicker: "A prioritized queue",
        body: `${phoneStatus("● ◔")}<div class="app-content focus-content">${header({ eyebrow: "More", title: "Your queue", action: "Edit", back: true })}<p class="screen-intro">The top habit appears first in Focus.</p><div class="f-stack"><div><span>01</span><p><b>Morning walk</b><small>12 day streak</small></p><em>↗</em></div><div><span>02</span><p><b>Read 20 minutes</b><small>4 day streak</small></p><em>↗</em></div><div><span>03</span><p><b>Journal</b><small>2 times this week</small></p><em>↗</em></div><div class="avoid"><span>04</span><p><b>No sugar</b><small>Avoid habit</small></p><em>↗</em></div><div><span>05</span><p><b>Stretch</b><small>3 times this week</small></p><em>↗</em></div></div><button class="f-outline">${icon("plus")} Add to the queue</button></div>`,
    },
    {
        id: "sync",
        title: "Sync",
        kicker: "One status, one action",
        body: `${phoneStatus("● ◔")}<div class="app-content focus-content">${header({ eyebrow: "More", title: "Continuity", back: true })}<section class="f-sync"><span>${icon("cloud-check")}</span><small>YOUR HABITS ARE</small><h4>Everywhere.</h4><p>This phone and your reMarkable agree.<br />Last checked just now.</p></section><button class="f-done">${icon("refresh")} Check again</button><div class="f-simple-menu"><div><b>Automatic sync</b><i class="toggle on"></i></div><div><b>2 connected devices</b><span>→</span></div><div><b>kristian@example.com</b><span>→</span></div><div><b>Advanced server settings</b><span>→</span></div></div></div>${mobileNav(navFocus, "settings")}`,
    },
    {
        id: "devices",
        title: "Linked devices",
        kicker: "A two-card handoff",
        body: `${phoneStatus("● ◔")}<div class="app-content focus-content">${header({ eyebrow: "Continuity", title: "Two places", back: true })}<div class="f-device-stack"><section><span>${icon("phone")}</span><small>HERE</small><h4>Pixel 9</h4><p>Active now · this device</p></section><section><span>${icon("tablet")}</span><small>THERE</small><h4>reMarkable 2</h4><p>Last synced 8 minutes ago</p></section></div><button class="f-done">${icon("plus")} Connect another place</button><p class="f-hint wide">Tap a device card to inspect or revoke its access.</p></div>`,
    },
    {
        id: "link",
        title: "Link device",
        kicker: "Camera fills the whole task",
        body: `${phoneStatus("● ◔")}<div class="app-content focus-content full-camera">${header({ eyebrow: "Connect", title: "Find the code", back: true })}<div class="f-viewfinder"><i></i><i></i><i></i><i></i><span>${icon("scan")}</span><p>Point at the QR code<br />on your other device.</p></div><button class="f-camera-code">Enter six characters instead</button></div>`,
    },
];

const navBento = [
    ["today", "home", "Today"],
    ["month", "chart", "Board"],
    ["settings", "user", "You"],
];
const bentoScreens = [
    {
        id: "today",
        title: "Today",
        kicker: "Modular at-a-glance board",
        body: `${phoneStatus()}<div class="app-content bento-content"><div class="b-top"><div><small>THU · 03 SEP</small><h4>Today</h4></div><button>${icon("cloud-check")}</button></div><div class="b-grid"><section class="b-score"><small>DAILY SCORE</small><b>60<span>%</span></b><i><em style="width:60%"></em></i></section><section class="b-streak"><span>🔥</span><b>12</b><small>BEST STREAK</small></section><section class="b-wide"><small>UP NEXT</small><b>Journal</b><p>Two days this week</p><button>${icon("check")}</button></section><section class="b-mini done"><b>Walk</b><span>✓</span></section><section class="b-mini done"><b>Read</b><span>✓</span></section><section class="b-mini avoid"><b>No sugar</b><span>✓</span></section><section class="b-mini"><b>Stretch</b><span>—</span></section></div></div>${mobileNav(navBento, "today")}`,
    },
    {
        id: "month",
        title: "Month",
        kicker: "Analytics in rearrangeable tiles",
        body: `${phoneStatus()}<div class="app-content bento-content">${header({ eyebrow: "Your board", title: "September", action: "2026⌄" })}<div class="b-month-grid"><section class="b-month-score"><small>CONSISTENCY</small><b>76%</b><span>↑ 8%</span></section><section class="b-month-streak"><small>BEST RUN</small><b>12</b><span>days</span></section><section class="b-heat"><small>DAILY RHYTHM</small><div>${Array(
            35,
        )
            .fill(0)
            .map(
                (_, i) =>
                    `<i class="${i < 22 ? (i % 5 ? "on" : "mid") : ""}"></i>`,
            )
            .join(
                "",
            )}</div></section><section class="b-bars"><small>BY HABIT</small><p><b>Walk</b><i><em style="width:92%"></em></i><span>92</span></p><p><b>Read</b><i><em style="width:82%"></em></i><span>82</span></p><p><b>Journal</b><i><em style="width:48%"></em></i><span>48</span></p></section><section class="b-insight">${icon("spark")}<p><b>Weekdays win</b><span>You’re 24% more consistent Monday–Friday.</span></p></section></div></div>${mobileNav(navBento, "month")}`,
    },
    {
        id: "habits",
        title: "Habits",
        kicker: "Each habit is a modular tile",
        body: `${phoneStatus()}<div class="app-content bento-content">${header({ eyebrow: "Board settings", title: "Habits", action: "Edit", back: true })}<div class="b-habit-grid"><section><b>Morning walk</b><span>92%</span><small>12 DAY STREAK</small></section><section><b>Read 20 min</b><span>82%</span><small>4 DAY STREAK</small></section><section><b>Journal</b><span>48%</span><small>2 THIS WEEK</small></section><section class="avoid"><b>No sugar</b><span>88%</span><small>AVOID · CLEAN</small></section><section><b>Stretch</b><span>66%</span><small>3 THIS WEEK</small></section><button>${icon("plus")}<span>New habit</span></button></div><div class="mode-explainer"><b>Edit rearranges the board</b><span>Tiles gain drag handles and a menu only while edit mode is active.</span></div></div>`,
    },
    {
        id: "sync",
        title: "Sync",
        kicker: "Status as a modular dashboard",
        body: `${phoneStatus()}<div class="app-content bento-content">${header({ eyebrow: "You · Data", title: "Sync board", back: true })}<div class="b-sync-grid"><section class="b-sync-main"><span>${icon("cloud-check")}</span><small>STATUS</small><b>Up to date</b><p>Just now</p></section><section><small>DEVICES</small><b>2</b><p>Both active</p></section><section><small>ENTRIES</small><b>482</b><p>Protected</p></section><section class="b-sync-action">${icon("refresh")}<b>Sync now</b></section><section class="b-sync-action">${icon("devices")}<b>Devices</b></section><section class="b-sync-wide"><p><b>Automatic sync</b><small>After every change</small></p><i class="toggle on"></i></section><section class="b-sync-wide"><p><b>Custom server</b><small>Advanced</small></p><span>→</span></section></div></div>${mobileNav(navBento, "settings")}`,
    },
    {
        id: "devices",
        title: "Linked devices",
        kicker: "Device tiles with activity",
        body: `${phoneStatus()}<div class="app-content bento-content">${header({ eyebrow: "Sync board", title: "Devices", action: "+ Link", back: true })}<div class="b-devices"><section class="current"><span>${icon("phone")}</span><small>THIS DEVICE</small><b>Pixel 9</b><p>Active now</p><i>LIVE</i></section><section><span>${icon("tablet")}</span><small>E-INK</small><b>reMarkable 2</b><p>8 minutes ago</p><i>SYNCED</i></section></div><section class="b-device-note"><b>Everything connected</b><p>Both devices have the latest changes.</p></section><button class="b-primary">${icon("plus")} Link another device</button></div>`,
    },
    {
        id: "link",
        title: "Link device",
        kicker: "Choose a pairing tile",
        body: `${phoneStatus()}<div class="app-content bento-content">${header({ eyebrow: "Devices · New", title: "How do you want to link?", back: true })}<div class="b-link-choices"><button><span>${icon("scan")}</span><b>Scan QR code</b><small>Fastest · use the camera</small><em>→</em></button><button><span>${icon("link")}</span><b>Enter short code</b><small>Type six characters</small><em>→</em></button></div><section class="b-link-help">${icon("shield")}<p><b>You stay in control</b><span>We show the requesting device’s name before you approve access.</span></p></section></div>`,
    },
];

const navMultiples = [
    ["today", "check", "Today"],
    ["month", "chart", "Patterns"],
    ["settings", "settings", "Manage"],
];
const multiplesScreens = [
    {
        id: "today",
        title: "Today",
        kicker: "Compact information density",
        body: `${phoneStatus()}<div class="app-content multiples-content"><div class="m-head"><div><span>THU 03 SEP</span><h4>Today’s log</h4></div><b>3/5</b></div><div class="m-table"><header><span>HABIT</span><span>STREAK</span><span>TODAY</span></header><div><p><b>Morning walk</b><small>Positive</small></p><i>12d</i>${mark("done")}</div><div><p><b>Read 20 minutes</b><small>Positive</small></p><i>4d</i>${mark("done")}</div><div><p><b>Journal</b><small>Positive</small></p><i>—</i>${mark("empty")}</div><div><p><b>No sugar</b><small>Avoid</small></p><i>18d</i>${mark("done")}</div><div><p><b>Stretch</b><small>Positive</small></p><i>—</i>${mark("empty")}</div></div><div class="m-foot-summary"><span><b>60%</b> complete</span><span><b>0</b> slips</span></div></div>${mobileNav(navMultiples, "today")}`,
    },
    {
        id: "month",
        title: "Month",
        kicker: "The clearest all-habit overview",
        body: `${phoneStatus()}<div class="app-content multiples-content">${header({ eyebrow: "Patterns", title: "September 2026", action: "‹ ›" })}<div class="m-key"><span><i class="on"></i>Done</span><span><i class="miss"></i>Missed</span><span><i></i>Open</span></div><div class="m-small-multiples">${[
            ["Morning walk", 92],
            ["Read 20 min", 82],
            ["Journal", 48],
            ["No sugar", 88],
            ["Stretch", 66],
        ]
            .map(
                ([name, score], r) =>
                    `<section><header><b>${name}</b><span>${score}%</span></header><div>${Array(
                        31,
                    )
                        .fill(0)
                        .map(
                            (_, i) =>
                                `<i class="${i < 23 && (i + r) % 5 !== 2 ? "on" : i < 18 && (i + r) % 7 === 0 ? "miss" : ""}"></i>`,
                        )
                        .join(
                            "",
                        )}</div><footer><span>1</span><span>8</span><span>15</span><span>22</span><span>30</span></footer></section>`,
            )
            .join(
                "",
            )}</div><p class="interaction-note">All 155 cells fit without horizontal scrolling. Tap a row for dates.</p></div>${mobileNav(navMultiples, "month")}`,
    },
    {
        id: "habits",
        title: "Habits",
        kicker: "Roster as a compact index",
        body: `${phoneStatus()}<div class="app-content multiples-content">${header({ eyebrow: "Manage", title: "Habit index", action: "Edit", back: true })}<div class="m-index"><header><span>#</span><span>NAME</span><span>TYPE</span><span>RATE</span></header>${[
            [1, "Morning walk", "DO", 92],
            [2, "Read 20 min", "DO", 82],
            [3, "Journal", "DO", 48],
            [4, "No sugar", "AVOID", 88],
            [5, "Stretch", "DO", 66],
        ]
            .map(
                (x) =>
                    `<div><i>${x[0]}</i><b>${x[1]}</b><small>${x[2]}</small><span>${x[3]}%</span></div>`,
            )
            .join(
                "",
            )}</div><button class="m-add">${icon("plus")} Add habit</button><p class="n-foot">Edit adds reorder handles and row menus. The default remains a readable index.</p></div>`,
    },
    {
        id: "sync",
        title: "Sync",
        kicker: "A compact system report",
        body: `${phoneStatus()}<div class="app-content multiples-content">${header({ eyebrow: "Manage", title: "Sync report", back: true })}<div class="m-status-line"><i></i><p><b>UP TO DATE</b><small>09 Sep · 09:41:08</small></p><button>${icon("refresh")}</button></div><div class="m-report"><header>LOCAL DATA</header><div><span>Habits</span><b>5</b></div><div><span>Entries</span><b>482</b></div><div><span>Pending edits</span><b>0</b></div><header>CONNECTION</header><div><span>Account</span><b>kristian@…</b></div><div><span>Devices</span><b>2</b></div><div><span>Automatic sync</span><i class="toggle on"></i></div><header>ADVANCED</header><div><span>Server</span><b>Default ↗</b></div><div><span>Diagnostics</span><b>Open ↗</b></div></div></div>${mobileNav(navMultiples, "settings")}`,
    },
    {
        id: "devices",
        title: "Linked devices",
        kicker: "Auditable access table",
        body: `${phoneStatus()}<div class="app-content multiples-content">${header({ eyebrow: "Sync report", title: "Device access", action: "+ Link", back: true })}<div class="m-device-table"><header><span>DEVICE</span><span>LAST USE</span><span></span></header><div><p><b>Pixel 9</b><small>This device · added 28 Aug</small></p><span>Now</span><button>${icon("more")}</button></div><div><p><b>reMarkable 2</b><small>Added 30 Aug</small></p><span>8m</span><button>${icon("more")}</button></div></div><div class="m-audit"><b>RECENT ACCESS</b><p><span>09:33</span>reMarkable completed sync</p><p><span>09:12</span>Pixel 9 changed 2 entries</p><p><span>Yesterday</span>reMarkable paired</p></div></div>`,
    },
    {
        id: "link",
        title: "Link device",
        kicker: "A precise verification form",
        body: `${phoneStatus()}<div class="app-content multiples-content">${header({ eyebrow: "Device access", title: "New device", back: true })}<label class="m-label">PAIRING CODE</label><div class="m-code-field">T4M 9QK</div><p class="m-help">Enter the six-character code displayed on the requesting device.</p><section class="m-found"><span>${icon("tablet")}</span><p><small>REQUEST FOUND</small><b>reMarkable 2</b><em>Expires in 04:32</em></p><i>${icon("check")}</i></section><div class="m-permissions"><b>PERMISSIONS</b><p>✓ Read and sync habits</p><p>✓ Write new entries</p><p>× No remote device control</p></div><button class="m-primary">Approve device</button><button class="m-text">Scan QR code instead</button></div>`,
    },
];

const navGlass = [
    ["today", "home", "Home"],
    ["month", "spark", "Flow"],
    ["settings", "user", "Profile"],
];
const glassScreens = [
    {
        id: "today",
        title: "Today",
        kicker: "Layered, atmospheric surfaces",
        body: `${phoneStatus()}<div class="app-content glass-content"><div class="gl-ambient a1"></div><div class="gl-ambient a2"></div><div class="gl-top"><div><small>THURSDAY</small><h4>03 September</h4></div><button>${icon("cloud-check")}</button></div><section class="gl-score"><div class="gl-ring"><b>60%</b></div><p><small>TODAY</small><b>Three moments kept.</b><span>Two are still waiting for you.</span></p></section><div class="gl-list"><div><span>☀</span><p><b>Morning walk</b><small>12 day glow</small></p>${mark("done")}</div><div><span>◒</span><p><b>Read 20 minutes</b><small>4 day glow</small></p>${mark("done")}</div><div><span>✦</span><p><b>Journal</b><small>Ready</small></p>${mark("empty")}</div><div><span>◇</span><p><b>No sugar</b><small>Clear today</small></p>${mark("done")}</div><div><span>∿</span><p><b>Stretch</b><small>Ready</small></p>${mark("empty")}</div></div></div>${mobileNav(navGlass, "today")}`,
    },
    {
        id: "month",
        title: "Month",
        kicker: "Floating calendar layers",
        body: `${phoneStatus()}<div class="app-content glass-content"><div class="gl-ambient a3"></div>${header({ eyebrow: "Flow · 2026", title: "September", action: "⌄" })}<section class="gl-month-card"><div class="gl-month-meta"><span><b>76%</b><small>CONSISTENCY</small></span><em>+8%</em></div><div class="gl-calendar-head"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div><div class="gl-calendar">${Array(
            35,
        )
            .fill(0)
            .map(
                (_, i) =>
                    `<i class="${i === 3 ? "today" : i < 18 && i % 5 ? "filled" : ""}">${i ? ((i - 1) % 30) + 1 : ""}</i>`,
            )
            .join(
                "",
            )}</div></section><div class="gl-float-card"><span>${icon("spark")}</span><p><small>INSIGHT</small><b>Your mornings are strongest.</b></p><em>→</em></div><div class="filter-pills gl-pills"><b>All</b><span>Walk</span><span>Read</span><span>Journal</span></div></div>${mobileNav(navGlass, "month")}`,
    },
    {
        id: "habits",
        title: "Habits",
        kicker: "Soft tiles, controls hidden",
        body: `${phoneStatus()}<div class="app-content glass-content"><div class="gl-ambient a2"></div>${header({ eyebrow: "Profile", title: "Your habits", action: "Edit", back: true })}<div class="gl-habit-cards">${[
            ["☀", "Morning walk", "12 days"],
            ["◒", "Read 20 minutes", "4 days"],
            ["✦", "Journal", "2 this week"],
            ["◇", "No sugar", "Avoid"],
            ["∿", "Stretch", "3 this week"],
        ]
            .map(
                (x) =>
                    `<div><span>${x[0]}</span><p><b>${x[1]}</b><small>${x[2]}</small></p><em>›</em></div>`,
            )
            .join(
                "",
            )}</div><button class="gl-primary">${icon("plus")} New habit</button><p class="gl-foot">Edit turns the cards solid and reveals their management controls.</p></div>`,
    },
    {
        id: "sync",
        title: "Sync",
        kicker: "Ambient assurance",
        body: `${phoneStatus()}<div class="app-content glass-content"><div class="gl-ambient a1"></div>${header({ eyebrow: "Profile · Data", title: "Cloud", back: true })}<section class="gl-cloud"><span>${icon("cloud-check")}</span><small>IN HARMONY</small><h4>Everything is here.</h4><p>Last synced just now</p><i></i></section><div class="gl-sync-pills"><button>${icon("refresh")} Sync now</button><button>${icon("devices")} 2 devices</button></div><div class="gl-settings"><div><p><b>Automatic sync</b><small>Recommended</small></p><i class="toggle on"></i></div><div><p><b>kristian@example.com</b><small>Account</small></p><span>›</span></div><div><p><b>Custom server</b><small>Advanced</small></p><span>›</span></div></div></div>${mobileNav(navGlass, "settings")}`,
    },
    {
        id: "devices",
        title: "Linked devices",
        kicker: "Floating device cards",
        body: `${phoneStatus()}<div class="app-content glass-content"><div class="gl-ambient a3"></div>${header({ eyebrow: "Cloud", title: "Two devices", action: "+ Link", back: true })}<div class="gl-devices"><section><div><span>${icon("phone")}</span><i>NOW</i></div><h4>Pixel 9</h4><p>This device · in harmony</p><em>Current</em></section><section><div><span>${icon("tablet")}</span><i>8M</i></div><h4>reMarkable 2</h4><p>Last synced eight minutes ago</p><button>${icon("more")}</button></section></div><p class="privacy-note gl-note">${icon("shield")} Tap a card to inspect or revoke access.</p></div>`,
    },
    {
        id: "link",
        title: "Link device",
        kicker: "A glowing connection moment",
        body: `${phoneStatus()}<div class="app-content glass-content"><div class="gl-ambient a1"></div>${header({ eyebrow: "Cloud · New", title: "Connect", back: true })}<div class="gl-link-orb"><span>${icon("scan")}</span><i></i><i></i></div><h5 class="gl-center">Bring another device<br />into harmony.</h5><p class="g-center-copy">Scan the QR code it shows, then verify its name.</p><button class="gl-primary">Open camera</button><button class="gl-secondary">Enter six-character code</button><p class="privacy-note gl-note">${icon("shield")} No data moves before you approve.</p></div>`,
    },
];

const navBrutal = [
    ["today", "check", "NOW"],
    ["month", "chart", "DATA"],
    ["settings", "settings", "SYSTEM"],
];
const brutalScreens = [
    {
        id: "today",
        title: "Today",
        kicker: "No softness, no ambiguity",
        body: `${phoneStatus("100% // ONLINE")}<div class="app-content brutal-content"><div class="br-head"><span>HABIT® / 09.09.26</span><button>SYNC_OK</button></div><h4>TODAY<br /><i>3/5</i></h4><div class="br-progress"><i style="width:60%"></i></div><div class="br-list"><div><span>01</span><b>MORNING WALK</b><button class="yes">YES</button></div><div><span>02</span><b>READ 20 MIN</b><button class="yes">YES</button></div><div><span>03</span><b>JOURNAL</b><button>NO</button></div><div class="avoid"><span>04</span><b>NO SUGAR [AVOID]</b><button class="yes">CLEAR</button></div><div><span>05</span><b>STRETCH</b><button>NO</button></div></div><footer>NO SHAME. JUST DATA.</footer></div>${mobileNav(navBrutal, "today")}`,
    },
    {
        id: "month",
        title: "Month",
        kicker: "The month as an honest ledger",
        body: `${phoneStatus("100% // ONLINE")}<div class="app-content brutal-content"><div class="br-head"><span>DATA / SEPTEMBER</span><button>2026⌄</button></div><div class="br-big-stat"><b>76</b><span>%<small>COMPLETION</small></span><i>+08</i></div><div class="br-month-tabs"><b>ALL</b><span>WALK</span><span>READ</span><span>JOURNAL</span></div><div class="br-calendar"><header><b>M</b><b>T</b><b>W</b><b>T</b><b>F</b><b>S</b><b>S</b></header><main>${Array(
            35,
        )
            .fill(0)
            .map(
                (_, i) =>
                    `<i class="${i === 3 ? "today" : i < 20 && i % 5 ? "on" : ""}">${i ? ((i - 1) % 30) + 1 : "×"}</i>`,
            )
            .join(
                "",
            )}</main></div><div class="br-callout"><b>FACT:</b><span>WEEKDAYS OUTPERFORM WEEKENDS BY 24%.</span></div></div>${mobileNav(navBrutal, "month")}`,
    },
    {
        id: "habits",
        title: "Habits",
        kicker: "An unapologetic inventory",
        body: `${phoneStatus("100% // ONLINE")}<div class="app-content brutal-content"><div class="br-head"><span>SYSTEM / HABITS</span><button>[EDIT]</button></div><h4>ACTIVE<br />HABITS <i>05</i></h4><div class="br-inventory">${[
            ["01", "MORNING WALK", "DO"],
            ["02", "READ 20 MIN", "DO"],
            ["03", "JOURNAL", "DO"],
            ["04", "NO SUGAR", "AVOID"],
            ["05", "STRETCH", "DO"],
        ]
            .map(
                (x) =>
                    `<div><span>${x[0]}</span><b>${x[1]}</b><i>${x[2]}</i><em>→</em></div>`,
            )
            .join(
                "",
            )}</div><button class="br-primary">+ ADD HABIT</button><footer>CONTROLS APPEAR ONLY IN [EDIT].</footer></div>`,
    },
    {
        id: "sync",
        title: "Sync",
        kicker: "Infrastructure made legible",
        body: `${phoneStatus("100% // ONLINE")}<div class="app-content brutal-content"><div class="br-head"><span>SYSTEM / SYNC</span><button>⋯</button></div><section class="br-sync"><small>SERVER STATE</small><h4>SYNCED.</h4><p>09:41:08 / 0 PENDING / 0 ERRORS</p></section><button class="br-primary">↻ SYNC NOW</button><div class="br-config"><div><span>AUTO_SYNC</span><b>ON</b></div><div><span>ACCOUNT</span><b>KRISTIAN@…</b></div><div><span>DEVICES</span><b>02 →</b></div><div><span>SERVER</span><b>DEFAULT →</b></div><div><span>DIAGNOSTICS</span><b>OPEN →</b></div></div><footer>LOCAL DATA SURVIVES SIGN-OUT.</footer></div>${mobileNav(navBrutal, "settings")}`,
    },
    {
        id: "devices",
        title: "Linked devices",
        kicker: "An access-control manifest",
        body: `${phoneStatus("100% // ONLINE")}<div class="app-content brutal-content"><div class="br-head"><span>ACCESS / DEVICES</span><button>+ LINK</button></div><h4>AUTHORIZED<br /><i>02</i></h4><div class="br-device"><section><header><span>01</span><b>CURRENT</b></header><h5>PIXEL 9</h5><p>ACTIVE NOW<br />ADDED 28.08.26</p><button>DETAILS →</button></section><section><header><span>02</span><b>SYNCED</b></header><h5>REMARKABLE 2</h5><p>USED 8M AGO<br />ADDED 30.08.26</p><button>DETAILS →</button></section></div><footer>REVOKE STOPS FUTURE ACCESS. NOT REMOTE WIPE.</footer></div>`,
    },
    {
        id: "link",
        title: "Link device",
        kicker: "A pairing challenge",
        body: `${phoneStatus("100% // ONLINE")}<div class="app-content brutal-content"><div class="br-head"><span>ACCESS / NEW</span><button>×</button></div><h4>ENTER<br />CODE.</h4><div class="br-code">T4M<br />9QK</div><div class="br-request"><span>FOUND</span><b>REMARKABLE 2</b><i>EXPIRES 04:32</i></div><button class="br-primary">APPROVE →</button><button class="br-invert">SCAN QR INSTEAD</button><footer>VERIFY THE NAME. CONTROL STAYS HERE.</footer></div>`,
    },
];

const navAccess = [
    ["today", "check", "Today"],
    ["month", "calendar", "History"],
    ["settings", "settings", "Settings"],
];
const accessScreens = [
    {
        id: "today",
        title: "Today",
        kicker: "Maximum size and explicit words",
        body: `${phoneStatus()}<div class="app-content access-content"><div class="a-head"><div><span>Thursday, September 3</span><h4>Today</h4></div><button aria-label="Sync status">${icon("cloud-check")}</button></div><div class="a-summary"><b>3 of 5 complete</b><span>2 habits remaining</span></div><div class="a-list"><div><p><b>Morning walk</b><span>Completed</span></p><button class="complete">${icon("check")} Done</button></div><div><p><b>Read 20 minutes</b><span>Completed</span></p><button class="complete">${icon("check")} Done</button></div><div><p><b>Journal</b><span>Not marked</span></p><button>${icon("minus")} Mark</button></div><div><p><b>No sugar</b><span>Avoided today</span></p><button class="complete">${icon("check")} Clear</button></div><div><p><b>Stretch</b><span>Not marked</span></p><button>${icon("minus")} Mark</button></div></div></div>${mobileNav(navAccess, "today")}`,
    },
    {
        id: "month",
        title: "Month",
        kicker: "Week-sized, screen-reader-friendly review",
        body: `${phoneStatus()}<div class="app-content access-content">${header({ eyebrow: "History", title: "September 2026", action: "Next →" })}<div class="a-segment"><b>Week</b><span>Month summary</span></div><section class="a-week"><header><button>‹</button><b>31 Aug – 6 Sep</b><button>›</button></header><div class="a-day done"><span><b>Mon 31</b><small>4 of 5 completed</small></span><strong>${icon("check")} 80%</strong></div><div class="a-day done"><span><b>Tue 1</b><small>5 of 5 completed</small></span><strong>${icon("check")} 100%</strong></div><div class="a-day current"><span><b>Wed 2 · Today</b><small>3 of 5 completed</small></span><strong>60%</strong></div><div class="a-day"><span><b>Thu 3</b><small>No entries yet</small></span><strong>—</strong></div><div class="a-day"><span><b>Fri 4</b><small>No entries yet</small></span><strong>—</strong></div></section><button class="a-primary">View September summary</button></div>${mobileNav(navAccess, "month")}`,
    },
    {
        id: "habits",
        title: "Habits",
        kicker: "Large targets, safe controls",
        body: `${phoneStatus()}<div class="app-content access-content">${header({ eyebrow: "Settings", title: "Habits", action: "Edit", back: true })}<p class="a-intro">Five active habits. Editing controls are currently hidden.</p><div class="a-roster">${[
            ["Morning walk", "Positive"],
            ["Read 20 minutes", "Positive"],
            ["Journal", "Positive"],
            ["No sugar", "Avoid"],
            ["Stretch", "Positive"],
        ]
            .map(
                (x) =>
                    `<button><span><b>${x[0]}</b><small>${x[1]}</small></span><em>Open details ›</em></button>`,
            )
            .join(
                "",
            )}</div><button class="a-primary">${icon("plus")} Add a habit</button></div>`,
    },
    {
        id: "sync",
        title: "Sync",
        kicker: "Plain-language status and recovery",
        body: `${phoneStatus()}<div class="app-content access-content">${header({ eyebrow: "Settings", title: "Sync", back: true })}<section class="a-sync"><span>${icon("cloud-check")}</span><div><h4>Everything is up to date</h4><p>Last synced today at 9:41 AM.</p></div></section><button class="a-primary">${icon("refresh")} Sync now</button><div class="a-settings"><div><span><b>Automatic sync</b><small>Sync after changes</small></span><i class="toggle on"></i></div><button><span><b>Your account</b><small>kristian@example.com</small></span><em>Open ›</em></button><button><span><b>Linked devices</b><small>2 devices</small></span><em>Open ›</em></button><button><span><b>Advanced settings</b><small>Custom server and diagnostics</small></span><em>Open ›</em></button></div></div>${mobileNav(navAccess, "settings")}`,
    },
    {
        id: "devices",
        title: "Linked devices",
        kicker: "Explicit access consequences",
        body: `${phoneStatus()}<div class="app-content access-content">${header({ eyebrow: "Sync", title: "Linked devices", back: true })}<p class="a-intro">These devices can read and update your synced Habit data.</p><div class="a-device-list"><button><span class="a-device-icon">${icon("phone")}</span><p><b>Pixel 9</b><small>This device · active now</small></p><em>Details ›</em></button><button><span class="a-device-icon">${icon("tablet")}</span><p><b>reMarkable 2</b><small>Last synced 8 minutes ago</small></p><em>Details ›</em></button></div><button class="a-primary">${icon("plus")} Link a device</button><section class="a-warning"><b>Removing a device</b><p>It will stop syncing. Habit cannot remotely erase data already on that device.</p></section></div>`,
    },
    {
        id: "link",
        title: "Link device",
        kicker: "Accessible code entry first",
        body: `${phoneStatus()}<div class="app-content access-content">${header({ eyebrow: "Linked devices", title: "Link a device", back: true })}<p class="a-intro large">Enter the six-character code displayed by Habit on your other device.</p><label class="a-code-label">Pairing code</label><div class="a-code">T4M 9QK</div><button class="a-primary">Continue</button><button class="a-secondary">${icon("scan")} Scan a QR code instead</button><section class="a-warning neutral"><b>Before anything syncs</b><p>You will see the requesting device’s name and choose whether to approve it.</p></section></div>`,
    },
];

const navPixel = [
    ["today", "home", "PLAY"],
    ["month", "calendar", "MAP"],
    ["settings", "more", "BAG"],
];
const pixelScreens = [
    {
        id: "today",
        title: "Today",
        kicker: "A tiny companion you care for",
        body: `${phoneStatus("HP █████ 100")}<div class="app-content pixel-content"><div class="px-head"><span>DAY 247</span><b>03 SEP</b><button>☁ OK</button></div><div class="pixel-scene"><div class="pixel-sun"></div><div class="pixel-pal"><i></i><b></b><span></span></div><div class="pixel-ground"></div><p>SPROUT FEELS MOTIVATED!</p></div><div class="px-score"><b>3/5 QUESTS</b><span>+30 XP TODAY</span></div><div class="px-quests"><div class="done"><span>✓</span><b>WALK OUTSIDE</b><i>+10</i></div><div class="done"><span>✓</span><b>READ 20 MIN</b><i>+10</i></div><div><span>□</span><b>WRITE JOURNAL</b><i>+10</i></div><div class="done"><span>✓</span><b>DODGE SUGAR</b><i>+10</i></div><div><span>□</span><b>STRETCH</b><i>+10</i></div></div></div>${mobileNav(navPixel, "today")}`,
    },
    {
        id: "month",
        title: "Month",
        kicker: "A month as a traversable game map",
        body: `${phoneStatus("HP █████ 100")}<div class="app-content pixel-content"><div class="px-head"><span>WORLD MAP</span><b>SEPTEMBER</b><button>2026</button></div><div class="px-world"><div class="px-path"></div>${Array(
            18,
        )
            .fill(0)
            .map(
                (_, i) =>
                    `<i class="p${i + 1} ${i < 11 ? "won" : i === 11 ? "current" : ""}">${i + 1}</i>`,
            )
            .join(
                "",
            )}<span class="px-castle">♜</span><div class="pixel-pal mini"><i></i><b></b><span></span></div></div><div class="px-world-stats"><span><b>76%</b> COMPLETE</span><span><b>12</b> COMBO</span><span><b>0</b> DAMAGE</span></div><button class="px-primary">OPEN LEVEL 12 →</button></div>${mobileNav(navPixel, "month")}`,
    },
    {
        id: "habits",
        title: "Habits",
        kicker: "Habits as an equipped loadout",
        body: `${phoneStatus("HP █████ 100")}<div class="app-content pixel-content"><div class="px-head"><span>INVENTORY</span><b>QUESTS</b><button>EDIT</button></div><div class="px-inventory">${[
            ["☀", "WALK OUTSIDE", "LV.12"],
            ["▤", "READ 20 MIN", "LV.08"],
            ["✎", "WRITE JOURNAL", "LV.04"],
            ["◆", "DODGE SUGAR", "LV.18"],
            ["↟", "STRETCH", "LV.06"],
        ]
            .map(
                (x) =>
                    `<div><span>${x[0]}</span><b>${x[1]}</b><i>${x[2]}</i><em>›</em></div>`,
            )
            .join(
                "",
            )}</div><button class="px-primary">+ NEW QUEST</button><div class="px-dialog">EDIT MODE UNLOCKS SORT, TYPE, ARCHIVE, AND DELETE.</div></div>`,
    },
    {
        id: "sync",
        title: "Sync",
        kicker: "Cloud save as game language",
        body: `${phoneStatus("HP █████ 100")}<div class="app-content pixel-content"><div class="px-head"><span>SYSTEM</span><b>CLOUD SAVE</b><button>×</button></div><section class="px-save"><span>☁</span><h4>GAME SAVED!</h4><p>ALL DEVICES ARE UP TO DATE</p><small>09:41 · SLOT 01</small></section><div class="px-menu"><button>↻ SAVE AGAIN</button><button>AUTO-SAVE <b>ON</b></button><button>LINKED DEVICES <b>02</b></button><button>PLAYER ACCOUNT <b>→</b></button><button>ADVANCED SERVER <b>→</b></button></div><div class="px-dialog">LOCAL PROGRESS REMAINS IF YOU SIGN OUT.</div></div>${mobileNav(navPixel, "settings")}`,
    },
    {
        id: "devices",
        title: "Linked devices",
        kicker: "Devices join the player party",
        body: `${phoneStatus("HP █████ 100")}<div class="app-content pixel-content"><div class="px-head"><span>PARTY</span><b>DEVICES</b><button>+ADD</button></div><div class="px-party"><section><span class="px-avatar">▣</span><h4>PIXEL 9</h4><b>LEADER</b><p>ONLINE NOW</p></section><section><span class="px-avatar">▤</span><h4>REMARKABLE 2</h4><b>MEMBER</b><p>ONLINE 8M AGO</p></section></div><div class="px-dialog">SELECT A PARTY MEMBER TO VIEW OR REVOKE ACCESS.</div><button class="px-primary">RECRUIT DEVICE →</button></div>`,
    },
    {
        id: "link",
        title: "Link device",
        kicker: "A delightfully absurd link cable",
        body: `${phoneStatus("HP █████ 100")}<div class="app-content pixel-content"><div class="px-head"><span>PARTY</span><b>RECRUIT</b><button>×</button></div><div class="px-cable"><span>▣</span><i>══════</i><span>▤</span><p>CONNECTING TWO WORLDS…</p></div><label class="px-label">ENTER JOIN CODE</label><div class="px-code">T4M-9QK</div><section class="px-found"><b>REMARKABLE 2 FOUND!</b><span>CODE EXPIRES IN 04:32</span></section><button class="px-primary">RECRUIT →</button><button class="px-secondary">SCAN QR CODE</button></div>`,
    },
];

const navTransit = [
    ["today", "home", "Today"],
    ["month", "chart", "Lines"],
    ["settings", "settings", "Station"],
];
const transitScreens = [
    {
        id: "today",
        title: "Today",
        kicker: "Each habit is a stop on today’s route",
        body: `${phoneStatus()}<div class="app-content transit-content"><div class="tr-top"><span>HABIT TRANSIT</span><b>THU 03 SEP</b><button>${icon("cloud-check")}</button></div><div class="tr-route-head"><small>ROUTE T3</small><h4>Today line</h4><p>3 of 5 stops reached · 60%</p></div><div class="tr-route"><i class="line-green"></i><div class="reached"><span>W</span><p><b>Morning walk</b><small>09:02 · reached</small></p><em>✓</em></div><div class="reached"><span>R</span><p><b>Read 20 minutes</b><small>09:28 · reached</small></p><em>✓</em></div><div class="current"><span>J</span><p><b>Journal</b><small>Next stop</small></p><button>MARK</button></div><div class="reached avoid"><span>N</span><p><b>No sugar</b><small>Clear so far</small></p><em>✓</em></div><div><span>S</span><p><b>Stretch</b><small>Later today</small></p><em>○</em></div></div></div>${mobileNav(navTransit, "today")}`,
    },
    {
        id: "month",
        title: "Month",
        kicker: "A transit diagram for patterns",
        body: `${phoneStatus()}<div class="app-content transit-content"><div class="tr-top"><span>NETWORK MAP</span><b>SEP 2026</b><button>⌄</button></div><div class="tr-month-summary"><b>76%</b><span>NETWORK<br />COVERAGE</span><i>+8%</i></div><div class="tr-map"><div class="tr-day-labels"><span>1</span><span>8</span><span>15</span><span>22</span><span>30</span></div>${[
            ["W", "green"],
            ["R", "blue"],
            ["J", "orange"],
            ["N", "red"],
            ["S", "violet"],
        ]
            .map(
                (x, r) =>
                    `<section class="${x[1]}"><b>${x[0]}</b><i></i>${Array(6)
                        .fill(0)
                        .map(
                            (_, i) =>
                                `<em class="${i === 2 && r === 2 ? "miss" : ""}"></em>`,
                        )
                        .join("")}</section>`,
            )
            .join(
                "",
            )}</div><div class="tr-legend"><span><i class="green"></i>Walk</span><span><i class="blue"></i>Read</span><span><i class="orange"></i>Journal</span></div><section class="tr-alert"><b>DELAY</b><p>Journal broke its line on 9 Sep.</p><span>VIEW →</span></section></div>${mobileNav(navTransit, "month")}`,
    },
    {
        id: "habits",
        title: "Habits",
        kicker: "A service map instead of a roster",
        body: `${phoneStatus()}<div class="app-content transit-content"><div class="tr-top"><span>LINE CONTROL</span><b>5 LINES</b><button>EDIT</button></div><h4 class="tr-title">Your network</h4><div class="tr-lines">${[
            ["W", "Morning walk", "GREEN"],
            ["R", "Read 20 minutes", "BLUE"],
            ["J", "Journal", "ORANGE"],
            ["N", "No sugar · Avoid", "RED"],
            ["S", "Stretch", "VIOLET"],
        ]
            .map(
                (x, i) =>
                    `<div class="l${i + 1}"><span>${x[0]}</span><i></i><p><b>${x[1]}</b><small>${x[2]} LINE</small></p><em>›</em></div>`,
            )
            .join(
                "",
            )}</div><button class="tr-primary">${icon("plus")} Open a new line</button><p class="tr-note">Edit mode reveals reorder, archive, polarity, and delete controls.</p></div>`,
    },
    {
        id: "sync",
        title: "Sync",
        kicker: "A live service-status board",
        body: `${phoneStatus()}<div class="app-content transit-content"><div class="tr-top"><span>CENTRAL STATION</span><b>SYNC</b><button>⋯</button></div><section class="tr-status"><i></i><small>SERVICE STATUS</small><h4>All lines running</h4><p>Last synced just now</p></section><div class="tr-departures"><header><span>CONNECTION</span><span>STATUS</span></header><div><p><b>Pixel 9</b><small>This station</small></p><span>NOW</span></div><div><p><b>reMarkable 2</b><small>Platform 2</small></p><span>8 MIN</span></div><div><p><b>Automatic sync</b><small>All changes</small></p><span>ON</span></div></div><button class="tr-primary">${icon("refresh")} Run sync now</button><div class="tr-links"><span>Account →</span><span>Advanced server →</span></div></div>${mobileNav(navTransit, "settings")}`,
    },
    {
        id: "devices",
        title: "Linked devices",
        kicker: "Devices as network stations",
        body: `${phoneStatus()}<div class="app-content transit-content"><div class="tr-top"><span>NETWORK ACCESS</span><b>STATIONS</b><button>+ LINK</button></div><div class="tr-stations"><div class="station-line"></div><section><span>P9</span><p><small>STATION 01 · CURRENT</small><b>Pixel 9</b><em>Active now</em></p><i>●</i></section><section><span>RM</span><p><small>STATION 02</small><b>reMarkable 2</b><em>Last service 8 min ago</em></p><i>●</i></section><section class="future"><span>+</span><p><small>NEW CONNECTION</small><b>Add a station</b><em>QR or six-character code</em></p><i>○</i></section></div><p class="tr-note">Tap a station to see access details or close its line.</p></div>`,
    },
    {
        id: "link",
        title: "Link device",
        kicker: "Pairing as a transfer ticket",
        body: `${phoneStatus()}<div class="app-content transit-content"><div class="tr-top"><span>NETWORK ACCESS</span><b>NEW STATION</b><button>×</button></div><section class="tr-ticket"><header><span>HABIT TRANSIT</span><b>TRANSFER</b></header><small>PAIRING CODE</small><h4>T4M 9QK</h4><div><span>REQUESTING</span><b>reMarkable 2</b></div><div><span>EXPIRES</span><b>04:32</b></div><footer>VERIFY DEVICE BEFORE BOARDING</footer></section><button class="tr-primary">Approve transfer →</button><button class="tr-outline">Scan another ticket</button></div>`,
    },
];

const navZine = [
    ["today", "edit", "TODAY"],
    ["month", "calendar", "ARCHIVE"],
    ["settings", "more", "STUFF"],
];
const zineScreens = [
    {
        id: "today",
        title: "Today",
        kicker: "A tactile collage of small wins",
        body: `${phoneStatus("••• FULL")}<div class="app-content zine-content"><div class="z-tape tape-a"></div><div class="z-head"><span>THURS / 03.09</span><button>☁︎</button></div><h4>things I’m<br /><i>keeping today</i></h4><div class="z-count"><b>3</b><span>OUT OF<br />FIVE</span><em>good.</em></div><div class="z-notes"><div class="yellow done"><span>✓</span><b>morning walk</b><small>12 days</small></div><div class="blue done"><span>✓</span><b>read 20 min</b><small>4 days</small></div><div class="white"><span>○</span><b>journal</b><small>tap me</small></div><div class="pink done"><span>✓</span><b>no sugar</b><small>still clear</small></div><div class="green"><span>○</span><b>stretch</b><small>tap me</small></div></div></div>${mobileNav(navZine, "today")}`,
    },
    {
        id: "month",
        title: "Month",
        kicker: "A scrapbook of weeks",
        body: `${phoneStatus("••• FULL")}<div class="app-content zine-content"><div class="z-head"><span>THE ARCHIVE</span><button>SEP ’26</button></div><h4 class="z-month-title">september<br /><i>was 76% kept</i></h4><div class="z-week-collage"><section class="w1"><b>WEEK 36</b><div>${[4, 5, 3, 0, 0, 0, 0].map((x) => `<i data-n="${x}"></i>`).join("")}</div><p>tue was perfect!</p></section><section class="w2"><b>WEEK 35</b><div>${[5, 4, 2, 5, 3, 4, 3].map((x) => `<i data-n="${x}"></i>`).join("")}</div><p>26 / 35 kept</p></section><section class="w3"><b>WEEK 34</b><div>${[3, 3, 4, 2, 5, 4, 3].map((x) => `<i data-n="${x}"></i>`).join("")}</div><p>journal needs love</p></section></div><div class="z-sticker">+8%<small>vs aug</small></div></div>${mobileNav(navZine, "month")}`,
    },
    {
        id: "habits",
        title: "Habits",
        kicker: "Habits as rearrangeable scraps",
        body: `${phoneStatus("••• FULL")}<div class="app-content zine-content"><div class="z-head"><span>MY HABITS</span><button>[ arrange ]</button></div><h4 class="z-small-title">the current<br />collection</h4><div class="z-habit-scraps"><div class="yellow"><b>01</b><span>morning walk</span><i>↗</i></div><div class="blue"><b>02</b><span>read 20 min</span><i>↗</i></div><div class="white"><b>03</b><span>journal</span><i>↗</i></div><div class="pink"><b>04</b><span>no sugar / avoid</span><i>↗</i></div><div class="green"><b>05</b><span>stretch</span><i>↗</i></div></div><button class="z-add">+ ADD ANOTHER</button><p class="z-pencil">“arrange” reveals the boring controls.</p></div>`,
    },
    {
        id: "sync",
        title: "Sync",
        kicker: "A stamped data passport",
        body: `${phoneStatus("••• FULL")}<div class="app-content zine-content"><div class="z-head"><span>STUFF / DATA</span><button>×</button></div><section class="z-passport"><header>HABIT DATA PASSPORT</header><div class="z-stamp">SYNCED<small>09 SEP 26</small></div><h4>everything<br />made it.</h4><dl><div><dt>HABITS</dt><dd>05</dd></div><div><dt>ENTRIES</dt><dd>482</dd></div><div><dt>DEVICES</dt><dd>02</dd></div></dl><footer>kristian@example.com</footer></section><button class="z-black">SYNC AGAIN ↻</button><div class="z-links"><span>automatic sync <b>on</b></span><span>linked devices <b>→</b></span><span>custom server <b>→</b></span></div></div>${mobileNav(navZine, "settings")}`,
    },
    {
        id: "devices",
        title: "Linked devices",
        kicker: "A corkboard of device Polaroids",
        body: `${phoneStatus("••• FULL")}<div class="app-content zine-content"><div class="z-head"><span>DATA PASSPORT</span><button>+ LINK</button></div><h4 class="z-small-title">places this<br />habit lives</h4><div class="z-polaroids"><section><div>${icon("phone")}</div><b>Pixel 9</b><p>right here / now</p><i>current</i></section><section><div>${icon("tablet")}</div><b>reMarkable 2</b><p>synced / 8m</p><i>linked</i></section></div><p class="z-pencil">tap a photo to inspect or revoke its access.</p><button class="z-black">PIN A NEW DEVICE +</button></div>`,
    },
    {
        id: "link",
        title: "Link device",
        kicker: "A cut-and-paste approval card",
        body: `${phoneStatus("••• FULL")}<div class="app-content zine-content"><div class="z-head"><span>NEW DEVICE</span><button>×</button></div><div class="z-link-card"><span>PAIRING CODE</span><h4>T4M<br />9QK</h4><i class="z-tape tape-b"></i><section><small>HELLO,</small><b>reMarkable 2</b><p>wants to share this habit book.</p></section></div><label class="z-check"><i>✓</i><span>yes, I recognize it.</span></label><button class="z-black">APPROVE &amp; LINK →</button><button class="z-add">SCAN QR INSTEAD</button><p class="z-pencil">the code disappears in 4 minutes.</p></div>`,
    },
];

const concepts = [
    {
        slug: "quiet",
        number: "01",
        type: "Moderate · Recommended",
        title: "Quiet Focus",
        tagline: "A calm daily tool that reveals complexity only when invited.",
        description:
            "The strongest all-round direction. It reduces the primary navigation to Today, Month, and Settings; turns month review into an aggregate calendar; and moves habit administration behind an explicit Edit state.",
        strengths: [
            "Lowest learning curve",
            "Best information hierarchy",
            "Easy to phase into the existing app",
        ],
        tradeoff:
            "The aggregate month view needs a second tap for per-habit detail.",
        palette: ["#f4f1e8", "#214e3a", "#e6b15b", "#d86b4e"],
        screens: quietScreens,
    },
    {
        slug: "signal",
        number: "02",
        type: "Moderate · Data-forward",
        title: "Habit Lens",
        tagline: "Bold, analytical, and centered on one habit at a time.",
        description:
            "A stronger performance-tracking personality. The month is no longer a many-habit matrix: users swipe between habits and see one full, readable calendar plus streak and completion measures.",
        strengths: [
            "Best per-habit analysis",
            "Strong state contrast",
            "Feels energetic and contemporary",
        ],
        tradeoff:
            "Less soothing than Quiet Focus and slightly slower for a whole-life overview.",
        palette: ["#f3f1ff", "#6d45f5", "#ff6a5c", "#17151f"],
        screens: signalScreens,
    },
    {
        slug: "journal",
        number: "03",
        type: "Expressive · Moderate",
        title: "Pocket Journal",
        tagline:
            "A tactile logbook that feels related to reMarkable without copying it.",
        description:
            "This direction makes daily marking feel like a ritual. The month becomes stacked weekly spreads—less comprehensive at one glance, but extremely readable and naturally suited to portrait scrolling.",
        strengths: [
            "Most legible week review",
            "Distinctive cross-device character",
            "Daily use feels intentional",
        ],
        tradeoff:
            "The editorial style is less neutral and aggregate comparisons take more scrolling.",
        palette: ["#f1eadc", "#26231f", "#aa452d", "#cfbf9e"],
        screens: journalScreens,
    },
    {
        slug: "orbit",
        number: "04",
        type: "Wild card · Experimental",
        title: "Orbit",
        tagline:
            "Time becomes spatial: habits circle the day, weeks circle the month.",
        description:
            "A deliberately unconventional interaction study. It replaces rows and grids with radial controls and ambient status. Impractical in a few accessibility cases, but rich territory for one-thumb marking and zoomable review.",
        strengths: [
            "Most original interaction model",
            "Makes progress feel alive",
            "Excellent one-handed potential",
        ],
        tradeoff:
            "Higher learning cost; motion-reduction and linear accessibility alternatives are mandatory.",
        palette: ["#111123", "#8275ff", "#55e1c1", "#f0eeff"],
        screens: orbitScreens,
    },
    {
        slug: "garden",
        number: "05",
        type: "Wild card · Playful",
        title: "Living Garden",
        tagline: "Habits are living things you tend, not scores you optimize.",
        description:
            "A full metaphor-driven direction aimed at motivation rather than analytics. It reframes completion as care, streaks as growth, devices as planters, and sync as a greenhouse—while keeping every core action recognizable.",
        strengths: [
            "Emotionally motivating",
            "Friendly around missed days",
            "Highly ownable visual identity",
        ],
        tradeoff:
            "The metaphor can obscure technical language and may feel too playful for some users.",
        palette: ["#f3ead4", "#2e6148", "#e28b58", "#8eb87d"],
        screens: gardenScreens,
    },
    {
        slug: "native",
        number: "06",
        type: "Practical · Platform-native",
        title: "Native Calm",
        tagline:
            "The redesign that feels as though the operating system made it.",
        description:
            "A low-risk direction built from familiar navigation bars, grouped settings, segmented controls, and restrained system color. It solves the hierarchy problems without asking users to learn a new visual language.",
        strengths: [
            "Fastest to understand",
            "Strong accessibility baseline",
            "Lowest implementation risk",
        ],
        tradeoff:
            "Reliable rather than ownable; the app would need excellent writing to feel distinctive.",
        palette: ["#f2f2f7", "#ffffff", "#0a84ff", "#ff9f0a"],
        screens: nativeScreens,
    },
    {
        slug: "focus",
        number: "07",
        type: "Moderate · Focused",
        title: "One Thing",
        tagline: "Turn a habit list into a calm, single-action queue.",
        description:
            "Today presents one habit at a time and lets the user swipe through the queue. The month uses compact small multiples, proving that a radically focused daily surface can still support serious review.",
        strengths: [
            "Lowest cognitive load",
            "Excellent one-thumb use",
            "Makes the next action unmistakable",
        ],
        tradeoff:
            "Slower for users who prefer checking several habits at one glance.",
        palette: ["#f6f0e7", "#1d1a16", "#e4583e", "#b9aa92"],
        screens: focusScreens,
    },
    {
        slug: "bento",
        number: "08",
        type: "Practical · Modular",
        title: "Bento Board",
        tagline: "Everything important becomes a tile that earns its space.",
        description:
            "A modular dashboard direction for people who like information density without spreadsheet aesthetics. Tiles change size based on importance, and edit mode can eventually support personalized arrangement.",
        strengths: [
            "Rich at-a-glance summaries",
            "Scales to future insights",
            "Strong visual hierarchy",
        ],
        tradeoff:
            "More surface variation to implement and keep visually balanced across device sizes.",
        palette: ["#f1efe9", "#242925", "#ff704d", "#b9d8ff"],
        screens: bentoScreens,
    },
    {
        slug: "multiples",
        number: "09",
        type: "Moderate · Analytical",
        title: "Tiny Multiples",
        tagline:
            "Keep every habit visible by making the marks smaller—not the labels.",
        description:
            "The strongest direct alternative to the current month grid. Each habit owns a horizontal 31-dot strip, so patterns align, names remain readable, and the complete month fits without two-axis scrolling.",
        strengths: [
            "Best all-habit comparison",
            "Very information efficient",
            "Closest to current product semantics",
        ],
        tradeoff:
            "Individual dates are intentionally secondary and require opening a habit row.",
        palette: ["#f8f7f3", "#1f2524", "#0d7c72", "#ee704f"],
        screens: multiplesScreens,
    },
    {
        slug: "glass",
        number: "10",
        type: "Expressive · Atmospheric",
        title: "Glass Stack",
        tagline: "Habit data floats in a soft, luminous field.",
        description:
            "A contemporary layered direction with translucent panels and ambient color. Its hierarchy remains practical, while the treatment makes syncing and progress feel continuous rather than mechanical.",
        strengths: [
            "Premium contemporary feel",
            "Status feels ambient",
            "Strong visual depth",
        ],
        tradeoff:
            "Blur, transparency, and contrast need careful device and accessibility testing.",
        palette: ["#17182e", "#7468ff", "#78e6d0", "#ff8ab5"],
        screens: glassScreens,
    },
    {
        slug: "brutal",
        number: "11",
        type: "Expressive · Blunt",
        title: "Raw Ledger",
        tagline:
            "No wellness clichés. No soft cards. Just a record you control.",
        description:
            "An anti-wellness aesthetic that turns the product into an honest instrument panel. Large type, hard rules, explicit labels, and sharp contrast make every state impossible to mistake.",
        strengths: [
            "Extremely distinctive",
            "Exceptional state contrast",
            "Dense without feeling delicate",
        ],
        tradeoff:
            "The confrontational tone will delight a niche and repel almost everyone else.",
        palette: ["#f0ff44", "#111111", "#ffffff", "#ff4d36"],
        screens: brutalScreens,
    },
    {
        slug: "access",
        number: "12",
        type: "Practical · Accessibility-first",
        title: "Clarity Max",
        tagline:
            "Design every state so color, memory, and precision are optional.",
        description:
            "A deliberately explicit direction with large targets, plain-language state labels, weekly review, and redundant icon-plus-text cues. It is less compact because certainty is the priority.",
        strengths: [
            "Most inclusive interaction model",
            "Lowest ambiguity",
            "Ideal for large-text settings",
        ],
        tradeoff:
            "Shows less information per screen and requires more vertical navigation.",
        palette: ["#ffffff", "#102a43", "#005fcc", "#f4b400"],
        screens: accessScreens,
    },
    {
        slug: "pixel",
        number: "13",
        type: "Wild card · Game",
        title: "Pixel Pal",
        tagline: "Keep your habits alive to help a tiny companion explore.",
        description:
            "A full handheld-game metaphor. Habits become quests, the month becomes a world map, devices join the party, and sync becomes cloud save. Silly on purpose—and potentially very motivating.",
        strengths: [
            "Strongest playful motivation",
            "Highly memorable",
            "Makes routine feel collectible",
        ],
        tradeoff:
            "Points and game language can distort intrinsic motivation and trivialize sensitive habits.",
        palette: ["#d7f06c", "#213547", "#f26b5b", "#67c4a7"],
        screens: pixelScreens,
    },
    {
        slug: "transit",
        number: "14",
        type: "Wild card · Systems metaphor",
        title: "Habit Transit",
        tagline:
            "Habits are lines, completed days are stations, sync is the network.",
        description:
            "A map-based system that makes consistency feel like movement. The metaphor naturally unifies daily progress, month patterns, device topology, and interruptions without needing literal analytics charts.",
        strengths: [
            "Coherent metaphor across every page",
            "Great pattern visualization",
            "Ownable visual identity",
        ],
        tradeoff:
            "Color-heavy line coding needs redundant labels and becomes complex with many habits.",
        palette: ["#f4efd9", "#16354a", "#e94f37", "#15a276"],
        screens: transitScreens,
    },
    {
        slug: "zine",
        number: "15",
        type: "Wild card · Tactile",
        title: "Cut & Keep",
        tagline:
            "A hand-made habit book assembled from scraps, stamps, and notes.",
        description:
            "A joyful collage direction that rejects sterile wellness software. Uneven cards, taped labels, rubber stamps, and week scraps make the mobile app feel authored rather than generated.",
        strengths: [
            "Most human visual character",
            "Flexible, expressive composition",
            "Pairs well with personal reflection",
        ],
        tradeoff:
            "Deliberate irregularity is hard to scale, localize, and keep accessible.",
        palette: ["#f4eddb", "#151515", "#ffdc4f", "#65b9dd"],
        screens: zineScreens,
    },
];

concepts.push(...(window.laboratoryConcepts ?? []));

const renderPhone = (screen, concept) => `
    <article class="phone-card" data-screen="${screen.id}">
        <div class="phone-caption">
            <div><span>${screen.title}</span><small>${screen.kicker}</small></div>
            <b>${String(["today", "month", "habits", "sync", "devices", "link"].indexOf(screen.id) + 1).padStart(2, "0")}</b>
        </div>
        <div class="phone ${concept.slug}">
            <div class="phone-speaker"></div>
            <div class="phone-screen">${screen.body}</div>
        </div>
    </article>`;

const renderConcept = (concept) => `
    <section id="direction-${concept.slug}" class="concept concept-${concept.slug}" data-concept="${concept.slug}">
        <div class="concept-intro shell">
            <div class="concept-index"><span>${concept.number}</span><i></i></div>
            <div class="concept-copy">
                <span class="concept-type">${concept.type}</span>
                <h2>${concept.title}</h2>
                <h3>${concept.tagline}</h3>
                <p>${concept.description}</p>
            </div>
            <div class="concept-meta">
                <div class="palette" aria-label="Color palette">
                    ${concept.palette.map((color) => `<i style="--swatch:${color}"></i>`).join("")}
                </div>
                <ul>${concept.strengths.map((strength) => `<li>${strength}</li>`).join("")}</ul>
                <p><b>Trade-off</b>${concept.tradeoff}</p>
            </div>
        </div>
        <div class="phone-rail shell">
            ${concept.screens.map((screen) => renderPhone(screen, concept)).join("")}
        </div>
    </section>`;

document.querySelector("#concepts").innerHTML = concepts
    .map(renderConcept)
    .join("");

const filterButtons = [...document.querySelectorAll("[data-filter]")];
const mockups = () => [...document.querySelectorAll(".phone-card")];

filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
        filterButtons.forEach((candidate) =>
            candidate.classList.remove("is-active"),
        );
        button.classList.add("is-active");
        const filter = button.dataset.filter;
        document.body.dataset.screenFilter = filter;
        mockups().forEach((mockup) => {
            mockup.hidden =
                filter !== "all" && mockup.dataset.screen !== filter;
        });
    });
});

// Throwaway prototype switcher: share a direction with `?variant=<slug>` and use ← / → to cycle.
const requestedVariant = new URLSearchParams(window.location.search).get(
    "variant",
);
let activeConceptIndex = Math.max(
    0,
    concepts.findIndex((concept) => concept.slug === requestedVariant),
);
const prototypeSwitcher = document.createElement("aside");
prototypeSwitcher.className = "prototype-switcher";
prototypeSwitcher.setAttribute("aria-label", "Redesign direction switcher");
prototypeSwitcher.innerHTML = `
    <span class="prototype-badge">Prototype</span>
    <button type="button" data-variant-prev aria-label="Previous redesign">←</button>
    <button type="button" class="prototype-current" data-variant-current></button>
    <button type="button" data-variant-next aria-label="Next redesign">→</button>`;
document.body.append(prototypeSwitcher);

const updateSwitcher = ({ scroll = false } = {}) => {
    const concept = concepts[activeConceptIndex];
    prototypeSwitcher.querySelector("[data-variant-current]").textContent =
        `${concept.number} / ${concepts.length} · ${concept.title}`;
    if (scroll)
        document
            .querySelector(`#direction-${concept.slug}`)
            .scrollIntoView({ behavior: "smooth", block: "start" });
};

const changeVariant = (delta) => {
    activeConceptIndex =
        (activeConceptIndex + delta + concepts.length) % concepts.length;
    const url = new URL(window.location.href);
    url.searchParams.set("variant", concepts[activeConceptIndex].slug);
    window.history.replaceState({}, "", url);
    updateSwitcher({ scroll: true });
};

prototypeSwitcher
    .querySelector("[data-variant-prev]")
    .addEventListener("click", () => changeVariant(-1));
prototypeSwitcher
    .querySelector("[data-variant-next]")
    .addEventListener("click", () => changeVariant(1));
prototypeSwitcher
    .querySelector("[data-variant-current]")
    .addEventListener("click", () => updateSwitcher({ scroll: true }));
window.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    if (
        event.target instanceof Element &&
        event.target.matches("input, textarea, [contenteditable]")
    )
        return;
    changeVariant(event.key === "ArrowLeft" ? -1 : 1);
});

updateSwitcher();
if (
    requestedVariant &&
    concepts.some((concept) => concept.slug === requestedVariant)
) {
    requestAnimationFrame(() => updateSwitcher({ scroll: true }));
}
