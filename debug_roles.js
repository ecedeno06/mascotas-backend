import { query } from './db.js';

async function main() {
  // Datos del usuario
  const u = await query(`SELECT "idUsuario", nombre, email, two_factor_enabled FROM public.usuarios WHERE email ILIKE 'edwin.e.cedeno@gmail.com'`);
  console.log('\n=== Usuario ===');
  console.log(JSON.stringify(u.rows, null, 2));

  if (u.rowCount === 0) { console.log('Usuario no encontrado'); process.exit(1); }
  const idUsuario = u.rows[0].idUsuario;

  // Roles actuales
  const ra = await query(`
    SELECT ur.*, cr.codigo AS rol, v.nombre AS veterinaria
    FROM public.usuario_rol ur
    LEFT JOIN public.catalogo_rol cr ON cr.idrol = ur.idrol
    LEFT JOIN public.veterinaria  v  ON v.idveterinaria = ur.idveterinaria
    WHERE ur.idusuario = $1
  `, [idUsuario]);
  console.log('\n=== Roles actuales ===');
  console.log(JSON.stringify(ra.rows, null, 2));

  // Roles disponibles en catálogo
  const roles = await query(`SELECT * FROM public.catalogo_rol ORDER BY idrol`);
  console.log('\n=== Catálogo de roles ===');
  console.log(JSON.stringify(roles.rows, null, 2));

  // Veterinarias disponibles
  const vets = await query(`SELECT idveterinaria, nombre FROM public.veterinaria ORDER BY idveterinaria`);
  console.log('\n=== Veterinarias ===');
  console.log(JSON.stringify(vets.rows, null, 2));

  process.exit(0);
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
