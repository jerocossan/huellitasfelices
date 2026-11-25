fetch('/api/me').then(r => r.ok ? r.json() : Promise.reject()).then(d => {
  if (!d.logueado) return (location.href = '/login');
  document.querySelectorAll('.nombreUsuario').forEach(el => (el.textContent = d.nombre));
}).catch(() => {
  location.href = '/login';
});
fetch('/api/mascotas').then(r => r.ok ? r.json() : Promise.reject()).then(pets => {
  const sel = document.getElementById('reportPetSelect');
  if (sel) pets.forEach(p => sel.add(new Option(p.nombre, p.id)));
}).catch(() => {
  const sel = document.getElementById('reportPetSelect');
  if (sel) sel.replaceChildren(new Option('No fue posible cargar las mascotas', '', true, true));
});
