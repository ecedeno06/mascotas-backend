import { query } from '../db.js';
import crypto from 'crypto';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { createSession, getRolesUsuario, SESSION_DURATION_HOURS } from './session.helper.js';

// Encriptación simétrica para guardar el secret key del 2FA de forma segura
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getEncryptionKey() {
  const rawKey = process.env.CRYPTO_SECRET_KEY;
  if (!rawKey) {
    throw new Error('Error de configuración: CRYPTO_SECRET_KEY no está definida en las variables de entorno.');
  }

  if (rawKey.length === 64) {
    try {
      const hexBuf = Buffer.from(rawKey, 'hex');
      if (hexBuf.length === 32) return hexBuf;
    } catch (e) {}
  }
  const buf = Buffer.from(rawKey);
  if (buf.length === 32) return buf;

  throw new Error('Error de configuración: CRYPTO_SECRET_KEY debe tener exactamente 32 caracteres (o 64 caracteres en formato hexadecimal).');
}

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  try {
    const key = getEncryptionKey();
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Error al desencriptar secret de 2FA:', error);
    throw new Error('No se pudo desencriptar el secreto de 2FA. Verifique CRYPTO_SECRET_KEY.');
  }
}

export const login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ mensaje: 'Correo y contraseña son requeridos' });
  }

  try {
    const userResult = await query(
      'SELECT "idUsuario", nombre, email, password, two_factor_enabled FROM public.usuarios WHERE email ILIKE $1 AND activo = true',
      [email.trim()]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }

    const user = userResult.rows[0];

    // Comparación directa de contraseñas
    if (user.password !== password) {
      return res.status(401).json({ mensaje: 'Credenciales inválidas' });
    }

    // Si el usuario ya tiene 2FA habilitado, solicitamos 2FA (no devolvemos token aún)
    if (user.two_factor_enabled) {
      return res.json({
        requiresOtp: false,
        requires2FA: true,
        idUsuario: String(user.idUsuario),
        email: user.email,
        mensaje: 'Primer factor correcto. Se requiere autenticación de doble factor (2FA).'
      });
    }

    // Si NO tiene 2FA habilitado — verificar cuántos roles tiene
    const roles = await getRolesUsuario(user.idUsuario);

    // Con más de 1 rol → el frontend mostrará la pantalla de selección (no crear sesión aún)
    if (roles.length > 1) {
      return res.json({
        requiresOtp: false,
        requires2FA: false,
        requiresRolSelection: true,
        idUsuario: String(user.idUsuario),
        nombre: user.nombre,
        email: user.email,
        roles
      });
    }

    // Con 0 o 1 rol → crear sesión de inmediato
    const session = await createSession(user.idUsuario);
    const rolActivo = roles[0] ?? null;

    return res.json({
      requiresOtp: false,
      requires2FA: false,
      requiresRolSelection: false,
      success: true,
      token: session.token,
      expiresIn: session.expiresIn,
      usuario: {
        idUsuario: String(user.idUsuario),
        email: user.email,
        nombre: user.nombre,
        rolActivo,
        twoFactorEnabled: false
      },
      mensaje: 'Inicio de sesión exitoso. Se recomienda configurar 2FA.'
    });

  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({
      mensaje: 'Error interno en el servidor durante el login',
      detalles: error.message
    });
  }
};

export const verifyOtp = async (req, res, next) => {
  const { idUsuario, otp } = req.body;

  if (!idUsuario || !otp) {
    return res.status(400).json({ mensaje: 'ID de usuario y código OTP son requeridos' });
  }

  try {
    const userResult = await query(
      'SELECT "idUsuario", nombre, email, totp FROM public.usuarios WHERE "idUsuario" = $1 AND activo = true',
      [idUsuario]
    );

    if (userResult.rowCount === 0) {
      return res.status(401).json({ mensaje: 'Usuario no encontrado o inactivo' });
    }

    const user = userResult.rows[0];

    if (!user.totp || user.totp !== otp.trim()) {
      return res.status(401).json({ mensaje: 'Código OTP inválido o expirado' });
    }

    // Limpiar el OTP usado
    await query(
      'UPDATE public.usuarios SET totp = NULL WHERE "idUsuario" = $1',
      [user.idUsuario]
    );

    const roles = await getRolesUsuario(user.idUsuario);

    if (roles.length > 1) {
      return res.json({
        requiresRolSelection: true,
        idUsuario: String(user.idUsuario),
        nombre: user.nombre,
        email: user.email,
        roles
      });
    }

    const session = await createSession(user.idUsuario);
    const rolActivo = roles[0] ?? null;

    return res.json({
      success: true,
      requiresRolSelection: false,
      token: session.token,
      expiresIn: session.expiresIn,
      usuario: {
        idUsuario: String(user.idUsuario),
        email: user.email,
        nombre: user.nombre,
        rolActivo,
        twoFactorEnabled: false
      }
    });

  } catch (error) {
    console.error('Error en verificación de OTP:', error);
    return res.status(500).json({
      mensaje: 'Error interno en el servidor durante la verificación del OTP',
      detalles: error.message
    });
  }
};

