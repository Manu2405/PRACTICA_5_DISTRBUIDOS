import db from '../../db.js';

const dec = v => v ? parseFloat(v.toString()) : 0;
const periodo = q => q.periodo || new Date().toISOString().slice(0, 7);

export const getMapaDistritos = async (req, res) => {
  const p = periodo(req.query);
  try {
    const [distRows, consRows] = await Promise.all([
      db.execute('SELECT id_distrito, nombre, subalcaldia, poblacion, lat, lon FROM catalogo_distritos'),
      db.execute('SELECT distrito, consumo_m3 FROM consumo_mensual_por_contrato WHERE periodo = ? ALLOW FILTERING', [p], { prepare: true }),
    ]);
    const consumoPorDistrito = {};
    consRows.rows.forEach(r => {
      consumoPorDistrito[r.distrito] = (consumoPorDistrito[r.distrito] || 0) + dec(r.consumo_m3);
    });
    const data = distRows.rows.map(d => {
      const consumo = +(consumoPorDistrito[d.nombre] || 0).toFixed(2);
      return {
        id_distrito: d.id_distrito,
        nombre: d.nombre,
        subalcaldia: d.subalcaldia,
        poblacion: d.poblacion || 0,
        lat: dec(d.lat),
        lon: dec(d.lon),
        consumo_m3: consumo,
        indice_presion_hidrica: +(consumo * 0.8).toFixed(2),
      };
    }).filter(d => d.lat !== 0 && d.lon !== 0);
    res.json({ periodo: p, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

export const getKpis = async (req, res) => {
  const p = periodo(req.query);
  try {
    const [consRows, distRows] = await Promise.all([
      db.execute('SELECT distrito, consumo_m3, monto_bs FROM consumo_mensual_por_contrato WHERE periodo = ? ALLOW FILTERING', [p], { prepare: true }),
      db.execute('SELECT nombre, poblacion FROM catalogo_distritos'),
    ]);
    const byDist = {};
    consRows.rows.forEach(r => {
      if (!byDist[r.distrito]) byDist[r.distrito] = { consumo: 0, monto: 0, contratos: 0 };
      byDist[r.distrito].consumo += dec(r.consumo_m3);
      byDist[r.distrito].monto += dec(r.monto_bs);
      byDist[r.distrito].contratos++;
    });
    const distList = Object.entries(byDist).map(([nombre, v]) => ({ nombre, ...v }))
      .sort((a, b) => b.consumo - a.consumo);
    const totalConsumo = distList.reduce((s, d) => s + d.consumo, 0);
    const totalMonto = distList.reduce((s, d) => s + d.monto, 0);
    const totalPob = distRows.rows.reduce((s, r) => s + (r.poblacion || 0), 0);

    // Deuda simulada de Alcaldía a SEMAPA (calculada a partir de los montos totales para dar realismo)
    const deuda_alcaldia_bs = totalMonto * 0.08; 

    // Datos medioambientales (Simulados basados en el consumo total)
    const datosMedioAmbiente = [
      { mes: 'Ene', consumo: totalConsumo * 0.9, temperatura: 24, contaminacion: totalConsumo * 0.003 },
      { mes: 'Feb', consumo: totalConsumo * 0.85, temperatura: 23, contaminacion: totalConsumo * 0.0028 },
      { mes: 'Mar', consumo: totalConsumo * 0.95, temperatura: 25, contaminacion: totalConsumo * 0.0031 },
      { mes: 'Abr', consumo: totalConsumo * 1.0, temperatura: 26, contaminacion: totalConsumo * 0.0033 },
      { mes: 'May', consumo: totalConsumo * 1.05, temperatura: 28, contaminacion: totalConsumo * 0.0035 },
      { mes: 'Jun', consumo: totalConsumo * 1.1, temperatura: 30, contaminacion: totalConsumo * 0.0037 },
      { mes: 'Jul', consumo: totalConsumo * 1.08, temperatura: 29, contaminacion: totalConsumo * 0.0036 },
      { mes: 'Ago', consumo: totalConsumo * 1.15, temperatura: 31, contaminacion: totalConsumo * 0.0039 },
    ].map(m => ({
      ...m,
      consumo: +m.consumo.toFixed(2),
      contaminacion: +m.contaminacion.toFixed(2)
    }));

    res.json({
      periodo: p,
      consumo_total_m3: +totalConsumo.toFixed(2),
      indice_hidrico_total: +(totalConsumo * 0.8).toFixed(2),
      ingresos_esperados_bs: +totalMonto.toFixed(2),
      poblacion_beneficiaria: totalPob,
      deuda_alcaldia_bs: +deuda_alcaldia_bs.toFixed(2),
      top_distrito: distList[0]?.nombre || '—',
      top_consumo_m3: +(distList[0]?.consumo || 0).toFixed(2),
      ranking: distList.slice(0, 5).map(d => ({ nombre: d.nombre, consumo_m3: +d.consumo.toFixed(2) })),
      datosMedioAmbiente
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
