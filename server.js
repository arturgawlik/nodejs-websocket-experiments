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
  socket.write("\r\n");

  socket.on("data", (data) => {
    decodeFrame(data);
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
  const contentLength = readContentLength(data);
  console.log("content length: ", contentLength);
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
  // 10000101
  // 01111111
  // 00000101

  if (extractedLength === 126) {
    // need's to read more
    const secondThridForthByte = dataView.getUint32(1);
    extractedLength = secondThridForthByte & 0b11111111111111110000000;
    extractedLength = secondThridForthByte >> 7;
  }

  return extractedLength;
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
