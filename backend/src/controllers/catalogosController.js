import db from '../../db.js';

export const getDistritos = async (req, res) => {
  try { res.json((await db.execute('SELECT id_distrito, nombre, subalcaldia, poblacion, lat, lon FROM catalogo_distritos')).rows); } 
  catch (e) { res.status(500).json({ error: e.message }); }
};

export const getTarifas = async (req, res) => {
  try { res.json((await db.execute('SELECT * FROM catalogo_tarifas')).rows); } 
  catch (e) { res.status(500).json({ error: e.message }); }
};

export const getGateways = async (req, res) => {
  try { res.json((await db.execute('SELECT * FROM catalogo_gateways')).rows); } 
  catch (e) { res.status(500).json({ error: e.message }); }
};

export const getContratos = async (req, res) => {
  const l = parseInt(req.query.limit || '50');
  try { res.json((await db.execute(`SELECT * FROM contratos_por_numero LIMIT ${l}`)).rows); } 
  catch (e) { res.status(500).json({ error: e.message }); }
};
