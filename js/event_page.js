var checkUpload = function() {

    chrome.runtime.requestUpdateCheck(function(status) {

        if (status === "update_found") {
            console.log("update pending...");
        } else if (status === "no_update") {
            console.log("no update found");
        } else if (status === "throttled") {
            console.log("Oops, I'm asking too frequently - I need to back off.");
        }

    });
};

chrome.alarms.onAlarm.addListener(checkUpload);

chrome.runtime.onUpdateAvailable.addListener(function(details) {
    console.log("updating to version " + details.version);
    chrome.runtime.reload();
});

chrome.alarms.create({ periodInMinutes: 5 });








var sendMessageToActiveTabOfCurrentWindow = function(message, sendMessage) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs){
        chrome.tabs.sendMessage(tabs[0].id, message, function(m){
            sendMessage(m);
        });
    });
};

var getKantubanUserInfo = function(func){

    chrome.cookies.getAll({
        domain: ".kantuban.com",
    }, function(cookies){

        function get(name) {
            for (var i = 0, l = cookies.length; i < l; i++) {
                if (cookies[i].name === name) {
                    return decodeURIComponent(cookies[i].value);
                }
            }
        }

        var uid = get("uid"), uname = get("uname");

        if (uid && uname) {
            func({ uid: uid, uname: uname, avatar: get("avatar") });
        } else {
            func(null);
        }
    });
};




var baseServerLocation = "http://www.kantuban.com/";


var capturedContent;
var capturedSourceURL;
var type;


chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    
    if (message.analyse_result) {

        var result = "<!doctype html>\n" + message.analyse_result;

        result = result.replace(/<!--ktb_extension_inject_placeholder-->/g, '<script src="js/extension_frame_injection.js"></script>');

        capturedContent = result;
        capturedSourceURL = message.location_href;
        type = "html";

        chrome.tabs.create({ url: "preview.html" });
        sendResponse();

    } else if (message.message === "capture_picture") {

        chrome.tabs.captureVisibleTab(function(dataURI){
            sendResponse(dataURI);
        });

    } else if (message.message === "capture_data") {

        capturedContent = message.data;
        capturedSourceURL = message.location_href;
        type = "image";

        chrome.tabs.create({ url: "preview.html" });
        sendResponse();

    }

    return true;

});


function getClickHandler() {

    return function(info, tab) {
        var data = {
            media: info.srcUrl,
            url: info.pageUrl,
            alt: "",
            ref: "",
            title: tab.title,
            is_video: false,
            origin: baseServerLocation
        };

        sendMessageToActiveTabOfCurrentWindow({
            message: "ktb_extension_save_image",
            data: data
        });
    };
};

/**
 * Create a context menu which will only show up for images.
 */
chrome.contextMenus.create({
    "id" : baseServerLocation,
    "title" : "采集到看图班",
    "type" : "normal",
    "contexts" : ["image"]
});

chrome.contextMenus.onClicked.addListener(getClickHandler());
