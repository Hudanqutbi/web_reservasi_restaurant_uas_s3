const form = $('#resForm');

$('#rDate').min = today;
$('#rDate').value = res.date;
$('#rTime').value = res.time;
$('#rPeople').value = res.people;

form.addEventListener('submit', function (e) {
  e.preventDefault();

  res = {
    date: $('#rDate').value,
    time: $('#rTime').value,
    people: Number($('#rPeople').value)
  };
  table = null; 

  saveData('rr_res', res);
  saveData('rr_table', table);

  location.href = 'meja.html';
});