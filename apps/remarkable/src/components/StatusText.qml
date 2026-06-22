import QtQuick 2.15
import ".." as App

Text {
    text: ""
    visible: text.length > 0
    font.pixelSize: App.Theme.subtitleFont
    color: App.Theme.fg
}
