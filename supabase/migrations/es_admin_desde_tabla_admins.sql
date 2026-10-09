-- =============================================================================
-- es_admin(): la tabla "admins" pasa a ser la única fuente de verdad
-- =============================================================================
-- ⚠️ NO SE EJECUTA AUTOMÁTICAMENTE. Revisar y ejecutar a mano en el SQL Editor de Supabase.
--
-- CONTEXTO
--   La rama fix/admin-unificado hace que el código (requireAdmin, /admin, /dashboard) decida
--   quién es admin SOLO con la tabla "admins" (columna auth_user_id). La columna
--   usuarios.is_admin deja de usarse en el código, pero NO se borra.
--   es_admin() se usa en políticas RLS, así que debe seguir el mismo criterio que el código.
--
-- ANTES DE EJECUTAR — revisar la definición actual (no está versionada en el repo):
--   SELECT pg_get_functiondef(p.oid)
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.proname = 'es_admin';
--
--   CREATE OR REPLACE solo funciona si la firma actual es la misma: sin argumentos y
--   RETURNS boolean. Si la actual recibe argumentos o devuelve otro tipo, Postgres da error
--   y hay que ajustar este archivo (no usar DROP: las políticas RLS dependen de la función).
--
-- QUÉ CAMBIA
--   - Devuelve true si existe una fila en public.admins con auth_user_id = auth.uid().
--   - SECURITY DEFINER: se ejecuta con los permisos del dueño de la función, así que puede
--     leer "admins" aunque esa tabla tenga RLS (y evita recursión si las políticas de
--     "admins" usan es_admin()).
--   - SET search_path = public: evita que alguien cambie el search_path para suplantar la
--     tabla "admins". auth.uid() va con esquema explícito.
--   - STABLE: el resultado no cambia dentro de una misma consulta (Postgres puede evaluarla
--     una vez por consulta en las políticas).
--   - Sin auth.uid() (rol anon) devuelve false.
--
-- EFECTO EN LAS POLÍTICAS
--   Quien tenga usuarios.is_admin = true pero NO tenga fila en admins deja de ser admin para RLS.
--   Quien tenga fila en admins pasa a ser admin aunque is_admin sea false.
--   Consulta para ver a quiénes afecta, ANTES de ejecutar:
--     SELECT u.id, u.email, u.is_admin, (a.id IS NOT NULL) AS en_admins
--     FROM usuarios u FULL OUTER JOIN admins a ON a.auth_user_id = u.auth_user_id
--     WHERE coalesce(u.is_admin, false) <> (a.id IS NOT NULL);
-- =============================================================================

CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admins
    WHERE auth_user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.es_admin() IS
  'true si el usuario autenticado (auth.uid()) tiene fila en public.admins. Única fuente de verdad de admin.';

-- Las políticas RLS se evalúan con el rol de quien consulta: ambos roles deben poder ejecutarla.
-- (CREATE OR REPLACE conserva los permisos existentes; esto los deja explícitos.)
GRANT EXECUTE ON FUNCTION public.es_admin() TO anon, authenticated;
