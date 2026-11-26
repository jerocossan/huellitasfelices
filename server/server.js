const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { jsPDF } = require('jspdf');
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

const esquemaUsuarios = db.query('SHOW COLUMNS FROM usuarios').then(([rows]) => {
  const columnas = new Map(rows.map((columna) => [columna.Field, columna]));
  const correo = columnas.has('correo') ? 'correo' : columnas.has('email') ? 'email' : null;
  if (!columnas.has('id_usuario') || !columnas.has('nombre') || !columnas.has('contrasena') || !columnas.has('id_rol') || !correo) {
    throw new Error('La tabla usuarios debe incluir id_usuario, nombre, email o correo, contrasena e id_rol. Ejecuta database/migrar_roles.sql.');
  }
  return { columnas, correo };
});

const esquemaSolicitudes = db.query('SHOW COLUMNS FROM solicitudes_adopcion').then(([rows]) => {
  const columnas = new Set(rows.map((columna) => columna.Field));
  const estado = columnas.has('estado_solicitud')
    ? 'estado_solicitud'
    : columnas.has('estado') ? 'estado' : null;
  const comentario = columnas.has('comentario') ? 'comentario' : null;
  const tipoVivienda = columnas.has('tipo_vivienda') ? 'tipo_vivienda' : null;
  const motivo = columnas.has('motivo') ? 'motivo' : null;
  if (!estado) {
    throw new Error('La tabla solicitudes_adopcion debe incluir la columna estado o estado_solicitud.');
  }
  if (!comentario && !tipoVivienda && !motivo) {
    throw new Error('La tabla solicitudes_adopcion debe incluir una columna para guardar los detalles.');
  }
  return { estado, comentario, tipoVivienda, motivo };
});

