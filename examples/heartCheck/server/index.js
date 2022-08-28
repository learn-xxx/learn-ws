const WebSocket = require('ws');
const port = 8080;
const server = require('http').createServer()

class WebSocketServer extends WebSocket.Server {
  constructor(...args) {
    super(...args);
    this.webSocketClients = {};
  }
  set ws(val) {
    this._ws = val;
    val.agency = this;
    let that = this;
    val.on('error', function (e) {
      console.info(val['name'] + '客户端出错');
      that.removeClient(this);
    });
    val.on('close', function (e) {
      console.info(val['name'] + '客户端已断开');
      that.removeClient(this);
    });
    val.on('message', this.handleMessage);
  }
  get ws() {
    return this._ws;
  }
  handleMessage(e) {
    console.log('接受到信息:', e.toString());
    const { type } = JSON.parse(e.toString());
    if (type === 'heart') {
      this.send(e.toString())
    }
  }
  addClient(client) {
    if (this.webSocketClients[client['name']]) {
      console.log(client['name'] + '客户端已存在，将关闭存在的连接');
      // 关闭原来的连接
      this.webSocketClients[client['name']].close();
    }
    this.webSocketClients[client['name']] = client;
    console.log(client['name'] + '客户端已添加')
  }
  removeClient(client) {
    if (!this.webSocketClients[client['name']]) {
      console.log(client['name'] + '客户端不存在');
      return;
    }
    this.webSocketClients[client['name']] = null;
    console.log(client['name'] + '客户端已移除');
  }
}

const webSocketServer = new WebSocketServer({ noServer: true });
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const name = url.searchParams.get('name') //获取连接标识
  if (!name) {
    socket.destroy();
    return;
  }
  webSocketServer.handleUpgrade(req, socket, head, function (ws) {
    ws.name = name;
    webSocketServer.addClient(ws);
    // 设置当前实例
    webSocketServer.ws = ws;
  })
})

server.listen(port, () => {
  console.log('服务开启')
})
