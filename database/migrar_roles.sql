-- Migración segura para bases existentes en MariaDB 10.4+.
-- Conserva columnas y datos anteriores; las cuentas sin rol quedan como usuario.

CREATE TABLE IF NOT EXISTS `roles` (
  `id_rol` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_rol` varchar(50) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_rol`),
  UNIQUE KEY `nombre_rol` (`nombre_rol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `roles` (`id_rol`, `nombre_rol`, `descripcion`) VALUES
(1, 'usuario', 'Usuario registrado de la plataforma.'),
(2, 'admin', 'Administra la plataforma y asigna roles.'),
(3, 'fundacion', 'Gestiona la informacion de una fundacion.'),
(4, 'especialistas', 'Profesional especializado en bienestar animal.')
ON DUPLICATE KEY UPDATE
  `nombre_rol` = VALUES(`nombre_rol`),
  `descripcion` = VALUES(`descripcion`);

DROP PROCEDURE IF EXISTS `migrar_roles_usuarios`;
DELIMITER //
CREATE PROCEDURE `migrar_roles_usuarios`()
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'usuarios'
      AND COLUMN_NAME = 'id_rol'
  ) THEN
    ALTER TABLE `usuarios` ADD COLUMN `id_rol` int(11) NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'usuarios'
      AND COLUMN_NAME = 'rol'
  ) THEN
    SET @actualizar_roles = 'UPDATE `usuarios` u JOIN `roles` r ON r.`nombre_rol` = CASE u.`rol` WHEN ''administrador'' THEN ''admin'' ELSE u.`rol` END SET u.`id_rol` = r.`id_rol` WHERE u.`id_rol` IS NULL';
    PREPARE sentencia_roles FROM @actualizar_roles;
    EXECUTE sentencia_roles;
    DEALLOCATE PREPARE sentencia_roles;
  END IF;

  UPDATE `usuarios` SET `id_rol` = 1 WHERE `id_rol` IS NULL;
  ALTER TABLE `usuarios` MODIFY COLUMN `id_rol` int(11) NOT NULL DEFAULT 1;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'usuarios'
      AND COLUMN_NAME = 'id_rol'
      AND REFERENCED_TABLE_NAME = 'roles'
      AND REFERENCED_COLUMN_NAME = 'id_rol'
  ) THEN
    ALTER TABLE `usuarios`
      ADD CONSTRAINT `fk_usuarios_roles`
      FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END//
DELIMITER ;

CALL `migrar_roles_usuarios`();
DROP PROCEDURE `migrar_roles_usuarios`;
