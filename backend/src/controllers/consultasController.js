// ============================================================
// SEMAPA - 25 Consultas Estratégicas sobre Cassandra
// Cada función q1..q25 corresponde a una consulta del PDF (págs 13-17)
// ============================================================
import db from '../../db.js';

const dec = v => v != null ? parseFloat(v.toString()) : 0;
const periodoQ = q => q.periodo || new Date().toISOString().slice(0, 7);
const distritoQ = q => q.distrito || 'MOLLE';

// Endpoints simples preexistentes (búsqueda directa)
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

// ============================================================
// Q1: Consumo total por distrito en rango de 8 horas
// Fuente: lecturas_por_medidor_mes (uso fecha_hora.getHours())
// ============================================================
export const q1 = async (req, res) => {
  const p = periodoQ(req.query);
  try {
    const rows = (await db.execute(
      'SELECT distrito, fecha_hora, lectura_m3 FROM lecturas_por_medidor_mes WHERE periodo = ? ALLOW FILTERING',
      [p], { prepare: true }
    )).rows;
    const m = {};
    rows.forEach(r => {
      const h = new Date(r.fecha_hora).getHours();
      const rango = h < 8 ? '00:00-08:00' : h < 16 ? '08:00-16:00' : '16:00-24:00';
      const key = `${r.distrito}|${rango}`;
      if (!m[key]) m[key] = { distrito: r.distrito, hora: rango, consumo_m3: 0 };
      m[key].consumo_m3 += dec(r.lectura_m3);
    });
    const data = Object.values(m).map(r => ({ ...r, consumo_m3: +r.consumo_m3.toFixed(2) }))
      .sort((a, b) => a.distrito.localeCompare(b.distrito) || a.hora.localeCompare(b.hora));
    res.json({ periodo: p, total: data.length, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ============================================================
// Q2: Comparativa de consumo entre las 4 últimas semanas por distrito
// ============================================================
export const q2 = async (req, res) => {
  const p = periodoQ(req.query);
  try {
    const rows = (await db.execute(
      'SELECT distrito, fecha_hora, lectura_m3 FROM lecturas_por_medidor_mes WHERE periodo = ? ALLOW FILTERING',
      [p], { prepare: true }
    )).rows;
    // Agrupar por (distrito, semana_del_mes)
    const m = {};
    rows.forEach(r => {
      const d = new Date(r.fecha_hora);
      const semana = `S${Math.ceil(d.getDate() / 7)}`;
      const key = `${r.distrito}|${semana}`;
      if (!m[key]) m[key] = { distrito: r.distrito, semana, consumo_m3: 0 };
      m[key].consumo_m3 += dec(r.lectura_m3);
    });
    // Pivotar: filas = semanas, columnas = distritos
    const semanas = ['S1', 'S2', 'S3', 'S4'];
    const distritos = [...new Set(Object.values(m).map(v => v.distrito))].sort();
    const data = semanas.map(sem => {
      const row = { semana: sem };
      distritos.forEach(d => {
        const v = m[`${d}|${sem}`];
        row[d] = v ? +v.consumo_m3.toFixed(2) : 0;
      });
      return row;
    });
    res.json({ periodo: p, total: data.length, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ============================================================
// Q3: Contratos residenciales con consumo excesivo (> 45 m³/mes)
// Regla ONU: 300L × 30d × 5hab = 45 m³
// ============================================================
export const q3 = async (req, res) => {
  const p = periodoQ(req.query);
  try {
    const rows = (await db.execute(
      'SELECT numero_contrato, tarifa_alias, consumo_m3 FROM consumo_mensual_por_contrato WHERE periodo = ? ALLOW FILTERING',
      [p], { prepare: true }
    )).rows;
    const data = rows
      .filter(r => ['R1', 'R2', 'R3', 'R4'].includes(r.tarifa_alias) && dec(r.consumo_m3) > 45)
      .map(r => {
        const consumo = dec(r.consumo_m3);
        return {
          contrato: r.numero_contrato,
          tarifa: `Residencial ${r.tarifa_alias}`,
          consumo_m3: +consumo.toFixed(2),
          exceso_pct: +(((consumo - 45) / 45) * 100).toFixed(2),
        };
      })
      .sort((a, b) => b.exceso_pct - a.exceso_pct)
      .slice(0, 100);
    res.json({ periodo: p, total: data.length, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ============================================================
// Q4: Medidores activos por distrito y zona
// ============================================================
export const q4 = async (_req, res) => {
  try {
    const rows = (await db.execute(
      "SELECT distrito, zona, estado FROM medidores_por_distrito_zona WHERE estado = 'activo' ALLOW FILTERING"
    )).rows;
    const m = {};
    rows.forEach(r => {
      const key = `${r.distrito}|${r.zona}`;
      if (!m[key]) m[key] = { distrito: r.distrito, zona: r.zona, medidores_activos: 0 };
      m[key].medidores_activos++;
    });
    const data = Object.values(m).sort((a, b) => b.medidores_activos - a.medidores_activos).slice(0, 60);
    res.json({ total: data.length, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ============================================================
// Q5: Medidores fuera de servicio por distrito y zona
// ============================================================
export const q5 = async (_req, res) => {
  try {
    const rows = (await db.execute(
      "SELECT distrito, zona, estado FROM medidores_por_distrito_zona WHERE estado = 'fuera_servicio' ALLOW FILTERING"
    )).rows;
    const m = {};
    rows.forEach(r => {
      const key = `${r.distrito}|${r.zona}`;
      if (!m[key]) m[key] = { distrito: r.distrito, zona: r.zona, fuera_de_servicio: 0 };
      m[key].fuera_de_servicio++;
    });
    const data = Object.values(m).sort((a, b) => b.fuera_de_servicio - a.fuera_de_servicio).slice(0, 60);
    res.json({ total: data.length, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ============================================================
// Q6: Modelos de medidor con mayor tasa de fallos
// ============================================================
export const q6 = async (req, res) => {
  const p = periodoQ(req.query);
  try {
    const rows = (await db.execute(
      'SELECT periodo, modelo, descripcion_error, cantidad FROM errores_por_modelo_mes ALLOW FILTERING'
    )).rows;
    const m = {};
    rows.filter(r => r.periodo === p).forEach(r => {
      const key = `${r.modelo}|${r.descripcion_error}`;
      if (!m[key]) m[key] = { modelo: r.modelo, fallo: r.descripcion_error, cantidad: 0 };
      m[key].cantidad += r.cantidad || 0;
    });
    const data = Object.values(m).sort((a, b) => b.cantidad - a.cantidad).slice(0, 25);
    res.json({ periodo: p, total: data.length, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ============================================================
// Q7: Consumo promedio mensual en m³ por tarifa (Residencial,
// Comercial, etc.) por distrito (matriz pivoteada)
// ============================================================
export const q7 = async (req, res) => {
  const p = periodoQ(req.query);
  try {
    const rows = (await db.execute(
      'SELECT periodo, distrito, tarifa_alias, consumo_m3 FROM consumo_mensual_por_contrato ALLOW FILTERING'
    )).rows;
    const tarifaACategoria = {
      R1: 'Residencial', R2: 'Residencial', R3: 'Residencial', R4: 'Residencial',
      C: 'Comercial', CE: 'Comercial Especial',
      I: 'Industrial', P: 'Preferencial', S: 'Social',
    };
    const m = {};
    rows.filter(r => r.periodo === p).forEach(r => {
      const cat = tarifaACategoria[r.tarifa_alias] || 'Otra';
      const key = `${r.distrito}|${cat}`;
      if (!m[key]) m[key] = { distrito: r.distrito, categoria: cat, total: 0, count: 0 };
      m[key].total += dec(r.consumo_m3);
      m[key].count++;
    });
    // Pivot
    const distritos = [...new Set(Object.values(m).map(v => v.distrito))].sort();
    const categorias = ['Residencial', 'Comercial', 'Comercial Especial', 'Industrial', 'Preferencial', 'Social'];
    const data = distritos.map(d => {
      const row = { distrito: d };
      categorias.forEach(c => {
        const v = m[`${d}|${c}`];
        row[c] = v && v.count ? +(v.total / v.count).toFixed(0) : 0;
      });
      return row;
    });
    res.json({ periodo: p, total: data.length, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ============================================================
// Q8: Zonas con consumo anómalo (cero o excesivo > 200 m³)
// agrupado por modelo de medidor
// ============================================================
export const q8 = async (req, res) => {
  const p = periodoQ(req.query);
  try {
    const consumos = (await db.execute(
      'SELECT numero_contrato, periodo, zona, consumo_m3 FROM consumo_mensual_por_contrato ALLOW FILTERING'
    )).rows.filter(r => r.periodo === p);
    const medidores = (await db.execute(
      'SELECT numero_contrato, modelo FROM medidores_por_serie'
    )).rows;
    const modeloPorContrato = new Map();
    medidores.forEach(m => modeloPorContrato.set(m.numero_contrato, m.modelo));

    const m = {};
    consumos.forEach(r => {
      const c = dec(r.consumo_m3);
      const anomalo = c === 0 || c > 200;
      if (!anomalo) return;
      const modelo = modeloPorContrato.get(r.numero_contrato) || 'Desconocido';
      if (!m[modelo]) m[modelo] = { modelo, total: 0, zonas: new Set() };
      m[modelo].total++;
      m[modelo].zonas.add(r.zona);
    });
    const data = Object.values(m).map(v => ({
      modelo: v.modelo,
      total: v.total,
      zonas: [...v.zonas].slice(0, 4).join(', '),
    })).sort((a, b) => b.total - a.total);
    res.json({ periodo: p, total: data.length, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ============================================================
// Q9: Matriz de lecturas fallidas (código error × modelo)
// ============================================================
export const q9 = async (req, res) => {
  const p = periodoQ(req.query);
  try {
    const rows = (await db.execute(
      'SELECT periodo, modelo, codigo_error, descripcion_error, cantidad FROM errores_por_modelo_mes ALLOW FILTERING'
    )).rows.filter(r => r.periodo === p);
    const modelos = [...new Set(rows.map(r => r.modelo))].sort();
    const codigos = [...new Set(rows.map(r => r.codigo_error))].sort();
    const data = codigos.map(cod => {
      const row = { codigo: cod, descripcion: rows.find(r => r.codigo_error === cod)?.descripcion_error || '—' };
      modelos.forEach(mod => {
        const f = rows.find(r => r.codigo_error === cod && r.modelo === mod);
        row[mod] = f ? f.cantidad : 0;
      });
      return row;
    });
    res.json({ periodo: p, total: data.length, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ============================================================
// Q10: % de medidores con > 4 años de antigüedad
// ============================================================
export const q10 = async (_req, res) => {
  try {
    const rows = (await db.execute(
      'SELECT fecha_instalacion FROM medidores_por_serie'
    )).rows;
    const hoy = new Date();
    const cuatroAniosAtras = new Date(hoy.getFullYear() - 4, hoy.getMonth(), hoy.getDate());
    let viejos = 0;
    rows.forEach(r => {
      if (!r.fecha_instalacion) return;
      const f = new Date(r.fecha_instalacion);
      if (f < cuatroAniosAtras) viejos++;
    });
    const total = rows.length;
    const data = [{
      total_medidores: total,
      medidores_mas_4_anios: viejos,
      porcentaje: total ? +((viejos / total) * 100).toFixed(2) : 0,
    }];
    res.json({ total: 1, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ============================================================
// Q11: Consumo por zona y categoría residencial (R1-R4)
// ============================================================
export const q11 = async (req, res) => {
  const p = periodoQ(req.query);
  try {
    const rows = (await db.execute(
      'SELECT periodo, zona, tarifa_alias, consumo_m3 FROM consumo_mensual_por_contrato ALLOW FILTERING'
    )).rows.filter(r => r.periodo === p && ['R1', 'R2', 'R3', 'R4'].includes(r.tarifa_alias));
    const m = {};
    rows.forEach(r => {
      if (!m[r.zona]) m[r.zona] = { zona: r.zona, R1: 0, R2: 0, R3: 0, R4: 0 };
      m[r.zona][r.tarifa_alias] += dec(r.consumo_m3);
    });
    const data = Object.values(m).map(v => ({
      zona: v.zona,
      R1: +v.R1.toFixed(0), R2: +v.R2.toFixed(0),
      R3: +v.R3.toFixed(0), R4: +v.R4.toFixed(0),
    })).sort((a, b) => (b.R1 + b.R2 + b.R3 + b.R4) - (a.R1 + a.R2 + a.R3 + a.R4))
      .slice(0, 30);
    res.json({ periodo: p, total: data.length, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ============================================================
// Q12: Top 3 clientes con mayor consumo por distrito en el período
// ============================================================
export const q12 = async (req, res) => {
  const p = periodoQ(req.query);
  try {
    const rows = (await db.execute(
      'SELECT periodo, distrito, numero_contrato, nombre_titular, consumo_m3 FROM consumo_mensual_por_contrato ALLOW FILTERING'
    )).rows.filter(r => r.periodo === p);
    const porDistrito = {};
    rows.forEach(r => {
      if (!porDistrito[r.distrito]) porDistrito[r.distrito] = [];
      porDistrito[r.distrito].push({
        distrito: r.distrito,
        contrato: r.numero_contrato,
        cliente: r.nombre_titular || '—',
        consumo_m3: +dec(r.consumo_m3).toFixed(2),
      });
    });
    const data = [];
    Object.keys(porDistrito).sort().forEach(d => {
      const top3 = porDistrito[d].sort((a, b) => b.consumo_m3 - a.consumo_m3).slice(0, 3);
      data.push(...top3);
    });
    res.json({ periodo: p, total: data.length, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ============================================================
// Q13: Zonas con mayor cantidad de errores (sugieren renovación)
// ============================================================
export const q13 = async (req, res) => {
  const p = periodoQ(req.query);
  try {
    const rows = (await db.execute(
      'SELECT periodo, distrito, zona, codigo_error, descripcion_error, cantidad FROM errores_por_distrito_zona ALLOW FILTERING'
    )).rows.filter(r => r.periodo === p);
    const m = {};
    rows.forEach(r => {
      const key = `${r.distrito}|${r.zona}|${r.codigo_error}`;
      if (!m[key]) m[key] = {
        codigo: r.codigo_error, descripcion: r.descripcion_error,
        distrito: r.distrito, zona: r.zona, reportes: 0,
      };
      m[key].reportes += r.cantidad || 0;
    });
    const data = Object.values(m).sort((a, b) => b.reportes - a.reportes).slice(0, 30);
    res.json({ periodo: p, total: data.length, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ============================================================
// Q14: [Sorpresa 1] Distribución de contratos por tipo de persona × tarifa
// ============================================================
export const q14 = async (_req, res) => {
  try {
    const rows = (await db.execute(
      'SELECT tipo_persona, tarifa_alias, estado FROM contratos_por_numero'
    )).rows;
    const m = {};
    rows.forEach(r => {
      if (!m[r.tarifa_alias]) m[r.tarifa_alias] = { tarifa: r.tarifa_alias, naturales: 0, juridicas: 0, total: 0 };
      if (r.tipo_persona === 'natural') m[r.tarifa_alias].naturales++;
      else m[r.tarifa_alias].juridicas++;
      m[r.tarifa_alias].total++;
    });
    const data = Object.values(m).sort((a, b) => b.total - a.total);
    res.json({ total: data.length, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ============================================================
// Q15: Errores por zona en un distrito específico (parámetro)
// Acepta nombre de subalcaldía ("MOLLE") o de distrito ("Distrito 3").
// ============================================================
export const q15 = async (req, res) => {
  const p = periodoQ(req.query);
  const dist = distritoQ(req.query);
  try {
    // Resolver: si el parámetro coincide con una subalcaldía, mapear a sus distritos
    const catalogo = (await db.execute(
      'SELECT id_distrito, nombre, subalcaldia FROM catalogo_distritos'
    )).rows;
    const distritosBuscar = new Set();
    catalogo.forEach(c => {
      if ((c.subalcaldia || '').toUpperCase() === dist.toUpperCase()) {
        distritosBuscar.add(c.nombre);
      } else if ((c.nombre || '').toUpperCase() === dist.toUpperCase()) {
        distritosBuscar.add(c.nombre);
      }
    });
    // Fallback: match parcial
    if (distritosBuscar.size === 0) {
      catalogo.forEach(c => {
        if ((c.nombre || '').toUpperCase().includes(dist.toUpperCase())
            || (c.subalcaldia || '').toUpperCase().includes(dist.toUpperCase())) {
          distritosBuscar.add(c.nombre);
        }
      });
    }

    const rows = (await db.execute(
      'SELECT periodo, distrito, zona, codigo_error, descripcion_error, cantidad FROM errores_por_distrito_zona ALLOW FILTERING'
    )).rows.filter(r => r.periodo === p && distritosBuscar.has(r.distrito));

    const m = {};
    rows.forEach(r => {
      const key = `${r.distrito}|${r.zona}|${r.codigo_error}`;
      if (!m[key]) m[key] = {
        codigo: r.codigo_error, descripcion: r.descripcion_error,
        distrito: r.distrito, zona: r.zona, reportes: 0,
      };
      m[key].reportes += r.cantidad || 0;
    });
    const data = Object.values(m).sort((a, b) => b.reportes - a.reportes);
    res.json({
      periodo: p, distrito_filtro: dist,
      distritos_resueltos: [...distritosBuscar],
      total: data.length, data,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ============================================================
// Q16: [Sorpresa 2] Cobertura de antenas LoRaWAN (medidores por radiobase × zona)
// ============================================================
export const q16 = async (_req, res) => {
  try {
    const rows = (await db.execute(
      'SELECT radiobase, distrito, zona FROM medidores_por_radiobase_zona'
    )).rows;
    const m = {};
    rows.forEach(r => {
      const key = `${r.radiobase}|${r.zona}`;
      if (!m[key]) m[key] = { radiobase: r.radiobase, zona: r.zona, conexiones: 0 };
      m[key].conexiones++;
    });
    const data = Object.values(m).sort((a, b) => b.conexiones - a.conexiones).slice(0, 30);
    res.json({ total: data.length, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ============================================================
// Q17: Demanda proyectada de agua a 5 años por distrito
// Factor crecimiento poblacional: 2.6%/año
// ============================================================
export const q17 = async (req, res) => {
  const p = periodoQ(req.query);
  try {
    const rows = (await db.execute(
      'SELECT periodo, distrito, consumo_m3 FROM consumo_mensual_por_contrato ALLOW FILTERING'
    )).rows.filter(r => r.periodo === p);
    const m = {};
    rows.forEach(r => {
      if (!m[r.distrito]) m[r.distrito] = { distrito: r.distrito, base: 0 };
      m[r.distrito].base += dec(r.consumo_m3);
    });
    const factor = 1.026;
    const anioBase = parseInt(p.split('-')[0]);
    const data = Object.values(m).map(v => {
      const out = { distrito: v.distrito };
      for (let i = 0; i < 5; i++) {
        out[`${anioBase + i}_m3`] = +(v.base * Math.pow(factor, i)).toFixed(0);
      }
      return out;
    }).sort((a, b) => b[`${anioBase}_m3`] - a[`${anioBase}_m3`]);
    res.json({ periodo: p, total: data.length, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ============================================================
// Q18: [Sorpresa 4] Contratos sin consumo registrado en el período
// ============================================================
export const q18 = async (req, res) => {
  const p = periodoQ(req.query);
  try {
    const contratos = (await db.execute('SELECT numero_contrato, nombre_titular, distrito, zona, tarifa_alias FROM contratos_por_numero')).rows;
    const consumos = (await db.execute(
      'SELECT numero_contrato, periodo FROM consumo_mensual_por_contrato ALLOW FILTERING'
    )).rows.filter(r => r.periodo === p);
    const conConsumo = new Set(consumos.map(c => c.numero_contrato));
    const data = contratos
      .filter(c => !conConsumo.has(c.numero_contrato))
      .slice(0, 100)
      .map(c => ({
        contrato: c.numero_contrato,
        cliente: c.nombre_titular,
        distrito: c.distrito, zona: c.zona, tarifa: c.tarifa_alias,
      }));
    res.json({ periodo: p, total: data.length, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ============================================================
// Q19: Impacto económico de cambio tarifa Preferencial → R4
// ============================================================
export const q19 = async (req, res) => {
  const p = periodoQ(req.query);
  try {
    const rows = (await db.execute(
      'SELECT periodo, tarifa_alias, consumo_m3, monto_bs FROM consumo_mensual_por_contrato ALLOW FILTERING'
    )).rows.filter(r => r.periodo === p && r.tarifa_alias === 'P');
    // Tarifas P y R4 (precios por m³ tope, simplificado)
    const precioP = 4.58;  // $us/m³ tarifa Preferencial
    const precioR4 = 8.69; // $us/m³ tarifa R4
    let nContratos = 0, consumoTotal = 0;
    rows.forEach(r => {
      nContratos++;
      consumoTotal += dec(r.consumo_m3);
    });
    const ingresoP = consumoTotal * precioP;
    const ingresoR4 = consumoTotal * precioR4;
    const data = [{
      contratos_categoria_P: nContratos,
      consumo_total_m3: +consumoTotal.toFixed(0),
      ingreso_actual_P_usd: +ingresoP.toFixed(2),
      ingreso_simulado_R4_usd: +ingresoR4.toFixed(2),
      incremento_usd: +(ingresoR4 - ingresoP).toFixed(2),
    }];
    res.json({ periodo: p, total: 1, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ============================================================
// Q20: Medidores que no reportaron consumo (sin lectura en período)
// ============================================================
export const q20 = async (req, res) => {
  const p = periodoQ(req.query);
  try {
    const medidores = (await db.execute(
      'SELECT numero_serie, distrito, zona, numero_contrato FROM medidores_por_serie'
    )).rows;
    const lecturasMeds = (await db.execute(
      'SELECT numero_serie, periodo FROM lecturas_por_medidor_mes WHERE periodo = ? ALLOW FILTERING',
      [p], { prepare: true }
    )).rows;
    const conLectura = new Set(lecturasMeds.map(l => l.numero_serie));

    const contratos = (await db.execute('SELECT numero_contrato, direccion FROM contratos_por_numero')).rows;
    const dirPorContrato = new Map(contratos.map(c => [c.numero_contrato, c.direccion]));

    const data = medidores
      .filter(m => !conLectura.has(m.numero_serie))
      .slice(0, 100)
      .map(m => ({
        distrito: m.distrito, zona: m.zona,
        direccion: dirPorContrato.get(m.numero_contrato) || '—',
        numero_serie: m.numero_serie,
      }));
    res.json({ periodo: p, total: data.length, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ============================================================
// Q21: Proyección de ingresos por tipo de tarifa del mes
// ============================================================
export const q21 = async (req, res) => {
  const p = periodoQ(req.query);
  try {
    const rows = (await db.execute(
      'SELECT periodo, tarifa_alias, consumo_m3, monto_bs FROM consumo_mensual_por_contrato ALLOW FILTERING'
    )).rows.filter(r => r.periodo === p);
    const tarifaACategoria = {
      R1: 'Residencial', R2: 'Residencial', R3: 'Residencial', R4: 'Residencial',
      C: 'Comercial', CE: 'Comercial Especial',
      I: 'Industrial', P: 'Preferencial', S: 'Social',
    };
    const m = {};
    rows.forEach(r => {
      if (!m[r.tarifa_alias]) m[r.tarifa_alias] = {
        categoria: tarifaACategoria[r.tarifa_alias] || 'Otra',
        alias: r.tarifa_alias,
        consumo_m3: 0, ingresos_bs: 0,
      };
      m[r.tarifa_alias].consumo_m3 += dec(r.consumo_m3);
      m[r.tarifa_alias].ingresos_bs += dec(r.monto_bs);
    });
    const data = Object.values(m).map(v => ({
      ...v,
      consumo_m3: +v.consumo_m3.toFixed(0),
      ingresos_bs: +v.ingresos_bs.toFixed(2),
    })).sort((a, b) => b.ingresos_bs - a.ingresos_bs);
    res.json({ periodo: p, total: data.length, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ============================================================
// Q22: Clientes con consumo mínimo residencial (≤ 12 m³ = solo cargo fijo)
// ============================================================
export const q22 = async (req, res) => {
  const p = periodoQ(req.query);
  try {
    const rows = (await db.execute(
      'SELECT periodo, numero_contrato, nombre_titular, tarifa_alias, consumo_m3, monto_bs FROM consumo_mensual_por_contrato ALLOW FILTERING'
    )).rows.filter(r => r.periodo === p
        && ['R1', 'R2', 'R3', 'R4'].includes(r.tarifa_alias)
        && dec(r.consumo_m3) <= 12);
    const data = rows.slice(0, 100).map(r => ({
      contrato: r.numero_contrato,
      cliente: r.nombre_titular,
      tarifa: r.tarifa_alias,
      consumo_m3: +dec(r.consumo_m3).toFixed(2),
      cargo_fijo_bs: +dec(r.monto_bs).toFixed(2),
    }));
    res.json({ periodo: p, total: rows.length, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ============================================================
// Q23: Ingresos por tipo de tarifa expresados en pies³
// 1 m³ = 35.3147 ft³
// ============================================================
export const q23 = async (req, res) => {
  const p = periodoQ(req.query);
  try {
    const rows = (await db.execute(
      'SELECT periodo, tarifa_alias, consumo_m3, monto_bs FROM consumo_mensual_por_contrato ALLOW FILTERING'
    )).rows.filter(r => r.periodo === p);
    const m = {};
    rows.forEach(r => {
      if (!m[r.tarifa_alias]) m[r.tarifa_alias] = { tarifa: r.tarifa_alias, consumo_m3: 0, ingresos_bs: 0 };
      m[r.tarifa_alias].consumo_m3 += dec(r.consumo_m3);
      m[r.tarifa_alias].ingresos_bs += dec(r.monto_bs);
    });
    const data = Object.values(m).map(v => ({
      tarifa: v.tarifa,
      consumo_m3: +v.consumo_m3.toFixed(0),
      consumo_ft3: +(v.consumo_m3 * 35.3147).toFixed(0),
      ingresos_bs: +v.ingresos_bs.toFixed(2),
    })).sort((a, b) => b.ingresos_bs - a.ingresos_bs);
    res.json({ periodo: p, total: data.length, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ============================================================
// Q24: [Sorpresa] Balance financiero: ingresos por período (recaudación)
// ============================================================
export const q24 = async (_req, res) => {
  try {
    const rows = (await db.execute(
      'SELECT periodo, monto_bs, estado_facturacion FROM consumo_mensual_por_contrato ALLOW FILTERING'
    )).rows;
    const m = {};
    rows.forEach(r => {
      if (!m[r.periodo]) m[r.periodo] = {
        periodo: r.periodo,
        facturado_bs: 0, cobrado_bs: 0, pendiente_bs: 0, vencido_bs: 0,
      };
      const monto = dec(r.monto_bs);
      m[r.periodo].facturado_bs += monto;
      if (r.estado_facturacion === 'pagado' || r.estado_facturacion === 'pagado_atrasado') {
        m[r.periodo].cobrado_bs += monto;
      } else if (r.estado_facturacion === 'pendiente') {
        m[r.periodo].pendiente_bs += monto;
      } else if (r.estado_facturacion === 'vencido') {
        m[r.periodo].vencido_bs += monto;
      }
    });
    const data = Object.values(m).map(v => ({
      periodo: v.periodo,
      facturado_bs: +v.facturado_bs.toFixed(2),
      cobrado_bs: +v.cobrado_bs.toFixed(2),
      pendiente_bs: +v.pendiente_bs.toFixed(2),
      vencido_bs: +v.vencido_bs.toFixed(2),
      tasa_recuperacion_pct: v.facturado_bs ? +((v.cobrado_bs / v.facturado_bs) * 100).toFixed(2) : 0,
    })).sort((a, b) => a.periodo.localeCompare(b.periodo));
    res.json({ total: data.length, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ============================================================
// Q25: Resumen general del sistema SEMAPA
// ============================================================
export const q25 = async (_req, res) => {
  try {
    const medidores = (await db.execute('SELECT estado FROM medidores_por_serie')).rows;
    const contratos = (await db.execute('SELECT estado FROM contratos_por_numero')).rows;
    const consumos = (await db.execute(
      'SELECT periodo, consumo_m3, monto_bs FROM consumo_mensual_por_contrato ALLOW FILTERING'
    )).rows;
    const distritos = (await db.execute('SELECT poblacion FROM catalogo_distritos')).rows;
    const zonas = (await db.execute('SELECT zona FROM catalogo_zonas')).rows;

    const totalConsumo = consumos.reduce((s, r) => s + dec(r.consumo_m3), 0);
    const totalIngresos = consumos.reduce((s, r) => s + dec(r.monto_bs), 0);
    const poblacion = distritos.reduce((s, r) => s + (r.poblacion || 0), 0);

    const data = [{
      total_medidores: medidores.length,
      medidores_activos: medidores.filter(m => m.estado === 'activo').length,
      medidores_inactivos: medidores.filter(m => m.estado === 'inactivo').length,
      medidores_fuera_servicio: medidores.filter(m => m.estado === 'fuera_servicio').length,
      total_contratos: contratos.length,
      contratos_activos: contratos.filter(c => (c.estado || '').toLowerCase() === 'activo').length,
      total_zonas: zonas.length,
      total_distritos: distritos.length,
      poblacion_beneficiaria: poblacion,
      consumo_total_m3: +totalConsumo.toFixed(0),
      ingresos_acumulados_bs: +totalIngresos.toFixed(2),
      consumo_per_capita_m3: poblacion ? +(totalConsumo / poblacion).toFixed(2) : 0,
    }];
    res.json({ total: 1, data });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

// ============================================================
// DISPATCHER — recibe :id (1..25) y llama a la consulta correspondiente
// ============================================================
const HANDLERS = {
  1: q1, 2: q2, 3: q3, 4: q4, 5: q5, 6: q6, 7: q7, 8: q8, 9: q9, 10: q10,
  11: q11, 12: q12, 13: q13, 14: q14, 15: q15, 16: q16, 17: q17, 18: q18,
  19: q19, 20: q20, 21: q21, 22: q22, 23: q23, 24: q24, 25: q25,
};

export const dispatchConsulta = async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id) || !HANDLERS[id]) {
    return res.status(404).json({ error: `Consulta ${req.params.id} no existe (válido: 1-25)` });
  }
  return HANDLERS[id](req, res);
};
