import express from "express";
import db from "../db/index.js";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const router = express.Router();
const scrypt = promisify(scryptCallback);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64);
  return `${salt}:${key.toString("hex")}`;
}

async function verifyPassword(password, stored) {
  const [salt, keyHex] = String(stored).split(":");
  if (!salt || !keyHex) return false;
  const key = Buffer.from(keyHex, "hex");
  const candidate = await scrypt(password, salt, key.length);
  return key.length === candidate.length && timingSafeEqual(key, candidate);
}

// POST /api/pelanggan/register { nama, email, password, no_hp? }
router.post("/register", async (req, res) => {
  try {
    const nama = String(req.body.nama ?? "").trim();
    const email = String(req.body.email ?? "").trim().toLowerCase();
    const password = String(req.body.password ?? "");
    const no_hp = req.body.no_hp ? String(req.body.no_hp).trim() : null;

    if (!nama || !email || !password) {
      return res.status(400).json({ berhasil: false, pesan: "Nama, email, dan password wajib diisi" });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ berhasil: false, pesan: "Format email tidak valid" });
    }
    if (password.length < 8) {
      return res.status(400).json({ berhasil: false, pesan: "Password minimal 8 karakter" });
    }

    const passwordHash = await hashPassword(password);
    const [result] = await db.query(
      "INSERT INTO pelanggan (nama, email, no_hp, password) VALUES (?, ?, ?, ?)",
      [nama, email, no_hp, passwordHash]
    );
    res.status(201).json({
      berhasil: true,
      pesan: "Pendaftaran berhasil",
      data: { id_pelanggan: result.insertId, nama, email, no_hp }
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ berhasil: false, pesan: "Email sudah terdaftar" });
    }
    console.error("POST register:", error);
    res.status(500).json({ berhasil: false, pesan: "Gagal mendaftarkan pelanggan" });
  }
});

// POST /api/pelanggan/login { email, password }
router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email ?? "").trim().toLowerCase();
    const password = String(req.body.password ?? "");
    if (!email || !password) {
      return res.status(400).json({ berhasil: false, pesan: "Email dan password wajib diisi" });
    }

    const [rows] = await db.query(
      "SELECT id_pelanggan, nama, email, no_hp, password FROM pelanggan WHERE email = ? LIMIT 1",
      [email]
    );
    if (!rows.length || !(await verifyPassword(password, rows[0].password))) {
      return res.status(401).json({ berhasil: false, pesan: "Email atau password salah" });
    }

    const { password: _password, ...pelanggan } = rows[0];
    res.json({ berhasil: true, pesan: "Login berhasil", data: pelanggan });
  } catch (error) {
    console.error("POST login:", error);
    res.status(500).json({ berhasil: false, pesan: "Gagal memproses login" });
  }
});

export default router;
