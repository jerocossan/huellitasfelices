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
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.fromEntries(new FormData(form))),
  });
  if (response.redirected) {
    location.assign(response.url);
    return;
  }
  const d = await response.json();
  mostrarAlerta(d.mensaje);
});
