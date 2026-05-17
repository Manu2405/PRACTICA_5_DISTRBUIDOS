import { signToken, verifyToken } from '../../middleware/authMiddleware.js';

function getMobileUsers() {
  try {
    const raw = process.env.MOBILE_USERS;
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [
    { username: 'admin', password: 'admin123', role: 'administrador', nombre: 'Administrador SEMAPA', id: '1' },
    { username: 'lector1', password: 'lector123', role: 'lector', nombre: 'Lector de Campo', id: '2' },
  ];
}

export const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }
  const user = getMobileUsers().find((u) => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

  const payload = { sub: user.id, username: user.username, role: user.role, nombre: user.nombre };
  const accessToken = signToken(payload, '8h');
  const refreshToken = signToken({ ...payload, type: 'refresh' }, '7d');

  res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, username: user.username, role: user.role, nombre: user.nombre },
  });
};

export const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken requerido' });
  try {
    const decoded = verifyToken(refreshToken);
    if (decoded.type !== 'refresh') return res.status(401).json({ error: 'Token inválido' });
    const { sub, username, role, nombre } = decoded;
    const accessToken = signToken({ sub, username, role, nombre }, '8h');
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'Refresh token inválido' });
  }
};
