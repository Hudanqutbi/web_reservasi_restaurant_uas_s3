const subtotal = cartSubtotal();
const discount = subtotal * DISCOUNT;
const total = subtotal - discount;

$('#cDate').textContent = formatDate(res.date);
$('#cTime').textContent = res.time;
$('#cPeople').textContent = res.people + ' Orang';
$('#cType').textContent = table ? table.type : '-';
$('#cTable').textContent = table ? table.name : '-';

const list = Object.values(cart);

if (list.length === 0) {
  $('#cOrder').innerHTML = '<p class="empty">Tidak ada pesanan makanan.</p>';
} else {
  $('#cOrder').innerHTML = list.map(function (item) {
    return '<div class="sumline">' +
      '<span>' + item.name + ' × ' + item.qty + '</span>' +
      '<span>' + rp(item.price * item.qty) + '</span>' +
      '</div>';
  }).join('');
}

$('#cSub').textContent = rp(subtotal);
$('#cDisc').textContent = '− ' + rp(discount);
$('#cTotal').textContent = rp(total);

$('#confirmBtn').addEventListener('click', async function () {
  if (table === null) {
    toast('Pilih meja terlebih dahulu');
    location.href = 'meja.html';
    return;
  }

  const user = JSON.parse(localStorage.getItem('rr_user') || 'null');

  if (!user || !user.id_pelanggan) {
    toast('Silakan login kembali');
    location.href = 'login.html';
    return;
  }

  const tombol = $('#confirmBtn');
  tombol.disabled = true;

  try {
    const items = Object.entries(cart).map(([code, item]) => ({
      code,
      name: item.name,
      qty: Number(item.qty)
    }));
    
    const response = await fetch('/api/reservasi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id_pelanggan: Number(user.id_pelanggan),
        id_meja: Number(table.id),
        tanggal: res.date,
        jam_mulai: res.time,
        jumlah_orang: Number(res.people),
        items: items
      })
    });

    const hasil = await response.json();

    if (!response.ok || hasil.berhasil !== true) {
      throw new Error(hasil.pesan || 'Reservasi gagal disimpan');
    }

    const data = hasil.reservasi || hasil.data;

if (!data || !data.kode_reservasi) {
  throw new Error(
    'Reservasi tersimpan, tetapi respons kode reservasi tidak sesuai.'
  );
}

booking = {
  code: data.kode_reservasi,
  date: data.tanggal || res.date,
  time: data.jam_mulai || res.time,
  people: data.jumlah_orang || res.people,
  table: table.name + ' (' + table.type + ')',
  total: Number(data.total_harga ?? total),
  databaseSaved: true
};

    saveData('rr_booking', booking);
    saveData('rr_cart', {});
    saveData('rr_table', null);

    cart = {};
    table = null;

    location.href = 'konfirmasi.html';

  } catch (error) {
    console.error('Gagal menyimpan reservasi:', error);
    toast(error.message);
  } finally {
    tombol.disabled = false;
  }
});