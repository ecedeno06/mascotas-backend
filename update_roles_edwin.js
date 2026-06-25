import { query } from './db.js';

async function main() {
  const email = 'edwin.e.cedeno@gmail.com';
  
  // 1. Get user id
  const userRes = await query('SELECT "idUsuario" FROM public.usuarios WHERE email ILIKE $1', [email]);
  if (userRes.rowCount === 0) {
    console.error(`User ${email} not found.`);
    process.exit(1);
  }
  const idUsuario = userRes.rows[0].idUsuario;
  console.log(`Found user: ${email} with ID: ${idUsuario}`);

  // 2. Set all existing roles for this user to active = true
  const updateRes = await query(
    'UPDATE public.usuario_rol SET activo = true WHERE idusuario = $1',
    [idUsuario]
  );
  console.log(`Activated existing roles. Rows updated: ${updateRes.rowCount}`);

  // 3. Let's see if we should add another role in Veterinaria 1.
  // We'll insert: idusuario = 4, idrol = 2 (admin_veterinaria), idveterinaria = 1, activo = true.
  // Check if it already exists
  const checkRes = await query(
    'SELECT * FROM public.usuario_rol WHERE idusuario = $1 AND idrol = 2 AND idveterinaria = 1',
    [idUsuario]
  );

  if (checkRes.rowCount === 0) {
    const insertRes = await query(
      'INSERT INTO public.usuario_rol (idusuario, idrol, idveterinaria, activo) VALUES ($1, 2, 1, true)',
      [idUsuario]
    );
    console.log(`Inserted new admin_veterinaria role for Veterinaria 1. Rows inserted: ${insertRes.rowCount}`);
  } else {
    await query(
      'UPDATE public.usuario_rol SET activo = true WHERE idusuario = $1 AND idrol = 2 AND idveterinaria = 1',
      [idUsuario]
    );
    console.log(`Activated existing admin_veterinaria role for Veterinaria 1.`);
  }

  // 4. Verify the active roles now
  const activeRolesRes = await query(`
    SELECT ur.*, cr.codigo AS rol, v.nombre AS veterinaria
    FROM public.usuario_rol ur
    LEFT JOIN public.catalogo_rol cr ON cr.idrol = ur.idrol
    LEFT JOIN public.veterinaria v ON v.idveterinaria = ur.idveterinaria
    WHERE ur.idusuario = $1 AND ur.activo = true
  `, [idUsuario]);

  console.log('\n=== Active Roles for Edwin ===');
  console.log(JSON.stringify(activeRolesRes.rows, null, 2));

  process.exit(0);
}

main().catch(e => {
  console.error('Error updating roles:', e);
  process.exit(1);
});
