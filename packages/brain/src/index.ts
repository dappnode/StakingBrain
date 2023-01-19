import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { Tag } from "@stakingbrain/common";

const a: Tag = "obol";

const mode = process.env.NODE_ENV || "development";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
console.log(`Running app in mode: ${mode}`);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve(__dirname, "build")));
app.get("*", (req, res) => {
  console.log("request received");
  console.log(__dirname);
  res.sendFile(path.join(__dirname, "build", "index.html"));
});
app.listen(80, () => {
  console.log("server started on port 80");
});
