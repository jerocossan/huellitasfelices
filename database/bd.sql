-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 29-07-2026 a las 17:28:44
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.1.25
CREATE DATABASE IF NOT EXISTS `huellitas_felices` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `huellitas_felices`;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `huellitas_felices`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `adopciones`
--

CREATE TABLE `adopciones` (
  `id_adopcion` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `id_mascota` int(11) NOT NULL,
  `fecha_adopcion` date DEFAULT NULL,
  `observaciones` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias`
--

CREATE TABLE `categorias` (
  `id_categoria` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `categorias`
--

INSERT INTO `categorias` (`id_categoria`, `nombre`) VALUES
(1, 'Cachorro'),
(2, 'Adulto'),
(3, 'Rescatado'),
(4, 'Vacunado'),
(5, 'Esterilizado');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `comentarios`
--

CREATE TABLE `comentarios` (
  `id_comentario` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `id_mascota` int(11) NOT NULL,
  `comentario` text NOT NULL,
  `fecha` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `comentarios`
--

INSERT INTO `comentarios` (`id_comentario`, `id_usuario`, `id_mascota`, `comentario`, `fecha`) VALUES
(1, 2, 1, 'Qué perro tan bonito.', '2026-07-29 14:24:24'),
(2, 3, 2, 'Espero poder adoptarla pronto.', '2026-07-29 14:24:24');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `favoritos`
--

CREATE TABLE `favoritos` (
  `id_favorito` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `id_mascota` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `favoritos`
--

INSERT INTO `favoritos` (`id_favorito`, `id_usuario`, `id_mascota`) VALUES
(1, 2, 3),
(2, 2, 5),
(3, 3, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `imagenes_mascotas`
--

CREATE TABLE `imagenes_mascotas` (
  `id_imagen` int(11) NOT NULL,
  `id_mascota` int(11) NOT NULL,
  `imagen` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `mascotas`
--

CREATE TABLE `mascotas` (
  `id_mascota` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `especie` enum('Perro','Gato','Ave','Conejo','Otro') NOT NULL,
  `raza` varchar(100) DEFAULT NULL,
  `edad` int(11) DEFAULT NULL,
  `sexo` enum('Macho','Hembra') DEFAULT NULL,
  `tamano` enum('Pequeño','Mediano','Grande') DEFAULT NULL,
  `color` varchar(100) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `estado` enum('Disponible','Reservado','Adoptado') DEFAULT 'Disponible',
  `imagen` varchar(255) DEFAULT NULL,
  `fecha_publicacion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `mascotas`
--

INSERT INTO `mascotas` (`id_mascota`, `nombre`, `especie`, `raza`, `edad`, `sexo`, `tamano`, `color`, `descripcion`, `estado`, `imagen`, `fecha_publicacion`) VALUES
(1, 'Max', 'Perro', 'Labrador', 2, 'Macho', 'Grande', 'Dorado', 'Muy juguetón y amigable.', 'Disponible', 'max.jpg', '2026-07-29 14:24:24'),
(2, 'Luna', 'Gato', 'Criollo', 1, 'Hembra', 'Pequeño', 'Blanco', 'Le encanta dormir y recibir cariño.', 'Disponible', 'luna.jpg', '2026-07-29 14:24:24'),
(3, 'Rocky', 'Perro', 'Pastor Alemán', 3, 'Macho', 'Grande', 'Negro', 'Obediente y protector.', 'Disponible', 'rocky.jpg', '2026-07-29 14:24:24'),
(4, 'Milo', 'Gato', 'Siamés', 2, 'Macho', 'Pequeño', 'Gris', 'Muy tranquilo y cariñoso.', 'Disponible', 'milo.jpg', '2026-07-29 14:24:24'),
(5, 'Nala', 'Perro', 'Golden Retriever', 4, 'Hembra', 'Grande', 'Dorado', 'Ideal para familias con niños.', 'Disponible', 'nala.jpg', '2026-07-29 14:24:24');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `mascota_categoria`
--

CREATE TABLE `mascota_categoria` (
  `id_mascota` int(11) NOT NULL,
  `id_categoria` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `mascota_categoria`
--

INSERT INTO `mascota_categoria` (`id_mascota`, `id_categoria`) VALUES
(1, 2),
(1, 4),
(2, 1),
(2, 3),
(3, 2),
(3, 5),
(4, 1),
(5, 4);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `solicitudes_adopcion`
--

CREATE TABLE `solicitudes_adopcion` (
  `id_solicitud` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `id_mascota` int(11) NOT NULL,
  `fecha_solicitud` timestamp NOT NULL DEFAULT current_timestamp(),
  `estado` enum('Pendiente','Aprobada','Rechazada') DEFAULT 'Pendiente',
  `comentario` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `solicitudes_adopcion`
--

INSERT INTO `solicitudes_adopcion` (`id_solicitud`, `id_usuario`, `id_mascota`, `fecha_solicitud`, `estado`, `comentario`) VALUES
(1, 2, 1, '2026-07-29 14:24:24', 'Pendiente', 'Me gustaría adoptar a Max.'),
(2, 3, 2, '2026-07-29 14:24:24', 'Pendiente', 'Tengo experiencia cuidando gatos.');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id_usuario` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `correo` varchar(150) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `direccion` varchar(200) DEFAULT NULL,
  `contrasena` varchar(255) NOT NULL,
  `rol` enum('usuario','administrador') DEFAULT 'usuario',
  `fecha_registro` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id_usuario`, `nombre`, `apellido`, `correo`, `telefono`, `direccion`, `contrasena`, `rol`, `fecha_registro`) VALUES
(1, 'Administrador', 'Principal', 'admin@huellitasfelices.com', '3001234567', 'Bogotá', '123456', 'administrador', '2026-07-29 14:24:24'),
(2, 'Juan', 'Pérez', 'juan@gmail.com', '3101234567', 'Medellín', '123456', 'usuario', '2026-07-29 14:24:24'),
(3, 'María', 'Gómez', 'maria@gmail.com', '3201234567', 'Cali', '123456', 'usuario', '2026-07-29 14:24:24'),
(4, 'jeronimo cossio', '', 'jeronimo.cossio.sanchez@gmail.com', '123234', NULL, '$2y$10$szjzBJH13fwfUuhLlN/Bju9SlK99aXA3vzwaaPc607ko0.Zd6W4j2', 'usuario', '2026-07-29 14:40:01'),
(9, 'jeronimo', 'cossio sance', 'jejene@gmail.com', '123234', 'medellin', '$2y$10$0P1uBlyJhq5bhCcO7GKthO96ZC/kOmoekGZDPp5kWMYXAKqgcS4g2', 'usuario', '2026-07-29 15:03:15'),
(10, 'jeronimo cossio', 'cossio sance', 'dewxx@gmail.com', '123234', 'medellin', '$2y$10$Kyw14/WR4u.oT2BjQZ/ujegLqWL1YFxTdJ3VpQFgr/ErmHJpL0eCi', 'usuario', '2026-07-29 15:16:59');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `adopciones`
--
ALTER TABLE `adopciones`
  ADD PRIMARY KEY (`id_adopcion`),
  ADD KEY `id_usuario` (`id_usuario`),
  ADD KEY `id_mascota` (`id_mascota`);

--
-- Indices de la tabla `categorias`
--
ALTER TABLE `categorias`
  ADD PRIMARY KEY (`id_categoria`);

--
-- Indices de la tabla `comentarios`
--
ALTER TABLE `comentarios`
  ADD PRIMARY KEY (`id_comentario`),
  ADD KEY `id_usuario` (`id_usuario`),
  ADD KEY `id_mascota` (`id_mascota`);

--
-- Indices de la tabla `favoritos`
--
ALTER TABLE `favoritos`
  ADD PRIMARY KEY (`id_favorito`),
  ADD KEY `id_usuario` (`id_usuario`),
  ADD KEY `id_mascota` (`id_mascota`);

--
-- Indices de la tabla `imagenes_mascotas`
--
ALTER TABLE `imagenes_mascotas`
  ADD PRIMARY KEY (`id_imagen`),
  ADD KEY `id_mascota` (`id_mascota`);

--
-- Indices de la tabla `mascotas`
--
ALTER TABLE `mascotas`
  ADD PRIMARY KEY (`id_mascota`);

--
-- Indices de la tabla `mascota_categoria`
--
ALTER TABLE `mascota_categoria`
  ADD PRIMARY KEY (`id_mascota`,`id_categoria`),
  ADD KEY `id_categoria` (`id_categoria`);

--
-- Indices de la tabla `solicitudes_adopcion`
--
ALTER TABLE `solicitudes_adopcion`
  ADD PRIMARY KEY (`id_solicitud`),
  ADD KEY `id_usuario` (`id_usuario`),
  ADD KEY `id_mascota` (`id_mascota`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `correo` (`correo`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `adopciones`
--
ALTER TABLE `adopciones`
  MODIFY `id_adopcion` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `categorias`
--
ALTER TABLE `categorias`
  MODIFY `id_categoria` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `comentarios`
--
ALTER TABLE `comentarios`
  MODIFY `id_comentario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `favoritos`
--
ALTER TABLE `favoritos`
  MODIFY `id_favorito` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `imagenes_mascotas`
--
ALTER TABLE `imagenes_mascotas`
  MODIFY `id_imagen` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `mascotas`
--
ALTER TABLE `mascotas`
  MODIFY `id_mascota` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `solicitudes_adopcion`
--
ALTER TABLE `solicitudes_adopcion`
  MODIFY `id_solicitud` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `adopciones`
--
ALTER TABLE `adopciones`
  ADD CONSTRAINT `adopciones_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  ADD CONSTRAINT `adopciones_ibfk_2` FOREIGN KEY (`id_mascota`) REFERENCES `mascotas` (`id_mascota`);

--
-- Filtros para la tabla `comentarios`
--
ALTER TABLE `comentarios`
  ADD CONSTRAINT `comentarios_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  ADD CONSTRAINT `comentarios_ibfk_2` FOREIGN KEY (`id_mascota`) REFERENCES `mascotas` (`id_mascota`);

--
-- Filtros para la tabla `favoritos`
--
ALTER TABLE `favoritos`
  ADD CONSTRAINT `favoritos_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  ADD CONSTRAINT `favoritos_ibfk_2` FOREIGN KEY (`id_mascota`) REFERENCES `mascotas` (`id_mascota`);

--
-- Filtros para la tabla `imagenes_mascotas`
--
ALTER TABLE `imagenes_mascotas`
  ADD CONSTRAINT `imagenes_mascotas_ibfk_1` FOREIGN KEY (`id_mascota`) REFERENCES `mascotas` (`id_mascota`);

--
-- Filtros para la tabla `mascota_categoria`
--
ALTER TABLE `mascota_categoria`
  ADD CONSTRAINT `mascota_categoria_ibfk_1` FOREIGN KEY (`id_mascota`) REFERENCES `mascotas` (`id_mascota`),
  ADD CONSTRAINT `mascota_categoria_ibfk_2` FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id_categoria`);

--
-- Filtros para la tabla `solicitudes_adopcion`
--
ALTER TABLE `solicitudes_adopcion`
  ADD CONSTRAINT `solicitudes_adopcion_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  ADD CONSTRAINT `solicitudes_adopcion_ibfk_2` FOREIGN KEY (`id_mascota`) REFERENCES `mascotas` (`id_mascota`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
