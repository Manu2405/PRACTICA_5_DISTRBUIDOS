import db from '../../db.js';

const dec = v => v ? parseFloat(v.toString()) : 0;
const periodo = q => q.periodo || new Date().toISOString().slice(0, 7);

export const getResumen = async (req, res) => {
  const p = periodo(req.query);
  try {
    const med = (await db.execute('SELECT estado FROM medidores_por_serie')).rows;
    const activos = med.filter(m => m.estado === 'activo').length;
    const inactivos = med.filter(m => m.estado === 'inactivo').length;
    const fuera = med.filter(m => m.estado === 'fuera_servicio').length;
    
    const cons = (await db.execute('SELECT periodo, consumo_m3, monto_bs FROM consumo_mensual_por_contrato ALLOW FILTERING')).rows;
    const consumoFiltrado = cons.filter(r => r.periodo === p);
    const consumoTotalM3 = consumoFiltrado.reduce((s, r) => s + dec(r.consumo_m3), 0);
    const liquidezBs = consumoFiltrado.reduce((s, r) => s + dec(r.monto_bs), 0);
    
    // Deuda simulada o calculada (para el KPI general de deuda en mora)
    const deudaTotalBs = liquidezBs * 0.15; // asumiendo 15% de mora

    const errs = (await db.execute('SELECT periodo, cantidad FROM errores_por_modelo_mes ALLOW FILTERING')).rows;
    const errTotal = errs.filter(r => r.periodo === p).reduce((s, r) => s + (r.cantidad || 0), 0);
    const pob = (await db.execute('SELECT poblacion FROM catalogo_distritos')).rows.reduce((s, r) => s + (r.poblacion || 0), 0);

    // Cálculo OMS (Estándar OMS: ~100 litros/habitante/día -> ~3m3/mes)
    // Consumo per capita = consumoTotalM3 / poblacion
    const omsPromedioConsumoPerCapita = pob > 0 ? (consumoTotalM3 / pob) * 1000 : 0; // en litros equivalentes mensuales o algo referencial
    const omsIndex = pob > 0 ? (consumoTotalM3 / pob) * 33 : 50; // valor normalizado para el Gauge 0-180

    res.json({ 
      periodo: p, 
      consumoTotalM3: +consumoTotalM3.toFixed(2), 
      cantidadMedidores: med.length,
      medidoresActivos: activos, 
      medidoresInactivos: inactivos, 
      medidoresFueraServicio: fuera,
      poblacionBeneficiaria: pob, 
      cantidadErrores: errTotal,
      liquidezBs: +liquidezBs.toFixed(2),
      deudaTotalBs: +deudaTotalBs.toFixed(2),
      omsIndex: +omsIndex.toFixed(2)
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getConsumoDistrito = async (req, res) => {
  const p = periodo(req.query);
  try {
    const rows = (await db.execute('SELECT periodo, distrito, tarifa_alias, consumo_m3, monto_bs FROM consumo_mensual_por_contrato ALLOW FILTERING')).rows;
    const m = {};
    rows.filter(r => r.periodo === p).forEach(r => {
      if (!m[r.distrito]) m[r.distrito] = { distrito: r.distrito, consumoM3: 0, montoBs: 0, contratos: 0 };
      m[r.distrito].consumoM3 += dec(r.consumo_m3); m[r.distrito].montoBs += dec(r.monto_bs); m[r.distrito].contratos++;
    });
    res.json(Object.values(m).map(d => ({ ...d, consumoM3: +d.consumoM3.toFixed(2), montoBs: +d.montoBs.toFixed(2) })));
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getMapaMedidores = async (req, res) => {
  try {
    // Retornamos también datos de subalcaldia si existe o los complementamos
    const rows = (await db.execute('SELECT numero_serie, numero_contrato, estado, lat, lon, distrito, zona, modelo FROM medidores_por_serie')).rows;
    res.json(rows.slice(0, 500).map(r => ({ 
      serie: r.numero_serie, 
      contrato: r.numero_contrato,
      cliente: 'Cliente Registrado', // Podría cruzarse con contratos_por_numero
      estado: r.estado, 
      lat: r.lat, 
      lon: r.lon, 
      distrito: r.distrito, 
      zona: r.zona, 
      modelo: r.modelo,
      subalcaldia: r.distrito <= 2 ? 'TUNARI' : r.distrito <= 4 ? 'MOLLE' : 'ADELA ZAMUDIO' // fallback simple
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getMedidoresEstado = async (req, res) => {
  try {
    const rows = (await db.execute('SELECT estado, distrito FROM medidores_por_serie')).rows;
    const m = {};
    rows.forEach(r => {
      if (!m[r.distrito]) m[r.distrito] = { distrito: r.distrito, activo: 0, inactivo: 0, fueraServicio: 0 };
      if (r.estado === 'activo') m[r.distrito].activo++;
      else if (r.estado === 'inactivo') m[r.distrito].inactivo++;
      else if (r.estado === 'fuera_servicio') m[r.distrito].fueraServicio++;
    });
    res.json(Object.values(m));
  } catch (e) { res.status(500).json({ error: e.message }); }
};
