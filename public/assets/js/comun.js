function mostrarAlerta(msg, tipo = 'danger') {
  const box = document.getElementById('alerta');
  box.innerHTML = '';
  const d = document.createElement('div');
  d.className = `alert alert-${tipo} alert-dismissible fade show`;
  d.textContent = msg;
  d.insertAdjacentHTML('beforeend', '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>');
  box.appendChild(d);
}
async function enviarJSON(url, form) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.fromEntries(new FormData(form))),
  });
  return r.json();
}
