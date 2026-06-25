import { query } from '../db.js';

/**
 * Middleware que valida el token de sesión en el header Authorization.
 * Si el token es válido y no ha expirado, adjunta req.userId y continúa.
 * Si es inválido o expirado, responde 401.
 */
export default async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ mensaje: 'Token de sesión no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const result = await query(
      'SELECT id_usuario FROM public.sesiones WHERE token = $1 AND activo = true AND expira_en > NOW()',
      [token]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ mensaje: 'Sesión expirada o inválida. Inicie sesión nuevamente.' });
    }

    req.userId = result.rows[0].id_usuario;
    next();
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    return res.status(500).json({ mensaje: 'Error interno al validar la sesión' });
  }
}
