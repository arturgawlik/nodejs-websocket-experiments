import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { createHash } from "node:crypto";

createServer((req, res) => {
  if (req.url.includes("ws")) {
    // handle web socket connection request
    console.log(req.headers);

    // handshake
    res.writeHead(101, {
      upgrade: "websocket",
      connection: "upgrade",
      "sec-websocket-accept": calcSecWebscoketAccept(
        req.headers["sec-websocket-key"]
      ),
    });
  } else {
    // for other requrests simple return index.html
    createReadStream(new URL("./index.html", import.meta.url)).pipe(res);
  }
}).listen(8000, () => console.log("running on http://localhost:8000"));

/**
 * @param {string} secWebsocketKey
 */
function calcSecWebscoketAccept(secWebsocketKey) {
  if (!secWebsocketKey) {
    throw new Error("secWebsocketKey is falsy.");
  }
  const magicString = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
  const shaSum = createHash("sha1");
  shaSum.update(secWebsocketKey + magicString);
  return shaSum.digest("base64");
}
