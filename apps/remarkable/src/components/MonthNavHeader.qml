import QtQuick 2.15
import ".." as App

// Month header flanked by ‹ / › month-step arrows, plus a Today button that
// appears only when viewing a month other than the current one. Forwards
// navigation intent up; the page owns the actual month switch.
Row {
    id: monthNav

    property date date: new Date()
    property bool isCurrentMonth: true
    property bool warn: false
    property bool disabled: false

    signal previousRequested
    signal nextRequested
    signal currentRequested

    spacing: App.Theme.buttonGap

    AppButton {
        width: App.Theme.buttonWidth
        height: header.height
        text: "‹"
        fontSize: App.Theme.scrollFont
        disabled: monthNav.disabled
        onClicked: monthNav.previousRequested()
    }

    MonthHeader {
        id: header
        date: monthNav.date
        isCurrentMonth: monthNav.isCurrentMonth
        warn: monthNav.warn
    }

    AppButton {
        width: App.Theme.buttonWidth
        height: header.height
        text: "›"
        fontSize: App.Theme.scrollFont
        disabled: monthNav.disabled
        onClicked: monthNav.nextRequested()
    }

    AppButton {
        width: App.Theme.quitButtonWidth
        height: header.height
        visible: !monthNav.isCurrentMonth
        text: "Today"
        disabled: monthNav.disabled
        onClicked: monthNav.currentRequested()
    }
}
