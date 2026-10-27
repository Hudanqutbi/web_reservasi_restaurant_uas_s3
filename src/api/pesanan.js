import express from "express";
import db from "../db/index.js";
import { randomUUID } from "node:crypto";

const router = express.Router();

// POST /api/pesanan
// Body: { id_reservasi, items: [{ id_menu, jumlah }] } OR [{ id_bundle, jumlah }]
// Harga dan diskon selalu dihitung di backend, bukan mempercayai harga dari browser.
router.post("/", async (req, res) => {
  const id_reservasi = Number(req.body.id_reservasi);
  const items = req.body.items;
  if (!Number.isInteger(id_reservasi) || id_reservasi < 1 || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ berhasil: false, pesan: "ID reservasi dan minimal satu item pesanan wajib diisi" });
  }
  for (const item of items) {
    const hasMenu = item.id_menu !== undefined && item.id_menu !== null;
    const hasBundle = item.id_bundle !== undefined && item.id_bundle !== null;
    if (hasMenu === hasBundle || !Number.isInteger(Number(item.jumlah)) || Number(item.jumlah) < 1) {
      return res.status(400).json({ berhasil: false, pesan: "Setiap item harus memiliki salah satu id_menu atau id_bundle dan jumlah minimal 1" });
    }
  }

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();
    const [reservasiRows] = await conn.query(
      "SELECT id_reservasi, jumlah_orang, status FROM reservasi WHERE id_reservasi = ? FOR UPDATE",
      [id_reservasi]
    );
    if (!reservasiRows.length) {
      await conn.rollback();
      return res.status(404).json({ berhasil: false, pesan: "Reservasi tidak ditemukan" });
    }
    const reservasi = reservasiRows[0];
    if (reservasi.status === "dibatalkan") {
      await conn.rollback();
      return res.status(400).json({ berhasil: false, pesan: "Reservasi yang dibatalkan tidak dapat dipesankan" });
    }
    const [existing] = await conn.query("SELECT id_pesanan FROM pesanan WHERE id_reservasi = ?", [id_reservasi]);
    if (existing.length) {
      await conn.rollback();
      return res.status(409).json({ berhasil: false, pesan: "Pesanan untuk reservasi ini sudah dibuat" });
    }

    let subtotal = 0;
    const detail = [];
    for (const item of items) {
      const jumlah = Number(item.jumlah);
      if (item.id_menu !== undefined && item.id_menu !== null) {
        const [rows] = await conn.query(
          "SELECT id_menu, nama_menu, harga FROM menu WHERE id_menu = ? AND status_tersedia = TRUE",
          [Number(item.id_menu)]
        );
        if (!rows.length) throw Object.assign(new Error(`Menu id ${item.id_menu} tidak ditemukan/tersedia`), { statusCode: 400 });
        const harga = Number(rows[0].harga);
        const subtotal_item = harga * jumlah;
        subtotal += subtotal_item;
        detail.push({ id_menu: rows[0].id_menu, id_bundle: null, jumlah, harga_satuan: harga, subtotal_item });
      } else {
        const [rows] = await conn.query(
          "SELECT id_bundle, nama_bundle, harga_bundle FROM bundle WHERE id_bundle = ? AND status_tersedia = TRUE",
          [Number(item.id_bundle)]
        );
        if (!rows.length) throw Object.assign(new Error(`Paket id ${item.id_bundle} tidak ditemukan/tersedia`), { statusCode: 400 });
        const harga = Number(rows[0].harga_bundle);
        const subtotal_item = harga * jumlah;
        subtotal += subtotal_item;
        detail.push({ id_menu: null, id_bundle: rows[0].id_bundle, jumlah, harga_satuan: harga, subtotal_item });
      }
    }

    const [diskonRows] = await conn.query(`
      SELECT id_diskon, nama_diskon, persentase_diskon
      FROM diskon WHERE status_aktif = TRUE AND minimal_orang <= ?
      ORDER BY minimal_orang DESC LIMIT 1
    `, [reservasi.jumlah_orang]);
    const diskon = diskonRows[0] ?? null;
    const persentase = diskon ? Number(diskon.persentase_diskon) : 0;
    const nominal_diskon = Math.round(subtotal * persentase / 100);
    const total_harga = Math.max(0, subtotal - nominal_diskon);
    const kode_pesanan = `ORD-${randomUUID().slice(0, 8).toUpperCase()}`;

    const [orderResult] = await conn.query(`
      INSERT INTO pesanan (kode_pesanan, id_reservasi, subtotal, id_diskon, nominal_diskon, total_harga)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [kode_pesanan, id_reservasi, subtotal, diskon?.id_diskon ?? null, nominal_diskon, total_harga]);

    for (const d of detail) {
      await conn.query(`
        INSERT INTO detail_pesanan (id_pesanan, id_menu, id_bundle, jumlah, harga_satuan, subtotal_item)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [orderResult.insertId, d.id_menu, d.id_bundle, d.jumlah, d.harga_satuan, d.subtotal_item]);
    }

    await conn.commit();
    res.status(201).json({
      berhasil: true,
      pesan: "Pesanan berhasil dibuat",
      data: { id_pesanan: orderResult.insertId, kode_pesanan, id_reservasi, subtotal, diskon: persentase, nama_diskon: diskon?.nama_diskon ?? null, nominal_diskon, total_harga, items: detail }
    });
  } catch (error) {
    if (conn) await conn.rollback();
    if (error.statusCode) return res.status(error.statusCode).json({ berhasil: false, pesan: error.message });
    console.error("POST pesanan:", error);
    res.status(500).json({ berhasil: false, pesan: "Gagal menyimpan pesanan" });
  } finally {
    if (conn) conn.release();
  }
});

// GET /api/pesanan/:id - detail pesanan beserta item
router.get("/:id", async (req, res) => {
  try {
    const [orders] = await db.query(`
      SELECT p.id_pesanan, p.kode_pesanan, p.id_reservasi, p.subtotal,
             p.nominal_diskon, p.total_harga, p.status, d.nama_diskon, d.persentase_diskon
      FROM pesanan p LEFT JOIN diskon d ON d.id_diskon = p.id_diskon
      WHERE p.id_pesanan = ?
    `, [req.params.id]);
    if (!orders.length) return res.status(404).json({ berhasil: false, pesan: "Pesanan tidak ditemukan" });
    const [items] = await db.query(`
      SELECT dp.id_detail_pesanan, dp.id_menu, dp.id_bundle, dp.jumlah,
             dp.harga_satuan, dp.subtotal_item, m.nama_menu, b.nama_bundle
      FROM detail_pesanan dp
      LEFT JOIN menu m ON m.id_menu = dp.id_menu
      LEFT JOIN bundle b ON b.id_bundle = dp.id_bundle
      WHERE dp.id_pesanan = ? ORDER BY dp.id_detail_pesanan
    `, [req.params.id]);
    res.json({ berhasil: true, data: { ...orders[0], items } });
  } catch (error) {
    console.error("GET pesanan:", error);
    res.status(500).json({ berhasil: false, pesan: "Gagal mengambil detail pesanan" });
  }
});

export default router;
