import eventBus from './util/eventBus.js'

export default class WebSocketPlus extends WebSocket {
  constructor(...args) {
    super(...args);
  }
  init(heartConfig = {}, isReconnect = true) {
    this.onopen = this.handleOpen
    this.onmessage = this.handleMessage;
    this.onerror = this.handleError;
    this.onclose = this.handleClose;
    this.heartConfig = heartConfig;
    this.isReconnect = isReconnect;
    this.reconnectTimer = null;
    this.webSocketState = false;
  }

  sendMsg(type, msg) {
    const data = JSON.stringify({
      type, msg
    });
    this.send(data)
  }

  handleOpen() {
    eventBus.emit('changeState', 'open')//触发事件改变按钮样式
    this.webSocketState = true;
    this.heartConfig && this.heartConfig.time ? this.heartStart(this.heartConfig.time) : ''
    console.log('websocket已连接')
  }
  handleMessage(e) {
    const data = JSON.parse(e.data);
    switch (data.type) {
      case 'message'://普通消息
        console.log('收到消息' + data.msg)
        break;
      case 'heart'://心跳
        this.webSocketState = true
        console.log('收到心跳响应' + data.msg)
        break;
    }
  }
  handleError(e) {
    eventBus.emit('changeState', 'close'); // 触发事件改变按钮样式
    this.webSocketState = false; // socket状态设置为断线
    this.reconnectWebSocket(); // 重连
    console.log('发生错误：', e);
  }
  handleClose() {
    eventBus.emit('changeState', 'close'); // 触发事件改变按钮样式
    this.webSocketState = false; // socket状态设置为断线
    console.log('连接已关闭');
  }

  heartStart() {
    setTimeout(() => {
      this.sendMsg('heart', new Date());
      // 等待服务器响应
      this.waitingServer()
    }, this.handleClose.time)
  }
  waitingServer() {
    this.webSocketState = false
    setTimeout(() => {
      if (this.webSocketState) {
        this.heartStart(this.heartConfig.time)
        return
      }
      console.log('心跳无响应，已断线')
      try {
        this.close();
      } catch (e) {
        console.log('连接已关闭，无需关闭')
      }
      this.reconnectWebSocket()
    }, this.heartConfig.timeout)
  }
  reconnectWebSocket() {
    if (!this.isReconnect) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      eventBus.emit('reconnect')
    }, this.heartConfig.reconnect)
  }
}
