import QtQuick 2.15
import ".." as App

Item {
    id: status

    property string leftText: ""
    property string rightText: ""

    height: 64

    Rectangle {
        x: App.Theme.margin
        width: parent.width - 2 * x
        height: 2
        color: App.Theme.rule
    }

    Text {
        x: App.Theme.margin
        y: 14
        width: (parent.width - 2 * x) / 2
        text: status.leftText
        color: App.Theme.muted
        font.pixelSize: 25
        elide: Text.ElideRight
    }

    Text {
        anchors.right: parent.right
        anchors.rightMargin: App.Theme.margin
        y: 14
        width: (parent.width - 2 * App.Theme.margin) / 2
        horizontalAlignment: Text.AlignRight
        text: status.rightText
        color: App.Theme.muted
        font.pixelSize: 25
        elide: Text.ElideRight
    }

}
