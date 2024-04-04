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
 * @param {import("node:buffer").Buffer} data
 */
function decodeFrame(data) {
  const contentLength = readContentLength(data);
  console.log("content length: ", contentLength);
}

function readContentLength(data) {
  const dataView = new DataView(data.buffer);
  // read two bytes that contains length
  const twoBytes = dataView.getUint16(0, true);
  // shift right by 8 to position bits 9-15 as bits 1-7 of the resulting number
  const shifted = twoBytes >> 8;
  // extract bits 1-7, which are originally bits 9-15
  let extractedLength = shifted & 0x7f; // 01111111

  if (extractedLength > 125) {
    // need's to read more
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
