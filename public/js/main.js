const DISCOUNT = 0.2; 
const today = new Date().toISOString().slice(0, 10);

function $(selector, parent = document) {
  return parent.querySelector(selector);
}

function $$(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}

function rp(angka) {
  return 'Rp ' + Math.round(angka).toLocaleString('id-ID');
}

function formatDate(tanggal) {
  return new Date(tanggal + 'T00:00').toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

function loadData(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value === null ? fallback : value;
  } catch (error) {
    return fallback;
  }
}

function saveData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function toast(pesan) {
  const box = $('#toast');
  box.textContent = pesan;
  box.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(function () {
    box.classList.remove('show');
  }, 1800);
}

let cart = loadData('rr_cart', {});      
let res = loadData('rr_res', { date: today, time: '18:00', people: 4 });
let table = loadData('rr_table', null); 
let user = loadData('rr_user', null);
let users = loadData('rr_users', []);
let booking = loadData('rr_booking', null);

function cartCount() {
  return Object.values(cart).reduce(function (total, item) {
    return total + item.qty;
  }, 0);
}

function cartSubtotal() {
  return Object.values(cart).reduce(function (total, item) {
    return total + item.price * item.qty;
  }, 0);
}

function updateNav() {
  const badge = $('#badge');
  badge.textContent = cartCount();
  badge.style.display = cartCount() ? 'inline-grid' : 'none';
  $('#authLink').firstChild.textContent = user ? 'Akun' : 'Masuk';
}

$('#burger').addEventListener('click', function () {
  $('#links').classList.toggle('open');
});

updateNav();

document.addEventListener('click', function (e) {
  const button = e.target.closest('.js-add');
  if (!button) return;

  const element = button.closest('[data-id]');
  const id = element.dataset.id;

  if (!cart[id]) {
    cart[id] = {
      name: element.dataset.name,
      price: Number(element.dataset.price),
      qty: 0
    };
  }

  cart[id].qty++;
  saveData('rr_cart', cart);
  updateNav();
  toast('✓ ' + element.dataset.name + ' ditambahkan');
});

function initTabs(boxSelector, targetSelector) {
  const box = $(boxSelector);
  const targets = $$(targetSelector);

  function showCategory(category) {
    targets.forEach(function (item) {
      item.hidden = !(category === 'Semua' || item.dataset.cat === category);
    });
  }

  box.addEventListener('click', function (e) {
    const tab = e.target.closest('.tab');
    if (!tab) return;

    $$('.tab', box).forEach(function (button) {
      button.classList.remove('on');
    });
    tab.classList.add('on');
    showCategory(tab.dataset.f);
  });

  showCategory($('.tab.on', box).dataset.f);
}