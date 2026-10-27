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

$('#confirmBtn').addEventListener('click', function () {
  if (table === null) {
    toast('Pilih meja terlebih dahulu');
    setTimeout(function () {
      location.href = 'meja.html';
    }, 900);
    return;
  }

  const angkaAcak = Math.floor(Math.random() * 9000) + 1000;

  booking = {
    code: 'RSV' + res.date.replace(/-/g, '') + angkaAcak,
    date: res.date,
    time: res.time,
    people: res.people,
    table: table.name + ' (' + table.type + ')',
    total: total
  };

  cart = {};
  table = null;

  saveData('rr_booking', booking);
  saveData('rr_cart', cart);
  saveData('rr_table', table);

  location.href = 'konfirmasi.html';
});