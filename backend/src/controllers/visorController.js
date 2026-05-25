import db from '../../db.js';

const dec = v => v ? parseFloat(v.toString()) : 0;
const periodoDefault = q => q.periodo || new Date().toISOString().slice(0, 7);

const DEPTS = ['CBBA', 'LPZ', 'SCZ', 'ORU', 'POT', 'TJA', 'SCR', 'BEN', 'PAN'];

const buildResponse = async (contrato, p) => {
  let consumo_m3 = 0, monto_bs = 0;
  try {
    const cm = (await db.execute(
      'SELECT consumo_m3, monto_bs FROM consumo_mensual_por_contrato WHERE numero_contrato = ? AND periodo = ?',
      [contrato.numero_contrato, p], { prepare: true }
    )).rows[0];
    if (cm) { consumo_m3 = dec(cm.consumo_m3); monto_bs = dec(cm.monto_bs); }
  } catch { /* sin consumo */ }

  const historialRows = (await db.execute(
    'SELECT periodo, consumo_m3, monto_bs, estado_facturacion, fecha_vencimiento, dias_atraso FROM consumo_mensual_por_contrato WHERE numero_contrato = ?',
    [contrato.numero_contrato], { prepare: true }
  )).rows;

  const historial = historialRows.map(r => ({
    periodo: r.periodo,
    consumo_m3: +dec(r.consumo_m3).toFixed(2),
    monto_bs: +dec(r.monto_bs).toFixed(2),
    estado: r.estado_facturacion || 'pendiente',
    fecha_vencimiento: r.fecha_vencimiento || null,
    dias_atraso: r.dias_atraso || 0,
  })).sort((a, b) => b.periodo.localeCompare(a.periodo));

  const periodoFinal = historial.length > 0 && consumo_m3 === 0 ? historial[0].periodo : p;
  if (periodoFinal !== p && historial.length > 0) {
    consumo_m3 = historial[0].consumo_m3;
    monto_bs = historial[0].monto_bs;
  }

  return {
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
  };
};

export const buscar = async (req, res) => {
  const q = (req.query.q || '').trim();
  const p = periodoDefault(req.query);
  if (!q) return res.status(400).json({ error: 'Falta parámetro q' });

  try {
    let contrato = null;

    // 1. Buscar por número de contrato exacto
    const ctRows = (await db.execute(
      'SELECT * FROM contratos_por_numero WHERE numero_contrato = ?',
      [q], { prepare: true }
    )).rows;
    if (ctRows.length > 0) contrato = ctRows[0];

    // 2. Buscar por CI — prueba el valor exacto y con sufijos de departamento
    if (!contrato) {
      const variants = [q, ...(/^\d+$/.test(q) ? DEPTS.map(d => `${q} ${d}`) : [])];
      for (const v of variants) {
        const ciRows = (await db.execute(
          'SELECT * FROM contratos_por_numero WHERE identificador_titular = ? ALLOW FILTERING',
          [v], { prepare: true }
        )).rows;
        if (ciRows.length > 0) { contrato = ciRows[0]; break; }
      }
    }

    // 3. Buscar por serie de medidor
    if (!contrato) {
      const medRows = (await db.execute(
        'SELECT numero_contrato FROM medidores_por_serie WHERE numero_serie = ?',
        [q], { prepare: true }
      )).rows;
      if (medRows.length > 0) {
        const ctByMed = (await db.execute(
          'SELECT * FROM contratos_por_numero WHERE numero_contrato = ?',
          [medRows[0].numero_contrato], { prepare: true }
        )).rows;
        if (ctByMed.length > 0) contrato = ctByMed[0];
      }
    }

    if (!contrato) return res.status(404).json({ error: 'No se encontró el contrato. Verifica el número o CI.' });

    res.json(await buildResponse(contrato, p));
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const pagar = async (req, res) => {
  const { numero_contrato, periodos } = req.body;
  if (!numero_contrato || !Array.isArray(periodos) || periodos.length === 0)
    return res.status(400).json({ error: 'Faltan número de contrato o períodos' });

  try {
    const ahora = new Date();
    for (const per of periodos) {
      await db.execute(
        'UPDATE semapa.consumo_mensual_por_contrato SET estado_facturacion = ?, fecha_pago = ? WHERE numero_contrato = ? AND periodo = ?',
        ['pagado', ahora, numero_contrato, per], { prepare: true }
      );
    }
    res.json({ ok: true, pagados: periodos });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
