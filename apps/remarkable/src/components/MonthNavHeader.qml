import QtQuick 2.15
import ".." as App

Row {
    id: monthNav

    property date date: new Date()
    property bool isCurrentMonth: true
    property bool disabled: false

    signal previousRequested()
    signal nextRequested()
    signal currentRequested()

    spacing: 16
    height: App.Theme.quitButtonHeight

    Text {
        text: Qt.formatDate(monthNav.date, "MMMM")
        color: App.Theme.fg
        font.pixelSize: App.Theme.titleFont
        anchors.verticalCenter: parent.verticalCenter
    }

    Text {
        text: Qt.formatDate(monthNav.date, "yyyy")
        color: App.Theme.muted
        font.pixelSize: App.Theme.subtitleFont
        anchors.verticalCenter: parent.verticalCenter
    }

    AppButton {
        width: 76
        height: parent.height
        text: "‹"
        fontSize: App.Theme.scrollFont
        disabled: monthNav.disabled
        onClicked: monthNav.previousRequested()
    }

    AppButton {
        width: 140
        height: parent.height
        text: "Today"
        disabled: monthNav.disabled || monthNav.isCurrentMonth
        onClicked: monthNav.currentRequested()
    }

    AppButton {
        width: 76
        height: parent.height
        text: "›"
        fontSize: App.Theme.scrollFont
        disabled: monthNav.disabled
        onClicked: monthNav.nextRequested()
    }

}
