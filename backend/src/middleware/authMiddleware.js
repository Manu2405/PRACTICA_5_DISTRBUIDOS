import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'semapa-mobile-dev-secret-change-in-prod';

export { JWT_SECRET };

export function signToken(payload, expiresIn = '8h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function requireAuth(roles = []) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token requerido' });
    }
    try {
      const decoded = verifyToken(header.slice(7));
      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Sin permisos' });
      }
      req.user = decoded;
      next();
    } catch {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
  };
}
