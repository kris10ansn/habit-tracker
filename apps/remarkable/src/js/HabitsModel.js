// Projections of the in-memory habits ListModel onto serializable shapes. The model is the
// single source of truth; each store serializes its own slice. Since sync, entries are inline
// { state, updatedAt } objects and habits carry an updatedAt edit-time (ADR 0003).

// Suspend-canvas projection: entries flattened to date -> state string. Drawing and the dedup
// signature only care about the visible state, never timestamps — so this keeps SuspendDraw
// unchanged and naturally drops cleared (state: "") tombstone markers.
function toArray(model) {
    if (!model || typeof model.count !== "number") return [];

    const out = [];
    for (let i = 0; i < model.count; i++) {
        const habit = model.get(i);
        out.push({
            name: habit.name,
            negative: !!habit.negative,
            hideFromSleep: !!habit.hideFromSleep,
            entries: statesOf(habit.entries),
        });
    }
    return out;
}

const statesOf = (entries) => {
    const src = entries || {};
    return Object.keys(src).reduce((out, date) => {
        const state = src[date] && src[date].state ? src[date].state : "";
        if (state) out[date] = state;
        return out;
    }, {});
};

// Roster projection: identity + config + edit-time, no entries. Array order is display order.
function toRoster(model) {
    if (!model || typeof model.count !== "number") return [];

    const out = [];
    for (let i = 0; i < model.count; i++) {
        const habit = model.get(i);
        out.push({
            id: habit.id,
            name: habit.name,
            negative: !!habit.negative,
            hideFromSleep: !!habit.hideFromSleep,
            updatedAt: habit.updatedAt,
        });
    }
    return out;
}

// Month projection: { habitId: { dateKey: { state, updatedAt } } }. Cleared cells
// (state: "") are kept as tombstone markers for sync; habits with no cells are omitted.
function toMonthEntries(model) {
    if (!model || typeof model.count !== "number") return {};

    const out = {};
    for (let i = 0; i < model.count; i++) {
        const habit = model.get(i);
        const entries = habit.entries || {};
        if (Object.keys(entries).length > 0) out[habit.id] = entries;
    }
    return out;
}
