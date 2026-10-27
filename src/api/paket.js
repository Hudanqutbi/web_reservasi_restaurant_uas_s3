import express from "express";
import db from "../db/index.js";

const router = express.Router();

// GET /api/paket - daftar paket aktif beserta menu di dalamnya
router.get("/", async (req, res) => {
  try {
    const [paket] = await db.query(`
      SELECT id_bundle, kode_bundle, nama_bundle, deskripsi, harga_normal, harga_bundle
      FROM bundle WHERE status_tersedia = TRUE ORDER BY harga_bundle ASC
    `);
    const [isi] = await db.query(`
      SELECT dbu.id_bundle, dbu.id_menu, dbu.jumlah, m.nama_menu, m.kategori
      FROM detail_bundle dbu JOIN menu m ON m.id_menu = dbu.id_menu
      JOIN bundle b ON b.id_bundle = dbu.id_bundle
      WHERE b.status_tersedia = TRUE AND m.status_tersedia = TRUE
      ORDER BY dbu.id_bundle, m.nama_menu
    `);
    const data = paket.map(p => ({
      ...p,
      isi: isi.filter(item => item.id_bundle === p.id_bundle)
    }));
    res.json({ berhasil: true, jumlah: data.length, data });
  } catch (error) {
    console.error("GET paket:", error);
    res.status(500).json({ berhasil: false, pesan: "Gagal mengambil data paket" });
  }
});

export default router;
