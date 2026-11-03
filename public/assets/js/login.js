const form = document.getElementById('formLogin');
fetch('/api/me').then(r => r.json()).then(d => {
  if (d.logueado) {
    document.getElementById('sesionNombre').textContent = d.nombre;
    document.getElementById('sesionActiva').classList.remove('d-none');
    form.classList.add('d-none');
  }
});
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const d = await enviarJSON('/api/login', form);
  if (d.ok) location.href = d.redirect; else mostrarAlerta(d.mensaje);
});
