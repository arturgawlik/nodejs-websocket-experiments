import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { createServer } from "node:net";

// create tcp server
createServer((socket) => {
  const recivedDataChunks = [];

  socket.on("data", (data) => {
    recivedDataChunks.push(data.toString());
    const joinedChunks = recivedDataChunks.join();
    if (shouldParseHTTPHead(joinedChunks)) {
      const parsedHTTP = parseHTTP(joinedChunks);
      if (isWebsocketHandshakeRequest(parsedHTTP)) {
        // handle WS
        // handshake
        socket.write("HTTP/1.1 101 Switching Protocols\r\n");
        socket.write("Upgrade: WebSocket\r\n");
        socket.write("Connection: Upgrade\r\n");
        socket.write(
          `Sec-WebSocket-Accept: ${calcSecWebsocketAccept(
            parsedHTTP.headers["sec-websocket-key"]
          )}\r\n`
        );
        socket.write("\r\n");
      } else {
        // return index.html
        createReadStream(new URL("./index.html", import.meta.url)).pipe(socket);
      }
    }
  });
}).listen(80, () => {
  console.log("running on http://localhost:80");
});

/**
 * Checks is websocket request
 * @param {ReturnType<parseHTTP>} parsedHTTP
 */
function isWebsocketHandshakeRequest(parsedHTTP) {
  if (!parsedHTTP) {
    return false;
  }

  return !!parsedHTTP.headers["sec-websocket-key"];
}

/**
 * Checks that whole "head" was recived which is indicated by double new line
 * @param {string} data
 */
function shouldParseHTTPHead(data) {
  return data.includes("\r\n\r\n");
}

/**
 * Very naive http parser
 * @param {string} data
 */
function parseHTTP(data) {
  console.log(data);
  const result = {
    url: null,
    method: null,
    headers: {},
  };

  if (!data) {
    result;
  }

  const lines = data.split("\r\n");
  for (const line of lines) {
    if (line.includes(": ")) {
      // parse header
      const [name, value] = line.split(": ");
      result.headers[name.toLowerCase().trim()] = value.toLowerCase().trim();
    }
  }

  return result;
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
  return createHash("SHA1")
    .update(secWebsocketKey + magicString)
    .digest("base64");
}
