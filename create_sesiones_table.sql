-- Crear tabla de sesiones para gestión de tokens con expiración
CREATE TABLE IF NOT EXISTS public.sesiones (
  id SERIAL PRIMARY KEY,
  token VARCHAR(100) UNIQUE NOT NULL,
  id_usuario INTEGER NOT NULL REFERENCES public.usuarios("idUsuario"),
  creado_en TIMESTAMP DEFAULT NOW(),
  expira_en TIMESTAMP NOT NULL,
  activo BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_sesiones_token ON public.sesiones(token);
CREATE INDEX IF NOT EXISTS idx_sesiones_expira ON public.sesiones(expira_en);
