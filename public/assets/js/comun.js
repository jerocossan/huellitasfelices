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
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const contentType = r.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('No fue posible conectar con el servidor.');
    }
    return await r.json();
  } catch (error) {
    return { ok: false, mensaje: error.message || 'No fue posible conectar con el servidor.' };
  }
}
