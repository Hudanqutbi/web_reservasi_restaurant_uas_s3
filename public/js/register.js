$('#regForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const name = $('#gName').value.trim();
  const email = $('#gEmail').value.trim();
  const password = $('#gPass').value;
  const confirm = $('#gPass2').value;

  $('#err').textContent = '';

  if (password !== confirm) {
    $('#err').textContent = 'Konfirmasi password tidak sama.';
    return;
  }

  try {
    const response = await fetch('/api/pelanggan/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nama: name,
        email: email,
        password: password
      })
    });

    const data = await response.json();

    if (!response.ok || data.berhasil === false) {
      throw new Error(
        data.pesan || data.message || 'Registrasi gagal.'
      );
    }

    console.log('Respons registrasi:', data);

    // Jangan menyimpan akun seolah-olah berhasil
    // sebelum backend mengonfirmasi registrasi.
    const pelanggan = data.pelanggan || data.data || data.user || data;

    if (!pelanggan.id_pelanggan) {
      throw new Error(
        'Registrasi mungkin berhasil, tetapi ID pelanggan tidak diterima. Periksa Console.'
      );
    }

    saveData('rr_user', {
      id_pelanggan: pelanggan.id_pelanggan,
      name: pelanggan.nama || name,
      email: pelanggan.email || email
    });

    location.href = 'index.html';

  } catch (error) {
    console.error('Registrasi gagal:', error);
    $('#err').textContent = error.message;
  }
});