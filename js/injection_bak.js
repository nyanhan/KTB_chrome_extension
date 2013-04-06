var body = document.body,
    container = document.createElement("div"),
    status = 0,
    selectedTarget = null,
    helper, viewSize, tools;

var requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame;
var stopEventList = ("mousedown mouseup click dbclick").split(" ");
var excludeTagList = ("object iframe frame frameset applet audio video embed").split(" ");

container.id = "ktb_extension_placeholder";

var innerStyle =  ["<style>", 
"#ktb_extension_placeholder{  }",
"#ktb_helper{ border-radius:2px;display:none;cursor:pointer;position:absolute;z-index:10000;background-color:red;opacity:0.5; }",
"#ktb_helper_tools{ display:none;z-index:10000;border-radius:3px;padding:4px;position:absolute;background-color: #006dcc;background-image: -webkit-gradient(linear, 0 0, 0 100%, from(#0088cc), to(#0044cc));border-color: rgba(0, 0, 0, 0.1) rgba(0, 0, 0, 0.1) rgba(0, 0, 0, 0.25); }",
"#ktb_helper_tools a{ color:#fff;font-size:12px;line-height:1.2;padding:2px 4px;float:left;border-radius:3px; }",
"#ktb_helper_tools a:hover{ background-color:#fff;text-decoration:none;cursor:pointer;color:#006dcc; }",
"#ktb_helper_tools b{ left:50%;margin-left:-6px;position:absolute;bottom:-12px;border-right: transparent 6px solid; border-bottom: transparent 6px solid; border-left: transparent 6px solid; width: 0px; border-top: #0044cc 6px solid; height: 0px; }",
"#ktb_helper_tools.top b{ left:50%;margin-left:-6px;position:absolute;top:-12px;border-right: transparent 6px solid; border-top: transparent 6px solid; border-left: transparent 6px solid; width: 0px; border-bottom: #0088cc 6px solid; height: 0px; }",
"</style>"].join("\n");

var innerHTML = "<div id=\"ktb_helper\"></div>";

if (window.top == window) {
    innerHTML += "<div id=\"ktb_helper_tools\" class=\"top\"><a>重选</a><a>扩大</a><a>撤销</a><a>关闭</a><a>预览</a><b></b></div>";
}

container.innerHTML = innerStyle + innerHTML;

body.insertBefore(container, body.firstChild);
helper = document.getElementById("ktb_helper");
tools = document.getElementById("ktb_helper_tools");

if (tools) {

    var toolsList = tools.getElementsByTagName("a");
    var temp;

    for (var i = 0; i < toolsList.length; i++) {

        (function(i){

            temp = toolsList[i];

            temp.addEventListener("click", function(){
                switch(i) {
                    case 0:
                        start();
                        sendMessaget2ChildFrames("ktb_extension_start");
                        break;
                    case 1:
                        enlarger();
                        sendMessaget2ChildFrames("ktb_extension_enlarger");
                        break;
                    case 2:
                        break;
                    case 3:
                        clear();
                        sendMessaget2ChildFrames("ktb_extension_clear");
                        break;
                    case 4:
                        break;
                    default:
                        break;
                }
            });

        })(i);
    }
}


// cross frame postMessage
window.addEventListener("message", function(e){
    var message = e.data;

    var win = e.source,
        pos, from, frames;

    switch(message) {
        case "ktb_extension_hide":
            hideHelper();
            break;
        case "ktb_extension_stop":
            stop();
            sendMessaget2ChildFrames("ktb_extension_stop");
            break;
        case "ktb_extension_start":
            start();
            sendMessaget2ChildFrames("ktb_extension_start");
            break;
        case "ktb_extension_clear":
            clear();
            sendMessaget2ChildFrames("ktb_extension_clear");
            break;
        case "ktb_extension_enlarger":
            enlarger();
            sendMessaget2ChildFrames("ktb_extension_enlarger");
            break;
        default:

            if (message && message.indexOf("ktb_extension") == 0) {

                pos = JSON.parse(message.replace("ktb_extension|", ""));

                frames = document.querySelectorAll("iframe,frame,object");

                for (var i = 0, len = frames.length; i < len; i++) {
                    if (win === frames[i].contentWindow) {
                        from = frames[i];
                    }
                }

                if (from) {
                    setToolsPosition(from, pos);
                }

            }

            break;
    }
});

window.addEventListener("resize", function(){
    viewSize = getViewSize(true);
});

window.addEventListener("scroll", function(){
    viewSize = getViewSize(true);
});

// 插件通信 sendMessage, 会在所有 frame 中执行。
chrome.extension.onMessage.addListener(function(message){
    switch(message) {
        case "ktb_extension_start":
            start();
            break;
        default:
            break;
    }
});


