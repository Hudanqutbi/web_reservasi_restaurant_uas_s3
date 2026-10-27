import express from "express";
import db from "../db/index.js";

import menuRouter from "../api/menu.js";
import mejaRouter from "../api/meja.js";
import pelangganRouter from "../api/pelanggan.js";
import reservasiRouter from "../api/reservasi.js";
import paketRouter from "../api/paket.js";
import pesananRouter from "../api/pesanan.js";

const router = express.Router();

// ========================================
// 1. TES KONEKSI DATABASE
// ========================================
router.get("/test-db", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT 1 AS koneksi");

        res.json({
            berhasil: true,
            pesan: "Backend berhasil terhubung ke MySQL",
            data: rows
        });
    } catch (error) {
        console.error("Database error:", error.message);

        res.status(500).json({
            berhasil: false,
            pesan: "Koneksi database gagal"
        });
    }
});

// ========================================
// 2. TES ROUTER
// ========================================
router.get("/cek-router", (req, res) => {
    res.json({
        berhasil: true,
        pesan: "Router terbaru berhasil dijalankan"
    });
});

// ========================================
// 3. MENGHUBUNGKAN API
// ========================================
router.use("/menu", menuRouter);
router.use("/meja", mejaRouter);
router.use("/pelanggan", pelangganRouter);
router.use("/reservasi", reservasiRouter);
router.use("/paket", paketRouter);
router.use("/pesanan", pesananRouter);

// ========================================
// 4. DAFTAR TABEL YANG DIIZINKAN
// ========================================
const tabelDiizinkan = [
    "pelanggan",
    "meja",
    "reservasi",
    "menu",
    "bundle",
    "detail_bundle",
    "diskon",
    "pesanan",
    "detail_pesanan"
];

// Memeriksa kolom dan primary key tabel
async function infoTabel(namaTabel) {
    if (!tabelDiizinkan.includes(namaTabel)) {
        throw new Error("Tabel tidak diizinkan");
    }

    const [kolom] = await db.query(
        `SHOW COLUMNS FROM \`${namaTabel}\``
    );

    const primaryKey = kolom.find(
        (item) => item.Key === "PRI"
    );

    return {
        kolom: kolom.map((item) => item.Field),
        primaryKey: primaryKey?.Field
    };
}

// ========================================
// 5. GET: MENGAMBIL SEMUA DATA
// ========================================
router.get("/data/:tabel", async (req, res) => {
    try {
        const { tabel } = req.params;

        await infoTabel(tabel);

        const [data] = await db.query(
            `SELECT * FROM \`${tabel}\``
        );

        res.json({
            berhasil: true,
            jumlah: data.length,
            data
        });
    } catch (error) {
        console.error("GET data:", error.message);

        res.status(400).json({
            berhasil: false,
            pesan: error.message
        });
    }
});

// ========================================
// 6. POST: MENAMBAHKAN DATA
// ========================================
router.post("/data/:tabel", async (req, res) => {
    try {
        const { tabel } = req.params;
        const { kolom, primaryKey } = await infoTabel(tabel);

        const data = Object.fromEntries(
            Object.entries(req.body).filter(([key]) =>
                kolom.includes(key)
            )
        );

        // Primary key AUTO_INCREMENT dibuat oleh MySQL
        if (primaryKey && !req.body[primaryKey]) {
            delete data[primaryKey];
        }

        const namaKolom = Object.keys(data);

        if (namaKolom.length === 0) {
            return res.status(400).json({
                berhasil: false,
                pesan: "Tidak ada kolom valid yang dikirim"
            });
        }

        const daftarKolom = namaKolom
            .map((key) => `\`${key}\``)
            .join(", ");

        const tandaTanya = namaKolom
            .map(() => "?")
            .join(", ");

        const [hasil] = await db.query(
            `INSERT INTO \`${tabel}\` (${daftarKolom})
             VALUES (${tandaTanya})`,
            namaKolom.map((key) => data[key])
        );

        res.status(201).json({
            berhasil: true,
            pesan: "Data berhasil ditambahkan",
            id: hasil.insertId
        });
    } catch (error) {
        console.error("POST data:", error.message);

        res.status(400).json({
            berhasil: false,
            pesan: error.message
        });
    }
});

// ========================================
// 7. GET: MENGAMBIL SATU DATA
// ========================================
router.get("/data/:tabel/:id", async (req, res) => {
    try {
        const { tabel, id } = req.params;
        const { primaryKey } = await infoTabel(tabel);

        if (!primaryKey) {
            return res.status(400).json({
                berhasil: false,
                pesan: "Primary key tidak ditemukan"
            });
        }

        const [data] = await db.query(
            `SELECT * FROM \`${tabel}\`
             WHERE \`${primaryKey}\` = ?`,
            [id]
        );

        if (data.length === 0) {
            return res.status(404).json({
                berhasil: false,
                pesan: "Data tidak ditemukan"
            });
        }

        res.json({
            berhasil: true,
            data: data[0]
        });
    } catch (error) {
        console.error("GET detail data:", error.message);

        res.status(400).json({
            berhasil: false,
            pesan: error.message
        });
    }
});

// ========================================
// 8. PUT: MENGUBAH DATA
// ========================================
router.put("/data/:tabel/:id", async (req, res) => {
    try {
        const { tabel, id } = req.params;
        const { kolom, primaryKey } = await infoTabel(tabel);

        if (!primaryKey) {
            return res.status(400).json({
                berhasil: false,
                pesan: "Primary key tidak ditemukan"
            });
        }

        const data = Object.fromEntries(
            Object.entries(req.body).filter(
                ([key]) =>
                    kolom.includes(key) &&
                    key !== primaryKey
            )
        );

        const namaKolom = Object.keys(data);

        if (namaKolom.length === 0) {
            return res.status(400).json({
                berhasil: false,
                pesan: "Tidak ada data valid untuk diubah"
            });
        }

        const setKolom = namaKolom
            .map((key) => `\`${key}\` = ?`)
            .join(", ");

        const [hasil] = await db.query(
            `UPDATE \`${tabel}\`
             SET ${setKolom}
             WHERE \`${primaryKey}\` = ?`,
            [...namaKolom.map((key) => data[key]), id]
        );

        res.json({
            berhasil: true,
            pesan: hasil.affectedRows
                ? "Data berhasil diubah"
                : "Data tidak berubah atau tidak ditemukan"
        });
    } catch (error) {
        console.error("PUT data:", error.message);

        res.status(400).json({
            berhasil: false,
            pesan: error.message
        });
    }
});

// ========================================
// 9. DELETE: MENGHAPUS DATA
// ========================================
router.delete("/data/:tabel/:id", async (req, res) => {
    try {
        const { tabel, id } = req.params;
        const { primaryKey } = await infoTabel(tabel);

        if (!primaryKey) {
            return res.status(400).json({
                berhasil: false,
                pesan: "Primary key tidak ditemukan"
            });
        }

        const [hasil] = await db.query(
            `DELETE FROM \`${tabel}\`
             WHERE \`${primaryKey}\` = ?`,
            [id]
        );

        res.json({
            berhasil: true,
            pesan: hasil.affectedRows
                ? "Data berhasil dihapus"
                : "Data tidak ditemukan"
        });
    } catch (error) {
        console.error("DELETE data:", error.message);

        res.status(400).json({
            berhasil: false,
            pesan: error.message
        });
    }
});

export default router;