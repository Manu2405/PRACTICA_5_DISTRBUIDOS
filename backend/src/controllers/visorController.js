import db from '../../db.js';

const dec = v => (v != null ? parseFloat(v.toString()) : 0);
const periodoDefault = q => q.periodo || new Date().toISOString().slice(0, 7);

// Departamentos bolivianos — el CI en el CSV viene como "9619417 CBBA"
const DEPTS = ['CBBA', 'LPZ', 'SCZ', 'ORU', 'POT', 'TJA', 'SCR', 'BEN', 'PAN'];

// Genera variantes posibles del número de contrato a partir de cualquier input.
// El frontend del visor manda "CONT-XX-XXXXXX" pero la DB tiene "CT-XXXXXXXX".
// Esta función prueba todas las combinaciones posibles.
const buildContratoVariants = (q) => {
  const variants = new Set();
  variants.add(q);

  // Quitar prefijos y dashes para obtener solo los dígitos
  const soloDigitos = q.replace(/^(CONT-|CT-)/i, '').replace(/-/g, '');

  if (soloDigitos !== q) {
    variants.add(`CT-${soloDigitos}`);
    variants.add(`CT-${soloDigitos.padStart(8, '0')}`);
    variants.add(`CONT-${soloDigitos}`);
  }

  // Si es solo dígitos, probar como número de contrato sin prefijo
  if (/^\d+$/.test(q)) {
    variants.add(`CT-${q}`);
    variants.add(`CT-${q.padStart(8, '0')}`);
    variants.add(`CONT-${q}`);
  }

  // Formato CONT-XX-XXXXXX → también CT-XX_XXXXXX (sin guion intermedio)
  const matchContXX = q.match(/^CONT-(\d{2})-(\d{6})$/i);
  if (matchContXX) {
    variants.add(`CT-${matchContXX[1]}${matchContXX[2]}`);
    variants.add(`CT-${(matchContXX[1] + matchContXX[2]).padStart(8, '0')}`);
  }

  return [...variants];
};

// Construye la respuesta final del visor
const buildResponse = async (contrato, p) => {
  let consumo_m3 = 0, monto_bs = 0;
  try {
    const cm = (await db.execute(
      'SELECT consumo_m3, monto_bs FROM consumo_mensual_por_contrato WHERE numero_contrato = ? AND periodo = ?',
      [contrato.numero_contrato, p], { prepare: true }
    )).rows[0];
    if (cm) {
      consumo_m3 = dec(cm.consumo_m3);
      monto_bs = dec(cm.monto_bs);
    }
  } catch { /* sin consumo en este período */ }

  // Historial completo
  const historialRows = (await db.execute(
    'SELECT periodo, consumo_m3, monto_bs, estado_facturacion, fecha_vencimiento, dias_atraso FROM consumo_mensual_por_contrato WHERE numero_contrato = ?',
    [contrato.numero_contrato], { prepare: true }
  )).rows;

  const historial = historialRows.map(r => ({
    periodo: r.periodo,
    consumo_m3: +dec(r.consumo_m3).toFixed(2),
    monto_bs: +dec(r.monto_bs).toFixed(2),
    estado: r.estado_facturacion || 'pendiente',
    fecha_vencimiento: r.fecha_vencimiento ? String(r.fecha_vencimiento) : null,
    dias_atraso: r.dias_atraso || 0,
  })).sort((a, b) => b.periodo.localeCompare(a.periodo));

  // Si el período pedido no tiene datos, usar el más reciente disponible
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

// GET /api/visor/buscar?q=...&periodo=...
// Acepta: número de contrato (cualquier formato), CI, o serie de medidor
export const buscar = async (req, res) => {
  const q = (req.query.q || '').trim();
  const p = periodoDefault(req.query);
  if (!q) return res.status(400).json({ error: 'Falta parámetro q' });

  try {
    let contrato = null;

    // 1) Búsqueda por número de contrato (probando variantes de formato)
    for (const variant of buildContratoVariants(q)) {
      const rows = (await db.execute(
        'SELECT * FROM contratos_por_numero WHERE numero_contrato = ?',
        [variant], { prepare: true }
      )).rows;
      if (rows.length > 0) { contrato = rows[0]; break; }
    }

    // 2) Búsqueda por CI (con sufijos de departamento)
    if (!contrato) {
      const variantesCI = [q];
      // Si es puro número, agregar variantes con departamento
      if (/^\d+$/.test(q)) {
        for (const d of DEPTS) variantesCI.push(`${q} ${d}`);
      }
      // Con índice secundario sobre identificador_titular no necesita ALLOW FILTERING
      for (const v of variantesCI) {
        const rows = (await db.execute(
          'SELECT * FROM contratos_por_numero WHERE identificador_titular = ?',
          [v], { prepare: true }
        )).rows;
        if (rows.length > 0) { contrato = rows[0]; break; }
      }
    }

    // 3) Búsqueda por serie/MAC de medidor (acepta con o sin ":")
    if (!contrato) {
      const serieNormalizada = q.toUpperCase().replace(/:/g, '');
      const medRows = (await db.execute(
        'SELECT numero_contrato FROM medidores_por_serie WHERE numero_serie = ?',
        [serieNormalizada], { prepare: true }
      )).rows;
      if (medRows.length > 0) {
        const ctRows = (await db.execute(
          'SELECT * FROM contratos_por_numero WHERE numero_contrato = ?',
          [medRows[0].numero_contrato], { prepare: true }
        )).rows;
        if (ctRows.length > 0) contrato = ctRows[0];
      }
    }

    if (!contrato) {
      return res.status(404).json({
        error: 'No se encontró el contrato. Verifica el número de contrato, CI o serie del medidor.',
      });
    }

    res.json(await buildResponse(contrato, p));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// POST /api/visor/pagar
// Marca uno o más períodos como pagados. Body: { numero_contrato, periodos: [...] }
export const pagar = async (req, res) => {
  const { numero_contrato, periodos } = req.body;
  if (!numero_contrato || !Array.isArray(periodos) || periodos.length === 0) {
    return res.status(400).json({ error: 'Faltan número de contrato o períodos' });
  }

  try {
    const ahora = new Date();
    for (const per of periodos) {
      await db.execute(
        'UPDATE consumo_mensual_por_contrato SET estado_facturacion = ?, fecha_pago = ?, dias_atraso = ? WHERE numero_contrato = ? AND periodo = ?',
        ['pagado', ahora, 0, numero_contrato, per], { prepare: true }
      );
    }
    res.json({ ok: true, contrato: numero_contrato, pagados: periodos });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
