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
