import WebSocketPlus from "./WebSocketPlus.js";
import eventBus from './util/eventBus.js'

let connect = document.querySelector('#connect')
let sendMessage = document.querySelector('#sendMessage')
let destroy = document.querySelector('#destroy')

function setButtonState(state) {
  switch (state) {
    case 'open':
      connect.disabled = true
      sendMessage.disabled = false
      destroy.disabled = false
      break;
    case 'close':
      connect.disabled = false
      sendMessage.disabled = true
      destroy.disabled = true
      break;
  }
}

let ws;
function reconnectWebSocket() {
  if (ws && ws.reconnectTimer) {//防止多个websocket同时执行
    clearTimeout(ws.reconnectTimer)
    ws.reconnectTimer = null
  }
  startWebSocket();
}

function startWebSocket() {
  ws = new WebSocketPlus('ws://localhost:8080?name=merlin');
  ws.init({//time：心跳时间间隔 timeout：心跳超时间隔 reconnect：断线重连时
    time: 10 * 1000,
    timeout: 3 * 1000,
    reconnect: 10 * 1000
  }, true)
}

eventBus.on('changeState', setButtonState); // 设置按钮样式
eventBus.on('reconnect', reconnectWebSocket); // 接收重连消息
connect.addEventListener('click', reconnectWebSocket)
sendMessage.addEventListener('click', function (e) {
  ws.sendMsg('message', 'hello');
})
destroy.addEventListener('click', function (e) {
  ws.close();
  clearTimeout(ws.reconnectTimer);
  ws = null;
})
