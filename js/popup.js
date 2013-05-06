var $ = function(id){
    return document.getElementById(id);
};

var collect_content = $("collect_content");
var collect_all_content = $("collect_all_content");
var collect_text = $("collect_text");
var capture_part = $("capture_part");

collect_content.addEventListener("click", function(){
    chrome.runtime.getBackgroundPage(function(background){
        background.sendMessageToActiveTabOfCurrentWindow({ message: "ktb_extension_content_start" }, function(){
            window.close();
        });
    });
});

collect_all_content.addEventListener("click", function(){
    chrome.runtime.getBackgroundPage(function(background){
        background.sendMessageToActiveTabOfCurrentWindow({ message: "ktb_extension_whole_start" }, function(){
            window.close();
        });
    });
});

collect_text.addEventListener("click", function(){
    chrome.runtime.getBackgroundPage(function(background){
        background.sendMessageToActiveTabOfCurrentWindow({ message: "ktb_extension_text_start" }, function(){
            window.close();
        });
    });
});

capture_part.addEventListener("click", function(){
    chrome.runtime.getBackgroundPage(function(background){
        background.sendMessageToActiveTabOfCurrentWindow({ message: "ktb_extension_capture_part" }, function(){
            window.close();
        });
    });
});
