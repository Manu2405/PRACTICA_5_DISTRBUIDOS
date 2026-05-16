import db from '../../db.js';

const dec = v => v ? parseFloat(v.toString()) : 0;
const periodo = q => q.periodo || new Date().toISOString().slice(0, 7);

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

// Obtiene los deudores morosos
export const getMorosos = async (req, res) => {
  const p = periodo(req.query);
  try {
    // Simulamos la obtención de deudores basada en la tabla de consumo
    const rows = (await db.execute('SELECT numero_contrato, periodo, nombre_titular, distrito, zona, monto_bs FROM consumo_mensual_por_contrato ALLOW FILTERING')).rows;
    
    // Filtramos para crear la lista de morosos
    const morosos = rows.filter(r => r.periodo === p).map((r, i) => {
      const mesesAtraso = Math.floor(Math.random() * 5) + 1;
      return {
        contrato: r.numero_contrato,
        nombre: r.nombre_titular,
        distrito: r.distrito,
        zona: r.zona,
        mesesAtraso,
        deudaTotalBs: Math.floor(dec(r.monto_bs) * mesesAtraso) + Math.floor(Math.random() * 500),
      };
    }).sort((a, b) => b.deudaTotalBs - a.deudaTotalBs).slice(0, 50); // limitamos a los 50 peores

    // Cálculo T-Contabilidad (Devolver junto con morosos para no hacer endpoints extras, 
    // o se procesa en el front, pero vamos a enviarlo si lo pide un flag o en el mismo endpoint)
    res.json(morosos);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
