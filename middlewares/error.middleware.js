export default function errorMiddleware(err, req, res, next) {
  console.error('❌ Error no controlado en el backend:', err);
  
  const status = err.status || 500;
  const message = err.message || 'Error interno en el servidor';
  
  res.status(status).json({
    mensaje: message,
    detalles: err.stack || err.message
  });
}
