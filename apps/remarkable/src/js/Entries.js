.import "Polarity.js" as Polarity

// Entry rows in the backend's SyncEntry shape: one normalized (habitId, date) row per marked day,
// carrying its outcome, edit-time and `deletedAt` tombstone stamp (null while alive). The month
// file persists these rows verbatim, so file, wire format and in-memory value are one shape.
//
// In memory the rows are indexed per habit as { dateKey: row } and that slice is held on the
// habit's ListModel row, because it is the only per-habit reactive vehicle QML gives us: replacing
// one habit's slice re-evaluates that row's ~31 cell bindings, where a single grid-wide index
// would re-evaluate all ~600 on every tap. See docs/adr/0005.

const UNMARKED = "";
const X = "x";
const O = "o";

const isAlive = (row) => !!row && !row.deletedAt;

function outcomeOf(row) {
    return isAlive(row) ? row.outcome : UNMARKED;
}

// The glyph a grid cell renders: the stored outcome, or the implicit X a negative habit shows for
// a day it has not slipped on.
function markFor(outcome, showsImplicitX) {
    if (outcome === X) {
        return "X";
    }
    if (outcome === O) {
        return "O";
    }

    return showsImplicitX ? "X" : UNMARKED;
}

// Positive habits cycle Unmarked -> X -> O -> Unmarked; negative habits (which render an unmarked
// day as X) cycle Unmarked -> O -> Unmarked. Clearing writes a tombstone rather than dropping the
// key, so the next sync can push the clear.
function toggledRow(habitId, dateKey, polarity, currentRow) {
    const current = outcomeOf(currentRow);
    const next = nextOutcome(polarity, current);
    const editedAt = Date.now();
    const cleared = next === UNMARKED;

    return {
        habitId: habitId,
        date: dateKey,
        // A tombstone keeps the outcome it had; the backend ignores a deleted row's payload.
        outcome: cleared ? current : next,
        updatedAt: editedAt,
        deletedAt: cleared ? editedAt : null,
    };
}

const nextOutcome = (polarity, current) => {
    if (Polarity.isNegative(polarity)) {
        return current === O ? UNMARKED : O;
    }
    if (current === UNMARKED) {
        return X;
    }

    return current === X ? O : UNMARKED;
};

function byHabitId(rows) {
    return (rows || []).reduce((index, row) => {
        index[row.habitId] = index[row.habitId] || {};
        index[row.habitId][row.date] = row;
        return index;
    }, {});
}

function withRow(entriesByDate, row) {
    const next = Object.assign({}, entriesByDate);
    next[row.date] = row;

    return next;
}

// Alive outcomes only, flattened to dateKey -> outcome. The suspend canvas draws and dedups on the
// visible outcome alone, so this drops tombstones and timestamps before they reach SuspendDraw.
function outcomesByDate(entriesByDate) {
    const src = entriesByDate || {};

    return Object.keys(src).reduce((outcomes, dateKey) => {
        const outcome = outcomeOf(src[dateKey]);
        if (outcome) {
            outcomes[dateKey] = outcome;
        }
        return outcomes;
    }, {});
}

// Month files written before entries were normalized nest them as
// { habitId: { dateKey: { state, updatedAt } } }, with state "" as the cleared marker. A deploy can
// land before a month is rewritten, and reading such a file as empty would let the next toggle
// overwrite it — so reads convert instead.
function rowsFromLegacyMonth(legacyEntries) {
    const src = legacyEntries && typeof legacyEntries === "object" ? legacyEntries : {};

    return Object.keys(src).reduce((rows, habitId) => {
        const cells = src[habitId] || {};
        Object.keys(cells).forEach((dateKey) =>
            rows.push(legacyRow(habitId, dateKey, cells[dateKey])),
        );
        return rows;
    }, []);
}

const legacyRow = (habitId, dateKey, cell) => {
    const state = (cell && cell.state) || UNMARKED;
    const editedAt = (cell && cell.updatedAt) || 0;

    return {
        habitId: habitId,
        date: dateKey,
        // A legacy cleared cell recorded no prior outcome; X matches what its wire form sent.
        outcome: state || X,
        updatedAt: editedAt,
        deletedAt: state ? null : editedAt,
    };
};
