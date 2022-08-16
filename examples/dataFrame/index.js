const net = require('net');
const crypto = require('crypto');
const { encodeDataFrame, decodeDataFrame } = require('./handleFrame');

var wsGUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

const server = net.createServer(socket => {
  // 说明TCP连接已建立
  console.log('tcp client connected');
  socket.on('data', data => {
    const dataString = data.toString();
    // 匹配Sec-WebSocket-Key字段，判断是否是websocket协议转化的握手包
    const key = getWebSocketKey(dataString);
    if (key) {
      console.log('ws转化协议包内容:\n', dataString)
      const acceptKey = genAcceptKey(key);
      socket.write('HTTP/1.1 101 Switching Protocols\r\n');
      socket.write('Upgrade: websocket\r\n');
      socket.write('Connection: Upgrade\r\n');
      socket.write('Sec-WebSocket-Accept: ' + acceptKey + '\r\n');
      // ws协议中规定需要以空行结尾，才能使协议转化
      socket.write('\r\n');
    } else {
      const res = decodeDataFrame(socket, data); // 解码数据
      socket.emit('message', res);
    }
  });

  socket.on('message', (msg) => {
    console.info('收到客户端的信息：', msg.toString());
    // 给客户端发送消息
    socket.write(encodeDataFrame({
      fin: 1, // 用来标识这是消息的最后一段, 一个消息可能分成多段发送
      rsv: 0,  // 默认是0, 用来设置自定义协议, 设置的话双方都必须实现
      opcode: 1, // 操作码, 用来描述该段消息
      mask: 0, // 标识是否需要根据掩码做混淆息计算, 如果为1, 那么会有4个字节存储掩码, 服务器向客户端发送数据不用做混淆运算
      payloadBuffer: msg // 消息的内容
    }))
  })

  socket.on('end', () => {
    console.log('client disconnected');
  })
})

server.listen(8080, () => {
  console.log('start in: localhost:8080')
});


function getWebSocketKey(dataString) {
  const match = dataString.match(/Sec\-WebSocket\-Key:\s(.+)\r\n/);
  if (match) {
    return match[1];
  }
  return null;
}

function genAcceptKey(webSocketKey) {
  return crypto.createHash('sha1').update(webSocketKey + wsGUID).digest('base64');
}
