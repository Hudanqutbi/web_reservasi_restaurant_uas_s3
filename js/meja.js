initTabs('.side', '.tbl');

$('#mejaInfo').textContent =
  'Pilih jenis meja sesuai kebutuhan Anda untuk ' + res.people +
  ' orang pada ' + formatDate(res.date) + ', ' + res.time + '.';

function isFree(id) {
  let hash = 0;
  const text = res.date + res.time + id;

  for (const huruf of text) {
    hash = (hash * 31 + huruf.charCodeAt(0)) >>> 0;
  }
  return hash % 5 !== 0;
}

function showTables() {
  $$('.tbl').forEach(function (button) {
    const free = isFree(button.dataset.id);
    const status = $('.status', button);

    button.disabled = !free;
    status.textContent = free ? 'Tersedia' : 'Terisi';
    status.className = 'status ' + (free ? 'ok' : 'no');
    button.classList.toggle('sel', table !== null && table.id === button.dataset.id);
  });
}

$('.tables').addEventListener('click', function (e) {
  const button = e.target.closest('.tbl');
  if (!button || button.disabled) return;

  table = {
    id: button.dataset.id,
    name: button.dataset.name,
    type: button.dataset.cat
  };
  saveData('rr_table', table);
  showTables();
});

$('#nextBtn').addEventListener('click', function () {
  if (table === null) {
    toast('Pilih meja terlebih dahulu');
    return;
  }
  location.href = 'pesan.html';
});

showTables();