const esquemaMascotas = db.query('SHOW COLUMNS FROM mascotas').then(([rows]) => {
  const columnas = new Set(rows.map((columna) => columna.Field));
  const disponibilidad = columnas.has('disponible')
    ? 'disponible'
    : columnas.has('estado') ? 'estado' : null;
  if (!disponibilidad) {
    throw new Error('La tabla mascotas debe incluir la columna disponible o estado.');
  }
  return { disponibilidad };
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

// Acepta hashes bcrypt de PHP ($2y$) y contraseñas antiguas en texto plano.
async function verificar(plano, guardada) {
  if (/^\$2[aby]\$/.test(guardada)) {
    return bcrypt.compare(plano, guardada.replace(/^\$2y/, '$2a'));
  }
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
    if (!/^\$2[aby]\$/.test(u.contrasena)) {
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
    const nombre = esquema.columnas.has('apellido')
      ? "CONCAT_WS(' ', u.nombre, u.apellido)"
      : 'u.nombre';
    const [rows] = await db.query(
      `SELECT u.id_usuario, ${nombre} AS nombre, u.\`${esquema.correo}\` AS correo, r.nombre_rol AS rol
       FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol ORDER BY u.id_usuario`);
    res.json(rows.map((usuario) => ({
      ...usuario,
      estado: Number(usuario.id_usuario) === Number(req.session.id_usuario) ? 'Online' : 'Activo',
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: 'No fue posible consultar los usuarios.' });
  }
});

app.get('/api/admin/solicitudes', requireAdmin, async (req, res) => {
  try {
    const esquema = await esquemaUsuarios;
    const esquemaSolicitud = await esquemaSolicitudes;
    const nombreUsuario = esquema.columnas.has('apellido')
      ? "CONCAT_WS(' ', u.nombre, u.apellido)"
      : 'u.nombre';
    const camposDetalles = [];
    if (esquemaSolicitud.comentario) {
      camposDetalles.push(`s.\`${esquemaSolicitud.comentario}\``);
    } else {
      if (esquemaSolicitud.tipoVivienda) {
        camposDetalles.push(`CONCAT('Vivienda: ', COALESCE(s.\`${esquemaSolicitud.tipoVivienda}\`, ''))`);
      }
      if (esquemaSolicitud.motivo) {
        camposDetalles.push(`CONCAT('Motivo: ', COALESCE(s.\`${esquemaSolicitud.motivo}\`, ''))`);
      }
    }
    const detallesSolicitud = camposDetalles.length === 1
      ? camposDetalles[0]
      : `CONCAT_WS('\\n', ${camposDetalles.join(', ')})`;
    const [rows] = await db.query(
      `SELECT s.id_solicitud, ${nombreUsuario} AS usuario, ${detallesSolicitud} AS comentario,
              m.nombre AS mascota, DATE_FORMAT(s.fecha_solicitud, '%d/%m/%Y') AS fecha,
              s.\`${esquemaSolicitud.estado}\` AS estado
       FROM solicitudes_adopcion s
       JOIN usuarios u ON u.id_usuario = s.id_usuario
       JOIN mascotas m ON m.id_mascota = s.id_mascota
       ORDER BY s.fecha_solicitud DESC, s.id_solicitud DESC`);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: 'No fue posible consultar las solicitudes.' });
  }
});

app.patch('/api/admin/solicitudes/:id/estado', requireAdmin, async (req, res) => {
  const idSolicitud = Number(req.params.id);
  const estado = String(req.body.estado || '');
  if (!Number.isSafeInteger(idSolicitud) || idSolicitud < 1) {
    return res.status(400).json({ ok: false, mensaje: 'El identificador de la solicitud no es válido.' });
  }
  if (!['Aprobada', 'Rechazada'].includes(estado)) {
    return res.status(400).json({ ok: false, mensaje: 'El estado solicitado no es válido.' });
  }
  let connection;
  try {
    const esquema = await esquemaSolicitudes;
    const esquemaMascota = await esquemaMascotas;
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [[solicitud]] = await connection.query(
      `SELECT id_solicitud, id_mascota, \`${esquema.estado}\` AS estado
       FROM solicitudes_adopcion WHERE id_solicitud = ? FOR UPDATE`,
      [idSolicitud]);
    if (!solicitud) {
      await connection.rollback();
      return res.status(404).json({ ok: false, mensaje: 'No se encontró la solicitud.' });
    }
    if (solicitud.estado !== 'Pendiente') {
      await connection.rollback();
      return res.status(409).json({ ok: false, mensaje: 'La solicitud ya fue atendida.' });
    }
    if (estado === 'Aprobada') {
      const [[mascota]] = await connection.query(
        `SELECT \`${esquemaMascota.disponibilidad}\` AS disponibilidad
         FROM mascotas WHERE id_mascota = ? FOR UPDATE`,
        [solicitud.id_mascota]);
      const disponible = mascota && (esquemaMascota.disponibilidad === 'disponible'
        ? Boolean(Number(mascota.disponibilidad))
        : mascota.disponibilidad === 'Disponible');
      if (!disponible) {
        await connection.rollback();
        return res.status(409).json({ ok: false, mensaje: 'La mascota ya no está disponible para adopción.' });
      }
      await connection.query(
        `UPDATE mascotas SET \`${esquemaMascota.disponibilidad}\` = ?
         WHERE id_mascota = ?`,
        [esquemaMascota.disponibilidad === 'disponible' ? 0 : 'Adoptado', solicitud.id_mascota]);
    }
    await connection.query(
      `UPDATE solicitudes_adopcion SET \`${esquema.estado}\` = ? WHERE id_solicitud = ?`,
      [estado, idSolicitud]);
    await connection.commit();
    res.json({ ok: true, id_solicitud: idSolicitud, estado });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(rollbackError);
      }
    }
    console.error(error);
    res.status(500).json({ ok: false, mensaje: 'No fue posible actualizar la solicitud.' });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/api/solicitudes', requireUsuario, async (req, res) => {
  const idMascota = Number(req.body.id_mascota);
  const ciudad = String(req.body.ciudad || '').trim();
  const vivienda = String(req.body.vivienda || '');
  const motivo = String(req.body.motivo || '').trim();
  const compromiso = String(req.body.compromiso || '');
  if (!Number.isSafeInteger(idMascota) || idMascota < 1) {
    return res.status(400).json({ ok: false, mensaje: 'Selecciona una mascota válida.' });
  }
  if (!ciudad || ciudad.length > 100 || !['Casa', 'Apartamento', 'Finca / Rural'].includes(vivienda)
      || !motivo || motivo.length > 3000 || compromiso !== 'true') {
    return res.status(400).json({ ok: false, mensaje: 'Completa la ciudad, el tipo de vivienda y el motivo de adopción.' });
  }
  let connection;
  try {
    const esquema = await esquemaSolicitudes;
    const esquemaMascota = await esquemaMascotas;
    connection = await db.getConnection();
    await connection.beginTransaction();
    const rechazar = async (status, mensaje) => {
      await connection.rollback();
      return res.status(status).json({ ok: false, mensaje });
    };
    const [[mascota]] = await connection.query(
      `SELECT \`${esquemaMascota.disponibilidad}\` AS disponibilidad
       FROM mascotas WHERE id_mascota = ? FOR UPDATE`,
      [idMascota]);
    if (!mascota) {
      return await rechazar(404, 'No se encontró la mascota seleccionada.');
    }
    const disponible = esquemaMascota.disponibilidad === 'disponible'
      ? Boolean(Number(mascota.disponibilidad))
      : mascota.disponibilidad === 'Disponible';
    if (!disponible) {
      return await rechazar(409, 'Esta mascota ya no está disponible para adopción.');
    }
    const [[solicitudExistente]] = await connection.query(
      `SELECT id_solicitud FROM solicitudes_adopcion
       WHERE id_usuario = ? AND id_mascota = ? AND \`${esquema.estado}\` = 'Pendiente'`,
      [req.session.id_usuario, idMascota]);
    if (solicitudExistente) {
      return await rechazar(409, 'Ya tienes una solicitud pendiente para esta mascota.');
    }
    const comentario = `Ciudad: ${ciudad}\nTipo de vivienda: ${vivienda}\nMotivo: ${motivo}`;
    const columnas = ['id_usuario', 'id_mascota'];
    const valores = [req.session.id_usuario, idMascota];
    if (esquema.tipoVivienda) {
      columnas.push(esquema.tipoVivienda);
      valores.push(vivienda);
    }
    if (esquema.motivo) {
      columnas.push(esquema.motivo);
      valores.push(`Ciudad: ${ciudad}\n${motivo}`);
    }
    if (esquema.comentario) {
      columnas.push(esquema.comentario);
      valores.push(comentario);
    }
    const [resultado] = await connection.query(
      `INSERT INTO solicitudes_adopcion (${columnas.map((columna) => `\`${columna}\``).join(', ')})
       VALUES (${columnas.map(() => '?').join(', ')})`,
      valores);
    await connection.commit();
    res.status(201).json({ ok: true, id_solicitud: resultado.insertId, mensaje: 'Tu solicitud de adopción fue enviada.' });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(rollbackError);
      }
    }
    console.error(error);
    res.status(500).json({ ok: false, mensaje: 'No fue posible enviar la solicitud de adopción.' });
  } finally {
    if (connection) connection.release();
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

app.get('/api/mascotas', async (req, res) => {
  try {
    const esquema = await esquemaMascotas;
    const [rows] = await db.query(
      `SELECT id_mascota AS id, nombre FROM mascotas
       WHERE \`${esquema.disponibilidad}\` = ? ORDER BY nombre ASC`,
      [esquema.disponibilidad === 'disponible' ? 1 : 'Disponible']);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, mensaje: 'No fue posible consultar las mascotas disponibles.' });
  }
});

