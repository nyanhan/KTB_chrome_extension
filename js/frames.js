(function(win, doc, html, body){

    var stopEventList = ("mousedown mouseup mouseover mousemove click dbclick").split(" ");
    var frames = win.frames;

    function stopEvent(e) {
        e.stopPropagation();
        e.preventDefault();
    }

    function sendMessaget2ChildFrames(message){
        for (var i = frames.length - 1; i >= 0; i--) {
            frames[i].postMessage(message, "*");
        }
    }

    function getFrameByWindowObject(win){
        var frames = doc.querySelectorAll("iframe,frame,object");

        for (var i = 0, len = frames.length; i < len; i++) {
            if (win === frames[i].contentWindow) {
                return frames[i];
            }
        }

        return null;
    }


    html.addEventListener("mouseover", function(){
        if (win.parent != win) {
            win.parent.postMessage("ktb_extension_child_hover", "*");
        }
    }, true);

    html.addEventListener("click", function(){
        if (win.parent != win) {
            win.parent.postMessage("ktb_extension_child_click", "*");
        }
    }, true);

    win.addEventListener("message", function(e){
        var message = e.data;
        var source = e.source;
        var from;

        if (message == "ktb_extension_child_hover") {

            if (win.parent == win) {

                from = getFrameByWindowObject(source);

                if (from) {
                    HtmlCollector.hover(from);
                }
                
            } else {
                win.parent.postMessage("ktb_extension_child_hover", "*");
            }

        } else if (message == "ktb_extension_child_click") {

            if (win.parent == win) {
                HtmlCollector.click();
            } else {
                win.parent.postMessage("ktb_extension_child_click", "*");
            }

        } else if (message == "ktb_extension_child_freezing") {

            stopEventList.forEach(function(eventName){
                html.addEventListener(eventName, stopEvent, true);
                html.addEventListener(eventName, stopEvent, false);
            });

            sendMessaget2ChildFrames("ktb_extension_child_freezing");

        } else if (message == "ktb_extension_child_free") {

            stopEventList.forEach(function(eventName){
                html.removeEventListener(eventName, stopEvent, true);
                html.removeEventListener(eventName, stopEvent, false);
            });

            sendMessaget2ChildFrames("ktb_extension_child_free");

        } else if (message && message.hasOwnProperty && message.hasOwnProperty("ktb_extension_child_iframe")) {

            /* invoke 向上找不能传 html, 如果 html 就不好向 DOM append*/
            Analyser.invoke(body, function(a){
                win.parent.postMessage({
                    "ktb_extension_child_content": a.outerHTML,
                    "token": message.ktb_extension_child_iframe
                }, "*");
            }, function(){
                win.parent.postMessage({
                    "ktb_extension_child_content": "",
                    "token": message.ktb_extension_child_iframe
                }, "*");
            });
        } else if (message && message.hasOwnProperty && message.hasOwnProperty("ktb_extension_child_content")) {
            Analyser.callback({
                message: message.ktb_extension_child_content,
                token: message.token
            });
        }

    });

})(window, document, document.documentElement, document.body);



