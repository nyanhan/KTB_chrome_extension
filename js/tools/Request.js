(function(global){

var slot_length = (window.parent == window) ? 4 : 2;
var request_queue = [];
var running_slot = 0;
var EMPTY_IMAGE = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOwo=";

function handleFinish(xhr) {

    if (xhr) {
        xhr.onerror = xhr.onabort = xhr.onload = xhr.onloadstart = null;
    }
    
    running_slot--;

    sendRequest();
}

function sendRequest() {

    if (running_slot >= slot_length || !request_queue.length) {
        return;
    }

    var obj = request_queue.shift();
    var xhr = new XMLHttpRequest();

    xhr.open("GET", obj.url, true);

    xhr.onloadstart = function(){
        setTimeout(function(){ xhr && xhr.abort(); }, 5000);
        running_slot++;
    }

    xhr.onload = function(){

        if (xhr.status === 200) {
            obj.load(this.response);
        } else {
            obj.fail();
        }


        handleFinish(xhr);
        xhr = null;
    }

    xhr.onerror = xhr.onabort = function(){
        obj.fail();

        handleFinish(xhr);
        xhr = null;
    }

    xhr.responseType = obj.type;

    try {
        xhr.send();
    } catch(e) {
        handleFinish(xhr);
    }
    
}

function crossOriginGetRequest(url, type, load, fail) {

    request_queue.push({
        url: url,
        type: type,
        load: load,
        fail: fail || function(){}
    });

    sendRequest();
    
}

function getText(url, always) {

    crossOriginGetRequest(url, "text", function(result){ 
        always(result);
    }, function(){
        always("");
    });
}

function getImage(url, always){

    crossOriginGetRequest(url, "blob", function(result){

        var reader = new FileReader();

        reader.onload = function(e){
            always(e.target.result);
        };

        reader.onerror = function(){
            always(EMPTY_IMAGE);
        };

        reader.readAsDataURL(result);

    }, function(){
        always(EMPTY_IMAGE);
    });
}

global.Request = {
    Get: crossOriginGetRequest,
    GetImage: getImage,
    GetText: getText
};

})(this);

