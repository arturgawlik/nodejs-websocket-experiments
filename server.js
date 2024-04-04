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
});

httpServer.listen(80, () => {
  console.log("running on http://localhost:80");
});

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
