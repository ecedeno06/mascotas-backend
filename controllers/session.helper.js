import crypto from 'crypto';
import { query } from '../db.js';

const SESSION_DURATION_HOURS = Number(process.env.SESSION_DURATION_HOURS) || 8;

/**
 * Crea una sesión en la base de datos y retorna el token generado.
 * @param {number|string} idUsuario
 * @returns {Promise<{ token: string, expiresIn: number }>}
 */
export async function createSession(idUsuario) {
  const token = 'sess_' + crypto.randomBytes(24).toString('hex');

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + SESSION_DURATION_HOURS);

  await query(
    'INSERT INTO public.sesiones (token, id_usuario, expira_en) VALUES ($1, $2, $3)',
    [token, idUsuario, expiresAt.toISOString()]
  );

  // expiresIn en milisegundos
  const expiresIn = SESSION_DURATION_HOURS * 60 * 60 * 1000;

  return { token, expiresIn };
}

/**
 * Obtiene todos los roles activos de un usuario con info de veterinaria y catálogo.
 * @param {number|string} idUsuario
 * @returns {Promise<Array>}
 */
export async function getRolesUsuario(idUsuario) {
  const result = await query(`
    SELECT
      ur.idrol         AS "idRol",
      cr.codigo        AS rol,
      ur.idveterinaria AS "idVeterinaria",
      v.nombre         AS "nombreVeterinaria",
      ur.activo
    FROM public.usuario_rol  ur
    LEFT JOIN public.catalogo_rol cr ON cr.idrol          = ur.idrol
    LEFT JOIN public.veterinaria  v  ON v.idveterinaria   = ur.idveterinaria
    WHERE ur.idusuario = $1 AND ur.activo = true
  `, [idUsuario]);

  const rawRoles = result.rows ?? [];
  const processedRoles = [];
  const seenPropietario = new Set();
  const seenOthers = new Set();

  for (const r of rawRoles) {
    if (r.rol === 'propietario') {
      if (!seenPropietario.has(r.idRol)) {
        seenPropietario.add(r.idRol);
        processedRoles.push({
          idRol: r.idRol,
          rol: r.rol,
          idVeterinaria: r.idVeterinaria,
          nombreVeterinaria: null,
          activo: r.activo
        });
      }
    } else {
      const key = `${r.idRol}-${r.idVeterinaria}`;
      if (!seenOthers.has(key)) {
        seenOthers.add(key);
        processedRoles.push(r);
      }
    }
  }

  return processedRoles;
}

export { SESSION_DURATION_HOURS };
