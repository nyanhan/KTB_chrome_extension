var HtmlCollector = (function(win, doc, html, body){

    var returnObject = {};
    var requestAnimationFrame = win.requestAnimationFrame || win.webkitRequestAnimationFrame;
    var stopEventList = ("mousedown mouseup click dbclick").split(" ");
    var viewSize;
    var pushstack = [];

    var innerStyle = 
        '<div id="ktb_extension_fix" style="display:none;">' +
            '<div class="ktb_navbar">双击图片可以上传/重传</div>' +
            '<a href="javascript:;" class="ktb_close">+</a>' +
            '<a href="javascript:;" class="ktb_fold">-</a>' +
            '<div class="ktb_images">' +
            '</div>' +
            '<div class="ktb_navbar"><span class="ktb_error"></span><a href="javascript:;" class="ktb_button">保存</a></div>' +
        '</div>';

    var innerHTML = "<div id=\"ktb_helper_hidden\" style=\"display:none;\"></div><div id=\"ktb_helper\"></div>" +
            "<div id=\"ktb_helper_tools\" class=\"top\" style=\"display:none;\"><a>重选</a><a>扩大</a><a>后退</a><a>关闭</a><a>新窗口</a><a>预览</a><b></b></div>";

    returnObject.container = doc.createElement("div");
    returnObject.container.id = "ktb_extension_placeholder";
    returnObject.container.innerHTML = innerStyle + innerHTML;

    body.insertBefore(returnObject.container, body.firstChild);

    var style = doc.createElement("link");
    
    style.type = 'text/css';
    style.rel = 'stylesheet';
    style.href = chrome.extension.getURL("css/capture_page.css");
    returnObject.container.appendChild(style);

    var helper = doc.getElementById("ktb_helper");
    var tools = doc.getElementById("ktb_helper_tools");
    var hiddenField = doc.getElementById("ktb_helper_hidden");
    var ktbFix = doc.getElementById("ktb_extension_fix");
    var selectedTarget = null;
    var status = 0, temp;

    // bindEvents

    var toolsList = tools.getElementsByTagName("a");

    // 有些网站禁止右键
    document.body.addEventListener("contextmenu", function(e){ e.stopPropagation(); });

    ktbFix.addEventListener("click", function(e){

        if (e.target.className === "ktb_close") {

            ktbFix.style.display = "none";
            ktbFix.querySelector(".ktb_images").innerHTML = "";

        } else if (e.target.className === "ktb_fold") {

            var image_container = ktbFix.querySelector(".ktb_images");

            if (image_container.style.display === "none") {
                image_container.style.display = "";
            } else {
                image_container.style.display = "none";
            }
            
        } else if (e.target.className === "ktb_button") {

            var images = ktbFix.getElementsByClassName("ktb_one");
            var ins = [];

            for (var i = 0, l = images.length; i < l; i++) {
                if (images[i].__info) {
                    ins.push(images[i].__info);
                }
            }

            if (ins) {
                chrome.runtime.sendMessage({ image_info: ins, location_href: location.href }, function(){
                    ktbFix.style.display = "none";
                    ktbFix.querySelector(".ktb_images").innerHTML = "";
                });
            }
        }
    });

    html.addEventListener("click", function(e){

        if (status == 2) {
            stop();
            return;
        }

        var target = e.target;

        if (target == toolsList[0]) {
            returnObject.html();
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
            returnObject.clear();
        } else if (target == toolsList[4]) {
            openFrame(selectedTarget);
        } else if (target == toolsList[5]) {

            if (target.className === "disabled") {
                return;
            }

            temp = selectedTarget.tagName === "HTML" ? body : selectedTarget;

            target.className = "disabled";

            Analyser.invoke(temp, function(a, type){

                if (type === "image") {
                    
                    chrome.runtime.sendMessage({
                        message: "capture_data",
                        data: a.src,
                        location_href: location.href
                    });

                } else {

                    chrome.runtime.sendMessage({ 
                        analyse_result: a.outerHTML,
                        location_href: location.href
                    });

                }

            });
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
            
            var offset = target.getBoundingClientRect();
            var l = body.scrollLeft, t = body.scrollTop;

            style.left = offset.left + l + "px";
            style.top = offset.top + t + "px";
            style.width = offset.width + "px";
            style.height = offset.height + "px";
            style.display = "block";

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
        returnObject.html();
        target.dispatchEvent(evt);

        evt = doc.createEvent("MouseEvents");
        evt.initMouseEvent("click", true, true);
        target.dispatchEvent(evt);

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

        tools.querySelector("a:nth-child(6)").removeAttribute("class");
    }

    function stop(){

        if (status < 2) { return; }

        setToolsPosition(helper);

        html.removeEventListener("mouseover", handleMouseover, true);
        helper.style.pointerEvents = "auto";

        pushstack.push(selectedTarget);

        status = 1;
    }

    returnObject.clear = function(){

        win.postMessage("ktb_extension_child_free", "*");

        hideHelper();

        html.removeEventListener("mouseover", handleMouseover, true);

        pushstack = [];
        status = 0;
    };


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

    returnObject.html = function(){

        if (status === 2) { return; }

        win.postMessage("ktb_extension_child_freezing", "*");

        helper.style.pointerEvents = "none";
        tools.style.display = "none";

        html.addEventListener("mouseover", handleMouseover, true);

        status = 2;
    };

    returnObject.whole = function(){
        select(document.body);
    };

    returnObject.text = function(){
        alert("还没实现，敬请期待");
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

    function createPreview(info, text){

        text = text || "上传中";

        var container = document.getElementById("ktb_extension_fix");
        var imagesContainer = container.querySelector(".ktb_images");
        var image = document.createElement("div");
        var size = text.split("x");
        var cls = "";

        if (size[1] && parseInt(size[0], 10) < parseInt(size[1], 10)) {
            cls = "ktb_v";
        }

        image.className = "ktb_one";
        image.innerHTML = '<img class="' + cls + '" src="' + info.srcUrl + '"><span>' + text + '</span>';

        imagesContainer.appendChild(image);

        container.style.display = "block";

        image.addEventListener("dblclick", function(){
            image.querySelector("span").innerHTML = "上传中";
            uploadOnePreview(info, image);
        }, false);

        return image;

    }

    function uploadOnePreview(info, image) {

        if (!info.srcUrl) {
            image.querySelector("span").innerHTML = "空白图片";
            return;
        } else if (info.srcUrl.indexOf("data:") === 0) {
            Upload.uploadImage(info.srcUrl, function(d){
                image.querySelector("span").innerHTML = '<span style="background-color:lightgreen;">上传成功</span>';
                image.__info = JSON.parse(d);
            }, function(message){
                image.querySelector("span").innerHTML = message;
            });
        } else {
            Request.GetImage(info.srcUrl, function(data){

                Upload.uploadImage(data, function(d){
                    image.querySelector("span").innerHTML = '<span style="background-color:lightgreen;">上传成功</span>';;
                    image.__info = JSON.parse(d);
                }, function(message){
                    image.querySelector("span").innerHTML = message;
                });

            }, function(){
                image.querySelector("span").innerHTML = "下载失败";
            });
        }

    }

    returnObject.image = function(info){

        var one = createPreview(info);

        uploadOnePreview(info, one);

    };

    returnObject.imageSelect = function(){

        var images = document.getElementsByTagName("img");
        var temp;
        var result = {};

        for (var i = 0, l = images.length; i < l; i++) {

            temp = images[i];

            if (!temp.width || temp.width < 204) {
                continue;
            }

            if (!temp.height || temp.height < 136) {
                continue;
            }

            if (!temp.src) {
                continue;
            }

            result[temp.src] = temp;
        }

        var keys = Object.keys(result);

        if (keys.length === 0) {
            return alert("没有发现尺寸在 204x136 以上的图片");
        }

        keys.forEach(function(item, i){
            createPreview({ srcUrl: item }, result[item].width + " x " + result[item].height);
        });

    };

    return returnObject;

})(window, document, document.documentElement, document.body);

// 插件通信 sendMessage, 会在所有 frame 中执行。
chrome.runtime.onMessage.addListener(function(message, sender, sendMessage){

    HtmlCollector.clear();

    switch(message.message) {
        case "ktb_extension_content_start":
            HtmlCollector.html();
            break;
        case "ktb_extension_whole_start":
            HtmlCollector.whole();
            break;
        case "ktb_extension_image_start":
            HtmlCollector.imageSelect();
            break;
        case "ktb_extension_save_image":
            HtmlCollector.image(message.data);
            break;
        case "ktb_extension_modify_page":
            document.documentElement.contentEditable = true;
        default:
            break;
    }

    sendMessage();
    return true;
});



