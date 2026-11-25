const form = document.getElementById('formLogin');
fetch('/api/me')
  .then(r => r.ok ? r.json() : Promise.reject(new Error('No fue posible consultar la sesión.')))
  .then(d => {
    if (d.logueado) {
      document.getElementById('sesionNombre').textContent = d.nombre;
      document.getElementById('sesionActiva').classList.remove('d-none');
      form.classList.add('d-none');
    }
  })
  .catch(() => mostrarAlerta('No fue posible verificar la sesión actual.'));
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    if (response.redirected) {
      location.assign(response.url);
      return;
    }
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('No fue posible conectar con el servidor.');
    }
    const d = await response.json();
    mostrarAlerta(d.mensaje);
  } catch (error) {
    mostrarAlerta(error.message || 'No fue posible iniciar sesión.');
  }
});
