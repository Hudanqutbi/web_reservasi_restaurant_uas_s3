if (booking) {
  $('#ok').hidden = false;

  $('#kCode').textContent = booking.code;
  $('#kDate').textContent = formatDate(booking.date);
  $('#kTime').textContent = booking.time;
  $('#kPeople').textContent = booking.people + ' Orang';
  $('#kTable').textContent = booking.table;
  $('#kTotal').textContent = rp(booking.total);

  $('#printBtn').addEventListener('click', function () {
    window.print();
  });
} else {
  $('#none').hidden = false;
}