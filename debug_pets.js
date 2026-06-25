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
  console.log(`User ID: ${idUsuario}`);

  // 2. Query Edwin's pets directly
  const petsRes = await query(
    'SELECT id_mascota, nombre_mascota, id_propietario FROM public.mascotas WHERE id_propietario = $1',
    [idUsuario]
  );
  console.log('\n=== Pets directly owned by Edwin ===');
  console.log(JSON.stringify(petsRes.rows, null, 2));

  // 3. Query clinic association for Edwin's pets
  const mvRes = await query(
    `SELECT mv.idmascota, m.nombre_mascota, mv.idveterinaria, v.nombre AS veterinaria
     FROM public.mascota_veterinaria mv
     INNER JOIN public.mascotas m ON m.id_mascota = mv.idmascota
     LEFT JOIN public.veterinaria v ON v.idveterinaria = mv.idveterinaria
     WHERE m.id_propietario = $1`,
    [idUsuario]
  );
  console.log('\n=== Clinic associations for Edwin\'s pets ===');
  console.log(JSON.stringify(mvRes.rows, null, 2));

  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