// --- ENDPOINTS PARA CONFIGURAR Y CONTROLAR 2FA (TOTP) ---

// 1. Iniciar Configuración de 2FA (Genera QR y Secreto)
export const setup2FA = async (req, res, next) => {
  const { idUsuario } = req.body;

  if (!idUsuario) {
    return res.status(400).json({ mensaje: 'El ID de usuario es requerido' });
  }

  try {
    const userResult = await query(
      'SELECT email FROM public.usuarios WHERE "idUsuario" = $1',
      [idUsuario]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const user = userResult.rows[0];

    // Generar clave secreta TOTP única
    const secret = authenticator.generateSecret();

    // Crear la URI estándar para el enrolamiento en el autenticador
    const otpauth = authenticator.keyuri(user.email, 'VetNet', secret);

    // Generar imagen QR en Base64
    QRCode.toDataURL(otpauth, (err, qrCode) => {
      if (err) {
        return res.status(500).json({ mensaje: 'Error al generar código QR' });
      }
      return res.json({
        secret,
        qrCode
      });
    });

  } catch (error) {
    next(error);
  }
};

// 2. Confirmar y Activar 2FA (Valida el primer código)
export const enable2FA = async (req, res, next) => {
  const { idUsuario, secret, code } = req.body;

  if (!idUsuario || !secret || !code) {
    return res.status(400).json({ mensaje: 'ID de usuario, secreto y código de verificación son requeridos' });
  }

  try {
    // Validar el código TOTP ingresado
    const isValid = authenticator.check(code, secret);

    if (!isValid) {
      return res.status(400).json({ mensaje: 'Código de verificación incorrecto' });
    }

    // Encriptar el secret key antes de guardarlo en Supabase
    const encryptedSecret = encrypt(secret);

    await query(
      'UPDATE public.usuarios SET two_factor_secret = $1, two_factor_enabled = true WHERE "idUsuario" = $2',
      [encryptedSecret, idUsuario]
    );

    return res.json({ success: true, mensaje: 'Autenticación de doble factor activada correctamente' });

  } catch (error) {
    next(error);
  }
};

// 3. Desactivar 2FA (requiere código de verificación)
export const disable2FA = async (req, res, next) => {
  const { idUsuario, code } = req.body;

  if (!idUsuario || !code) {
    return res.status(400).json({ mensaje: 'El ID de usuario y el código de verificación son requeridos' });
  }

  try {
    // Obtener el secreto encriptado del usuario
    const userResult = await query(
      'SELECT two_factor_secret, two_factor_enabled FROM public.usuarios WHERE "idUsuario" = $1 AND activo = true',
      [idUsuario]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado o inactivo' });
    }

    const user = userResult.rows[0];

    if (!user.two_factor_enabled || !user.two_factor_secret) {
      return res.status(400).json({ mensaje: 'El doble factor no está habilitado para este usuario' });
    }

    // Desencriptar el secreto y verificar el código TOTP
    const secret = decrypt(user.two_factor_secret);
    const isValid = authenticator.check(code, secret);

    if (!isValid) {
      return res.status(400).json({ mensaje: 'Código de verificación incorrecto. No se desactivó el 2FA.' });
    }

    // Código válido: proceder a desactivar
    await query(
      'UPDATE public.usuarios SET two_factor_secret = NULL, two_factor_enabled = false WHERE "idUsuario" = $1',
      [idUsuario]
    );

    return res.json({ success: true, mensaje: 'Autenticación de doble factor desactivada correctamente' });

  } catch (error) {
    next(error);
  }
};

// 4. Verificar login con código 2FA
export const verifyLogin2FA = async (req, res, next) => {
  const { idUsuario, code } = req.body;

  if (!idUsuario || !code) {
    return res.status(400).json({ mensaje: 'ID de usuario y código son requeridos' });
  }

  try {
    const userResult = await query(
      'SELECT "idUsuario", nombre, email, two_factor_secret, two_factor_enabled FROM public.usuarios WHERE "idUsuario" = $1 AND activo = true',
      [idUsuario]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado o inactivo' });
    }

    const user = userResult.rows[0];

    if (!user.two_factor_enabled || !user.two_factor_secret) {
      return res.status(400).json({ mensaje: 'Doble factor no está configurado para este usuario' });
    }

    // Desencriptar el secreto de Supabase
    const secret = decrypt(user.two_factor_secret);

    // Verificar el código actual
    const isValid = authenticator.check(code, secret);

    if (!isValid) {
      return res.status(400).json({ mensaje: 'Código de verificación incorrecto' });
    }

    // Verificar cuántos roles tiene el usuario
    const roles = await getRolesUsuario(user.idUsuario);

    if (roles.length > 1) {
      return res.json({
        requiresRolSelection: true,
        idUsuario: String(user.idUsuario),
        nombre: user.nombre,
        email: user.email,
        roles
      });
    }

    const session = await createSession(user.idUsuario);
    const rolActivo = roles[0] ?? null;

    return res.json({
      success: true,
      requiresRolSelection: false,
      token: session.token,
      expiresIn: session.expiresIn,
      usuario: {
        idUsuario: String(user.idUsuario),
        email: user.email,
        nombre: user.nombre,
        rolActivo,
        twoFactorEnabled: true
      }
    });

  } catch (error) {
    next(error);
  }
};

// --- SELECCIÓN DE ROL ---

// Confirma el rol elegido por el usuario, valida y crea la sesión
export const selectRol = async (req, res, next) => {
  const { idUsuario, idRol, idVeterinaria } = req.body;

  if (!idUsuario || !idRol || !idVeterinaria) {
    return res.status(400).json({ mensaje: 'Se requieren idUsuario, idRol e idVeterinaria' });
  }

  try {
    const check = await query(
      `SELECT ur.idrol, ur.idveterinaria, ur.activo,
              cr.codigo, v.nombre AS "nombreVeterinaria",
              u.nombre, u.email, u.two_factor_enabled
       FROM public.usuario_rol ur
       LEFT JOIN public.catalogo_rol cr ON cr.idrol        = ur.idrol
       LEFT JOIN public.veterinaria  v  ON v.idveterinaria = ur.idveterinaria
       LEFT JOIN public.usuarios u       ON u."idUsuario"    = ur.idusuario
       WHERE ur.idusuario = $1 AND ur.idrol = $2 AND ur.idveterinaria = $3 AND ur.activo = true`,
      [idUsuario, idRol, idVeterinaria]
    );

    if (check.rowCount === 0) {
      return res.status(403).json({ mensaje: 'El rol seleccionado no es válido para este usuario' });
    }

    const rol = check.rows[0];
    const session = await createSession(idUsuario);

    return res.json({
      success: true,
      token: session.token,
      expiresIn: session.expiresIn,
      usuario: {
        idUsuario: String(idUsuario),
        nombre: rol.nombre,
        email: rol.email,
        twoFactorEnabled: !!rol.two_factor_enabled,
        rolActivo: {
          idRol: rol.idrol,
          rol: rol.codigo,
          idVeterinaria: rol.idveterinaria,
          nombreVeterinaria: rol.nombreVeterinaria
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// --- ENDPOINTS DE GESTIÓN DE SESIÓN ---

// Cerrar sesión (invalidar token en BD)
export const logout = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(400).json({ mensaje: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    await query(
      'UPDATE public.sesiones SET activo = false WHERE token = $1',
      [token]
    );

    return res.json({ success: true, mensaje: 'Sesión cerrada correctamente' });
  } catch (error) {
    next(error);
  }
};

// Renovar sesión (extender expiración)
export const refreshSession = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(400).json({ mensaje: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const result = await query(
      'SELECT id FROM public.sesiones WHERE token = $1 AND activo = true AND expira_en > NOW()',
      [token]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ mensaje: 'Sesión expirada o inválida' });
    }

    const newExpiry = new Date();
    newExpiry.setHours(newExpiry.getHours() + SESSION_DURATION_HOURS);

    await query(
      'UPDATE public.sesiones SET expira_en = $1 WHERE token = $2',
      [newExpiry.toISOString(), token]
    );

    return res.json({
      success: true,
      expiresIn: SESSION_DURATION_HOURS * 60 * 60 * 1000,
      mensaje: 'Sesión renovada correctamente'
    });
  } catch (error) {
    next(error);
  }
};

// Obtener configuración de tiempos de sesión para el frontend
export const getSessionConfig = async (req, res, next) => {
  try {
    const inactivityLimitMin = Number(process.env.SESSION_INACTIVITY_LIMIT_MINUTES) || 15;
    const warningBeforeMin = Number(process.env.SESSION_WARNING_BEFORE_MINUTES) || 2;
    const refreshIntervalMin = Number(process.env.SESSION_REFRESH_INTERVAL_MINUTES) || 10;

    return res.json({
      inactivityLimitMs: inactivityLimitMin * 60 * 1000,
      warningBeforeMs: warningBeforeMin * 60 * 1000,
      refreshIntervalMs: refreshIntervalMin * 60 * 1000
    });
  } catch (error) {
    next(error);
  }
};
