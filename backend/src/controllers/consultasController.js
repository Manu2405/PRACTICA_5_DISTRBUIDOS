import db from '../../db.js';

const dec = v => v ? parseFloat(v.toString()) : 0;

export const getContrato = async (req, res) => {
  try { 
    const r = (await db.execute('SELECT * FROM contratos_por_numero WHERE numero_contrato = ?', [req.params.n], { prepare: true })).rows[0];
    if (!r) return res.status(404).json({ error: 'No encontrado' }); 
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getMedidor = async (req, res) => {
  try { 
    const r = (await db.execute('SELECT * FROM medidores_por_serie WHERE numero_serie = ?', [req.params.s], { prepare: true })).rows[0];
    if (!r) return res.status(404).json({ error: 'No encontrado' }); 
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getConsumo = async (req, res) => {
  try { 
    const rows = (await db.execute('SELECT periodo, consumo_m3, monto_bs, estado_facturacion FROM consumo_mensual_por_contrato WHERE numero_contrato = ?', [req.params.c], { prepare: true })).rows;
    res.json(rows.map(r => ({ periodo: r.periodo, consumoM3: +dec(r.consumo_m3).toFixed(2), montoBs: +dec(r.monto_bs).toFixed(2), estado: r.estado_facturacion })));
  } catch (e) { res.status(500).json({ error: e.message }); }
};
