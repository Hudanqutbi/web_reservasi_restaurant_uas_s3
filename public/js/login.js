if (user) {
  $('#loginBox').hidden = true;
  $('#profileBox').hidden = false;
  $('#pName').textContent = user.name.split(' ')[0] + '.';
  $('#pEmail').textContent = user.email;
}

$('#loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const email = $('#lEmail').value.trim();
  const password = $('#lPass').value;

  try {
    const response = await fetch('/api/pelanggan/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    const data = await response.json();

    if (!response.ok || data.berhasil === false) {
      throw new Error(data.pesan || data.message || 'Email atau password salah.');
    }

    const pelanggan = data.pelanggan || data.data || data.user || data;

    const idPelanggan = pelanggan.id_pelanggan;
    const nama = pelanggan.nama || pelanggan.name;

    if (!idPelanggan || !nama || !pelanggan.email) {
      console.error('Format respons login:', data);
      throw new Error('ID pelanggan tidak ditemukan dari backend.');
    }

    saveData('rr_user', {
      id_pelanggan: idPelanggan,
      name: nama,
      email: pelanggan.email
    });

    location.href = 'index.html';

  } catch (error) {
    console.error('Login gagal:', error);
    $('#err').textContent = error.message;
  }
});

$('#logoutBtn').addEventListener('click', function () {
  localStorage.removeItem('rr_user');
  location.href = 'index.html';
});