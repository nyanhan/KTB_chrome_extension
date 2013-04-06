var Analyser = (function(){
 
var returnObject = {};

function getXPathFromElement(element) {

    if (element.id) {
        return 'id("' + element.id + '")';
    }

    if (element === document.documentElement) {
        return element.tagName.toLowerCase();
    }

    var ix= 0;
    var siblings= element.parentNode.childNodes;
    var sibling;

    for (var i = 0, l = siblings.length; i < l; i++) {
        sibling = siblings[i];

        if (sibling === element) {
            return getXPathFromElement(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1)+ ']';
        }

        if (sibling.nodeType === 1 && sibling.tagName === element.tagName) { ix++; }
    }
}

function formatHTML(element){
    var d = Q.defer();

    switch(element.tagName) {
        case "IMG":

            if (element.src) {
                wget(element.src, function(data){
                    element.src = data;
                    d.resolve();
                });
            }

            break;
        case "IFRAME":
            break;
        case "FRAME":
            break;
        case "OBJECT":
            break;
        case "EMBED":
            break;
        case "APPLET":
            break;
        case "AUDIO":
            break;
        case "VIDEO":
            break;
        default:
            d.resolve();
            break;
    }

    return d.promise;
}

function formatCss(element, raw, reset){

    if (reset) {
        resetCss(element);
    }

    var d = Q.defer();

    var background = getStyle(raw, "background-image");
    var temp;

    if (background && background.indexOf("url(") === 0) {
        temp = background.match(/[^\(\)\'\"]+/g);
        background = temp ? temp[1] : null;
    } else {
        background = null;
    }

    if (background) {
        if (background.indexOf("data") === 0) {
            element.style.backgroundImage = "url(" + background + ")";
            d.resolve();
        } else {
            wget(background, function(data){
                element.style.backgroundImage = "url(" + data + ")";
                d.resolve();
            });
        }
    } else {
        d.resolve();
    }

    return d.promise;
}

function resetCss(element){
    var style = element.style;
    var position = getStyle(element, "position");

    if (position !== "static") {
        position = "relative";
    }

    style.margin = 0;
    style.outline = 0;
    style.top = 0;
    style.left = 0;
}

function formatElement(element, raw, reset){
    return Q.allResolved([formatHTML(element), formatCss(element, raw, reset)]);
}

function getStyle(element, prop){
    return window.getComputedStyle(element, null).getPropertyValue(prop);
}

function wget(url, always){

    var xhr = new XMLHttpRequest();

    xhr.open("GET", url, true);

    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {

            var reader = new FileReader();

            reader.onload = function(e){
                always(e.target.result);
            }

            reader.readAsDataURL(xhr.response);
        }
    }

    xhr.responseType = "blob";
    xhr.send();
}


function recursion_up(root) {

    var defer = Q.defer();
    var result = root.cloneNode(false),
        temp, parent,
        tree = [[result, root]];

    while(root.parentNode && root.parentNode !== document) {
        parent = root.parentNode
        temp = parent.cloneNode(false);
        temp.appendChild(result);
        result = temp;
        tree.push([result, parent]);
        root = parent;
    }

    var deferTree = tree.map(function(item){
        return formatElement(item[0], item[1], true);
    });

    Q.allResolved(deferTree).then(function(){
        defer.resolve(result);
    });

    return defer.promise;
}

function recursion_down(root) {

}

function load_css(){

}


returnObject.invoke = function(root, done, fail){
    recursion_up(root)
    .then(function(a){

        var win = window.open("about:blank");
        win.document.write(a.outerHTML);

    }, function(){
        alert("error");
    });
};

returnObject.XPath = function(element) {
    return getXPathFromElement(element);
};

return returnObject;

})();
