import QtQuick 2.15
import QtTest 1.2
import "../src/components" as Components
import "../src/js/Scroll.js" as Scroll

TestCase {
    id: testCase

    function populate(count) {
        habits.clear();
        for (let index = 0; index < count; index++) {
            habits.append({
                "name": "A long habit name that must not cross into the day grid " + index,
                "polarity": "Positive",
                "isPrivate": false,
                "entriesByDate": {
                }
            });
        }
        wait(0);
    }

    function cleanup() {
        testCase.height = 1404;
        page.showPrivateHabits = false;
        page.scrollY = 0;
    }

    function test_adaptiveRows_data() {
        return [{
            "tag": "empty",
            "count": 0,
            "row": 128,
            "overflow": false
        }, {
            "tag": "one",
            "count": 1,
            "row": 128,
            "overflow": false
        }, {
            "tag": "five",
            "count": 5,
            "row": 128,
            "overflow": false
        }, {
            "tag": "six",
            "count": 6,
            "row": 128,
            "overflow": false
        }, {
            "tag": "seven",
            "count": 7,
            "row": 121,
            "overflow": false
        }, {
            "tag": "eleven",
            "count": 11,
            "row": 72,
            "overflow": false
        }, {
            "tag": "twelve",
            "count": 12,
            "row": 72,
            "overflow": true
        }, {
            "tag": "twenty",
            "count": 20,
            "row": 72,
            "overflow": true
        }, {
            "tag": "thirty-five",
            "count": 35,
            "row": 72,
            "overflow": true
        }];
    }

    function test_adaptiveRows(data) {
        populate(data.count);
        compare(page.bodyHeight, 920);
        compare(page.visibleCount, data.count);
        compare(page.rowHeight, data.row);
        compare(page.maxScrollY > 0, data.overflow);
    }

    function test_privacyUpdatesDensityAndClampsLastPage() {
        populate(12);
        page.scrollY = page.maxScrollY;
        habits.setProperty(0, "isPrivate", true);
        tryCompare(page, "visibleCount", 11);
        compare(page.maxScrollY, 0);
        compare(page.scrollY, 0);
        habits.setProperty(1, "isPrivate", true);
        tryCompare(page, "rowHeight", 81);
        page.showPrivateHabits = true;
        tryCompare(page, "visibleCount", 12);
        compare(page.rowHeight, 72);
    }

    function test_scrollKeepsMinimumRowsAndClampsAtBottom() {
        populate(35);
        compare(page.scrollRows, 9);
        page.scrollY = Scroll.scrollByBoxes(0, 1000, page.rowHeight + 12, page.maxScrollY);
        compare(page.scrollY, 2008);
        compare(page.rowHeight, 72);
        populate(5);
        tryCompare(page, "scrollY", 0);
        compare(page.rowHeight, 128);
    }

    function test_geometryFollowsContainerHeight() {
        populate(11);
        testCase.height = 1200;
        compare(page.bodyHeight, 716);
        compare(page.rowHeight, 72);
        compare(page.maxScrollY, 196);
    }

    name: "TrackerPage"
    width: 1872
    height: 1404

    ListModel {
        id: habits

        dynamicRoles: true
    }

    Components.TrackerPage {
        id: page

        width: testCase.width
        height: testCase.height
        habits: habits
        daysInMonth: 30
        date: new Date(2026, 8, 16)
        year: 2026
        month: 8
        highlightDay: 16
        lastNonFutureDay: 16
    }

}
