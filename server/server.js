const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./conexion');

const PUBLIC = path.join(__dirname, '..', 'public');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'cambia-esto',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' },
}));

const requireLogin = (req, res, next) => (req.session.id_usuario ? next() : res.redirect('/login'));
const requireAdmin = (req, res, next) => (req.session.rol === 'administrador' ? next() : res.redirect('/login'));
const requireLoginApi = (req, res, next) => (req.session.id_usuario ? next() : res.status(401).json({ ok: false }));

const esquemaUsuarios = db.query('SHOW COLUMNS FROM usuarios').then(([rows]) => {
  const columnas = new Set(rows.map(({ Field }) => Field));
  const correo = columnas.has('correo') ? 'correo' : columnas.has('email') ? 'email' : null;
  if (!columnas.has('id_usuario') || !columnas.has('nombre') || !columnas.has('contrasena') || !correo) {
    throw new Error('La tabla usuarios debe incluir id_usuario, nombre, email o correo, y contrasena.');
  }
  return { columnas, correo };
});

// Las vistas por rol (public/roles) solo se sirven con sesión activa
app.use('/roles/admin', requireAdmin);
app.use('/roles/user', requireLogin);

// Archivos estáticos: /assets/... y /roles/...
app.use(express.static(PUBLIC));
// Páginas públicas: /login, /registro, /perros ... (public/pages, sin extensión .html)
app.use(express.static(path.join(PUBLIC, 'pages'), { extensions: ['html'] }));

// Acepta hashes bcrypt de PHP ($2y$) y contraseñas antiguas en texto plano
async function verificar(plano, guardada) {
  if (/^\$2[aby]\$/.test(guardada)) return bcrypt.compare(plano, guardada.replace(/^\$2y/, '$2a'));
  return plano === guardada;
}

// ── PÁGINAS PRIVADAS (html en public/roles) ──
app.get('/', (req, res) => res.redirect(req.session.id_usuario ? '/usuario' : '/perros'));
app.get('/usuario', requireLogin, (req, res) => res.sendFile(path.join(PUBLIC, 'roles', 'user', 'usuario.html')));
app.get('/administrador', requireAdmin, (req, res) => res.sendFile(path.join(PUBLIC, 'roles', 'admin', 'administrador.html')));

// ── API ──
app.get('/api/me', (req, res) => {
  const s = req.session;
  res.json({ logueado: !!s.id_usuario, nombre: s.user_name || null, rol: s.rol || null });
});

app.post('/api/login', async (req, res) => {
  const fallo = (mensaje) => res.json({ ok: false, mensaje });
  const correo = String(req.body.correo || '').trim();
  const pass = String(req.body.contrasena || '');
  if (!correo || !pass) return fallo('Debes ingresar correo y contraseña.');
  try {
    const esquema = await esquemaUsuarios;
    const rol = esquema.columnas.has('rol') ? '`rol`' : "'usuario'";
    const [rows] = await db.query(
      `SELECT id_usuario, nombre, \`${esquema.correo}\` AS correo, contrasena, ${rol} AS rol FROM usuarios WHERE \`${esquema.correo}\` = ?`,
      [correo]);
    if (rows.length !== 1) return fallo('No existe una cuenta con ese correo.');
    const u = rows[0];
    if (!(await verificar(pass, u.contrasena))) return fallo('Credenciales incorrectas.');
    if (!u.contrasena.startsWith('$2')) { // migrar texto plano a hash
      await db.query('UPDATE usuarios SET contrasena = ? WHERE id_usuario = ?', [await bcrypt.hash(pass, 10), u.id_usuario]);
    }
    req.session.regenerate((err) => {
      if (err) return fallo('Error interno. Intenta más tarde.');
      Object.assign(req.session, { id_usuario: u.id_usuario, user_name: u.nombre, correo: u.correo, rol: u.rol || 'usuario' });
      res.json({ ok: true, redirect: u.rol === 'administrador' ? '/administrador' : '/usuario' });
    });
  } catch (e) { console.error(e); fallo('Error interno. Intenta más tarde.'); }
});

app.post('/api/registro', async (req, res) => {
  const fallo = (mensaje) => res.json({ ok: false, mensaje });
  const t = (k) => String(req.body[k] || '').trim();
  const [nombre, apellido, correo, telefono, direccion] = ['nombre', 'apellido', 'correo', 'telefono', 'direccion'].map(t);
  const contrasena = String(req.body.contrasena || '');
  if (!nombre || !apellido || !correo || !contrasena) return fallo('Nombre, apellido, correo y contraseña son obligatorios.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return fallo('El correo electrónico no es válido.');
  try {
    const esquema = await esquemaUsuarios;
    const hash = await bcrypt.hash(contrasena, 10);
    const valores = new Map([
      ['nombre', nombre],
      [esquema.correo, correo],
      ['contrasena', hash],
      ['apellido', apellido],
      ['telefono', telefono],
      ['direccion', direccion],
      ['rol', 'usuario'],
    ]);
    const columnas = [...valores.keys()].filter((columna) => esquema.columnas.has(columna));
    await db.query(
      `INSERT INTO usuarios (${columnas.map((columna) => `\`${columna}\``).join(', ')}) VALUES (${columnas.map(() => '?').join(', ')})`,
      columnas.map((columna) => valores.get(columna)));
    res.json({ ok: true, redirect: '/login' });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return fallo('Ese correo ya está registrado.');
    console.error(e); fallo('Ocurrió un error al registrar.');
  }
});

app.get('/api/logout', (req, res) => {
  req.session.destroy(() => { res.clearCookie('connect.sid'); res.redirect('/login'); });
});

app.get('/api/mascotas', requireLoginApi, async (req, res) => {
  const [rows] = await db.query('SELECT id_mascota AS id, nombre FROM mascotas ORDER BY nombre ASC');
  res.json(rows);
});

app.get('/report_pet', requireLogin, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM mascotas WHERE id_mascota = ?', [Number(req.query.pet_id) || 0]);
  if (!rows.length) return res.status(404).send('Mascota no encontrada');
  const m = rows[0];
  res.attachment(`reporte_${m.nombre}.txt`).type('text/plain').send(
`REPORTE DE MASCOTA - Huellitas Felices
Nombre: ${m.nombre}
Especie: ${m.especie}
Raza: ${m.raza ?? '-'}
Edad: ${m.edad ?? '-'} años
Sexo: ${m.sexo ?? '-'}
Tamaño: ${m.tamano ?? '-'}
Color: ${m.color ?? '-'}
Estado: ${m.estado}
Descripción: ${m.descripcion ?? '-'}
`);
});

app.listen(process.env.PORT || 3000, () => console.log(`http://localhost:${process.env.PORT || 3000}`));
