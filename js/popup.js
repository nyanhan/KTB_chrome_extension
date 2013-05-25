var $ = function(id){
    return document.getElementById(id);
};

var collect_content = $("collect_content");
var collect_all_content = $("collect_all_content");
var collect_image = $("collect_image");
var capture_part = $("capture_part");
var capture_hole = $("capture_hole");
var container = $("container");
var modify_page = $("modify_page");

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

collect_image.addEventListener("click", function(){
    chrome.runtime.getBackgroundPage(function(background){
        background.sendMessageToActiveTabOfCurrentWindow({ message: "ktb_extension_image_start" }, function(){
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

capture_hole.addEventListener("click", function(){
    chrome.runtime.getBackgroundPage(function(background){

        container.innerHTML = '<div style="white-space:nowrap;margin-bottom:0;" class="alert"><strong>提示：</strong> 广告很短马上回来 <br> &nbsp;&nbsp;&nbsp;&nbsp;…正在截屏请勿滚动屏幕… </div>';

        background.sendMessageToActiveTabOfCurrentWindow({ message: "ktb_extension_capture_hole" }, function(){
            // window.close();
        });
    });
});

modify_page.addEventListener("click", function(){
    chrome.runtime.getBackgroundPage(function(background){
        background.sendMessageToActiveTabOfCurrentWindow({ message: "ktb_extension_modify_page" }, function(){
            window.close();
        });
    });
});
