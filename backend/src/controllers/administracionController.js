import db from '../../db.js';

const periodo = q => q.periodo || new Date().toISOString().slice(0, 7);

export const getErroresModelo = async (req, res) => {
  const p = periodo(req.query);
  try {
    const rows = (await db.execute('SELECT periodo, modelo, codigo_error, descripcion_error, cantidad FROM errores_por_modelo_mes ALLOW FILTERING')).rows;
    res.json(rows.filter(r => r.periodo === p).map(r => ({ periodo: r.periodo, modelo: r.modelo, codigoError: r.codigo_error, descripcion: r.descripcion_error, cantidad: r.cantidad })));
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getErroresDistrito = async (req, res) => {
  const p = periodo(req.query);
  try {
    const rows = (await db.execute('SELECT periodo, distrito, zona, codigo_error, descripcion_error, cantidad FROM errores_por_distrito_zona ALLOW FILTERING')).rows;
    res.json(rows.filter(r => r.periodo === p).map(r => ({ periodo: r.periodo, distrito: r.distrito, zona: r.zona, codigoError: r.codigo_error, descripcion: r.descripcion_error, cantidad: r.cantidad })));
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Lecturas registradas por app móvil (Obligatorio PDF Dashboard 2)
// Cuenta filas en lecturas_por_medidor_mes con origen='app_movil', agrupando por distrito.
export const getLecturasApp = async (req, res) => {
  const p = periodo(req.query);
  try {
    const rows = (await db.execute(
      "SELECT periodo, distrito, zona, origen FROM lecturas_por_medidor_mes WHERE origen = 'app_movil' ALLOW FILTERING"
    )).rows;
    const filtered = rows.filter(r => r.periodo === p);
    const porDistrito = {};
    filtered.forEach(r => {
      const d = r.distrito || 'SIN_DISTRITO';
      if (!porDistrito[d]) porDistrito[d] = { distrito: d, cantidad: 0 };
      porDistrito[d].cantidad++;
    });
    res.json({
      periodo: p,
      total: filtered.length,
      porDistrito: Object.values(porDistrito).sort((a, b) => b.cantidad - a.cantidad),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
