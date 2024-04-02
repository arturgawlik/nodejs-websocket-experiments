import { createReadStream } from "fs";
import { createServer } from "http";

createServer((req, res) => {
  if (req.url.includes("ws")) {
  } else {
    createReadStream(new URL("./index.html", import.meta.url)).pipe(res);
  }
}).listen(8000, () => console.log("running on http://localhost:8000"));
