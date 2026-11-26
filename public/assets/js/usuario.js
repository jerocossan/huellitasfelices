fetch('/api/me').then(r => r.ok ? r.json() : Promise.reject()).then(d => {
  if (!d.logueado) return (location.href = '/login');
  document.querySelectorAll('.nombreUsuario').forEach(el => (el.textContent = d.nombre));
}).catch(() => {
  location.href = '/login';
});
fetch('/api/mascotas').then(r => r.ok ? r.json() : Promise.reject()).then(pets => {
  const reportSelect = document.getElementById('reportPetSelect');
  if (reportSelect) pets.forEach(p => reportSelect.add(new Option(p.nombre, p.id)));
  const adoptionSelect = document.getElementById('adMascota');
  if (adoptionSelect) pets.forEach(p => adoptionSelect.add(new Option(p.nombre, p.id)));
}).catch(() => {
  const reportSelect = document.getElementById('reportPetSelect');
  if (reportSelect) reportSelect.replaceChildren(new Option('No fue posible cargar las mascotas', '', true, true));
  const adoptionSelect = document.getElementById('adMascota');
  if (adoptionSelect) adoptionSelect.replaceChildren(new Option('No fue posible cargar las mascotas', '', true, true));
});

const adoptionForm = document.getElementById('adopcionForm');
const adoptionSelect = document.getElementById('adMascota');
const adoptionFeedback = document.getElementById('adopcionFeedback');

function showAdoptionFeedback(message, type) {
  adoptionFeedback.className = `alert alert-${type} mt-3 mb-0`;
  adoptionFeedback.replaceChildren(document.createTextNode(message));
  if (type === 'warning' && message.includes('iniciar sesión')) {
    const link = document.createElement('a');
    link.href = '/login';
    link.className = 'alert-link ms-1';
    link.textContent = 'Iniciar sesión';
    adoptionFeedback.append(' ', link);
  }
}

document.getElementById('adoptarModal')?.addEventListener('show.bs.modal', (event) => {
  const button = event.relatedTarget;
  if (adoptionSelect) adoptionSelect.value = '';
  if (!button) return;
  const cardName = button.closest('.mascota-item')?.querySelector('.card-title')?.textContent.trim();
  const detailName = button.textContent.match(/Adoptar a\s+(.+)/i)?.[1]?.trim();
  const name = cardName || detailName;
  if (!name || !adoptionSelect) return;
  const option = [...adoptionSelect.options].find((item) =>
    item.textContent.toLocaleLowerCase('es') === name.toLocaleLowerCase('es'));
  if (option) adoptionSelect.value = option.value;
});

adoptionForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submitButton = adoptionForm.querySelector('[type="submit"]');
  submitButton.disabled = true;
  try {
    const response = await fetch('/api/solicitudes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(adoptionForm))),
    });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401) throw new Error('Debes iniciar sesión para enviar una solicitud.');
      throw new Error(result.mensaje || 'No fue posible enviar la solicitud.');
    }
    showAdoptionFeedback(result.mensaje, 'success');
    adoptionForm.reset();
  } catch (error) {
    showAdoptionFeedback(error.message || 'No fue posible conectar con el servidor.', 'warning');
  } finally {
    submitButton.disabled = false;
  }
});
