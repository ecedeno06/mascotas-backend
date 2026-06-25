import express from 'express';
import cors from 'cors';
import systemRoutes from './routes/system.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import authRoutes from './routes/auth.routes.js';
import petRoutes from './routes/pet.routes.js';
import adminRoutes from './routes/admin.routes.js';
import publicRoutes from './routes/public.routes.js';
import errorMiddleware from './middlewares/error.middleware.js';
import authMiddleware from './middlewares/auth.middleware.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Endpoint raíz
app.get('/', (req, res) => {
  res.send('API Mascotas Funcionando...');
});

// Rutas públicas (no requieren token)
app.use('/', catalogRoutes); // Para soportar /api/catalogo-razas y /catalogo-razas
app.use('/api', systemRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', publicRoutes);

// Rutas protegidas (requieren token de sesión válido)
app.use('/api', authMiddleware, petRoutes);
app.use('/api', authMiddleware, adminRoutes);

// Middleware centralizado de manejo de errores
app.use(errorMiddleware);

export default app;
