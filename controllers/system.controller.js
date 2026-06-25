export const getHealth = (req, res) => {
  res.json({ ok: true, service: 'qr-mascotas-backend' });
};
