// Translation between the client's roster/month state and the backend sync wire format (ADR
// 0003). Pure functions only — the QML SyncStore does the I/O. Timestamps are epoch ms UTC.
// The X/O <-> Outcome mapping and the tombstone encoding live here, at the client edge.

const POSITIVE = "Positive";
const NEGATIVE = "Negative";
const SUCCESS = "Success";
const FAILURE = "Failure";

const outcomeOf = (state) => (state === "x" ? SUCCESS : FAILURE);
const stateOf = (outcome) => (outcome === SUCCESS ? "x" : "o");

// Build the sync request. roster: [{id,name,negative,updatedAt}] in display order (its index
// becomes Position). monthEntries: { id: { date: { s, t } } }. tombstones: pending habit
// deletes [{ id, deletedAt }]. Cleared cells (s: "") become deleted entries.
function buildRequest(roster, monthEntries, monthKey, tombstones) {
    const habits = (roster || []).map((h, i) => ({
        id: h.id,
        name: h.name,
        polarity: h.negative ? NEGATIVE : POSITIVE,
        position: i,
        updatedAt: h.updatedAt,
        deleted: false,
    }));

    const habitTombstones = (tombstones || []).map((t) => ({
        id: t.id,
        name: "",
        polarity: POSITIVE,
        position: 0,
        updatedAt: t.deletedAt,
        deleted: true,
    }));

    return {
        habits: habits.concat(habitTombstones),
        months: [{ month: monthKey, entries: entriesToWire(monthEntries) }],
    };
}

const entriesToWire = (monthEntries) => {
    const src = monthEntries || {};
    return Object.keys(src).reduce((acc, habitId) => {
        const cells = src[habitId] || {};
        Object.keys(cells).forEach((date) => {
            const cell = cells[date];
            const cleared = !cell || !cell.s;
            acc.push({
                habitId: habitId,
                date: date,
                outcome: cleared ? SUCCESS : outcomeOf(cell.s),
                updatedAt: cell ? cell.t : 0,
                deleted: cleared,
            });
        });
        return acc;
    }, []);
};

// Fold an authoritative response into the shapes HabitsStore.applySynced wants: roster
// [{id,name,negative,updatedAt}] (already in the server's Position order) and entriesByHabitId
// { id: { date: { s, t } } } for the given month. The response carries alive rows only.
function applyResponse(response, monthKey) {
    const habits = (response && response.habits) || [];
    const roster = habits.map((h) => ({
        id: h.id,
        name: h.name,
        negative: h.polarity === NEGATIVE,
        updatedAt: h.updatedAt,
    }));

    const months = (response && response.months) || [];
    const month = months.filter((m) => m.month === monthKey)[0];
    const entries = (month && month.entries) || [];

    const entriesByHabitId = entries.reduce((acc, e) => {
        acc[e.habitId] = acc[e.habitId] || {};
        acc[e.habitId][e.date] = { s: stateOf(e.outcome), t: e.updatedAt };
        return acc;
    }, {});

    return { roster: roster, entriesByHabitId: entriesByHabitId };
}

// Did the server's authoritative state differ from what we sent? If not, skip overwriting the
// model (and its e-ink redraw). Compares alive rows by edit-time, order-insensitively — exact,
// since the server stores client edit-times verbatim.
function responseChangesLocal(request, response) {
    return (
        !sameMap(aliveHabitMap(request.habits), aliveHabitMap(response.habits)) ||
        !sameMap(aliveEntryMap(request.months), aliveEntryMap(response.months))
    );
}

const aliveHabitMap = (habits) =>
    (habits || []).reduce((acc, h) => {
        if (!h.deleted) acc[h.id] = h.updatedAt;
        return acc;
    }, {});

const aliveEntryMap = (months) =>
    (months || []).reduce((acc, m) => {
        (m.entries || []).forEach((e) => {
            if (!e.deleted) acc[`${m.month}|${e.habitId}|${e.date}`] = e.updatedAt;
        });
        return acc;
    }, {});

const sameMap = (a, b) => {
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    return ak.every((k) => b.hasOwnProperty(k) && b[k] === a[k]);
};
