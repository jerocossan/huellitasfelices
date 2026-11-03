const form = document.getElementById('formRegistro');
document.getElementById('anio').textContent = new Date().getFullYear();
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const d = await enviarJSON('/api/registro', form);
  if (d.ok) location.href = d.redirect; else mostrarAlerta(d.mensaje);
});
