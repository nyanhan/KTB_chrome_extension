var backgroundPage;
var base_url;
var global_canvas;
var post_data;

chrome.runtime.getBackgroundPage(function(background){

    backgroundPage = background;
    base_url = background.baseServerLocation;
    post_data = background.capturedContent;

    backgroundPage.getKantubanUserInfo(function(info){
        var info_container = $('.header-right')[0];

        if (info) {
            info_container.innerHTML = '<a class="member" target="_blank" href="' + base_url + 'people/' + info.uid + '"> <img class="member-avatar" height="30" width="30" src="' +
                                info.avatar + '" alt="' + info.uname + '"> </a>';
        } else {
            info_container.innerHTML = '<a class="header-btn" href="' + base_url + 'account/login?referrer=' + encodeURIComponent(location.href) +
             '"> <span class="header-btn-text">登陆</span> </a>';
        }
    });

    if (backgroundPage.type === "html") {
        handleHTMLPreview(backgroundPage);
    } else if (backgroundPage.type === "image") {
        handleImagePreview(backgroundPage);
    }

});

var resizeHandler = function(){
    $("#preview_frame").css("height", (window.innerHeight - 40));
};

function handleHTMLPreview(background){
    var preview_frame = $("#preview_frame")[0];

    preview_frame.contentDocument.write(background.capturedContent);

    window.addEventListener("resize", resizeHandler, false);
    resizeHandler();
}

function createCanvas(){

    if (global_canvas) {
        return global_canvas;
    }

    var canvas = document.createElement("canvas");

    canvas.style.display = "none";

    document.body.appendChild(canvas);

    global_canvas = canvas;

    return canvas;
}

function handleImagePreview(background) {

    $("#preview_frame").remove();

    var preview_image = $("<img id=\"preview_image\" />");

    $("body").append(preview_image);

    preview_image.prop("src", background.capturedContent);

    $("#jcrop").show();

    var cp = Crop.init(preview_image[0], {

        onselect: function(sx, sy, ex, ey) {

            var canvas = createCanvas();

            canvas.width = ex - sx;
            canvas.height = ey - sy;

            var ctx = canvas.getContext("2d");

            ctx.drawImage(preview_image[0], -sx, -sy);

            var dataUrl = canvas.toDataURL("image/jpeg", 0.95);

            preview_image.prop("src", dataUrl);

            post_data = dataUrl;
        }
    });

    $("#jcrop").on("click", function(){
        cp.showAt(20, 20, 200, 100);
    });
}

var save_html = $("#save_html");
var notice_tiper = $("#notice_tiper");
var timer = 0;

function server_error(mes) {
    notice_tiper
        .removeClass("notice")
        .addClass("error")
        .html(mes)
        .stop(true, true)
        .animate({ "top": 0 }, 200);

    if (timer) {
        clearTimeout(timer);
        timer = 0;
    }

    timer = setTimeout(function(){
        notice_tiper.animate({ "top": -40 }, 200);
    }, 5000);
}

function server_notice(mes) {
    notice_tiper
        .removeClass("error")
        .addClass("notice")
        .html(mes)
        .stop(true, true)
        .animate({ "top": 0 }, 200);

    if (timer) {
        clearTimeout(timer);
        timer = 0;
    }

    timer = setTimeout(function(){
        notice_tiper.animate({ "top": -40 }, 200);
    }, 5000);
}

var onUploadSuccess = function(data) {
    var d = JSON.parse(data);

    if (backgroundPage.type === "image") {

        var w = $("#preview_image").width();
        var h = $("#preview_image").height();

        var query = "type=0&content=" + encodeURIComponent(d.url) +
                    "&width=" + w + "&height=" + h + "&source=" + encodeURIComponent(backgroundPage.capturedSourceURL);

        window.open(base_url + "poi/widget/upload?" + query,  "", 
                    'height=450, width=600, toolbar=no, menubar=no, scrollbars=no, resizable=yes, location=no');

    } else {
        var doc = $("#preview_frame")[0].contentDocument.body;

        var w = doc.offsetWidth;
        var h = doc.offsetHeight;

        var query = "type=7&content=" + encodeURIComponent(d.url) +
                    "&width=" + w + "&height=" + h + "&source=" + encodeURIComponent(backgroundPage.capturedSourceURL);

        window.open(base_url + "poi/widget/upload?" + query,  "", 
                    'height=450, width=600, toolbar=no, menubar=no, scrollbars=no, resizable=yes, location=no');
    }
};

save_html.on("click", function(){

    Upload.uploadImage(post_data, function(d){
        onUploadSuccess(d);
    }, function(message){
        server_error(message);
    }, { 
        type: "widget",
        mime: backgroundPage.type === "image" ? null : "text/html",
        progress: function(e){
            server_notice((e.loaded / e.total) * 100 + "%");
        } 
    });
});




