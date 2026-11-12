# Huellitas Felices

![Huellitas Felices](https://img.shields.io/badge/Huellitas%20Felices-adopci%C3%B3n%20de%20mascotas-0D9488?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-Base%20de%20datos-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![SENA](https://img.shields.io/badge/Proyecto-SENA-2563EB?style=for-the-badge)

**Sistema web para publicar mascotas en adopción y conectar a las familias con su nuevo mejor amigo.**

[Descripción](#descripción) · [Funcionalidades](#funcionalidades) · [Instalación](#instalación) · [Uso](#uso) · [Estructura](#estructura-del-proyecto)

## Descripción

Huellitas Felices es un proyecto formativo del **SENA** que facilita la adopción responsable de mascotas. La plataforma muestra los animales disponibles, permite que las personas se registren e inicien sesión, y ofrece un panel de administración para gestionar la información.

El proyecto combina un frontend web responsive (HTML, CSS y JavaScript con Bootstrap 5) con un servidor **Node.js + Express** y una base de datos **MySQL/MariaDB**. Nació como una versión en PHP y fue migrado a Node.js.

## Objetivos

- Mostrar las mascotas disponibles para adopción de forma clara y atractiva.
- Facilitar el registro y la autenticación de usuarios por rol.
- Organizar las solicitudes de adopción, favoritos y comentarios sobre cada mascota.
- Dar al administrador una vista general de usuarios, mascotas y solicitudes.

## Funcionalidades

### Para visitantes y usuarios

- Página pública con las mascotas en adopción y la guía "¿Cómo adoptar?".
- Registro e inicio de sesión con contraseñas cifradas (bcrypt).
- Panel de usuario con sesión activa y cierre de sesión.
- Descarga del reporte de una mascota en archivo de texto.

### Para administración

- Panel de administración con indicadores de usuarios, mascotas y solicitudes de adopción.
- Acceso restringido al rol `administrador`.

## Tecnologías

| Capa          | Tecnologías                                           |
|---------------|-------------------------------------------------------|
| Frontend      | HTML5, CSS3, JavaScript, Bootstrap 5, Bootstrap Icons |
| Backend       | Node.js, Express 4                                    |
| Persistencia  | MySQL / MariaDB, `mysql2`                             |
| Autenticación | Sesiones con `express-session` y `bcryptjs`           |
| Configuración | `dotenv`                                              |

## Requisitos

- Node.js y npm.
- MySQL o MariaDB activo (por ejemplo, con XAMPP).

## Instalación

1. Clona el repositorio y entra en la carpeta del proyecto:

   ```
   git clone <URL_DEL_REPOSITORIO>
   cd huellitas-node
   ```

2. Instala las dependencias:

   ```
   npm install
   ```

3. Crea la base de datos e importa el esquema y los datos de prueba:

   ```
   mysql -u root -p < database/bd.sql
   ```

   El script crea la base de datos `huellitas_felices`.

   Si ya tienes una base creada, primero haz una copia de seguridad y aplica
   la migración de roles sobre la base existente:

   ```
   mysql -u root -p huellitas_felices < database/migrar_roles.sql
   ```

   La migración conserva los datos y columnas existentes, crea los cuatro
   roles e incorpora la relación `usuarios.id_rol` → `roles.id_rol`. Las
   cuentas sin un rol previo quedan como `usuario`.

4. Crea un archivo `.env` en la raíz a partir de `.env.example`:

   ```
   PORT=3000
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=
   DB_NAME=huellitas_felices
   SESSION_SECRET=cambia-esto-por-algo-largo
   ```

   No subas `.env` ni credenciales al repositorio.

## Uso

Inicia el servidor con:

```
npm start
```

o, en desarrollo (reinicia al guardar cambios):

```
npm run dev
```

Luego abre [http://localhost:3000](http://localhost:3000) en el navegador.

## Credenciales de demostración

| Rol           | Correo                       | Contraseña |
|---------------|------------------------------|------------|
| Administrador | `admin@huellitasfelices.com` | `123456`   |

Esta cuenta es únicamente para desarrollo y demostración. Debe cambiarse o eliminarse antes de usar el sistema en un entorno real.

## Estructura del proyecto

```
.
├── database/
│   ├── bd.sql                    # Esquema, relaciones y datos de prueba
│   └── migrar_roles.sql          # Migra una base de datos existente
├── public/
│   ├── assets/
│   │   ├── css/estilo.css        # Estilos de la interfaz
│   │   ├── js/                   # comun.js, login.js, registro.js, usuario.js
│   │   └── img/                  # Imágenes del sitio
│   ├── pages/                    # Login, registro y listado de mascotas (perros)
│   └── roles/                    # Vistas separadas por tipo de usuario
│       ├── admin/administrador.html
│       └── user/usuario.html
├── server/
│   ├── conexion.js               # Conexión con MySQL
│   └── server.js                 # Servidor Express, sesiones y API
├── .env                          # Variables locales, no versionar
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Modelo de datos

La base de datos `huellitas_felices` incluye estas tablas:

- `usuarios`: cuentas con `id_rol` como clave foránea.
- `roles`: `usuario` (1), `admin` (2), `fundacion` (3) y `especialistas` (4).
- `mascotas`: datos de cada animal (especie, raza, edad, sexo, tamaño, color, estado e imagen).
- `categorias` y `mascota_categoria`: clasificación de las mascotas.
- `imagenes_mascotas`: galería de imágenes por mascota.
- `solicitudes_adopcion` y `adopciones`: proceso de adopción.
- `favoritos`: mascotas guardadas por cada usuario.
- `comentarios`: opiniones de los usuarios sobre las mascotas.

## API disponible

| Método | Ruta            | Descripción                                    | Acceso        |
|--------|-----------------|------------------------------------------------|---------------|
| `GET`  | `/api/me`       | Consulta el estado de la sesión                | Público       |
| `POST` | `/api/login`    | Inicia sesión por correo y contraseña          | Público       |
| `POST` | `/api/registro` | Registra un nuevo usuario                      | Público       |
| `GET`  | `/api/logout`   | Cierra la sesión                               | Público       |
| `GET`   | `/api/admin/usuarios` | Lista las cuentas y sus roles             | Admin         |
| `PATCH` | `/api/admin/usuarios/:id/rol` | Asigna un rol existente          | Admin         |
| `GET`  | `/api/mascotas` | Lista las mascotas                             | Con sesión    |
| `GET`  | `/report_pet`   | Descarga el reporte de una mascota (`pet_id`)  | Con sesión    |

El registro público siempre asigna el rol `usuario`; el formulario no acepta
roles. Para dar de alta al primer administrador en una base migrada, ejecuta
una vez en MySQL (cambia el correo por el de la cuenta que administrarás):

```sql
UPDATE usuarios u
JOIN roles r ON r.nombre_rol = 'admin'
SET u.id_rol = r.id_rol
WHERE u.email = 'correo-del-admin@example.com';
```

Si tu columna de correo se llama `correo` en vez de `email`, reemplaza `u.email`
por `u.correo`. Después, un administrador autenticado puede listar usuarios y
asignar `usuario`, `admin`, `fundacion` o `especialistas` mediante los
endpoints administrativos. Para asignar un rol, envía JSON
`{"nombre_rol":"fundacion"}` a `/api/admin/usuarios/:id/rol`. No se permite
cambiar el propio rol. El panel
`/administrador` y sus recursos se autorizan consultando el rol vigente en la
base de datos; los otros tres roles usan el portal de usuario compartido.
Después de iniciar sesión, el backend responde con una redirección HTTP:
`usuario` → `/usuario`, `admin` → `/administrador`, `fundacion` →
`/fundacion` y `especialistas` → `/especialistas`. Las rutas de fundación y
especialistas usan por ahora la vista de usuario existente, pero están
protegidas por su rol. La sesión conserva `id_usuario`, `user_name`, `correo`,
`id_rol` y `rol`/`nombre_rol`.

## Estado del proyecto

El registro, el inicio de sesión, el control de acceso por rol y el reporte de mascotas están conectados al backend y a MySQL. Las vistas de usuario y administrador están maquetadas y aún falta conectar varias de sus operaciones (solicitudes, favoritos, comentarios y gestión) con nuevos endpoints.

## Contexto académico

Huellitas Felices fue creado como proyecto del **Servicio Nacional de Aprendizaje (SENA)** para aplicar conocimientos de desarrollo web, bases de datos, APIs y autenticación en una problemática social: facilitar la adopción responsable de mascotas.

## Licencia

Este proyecto es de carácter académico.
