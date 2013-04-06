// var UserInfo = {};

// UserInfo._cookies = [];

// UserInfo.get = function(name) {
//     for (var i = 0, l = this._cookies.length; i < l; i++) {
//         if (this._cookies[i].name === name) {
//             return this._cookies[i].value;
//         }
//     }
// };

// UserInfo.isLogin = function(){
//     return this.get("uname") && !!this.get("uid");
// }

// chrome.cookies.getAll({
//     domain: ".kantuban.com",
// }, function(c){ 
//     UserInfo._cookies = c;

//     main();
// });

// function main(){
//     var collect = document.getElementById('collect_content');

//     collect.addEventListener("click", function(){
        
//     }, false);
// }

var collect_content = document.getElementById("collect_content");

collect_content.addEventListener("click", function(){
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {

        tabId = tabs[0].id;
        chrome.tabs.sendMessage(tabId, "ktb_extension_start");

        window.close();

    });
});

// 按钮状态
chrome.extension.onMessage.addListener(function(message) {
    
});