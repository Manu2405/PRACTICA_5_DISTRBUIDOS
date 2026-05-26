// 25 Consultas Estratégicas SEMAPA
// Corregidas según documento oficial y hoja Excel de recursos
const dec = v => v ? parseFloat(v.toString()) : 0;

export function registrarConsultas(app, db) {

  const wrap = (num, titulo, fn) => app.get(`/api/consultas/${num}`, async (req, res) => {
    try {
      const data = await fn(req);
      res.json({ consulta: num, titulo, periodo: req.query.periodo || '', data, total: data.length });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Q1: Consumo total por distrito en rangos de 8 horas ───────────────────
  // Fuente: lecturas_por_medidor_mes — 3 lecturas/día por franja horaria
  // Samplea 15 medidores por distrito para evitar full-scan
  wrap(1, 'Consumo total por distrito en rangos de 8 horas', async (req) => {
    const p = req.query.periodo || new Date().toISOString().slice(0, 7);

    const medRows = (await db.execute('SELECT numero_serie, distrito FROM medidores_por_serie')).rows;
    const byDist = {};
    medRows.forEach(m => {
      if (!m.distrito || !m.numero_serie) return;
      if (!byDist[m.distrito]) byDist[m.distrito] = [];
      if (byDist[m.distrito].length < 15) byDist[m.distrito].push(m.numero_serie);
    });

    const result = {};
    await Promise.all(Object.entries(byDist).map(async ([distrito, series]) => {
      result[distrito] = { rango_00_08: 0, rango_08_16: 0, rango_16_24: 0 };
      const allLecturas = (await Promise.all(
        series.map(serie =>
          db.execute(
            'SELECT fecha_hora, lectura_m3 FROM lecturas_por_medidor_mes WHERE numero_serie = ? AND periodo = ?',
            [serie, p], { prepare: true }
          ).then(r => r.rows).catch(() => [])
        )
      )).flat();

      allLecturas.forEach(l => {
        const h = new Date(l.fecha_hora).getHours();
        const v = dec(l.lectura_m3);
        if (h < 8) result[distrito].rango_00_08 += v;
        else if (h < 16) result[distrito].rango_08_16 += v;
        else result[distrito].rango_16_24 += v;
      });
    }));

    return Object.entries(result).map(([d, v]) => ({
      distrito: d,
      rango_00_08_m3: +v.rango_00_08.toFixed(2),
      rango_08_16_m3: +v.rango_08_16.toFixed(2),
      rango_16_24_m3: +v.rango_16_24.toFixed(2),
      total_m3: +(v.rango_00_08 + v.rango_08_16 + v.rango_16_24).toFixed(2),
    })).sort((a, b) => b.total_m3 - a.total_m3);
  });

  // ── Q2: Comparativa consumo últimas 4 semanas (periodos) por distrito ─────
  // Muestra los 4 periodos más recientes con top 3 distritos como columnas
  wrap(2, 'Comparativa de consumo entre las 4 últimas semanas por distrito', async () => {
    const rows = (await db.execute('SELECT periodo, distrito, consumo_m3 FROM consumo_mensual_por_contrato')).rows;

    const periodos = [...new Set(rows.map(r => r.periodo))].sort().slice(-4);

    // Totales por periodo+distrito
    const agg = {};
    rows.forEach(r => {
      if (!periodos.includes(r.periodo)) return;
      if (!agg[r.periodo]) agg[r.periodo] = {};
      agg[r.periodo][r.distrito] = (agg[r.periodo][r.distrito] || 0) + dec(r.consumo_m3);
    });

    // Top 3 distritos por consumo total
    const distTotals = {};
    rows.forEach(r => { distTotals[r.distrito] = (distTotals[r.distrito] || 0) + dec(r.consumo_m3); });
    const topDists = Object.entries(distTotals).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);

    return periodos.map((p, i) => {
      const row = { semana: `S${i + 1}`, periodo: p };
      topDists.forEach(d => { row[`${d}_m3`] = +((agg[p]?.[d] || 0).toFixed(2)); });
      return row;
    });
  });

  // ── Q3: Contratos residenciales con consumo excesivo > 45 m³ ─────────────
  // 45 m³ = 300 L/día × 30 días × 5 habitantes (referencia ONU)
  wrap(3, 'Contratos residenciales con consumo excesivo (> 45 m³/mes)', async (req) => {
    const p = req.query.periodo || '2026-04';
    const rows = (await db.execute(
      'SELECT numero_contrato, nombre_titular, distrito, zona, tarifa_alias, consumo_m3, monto_bs FROM consumo_mensual_por_contrato'
    )).rows;
    return rows
      .filter(r => r.periodo === p && r.tarifa_alias?.startsWith('R') && dec(r.consumo_m3) > 45)
      .map(r => ({
        contrato: r.numero_contrato,
        cliente: r.nombre_titular,
        distrito: r.distrito,
        zona: r.zona,
        tarifa: r.tarifa_alias,
        consumo_m3: +dec(r.consumo_m3).toFixed(2),
        consumo_litros: +(dec(r.consumo_m3) * 1000).toFixed(0),
        limite_onu_m3: 45,
        exceso_pct: +(((dec(r.consumo_m3) - 45) / 45) * 100).toFixed(2),
        monto: +dec(r.monto_bs).toFixed(2),
      }))
      .sort((a, b) => b.consumo_m3 - a.consumo_m3);
  });

  // ── Q4: Medidores activos por distrito y zona ─────────────────────────────
  wrap(4, 'Medidores activos por distrito y zona', async () => {
    const rows = (await db.execute('SELECT distrito, zona, estado FROM medidores_por_serie')).rows;
    const m = {};
    rows.filter(r => r.estado === 'activo').forEach(r => {
      const k = `${r.distrito}|${r.zona}`;
      if (!m[k]) m[k] = { distrito: r.distrito, zona: r.zona, medidores_activos: 0 };
      m[k].medidores_activos++;
    });
    return Object.values(m).sort((a, b) => b.medidores_activos - a.medidores_activos);
  });

  // ── Q5: Medidores fuera de servicio por distrito y zona ───────────────────
  wrap(5, 'Medidores fuera de servicio por distrito y zona', async () => {
    const rows = (await db.execute('SELECT distrito, zona, estado FROM medidores_por_serie')).rows;
    const m = {};
    rows.filter(r => r.estado !== 'activo').forEach(r => {
      const k = `${r.distrito}|${r.zona}`;
      if (!m[k]) m[k] = { distrito: r.distrito, zona: r.zona, fuera_servicio: 0, inactivos: 0 };
      if (r.estado === 'fuera_servicio') m[k].fuera_servicio++;
      else m[k].inactivos++;
    });
    return Object.values(m)
      .map(v => ({ ...v, total_sin_servicio: v.fuera_servicio + v.inactivos }))
      .sort((a, b) => b.total_sin_servicio - a.total_sin_servicio);
  });

  // ── Q6: Modelos con mayor tasa de fallos ──────────────────────────────────
  wrap(6, 'Modelos de medidor con mayor tasa de fallos', async (req) => {
    const p = req.query.periodo || '2026-04';
    const rows = (await db.execute(
      'SELECT periodo, modelo, codigo_error, descripcion_error, cantidad FROM errores_por_modelo_mes'
    )).rows;
    const m = {};
    rows.filter(r => r.periodo === p).forEach(r => {
      if (!m[r.modelo]) m[r.modelo] = { modelo: r.modelo, total_fallos: 0, tipos_error: new Set() };
      m[r.modelo].total_fallos += (r.cantidad || 0);
      if (r.descripcion_error) m[r.modelo].tipos_error.add(r.descripcion_error);
    });
    return Object.values(m)
      .map(v => ({ modelo: v.modelo, total_fallos: v.total_fallos, fallos_reportados: [...v.tipos_error].join(' | ') }))
      .sort((a, b) => b.total_fallos - a.total_fallos);
  });

  // ── Q7: Consumo total mensual por tarifa y distrito (pivot) ───────────────
  wrap(7, 'Consumo mensual por categoría de tarifa y distrito', async (req) => {
    const p = req.query.periodo || '2026-04';
    const rows = (await db.execute(
      'SELECT periodo, distrito, tarifa_alias, consumo_m3 FROM consumo_mensual_por_contrato'
    )).rows;
    const m = {};
    rows.filter(r => r.periodo === p).forEach(r => {
      if (!m[r.distrito]) m[r.distrito] = { distrito: r.distrito, Residencial: 0, Comercial: 0, Comercial_Especial: 0, Industrial: 0, Preferencial: 0, Social: 0 };
      const v = dec(r.consumo_m3);
      const t = r.tarifa_alias || '';
      if (t.startsWith('R')) m[r.distrito].Residencial += v;
      else if (t === 'C') m[r.distrito].Comercial += v;
      else if (t === 'CE') m[r.distrito].Comercial_Especial += v;
      else if (t === 'I') m[r.distrito].Industrial += v;
      else if (t === 'P') m[r.distrito].Preferencial += v;
      else if (t === 'S') m[r.distrito].Social += v;
    });
    return Object.values(m)
      .map(v => ({
        distrito: v.distrito,
        residencial_m3: +v.Residencial.toFixed(0),
        comercial_m3: +v.Comercial.toFixed(0),
        comercial_especial_m3: +v.Comercial_Especial.toFixed(0),
        industrial_m3: +v.Industrial.toFixed(0),
        preferencial_m3: +v.Preferencial.toFixed(0),
        social_m3: +v.Social.toFixed(0),
      }))
      .sort((a, b) => b.residencial_m3 - a.residencial_m3);
  });

  // ── Q8: Consumo anómalo — modelos con errores y zonas afectadas ───────────
  wrap(8, 'Modelos con consumo anómalo y distribución en zonas afectadas', async (req) => {
    const p = req.query.periodo || '2026-04';
    const errRows = (await db.execute(
      'SELECT periodo, modelo, cantidad FROM errores_por_modelo_mes'
    )).rows;
    const medRows = (await db.execute('SELECT modelo, zona FROM medidores_por_serie')).rows;

    // Totales de errores por modelo
    const errByModel = {};
    errRows.filter(r => r.periodo === p).forEach(r => {
      errByModel[r.modelo] = (errByModel[r.modelo] || 0) + (r.cantidad || 0);
    });

    // Zonas afectadas por modelo (vía medidores)
    const zonasByModel = {};
    medRows.forEach(m => {
      if (!m.modelo || !m.zona) return;
      if (!zonasByModel[m.modelo]) zonasByModel[m.modelo] = new Set();
      zonasByModel[m.modelo].add(m.zona);
    });

    return Object.entries(errByModel).map(([modelo, total]) => ({
      modelo,
      total_errores: total,
      zonas: [...(zonasByModel[modelo] || new Set())].slice(0, 6).join(', '),
      cantidad_zonas: (zonasByModel[modelo] || new Set()).size,
    })).sort((a, b) => b.total_errores - a.total_errores);
  });

  // ── Q9: Lecturas fallidas por tipo de medidor — matriz código × modelo ─────
  wrap(9, 'Lecturas fallidas por tipo de medidor (matriz error × modelo)', async (req) => {
    const p = req.query.periodo || '2026-04';
    const errRows = (await db.execute(
      'SELECT periodo, modelo, codigo_error, descripcion_error, cantidad FROM errores_por_modelo_mes'
    )).rows;
    const errIot = (await db.execute('SELECT codigo, descripcion FROM catalogo_errores_iot')).rows;
    const descMap = {};
    errIot.forEach(e => { descMap[e.codigo] = e.descripcion; });

    const filtered = errRows.filter(r => r.periodo === p);
    const modelos = [...new Set(filtered.map(r => r.modelo))].sort();
    const codigos = [...new Set(filtered.map(r => r.codigo_error))].sort((a, b) => a - b);

    return codigos.map(cod => {
      const row = {
        codigo: cod,
        descripcion: descMap[cod] || filtered.find(r => r.codigo_error === cod)?.descripcion_error || `Error ${cod}`,
      };
      modelos.forEach(mod => {
        const found = filtered.find(r => r.modelo === mod && r.codigo_error === cod);
        row[mod] = found ? (found.cantidad || 0) : 0;
      });
      return row;
    });
  });

  // ── Q10: % medidores con más de 10 años de antigüedad ────────────────────
  wrap(10, 'Porcentaje de medidores con más de 10 años de antigüedad', async () => {
    const rows = (await db.execute('SELECT fecha_instalacion, modelo FROM medidores_por_serie')).rows;
    const hoy = new Date();
    const limite = new Date(hoy.getFullYear() - 10, hoy.getMonth(), hoy.getDate());
    const antiguos = rows.filter(r => r.fecha_instalacion && new Date(r.fecha_instalacion) < limite);

    const porModelo = {};
    antiguos.forEach(r => { if (r.modelo) porModelo[r.modelo] = (porModelo[r.modelo] || 0) + 1; });

    const resumen = [{
      tipo: 'RESUMEN',
      total_medidores: rows.length,
      medidores_mas_10_anios: antiguos.length,
      porcentaje_pct: +((antiguos.length / (rows.length || 1)) * 100).toFixed(2),
      modelo: '—',
      cantidad: '—',
    }];
    const detalle = Object.entries(porModelo)
      .sort((a, b) => b[1] - a[1])
      .map(([modelo, cantidad]) => ({ tipo: 'POR MODELO', total_medidores: rows.length, medidores_mas_10_anios: antiguos.length, porcentaje_pct: '—', modelo, cantidad }));
    return [...resumen, ...detalle];
  });

  // ── Q11: Consumo total por zona y categoría residencial ────────────────────
  wrap(11, 'Consumo total por zona y categoría residencial (R1, R2, R3, R4)', async (req) => {
    const p = req.query.periodo || '2026-04';
    const rows = (await db.execute(
      'SELECT periodo, zona, tarifa_alias, consumo_m3 FROM consumo_mensual_por_contrato'
    )).rows;
    const m = {};
    rows.filter(r => r.periodo === p && r.tarifa_alias?.startsWith('R') && r.zona).forEach(r => {
      if (!m[r.zona]) m[r.zona] = { zona: r.zona, R1: 0, R2: 0, R3: 0, R4: 0 };
      if (['R1', 'R2', 'R3', 'R4'].includes(r.tarifa_alias)) {
        m[r.zona][r.tarifa_alias] += dec(r.consumo_m3);
      }
    });
    return Object.values(m)
      .map(v => ({
        zona: v.zona,
        R1_m3: +v.R1.toFixed(0),
        R2_m3: +v.R2.toFixed(0),
        R3_m3: +v.R3.toFixed(0),
        R4_m3: +v.R4.toFixed(0),
        total_m3: +(v.R1 + v.R2 + v.R3 + v.R4).toFixed(0),
      }))
      .sort((a, b) => b.total_m3 - a.total_m3);
  });

  // ── Q12: Top 3 clientes con mayor consumo por distrito ────────────────────
  wrap(12, 'Top 3 clientes con mayor consumo por distrito del mes activo', async (req) => {
    const p = req.query.periodo || '2026-04';
    const rows = (await db.execute(
      'SELECT periodo, distrito, numero_contrato, nombre_titular, consumo_m3 FROM consumo_mensual_por_contrato'
    )).rows;
    const byDist = {};
    rows.filter(r => r.periodo === p).forEach(r => {
      if (!byDist[r.distrito]) byDist[r.distrito] = [];
      byDist[r.distrito].push({
        distrito: r.distrito,
        servicio: r.numero_contrato,
        cliente: r.nombre_titular || '—',
        consumo_m3: +dec(r.consumo_m3).toFixed(2),
      });
    });
    const result = [];
    Object.values(byDist).forEach(arr => {
      arr.sort((a, b) => b.consumo_m3 - a.consumo_m3).slice(0, 3).forEach((c, i) => {
        result.push({ ranking: i + 1, ...c });
      });
    });
    return result.sort((a, b) => String(a.distrito).localeCompare(String(b.distrito)));
  });

  // ── Q13: Zonas que requieren renovación por errores reportados ────────────
  wrap(13, 'Zonas que requieren renovación por errores reportados', async (req) => {
    const p = req.query.periodo || '2026-04';
    const errRows = (await db.execute(
      'SELECT periodo, distrito, zona, codigo_error, descripcion_error, cantidad FROM errores_por_distrito_zona'
    )).rows;
    const errIot = (await db.execute('SELECT codigo, descripcion FROM catalogo_errores_iot')).rows;
    const descMap = {};
    errIot.forEach(e => { descMap[e.codigo] = e.descripcion; });

    return errRows.filter(r => r.periodo === p).map(r => ({
      codigo: r.codigo_error,
      descripcion: descMap[r.codigo_error] || r.descripcion_error || `Error ${r.codigo_error}`,
      distrito: r.distrito,
      zona: r.zona,
      nro_reportes: r.cantidad || 0,
      requiere_renovacion: (r.cantidad || 0) >= 3,
    })).sort((a, b) => b.nro_reportes - a.nro_reportes);
  });

  // ── Q14: [Sorpresa 1] Distribución de contratos por tipo de persona ────────
  wrap(14, '[Sorpresa 1] Distribución de contratos por tipo de persona y categoría', async () => {
    const rows = (await db.execute('SELECT tipo_persona, tarifa_alias FROM contratos_por_numero')).rows;
    const m = {};
    rows.forEach(r => {
      const cat = r.tarifa_alias?.startsWith('R') ? 'Residencial'
        : r.tarifa_alias === 'C' ? 'Comercial'
        : r.tarifa_alias === 'CE' ? 'Comercial Especial'
        : r.tarifa_alias === 'I' ? 'Industrial'
        : r.tarifa_alias === 'P' ? 'Preferencial'
        : r.tarifa_alias === 'S' ? 'Social' : 'Otro';
      const k = `${r.tipo_persona}|${cat}`;
      if (!m[k]) m[k] = { tipo_persona: r.tipo_persona, categoria: cat, cantidad: 0 };
      m[k].cantidad++;
    });
    const total = rows.length;
    return Object.values(m)
      .map(v => ({ ...v, porcentaje_pct: +(v.cantidad / total * 100).toFixed(2) }))
      .sort((a, b) => b.cantidad - a.cantidad);
  });

  // ── Q15: Zonas con mayor errores dado distrito X ──────────────────────────
  wrap(15, 'Zonas con mayor cantidad de errores en un distrito dado (param: distrito)', async (req) => {
    const p = req.query.periodo || '2026-04';
    const d = req.query.distrito || 'MOLLE';
    const errRows = (await db.execute(
      'SELECT periodo, distrito, zona, codigo_error, descripcion_error, cantidad FROM errores_por_distrito_zona'
    )).rows;
    const errIot = (await db.execute('SELECT codigo, descripcion FROM catalogo_errores_iot')).rows;
    const descMap = {};
    errIot.forEach(e => { descMap[e.codigo] = e.descripcion; });

    return errRows.filter(r => r.periodo === p && String(r.distrito).toUpperCase() === String(d).toUpperCase())
      .map(r => ({
        codigo: r.codigo_error,
        descripcion: descMap[r.codigo_error] || r.descripcion_error,
        zona: r.zona,
        nro_reportes: r.cantidad || 0,
      })).sort((a, b) => b.nro_reportes - a.nro_reportes);
  });

  // ── Q16: [Sorpresa 2] Cobertura de antenas LoRaWAN por zona ───────────────
  wrap(16, '[Sorpresa 2] Cobertura de antenas LoRaWAN — medidores por zona y radiobase', async () => {
    const rows = (await db.execute('SELECT radiobase, zona, distrito FROM medidores_por_serie')).rows;
    const m = {};
    rows.forEach(r => {
      if (!r.radiobase || !r.zona) return;
      const k = `${r.radiobase}|${r.zona}`;
      if (!m[k]) m[k] = { radiobase: r.radiobase, zona: r.zona, distrito: r.distrito, conexiones: 0 };
      m[k].conexiones++;
    });
    return Object.values(m).sort((a, b) => b.conexiones - a.conexiones);
  });

  // ── Q17: Demanda proyectada 5 años por distrito (factor 2.6%/año) ─────────
  wrap(17, 'Demanda proyectada de agua para los próximos 5 años por distrito (2.6%/año)', async () => {
    const rows = (await db.execute(
      'SELECT periodo, distrito, consumo_m3 FROM consumo_mensual_por_contrato'
    )).rows;
    const byDist = {};
    rows.forEach(r => {
      if (!byDist[r.distrito]) byDist[r.distrito] = { total: 0, meses: new Set() };
      byDist[r.distrito].total += dec(r.consumo_m3);
      byDist[r.distrito].meses.add(r.periodo);
    });
    const FACTOR = 0.026;
    const BASE = new Date().getFullYear();
    return Object.entries(byDist).map(([dist, v]) => {
      const anual = (v.total / (v.meses.size || 1)) * 12;
      const row = { distrito: dist, [`${BASE}_m3`]: +anual.toFixed(0) };
      for (let i = 1; i <= 5; i++) {
        row[`${BASE + i}_m3`] = +(anual * Math.pow(1 + FACTOR, i)).toFixed(0);
      }
      return row;
    }).sort((a, b) => (b[`${BASE}_m3`] || 0) - (a[`${BASE}_m3`] || 0));
  });

  // ── Q18: [Sorpresa 4] Contratos sin consumo en el periodo ─────────────────
  wrap(18, '[Sorpresa 4] Contratos sin consumo registrado en el periodo', async (req) => {
    const p = req.query.periodo || '2026-04';
    const contratos = (await db.execute(
      'SELECT numero_contrato, nombre_titular, distrito, zona FROM contratos_por_numero'
    )).rows;
    const consumos = (await db.execute(
      'SELECT numero_contrato, periodo FROM consumo_mensual_por_contrato'
    )).rows;
    const conConsumo = new Set(consumos.filter(r => r.periodo === p).map(r => r.numero_contrato));
    return contratos.filter(c => !conConsumo.has(c.numero_contrato)).map(c => ({
      contrato: c.numero_contrato,
      cliente: c.nombre_titular,
      distrito: c.distrito,
      zona: c.zona,
    }));
  });

  // ── Q19: Impacto económico cambio de tarifa P → R4 ────────────────────────
  // P = 4.58/m³, R4 = 8.685/m³ (según tarifario Excel)
  wrap(19, 'Impacto económico de cambio de tarifa Preferencial (P) a Residencial R4', async (req) => {
    const p = req.query.periodo || '2026-04';
    const rows = (await db.execute(
      'SELECT periodo, numero_contrato, tarifa_alias, consumo_m3 FROM consumo_mensual_por_contrato'
    )).rows;
    const tarifas = (await db.execute('SELECT alias, cargo_fijo FROM catalogo_tarifas')).rows;
    const tarifaMap = {};
    tarifas.forEach(t => { tarifaMap[t.alias] = dec(t.cargo_fijo) / 12; });

    const tarifaP = rows.filter(r => r.periodo === p && r.tarifa_alias === 'P');
    const totalM3 = tarifaP.reduce((s, r) => s + dec(r.consumo_m3), 0);
    const precioP = tarifaMap['P'] || 4.58;
    const precioR4 = tarifaMap['R4'] || 8.685;
    const montoP = totalM3 * precioP;
    const montoR4 = totalM3 * precioR4;

    return [{
      contratos_tarifa_P: tarifaP.length,
      consumo_total_m3: +totalM3.toFixed(2),
      ingreso_tarifa_P: +montoP.toFixed(2),
      ingreso_simulado_R4: +montoR4.toFixed(2),
      incremento: +(montoR4 - montoP).toFixed(2),
      incremento_pct: +((montoR4 / (montoP || 1) - 1) * 100).toFixed(1),
    }];
  });

  // ── Q20: Medidores sin consumo (zona, distrito, dirección, serie) ──────────
  wrap(20, 'Medidores que no reportaron consumo — zona, distrito, dirección y serie', async () => {
    const med = (await db.execute(
      'SELECT numero_serie, distrito, zona, direccion, estado FROM medidores_por_serie'
    )).rows;
    return med.filter(m => m.estado === 'inactivo' || m.estado === 'fuera_servicio')
      .map(m => ({
        numero_serie: m.numero_serie,
        distrito: m.distrito,
        zona: m.zona,
        direccion: m.direccion || '—',
        estado: m.estado,
      })).slice(0, 200);
  });

  // ── Q21: Proyección ingresos por tipo de tarifa (mes actual) ──────────────
  // ingreso = consumo_m3 × (cargo_fijo / 12)  — tarifa plana verificada en Excel
  wrap(21, 'Proyección de ingresos por tipo de tarifa del mes actual', async (req) => {
    const p = req.query.periodo || '2026-04';
    const rows = (await db.execute(
      'SELECT periodo, tarifa_alias, consumo_m3 FROM consumo_mensual_por_contrato'
    )).rows;
    const tarifas = (await db.execute('SELECT alias, categoria, cargo_fijo FROM catalogo_tarifas')).rows;
    const tarifaMap = {};
    tarifas.forEach(t => { tarifaMap[t.alias] = { categoria: t.categoria, precio: dec(t.cargo_fijo) / 12 }; });

    const m = {};
    rows.filter(r => r.periodo === p).forEach(r => {
      if (!m[r.tarifa_alias]) m[r.tarifa_alias] = { alias: r.tarifa_alias, consumo_m3: 0, contratos: 0 };
      m[r.tarifa_alias].consumo_m3 += dec(r.consumo_m3);
      m[r.tarifa_alias].contratos++;
    });

    return Object.values(m).map(v => {
      const info = tarifaMap[v.alias] || { categoria: v.alias, precio: 0 };
      return {
        categoria: info.categoria || v.alias,
        alias: v.alias,
        contratos: v.contratos,
        consumo_m3: +v.consumo_m3.toFixed(2),
        precio_unitario: +info.precio.toFixed(4),
        ingresos_a_cobrar: +(v.consumo_m3 * info.precio).toFixed(2),
      };
    }).sort((a, b) => b.ingresos_a_cobrar - a.ingresos_a_cobrar);
  });

  // ── Q22: Clientes residenciales con consumo mínimo (≤ 12 m³) ─────────────
  // Estos clientes pagan solo el cargo fijo mensual (mínimo garantizado)
  wrap(22, 'Clientes con consumo mínimo residencial (≤ 12 m³) — cobro de cargo fijo', async (req) => {
    const p = req.query.periodo || '2026-04';
    const rows = (await db.execute(
      'SELECT periodo, numero_contrato, nombre_titular, distrito, tarifa_alias, consumo_m3 FROM consumo_mensual_por_contrato'
    )).rows;
    const tarifas = (await db.execute('SELECT alias, categoria, cargo_fijo FROM catalogo_tarifas')).rows;
    const cargoFijo = {};
    tarifas.forEach(t => { cargoFijo[t.alias] = dec(t.cargo_fijo); });

    return rows.filter(r => r.periodo === p && r.tarifa_alias?.startsWith('R') && dec(r.consumo_m3) <= 12)
      .map(r => ({
        contrato: r.numero_contrato,
        cliente: r.nombre_titular,
        distrito: r.distrito,
        tarifa: r.tarifa_alias,
        consumo_m3: +dec(r.consumo_m3).toFixed(2),
        cargo_fijo: +(cargoFijo[r.tarifa_alias] || 0).toFixed(2),
      })).sort((a, b) => a.consumo_m3 - b.consumo_m3);
  });

  // ── Q23: Ingresos por tarifa expresados en pies cúbicos ───────────────────
  // 1 m³ = 35.3147 pies³
  wrap(23, 'Ingresos por tarifa con volumen en pies cúbicos (ft³)', async (req) => {
    const p = req.query.periodo || '2026-04';
    const rows = (await db.execute(
      'SELECT periodo, tarifa_alias, consumo_m3 FROM consumo_mensual_por_contrato'
    )).rows;
    const tarifas = (await db.execute('SELECT alias, categoria, cargo_fijo FROM catalogo_tarifas')).rows;
    const tarifaMap = {};
    tarifas.forEach(t => { tarifaMap[t.alias] = { categoria: t.categoria, precio: dec(t.cargo_fijo) / 12 }; });

    const M3_TO_FT3 = 35.3147;
    const m = {};
    rows.filter(r => r.periodo === p).forEach(r => {
      if (!m[r.tarifa_alias]) m[r.tarifa_alias] = { alias: r.tarifa_alias, consumo_m3: 0 };
      m[r.tarifa_alias].consumo_m3 += dec(r.consumo_m3);
    });

    return Object.values(m).map(v => {
      const info = tarifaMap[v.alias] || { categoria: v.alias, precio: 0 };
      return {
        categoria: info.categoria || v.alias,
        alias: v.alias,
        consumo_m3: +v.consumo_m3.toFixed(2),
        consumo_pies3: +(v.consumo_m3 * M3_TO_FT3).toFixed(2),
        precio_por_m3: +info.precio.toFixed(4),
        ingresos_a_cobrar: +(v.consumo_m3 * info.precio).toFixed(2),
      };
    }).sort((a, b) => b.ingresos_a_cobrar - a.ingresos_a_cobrar);
  });

  // ── Q24: [Sorpresa] Balance financiero por periodo ────────────────────────
  // Muestra ingresos esperados vs contratos activos por mes — indicador de rentabilidad
  wrap(24, '[Sorpresa] Balance financiero: ingresos esperados por periodo', async () => {
    const rows = (await db.execute(
      'SELECT periodo, tarifa_alias, consumo_m3 FROM consumo_mensual_por_contrato'
    )).rows;
    const tarifas = (await db.execute('SELECT alias, cargo_fijo FROM catalogo_tarifas')).rows;
    const tarifaMap = {};
    tarifas.forEach(t => { tarifaMap[t.alias] = dec(t.cargo_fijo) / 12; });

    const byPeriodo = {};
    rows.forEach(r => {
      if (!byPeriodo[r.periodo]) byPeriodo[r.periodo] = { periodo: r.periodo, consumo_m3: 0, ingresos: 0, contratos: 0 };
      byPeriodo[r.periodo].consumo_m3 += dec(r.consumo_m3);
      byPeriodo[r.periodo].ingresos += dec(r.consumo_m3) * (tarifaMap[r.tarifa_alias] || 0);
      byPeriodo[r.periodo].contratos++;
    });

    return Object.values(byPeriodo).map(v => ({
      periodo: v.periodo,
      contratos_activos: v.contratos,
      consumo_total_m3: +v.consumo_m3.toFixed(2),
      ingresos_esperados: +v.ingresos.toFixed(2),
      promedio_por_contrato: +(v.ingresos / (v.contratos || 1)).toFixed(2),
    })).sort((a, b) => a.periodo.localeCompare(b.periodo));
  });

  // ── Q25: Resumen general del sistema SEMAPA ───────────────────────────────
  wrap(25, 'Resumen general del sistema SEMAPA', async () => {
    const tarifas = (await db.execute('SELECT alias, cargo_fijo FROM catalogo_tarifas')).rows;
    const tarifaMap = {};
    tarifas.forEach(t => { tarifaMap[t.alias] = dec(t.cargo_fijo) / 12; });

    const [med, ct, cons, dist, errores] = await Promise.all([
      db.execute('SELECT estado FROM medidores_por_serie'),
      db.execute('SELECT tipo_persona FROM contratos_por_numero'),
      db.execute('SELECT consumo_m3, tarifa_alias FROM consumo_mensual_por_contrato'),
      db.execute('SELECT poblacion FROM catalogo_distritos'),
      db.execute('SELECT cantidad FROM errores_por_modelo_mes'),
    ]);

    const medRows = med.rows;
    const consRows = cons.rows;
    const totalIngresos = consRows.reduce((s, r) => s + dec(r.consumo_m3) * (tarifaMap[r.tarifa_alias] || 0), 0);

    return [{
      total_medidores: medRows.length,
      medidores_activos: medRows.filter(m => m.estado === 'activo').length,
      medidores_inactivos: medRows.filter(m => m.estado === 'inactivo').length,
      medidores_fuera_servicio: medRows.filter(m => m.estado === 'fuera_servicio').length,
      total_contratos: ct.rows.length,
      personas_naturales: ct.rows.filter(c => c.tipo_persona === 'natural').length,
      personas_juridicas: ct.rows.filter(c => c.tipo_persona === 'juridica').length,
      registros_consumo: consRows.length,
      consumo_total_m3: +consRows.reduce((s, r) => s + dec(r.consumo_m3), 0).toFixed(2),
      ingresos_totales: +totalIngresos.toFixed(2),
      total_errores_iot: errores.rows.reduce((s, r) => s + (r.cantidad || 0), 0),
      poblacion_beneficiaria: dist.rows.reduce((s, r) => s + (r.poblacion || 0), 0),
    }];
  });
}
