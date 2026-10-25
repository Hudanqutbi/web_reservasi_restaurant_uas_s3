if (user) {
  $('#loginBox').hidden = true;
  $('#profileBox').hidden = false;
  $('#pName').textContent = user.name.split(' ')[0] + '.';
  $('#pEmail').textContent = user.email;
}

$('#loginForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const email = $('#lEmail').value;
  const password = $('#lPass').value;

  const found = users.find(function (item) {
    return item.email === email && item.pass === password;
  });

  if (!found) {
    $('#err').textContent = 'Email atau password salah.';
    return;
  }

  saveData('rr_user', { name: found.name, email: found.email });
  location.href = 'index.html';
});

$('#logoutBtn').addEventListener('click', function () {
  localStorage.removeItem('rr_user');
  location.href = 'index.html';
});