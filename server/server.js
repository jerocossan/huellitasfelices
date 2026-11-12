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

const requireLoginApi = (req, res, next) => (req.session.id_usuario ? next() : res.status(401).json({ ok: false }));

const esquemaUsuarios = db.query('SHOW COLUMNS FROM usuarios').then(([rows]) => {
  const columnas = new Map(rows.map((columna) => [columna.Field, columna]));
  const correo = columnas.has('correo') ? 'correo' : columnas.has('email') ? 'email' : null;
  if (!columnas.has('id_usuario') || !columnas.has('nombre') || !columnas.has('contrasena') || !columnas.has('id_rol') || !correo) {
    throw new Error('La tabla usuarios debe incluir id_usuario, nombre, email o correo, contrasena e id_rol. Ejecuta database/migrar_roles.sql.');
  }
  return { columnas, correo };
});

const ROLE_PANELS = new Map([
  [1, { name: 'usuario', path: '/usuario' }],
  [2, { name: 'admin', path: '/administrador' }],
  [3, { name: 'fundacion', path: '/fundacion' }],
  [4, { name: 'especialistas', path: '/especialistas' }],
]);
const ROLE_IDS = new Map([...ROLE_PANELS].map(([id, role]) => [role.name, id]));
const ROLES = new Set(ROLE_IDS.keys());

const requireRole = (...allowedRoles) => async (req, res, next) => {
  if (!req.session.id_usuario) {
    return req.path.startsWith('/api/')
      ? res.status(401).json({ ok: false, mensaje: 'Debes iniciar sesión.' })
      : res.redirect('/login');
  }
  try {
    const [rows] = await db.query(
      'SELECT r.id_rol, r.nombre_rol FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol WHERE u.id_usuario = ?',
      [req.session.id_usuario]);
    if (rows.length !== 1) {
      return req.session.destroy(() => res.redirect('/login'));
    }
    const role = ROLE_PANELS.get(Number(rows[0].id_rol));
    if (!role || role.name !== rows[0].nombre_rol) {
      return res.status(403).send('La cuenta tiene un rol no válido.');
    }
    Object.assign(req.session, {
      id_rol: Number(rows[0].id_rol),
      rol: role.name,
      nombre_rol: role.name,
    });
    if (!allowedRoles.includes(role.name)) {
      return req.path.startsWith('/api/')
        ? res.status(403).json({ ok: false, mensaje: 'No tienes permiso para realizar esta acción.' })
        : res.redirect(role.path);
    }
    next();
  } catch (error) {
    console.error(error);
    res.status(500).send('No fue posible verificar los permisos.');
  }
};

const requireAdmin = requireRole('admin');
const requireUsuario = requireRole('usuario');
const requireFundacion = requireRole('fundacion');
const requireEspecialistas = requireRole('especialistas');
const requirePortalRole = requireRole('usuario', 'fundacion', 'especialistas');
const requireLogin = requireRole(...ROLES);

// Las vistas por rol (public/roles) solo se sirven con sesión activa
app.use('/roles/admin', requireAdmin);
app.use('/roles/user', requirePortalRole);

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
app.get('/', async (req, res) => {
  if (!req.session.id_usuario) return res.redirect('/perros');
  try {
    const [rows] = await db.query(
      'SELECT r.id_rol, r.nombre_rol FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol WHERE u.id_usuario = ?',
      [req.session.id_usuario]);
    if (rows.length !== 1) return res.redirect('/login');
    const role = ROLE_PANELS.get(Number(rows[0].id_rol));
    if (!role || role.name !== rows[0].nombre_rol) {
      return res.status(403).send('La cuenta tiene un rol no válido.');
    }
    Object.assign(req.session, {
      id_rol: Number(rows[0].id_rol),
      rol: role.name,
      nombre_rol: role.name,
    });
    res.redirect(role.path);
  } catch (error) {
    console.error(error);
    res.status(500).send('No fue posible verificar los permisos.');
  }
});
app.get('/usuario', requireUsuario, (req, res) => res.sendFile(path.join(PUBLIC, 'roles', 'user', 'usuario.html')));
app.get('/administrador', requireAdmin, (req, res) => res.sendFile(path.join(PUBLIC, 'roles', 'admin', 'administrador.html')));
app.get('/fundacion', requireFundacion, (req, res) => res.sendFile(path.join(PUBLIC, 'roles', 'user', 'usuario.html')));
app.get('/especialistas', requireEspecialistas, (req, res) => res.sendFile(path.join(PUBLIC, 'roles', 'user', 'usuario.html')));

// ── API ──
app.get('/api/me', async (req, res) => {
  const s = req.session;
  if (!s.id_usuario) return res.json({ logueado: false, nombre: null, correo: null, id_rol: null, rol: null });
  try {
    const [rows] = await db.query(
      'SELECT r.id_rol, r.nombre_rol FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol WHERE u.id_usuario = ?',
      [s.id_usuario]);
    if (rows.length !== 1) return res.json({ logueado: false, nombre: null, correo: null, id_rol: null, rol: null });
    const role = ROLE_PANELS.get(Number(rows[0].id_rol));
    if (!role || role.name !== rows[0].nombre_rol) {
      return res.status(403).json({ ok: false, mensaje: 'La cuenta tiene un rol no válido.' });
    }
    Object.assign(s, {
      id_rol: Number(rows[0].id_rol),
      rol: role.name,
      nombre_rol: role.name,
    });
    res.json({
      logueado: true,
      nombre: s.user_name || null,
      correo: s.correo || null,
      id_rol: s.id_rol,
      rol: s.rol,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: 'No fue posible consultar la sesión.' });
  }
});

