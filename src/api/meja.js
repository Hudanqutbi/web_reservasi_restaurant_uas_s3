import express from "express";
import db from "../db/index.js";

const router = express.Router();

// GET /api/meja/tersedia?tanggal=2026-11-01&jam_mulai=18:00&jam_selesai=20:00&jumlah_orang=4
router.get("/tersedia", async (req, res) => {
  try {
    const { tanggal, jam_mulai, jam_selesai, jumlah_orang, jenis_meja } = req.query;
    if (!tanggal || !jam_mulai || !jam_selesai || !jumlah_orang) {
      return res.status(400).json({ berhasil: false, pesan: "Tanggal, jam mulai, jam selesai, dan jumlah orang wajib diisi" });
    }
    const jumlah = Number(jumlah_orang);
    if (!Number.isInteger(jumlah) || jumlah < 1 || jam_selesai <= jam_mulai) {
      return res.status(400).json({ berhasil: false, pesan: "Jumlah orang atau rentang waktu tidak valid" });
    }

    const params = [jumlah, jumlah, tanggal, jam_selesai, jam_mulai];
    let filterJenis = "";
    if (jenis_meja) {
      const jenisValid = ["Indoor", "Outdoor", "Bar Table", "VIP"];
      if (!jenisValid.includes(jenis_meja)) {
        return res.status(400).json({ berhasil: false, pesan: "Jenis meja tidak valid" });
      }
      filterJenis = " AND m.jenis_meja = ?";
      params.push(jenis_meja);
    }

    const [rows] = await db.query(`
      SELECT m.id_meja, m.nomor_meja, m.jenis_meja, m.kapasitas_min, m.kapasitas_max
      FROM meja m
      WHERE m.status_aktif = TRUE
        AND m.kapasitas_min <= ?
        AND m.kapasitas_max >= ?
        AND NOT EXISTS (
          SELECT 1 FROM reservasi r
          WHERE r.id_meja = m.id_meja
            AND r.tanggal = ?
            AND r.jam_mulai < ?
            AND r.jam_selesai > ?
            AND r.status <> 'dibatalkan'
        )
        ${filterJenis}
      ORDER BY m.kapasitas_max ASC, m.nomor_meja ASC
    `, params);

    res.json({ berhasil: true, jumlah: rows.length, data: rows });
  } catch (error) {
    console.error("GET meja tersedia:", error);
    res.status(500).json({ berhasil: false, pesan: "Gagal memeriksa ketersediaan meja" });
  }
});

// GET /api/meja - daftar semua meja aktif
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id_meja, nomor_meja, jenis_meja, kapasitas_min, kapasitas_max
      FROM meja WHERE status_aktif = TRUE ORDER BY id_meja
    `);
    res.json({ berhasil: true, jumlah: rows.length, data: rows });
  } catch (error) {
    console.error("GET meja:", error);
    res.status(500).json({ berhasil: false, pesan: "Gagal mengambil data meja" });
  }
});

export default router;
