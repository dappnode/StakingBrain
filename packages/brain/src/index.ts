import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors());
app.use(express.json());

app.get("*", (req, res) => {
  console.log("request received");
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

app.listen(80, () => {
  console.log("server started on port 80");
});
