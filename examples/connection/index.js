const net = require('net');
const crypto = require('crypto');

var wsGUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

const server = net.createServer(socket => {
  // 说明TCP连接已建立
  console.log('tcp client connected');
  socket.on('data', data => {
    const dataString = data.toString();
    // 匹配Sec-WebSocket-Key字段，判断是否是websocket请求
    const key = getWebSocketKey(dataString);
    if (key) {
      console.log('dataString:', dataString)
      const acceptKey = genAcceptKey(key);
      socket.write('HTTP/1.1 101 Switching Protocols\r\n');
      socket.write('Upgrade: websocket\r\n');
      socket.write('Connection: Upgrade\r\n');
      socket.write('Sec-WebSocket-Accept: ' + acceptKey + '\r\n');
      // ws协议中规定需要以空行结尾，才能使协议转化
      socket.write('\r\n');
    }
  });

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
