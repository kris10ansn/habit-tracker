.import "Polarity.js" as Polarity

// Seed roster used the first time the app runs with no saved data. Ids, timestamps and
// entries are added when these are folded into the model (see HabitsStore).
const habits = [
    { name: "Read 20 pages", polarity: Polarity.POSITIVE },
    { name: "Exercise", polarity: Polarity.POSITIVE },
    { name: "Meditate", polarity: Polarity.POSITIVE },
    { name: "No screens after 22:00", polarity: Polarity.POSITIVE },
    { name: "Journal", polarity: Polarity.POSITIVE },
];
