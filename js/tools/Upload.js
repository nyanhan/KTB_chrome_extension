(function(global){

var upload = global.Upload = {};
var token = {};

var upyun_server = {
    "pin": "http://v0.api.upyun.com/production/",
    "widget": "http://v0.api.upyun.com/widget/"
};

var baseServerLocation;
var queue = [];
var uing = false;

chrome.runtime.sendMessage({ message: "baseServerLocation" }, function(m){
    baseServerLocation = m;
});

upload.checkToken = function(type, func, error){

    if (token[type]) {
        return func(token[type]);
    }

    Request.GetText(baseServerLocation + "j/upyun/token?type=" + type + "&num=1&_=" + (+new Date()), function(text){

        if (!text) {
            return error("获取 token 失败");
        }

        var d = JSON.parse(text);

        if (d.error_code) {
            return error(d.error);
        }

        token[type] = d.tokens[0];

        return func(token[type]);

    });

};

function buildBlobContent(datauri, type){

    if (datauri.indexOf("data:") === 0) {
        var byteString = atob(datauri.split(',')[1]);

        var length = byteString.length,
            content = new Uint8Array(length);

        for (var i = 0; i < length; i++) {
            content[i] = byteString.charCodeAt(i);
        }

        return new Blob([content], { "type": datauri.split(";")[0].substring(5) });   
    } else {
        return new Blob([datauri], { type: type });
    }

}

function _checkUpload() {

    if (uing) { return; }
    else { uing = true; }

    var config = queue.shift();

    // 上传列表中没有了
    if (!config) { uing = false; return; }

    var datauri = config[0],
        func = config[1],
        error = config[2],
        c = config[3] || {},
        onprogress = c.progress,
        type = c.type || "pin",
        mime = c.mime;

    upload.checkToken(type, function(token){

        var xhr = new XMLHttpRequest(),
            stop = function() {
                if (xhr) {
                    xhr.upload.onerror = xhr.onerror = xhr.onload = null;
                    xhr.upload.onprogress = xhr.onabort = xhr.upload.onabort = null;
                    xhr = null;
                }

                uing = false;
                stop = null;

                _checkUpload();
            };

        xhr.upload.onprogress = function(e) {
            if (onprogress) {
                onprogress(e);
            }
        };

        xhr.upload.onerror = function(){
            error("上传异常");
            stop();
        };

        xhr.upload.onabort = function(){
            error("上传异常");
            stop();
        };

        xhr.onload = function(e) {

            var status = e.currentTarget.status;

            if (status === 200) {
                func(this.responseText);
                stop();
            } else {
                error("上传异常");
                stop();
            }
        };

        xhr.onerror = function(){
            error("上传异常");
            stop();
        };

        xhr.onabort = function(){
            error("上传过程网络异常");
            stop();
        };

        var form = new FormData();
        var end = "";

        form.append("signature", token[1]);
        form.append("policy", token[0]);

        if (mime) {
            end = mime.split("/")[1];
        }

        end = end || "jpg";

        form.append("file", buildBlobContent(datauri, mime), "a." + end);

        xhr.open("post", upyun_server[type], true);
        xhr.send(form);

    }, function(mes){
        error(mes);
    });
}

upload.uploadImage = function(datauri, func, error, config){

    queue.push([datauri, func, error, config]);

    _checkUpload();

};


})(this);