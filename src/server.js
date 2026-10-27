import express from "express";
import router from "./routers/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();

app.use(express.json());

app.get("/api/cek-server", (req, res) => {
    res.json({ pesan: "SERVER BARU BERJALAN" });
});

app.use("/api", router);

app.use("/api", (req, res) => {
    res.status(404).json({ pesan: "Endpoint API tidak ditemukan" });
});


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.resolve(__dirname, "../public");

app.use(express.static(publicPath));

app.get("/", (req, res) => {
    res.sendFile(path.join(publicPath, "index.html"));
});

app.listen(3000, () => {
    console.log("Server aktif di port 3000");
});