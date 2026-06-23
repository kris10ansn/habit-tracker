// Projections of the in-memory habits ListModel onto serializable shapes.
// The model is the single source of truth; each store serializes its own slice.

// Full projection (config + entries) — used by the suspend canvas for drawing
// and signature comparison, not for persistence.
function toArray(model) {
    if (!model || typeof model.count !== "number") return [];

    const out = [];
    for (let i = 0; i < model.count; i++) {
        const h = model.get(i);
        out.push({
            name: h.name,
            negative: !!h.negative,
            hideFromSleep: !!h.hideFromSleep,
            entries: h.entries || {},
        });
    }
    return out;
}

// Roster projection: identity + config, no entries. Array order is display order.
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
        });
    }
    return out;
}

// Month projection: { habitId: { dateKey: state } }, habits without entries
// omitted. Memory only ever holds the current month, so the entries map is
// already scoped to one month.
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
