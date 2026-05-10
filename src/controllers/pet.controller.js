import db from '../../config/db.js';

export const getPets = async (req, res, next) => {
    try {
        const result = await db.query('SELECT * FROM pets');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

export const getPetById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM pets WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Mascota no encontrada' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

export const createPet = async (req, res, next) => {
    try {
        const { name, species, breed, birth_date, gender, weight, notes } = req.body;
        const owner_email = req.user.email;

        const result = await db.query(
            'INSERT INTO pets (name, species, breed, birth_date, gender, weight, owner_email, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [name, species, breed, birth_date, gender, weight, owner_email, notes]
        );

        res.status(201).json({ message: 'Mascota creada exitosamente', pet: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

export const updatePet = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, species, breed, birth_date, gender, weight, notes } = req.body;
        
        const result = await db.query(
            'UPDATE pets SET name = COALESCE($1, name), species = COALESCE($2, species), breed = COALESCE($3, breed), birth_date = COALESCE($4, birth_date), gender = COALESCE($5, gender), weight = COALESCE($6, weight), notes = COALESCE($7, notes) WHERE id = $8 RETURNING *',
            [name, species, breed, birth_date, gender, weight, notes, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Mascota no encontrada' });
        }

        res.json({ message: 'Mascota actualizada', pet: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

export const deletePet = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'UPDATE pets SET active = false WHERE id = $1 RETURNING id, active',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Mascota no encontrada' });
        }
        
        res.json({ message: 'Mascota desactivada', pet: result.rows[0] });
    } catch (error) {
        next(error);
    }
};
