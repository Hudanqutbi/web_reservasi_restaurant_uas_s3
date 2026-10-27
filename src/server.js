import express from "express";
import router from "./routers/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.resolve(__dirname, "../public");

app.use(express.json());
app.use("/api", router);

// Daftarkan route API sebelum static files.
// Route API dapat didaftarkan dari server.js sebelum middleware static ini.
app.use("/api", (req, res) => {
    res.status(404).json({
        pesan: "Endpoint API tidak ditemukan"
    });
});

// Sajikan file HTML, CSS, JS, gambar, dan aset lainnya
app.use(express.static(publicPath));

// URL utama menuju public/index.html
app.get("/", (req, res) => {
    res.sendFile(path.join(publicPath, "index.html"));
});

// Fallback untuk halaman non-API yang tidak ditemukan
app.use((req, res) => {
    res.status(404).send("Halaman tidak ditemukan");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT,"0.0.0.0", () => {
    console.log(`Server aktif di http://localhost:${PORT}`);
});