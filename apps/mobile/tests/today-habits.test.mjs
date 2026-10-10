import assert from "node:assert/strict";
import test from "node:test";

import { todayHabits } from "../src/domain/todayHabits.ts";

const habit = (id, isPrivate) => ({
    id,
    name: id,
    polarity: "Positive",
    position: 0,
    isPrivate,
    createdAt: 1,
    editedAt: 1,
    deletedAt: null,
});

test("Today gates only private habits, without duplicates and in roster order", () => {
    const roster = [
        habit("private-first", true),
        habit("public-first", false),
        habit("private-last", true),
        habit("public-last", false),
    ];
    const locked = todayHabits(roster, false);
    assert.deepEqual(locked.publicHabits, [roster[1], roster[3]]);
    assert.deepEqual(locked.privateHabits, [roster[0], roster[2]]);
    assert.deepEqual(locked.summaryHabits, locked.publicHabits);
    assert.deepEqual(todayHabits(roster, true).summaryHabits, roster);
    assert.equal(
        new Set(
            [...locked.publicHabits, ...locked.privateHabits].map(
                (habit) => habit.id,
            ),
        ).size,
        roster.length,
    );
});

test("empty, public-only and private-only rosters have no placeholder habits", () => {
    assert.deepEqual(todayHabits([], false), {
        publicHabits: [],
        privateHabits: [],
        summaryHabits: [],
    });
    const publicHabit = habit("public", false);
    assert.deepEqual(todayHabits([publicHabit], false), {
        publicHabits: [publicHabit],
        privateHabits: [],
        summaryHabits: [publicHabit],
    });
    const privateHabit = habit("private", true);
    assert.deepEqual(todayHabits([privateHabit], false), {
        publicHabits: [],
        privateHabits: [privateHabit],
        summaryHabits: [],
    });
});

test("a newly synced privacy change moves the habit behind the gate", () => {
    const before = habit("habit", false);
    const after = { ...before, isPrivate: true, editedAt: 2 };
    assert.deepEqual(todayHabits([before], false).publicHabits, [before]);
    assert.deepEqual(todayHabits([after], false), {
        publicHabits: [],
        privateHabits: [after],
        summaryHabits: [],
    });
});
