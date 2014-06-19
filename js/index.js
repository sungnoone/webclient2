var BOSH_HOST = "http://192.168.1.238:7070/http-bind/";
var SHORT_HOST_NAME = "of3";
var LOGON_USER = "t002";
var LOGON_PWD = "t002";

var my = {
    connection: null,
    connected:false
};

$(document).ready(function () {

});


//Connect
function connect_server() {
    var conn = new Strophe.Connection(BOSH_HOST);//使用Strophe的連線方法
    //指派connection的Incoming、Outgoing負責函式 -- PO出通信訊息
    conn.xmlInput = function(body){
        showTraffic(body, "incoming");//Incoming message
    };
    conn.xmlOutput = function(body){
        showTraffic(body, "outgoing");//Outgoing message
    };
    // connect: function (jid, password, callback, wait, hold, route)
    // jid: 登入帳號需含域名以@隔開,
    // password: 登入帳號密碼
    // callback: 回呼函數這裡我們用來處理連線狀態以便確認連線成功與否
    // wait、hold、route 均為非必要參數，詳細作用請翻閱官方說明及參閱XEP-124規範
    conn.connect(LOGON_USER+"@"+SHORT_HOST_NAME, LOGON_PWD, function (status) {
        // 判斷連線狀態，開發者依據目前連線狀態，附加動作或聆聽事件
        if(status === Strophe.Status.CONNECTED) {
            //連線成功
            $("#message").append("<p>Connected!!!</p>");
            my.connected = true;
            //必須確認已連線狀態，才掛上聆聽事件
            conn.addHandler(handle_message,null,"message",'chat');
            //送出 new Strophe Builder 物件，即 <presence /> 為XML通訊節的根
            conn.send($pres());
        }else if(status === Strophe.Status.CONNECTING){
            //連線中，尚未確認成功
            $("#message").append("<p>Connecting!!!</p>");
        }else if(status === Strophe.Status.DISCONNECTED) {
            //斷線
            $("#message").append("<p>Disconnected!!!</p>");
            my.connected = false;
        }else if(status === Strophe.Status.DISCONNECTING) {
            //斷線中
            $("#message").append("<p>Disconnecting!!!</p>");
        }else if(status === Strophe.Status.ERROR){
            //連線錯誤
            $("#message").append("<p>An error has occurred</p>");
        }else if(status === Strophe.Status.CONNFAIL){
            //連線失敗
            $("#message").append("<p>Connection fail!!!</p>");
        }else{
            //其他不在篩選範圍的狀態顯示
            $("#message").append("<p>Status:"+status+"</p>");
        }
    });
    my.connection = conn;
}


//Disconnect
function disconnect_server() {
    my.connection.disconnect();//Connection執行斷線
    my.connected = false;//連線旗號改為false
}

//Show Traffic
function showTraffic(body, type){
    if(body.childNodes.length>0){
        //訊息會顯示在ID為console的網頁元素中
        var console = $("#console").get(0);
        var at_bottom = console.scrollTop >= console.scrollHeight - console.clientHeight;;
        $.each(body.childNodes, function(){
            //Strophe.serialize(): Render a DOM element and all descendants to a String.
            $("#console").append("<div class='"+type+"'>"+xml2html(Strophe.serialize(this))+"</div>");
        });
        if(at_bottom){
            //讓textarea能自動捲到最下
            console.scrollTop = console.scrollHeight;
        }
    };
}

//傳送 XML stanza
function btn_send_stanza(){
    var input = $("#input").val();
    var error = false;
    if(input.length>0){
        if(input[0]==="<"){
            var xml = textToXml(input);//把輸入的字串轉成可辨識的XML
            if(xml){
                my.connection.send(xml);//要透過connection的send方法才能動作
            }else{
                error = true;
            }
        }else if(input[0]==="$"){
            try{
                var builder = eval(input);
                my.connection.send(builder);
                $("#message").append("<p>Send OK!</p>");
            }catch (e){
                console.log(e);
                error = true;
            }
        }else{
            error = true;
        }
    }
    if(error){
        $("#input").animate({backgroundColor:"#faa"});
    }
}

//XML剖析器，分析字串轉為合法XML文件
function textToXml(text){
    var doc = null;
    if(window['DOMParser']){ //Firefox、Safari、Opera、Chrome都是支持這個剖析器
        var parser = new DOMParser();
        doc = parser.parseFromString(text, "text/xml")
    }else if(window['ActiveXObject']){ //這是針對IE6之前版本，沒有DOMParser API
        var doc = new ActiveXObject("MSXML2.DOMDocument");
        doc.async = false;
        doc.loadXML(text);
    }else{
        throw {
            type:"PeekError",
            message:"No DOMParser object found."
        };
    }
    var elem = doc.documentElement;
    //使用者不合法的XML輸入，會導致DOMParser產生error文件，
    //此文件會以<parsererror>元素作為最上層標簽，透過檢查此標籤過濾掉不合法的輸入
    if($(elem).filter("parsererror").length>0){
        return null;
    }
    return elem;
}

//xml string to html
function xml2html(str){
    //去除XML字串中會導致Html顯示有問題的特定符號
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

//Clear message
function btn_clear_msg(){
    $("#console").empty();
    $("#message").empty();
}

//Handler for receiving message
function handle_message(message){
    var from = $(message).attr("from");
    var body = $(message).children("body").text();
    showTraffic(message, "message-chat")
    return true;
}
