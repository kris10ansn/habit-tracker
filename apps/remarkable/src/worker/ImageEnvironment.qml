import QtQuick 2.15
import "../js/BuildProfile.js" as BuildProfile
import "../js/Storage.js" as Storage

QtObject {
    property var configuration: ({})
    readonly property string appDirectory: configuration.appDirectory || BuildProfile.appDirectory
    readonly property string imageDirectory: configuration.imageDirectory || "/usr/share/remarkable"
    readonly property string bootImageDirectory: configuration.bootImageDirectory || "/var/lib/uboot"
    readonly property string deviceModel: configuration.deviceModel !== undefined
        ? configuration.deviceModel : Storage.readFile("/sys/devices/soc0/machine").trim()
    readonly property string suspendPath: BuildProfile.isTest
        ? appDirectory + "/suspend-preview.png" : imageDirectory + "/suspended.png"
    readonly property string suspendBackupPath: suspendPath + ".bak"
}
