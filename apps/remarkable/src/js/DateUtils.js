const pad2 = (number) => (number < 10 ? `0${number}` : `${number}`);

function daysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function monthName(date) {
    return Qt.formatDate(date, "MMMM yyyy");
}

function dateKey(year, month, day) {
    return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function monthKey(year, month) {
    return `${year}-${pad2(month + 1)}`;
}

function ordinal(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 13) return n + "th";
    if (mod10 === 1) return n + "st";
    if (mod10 === 2) return n + "nd";
    if (mod10 === 3) return n + "rd";
    return n + "th";
}
