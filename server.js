import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { createServer } from "node:http";

const httpServer = createServer((req, res) => {
  createReadStream(new URL("./index.html", import.meta.url)).pipe(res);
});

httpServer.on("upgrade", (req, socket, head) => {
  socket.write("HTTP/1.1 101 Switching Protocols\r\n");
  socket.write("Upgrade: websocket\r\n");
  socket.write("Connection: Upgrade\r\n");
  socket.write(
    `Sec-WebSocket-Accept: ${calcSecWebsocketAccept(
      req.headers["sec-websocket-key"]
    )}\r\n`
  );
  // head need's to end with double new line
  socket.write("\r\n");

  socket.on("data", (data) => {
    const message = decodeFrame(data);
    console.log(message);
  });
});

httpServer.listen(80, () => {
  console.log("running on http://localhost:80");
});

/**
 * Decodes frame
 * @param {import("node:buffer").Buffer} data is ArrayBuffer in a Network (Unix) byte order, which means BigEndian notation (most significat byte first).
 */
function decodeFrame(data) {
  const { byteOffsetForNextReads, extractedLength } = readContentLength(data);
  const maskBit = readMaskBit(data);
  if (maskBit) {
    const maskKey = readMaskKey(data, byteOffsetForNextReads);
    const encodedPayload = readEncodedPayload(
      data,
      extractedLength,
      byteOffsetForNextReads + 4
    );

    // Perform an XOR on the mask
    const decodedPayload = Uint8Array.from(
      encodedPayload,
      (elt, i) => elt ^ maskKey[i % 4]
    );
    const textEncoder = new TextDecoder();
    return textEncoder.decode(decodedPayload);
  }
  // console.log("data: ", data);
}

/**
 * Decodes payload from frame
 * @param {import("node:buffer").Buffer} data
 */
function readEncodedPayload(data, length, byteOffset) {
  // mask bit is encoded in 8 bit
  const dataView = new DataView(data.buffer);
  const encodedPayload = [];
  for (let index = 0; index < length; index++) {
    encodedPayload.push(dataView.getUint8(byteOffset + index));
  }

  return encodedPayload;
}

/**
 * Decodes mask key from frame
 * @param {import("node:buffer").Buffer} data
 */
function readMaskKey(data, byteOffset) {
  const dataView = new DataView(data.buffer);
  // const maskKey = dataView.getUint32(12);
  const maskKey = [];
  for (let index = 0; index < 4; index++) {
    maskKey.push(dataView.getUint8(byteOffset + index));
  }

  return maskKey;
}

/**
 * Decodes mask bit from frame
 * @param {import("node:buffer").Buffer} data
 */
function readMaskBit(data) {
  // mask bit is encoded in 8 bit
  const dataView = new DataView(data.buffer);
  const maskBit = dataView.getUint8(1) & 0b00000001;
  return maskBit;
}

/**
 * Decodes content length from frame
 * @param {import("node:buffer").Buffer} data
 */
function readContentLength(data) {
  const dataView = new DataView(data.buffer);
  // get second byte
  // because we need to read length from 9-15 bits
  // which is in second byte
  const secondByte = dataView.getUint8(1);
  // extract bits 1-7, which are originally bits 9-15
  let extractedLength = secondByte & 0b01111111;
  let byteOffsetForNextReads = 2;
  if (extractedLength === 126) {
    // for this case need to read 16-31 bits
    extractedLength = dataView.getUint16(2);
    byteOffsetForNextReads = 4; // TODO: probablly wrong
  } else if (extractedLength === 127) {
    // for this case need to read 12-63 bits
    extractedLength = dataView.getBigUint64(4);
    byteOffsetForNextReads = 6; // TODO: probablly wrong
  }

  return { extractedLength, byteOffsetForNextReads };
}

/**
 * Calculates value for Sec-WebSocket-Accept handshake response header
 * @param {string} secWebsocketKey
 */
function calcSecWebsocketAccept(secWebsocketKey) {
  if (!secWebsocketKey) {
    throw new Error("secWebsocketKey is falsy.");
  }
  const magicString = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
  return createHash("sha1")
    .update(secWebsocketKey + magicString)
    .digest("base64");
}
