import { createServer } from "http";
import { join } from "path";
import { readFileSync } from "fs";

const app = createServer((req, res) => {
  if (req.url === "/") {
    const path = join(__dirname, "dist", req.url);
    const content = readFileSync(path);
    res.end(content);
  }
});
