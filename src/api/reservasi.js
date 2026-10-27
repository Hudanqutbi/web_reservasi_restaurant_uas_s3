
import express from "express";
import db from "../db/index.js";
import { randomUUID } from "node:crypto";

const router = express.Router();

function tambahDuaJam(jam) {
  const [hh, mm, ss = "00"] = String(jam).split(":");
  const total = (Number(hh) * 60 + Number(mm) + 120) % (24 * 60);

  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(
    total % 60
  ).padStart(2, "0")}:${ss}`;
}

// POST /api/reservasi
router.post("/", async (req, res) => {
  const {
    id_pelanggan,
    id_meja,
    tanggal,
    jam_mulai,
    jumlah_orang,
    catatan = null,
    items = []
  } = req.body;

  const orang = Number(jumlah_orang);

  if (
    !id_pelanggan ||
    !id_meja ||
    !tanggal ||
    !jam_mulai ||
    !Number.isInteger(orang) ||
    orang < 1
  ) {
    return res.status(400).json({
      berhasil: false,
      pesan: "Data reservasi belum lengkap atau tidak valid."
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      berhasil: false,
      pesan: "Pilih minimal satu menu atau bundle."
    });
  }

  const jam_selesai = tambahDuaJam(jam_mulai);

  if (jam_selesai <= jam_mulai) {
    return res.status(400).json({
      berhasil: false,
      pesan: "Reservasi tidak boleh melewati tengah malam."
    });
  }

  let conn;

  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // 1. Periksa pelanggan
    const [pelanggan] = await conn.query(
      "SELECT id_pelanggan FROM pelanggan WHERE id_pelanggan = ?",
      [id_pelanggan]
    );

    if (!pelanggan.length) {
      throw new Error("Pelanggan tidak ditemukan. Silakan login kembali.");
    }

    // 2. Periksa meja
    const [mejaRows] = await conn.query(
      `SELECT id_meja, nomor_meja, jenis_meja, kapasitas_min, kapasitas_max
       FROM meja
       WHERE id_meja = ? AND status_aktif = TRUE
       FOR UPDATE`,
      [id_meja]
    );

    if (!mejaRows.length) {
      throw new Error("Meja tidak ditemukan atau tidak aktif.");
    }

    const meja = mejaRows[0];

    if (orang < meja.kapasitas_min || orang > meja.kapasitas_max) {
      throw new Error("Jumlah orang tidak sesuai kapasitas meja.");
    }

    // 3. Periksa bentrok jadwal
    const [bentrok] = await conn.query(
      `SELECT id_reservasi
       FROM reservasi
       WHERE id_meja = ?
         AND tanggal = ?
         AND jam_mulai < ?
         AND jam_selesai > ?
         AND status <> 'dibatalkan'
       FOR UPDATE`,
      [id_meja, tanggal, jam_selesai, jam_mulai]
    );

    if (bentrok.length) {
      throw new Error("Meja sudah dipesan pada jam tersebut.");
    }

    // 4. Ambil harga menu dan bundle langsung dari MySQL
    const rincian = [];

    for (const item of items) {
      const kode = String(item.code ?? "").trim();
      const jumlah = Number(item.qty);

      if (!kode || !Number.isInteger(jumlah) || jumlah < 1) {
        throw new Error("Kode atau jumlah item pesanan tidak valid.");
      }

      // Cari menu satuan
      const [menuRows] = await conn.query(
        `SELECT id_menu, harga
         FROM menu
         WHERE kode_menu = ? AND status_tersedia = TRUE`,
        [kode]
      );

      if (menuRows.length) {
        const menu = menuRows[0];
        const harga = Number(menu.harga);

        rincian.push({
          id_menu: menu.id_menu,
          id_bundle: null,
          jumlah,
          harga_satuan: harga,
          subtotal_item: harga * jumlah
        });

        continue;
      }

      // Jika bukan menu, cari bundle
      const [bundleRows] = await conn.query(
        `SELECT id_bundle, harga_bundle
         FROM bundle
         WHERE kode_bundle = ? AND status_tersedia = TRUE`,
        [kode]
      );

      if (!bundleRows.length) {
        throw new Error(
          `Item dengan kode "${kode}" tidak ditemukan pada tabel menu atau bundle.`
        );
      }

      const bundle = bundleRows[0];
      const harga = Number(bundle.harga_bundle);

      rincian.push({
        id_menu: null,
        id_bundle: bundle.id_bundle,
        jumlah,
        harga_satuan: harga,
        subtotal_item: harga * jumlah
      });
    }

    // 5. Hitung subtotal berdasarkan harga database
    // Harga bundle sudah menggunakan harga_bundle (harga setelah diskon paket).
    const subtotal = rincian.reduce(
      (total, item) => total + item.subtotal_item,
      0
    );

    // 6. Hitung diskon reservasi online berdasarkan aturan tabel diskon.
    // Jika struktur atau aturan diskon online berbeda, sesuaikan query ini.
    const [diskonRows] = await conn.query(
      `SELECT id_diskon, persentase_diskon
       FROM diskon
       WHERE status_aktif = TRUE
         AND minimal_orang <= ?
       ORDER BY minimal_orang DESC
       LIMIT 1`,
      [orang]
    );

    const diskonTerpilih = diskonRows[0] || null;
    const id_diskon = diskonTerpilih
      ? diskonTerpilih.id_diskon
      : null;

    const persenDiskon = diskonTerpilih
      ? Number(diskonTerpilih.persentase_diskon)
      : 0;

    const nominal_diskon = Math.round(
      subtotal * persenDiskon / 100
    );

    const total_harga = subtotal - nominal_diskon;

    // 7. Simpan reservasi
    const kode_reservasi =
      `RSV-${randomUUID().slice(0, 8).toUpperCase()}`;

    const [hasilReservasi] = await conn.query(
      `INSERT INTO reservasi
       (kode_reservasi, id_pelanggan, id_meja, tanggal,
        jam_mulai, jam_selesai, jumlah_orang, catatan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        kode_reservasi,
        id_pelanggan,
        id_meja,
        tanggal,
        jam_mulai,
        jam_selesai,
        orang,
        catatan
      ]
    );

    const id_reservasi = hasilReservasi.insertId;

    // 8. Simpan pesanan utama
    const kode_pesanan =
      `PSN-${randomUUID().slice(0, 8).toUpperCase()}`;

    const [hasilPesanan] = await conn.query(
      `INSERT INTO pesanan
       (kode_pesanan, id_reservasi, subtotal,
        id_diskon, nominal_diskon, total_harga)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        kode_pesanan,
        id_reservasi,
        subtotal,
        id_diskon,
        nominal_diskon,
        total_harga
      ]
    );

    const id_pesanan = hasilPesanan.insertId;

    // 9. Simpan seluruh item ke detail_pesanan
    for (const item of rincian) {
      await conn.query(
        `INSERT INTO detail_pesanan
         (id_pesanan, id_menu, id_bundle,
          jumlah, harga_satuan, subtotal_item)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id_pesanan,
          item.id_menu,
          item.id_bundle,
          item.jumlah,
          item.harga_satuan,
          item.subtotal_item
        ]
      );
    }

    // Simpan semua perubahan secara bersamaan
    await conn.commit();

    return res.status(201).json({
      berhasil: true,
      pesan: "Reservasi dan pesanan berhasil disimpan.",
      reservasi: {
        id_reservasi,
        kode_reservasi,
        tanggal,
        jam_mulai,
        jam_selesai,
        jumlah_orang: orang,
        nomor_meja: meja.nomor_meja,
        jenis_meja: meja.jenis_meja,
        id_pesanan,
        kode_pesanan,
        subtotal,
        nominal_diskon,
        total_harga
      }
    });
  } catch (error) {
    if (conn) {
      await conn.rollback();
    }

    console.error("POST reservasi:", error);

    return res.status(500).json({
      berhasil: false,
      pesan: error.message || "Gagal menyimpan reservasi dan pesanan."
    });
  } finally {
    if (conn) {
      conn.release();
    }
  }
});

// GET /api/reservasi/:id
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.id_reservasi, r.kode_reservasi,
              r.id_pelanggan, r.tanggal, r.jam_mulai,
              r.jam_selesai, r.jumlah_orang, r.status,
              r.catatan, m.nomor_meja, m.jenis_meja
       FROM reservasi r
       JOIN meja m ON m.id_meja = r.id_meja
       WHERE r.id_reservasi = ?`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        berhasil: false,
        pesan: "Reservasi tidak ditemukan."
      });
    }

    return res.json({ berhasil: true, data: rows[0] });
  } catch (error) {
    console.error("GET reservasi:", error);

    return res.status(500).json({
      berhasil: false,
      pesan: "Gagal mengambil detail reservasi."
    });
  }
});

export default router;
