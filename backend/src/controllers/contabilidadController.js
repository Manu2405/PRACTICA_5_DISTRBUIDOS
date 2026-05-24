import db from '../../db.js';

const dec = v => v ? parseFloat(v.toString()) : 0;
const periodo = q => q.periodo || new Date().toISOString().slice(0, 7);

// Hash determinista 32-bit del numero_contrato. Sirve para asignar
// días de atraso estables a cada contrato (mismo input → mismo output)
// sin tocar generar_datos.js. Reemplaza el Math.random() previo.
function hashContrato(numero) {
  const s = String(numero || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ~20% de los contratos quedan como morosos (determinístico: hash % 5 === 0)
function esMoroso(numero) {
  return hashContrato(numero) % 5 === 0;
}

// Días de atraso 0..150 distribuidos por hash. Reservado para los morosos.
function diasAtrasoMock(numero) {
  return hashContrato(numero) % 151;
}

function bucketDe(dias) {
  if (dias <= 30) return '0-30';
  if (dias <= 60) return '31-60';
  if (dias <= 90) return '61-90';
  return '90+';
}

// Obtiene ingresos por tarifa
export const getIngresosTarifa = async (req, res) => {
  const p = periodo(req.query);
  try {
    const rows = (await db.execute('SELECT periodo, tarifa_alias, consumo_m3, monto_bs FROM consumo_mensual_por_contrato ALLOW FILTERING')).rows;
    const m = {};
    rows.filter(r => r.periodo === p).forEach(r => {
      const t = r.tarifa_alias;
      if (!m[t]) m[t] = { tarifa: t, consumoM3: 0, montoBs: 0, contratos: 0 };
      m[t].consumoM3 += dec(r.consumo_m3); m[t].montoBs += dec(r.monto_bs); m[t].contratos++;
    });
    res.json(Object.values(m).map(t => ({ ...t, consumoM3: +t.consumoM3.toFixed(2), montoBs: +t.montoBs.toFixed(2) })));
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Facturación mensual — serie temporal de todos los períodos
// Obligatorio PDF Dashboard 3 (monto facturado mensual Bs)
export const getFacturacionMensual = async (req, res) => {
  try {
    const rows = (await db.execute(
      'SELECT periodo, monto_bs, consumo_m3 FROM consumo_mensual_por_contrato ALLOW FILTERING'
    )).rows;

    const m = {};
    rows.forEach(r => {
      const p = r.periodo;
      if (!p) return;
      if (!m[p]) m[p] = { periodo: p, montoBs: 0, consumoM3: 0, contratos: 0 };
      m[p].montoBs += dec(r.monto_bs);
      m[p].consumoM3 += dec(r.consumo_m3);
      m[p].contratos++;
    });

    // Orden cronológico ascendente
    const out = Object.values(m)
      .sort((a, b) => a.periodo.localeCompare(b.periodo))
      .map((d, i, arr) => {
        const prev = i > 0 ? arr[i - 1].montoBs : null;
        const variacionPct = prev ? +(((d.montoBs - prev) / prev) * 100).toFixed(1) : 0;
        return {
          ...d,
          montoBs: +d.montoBs.toFixed(2),
          consumoM3: +d.consumoM3.toFixed(2),
          ticketPromedio: d.contratos ? +(d.montoBs / d.contratos).toFixed(2) : 0,
          variacionPct,
        };
      });
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Facturación agrupada por distrito en el período (Obligatorio PDF Dashboard 3)
export const getFacturacionPorDistrito = async (req, res) => {
  const p = periodo(req.query);
  try {
    const rows = (await db.execute(
      'SELECT periodo, distrito, consumo_m3, monto_bs FROM consumo_mensual_por_contrato ALLOW FILTERING'
    )).rows;
    const m = {};
    rows.filter(r => r.periodo === p).forEach(r => {
      const d = r.distrito || 'SIN_DISTRITO';
      if (!m[d]) m[d] = { distrito: d, ingresoBs: 0, consumoM3: 0, contratos: 0 };
      m[d].ingresoBs += dec(r.monto_bs);
      m[d].consumoM3 += dec(r.consumo_m3);
      m[d].contratos++;
    });
    const out = Object.values(m)
      .map(d => ({
        ...d,
        ingresoBs: +d.ingresoBs.toFixed(2),
        consumoM3: +d.consumoM3.toFixed(2),
        ticketPromedio: d.contratos ? +(d.ingresoBs / d.contratos).toFixed(2) : 0,
      }))
      .sort((a, b) => b.ingresoBs - a.ingresoBs);
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Obtiene el top de consumidores
export const getTopConsumidores = async (req, res) => {
  const p = periodo(req.query); const lim = parseInt(req.query.limit || '20');
  try {
    const rows = (await db.execute('SELECT numero_contrato, periodo, nombre_titular, distrito, zona, tarifa_alias, consumo_m3, monto_bs FROM consumo_mensual_por_contrato ALLOW FILTERING')).rows;
    const filtered = rows.filter(r => r.periodo === p).map(r => ({
      contrato: r.numero_contrato, nombre: r.nombre_titular, distrito: r.distrito, zona: r.zona,
      tarifa: r.tarifa_alias, consumoM3: +dec(r.consumo_m3).toFixed(2), montoBs: +dec(r.monto_bs).toFixed(2)
    })).sort((a, b) => b.consumoM3 - a.consumoM3).slice(0, lim);
    res.json(filtered);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// Obtiene los deudores morosos (Obligatorio PDF Dashboard 3 — soporte para "cartera vencida")
// Mock determinístico por hash de numero_contrato. Mismo contrato → mismo atraso siempre.
export const getMorosos = async (req, res) => {
  const p = periodo(req.query);
  try {
    const rows = (await db.execute(
      'SELECT numero_contrato, periodo, nombre_titular, distrito, zona, monto_bs FROM consumo_mensual_por_contrato ALLOW FILTERING'
    )).rows;

    const morosos = rows
      .filter(r => r.periodo === p && esMoroso(r.numero_contrato))
      .map(r => {
        const dias = diasAtrasoMock(r.numero_contrato);
        const mesesAtraso = Math.max(1, Math.floor(dias / 30));
        return {
          contrato: r.numero_contrato,
          nombre: r.nombre_titular,
          distrito: r.distrito,
          zona: r.zona,
          mesesAtraso,
          diasAtraso: dias,
          bucket: bucketDe(dias),
          deudaTotalBs: +(dec(r.monto_bs) * mesesAtraso).toFixed(2),
        };
      })
      .sort((a, b) => b.deudaTotalBs - a.deudaTotalBs)
      .slice(0, 50);

    res.json(morosos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Cartera vencida con desglose por antigüedad (aging report)
// Obligatorio PDF Dashboard 3
export const getCarteraVencida = async (req, res) => {
  const p = periodo(req.query);
  try {
    const rows = (await db.execute(
      'SELECT numero_contrato, periodo, monto_bs FROM consumo_mensual_por_contrato ALLOW FILTERING'
    )).rows;

    // Inicializa buckets en orden fijo
    const buckets = {
      '0-30':  { rango: '0-30 días',  contratos: 0, totalBs: 0, color: '#10b981' },
      '31-60': { rango: '31-60 días', contratos: 0, totalBs: 0, color: '#f59e0b' },
      '61-90': { rango: '61-90 días', contratos: 0, totalBs: 0, color: '#f97316' },
      '90+':   { rango: '90+ días',   contratos: 0, totalBs: 0, color: '#ef4444' },
    };

    let totalContratos = 0;
    let totalBs = 0;
    let sumaDias = 0;

    rows
      .filter(r => r.periodo === p && esMoroso(r.numero_contrato))
      .forEach(r => {
        const dias = diasAtrasoMock(r.numero_contrato);
        const mesesAtraso = Math.max(1, Math.floor(dias / 30));
        const deuda = dec(r.monto_bs) * mesesAtraso;
        const b = bucketDe(dias);
        buckets[b].contratos += 1;
        buckets[b].totalBs += deuda;
        totalContratos += 1;
        totalBs += deuda;
        sumaDias += dias;
      });

    const out = Object.values(buckets).map(b => ({
      ...b,
      totalBs: +b.totalBs.toFixed(2),
      pctMonto: totalBs ? +(b.totalBs / totalBs * 100).toFixed(1) : 0,
    }));

    res.json({
      periodo: p,
      totalBs: +totalBs.toFixed(2),
      totalContratos,
      edadPromedioDias: totalContratos ? +(sumaDias / totalContratos).toFixed(1) : 0,
      buckets: out,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Envia el aviso de cobranza
export const sendAvisoCobranza = async (req, res) => {
  const { contrato, nombre, deudaTotalBs } = req.body;
  if (!contrato || !nombre) {
    return res.status(400).json({ error: 'Faltan datos del deudor' });
  }

  try {
    // Aquí iría la lógica de integración con email/SMS/WhatsApp
    const mensaje = `Estimado(a) ${nombre}, le recordamos que tiene una deuda pendiente de Bs ${deudaTotalBs} asociada al contrato ${contrato}. Por favor, regularice su pago.`;
    
    // Simulamos éxito
    res.json({ estado: 'enviado', mensaje, canales: ['WhatsApp', 'SMS', 'Email'] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