function handleMouseover(e){

    var target = e.target;
    var style = helper.style;

    if (target.nodeType === 1 && excludeTagList.indexOf(target.tagName.toLowerCase()) < 0) {

        requestAnimationFrame(function(){
            var offset = target.getBoundingClientRect();
            var l = body.scrollLeft, t = body.scrollTop;

            style.left = offset.left + l + "px";
            style.top = offset.top + t + "px";
            style.width = offset.width + "px";
            style.height = offset.height + "px";
            style.display = "block";

            sendMessaget2ChildFrames("ktb_extension_hide");
        });

        selectedTarget = target;

    } else {
        hideHelper();
    }

}

function enlarger(){

    if (!selectedTarget || !selectedTarget.parentNode || selectedTarget.parentNode == document.documentElement) {
        return;
    }

    selectedTarget = selectedTarget.parentNode;

    var evt = document.createEvent("MouseEvents");
    
    evt.initMouseEvent("mouseover", true, true);

    start();

    selectedTarget.dispatchEvent(evt);

    setTimeout(function(){
        evt = document.createEvent("MouseEvents");
        evt.initMouseEvent("click", true, true);
        selectedTarget.dispatchEvent(evt);
    }, 50);
}

function sendMessaget2ChildFrames(message){
    for (var i = frames.length - 1; i >= 0; i--) {
        window.frames[i].postMessage(message, "*");
    }
}

function hideHelper() {
    helper.style.display = "none";
    selectedTarget = null;
}

function setToolsPosition(helper, offset) {

    var pos;

    if (offset) {
        pos = getToolsPosition(helper, true);
        pos.left += offset.left;
        pos.top += offset.top;
        pos.direct = offset.direct;
    } else {
        pos = getToolsPosition(helper);
    }

    if (window.parent == window) {

        if (pos.direct) {
            pos.top += 10;
        } else {
            pos.top -= 10;
        }

        tools.style.left = pos.left + "px";
        tools.style.top = pos.top + "px";
        tools.className = pos.direct ? "top" : "";
        tools.style.display = "block";
    } else {
        window.parent.postMessage("ktb_extension|" + JSON.stringify(pos), "*");
    }
}

function stopEvent(e) {

    if (e.type == "click") {
        if (tools && (tools == e.target || tools.contains(e.target))) {
            return;
        } else if (status == 2) {
            window.top.postMessage("ktb_extension_stop", "*");
            setToolsPosition(helper);
        }
    }

    e.stopPropagation();
    e.preventDefault();
}

function stop(){
    document.documentElement.removeEventListener("mouseover", handleMouseover, true);
    helper.style.pointerEvents = "auto";
    status = 1;
}

function clear(){
    
    stopEventList.forEach(function(eventName){
        document.documentElement.removeEventListener(eventName, stopEvent, true);
        document.documentElement.removeEventListener(eventName, stopEvent, false);
    });

    if (tools) {
        tools.style.display = "none";    
    }
    
    hideHelper();

    document.documentElement.removeEventListener("mouseover", handleMouseover, true);
    status = 0;
}

function start(){

    if (status === 2) { return; }

    stopEventList.forEach(function(eventName){
        document.documentElement.addEventListener(eventName, stopEvent, true);
        document.documentElement.addEventListener(eventName, stopEvent, false);
    });

    helper.style.pointerEvents = "none";

    if (tools) {
        tools.style.display = "none";
    }

    document.documentElement.addEventListener("mouseover", handleMouseover, true);
    status = 2;
}

function getViewSize(force){

    if (viewSize && !force) {
        return viewSize;
    }

    var ret = {};
    var left = body.scrollLeft;
    var top = body.scrollTop;

    ret.width = window.innerWidth;
    ret.height = window.innerHeight;
    ret.left = left > 0 ? left : 0;
    ret.top = top > 0 ? top : 0;

    return ret;
}

function getToolsPosition(elem, leftTop){

    var offset = elem.getBoundingClientRect();
    var l = body.scrollLeft, t = body.scrollTop;

    l += offset.left;
    t += offset.top;

    if (leftTop) {
        return { left: l, top: t };
    }

    var asize = { x: elem.offsetWidth, y: elem.offsetHeight };
    var bsize = { x: 164, y: 26 };
    var view = getViewSize();
    var direct = true;

    var left = l+ (asize.x - bsize.x) / 2;
    var top = t + asize.y;

    // 10 fix
    if (top + bsize.y + 10 > view.top + view.height) {
        top = t - bsize.y;
        direct = false;
    }

    return {
        left: left,
        top: top,
        direct: direct
    };

}

