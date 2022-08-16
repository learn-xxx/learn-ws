function encodeDataFrame(config) {
  const bufArr = [];
  const firstByte = Buffer.alloc(1);
  const secondByte = Buffer.alloc(1);
  bufArr.push(firstByte, secondByte);
  // 往第一个字节写入数据：FIN + rsv1 + rsv2 + rsv3 + opcode
  firstByte.writeUInt8((config.fin << 7) + (config.rsv << 4) + config.opcode);
  // mask + payloadLen
  // 获取要发送的消息体长度
  const payloadLen = config.payloadBuffer.length;
  if (payloadLen > 125) {
    if (payloadLen > 65535) {
      // 2 ^ 7 - 1 = 127 : 01111111 通过最后一位来判断用多少字节存储数据
      // 消息体长度大于65535，需要用8字节表示
      secondByte.writeUInt8((config.mask << 7) + 127); // 头部第二个字节
      const lenByte = Buffer.alloc(8);
      lenByte.writeUInt32BE(0) // 因为4个字节可表示的消息体长度已经达到2^32次, 所以前四个字节设为0, 
      lenByte.writeUInt32BE(payloadLen.length, 4);
      bufArr.push(lenByte);
    } else {
      // 2 ^ 7 - 2 = 126 : 01111110 通过最后一位来判断用多少字节存储数据
      // 消息体长度小于65535，需要用2字节表示
      secondByte.writeUInt8((config.mask << 7) + 126); // 头部第二个字节
      const lenByte = Buffer.alloc(2);
      lenByte.writeUInt16BE(payloadLen.length);
      bufArr.push(lenByte)
    }
  } else {
    // 消息体长度小于125，需要用1字节表示
    secondByte.writeUInt8((config.mask << 7) + payloadLen); // 头部第二个字节
  }
  // 服务器消息不需要掩码
  // payloadData
  bufArr.push(config.payloadBuffer);
  return Buffer.concat(bufArr);
}

// 当读取socket的数据不足以解析成一个完整的消息时, 存到cacheData, 等待下一次读取socket数据
let cacheData = [];
function decodeDataFrame(socket, data) {
  if (cacheData.length > 0) {
    data = Buffer.concat([cacheData, data]);
    cacheData = [];
  }
  // 数据长度不足以继续解析, 缓存数据
  // 一个Socket数据帧至少2个字节
  if (data.length < 2) {
    cacheData = data;
    return;
  }
  let index = 0;
  const firstByte = data.readUInt8(index++);
  const secondByte = data.readUInt8(index++);
  const frame = {
    fin: (firstByte >> 7),
    rsv: (firstByte >> 4) & 0x7,
    opcode: firstByte & 0xf,
    mask: (secondByte >> 7),
    payloadLen: secondByte & 0x7f, // & 01111111
    maskingKey: null,
  }
  if (frame.payloadLen >= 126) {
    // payloadLen等于126，说明后2个字节存储数据长度
    if (frame.payloadLen === 126) {
      // 数据长度不足以继续解析, 缓存数据
      if (data.length < index + 2) {
        cacheData = data;
        return;
      }
      // 使用大端读取方式, 因为TCP数据传输使用的就是大端字节序(网络字节序)
      frame.payloadLen = data.readUInt16BE(index);
      index += 2;
    }
    // payloadLen等于127，说明后8个字节存储数据长度
    if (frame.payloadLen === 127) {
      if (data.length < index + 8) {
        cacheData = data;
        return;
      }
      // 一般情况下, 数据长度不会超过2^32次，所以只读后四个字节即可
      data.readUInt32BE(index);
      index += 4;
      frame.payloadLen = data.readUInt32BE(index);
      index += 4;
    }
  }
  if (frame.mask) {
    // 数据长度不足以继续解析, 缓存数据
    // 4 为掩码数据对应的字节数.
    if (data.length < index + 4 + frame.payloadLen) {
      cacheData = data;
      return;
    }
    const parsedBytes = [];
    // 获取掩码数据
    const maskByte = [data[index++], data[index++], data[index++], data[index++]];
    // 解析数据
    for (let i = 0; i < frame.payloadLen; i++) {
      parsedBytes.push(data[index++] ^ maskByte[i % 4]);
    }
    // 解析完成, 合成数据
    frame.payloadBuffer = Buffer.from(parsedBytes);
  } else {
    // 数据长度不足以继续解析, 缓存数据
    if (data.length < index + frame.payloadLen) {
      cacheData = data;
      return;
    }
    // 截取数据
    frame.payloadBuffer = data.subarray(index, index + frame.payloadLen);
    // 如果还有多余的数据, 继续解析
    if (data.length - index - frame.payloadLen > 0) {
      return Buffer.concat([frame.payloadBuffer, decodeDataFrame(socket, data.subarray(index + frame.payloadLen))]);
    }
  }
  return frame.payloadBuffer;
}

module.exports = {
  encodeDataFrame,
  decodeDataFrame,
}
