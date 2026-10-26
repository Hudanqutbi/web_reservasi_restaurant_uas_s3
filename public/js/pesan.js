initTabs('.tabs', '.item');

const items = $$('.item');

function showOrder() {
  items.forEach(function (item) {
    const data = cart[item.dataset.id];
    $('.q', item).textContent = data ? data.qty : 0;
  });

  const list = Object.values(cart);
  const summary = $('#summary');

  if (list.length === 0) {
    summary.innerHTML = '<p class="empty">Belum ada pesanan.<br>Tambahkan menu di sebelah kiri.</p>';
  } else {
    summary.innerHTML = list.map(function (item) {
      return '<div class="sumline">' +
        '<span>' + item.qty + ' × ' + item.name + '</span>' +
        '<span>' + rp(item.price * item.qty) + '</span>' +
        '</div>';
    }).join('');
  }

  $('#sumTotal').textContent = rp(cartSubtotal());
  updateNav();
}

function changeQty(item, delta) {
  const id = item.dataset.id;

  if (!cart[id]) {
    cart[id] = {
      name: item.dataset.name,
      price: Number(item.dataset.price),
      qty: 0
    };
  }

  cart[id].qty += delta;
  if (cart[id].qty <= 0) {
    delete cart[id];
  }

  saveData('rr_cart', cart);
  showOrder();
}

items.forEach(function (item) {
  $('.plus', item).addEventListener('click', function () {
    changeQty(item, 1);
  });
  $('.minus', item).addEventListener('click', function () {
    changeQty(item, -1);
  });
});

$('#toCheckout').addEventListener('click', function () {
  if (table === null) {
    toast('Pilih meja terlebih dahulu');
    setTimeout(function () {
      location.href = 'meja.html';
    }, 900);
    return;
  }
  location.href = 'checkout.html';
});

showOrder();