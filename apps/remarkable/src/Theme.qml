pragma Singleton
import QtQuick 2.15

QtObject {
    property int margin: 52
    property int habitsWidth: 360
    property int boxSize: 88
    property int boxSpacing: 12
    property int rowSpacing: 12
    property int minimumRowHeight: 72
    property int maximumRowHeight: 128
    property int editorRowHeight: 120
    property int labelGap: 20
    property int buttonWidth: 80
    property int buttonGap: 20
    property int dayLabelHeight: 52

    property int titleFont: 64
    property int subtitleFont: 28
    property int labelFont: 34
    property int dayLabelFont: 29
    property int buttonFont: 32
    property int scrollFont: 48

    property color fg: "black"
    property color bg: "white"
    property color muted: "#555555"
    property color rule: "#bbbbbb"

    property int borderWidth: 2
    property int buttonBorderWidth: 2

    property real fadedOpacity: 0.3

    property int quitButtonWidth: 160
    property int quitButtonHeight: 72

    property int deleteButtonSize: 60
    property int inputPadding: 12
}
