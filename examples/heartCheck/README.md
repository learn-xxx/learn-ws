# 心跳机制与断开重连

## 心跳机制

- 心跳机制：顾名思义，就是客户端每隔一段时间向服务端发送一个特有的心跳消息，每次服务端收到消息后只需将消息返回，此时，若二者还保持连接，则客户端就会收到消息，若没收到，则说明连接断开，此时，客户端就要主动重连，完成一个周期
- 心跳的实现也很简单，只需在第一次连接时用回调函数做延时处理，此时还需要设置一个心跳超时时间，若某时间段内客户端发送了消息，而服务端未返回，则认定为断线。

## 心跳配置

- time：心跳时间间隔，每隔一个间隔就发起一次心跳进行检验。
- timeout：心跳超时间隔，如果超时了服务端还没返回心跳响应信息，则认定为断线。
- reconnect：断线重连时间，n秒后开启重新连接。

核心代码:
```js
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
```
