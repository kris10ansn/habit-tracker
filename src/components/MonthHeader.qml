import QtQuick 2.15
import ".." as App
import "../js/DateUtils.js" as DateUtils

Column {
    id: header

    property date date: new Date()
    property bool warn: false

    spacing: 4

    Text {
        text: DateUtils.monthName(header.date)
        font.pixelSize: App.Theme.titleFont
        font.bold: true
        color: App.Theme.fg
    }

    Text {
        text: DateUtils.daysInMonth(header.date) + " days · today is the " + DateUtils.ordinal(header.date.getDate())
        font.pixelSize: App.Theme.subtitleFont
        color: App.Theme.fg
    }

    Text {
        visible: header.warn
        text: "(!) sleep image render failed"
        font.pixelSize: App.Theme.subtitleFont * 0.7
        color: App.Theme.fg
    }
}
