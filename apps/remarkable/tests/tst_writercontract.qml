import QtQuick 2.15
import QtTest 1.2
import "../src/js/Storage.js" as Storage
import "../src/js/Entries.js" as Entries
import "../src/js/Polarity.js" as Polarity

TestCase {
    name: "WriterContract"
    function test_savedDataHasTheSameMeaningInBothClients() {
        const path = Qt.resolvedUrl("../../power-image-writer/tests/habit-contract.json").toString().replace("file://", "");
        const fixture = Storage.readJson(path);
        const byHabit = Entries.byHabitId(fixture.month.entries);
        const habits = fixture.roster.habits.filter(habit => !habit.deletedAt && !habit.isPrivate);
        compare(habits.length, fixture.expected.length);
        habits.forEach((habit, index) => {
            compare(habit.name, fixture.expected[index].name);
            let marks = "";
            for (let day = 1; day <= Number(fixture.date.slice(-2)); day++) {
                const date = fixture.month.month + "-" + (day < 10 ? "0" : "") + day;
                const outcome = Entries.outcomeOf((byHabit[habit.id] || {})[date]);
                marks += Entries.markFor(outcome, Polarity.isNegative(habit.polarity)) || " ";
            }
            compare(marks, fixture.expected[index].marks);
        });
    }
}
