// Presentation-neutral reading of a habit's state for a day, derived from the shared X/O glossary
// (monorepo-root CONTEXT.md). The store holds the backend's Outcome; the X/O semantics — including
// a negative habit's implicit "stayed clean" X — live only here, so components never re-derive them.
import type { Outcome, Polarity } from "./types";

export type MarkKind = "done" | "missed" | "slip" | "clean" | "empty";

export interface MarkView {
    kind: MarkKind;
    label: string;
    // Future clean days on a negative habit: "didn't slip" hasn't happened yet.
    muted: boolean;
}

// `outcome` is the stored value for a (habit, day), or undefined when Unmarked (no alive entry).
// Positive: success = done, failure = missed. Negative: failure = slipped; anything else is an
// (implicit) clean day.
export const markView = (
    polarity: Polarity,
    outcome: Outcome | undefined,
    isFuture = false,
): MarkView => {
    if (polarity === "negative" && outcome === "failure") {
        return { kind: "slip", label: "Slipped", muted: false };
    }

    if (polarity === "negative") {
        return { kind: "clean", label: "Clean", muted: isFuture };
    }

    if (polarity === "positive" && outcome === "success") {
        return { kind: "done", label: "Done", muted: false };
    }

    if (polarity === "positive" && outcome === "failure") {
        return { kind: "missed", label: "Missed", muted: false };
    }

    return { kind: "empty", label: "Not yet", muted: false };
};

// The tap cycle expressed as a storage action, mirroring the reMarkable client's cycle:
// positive: Unmarked → success → failure → Unmarked; negative: Unmarked → failure → Unmarked.
// Cycling back to Unmarked is a soft-delete ("clear") — byte-identical to the write sync sends
// for a cleared cell (see docs/adr/0001).
export type MarkAction = { type: "set"; outcome: Outcome } | { type: "clear" };

export const nextAction = (
    polarity: Polarity,
    outcome: Outcome | undefined,
): MarkAction => {
    if (polarity === "negative")
        return outcome === "failure"
            ? { type: "clear" }
            : { type: "set", outcome: "failure" };
    if (outcome === undefined) return { type: "set", outcome: "success" };
    return outcome === "success"
        ? { type: "set", outcome: "failure" }
        : { type: "clear" };
};

// A day "counts" toward a streak when a positive habit succeeded, or a negative habit didn't slip.
export const isSuccess = (
    polarity: Polarity,
    outcome: Outcome | undefined,
): boolean =>
    polarity === "negative" ? outcome !== "failure" : outcome === "success";

// A habit's streak, computed by the cross-month look-back in db/repo.getStreaks.
export interface HabitStreak {
    // Consecutive successful days ending today (inclusive); 0 if today isn't (yet) a success.
    current: number;
    // The same run ending yesterday — the "established" streak, shown while today is unmarked.
    established: number;
}

// The streak number a surface shows: the run through today, or — while today is still unmarked —
// the run through yesterday, so an unmarked day still reads "keep your N-day streak". One
// definition used by every surface, so Today and Month never disagree on the number.
export const displayStreak = (streak: HabitStreak | undefined): number =>
    streak ? Math.max(streak.current, streak.established) : 0;