app.get('/report_pet', requireLogin, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM mascotas WHERE id_mascota = ?', [Number(req.query.pet_id) || 0]);
  if (!rows.length) return res.status(404).send('Mascota no encontrada');
  const m = rows[0];
  const pdf = new jsPDF();
  let y = 20;

  pdf.setFontSize(18);
  pdf.text('REPORTE DE MASCOTA', 105, y, { align: 'center' });
  y += 10;
  pdf.setFontSize(12);
  pdf.text('Huellitas Felices', 105, y, { align: 'center' });
  y += 14;

  const campos = [
    ['Nombre', m.nombre],
    ['Especie', m.especie],
    ['Raza', m.raza ?? '-'],
    ['Edad', m.edad != null ? `${m.edad} anos` : '-'],
    ['Sexo', m.sexo ?? '-'],
    ['Tamano', m.tamano ?? '-'],
    ['Estado', m.estado],
  ];

  pdf.setFontSize(11);
  for (const [etiqueta, valor] of campos) {
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${etiqueta}:`, 20, y);
    pdf.setFont('helvetica', 'normal');
    const texto = String(valor ?? '-');
    const lineas = pdf.splitTextToSize(texto, 155);
    pdf.text(lineas, 55, y);
    y += Math.max(8, lineas.length * 6);
  }

  pdf.setFont('helvetica', 'bold');
  pdf.text('Descripcion:', 20, y);
  y += 7;
  pdf.setFont('helvetica', 'normal');
  const descripcion = pdf.splitTextToSize(String(m.descripcion ?? '-'), 170);
  pdf.text(descripcion, 20, y);

  const nombreSeguro = String(m.nombre || 'mascota')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="reporte_${nombreSeguro}.pdf"`);
  res.send(pdfBuffer);
});

app.listen(process.env.PORT || 3000, () => console.log(`http://localhost:${process.env.PORT || 3000}`));
