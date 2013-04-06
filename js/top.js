var HtmlCollector = (function(win, doc, html, body){

    var returnObject = {};
    var requestAnimationFrame = win.requestAnimationFrame || win.webkitRequestAnimationFrame;
    var stopEventList = ("mousedown mouseup click dbclick").split(" ");
    // var excludeTagList = ("object iframe frame frameset applet audio video embed").split(" ");
    var viewSize;
    var pushstack = [];

    var innerStyle =  ["<style>", 
            "#ktb_extension_placeholder{  }",
            "#ktb_helper{ border-radius:2px;display:none;cursor:pointer;position:absolute;z-index:10000;background-color:red;opacity:0.5; }",
            "#ktb_helper_tools{ width:auto;display:none;z-index:10000;border-radius:3px;padding:4px;position:absolute;background-color: #006dcc;background-image: -webkit-gradient(linear, 0 0, 0 100%, from(#0088cc), to(#0044cc));border-color: rgba(0, 0, 0, 0.1) rgba(0, 0, 0, 0.1) rgba(0, 0, 0, 0.25); }",
            "#ktb_helper_tools a{ color:#fff;font-size:12px;line-height:1.2;padding:2px 4px;float:left;border-radius:3px; }",
            "#ktb_helper_tools a:hover{ background-color:#fff;text-decoration:none;cursor:pointer;color:#006dcc; }",
            "#ktb_helper_tools b{ left:50%;margin-left:-6px;position:absolute;bottom:-12px;border-right: transparent 6px solid; border-bottom: transparent 6px solid; border-left: transparent 6px solid; width: 0px; border-top: #0044cc 6px solid; height: 0px; }",
            "#ktb_helper_tools.top b{ left:50%;margin-left:-6px;position:absolute;top:-12px;border-right: transparent 6px solid; border-top: transparent 6px solid; border-left: transparent 6px solid; width: 0px; border-bottom: #0088cc 6px solid; height: 0px; }",
            "</style>"].join("\n");

    var innerHTML = "<div id=\"ktb_helper\"></div>" +
            "<div id=\"ktb_helper_tools\" class=\"top\"><a>重选</a><a>扩大</a><a>后退</a><a>关闭</a><a>新窗口</a><a>预览</a><b></b></div>";

    returnObject.container = doc.createElement("div");

    returnObject.container.id = "ktb_extension_placeholder";
    returnObject.container.innerHTML = innerStyle + innerHTML;

    body.insertBefore(returnObject.container, body.firstChild);

    var helper = doc.getElementById("ktb_helper");
    var tools = doc.getElementById("ktb_helper_tools");
    var selectedTarget = null;
    var status = 0, temp;

    // bindEvents

    var toolsList = tools.getElementsByTagName("a");

    html.addEventListener("click", function(e){
        if (status == 2) {
            stop();
            return;
        }

        var target = e.target;

        if (target == toolsList[0]) {
            returnObject.start();
        } else if (target == toolsList[1]) {
            enlarger();
        } else if (target == toolsList[2]) {
            temp = pushstack.pop();

            if (pushstack[pushstack.length - 1]) {
                select(pushstack.pop());
            } else {
                pushstack.push(temp);
            }

        } else if (target == toolsList[3]) {
            clear();
        } else if (target == toolsList[4]) {
            openFrame(selectedTarget);
        } else if (target == toolsList[5]) {
            Analyser.invoke(selectedTarget);
        }

    }, true);

    win.addEventListener("resize", function(){
        viewSize = returnObject.getViewSize(true);
    });

    win.addEventListener("scroll", function(){
        viewSize = returnObject.getViewSize(true);
    });

    function openFrame(elem) {

        var href = elem.getAttribute("src") || elem.getAttribute("data");

        if (href) {
            window.open(href);
        }
    }

    function handleMouseover(e){

        var target = e.target;
        var style = helper.style;

        if (target.nodeType === 1 ) {

            requestAnimationFrame(function(){
                var offset = target.getBoundingClientRect();
                var l = body.scrollLeft, t = body.scrollTop;

                style.left = offset.left + l + "px";
                style.top = offset.top + t + "px";
                style.width = offset.width + "px";
                style.height = offset.height + "px";
                style.display = "block";

            });

            selectedTarget = target;

        } else {
            hideHelper();
        }

    }

    function hideHelper() {
        helper.style.display = "none";
        tools.style.display = "none";
        selectedTarget = null;
    }

    function select(target) {

        if (!target) { return; }

        var evt = doc.createEvent("MouseEvents");
        
        evt.initMouseEvent("mouseover", true, true);

        returnObject.start();

        target.dispatchEvent(evt);

        setTimeout(function(){
            evt = doc.createEvent("MouseEvents");
            evt.initMouseEvent("click", true, true);
            target.dispatchEvent(evt);
        }, 16);

        selectedTarget = target;

    }

    function enlarger(){

        if (!selectedTarget || !selectedTarget.parentNode || selectedTarget.parentNode == html) {
            return;
        }

        select(selectedTarget.parentNode);
    }

    function setToolsPosition(helper) {

        tools.style.display = "block";

        var offset = { left: parseInt(helper.style.left, 10),
            top: parseInt(helper.style.top, 10) },
            asize = { x: helper.offsetWidth, y: helper.offsetHeight },
            bsize = { x: tools.offsetWidth, y: tools.offsetHeight },
            view = returnObject.getViewSize(),
            left = offset.left + (asize.x - bsize.x) / 2,
            top = offset.top + asize.y + 10,
            direct = true;

        if (top + bsize.y > view.top + view.height) {
            top = offset.top - bsize.y - 10;
            direct = false;
        }

        if (top < 0) {
            top = offset.top + 10;
            direct = true;
        }

        tools.style.left = left + "px";
        tools.style.top = top + "px";
        tools.style.display = "block";
        tools.className = direct ? "top" : "";

        if (selectedTarget.contentWindow) {
            tools.querySelector("a:nth-child(5)").style.display = "block";
        } else {
            tools.querySelector("a:nth-child(5)").style.display = "none";
        }
    }

    function stop(){

        if (status < 2) { return; }

        setToolsPosition(helper);

        html.removeEventListener("mouseover", handleMouseover, true);
        helper.style.pointerEvents = "auto";

        pushstack.push(selectedTarget);

        status = 1;
    }

    function clear(){

        win.postMessage("ktb_extension_child_free", "*");

        hideHelper();

        html.removeEventListener("mouseover", handleMouseover, true);

        pushstack = [];
        status = 0;
    }


    returnObject.getViewSize = function(force){

        if (viewSize && !force) {
            return viewSize;
        }

        var ret = {};
        var left = body.scrollLeft;
        var top = body.scrollTop;

        ret.width = win.innerWidth;
        ret.height = win.innerHeight;
        ret.left = left > 0 ? left : 0;
        ret.top = top > 0 ? top : 0;

        return ret;
    };

    returnObject.start = function(){

        if (status === 2) { return; }

        win.postMessage("ktb_extension_child_freezing", "*");

        helper.style.pointerEvents = "none";
        tools.style.display = "none";

        html.addEventListener("mouseover", handleMouseover, true);

        status = 2;
    };

    returnObject.hover = function(elem){
        // stop 情况事件不触法

        var evt = doc.createEvent("MouseEvents");

        selectedTarget = elem;
        
        evt.initMouseEvent("mouseover", true, true);

        selectedTarget.dispatchEvent(evt);
    };

    returnObject.click = function(){
        stop();
    };

    return returnObject;

})(window, document, document.documentElement, document.body);

// 插件通信 sendMessage, 会在所有 frame 中执行。
chrome.extension.onMessage.addListener(function(message){
    switch(message) {
        case "ktb_extension_start":
            HtmlCollector.start();
            break;
        default:
            break;
    }
});



