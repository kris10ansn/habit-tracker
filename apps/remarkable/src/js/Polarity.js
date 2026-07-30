// Habit polarity, spelled as the backend's Polarity enum so the roster file, the sync wire format
// and every conditional in the app share one representation. Replaces the old `negative` boolean.

const POSITIVE = "Positive";
const NEGATIVE = "Negative";

function isNegative(polarity) {
    return polarity === NEGATIVE;
}

function toggled(polarity) {
    return isNegative(polarity) ? POSITIVE : NEGATIVE;
}

// Rosters written before polarity replaced the `negative` boolean still carry the old field, and a
// deploy can land before the file is rewritten — so reads tolerate both spellings.
function fromHabit(habit) {
    if (habit && habit.polarity) {
        return habit.polarity;
    }

    return habit && habit.negative ? NEGATIVE : POSITIVE;
}
