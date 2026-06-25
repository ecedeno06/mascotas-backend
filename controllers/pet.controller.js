import { query } from '../db.js';

export const getBuscar = async (req, res, next) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ mensaje: 'Debe enviar un texto de búsqueda' });
  }

  try {
    const result = await query(
      `
      SELECT
        m.id_mascota,
        m.nombre_mascota,
        m.codigo_qr,
        m.color,
        m.sexo,
        m.microchip,
        m.foto,
        u.nombre as nombre_propietario
      FROM public.mascotas m
      LEFT JOIN public.usuarios u ON u."idUsuario" = m.id_propietario
      WHERE
        m.nombre_mascota ILIKE $1
        OR TRIM(m.codigo_qr) ILIKE $1
        OR m.microchip ILIKE $1
      ORDER BY m.id_mascota DESC
      LIMIT 10
      `,
      [`%${q}%`]
    );

    return res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const getAccesoMascotaBuscar = async (req, res, next) => {
  const { criterio, idveterinaria } = req.query;

  if (!criterio) {
    return res.status(400).json({ mensaje: 'Debe enviar un criterio de búsqueda' });
  }

  let vetId = null;
  if (idveterinaria && idveterinaria !== 'undefined' && idveterinaria !== 'null' && !isNaN(Number(idveterinaria))) {
    vetId = Number(idveterinaria);
  }

  try {
    const result = await query(
      `
        SELECT
            m.id_mascota
            ,m.nombre_mascota
            ,m.sexo
            ,m.color
            ,m.microchip
            ,cr.descripcion AS raza_descripcion
            ,ce.descripcion AS especie_descripcion
            ,u."idUsuario" AS propietario_id
            ,u.nombre AS propietario_nombre
            ,u.email AS propietario_email
            ,u.telefonos AS propietario_telefono
            ,EXISTS (
                SELECT 1 
                FROM public.mascota_veterinaria mv 
                WHERE mv.idmascota = m.id_mascota 
                  AND mv.idveterinaria = $2
            ) AS ya_registrada
        FROM public.mascotas m
        INNER JOIN public.usuarios u ON m.id_propietario = u."idUsuario"
        LEFT JOIN public.catalogo_razas cr ON cr.id_raza = m.idraza
        LEFT JOIN public.catalogo_especies ce ON ce.id_especie = cr.id_especie
        WHERE
            m.nombre_mascota ILIKE $1
            OR m.microchip ILIKE $1
            OR u.email ILIKE $1
            OR u.nombre ILIKE $1
            OR EXISTS (
                      SELECT 1
                      FROM jsonb_array_elements(
                          CASE
                              WHEN jsonb_typeof(u.telefonos::jsonb) = 'array'
                              THEN u.telefonos::jsonb
                              ELSE '[]'::jsonb
                          END
                      ) AS tel
                      WHERE tel->>'celular' ILIKE $1
                  )
                  OR (
                      jsonb_typeof(u.telefonos::jsonb) = 'object'
                      AND u.telefonos::jsonb->>'celular' ILIKE $1
                  )    
      `,
      [`%${criterio}%`, vetId]
    );

    if (result.rowCount === 0) {
      return res.json({ encontrado: false });
    }

    const coincidencias = result.rows.map(row => {
      const microchip = row.microchip || '';
      const microchipMasked = microchip.length > 4 
        ? '*'.repeat(microchip.length - 4) + microchip.slice(-4) 
        : '****';

      const email = row.propietario_email || '';
      let correoMasked = '';
      if (email.includes('@')) {
        const parts = email.split('@');
        const name = parts[0];
        const domain = parts[1];
        const maskedName = name.length > 2 
          ? name[0] + '*'.repeat(name.length - 2) + name.slice(-1) 
          : name[0] + '*';
        correoMasked = maskedName + '@' + domain;
      }

      let telefono = '';
      if (row.propietario_telefono) {
        let rawTel = row.propietario_telefono;
        if (typeof rawTel === 'string') {
          try {
            rawTel = JSON.parse(rawTel);
          } catch {
            telefono = rawTel;
          }
        }
        
        if (typeof rawTel === 'object' && rawTel !== null) {
          if (Array.isArray(rawTel)) {
            for (const item of rawTel) {
              if (item && typeof item === 'object') {
                const values = Object.values(item).filter(v => v);
                if (values.length > 0) {
                  telefono = values[0];
                  break;
                }
              }
            }
          } else {
            telefono = rawTel.telefono || rawTel.celular || rawTel.casa || Object.values(rawTel).find(v => v) || '';
          }
        }
      }

      const telClean = (telefono || '').trim();
      const telefonoMasked = telClean.length > 3
        ? '*'.repeat(telClean.length - 3) + telClean.slice(-3)
        : '***';

      return {
        mascota: {
          id: String(row.id_mascota),
          nombre: row.nombre_mascota,
          especie: row.especie_descripcion || 'Canino',
          raza: row.raza_descripcion || 'Desconocida',
          sexo: row.sexo === 'H' ? 'Hembra' : 'Macho',
          microchip: microchip,
          microchipMasked: microchipMasked,
          yaRegistrada: row.ya_registrada || false
        },
        propietario: {
          id: String(row.propietario_id),
          nombre: row.propietario_nombre,
          correo: email,
          correoMasked: correoMasked,
          telefono: telefono,
          telefonoMasked: telefonoMasked
        }
      };
    });

    return res.json({
      encontrado: true,
      coincidencias: coincidencias
    });

  } catch (error) {
    next(error);
  }
};

export const getAccesoMascotaInformacionCompartida = async (req, res, next) => {
  const { idmascota } = req.params;
  const { idveterinaria } = req.query;

  if (isNaN(Number(idmascota))) {
    return res.status(400).json({ mensaje: 'El ID de la mascota debe ser un número válido' });
  }

  let vetId = null;
  if (idveterinaria && idveterinaria !== 'undefined' && idveterinaria !== 'null' && !isNaN(Number(idveterinaria))) {
    vetId = Number(idveterinaria);
  }

  try {
    const vacunasResult = await query(
      `
        SELECT 
            cv.nombre_vacuna AS nombre,
            cv.intervalo_dias,
            v.fecha_vacuna AS fecha_aplicacion,
            v.lote
        FROM public.vacunas v
        LEFT JOIN public.catalogo_vacunas cv ON cv.id_vacuna = v.id_vacuna
        WHERE v.id_mascota = $1
          AND (
            v.id_veterinaria = $2
            OR EXISTS (
              SELECT 1
              FROM public.mascota_autorizaciones ma
              INNER JOIN public.mascotas m ON m.id_mascota = v.id_mascota
              WHERE ma.id_mascota = m.id_mascota
                AND ma.id_propietario = m.id_propietario
                AND ma.id_tipo_compartir = 1 
                AND ma.autorizado = true
            )
          )
        ORDER BY v.fecha_vacuna DESC
      `,
      [idmascota, vetId]
    );

    const vacunas = vacunasResult.rows.map(row => {
      let fechaAplicacion = null;
      let proximaDosis = null;

      if (row.fecha_aplicacion) {
        const d = new Date(row.fecha_aplicacion);
        if (!isNaN(d.getTime())) {
          fechaAplicacion = d.toISOString();
          
          const prox = new Date(d);
          if (row.intervalo_dias && !isNaN(Number(row.intervalo_dias))) {
            prox.setDate(prox.getDate() + Number(row.intervalo_dias));
          } else {
            prox.setFullYear(prox.getFullYear() + 1);
          }
          
          if (!isNaN(prox.getTime())) {
            proximaDosis = prox.toISOString();
          }
        }
      }

      return {
        nombre: row.nombre || 'Vacuna Genérica',
        fechaAplicacion,
        proximaDosis,
        lote: row.lote || 'N/A'
      };
    });

    const alertasResult = await query(
      `
        SELECT tipo_alerta, descripcion 
        FROM public.alertas_medicas_globales 
        WHERE idmascota = $1
      `,
      [idmascota]
    );

    const alergias = [];
    const condiciones = [];
    const medicacion = [];

    alertasResult.rows.forEach(alerta => {
      const tipo = (alerta.tipo_alerta || '').toLowerCase();
      if (tipo.includes('alergia')) {
        alergias.push(alerta.descripcion);
      } else if (tipo.includes('condicion') || tipo.includes('crónica')) {
        condiciones.push(alerta.descripcion);
      } else if (tipo.includes('medica') || tipo.includes('tratamiento')) {
        medicacion.push(alerta.descripcion);
      }
    });

    const citaResult = await query(
      `
        SELECT observaciones 
        FROM public.citas_seguimiento 
        WHERE idmascota = $1 
        ORDER BY fecha_cita DESC 
        LIMIT 1
      `,
      [idmascota]
    );

    const resumenClinico = citaResult.rows.length > 0 && citaResult.rows[0].observaciones
      ? citaResult.rows[0].observaciones
      : 'Paciente con esquema de vacunación vigente. Sin alertas clínicas críticas registradas.';

    return res.json({
      vacunas,
      alergias: alergias.length > 0 ? alergias : ['No reportadas'],
      condiciones: condiciones.length > 0 ? condiciones : ['Sin condiciones crónicas registradas'],
      medicacion: medicacion.length > 0 ? medicacion : ['Sin medicación activa'],
      resumenClinico,
      documentos: ['Carnet de vacunas oficial', 'Certificado de vacunas vigente']
    });

  } catch (error) {
    next(error);
  }
};

export const getPropietariosMascotas = async (req, res, next) => {
  const { criterio } = req.params;
  const param = `%${criterio}%`;

  try {
    const propietarios = await query(
      `
      SELECT
          u."idUsuario",
          u.nombre,
          u.telefonos,
          u.direccion,
          u.email
      FROM public.usuarios u
      WHERE
          u.email             ILIKE $1  OR
          u.nombre            ILIKE $1  
      ORDER BY
          u.nombre
      `,
      [param]
    );

    if (propietarios.rowCount === 0) {
      return res.status(404).json({
        mensaje: 'Propietario no encontrado'
      });
    }

    for (const propietario of propietarios.rows) {
      const mascotas = await query(
        `
        SELECT
            id_mascota,
            nombre_mascota,
            idraza,
            color,
            fecha_de_nacimiento,
            sexo,
            foto,
            microchip,
            codigo_qr
        FROM public.mascotas
        WHERE id_propietario = $1
        ORDER BY nombre_mascota
        `,
        [propietario.idUsuario]
      );
      propietario.mascotas = mascotas.rows;
    }

    return res.json(propietarios.rows);
  } catch (error) {
    next(error);
  }
};

export const getVeterinariaMascotas = async (req, res, next) => {
  const { veterinaria } = req.params;

  try {
    const result = await query(
      `
        SELECT
             m.id_mascota AS id,
             m.nombre_mascota AS nombre,
             ce.nombre_especie AS especie,
             cr.descripcion AS raza,
             u.nombre AS propietario,
             m.microchip,
             mv.esorigen,
             mv.fecha_registro,
             m.codigo_qr
        FROM public.mascota_veterinaria mv
          INNER JOIN public.mascotas m 
            ON mv.idmascota = m.id_mascota 
          INNER JOIN public.usuarios u 
            ON m.id_propietario = u."idUsuario" 
          LEFT JOIN public.catalogo_razas cr 
            ON cr.id_raza = m.idraza 
          LEFT JOIN public.catalogo_especies ce
            ON cr.id_especie = ce.id_especie
        WHERE mv.idveterinaria = $1 AND mv.activo = true
      `,
      [veterinaria]
    );

    const mappedMascotas = result.rows.map(row => ({
      id: String(row.id),
      nombre: row.nombre,
      especie: row.especie || 'Canino',
      raza: row.raza || 'Desconocida',
      propietario: row.propietario,
      microchip: row.microchip || 'SIN MICROCHIP',
      estado: row.esorigen ? 'Origen' : 'Afiliada',
      fechaAfiliacion: row.fecha_registro ? new Date(row.fecha_registro).toLocaleDateString('es-ES') : '',
      codigo_qr: row.codigo_qr || ''
    }));

    return res.json(mappedMascotas);
  } catch (error) {
    next(error);
  }
};

export const getPropietarioMascotas = async (req, res, next) => {
  const idUsuario = req.userId;

  try {
    const result = await query(
      `
        SELECT
             m.id_mascota AS id,
             m.nombre_mascota AS nombre,
             ce.nombre_especie AS especie,
             cr.descripcion AS raza,
             u.nombre AS propietario,
             m.microchip,
             m.codigo_qr
        FROM public.mascotas m
          INNER JOIN public.usuarios u 
            ON m.id_propietario = u."idUsuario" 
          LEFT JOIN public.catalogo_razas cr 
            ON cr.id_raza = m.idraza 
          LEFT JOIN public.catalogo_especies ce
            ON cr.id_especie = ce.id_especie
        WHERE m.id_propietario = $1
        ORDER BY m.nombre_mascota
      `,
      [idUsuario]
    );

    const mappedMascotas = result.rows.map(row => ({
      id: String(row.id),
      nombre: row.nombre,
      especie: row.especie || 'Canino',
      raza: row.raza || 'Desconocida',
      propietario: row.propietario,
      microchip: row.microchip || 'SIN MICROCHIP',
      estado: 'Origen',
      fechaAfiliacion: '',
      codigo_qr: row.codigo_qr || ''
    }));

    return res.json(mappedMascotas);
  } catch (error) {
    next(error);
  }
};

