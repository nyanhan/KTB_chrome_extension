var backgroundPage;
var upyun_server;
var upload_type;
var base_url;

chrome.runtime.getBackgroundPage(function(background){

    backgroundPage = background;
    base_url = background.baseServerLocation;

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
        upyun_server = "http://v0.api.upyun.com/widget/";
        upload_type = "widget";
    } else if (backgroundPage.type === "image") {
        handleImagePreview(backgroundPage);
        upyun_server = "http://v0.api.upyun.com/widget/";
        upload_type = "widget";
    }

});

var resizeHandler = function(){
    $("#preview_frame").css("height", (window.innerHeight - 40));
};

function handleHTMLPreview(background){
    var preview_frame = $("#preview_frame")[0];

    preview_frame.srcdoc = background.capturedContent;

    window.addEventListener("resize", resizeHandler, false);
    resizeHandler();
}

function handleImagePreview(background) {
    $("#preview_frame").remove();

    var preview_image = $("<img id=\"preview_image\" />");

    $("body").append(preview_image);

    preview_image.prop("src", background.capturedContent);
}




var save_html = $("#save_html");
var notice_tiper = $("#notice_tiper");
var upyun_token, uploading = false;
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

function stopXHR(xhr) {
    if (xhr) {
        xhr.upload.onerror = xhr.onerror = xhr.onload = null;
        xhr.upload.onprogress = xhr.onabort = xhr.upload.onabort = null;   
    }

    uploading = false;
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

function buildBlobContent(dataURI){

    if (backgroundPage.type === "image") {
        var byteString = atob(dataURI.split(',')[1]);

        var length = byteString.length,
            content = new Uint8Array(length);

        for (var i = 0; i < length; i++) {
            content[i] = byteString.charCodeAt(i);
        }

        return new Blob([content.buffer], { "type" : "image/png" })

    } else {
        return new Blob([dataURI], { type: "text/html" });
    }
}

function startUpload() {

    if (uploading) {
        return;
    } else {
        uploading = true;
    }

    var xhr = new XMLHttpRequest();

    xhr.upload.onprogress = function(e) {
        if (e.lengthComputable) {
            server_notice(parseInt((e.loaded / e.total) * 100, 10) + "%");
        }
    };

    xhr.upload.onerror = function(){
        server_error("上传过程网络异常");
        stopXHR(xhr);
    };

    xhr.upload.onabort = function(){
        server_error("上传过程网络异常");
        stopXHR(xhr);
    };

    xhr.onload = function(e) {
        var status = e.currentTarget.status;

        if (status === 200) {
            server_notice("网页文件上传成功");
            onUploadSuccess(this.responseText);
            stopXHR(xhr);
        } else {
            server_error("上传过程网络异常");
            stopXHR(xhr);
        }
    };

    xhr.onerror = function(){
        server_error("上传过程网络异常");
        stopXHR(xhr);
    };

    xhr.onabort = function(){
        server_error("上传过程网络异常");
        stopXHR(xhr);
    };

    var form = new FormData();

    form.append("signature", upyun_token[1]);
    form.append("policy", upyun_token[0]);
    form.append("file", buildBlobContent(backgroundPage.capturedContent), backgroundPage.type === "image" ? "a.png" : "a.html");

    xhr.open("post", upyun_server, true);
    xhr.send(form);
}

save_html.on("click", function(){

    if (upyun_token) {
        startUpload();
        return;
    }

    $.ajax(base_url + "j/upyun/token", {
        data     : { type: upload_type, num: 1 },
        cache    : false,
        dataType : "json"
    }).done(function(d){

        if (d) {
            if (d.error_code) {
                if (!upyun_token) {
                    server_error(d.error);
                }

            } else {
                upyun_token = d.tokens[0];
            }
        }
        
    }).fail(function(){
        if (!upyun_token) {
            server_error("获取上传tokens失败，请重新尝试");
        }
    }).always(function(){
        if (upyun_token) {
            startUpload();
        }
    });

});




