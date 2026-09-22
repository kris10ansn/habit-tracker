import QtQuick 2.15
import net.asivery.AppLoad 1.0
import "../js/BuildProfile.js" as BuildProfile

Item {
    id: transport
    signal message(string body)
    function send(body) { endpoint.sendMessage(1, body); }
    AppLoad {
        id: endpoint
        applicationID: BuildProfile.appId
        onMessageReceived: function(type, contents) {
            if (type === 2) transport.message(contents);
        }
    }
}
