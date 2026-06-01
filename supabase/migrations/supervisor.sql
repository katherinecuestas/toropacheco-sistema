-- 1. Agregar columna rol a usuarios (antes abogados)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS rol TEXT DEFAULT 'abogado';

-- 2. Actualizar todos los registros existentes
UPDATE usuarios SET rol = 'abogado' WHERE rol IS NULL;

-- 3. Crear tabla prospectos
CREATE TABLE IF NOT EXISTS prospectos (
  id            SERIAL PRIMARY KEY,
  supervisor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  rut           TEXT,
  telefono      TEXT,
  email         TEXT,
  requerimiento       TEXT,
  fecha_requerimiento DATE,
  juzgado       TEXT,
  monto_deuda   NUMERIC(14, 0),
  estado        TEXT NOT NULL DEFAULT 'sin_contacto'
                  CHECK (estado IN ('sin_contacto','no_contesta','wsp_enviado','interesado','ya_tiene_abogado','agendado')),
  observacion   TEXT,
  fecha_llamar  DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