app.post('/api/login', async (req, res) => {
  const fallo = (mensaje) => res.json({ ok: false, mensaje });
  const correo = String(req.body.correo || '').trim();
  const pass = String(req.body.contrasena || '');
  if (!correo || !pass) return fallo('Debes ingresar correo y contraseña.');
  try {
    const esquema = await esquemaUsuarios;
    const [rows] = await db.query(
      `SELECT u.id_usuario, u.nombre, u.\`${esquema.correo}\` AS correo, u.contrasena, r.id_rol, r.nombre_rol AS rol
       FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
       WHERE u.\`${esquema.correo}\` = ?`,
      [correo]);
    if (rows.length !== 1) return fallo('No existe una cuenta con ese correo.');
    const u = rows[0];
    if (!(await verificar(pass, u.contrasena))) return fallo('Credenciales incorrectas.');
    if (!u.contrasena.startsWith('$2')) { // migrar texto plano a hash
      await db.query('UPDATE usuarios SET contrasena = ? WHERE id_usuario = ?', [await bcrypt.hash(pass, 10), u.id_usuario]);
    }
    const role = ROLE_PANELS.get(Number(u.id_rol));
    if (!role || role.name !== u.rol) return fallo('La cuenta tiene un rol no válido.');
    req.session.regenerate((err) => {
      if (err) return fallo('Error interno. Intenta más tarde.');
      Object.assign(req.session, {
        id_usuario: u.id_usuario,
        user_name: u.nombre,
        correo: u.correo,
        id_rol: Number(u.id_rol),
        rol: role.name,
        nombre_rol: role.name,
      });
      res.redirect(303, role.path);
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
      ['nombre', esquema.columnas.has('apellido') ? nombre : `${nombre} ${apellido}`],
      [esquema.correo, correo],
      ['contrasena', hash],
      ['apellido', apellido],
      ['telefono', telefono],
      ['direccion', direccion],
      ['id_rol', ROLE_IDS.get('usuario')],
      ['rol', 'usuario'],
    ]);
    const columnas = [...valores.keys()].filter((columna) => esquema.columnas.has(columna));
    const columnasFaltantes = [...esquema.columnas.values()].filter((columna) =>
      columna.Null === 'NO'
      && columna.Default === null
      && columna.Extra !== 'auto_increment'
      && !valores.has(columna.Field));
    if (columnasFaltantes.length) {
      throw new Error(`Faltan datos para las columnas obligatorias: ${columnasFaltantes.map(({ Field }) => Field).join(', ')}.`);
    }
    await db.query(
      `INSERT INTO usuarios (${columnas.map((columna) => `\`${columna}\``).join(', ')}) VALUES (${columnas.map(() => '?').join(', ')})`,
      columnas.map((columna) => valores.get(columna)));
    res.json({ ok: true, redirect: '/login' });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return fallo('Ese correo ya está registrado.');
    console.error(e); fallo('Ocurrió un error al registrar.');
  }
});

app.get('/api/admin/usuarios', requireAdmin, async (req, res) => {
  try {
    const esquema = await esquemaUsuarios;
    const [rows] = await db.query(
      `SELECT u.id_usuario, u.nombre, u.\`${esquema.correo}\` AS correo, r.nombre_rol AS rol
       FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol ORDER BY u.id_usuario`);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: 'No fue posible consultar los usuarios.' });
  }
});

app.patch('/api/admin/usuarios/:id/rol', requireAdmin, async (req, res) => {
  const idUsuario = Number(req.params.id);
  const nombreRol = String(req.body.nombre_rol || '');
  if (!Number.isSafeInteger(idUsuario) || idUsuario < 1) {
    return res.status(400).json({ ok: false, mensaje: 'El identificador del usuario no es válido.' });
  }
  if (!ROLES.has(nombreRol)) {
    return res.status(400).json({ ok: false, mensaje: 'El rol solicitado no existe.' });
  }
  if (idUsuario === Number(req.session.id_usuario)) {
    return res.status(400).json({ ok: false, mensaje: 'No puedes cambiar tu propio rol.' });
  }
  try {
    const [[rol]] = await db.query('SELECT id_rol FROM roles WHERE nombre_rol = ?', [nombreRol]);
    if (!rol) return res.status(400).json({ ok: false, mensaje: 'El rol solicitado no existe.' });
    const [[usuario]] = await db.query('SELECT id_usuario FROM usuarios WHERE id_usuario = ?', [idUsuario]);
    if (!usuario) return res.status(404).json({ ok: false, mensaje: 'No se encontró el usuario.' });
    await db.query('UPDATE usuarios SET id_rol = ? WHERE id_usuario = ?', [rol.id_rol, idUsuario]);
    res.json({ ok: true, id_usuario: idUsuario, nombre_rol: nombreRol });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: 'No fue posible cambiar el rol del usuario.' });
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
