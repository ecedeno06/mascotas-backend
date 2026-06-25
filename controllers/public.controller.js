import { query } from '../db.js';

export const getPublicMascotaByQr = async (req, res, next) => {
  const { codigo_qr } = req.params;

  try {
    const mascota = await query(
      `
        SELECT
            m.id_mascota,
            u.email,
            m.nombre_mascota,
            m.color,
            m.microchip,
            m.codigo_qr,
            m.foto,
            m.sexo,
            u.nombre AS nombre_propietario

        FROM public.mascotas m
        LEFT JOIN public.usuarios u
            ON u."idUsuario" = m.id_propietario

        WHERE m.codigo_qr ILIKE $1;
      `,
      [codigo_qr]
    );

    if (mascota.rowCount === 0) {
      return res.status(404).json({ mensaje: 'Mascota no encontrada' });
    }

    const historialResult = await query(
      `
      SELECT
          fecha_hora,
          latitud,
          longitud,
          precision_metros
      FROM public.avistamientos
      WHERE codigo_qr = $1
      ORDER BY fecha_hora DESC
      LIMIT 5
      `,
      [codigo_qr]
    );

    const pet = mascota.rows[0];
    pet.avistamientos = historialResult.rows;

    return res.json(pet);
  } catch (error) {
    next(error);
  }
};

export const createAvistamiento = async (req, res, next) => {
  const { codigo_qr } = req.params;
  const { latitud, longitud, precision_metros, fecha_hora } = req.body;

  if (!latitud || !longitud) {
    return res.status(400).json({ mensaje: 'Faltan coordenadas' });
  }

  try {
    const result = await query(
      `
      INSERT INTO public.avistamientos (codigo_qr, latitud, longitud, precision_metros, fecha_hora)
      VALUES ($1, $2, $3, $4, COALESCE($5, NOW()))
      RETURNING *
      `,
      [codigo_qr, latitud, longitud, precision_metros, fecha_hora]
    );

    return res.status(201).json({
      mensaje: 'Avistamiento registrado con éxito',
      id: result.rows[0].id_avistamiento
    });
  } catch (error) {
    next(error);
  }
};
