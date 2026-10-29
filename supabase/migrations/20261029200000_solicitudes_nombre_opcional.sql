-- ============================================================
-- Lista de espera: el nombre es opcional
--
-- En producción, solicitudes_acceso.nombre era NOT NULL (sin valor por
-- defecto). El formulario «Solicitar acceso» solo envía el email, así que
-- cada solicitud fallaba con:
--   null value in column "nombre" ... violates not-null constraint (23502)
-- Con esto queda igual que en schema.sql: nombre y mensaje opcionales.
--
-- No borra ni modifica datos. Se puede ejecutar más de una vez.
-- ============================================================

alter table solicitudes_acceso alter column nombre drop not null;
