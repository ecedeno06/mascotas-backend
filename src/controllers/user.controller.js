import db from '../../config/db.js';
import bcrypt from 'bcrypt';

export const getUsers = async (req, res, next) => {
    try {
        const result = await db.query(
            'SELECT email, first_name, last_name, phone, active, created_at FROM users'
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

export const createUser = async (req, res, next) => {
    try {
        const { email, first_name, last_name, password, phone } = req.body;
        
        const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await db.query(
            'INSERT INTO users (email, first_name, last_name, password, phone) VALUES ($1, $2, $3, $4, $5) RETURNING email, first_name, last_name, phone, active',
            [email, first_name, last_name, hashedPassword, phone]
        );

        res.status(201).json({ message: 'Usuario creado exitosamente', user: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

export const getUserByEmail = async (req, res, next) => {
    try {
        const { email } = req.params;
        const result = await db.query(
            'SELECT email, first_name, last_name, phone, active, created_at FROM users WHERE email = $1',
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

export const updateUser = async (req, res, next) => {
    try {
        const { email } = req.params;
        const { first_name, last_name, phone, password } = req.body;
        
        let query = 'UPDATE users SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name), phone = COALESCE($3, phone)';
        let params = [first_name, last_name, phone];
        let paramIndex = 4;
        
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += `, password = $${paramIndex}`;
            params.push(hashedPassword);
            paramIndex++;
        }
        
        query += ` WHERE email = $${paramIndex} RETURNING email, first_name, last_name, phone, active`;
        params.push(email);

        const result = await db.query(query, params);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ message: 'Usuario actualizado', user: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

export const deleteUser = async (req, res, next) => {
    try {
        const { email } = req.params;
        
        const result = await db.query(
            'UPDATE users SET active = false WHERE email = $1 RETURNING email, active',
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json({ message: 'Usuario desactivado', user: result.rows[0] });
    } catch (error) {
        next(error);
    }
};
