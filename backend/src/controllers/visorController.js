import db from '../../db.js';

const dec = v => v ? parseFloat(v.toString()) : 0;
const periodo = q => q.periodo || new Date().toISOString().slice(0, 7);

export const buscar = async (req, res) => {
  const q = (req.query.q || '').trim();
  const p = periodo(req.query);
  if (!q) return res.status(400).json({ error: 'Falta parámetro q' });
  try {
    let contrato = null;

    // Buscar por número de contrato (ej: CONT-01-123456)
    const ctRows = (await db.execute('SELECT * FROM contratos_por_numero WHERE numero_contrato = ?', [q], { prepare: true })).rows;
    if (ctRows.length > 0) {
      contrato = ctRows[0];
    } else {
      // Buscar por serie de medidor
      const medRows = (await db.execute('SELECT numero_contrato FROM medidores_por_serie WHERE numero_serie = ?', [q], { prepare: true })).rows;
      if (medRows.length > 0) {
        const ctByMed = (await db.execute('SELECT * FROM contratos_por_numero WHERE numero_contrato = ?', [medRows[0].numero_contrato], { prepare: true })).rows;
        if (ctByMed.length > 0) contrato = ctByMed[0];
      }
    }

    if (!contrato) return res.status(404).json({ error: 'No se encontró el contrato. Verifica el número.' });

    // Consumo del período
    let consumo_m3 = 0, monto_bs = 0;
    try {
      const cm = (await db.execute('SELECT consumo_m3, monto_bs FROM consumo_mensual_por_contrato WHERE numero_contrato = ? AND periodo = ?',
        [contrato.numero_contrato, p], { prepare: true })).rows[0];
      if (cm) { consumo_m3 = dec(cm.consumo_m3); monto_bs = dec(cm.monto_bs); }
    } catch { /* sin consumo para este periodo */ }

    // Historial completo de consumos
    const historialRows = (await db.execute(
      'SELECT periodo, consumo_m3, monto_bs, estado_facturacion FROM consumo_mensual_por_contrato WHERE numero_contrato = ?',
      [contrato.numero_contrato], { prepare: true }
    )).rows;
    const historial = historialRows.map(r => ({
      periodo: r.periodo,
      consumo_m3: +dec(r.consumo_m3).toFixed(2),
      monto_bs: +dec(r.monto_bs).toFixed(2),
      estado: r.estado_facturacion || 'pendiente',
    })).sort((a, b) => b.periodo.localeCompare(a.periodo));

    // Si el período pedido no tiene datos, usar el más reciente con datos
    const periodoFinal = historial.length > 0 && consumo_m3 === 0
      ? historial[0].periodo : p;
    if (periodoFinal !== p && historial.length > 0) {
      consumo_m3 = historial[0].consumo_m3;
      monto_bs = historial[0].monto_bs;
    }

    res.json({
      contrato: contrato.numero_contrato,
      nombre: contrato.nombre_titular,
      identificador: contrato.identificador_titular,
      tipo_persona: contrato.tipo_persona,
      direccion: contrato.direccion,
      distrito: contrato.distrito,
      zona: contrato.zona,
      tarifa: contrato.tarifa_alias,
      consumo_m3: +consumo_m3.toFixed(2),
      monto_bs: +monto_bs.toFixed(2),
      periodo: periodoFinal,
      historial,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
