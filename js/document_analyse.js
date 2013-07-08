var Analyser = (function(){

var returnObject = {};
var reCssUrl = /url\((.+?)\)/g;
var callbacks = {};
var AP = Array.prototype;
var CSSOM_HELPER = "ktb_extension_cssom_parse_helper";


function formatHTMLAsync(element){

    var d = Q.defer();

    switch(element.tagName) {

        case "IMG":

            if (element.src) {

                if (element.src.indexOf("data:") === 0) {
                    d.resolve();
                } else {
                    Request.GetImage(element.src, function(data){
                        element.src = data;
                        d.resolve();
                    });
                }

            } else {
                d.resolve();
            }

            break;

        case "STYLE":

            filterStyles(element.textContent, function(css){
                element.innerHTML = css.toString();
                d.resolve();
            }, location.href);

            break;

        case "LINK":

            if (element.href) {

                if (/\.css($|\?|#|&)/.test(element.href)) {

                    Request.GetText(element.href, function(data){

                        if (data) {

                            filterStyles(data, function(css){

                                var style = document.createElement("style");
                                style.type = "text/css";
                                style.innerHTML = css.toString();

                                if (element.getAttribute("media")) {
                                    style.setAttribute("media", element.getAttribute("media"));
                                }

                                element.insertAdjacentElement("afterEnd", style);
                                element.parentNode.removeChild(element);
                                d.resolve();

                            }, element.href);

                        } else {

                            element.parentNode.removeChild(element);
                            d.resolve();

                        }

                    });

                } else {
                    element.parentNode.removeChild(element);
                    d.resolve();
                }

            } else {
                d.resolve();
            }

            break;

        case "IFRAME":
        case "FRAME":
            element.src = "about:blank";
            fetchFrameContent(element.__source, function(content){

                var container = document.createElement("pre");
                container.className = "ktb_extension_iframe_placeholder";
                container.style.display = "none";
                container.textContent = content;

                element.insertAdjacentElement("afterEnd", container);
                d.resolve();
            });

            break;

        default:
            d.resolve();
            break;
    }

    return d.promise;
}

function formatElementSync(element, raw, reset_size) {

    if (element.nodeType !== 1) {
        // TODO 可能有条件注释 删除掉
        element.parentNode.removeChild(element);
        return;
    }

    if (reset_size) {
        resetElementStyle(element, raw, reset_size);
    }

    element.__source = raw;

    switch(element.tagName) {

        case "FORM":
            element.removeAttribute("action");
            break;

        case "BUTTON":
        case "INPUT":

            if (element.type === "submit") {
                element.type = "button";
            }

            break;

        case "A":

            if (!element.href || element.getAttribute("href") === "#") {
                element.href = "#";
            } else if (element.href.trimLeft().indexOf("javascript:") === 0) {
                // 去掉 href 中的 非 url;
                element.href = "#";
            } else if (element.getAttribute("href") && element.getAttribute("href").trimLeft().indexOf("http") !== 0) {
                element.href = element.href;
            }

            break;
        case "IMG":
            break;

        case "STYLE":
            break;

        case "LINK":
            break;

        case "META":

            if (element.getAttribute("http-equiv") && element.getAttribute("http-equiv").toLowerCase() === "content-type") {
                element.parentNode.removeChild(element);
            } else if (element.getAttribute("charset")) {
                element.parentNode.removeChild(element);
            }

            break;

        case "SCRIPT":

            element.parentNode.removeChild(element);
            break;

        case "IFRAME":
        case "FRAME":
            break;

        case "DIV":

            if (element.id === "ktb_extension_placeholder") {
                element.parentNode.removeChild(element);
            }

            break;

        case "APPLET":
        case "AUDIO":
        case "VIDEO":
        case "NOSCRIPT":
        case "BASE":
        case "COMMAND":
        // TODO object 可以引用子页面
        case "OBJECT":
        case "EMBED":
            element.parentNode.removeChild(element);
            break;
        default:
            break;
    }
}


function fetchFrameContent(iframe, always){

    var token = +new Date();

    callbacks[token] = always;

    if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({
            "ktb_extension_child_iframe": token
        }, "*");
    }

    // TODO 超时， chrome runInAllFrame 不能在脚本画的 iframe 中执行
    // 暂时不考虑直接冲进去取， 没有消息回来就先放弃。
    setTimeout(function(){
        Analyser.callback({
            message: "",
            token: token
        });
    }, 10000);
    
}

function resolveURI(root, url){

    if (url.indexOf("http") === 0) {
        return url;
    } else if (url.indexOf("/") === 0) {
        return root.split("/").slice(0, 3).join("/") + url;
    } else {
        return root.split("/").slice(0, -1).join("/") + "/" + url;
    }
}

function formatSelector(rule) {

    rule = rule.trim();

    if (rule === "*") {
        return rule;
    } else if (!rule || rule.indexOf("*") === 0) {
        return "";
    } else {
        return rule
                .replace(/:link|:visited|:hover|:active|:focus|:before|:after|:enabled|:disabled|:checked|::selection/ig, "")
                .replace('@charset "utf-8";', "");
    }

}

function isUseful(rule) {

    // 0 没用
    // 1 外层节点用到
    // 2 剪切的节点用到

    var items, ret = 0;

    try {

        items = returnObject.__clone.tagName === rule.toUpperCase() ? 
                [returnObject.__clone] : returnObject.__clone.querySelectorAll(rule);

        if (items.length) {

            ret = 1;

            for (var i = 0, l = items.length; i < l; i++) {
                if (returnObject.__target.contains(items[i])) {
                    ret = 2; break;
                }
            }

        } else {
            ret = 0;
        }

    } catch(e) {
        console.info(rule);
        return ret;
    }

    return ret;
}

function base64EncodeImage(styles, func, root) {

    var url;

    styles = styles.replace(reCssUrl, function(a, f){

        if (f.indexOf('"') === 0 || f.indexOf("'") === 0) {
            f = f.slice(1, -1);
        }

        if (f.indexOf("data:") === 0) {
            return "url(" + f + ")";
        } else {
            url = f;
            return "url(" + f + ")";
        }

    });

    if (!url) {
        func(styles);
    } else {
        Request.GetImage(resolveURI(root, url), function(data){
            func(styles.replace(url, data));
        });
    }   
}

function filterStyles(styles, func, root, inline) {

    if (!styles) {
        return func("");
    }

    // 没有选择器， 不需要解析， 直接替换
    if (inline) {
        styles = CSSOM_HELPER + "{" + styles + "}";
    }

    var rules;

    try {
        rules = CSSOM.parse(styles);
    } catch(e) {
        console.log(e);
        rules = e.styleSheet;
    }

    var deferTree = [];

    rules.cssRules.forEach(function(rule, i, array){

        var defer, url, selector;

        if(rule instanceof CSSOM.CSSImportRule) {

            // TODO
            // rule.href
            // rule.media 这个东西和 media 有关
            
            defer = Q.defer();
            url = resolveURI(root, rule.href);

            Request.GetText(url, function(data){

                filterStyles(data, function(styleSheet){

                    array[i] = null;

                    if (styleSheet.cssRules) {
                        styleSheet.cssRules.reverse().forEach(function(r){
                            rules.insertRule(r.cssText, i + 1);
                        });   
                    }

                    defer.resolve();

                }, root);
                
            });

            deferTree.push(defer.promise);

        } else if (rule instanceof CSSOM.CSSFontFaceRule) {
            rules.cssRules[i] = null;
        } else if (rule instanceof CSSOM.CSSStyleRule) {

            selector = formatSelector(rule.selectorText);

            var isUsed = selector ? (selector === CSSOM_HELPER ? 2 : isUseful(selector)) : 0;

            if (isUsed === 0) {
                rules.cssRules[i] = null;
            } else {
                for (var i = 0, l = rule.style.length; i < l; i++) {

                    (function(j){

                        var key = rule.style[j];
                        var value = rule.style[key];

                        if (value.indexOf("expression(") >= 0) {
                            rule.style[key] = "";
                        } else if (value.indexOf("url(") >= 0) {

                            // 外层不要背景图
                            // if (isUsed === 1) {
                            //     rule.style[key] = "";
                            //     return;
                            // }

                            var defer = Q.defer();
                            
                            base64EncodeImage(value, function(str){
                                rule.style[key] = str;
                                defer.resolve();
                            }, root);

                            deferTree.push(defer.promise);
                        }

                    })(i);
                }
            }
        }

    });

    Q.allResolved(deferTree).then(function(){

        var rule;

        for (var i = 0; i < rules.cssRules.length; i++) {

            rule = rules.cssRules[i];

            if (!rule) {
                rules.deleteRule(i);
                i--;
            }
        }

        func(rules);
    });

}

function formatAttributesAsync(element){
    
    var d = Q.defer();
    var attrs = element.attributes;
    var node;

    // 删除 onclick 类似事件
    for (var i = 0, l = attrs.length; i < l; i++) {
        node = attrs[i].nodeName;

        if (node && node.indexOf("on") === 0) {
            element.removeAttribute(node);
            i--; l--;
        }
    }

    var styles = element.getAttribute("style");

    filterStyles(styles, function(style){

        if (style) {
            element.style.cssText = style.toString()
                            .replace(CSSOM_HELPER, "").trim().slice(1, -1);
        }
        
        d.resolve();

    }, location.href, true);

    return d.promise;
}

function resetElementStyle(element, raw, size){

    var style = element.style;
    var position = getStyle(raw, "position");

    if (position !== "static") { position = "relative"; }

    style.margin = 0;
    style.outline = 0;
    style.top = 0;
    style.left = 0;
    style.display = "inline-block";
    style.padding = 0;

    if (size) {
        style.width = style.minWidth = size.width + "px";
        style.height = style.minHeight = size.height + "px";
    }
}

function formatElementAsync(element){
    return Q.allResolved([formatHTMLAsync(element), formatAttributesAsync(element)]);
}

function getStyle(element, prop){
    return window.getComputedStyle(element, null).getPropertyValue(prop);
}

function isVisible(element) {
    return !(getStyle(element, "display") === "none" || 
        getStyle(element, "visibility") === "hidden" ||
        getStyle(element, "opacity") === 0);
}

function getRoot(element){

    while (element.parentNode && element.parentNode !== document) {
        element = element.parentNode;
    }

    return element;
}

function copyStructSync(root) {

    var pointer, clone, temp, parent;
    var size = { width: root.scrollWidth, height: root.scrollHeight };

    // 向下复制
    pointer = clone = root.cloneNode(true);

    formatElementSync(clone, root, size);

    var tree = root.getElementsByTagName("*");
    var inner_tree = AP.slice.apply(clone.getElementsByTagName("*"));

    for (var i = 0, l = tree.length; i < l; i++) {

        temp = inner_tree[i];

        // 判断是否是隐藏元素已经删除掉
        if (clone.contains(temp)) {
            // 删除没用样式，后面还会加回来
            if (isVisible(tree[i]) && tree[i].tagName !== "LINK" && tree[i].tagName !== "STYLE") {
                formatElementSync(temp, tree[i]);
            } else {
                temp.parentNode.removeChild(temp);
            }
        }

    }

    // 向上复制
    // 
    
    while(root.parentNode && root.parentNode !== document) {

        parent = root.parentNode;
        temp = parent.cloneNode(false);

        if (pointer) {
            temp.appendChild(pointer);
        }

        formatElementSync(temp, parent, size);
        
        pointer = temp;
        root = parent;
    }

    // HEAD 复制
    //
    
    if (!document.head) {
        return clone;
    }

    var head = document.head.cloneNode(true);

    tree = document.head.getElementsByTagName("*");
    inner_tree = AP.slice.apply(head.getElementsByTagName("*"));

    for (var i = 0, l = tree.length; i < l; i++) {
        formatElementSync(inner_tree[i], tree[i]);
    }

    // TODO 设置一个替换符，考虑使用 SSI
    var injectPlaceholder = document.createComment("ktb_extension_inject_placeholder");
    head.appendChild(injectPlaceholder);

    // 设置 charset

    var element = document.createElement("meta");
    element.setAttribute("charset", "utf-8");
    head.insertBefore(element, head.firstElementChild);

    // 新窗口打开
    var base = document.createElement("base");
    base.setAttribute("target", "_blank");
    head.appendChild(base);

    // pointer 已经递归成 <html>
    pointer.insertBefore(head, pointer.firstElementChild);


    // 页面中零散的样式表放到头里面去
    // 
    var styles = document.body.querySelectorAll("style,link");

    for (var i = 0, l = styles.length; i < l; i++) {
        // 这里不能 clone false.
        temp = styles[i].cloneNode(true);
        temp.__source = styles[i];
        head.appendChild(temp);
    }


    return clone;
}

function recursionStructAsync(clone, done) {

    var deferTree = [formatElementAsync(clone)];
    var temp;

    var tree = AP.slice.apply(clone.getElementsByTagName("*"));

    for (var i = 0, l = tree.length; i < l; i++) {
        temp = tree[i];
        deferTree.push(formatElementAsync(temp));
    }

    Q.allResolved(deferTree).then(function(){
        done(clone);
    });
}

returnObject.invoke = function(root, done){

    if (root.tagName === "IMG") {
        return formatHTMLAsync(root).then(function(){
            done(root, "image");
        });
    }

    var pointer = returnObject.__target = copyStructSync(root);
    var clone = returnObject.__clone = getRoot(pointer);

    recursionStructAsync(clone, function(re){
        done(re);
    });

};

returnObject.callback = function(message){
    
    var callback = callbacks[message.token];

    // 用完删掉， 省得重复执行
    callbacks[message.token] = null;

    callback && callback(message.message);
};

return returnObject;

})();
