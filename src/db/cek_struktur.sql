USE db_restoran;

-- Jalankan untuk memastikan tabel inti proyek ada dan memeriksa data yang tersimpan.
SHOW TABLES;
DESCRIBE pelanggan;
DESCRIBE meja;
DESCRIBE reservasi;
DESCRIBE menu;
DESCRIBE bundle;
DESCRIBE diskon;
DESCRIBE pesanan;
DESCRIBE detail_pesanan;

-- Cek data setelah mendaftar dan membuat reservasi dari website.
SELECT id_pelanggan, nama, email, dibuat_pada FROM pelanggan ORDER BY id_pelanggan DESC;
SELECT * FROM reservasi ORDER BY id_reservasi DESC;
SELECT * FROM pesanan ORDER BY id_pesanan DESC;
SELECT * FROM detail_pesanan ORDER BY id_detail_pesanan DESC;
