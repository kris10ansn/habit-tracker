.import "Entries.js" as Entries

// Projections of the in-memory habits ListModel onto serializable shapes. The model is the single
// source of truth; each store serializes its own slice. Habit rows carry identity + config +
// create-time + an updatedAt edit-time; entries are normalized rows held per habit by date key.

// Suspend-canvas projection: entries flattened to dateKey -> outcome, dropping the tombstones and
// timestamps the drawing and its dedup signature never look at.
function toArray(model) {
    if (!model || typeof model.count !== "number") return [];

    const out = [];
    for (let i = 0; i < model.count; i++) {
        const habit = model.get(i);
        out.push({
            name: habit.name,
            polarity: habit.polarity,
            hideFromSleep: !!habit.hideFromSleep,
            entries: Entries.outcomesByDate(habit.entriesByDate),
        });
    }
    return out;
}

// One habit as the roster file persists it and the wire format sends it, mirroring the backend's
// Habit. Model rows are always alive, so `deletedAt` is null for them; HabitsStore keeps tombstoned
// rows of this same shape in habitTombstones.
function rosterRow(habit) {
    return {
        id: habit.id,
        name: habit.name,
        polarity: habit.polarity,
        hideFromSleep: !!habit.hideFromSleep,
        createdAt: habit.createdAt,
        updatedAt: habit.updatedAt,
        deletedAt: habit.deletedAt || null,
    };
}

// Roster projection: the alive habits in display order, no entries. Array order is Position.
function toRoster(model) {
    if (!model || typeof model.count !== "number") return [];

    const out = [];
    for (let i = 0; i < model.count; i++) {
        out.push(rosterRow(model.get(i)));
    }
    return out;
}

// Month projection: every loaded entry row, flat. Tombstones are kept — they are what the next sync
// pushes. Rows whose habit is no longer in the roster are dropped, which is how a deleted habit's
// entries eventually leave the month files (see ADR 0002).
function toMonthEntryRows(model) {
    if (!model || typeof model.count !== "number") return [];

    const rows = [];
    for (let i = 0; i < model.count; i++) {
        const entriesByDate = model.get(i).entriesByDate || {};
        Object.keys(entriesByDate).forEach((dateKey) => rows.push(entriesByDate[dateKey]));
    }
    return rows;
}
