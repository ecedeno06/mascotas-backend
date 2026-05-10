import express from 'express';
import errorMiddleware from './middlewares/error.middleware.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import petRoutes from './routes/pet.routes.js';
import appointmentRoutes from './routes/appointment.routes.js';

const app = express();

app.use(express.json());

app.use('/auth', authRoutes);
app.use('/usuarios', userRoutes);
app.use('/mascotas', petRoutes);
app.use('/citas', appointmentRoutes);

app.get('/', (req, res) => {
    res.send('API Mascotas Funcionando...');
});

app.use(errorMiddleware);

export default app;
