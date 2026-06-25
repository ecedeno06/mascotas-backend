import app from './app.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n==================================================`);
  console.log(`🚀 SERVIDOR BACKEND MODULARIZADO ESCUCHANDO EN:`);
  console.log(`👉 Local:   http://localhost:${PORT}`);
  console.log(`👉 Red:     http://192.168.0.2:${PORT}`);
  console.log(`==================================================\n`);
});
