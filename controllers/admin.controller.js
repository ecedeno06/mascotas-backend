import { query } from '../db.js';
import QRCode from 'qrcode';

const PUBLIC_PORTAL_URL = process.env.PUBLIC_PORTAL_URL || 'http://localhost:4200';

export const createMascota = async (req, res, next) => {
  const {
    email,
    nombre_mascota,
    idraza,
    peso,
    tamano,
    color,
    fecha_de_nacimiento,
    esterilizado,
    id_propietario,
    sexo,
    id_compania,
    foto,
    microchip
  } = req.body;

  try {
    const result = await query(
      `
      INSERT INTO public.mascotas
      (
        email,
        nombre_mascota,
        idraza,
        peso,
        tamano,
        color,
        fecha_de_nacimiento,
        esterilizado,
        id_propietario,
        sexo,
        id_compania,
        foto,
        microchip
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING id_mascota, nombre_mascota, codigo_qr
      `,
      [
        email || null,
        nombre_mascota,
        idraza || 1, // Default raza
        peso || 0,
        tamano || 0,
        color || 'No especificado',
        fecha_de_nacimiento || new Date(),
        esterilizado ?? false,
        id_propietario || 10,
        sexo || 'M',
        id_compania || 1,
        foto || {},
        microchip || null
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error en POST /api/admin/mascotas:', error);

    if (error.code === '23505') {
      return res.status(409).json({
        mensaje: 'Código QR duplicado. Reintenta la creación del registro.',
        error: error.message
      });
    }

    return res.status(500).json({ 
      mensaje: 'Error creando la mascota',
      detalles: error.message
    });
  }
};

export const updateMascota = async (req, res, next) => {
  const { codigo_qr } = req.params;
  const {
    nombre_mascota,
    email,
    color,
    microchip,
    foto,
    sexo
  } = req.body;

  try {
    const result = await query(
      `
      UPDATE public.mascotas
      SET
        nombre_mascota = COALESCE($1, nombre_mascota),
        email = COALESCE($2, email),
        color = COALESCE($3, color),
        microchip = COALESCE($4, microchip),
        foto = COALESCE($5, foto),
        sexo = COALESCE($6, sexo)
      WHERE codigo_qr = $7
      RETURNING id_mascota, nombre_mascota, codigo_qr
      `,
      [nombre_mascota, email, color, microchip, foto, sexo, codigo_qr]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ mensaje: 'Mascota no encontrada' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error en PATCH /api/admin/mascotas:', error);
    return res.status(500).json({ 
      mensaje: 'Error actualizando la mascota',
      detalles: error.message
    });
  }
};

export const getQrImage = async (req, res, next) => {
  const { codigo_qr } = req.params;
  const { portalUrl } = req.query;
  const baseUrl = portalUrl ? decodeURIComponent(portalUrl) : PUBLIC_PORTAL_URL;

  try {
    const publicUrl = `${baseUrl}/mascotas/qr/${codigo_qr}`;

    const qrBase64 = await QRCode.toDataURL(publicUrl, {
      errorCorrectionLevel: 'H',
      width: 320,
      margin: 2
    });

    return res.json({
      codigo_qr,
      publicUrl,
      qrBase64
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ mensaje: 'Error generando QR' });
  }
};
