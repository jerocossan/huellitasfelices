fetch('/api/me').then(r => r.json()).then(d => {
  if (!d.logueado) return (location.href = '/login');
  document.querySelectorAll('.nombreUsuario').forEach(el => (el.textContent = d.nombre));
});
fetch('/api/mascotas').then(r => r.json()).then(pets => {
  const sel = document.getElementById('reportPetSelect');
  pets.forEach(p => sel.add(new Option(p.nombre, p.id)));
});
