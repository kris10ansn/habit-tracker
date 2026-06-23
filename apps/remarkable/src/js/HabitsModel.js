// Projections of the in-memory habits ListModel onto serializable shapes. The model is the
// single source of truth; each store serializes its own slice. Since sync, entries are inline
// { s: state, t: editedAtMs } objects and habits carry an updatedAt edit-time (ADR 0003).

// Suspend-canvas projection: entries flattened to date -> state string. Drawing and the dedup
// signature only care about the visible state, never timestamps — so this keeps SuspendDraw
// unchanged and naturally drops cleared (s: "") tombstone markers.
function toArray(model) {
    if (!model || typeof model.count !== "number") return [];

    const out = [];
    for (let i = 0; i < model.count; i++) {
        const h = model.get(i);
        out.push({
            name: h.name,
            negative: !!h.negative,
            hideFromSleep: !!h.hideFromSleep,
            entries: statesOf(h.entries),
        });
    }
    return out;
}

const statesOf = (entries) => {
    const src = entries || {};
    return Object.keys(src).reduce((out, date) => {
        const state = src[date] && src[date].s ? src[date].s : "";
        if (state) out[date] = state;
        return out;
    }, {});
};

// Roster projection: identity + config + edit-time, no entries. Array order is display order.
function toRoster(model) {
    if (!model || typeof model.count !== "number") return [];

    const out = [];
    for (let i = 0; i < model.count; i++) {
        const h = model.get(i);
        out.push({
            id: h.id,
            name: h.name,
            negative: !!h.negative,
            hideFromSleep: !!h.hideFromSleep,
            updatedAt: h.updatedAt,
        });
    }
    return out;
}

// Month projection: { habitId: { dateKey: { s: state, t: editedAtMs } } }. Cleared cells
// (s: "") are kept as tombstone markers for sync; habits with no cells are omitted.
function toMonthEntries(model) {
    if (!model || typeof model.count !== "number") return {};

    const out = {};
    for (let i = 0; i < model.count; i++) {
        const h = model.get(i);
        const entries = h.entries || {};
        if (Object.keys(entries).length > 0) out[h.id] = entries;
    }
    return out;
}
