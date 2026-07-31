// Habit polarity, spelled as the backend's Polarity enum so the roster file, the sync wire format
// and every conditional in the app share one representation.

const POSITIVE = "Positive";
const NEGATIVE = "Negative";

function isNegative(polarity) {
    return polarity === NEGATIVE;
}

function toggled(polarity) {
    return isNegative(polarity) ? POSITIVE : NEGATIVE;
}
