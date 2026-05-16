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
