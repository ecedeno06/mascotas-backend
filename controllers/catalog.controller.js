import { query } from '../db.js';

export const getCatalogoRazas = async (req, res, next) => {
  try {
    const result = await query(
      `
      SELECT id_raza, id_especie, descripcion 
      FROM public.catalogo_razas 
      WHERE activo = true 
      ORDER BY descripcion ASC
      `
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener catálogo de razas:', error);
    return res.status(500).json({ 
      mensaje: 'Error al obtener catálogo de razas',
      detalles: error.message 
    });
  }
};

export const getCatalogoEspecies = async (req, res, next) => {
  try {
    const result = await query(
      `
      SELECT id_especie, nombre_especie, descripcion 
      FROM public.catalogo_especies 
      WHERE activo = true 
      ORDER BY nombre_especie ASC
      `
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener catálogo de especies:', error);
    return res.status(500).json({ 
      mensaje: 'Error al obtener catálogo de especies',
      detalles: error.message 
    });
  }
};
