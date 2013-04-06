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
        var frames, from;

        if (message == "ktb_extension_child_hover") {

            if (win.parent == win) {

                frames = doc.querySelectorAll("iframe,frame,object");

                for (var i = 0, len = frames.length; i < len; i++) {
                    if (source === frames[i].contentWindow) {
                        from = frames[i];
                    }
                }

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

        }

    });

})(window, document, document.documentElement, document.body);



