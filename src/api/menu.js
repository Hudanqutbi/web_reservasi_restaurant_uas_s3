import express from "express";
import db from "../db/index.js";

const router = express.Router();

// GET /api/menu - daftar menu yang tersedia
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id_menu, kode_menu, nama_menu, kategori, harga, deskripsi, gambar
      FROM menu
      WHERE status_tersedia = TRUE
      ORDER BY kategori, nama_menu
    `);
    res.json({ berhasil: true, jumlah: rows.length, data: rows });
  } catch (error) {
    console.error("GET menu:", error);
    res.status(500).json({ berhasil: false, pesan: "Gagal mengambil data menu" });
  }
});

export default router;
