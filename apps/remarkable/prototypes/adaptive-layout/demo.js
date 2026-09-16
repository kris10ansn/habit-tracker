// Throwaway prototype: can design B expand short rosters, fit eleven, and page longer lists?
(() => {
    const tablet = document.getElementById("tablet");
    const today = new Date(2026, 8, 16);
    const names = [
        "Read 20 min",
        "Exercise",
        "Journal",
        "Stretch",
        "No sweets",
        "Walk outdoors",
        "Drink water",
        "Meditate",
        "Practice piano",
        "Plan tomorrow",
        "Bed before 23:00",
        "Learn Spanish",
        "Cook dinner",
        "Call a friend",
        "No late caffeine",
        "Tidy the desk",
        "Practice drawing",
        "Take the stairs",
        "Read the news",
        "Floss",
        "Morning sunlight",
        "Write 100 words",
        "Learn a song",
        "Water the plants",
        "Plan the week",
        "Go cycling",
        "Practice gratitude",
        "Do a puzzle",
        "Learn something",
        "Pack lunch",
        "Evening walk",
        "Take a break",
        "Stretch shoulders",
        "Review the day",
        "Make the bed",
    ];
    const state = {
        view: "grid",
        year: 2026,
        month: 8,
        scrollX: 0,
        scrollY: 0,
        editY: 0,
        habits: [],
        entries: {},
        showPrivate: false,
        powerImages: true,
        serverUrl: "https://habits.example.test",
        connected: true,
        pairing: "",
        code: "H7K9Q2",
        expiresAt: 0,
        sync: "Synced",
        power: "Power-state images saved",
        modal: null,
        zoom: "fit",
        nextId: 100,
        staged: null,
    };
    const escape = (value) =>
        String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    const button = (text, action, attributes = "") =>
        `<button type="button" data-action="${action}" ${attributes}>${text}</button>`;
    const visibleHabits = () =>
        state.habits.filter((habit) => state.showPrivate || !habit.private);
    const monthDate = () => new Date(state.year, state.month, 1);
    const daysInMonth = () =>
        new Date(state.year, state.month + 1, 0).getDate();
    const monthName = () =>
        monthDate().toLocaleDateString("en", { month: "long" });
    const currentMonth = () =>
        state.year === today.getFullYear() && state.month === today.getMonth();
    const dateKey = (day) =>
        `${state.year}-${String(state.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const entryKey = (habit, day) => `${habit.id}:${dateKey(day)}`;
    const isPastOrToday = (day) =>
        new Date(state.year, state.month, day) <= today;

    function setRoster(count) {
        state.habits = Array.from({ length: count }, (unused, index) => ({
            id: index + 1,
            name: names[index] || `Habit ${index + 1}`,
            negative: index === 4 || index === 14,
            private: false,
        }));
        state.entries = {};
        state.scrollY = 0;
        state.editY = 0;
        state.nextId = 100;
    }

    function layout() {
        const count = visibleHabits().length;
        const rowHeight = Math.max(
            72,
            Math.min(
                128,
                Math.floor(
                    (920 - Math.max(0, count - 1) * 12) / Math.max(1, count),
                ),
            ),
        );
        const step = rowHeight + 12;
        const contentHeight = Math.max(0, count * step - 12);
        const maxY = Math.max(0, contentHeight - 920);
        const viewportWidth = 1388 - (maxY > 0 ? 100 : 0);
        return {
            count,
            rowHeight,
            step,
            contentHeight,
            maxY,
            viewportWidth,
            maxX: Math.max(0, daysInMonth() * 100 - 12 - viewportWidth),
            scrollRows: Math.max(1, Math.floor(920 / step) - 1),
        };
    }

    function recenter() {
        const geometry = layout();
        const centered = currentMonth()
            ? centerOnDay(
                  today.getDate(),
                  geometry.viewportWidth,
                  88,
                  12,
                  geometry.maxX,
              )
            : 0;
        state.scrollX = clampScroll(
            Math.round(centered / 100) * 100,
            geometry.maxX,
        );
    }

    function mark(habit, day) {
        const key = entryKey(habit, day);
        if (key in state.entries)
            return (
                state.entries[key] ||
                (habit.negative && isPastOrToday(day) ? "X" : "")
            );
        if (habit.negative) return isPastOrToday(day) ? "X" : "";
        if (!currentMonth() || day > today.getDate()) return "";
        const sample = (habit.id * 7 + day * 3) % 11;
        if (sample < 7) return "X";
        return sample === 8 ? "O" : "";
    }

    function header() {
        if (state.view === "settings")
            return `<header class="header"><h1>Settings</h1></header>`;
        if (state.view === "edit")
            return `<header class="header"><div class="header-group"><h1>Edit habits</h1><span class="secondary">${visibleHabits().length} visible</span></div>${button("Done", "grid", 'class="ink"')}</header>`;
        return `<header class="header"><div class="header-group"><h1>${monthName()}<span class="year">${state.year}</span></h1><nav class="month-nav" aria-label="Month navigation">${button("‹", "month-prev", 'class="icon" aria-label="Previous month"')}${button("Today", "today", currentMonth() ? "disabled" : "")}${button("›", "month-next", 'class="icon" aria-label="Next month"')}</nav></div><nav class="actions" aria-label="App actions">${button("Edit habits", "edit")}${button("Settings", "settings")}${button("Quit", "quit", 'class="quiet"')}</nav></header>`;
    }

    function dayCells(habit, geometry, rowIndex) {
        return Array.from({ length: daysInMonth() }, (unused, index) => {
            const day = index + 1;
            const value = mark(habit, day);
            const visibleX =
                index * 100 + 88 > state.scrollX &&
                index * 100 < state.scrollX + geometry.viewportWidth;
            const visibleY =
                rowIndex * geometry.step + geometry.rowHeight > state.scrollY &&
                rowIndex * geometry.step < state.scrollY + 920;
            return button(
                value,
                "mark",
                `class="cell ${currentMonth() && day === today.getDate() ? "today" : ""} ${value === "O" ? "failure" : ""} ${!isPastOrToday(day) ? "future" : ""}" data-id="${habit.id}" data-day="${day}" ${visibleX && visibleY ? "" : 'tabindex="-1"'} aria-label="${escape(habit.name)}, ${monthName()} ${day}: ${value || "unmarked"}"`,
            );
        }).join("");
    }

    function verticalControls(editing, maximum) {
        if (maximum <= 0) return "";
        const offset = editing ? state.editY : state.scrollY;
        return `<nav class="vertical-scroll ${editing ? "editor-scroll" : ""}" aria-label="Habit scrolling">${button("↑", editing ? "edit-up" : "rows-up", `${offset <= 0 ? "disabled" : ""} aria-label="Previous page of habits"`)}${button("↓", editing ? "edit-down" : "rows-down", `${offset >= maximum ? "disabled" : ""} aria-label="Next page of habits"`)}</nav>`;
    }

    function grid() {
        const geometry = layout();
        state.scrollY = clampScroll(state.scrollY, geometry.maxY);
        state.scrollX = clampScroll(state.scrollX, geometry.maxX);
        const firstDay = Math.floor(state.scrollX / 100) + 1;
        const lastDay = Math.min(
            daysInMonth(),
            Math.ceil((state.scrollX + geometry.viewportWidth) / 100),
        );
        const rows = visibleHabits();
        const dayLabels = Array.from(
            { length: daysInMonth() },
            (unused, index) =>
                `<div class="day ${currentMonth() && index + 1 === today.getDate() ? "today" : ""}">${index + 1}</div>`,
        ).join("");
        const content = rows.length
            ? `<div class="day-header"><div class="habit-column-title">Habit</div><div class="day-clip" style="width:${geometry.viewportWidth}px"><div class="day-strip" style="left:${-state.scrollX}px">${dayLabels}</div></div></div><div class="body-clip" style="width:${380 + geometry.viewportWidth}px"><div class="rows" style="top:${-state.scrollY}px;height:${geometry.contentHeight}px">${rows.map((habit, index) => `<div class="habit-row" style="top:${index * geometry.step}px;height:${geometry.rowHeight}px"><div class="habit-label"><span class="name" title="${escape(habit.name)}">${escape(habit.name)}</span>${habit.negative ? '<span class="suffix">(−)</span>' : ""}${habit.private ? '<span class="suffix">P</span>' : ""}</div><div class="day-clip" style="width:${geometry.viewportWidth}px"><div class="cells" style="left:${-state.scrollX}px">${dayCells(habit, geometry, index)}</div></div></div>`).join("")}</div></div>${verticalControls(false, geometry.maxY)}`
            : `<div class="empty"><h2>${state.habits.length ? "No visible habits" : "Make room for a good habit."}</h2><p>${state.habits.length ? "Reveal private habits in Settings to see them here." : "Add your first habit to start tracking."}</p>${button(state.habits.length ? "Open Settings" : "Add a habit", state.habits.length ? "settings" : "edit")}</div>`;
        const firstRow = Math.floor((state.scrollY + 12) / geometry.step) + 1;
        const lastRow = Math.min(
            rows.length,
            Math.ceil((state.scrollY + 920) / geometry.step),
        );
        return `<div class="meta"><span class="secondary">${currentMonth() ? "Wednesday, 16 September" : `${daysInMonth()} days · ${state.year}`}</span><span class="secondary">${firstDay}–${lastDay} ${monthName().slice(0, 3)}</span></div><main class="grid-shell">${content}</main><div class="grid-bottom"><nav class="paging" aria-label="Day scrolling">${button("‹", "days-prev", `class="icon" aria-label="Previous seven days" ${state.scrollX <= 0 ? "disabled" : ""}`)}<span class="secondary">Days</span>${button("›", "days-next", `class="icon" aria-label="Next seven days" ${state.scrollX >= geometry.maxX ? "disabled" : ""}`)}</nav><span class="secondary">${geometry.maxY > 0 ? `Habits ${firstRow}–${lastRow} of ${rows.length}　 ·　 ` : ""}X done　 O missed</span></div>`;
    }

    function editor() {
        const rows = visibleHabits();
        const maxY = Math.max(0, rows.length * 120 - 840);
        state.editY = clampScroll(state.editY, maxY);
        return `<main class="section"><div class="editor-content"><div class="edit-head"><span>Habit name</span><span>Polarity</span><span>Visibility</span><span>Order / remove</span></div><div class="edit-clip"><div class="edit-rows" style="top:${-state.editY}px">${rows.map((habit, index) => `<div class="edit-row" ${index * 120 + 120 <= state.editY || index * 120 >= state.editY + 840 ? "inert" : ""}><input aria-label="Name for ${escape(habit.name)}" data-name="${habit.id}" maxlength="120" value="${escape(habit.name)}">${button(habit.negative ? "Negative" : "Positive", "polarity", `data-id="${habit.id}"`)}${button(habit.private ? "Private" : "Public", "private", `data-id="${habit.id}" ${habit.private ? 'class="ink"' : ""}`)}<div class="actions">${button("↑", "move-up", `class="icon" data-id="${habit.id}" aria-label="Move ${escape(habit.name)} up" ${state.habits.indexOf(habit) === 0 ? "disabled" : ""}`)}${button("↓", "move-down", `class="icon" data-id="${habit.id}" aria-label="Move ${escape(habit.name)} down" ${state.habits.indexOf(habit) === state.habits.length - 1 ? "disabled" : ""}`)}${button("×", "delete", `class="icon" data-id="${habit.id}" aria-label="Delete ${escape(habit.name)}"`)}</div></div>`).join("")}</div></div><form class="add-row" id="add-habit"><input id="new-habit" aria-label="New habit name" placeholder="New habit name" maxlength="120" required><button type="submit">Add habit</button></form></div>${verticalControls(true, maxY)}</main><div class="page-bottom"><span class="secondary">${rows.length ? `${Math.floor(state.editY / 120) + 1}–${Math.min(rows.length, Math.ceil((state.editY + 840) / 120))} of ${rows.length} habits` : "No visible habits"} · Changes apply as you edit</span><span class="secondary">Private habits stay off power-state images.</span></div>`;
    }

    function toggle(property, value) {
        return `<div class="segmented" aria-label="${property === "powerImages" ? "Power-state images" : "Show private habits"}">${button("On", "toggle", `data-property="${property}" data-value="true" aria-pressed="${value}" ${value ? 'class="ink"' : ""}`)}${button("Off", "toggle", `data-property="${property}" data-value="false" aria-pressed="${!value}" ${!value ? 'class="ink"' : ""}`)}</div>`;
    }

    const serverReady = () =>
        state.serverUrl.trim() !== "" &&
        state.staged.serverUrl.trim() === state.serverUrl;
    const settingsDirty = () =>
        state.staged &&
        ["powerImages", "showPrivate", "serverUrl"].some(
            (property) => state.staged[property] !== state[property],
        );

    function pairing() {
        if (state.connected)
            return `<div class="inline"><span>Tablet connected</span>${button("Disconnect", "disconnect")}</div><p class="settings-help">Disconnecting signs out this tablet. Revoke its access from the phone’s linked devices.</p>`;
        if (state.pairing === "waiting")
            return `<div class="pairing-detail"><div><p>Scan with Habit Tracker on your phone.</p><div class="code">${state.code}</div><p class="secondary">Or enter this code manually.</p></div><canvas id="pairing-qr" width="296" height="296" role="img" aria-label="QR pairing code ${state.code}"></canvas></div><div class="inline"><span class="secondary" id="pairing-countdown">Waiting for approval · 5:00</span>${button("Cancel", "cancel-pairing", 'class="quiet"')}</div>`;
        let hint = "Approve this tablet from your phone to sync your habits.";
        if (state.pairing === "expired")
            hint = "That code expired. Request a new code to try again.";
        if (state.pairing === "error")
            hint =
                "Could not reach the server. Check the address and try again.";
        return `<p class="settings-help">${hint}</p>${button(state.pairing === "expired" ? "New code" : "Connect", "connect", serverReady() ? "" : "disabled")}`;
    }

    function settings() {
        return `<main class="section settings-columns"><section><h2>On this tablet</h2><div class="setting"><div class="setting-label">Power-state habit images<small>Sleeping, powered off, and battery empty.</small></div>${toggle("powerImages", state.staged.powerImages)}</div><p class="settings-help">Original images are backed up before replacement. Turn this off to restore them.</p><div class="setting"><div class="setting-label">Show private habits<small>Reveal private habits on this tablet.</small></div>${toggle("showPrivate", state.staged.showPrivate)}</div><p class="settings-help">Private habits never appear on power-state images.</p></section><section><h2>Sync & pairing</h2><label class="field-label" for="server-url">Sync server</label><input id="server-url" type="text" placeholder="http://address:5137" value="${escape(state.staged.serverUrl)}"><p id="server-hint" class="settings-help">Leave blank to use this tablet offline.${state.staged.serverUrl !== state.serverUrl ? " Save with Done before connecting." : ""}</p><div class="inline">${button("Sync now", "sync", serverReady() ? "" : "disabled")}<span class="secondary">${state.sync}</span></div><div class="pairing"><h2>Tablet pairing</h2>${pairing()}</div></section></main><div class="page-bottom">${button("Back", "settings-back")}<span class="secondary">${settingsDirty() ? "Unsaved changes" : "Changes apply on Done"}</span>${button("Done", "settings-done", 'class="ink"')}</div>`;
    }

    function drawQr() {
        const canvas = document.getElementById("pairing-qr");
        if (!canvas) return;
        const symbol = qrcode(1, "M");
        symbol.addData(state.code, "Alphanumeric");
        symbol.make();
        const context = canvas.getContext("2d");
        context.fillStyle = "#fff";
        context.fillRect(0, 0, 296, 296);
        context.fillStyle = "#000";
        const moduleSize = 10;
        const offset = 43;
        for (let row = 0; row < symbol.getModuleCount(); row++) {
            for (let column = 0; column < symbol.getModuleCount(); column++) {
                if (symbol.isDark(row, column))
                    context.fillRect(
                        offset + column * moduleSize,
                        offset + row * moduleSize,
                        moduleSize,
                        moduleSize,
                    );
            }
        }
    }

    function dialog() {
        if (!state.modal) return "";
        let title = "Discard changes?";
        let message = "Your settings changes have not been applied.";
        let actions =
            button("Keep editing", "dismiss") +
            button("Discard changes", "discard", 'class="ink"');
        if (state.modal.type === "delete") {
            title = "Delete habit?";
            message = `“${state.habits.find((habit) => habit.id === state.modal.id).name}” and its entries will be removed from this demo.`;
            actions =
                button("Cancel", "dismiss") +
                button("Delete habit", "confirm-delete", 'class="ink"');
        }
        if (state.modal.type === "closed") {
            title = "App closed";
            message =
                "On the tablet, this returns to the reMarkable interface.";
            actions = button("Reopen demo", "dismiss", 'class="ink"');
        }
        if (state.modal.type === "url") {
            title = "Check the server address";
            message =
                "Use an http:// or https:// address, or leave it blank to work offline.";
            actions = button("Back to Settings", "dismiss", 'class="ink"');
        }
        return `<div class="overlay"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><h2 id="dialog-title">${title}</h2><p>${escape(message)}</p><div class="actions">${actions}</div></div></div>`;
    }

    function fitPreview() {
        const viewport = document.getElementById("preview-viewport");
        const padding = window.innerWidth <= 700 ? 24 : 48;
        const scale =
            state.zoom === "native"
                ? 1
                : Math.min(1, (viewport.clientWidth - padding) / 1872);
        const stage = document.getElementById("scaled-stage");
        stage.style.width = `${1872 * scale}px`;
        stage.style.height = `${1404 * scale}px`;
        tablet.style.transform = `scale(${scale})`;
        document.getElementById("geometry").textContent =
            `1872 × 1404 native pixels · ${Math.round(scale * 100)}% display scale`;
    }

    function render() {
        const content =
            state.view === "settings"
                ? settings()
                : state.view === "edit"
                  ? editor()
                  : grid();
        tablet.innerHTML =
            header() +
            content +
            `<footer class="footer"><span>${state.sync}</span><span>${state.power}</span></footer>` +
            dialog();
        if (state.modal)
            tablet
                .querySelectorAll(":scope > :not(.overlay)")
                .forEach((element) => (element.inert = true));
        document.getElementById("demo-scene").value =
            state.pairing === "waiting" && state.view === "settings"
                ? "pairing"
                : state.view;
        document.getElementById("simulation-controls").hidden =
            state.view !== "settings" || state.pairing !== "waiting";
        document
            .querySelectorAll("[data-roster]")
            .forEach((element) =>
                element.setAttribute(
                    "aria-pressed",
                    String(
                        Number(element.dataset.roster) === state.habits.length,
                    ),
                ),
            );
        const geometry = layout();
        document.getElementById("density").textContent =
            `${visibleHabits().length} visible habits · ${geometry.rowHeight}px rows + 12px gaps · ${geometry.maxY > 0 ? "Page scrolling active" : "All habits fit"}`;
        drawQr();
        fitPreview();
    }

    function openSettings() {
        state.view = "settings";
        state.staged = {
            powerImages: state.powerImages,
            showPrivate: state.showPrivate,
            serverUrl: state.serverUrl,
        };
    }

    function startPairing() {
        state.pairing = "waiting";
        state.expiresAt = Date.now() + 300000;
    }

    function saveSettings() {
        const url = state.staged.serverUrl.trim();
        if (url && !/^https?:\/\/[^\s/]+(?:\/[^\s]*)?$/.test(url)) {
            state.modal = { type: "url" };
            return;
        }
        if (url !== state.serverUrl) {
            state.connected = false;
            state.pairing = "";
        }
        if (state.powerImages !== state.staged.powerImages)
            state.power = state.staged.powerImages
                ? "Originals backed up · Power-state images saved"
                : "Original power-state images restored";
        Object.assign(state, state.staged, { serverUrl: url });
        state.sync = url
            ? state.connected
                ? "Synced"
                : "Not connected"
            : "Offline";
        state.view = "grid";
        state.scrollY = 0;
        state.pairing = "";
    }

    const actions = {
        grid: () => {
            state.view = "grid";
        },
        edit: () => {
            state.view = "edit";
            state.editY = 0;
        },
        settings: openSettings,
        "month-prev": () => moveMonth(-1),
        "month-next": () => moveMonth(1),
        today: () => {
            state.year = 2026;
            state.month = 8;
            recenter();
        },
        "days-prev": () => {
            state.scrollX = scrollByBoxes(
                state.scrollX,
                -7,
                100,
                layout().maxX,
            );
        },
        "days-next": () => {
            state.scrollX = scrollByBoxes(state.scrollX, 7, 100, layout().maxX);
        },
        "rows-up": () => {
            const geometry = layout();
            state.scrollY = scrollByBoxes(
                state.scrollY,
                -geometry.scrollRows,
                geometry.step,
                geometry.maxY,
            );
        },
        "rows-down": () => {
            const geometry = layout();
            state.scrollY = scrollByBoxes(
                state.scrollY,
                geometry.scrollRows,
                geometry.step,
                geometry.maxY,
            );
        },
        "edit-up": () => {
            state.editY = scrollByBoxes(
                state.editY,
                -6,
                120,
                Math.max(0, visibleHabits().length * 120 - 840),
            );
        },
        "edit-down": () => {
            state.editY = scrollByBoxes(
                state.editY,
                6,
                120,
                Math.max(0, visibleHabits().length * 120 - 840),
            );
        },
        mark: (element) => {
            const habit = state.habits.find(
                (item) => item.id === Number(element.dataset.id),
            );
            const day = Number(element.dataset.day);
            const current = mark(habit, day);
            let next = "";
            if (habit.negative) next = current === "O" ? "" : "O";
            else if (current === "") next = "X";
            else if (current === "X") next = "O";
            state.entries[entryKey(habit, day)] = next;
            state.sync = "Saved locally";
        },
        polarity: (element) => {
            const habit = findHabit(element);
            habit.negative = !habit.negative;
        },
        private: (element) => {
            const habit = findHabit(element);
            habit.private = !habit.private;
        },
        "move-up": (element) => moveHabit(element, -1),
        "move-down": (element) => moveHabit(element, 1),
        delete: (element) => {
            state.modal = { type: "delete", id: Number(element.dataset.id) };
        },
        "confirm-delete": () => {
            state.habits = state.habits.filter(
                (habit) => habit.id !== state.modal.id,
            );
            state.modal = null;
        },
        dismiss: () => {
            state.modal = null;
        },
        toggle: (element) => {
            state.staged[element.dataset.property] =
                element.dataset.value === "true";
        },
        "settings-back": () => {
            if (settingsDirty()) state.modal = { type: "discard" };
            else leaveSettings();
        },
        discard: () => {
            state.modal = null;
            leaveSettings();
        },
        "settings-done": saveSettings,
        connect: startPairing,
        "cancel-pairing": () => {
            state.pairing = "";
        },
        disconnect: () => {
            state.connected = false;
            state.pairing = "";
            state.sync = "Not connected";
        },
        sync: () => {
            state.sync = state.connected
                ? "Synced just now"
                : "Sign in by connecting this tablet";
        },
        quit: () => {
            state.modal = { type: "closed" };
        },
    };

    function leaveSettings() {
        state.view = "grid";
        state.pairing = "";
    }
    function findHabit(element) {
        return state.habits.find(
            (habit) => habit.id === Number(element.dataset.id),
        );
    }
    function moveHabit(element, direction) {
        const habit = findHabit(element);
        const index = state.habits.indexOf(habit);
        const next = index + direction;
        if (next < 0 || next >= state.habits.length) return;
        state.habits.splice(index, 1);
        state.habits.splice(next, 0, habit);
    }
    function moveMonth(direction) {
        const next = new Date(state.year, state.month + direction, 1);
        state.year = next.getFullYear();
        state.month = next.getMonth();
        recenter();
    }

    tablet.addEventListener("click", (event) => {
        const element = event.target.closest("[data-action]");
        if (!element || element.disabled) return;
        const focusLabel = element.getAttribute("aria-label");
        const action = element.dataset.action;
        actions[action](element);
        render();
        if (state.modal)
            tablet
                .querySelector(".dialog button")
                .focus({ preventScroll: true });
        else if (focusLabel)
            Array.from(tablet.querySelectorAll("[aria-label]"))
                .find((item) => item.getAttribute("aria-label") === focusLabel)
                ?.focus({ preventScroll: true });
    });
    tablet.addEventListener("change", (event) => {
        if (event.target.dataset.name) {
            const name = event.target.value.trim();
            const habit = state.habits.find(
                (item) => item.id === Number(event.target.dataset.name),
            );
            if (name) habit.name = name;
            else event.target.value = habit.name;
        }
    });
    tablet.addEventListener("input", (event) => {
        if (event.target.id !== "server-url") return;
        state.staged.serverUrl = event.target.value;
        tablet
            .querySelectorAll('[data-action="sync"], [data-action="connect"]')
            .forEach((element) => {
                element.disabled = !serverReady();
            });
        tablet.querySelector(".page-bottom .secondary").textContent =
            settingsDirty() ? "Unsaved changes" : "Changes apply on Done";
        document.getElementById("server-hint").textContent =
            state.staged.serverUrl.trim() !== state.serverUrl
                ? "Save with Done before connecting. Leave blank to work offline."
                : "Leave blank to use this tablet offline.";
    });
    tablet.addEventListener("submit", (event) => {
        if (event.target.id !== "add-habit") return;
        event.preventDefault();
        const name = document.getElementById("new-habit").value.trim();
        if (!name) return;
        state.habits.push({
            id: state.nextId++,
            name,
            negative: false,
            private: false,
        });
        state.editY = Math.max(0, visibleHabits().length * 120 - 840);
        render();
        document.getElementById("new-habit").focus({ preventScroll: true });
    });
    document.querySelectorAll("[data-roster]").forEach((element) =>
        element.addEventListener("click", () => {
            setRoster(Number(element.dataset.roster));
            state.view = "grid";
            state.pairing = "";
            state.modal = null;
            recenter();
            render();
        }),
    );
    document
        .getElementById("demo-scene")
        .addEventListener("change", (event) => {
            state.modal = null;
            state.pairing = "";
            if (
                event.target.value === "settings" ||
                event.target.value === "pairing"
            )
                openSettings();
            else state.view = event.target.value;
            if (event.target.value === "pairing") {
                state.connected = false;
                state.sync = "Not connected";
                startPairing();
            }
            render();
        });
    document.getElementById("demo-zoom").addEventListener("change", (event) => {
        state.zoom = event.target.value;
        fitPreview();
    });
    document
        .getElementById("reset-demo")
        .addEventListener("click", () => location.reload());
    document.querySelectorAll("[data-simulate]").forEach((element) =>
        element.addEventListener("click", () => {
            if (element.dataset.simulate === "approve") {
                state.connected = true;
                state.pairing = "";
                state.sync = "Synced";
            } else
                state.pairing =
                    element.dataset.simulate === "expire" ? "expired" : "error";
            render();
        }),
    );
    setInterval(() => {
        if (state.view !== "settings" || state.pairing !== "waiting") return;
        const remaining = Math.max(
            0,
            Math.ceil((state.expiresAt - Date.now()) / 1000),
        );
        if (!remaining) {
            state.pairing = "expired";
            render();
            return;
        }
        const countdown = document.getElementById("pairing-countdown");
        if (countdown)
            countdown.textContent = `Waiting for approval · ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
    }, 1000);
    new ResizeObserver(fitPreview).observe(
        document.getElementById("preview-viewport"),
    );
    setRoster(11);
    recenter();
    render();
})();
