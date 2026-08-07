// Proves, at compile time, that mobile's domain types ARE the backend's wire types.
//
// The backend keeps one DTO per concept and spells every client-owned field the way clients store
// it (see apps/backend/CLAUDE.md), which is what lets sync decode without mappers, casts, or a
// translation layer. That property is easy to state and easy to break: rename a field in
// `Dtos/HabitDtos.cs`, regenerate, and nothing in mobile fails to compile — the generated types
// stay internally consistent, just no longer equal to what SQLite holds. The mismatch would only
// surface later, at runtime, as a Zod error at the sync edge.
//
// This file turns that into a build error instead. It is types only — no values, no exports that
// survive compilation, nothing in the bundle. Its entire job is to stop typechecking when the two
// sides drift.
//
// When it breaks, the fix is a decision, not a cast: the backend owns the shape, so either mobile's
// domain type follows it, or the backend's DTO was wrong and should change. Never reconcile the two
// by widening a type or mapping between them here — that is the mapper this design exists to avoid.

import type { EntryDto, HabitDto, Outcome, Polarity } from "@/api/gen";
import type {
    Entry,
    Habit,
    Outcome as LocalOutcome,
    Polarity as LocalPolarity,
} from "@/domain/types";

/**
 * True only when `A` and `B` are mutually assignable — so a field added on one side, dropped from
 * the other, or made optional all resolve to `false`. The tuple wrappers stop naked type
 * parameters from distributing over unions, which would make unrelated unions compare equal.
 */
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/** Fails to compile when handed `false`, carrying the offending comparison in the error. */
type Assert<T extends true> = T;

// The two record shapes that cross the wire on every sync.
export type HabitMatchesWire = Assert<Exact<HabitDto, Habit>>;
export type EntryMatchesWire = Assert<Exact<EntryDto, Entry>>;

// The enum spellings. These are load-bearing in three places at once — the backend's member names,
// what Postgres stores, and what mobile writes to SQLite — so a casing change has to break here.
export type PolarityMatchesWire = Assert<Exact<Polarity, LocalPolarity>>;
export type OutcomeMatchesWire = Assert<Exact<Outcome, LocalOutcome>>;
