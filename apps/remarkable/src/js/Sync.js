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
// becomes Position). monthEntries: { id: { date: { state, updatedAt } } }. tombstones: pending
// habit deletes [{ id, deletedAt }]. Cleared cells (state: "") become deleted entries.
function buildRequest(roster, monthEntries, monthKey, tombstones) {
    const habits = (roster || []).map((habit, position) => ({
        id: habit.id,
        name: habit.name,
        polarity: habit.negative ? NEGATIVE : POSITIVE,
        position: position,
        updatedAt: habit.updatedAt,
        deleted: false,
    }));

    const habitTombstones = (tombstones || []).map((tombstone) => ({
        id: tombstone.id,
        name: "",
        polarity: POSITIVE,
        position: 0,
        updatedAt: tombstone.deletedAt,
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
            const cleared = !cell || !cell.state;
            acc.push({
                habitId: habitId,
                date: date,
                outcome: cleared ? SUCCESS : outcomeOf(cell.state),
                updatedAt: cell ? cell.updatedAt : 0,
                deleted: cleared,
            });
        });
        return acc;
    }, []);
};

// Fold an authoritative response into the shapes HabitsStore.applySynced wants: roster
// [{id,name,negative,updatedAt}] (already in the server's Position order) and entriesByHabitId
// { id: { date: { state, updatedAt } } } for the given month. The response carries alive rows only.
function applyResponse(response, monthKey) {
    const habits = (response && response.habits) || [];
    const roster = habits.map((habit) => ({
        id: habit.id,
        name: habit.name,
        negative: habit.polarity === NEGATIVE,
        updatedAt: habit.updatedAt,
    }));

    const months = (response && response.months) || [];
    const month = months.filter(
        (responseMonth) => responseMonth.month === monthKey,
    )[0];
    const entries = (month && month.entries) || [];

    const entriesByHabitId = entries.reduce((byHabitId, entry) => {
        byHabitId[entry.habitId] = byHabitId[entry.habitId] || {};
        byHabitId[entry.habitId][entry.date] = {
            state: stateOf(entry.outcome),
            updatedAt: entry.updatedAt,
        };
        return byHabitId;
    }, {});

    return { roster: roster, entriesByHabitId: entriesByHabitId };
}

// Did the server's authoritative state differ from what we sent? If not, skip overwriting the
// model (and its e-ink redraw). Compares alive rows by edit-time, order-insensitively — exact,
// since the server stores client edit-times verbatim.
function responseChangesLocal(request, response) {
    return (
        !sameMap(
            aliveHabitMap(request.habits),
            aliveHabitMap(response.habits),
        ) ||
        !sameMap(aliveEntryMap(request.months), aliveEntryMap(response.months))
    );
}

const aliveHabitMap = (habits) =>
    (habits || []).reduce((byId, habit) => {
        if (!habit.deleted) byId[habit.id] = habit.updatedAt;
        return byId;
    }, {});

const aliveEntryMap = (months) =>
    (months || []).reduce((byMonthHabitDate, month) => {
        (month.entries || []).forEach((entry) => {
            if (!entry.deleted)
                byMonthHabitDate[
                    `${month.month}|${entry.habitId}|${entry.date}`
                ] = entry.updatedAt;
        });
        return byMonthHabitDate;
    }, {});

const sameMap = (a, b) => {
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    return ak.every((k) => b.hasOwnProperty(k) && b[k] === a[k]);
};
