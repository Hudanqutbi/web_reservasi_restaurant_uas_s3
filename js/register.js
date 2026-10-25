$('#regForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const name = $('#gName').value;
  const email = $('#gEmail').value;
  const password = $('#gPass').value;
  const confirm = $('#gPass2').value;

  if (password !== confirm) {
    $('#err').textContent = 'Konfirmasi password tidak sama.';
    return;
  }

  const sudahAda = users.some(function (item) {
    return item.email === email;
  });

  if (sudahAda) {
    $('#err').textContent = 'Email sudah terdaftar.';
    return;
  }

  users.push({ name: name, email: email, pass: password });
  saveData('rr_users', users);
  saveData('rr_user', { name: name, email: email });

  location.href = 'index.html';
});