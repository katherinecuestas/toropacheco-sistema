-- =============================================================================
-- Corrección de zona horaria en citas.fecha_hora
-- =============================================================================
-- ⚠️ NO SE EJECUTA AUTOMÁTICAMENTE. Revisar y ejecutar a mano en el SQL Editor de Supabase.
--
-- PROBLEMA
--   citas.fecha_hora es timestamptz. Hasta el fix de la rama fix/zona-horaria-citas,
--   /seguimiento y el dashboard del abogado (crear y editar cita) enviaban
--   'YYYY-MM-DDTHH:MM:00' SIN offset, y Postgres lo guardó como UTC.
--   Una cita elegida a las 09:00 de Chile quedó como 09:00 UTC (05:00 / 06:00 en Chile).
--
-- QUÉ FILAS ESTÁN MAL (según el historial de git)
--   A) consulta_id IS NOT NULL → creadas desde /seguimiento: SIEMPRE sin offset (commit d4aa3c7).
--      Si después se editaron desde el dashboard, también sin offset. → Se corrigen.
--   B) consulta_id IS NULL → pueden venir de dos lugares que no se distinguen en la tabla:
--        - landing (FormularioConsulta): enviaba toISOString() con offset (commit 8f4979e) → CORRECTAS
--        - dashboard "nueva cita": sin offset → INCORRECTAS
--      Además, cualquier cita editada desde el dashboard quedó sin offset.
--      → NO se corrigen automáticamente: se listan en el PASO 1 y se agregan por id en el PASO 2.
--
-- CÓMO SE CORRIGE
--   (fecha_hora AT TIME ZONE 'UTC')                → recupera la hora "de reloj" que se guardó (ej. 09:00)
--   (...)        AT TIME ZONE 'America/Santiago'   → la reinterpreta como hora de Chile, con el offset
--                                                    vigente en ESA fecha (-03 verano / -04 invierno)
--   Resultado: 09:00 UTC → 09:00 Chile = 12:00 UTC (verano) o 13:00 UTC (invierno).
--
-- ANTES DE EJECUTAR
--   1. Reemplazar REEMPLAZAR_FECHA_DEPLOY (2 veces) por la fecha-hora en que se desplegó a producción
--      el fix (ej. '2026-10-12 18:00:00-03'). Las citas creadas DESPUÉS del deploy ya se guardan bien
--      y NO deben tocarse. Si no se reemplaza, el script falla (a propósito).
--   2. Ejecutar solo el PASO 1 y revisar el resultado.
--   3. Completar la lista de ids del PASO 2 con las citas del grupo B que estén mal.
--   4. Ejecutar todo. Termina en ROLLBACK: revisar el PASO 4 y, si está bien, cambiar ROLLBACK por COMMIT.
--
-- ⚠️ EJECUTARLO LO ANTES POSIBLE DESPUÉS DEL DEPLOY
--   Una cita creada antes del deploy pero EDITADA desde el dashboard después del deploy ya quedó
--   bien guardada, y este script la volvería a correr. La tabla no tiene updated_at para detectarlo.
--   Hasta que se ejecute, /api/slots también ve las citas antiguas en la hora equivocada.
-- =============================================================================


-- PASO 1 — Vista previa (solo lectura). Ejecutar primero esto solo.
-- hora_chile_actual  = lo que hoy ve el abogado/cliente
-- hora_chile_si_corrige = lo que verían después de corregir
SELECT
  id,
  CASE WHEN consulta_id IS NOT NULL THEN 'A: se corrige' ELSE 'B: revisar a mano' END AS grupo,
  consulta_id,
  estado,
  nombre_cliente,
  created_at,
  fecha_hora,
  to_char(fecha_hora AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI') AS hora_chile_actual,
  to_char(fecha_hora AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI')              AS hora_chile_si_corrige
FROM citas
WHERE created_at < 'REEMPLAZAR_FECHA_DEPLOY'::timestamptz
ORDER BY grupo, fecha_hora;
-- Pista para el grupo B: hora_chile_si_corrige debería coincidir con la hora que se le informó
-- al cliente (correo de confirmación) y caer dentro del horario de atención (ej. 09:00–18:00).
-- Si hora_chile_actual ya cae en horario de atención y la otra no, la cita probablemente está bien.


BEGIN;

-- PASO 2 — Respaldo de las filas que se van a tocar.
-- Sin IF NOT EXISTS a propósito: si el script ya se aplicó con COMMIT, la tabla existe y
-- esta línea falla, evitando corregir dos veces (lo que volvería a correr las horas).
CREATE TABLE citas_backup_zona_horaria AS
  SELECT id, fecha_hora, now() AS respaldado_en FROM citas WHERE false;

INSERT INTO citas_backup_zona_horaria (id, fecha_hora, respaldado_en)
SELECT id, fecha_hora, now()
FROM citas
WHERE created_at < 'REEMPLAZAR_FECHA_DEPLOY'::timestamptz
  AND (
    consulta_id IS NOT NULL
    -- Ids del grupo B confirmados como incorrectos en el PASO 1, ej. ARRAY[12, 15, 31]::bigint[]
    -- Lista vacía = no se toca ninguna cita del grupo B.
    OR id = ANY (ARRAY[]::bigint[])
  );


-- PASO 3 — Corrección de exactamente las filas respaldadas en el PASO 2
UPDATE citas
SET fecha_hora = (fecha_hora AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago'
WHERE id IN (SELECT id FROM citas_backup_zona_horaria);


-- PASO 4 — Verificación: cómo quedan las filas corregidas
SELECT
  c.id,
  to_char(b.fecha_hora AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI') AS antes_hora_chile,
  to_char(c.fecha_hora AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD HH24:MI') AS ahora_hora_chile
FROM citas c
JOIN citas_backup_zona_horaria b ON b.id = c.id
ORDER BY c.fecha_hora;

-- Si el PASO 4 se ve bien, cambiar ROLLBACK por COMMIT y volver a ejecutar el script completo.
ROLLBACK;

-- Para deshacer después de un COMMIT:
--   UPDATE citas c SET fecha_hora = b.fecha_hora
--   FROM citas_backup_zona_horaria b WHERE b.id = c.id;
