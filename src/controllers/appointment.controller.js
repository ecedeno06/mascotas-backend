import db from '../../config/db.js';

export const getAppointments = async (req, res, next) => {
    try {
        const result = await db.query('SELECT * FROM appointments');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

export const getAppointmentById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM appointments WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cita no encontrada' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

export const createAppointment = async (req, res, next) => {
    try {
        const { pet_id, date, time, reason, status, veterinarian, notes } = req.body;
        
        const result = await db.query(
            'INSERT INTO appointments (pet_id, date, time, reason, status, veterinarian, notes) VALUES ($1, $2, $3, $4, COALESCE($5, \'PENDING\'), $6, $7) RETURNING *',
            [pet_id, date, time, reason, status, veterinarian, notes]
        );

        res.status(201).json({ message: 'Cita creada exitosamente', appointment: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

export const updateAppointment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { date, time, reason, status, veterinarian, notes } = req.body;
        
        const result = await db.query(
            'UPDATE appointments SET date = COALESCE($1, date), time = COALESCE($2, time), reason = COALESCE($3, reason), status = COALESCE($4, status), veterinarian = COALESCE($5, veterinarian), notes = COALESCE($6, notes) WHERE id = $7 RETURNING *',
            [date, time, reason, status, veterinarian, notes, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cita no encontrada' });
        }

        res.json({ message: 'Cita actualizada', appointment: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

export const deleteAppointment = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const result = await db.query(
            'UPDATE appointments SET status = \'CANCELLED\' WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cita no encontrada' });
        }
        
        res.json({ message: 'Cita cancelada', appointment: result.rows[0] });
    } catch (error) {
        next(error);
    }
};
