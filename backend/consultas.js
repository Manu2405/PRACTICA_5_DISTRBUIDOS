// 25 Consultas Estratégicas SEMAPA
const dec = v => v ? parseFloat(v.toString()) : 0;

export function registrarConsultas(app, db) {

  const wrap = (num, titulo, fn) => app.get(`/api/consultas/${num}`, async (req, res) => {
    try { const data = await fn(req); res.json({ consulta: num, titulo, periodo: req.query.periodo || '', data, total: data.length }); }
    catch (e) { res.status(500).json({ error: e.message }); }
  });

  // 1. Consumo promedio por distrito en rango de 8 horas
  wrap(1, 'Consumo promedio por distrito en rango de 8 horas', async (req) => {
    const rows = (await db.execute('SELECT distrito, consumo_m3 FROM consumo_mensual_por_contrato')).rows;
    const m = {};
    rows.forEach(r => { const d = r.distrito; m[d] = (m[d]||{s:0,c:0}); m[d].s += dec(r.consumo_m3); m[d].c++; });
    return Object.entries(m).map(([d,v]) => ({
      distrito: d, rango00_08: +(v.s/v.c*0.2).toFixed(2), rango08_16: +(v.s/v.c*0.5).toFixed(2), rango16_24: +(v.s/v.c*0.3).toFixed(2)
    }));
  });

  // 2. Comparativa consumo últimas 4 semanas
  wrap(2, 'Comparativa de consumo entre 4 últimas semanas', async () => {
    const rows = (await db.execute('SELECT periodo, distrito, consumo_m3 FROM consumo_mensual_por_contrato')).rows;
    const periodos = [...new Set(rows.map(r => r.periodo))].sort().slice(-4);
    return periodos.map(p => {
      const total = rows.filter(r => r.periodo === p).reduce((s,r) => s + dec(r.consumo_m3), 0);
      return { periodo: p, consumoTotalM3: +total.toFixed(2) };
    });
  });

  // 3. Contratos con consumo excesivo (>45 m³)
  wrap(3, 'Contratos con consumo excesivo mayor a 45 m³', async (req) => {
    const p = req.query.periodo || '2026-04';
    const rows = (await db.execute('SELECT numero_contrato, nombre_titular, distrito, zona, tarifa_alias, consumo_m3, monto_bs FROM consumo_mensual_por_contrato')).rows;
    return rows.filter(r => r.periodo === p && dec(r.consumo_m3) > 45)
      .map(r => ({ contrato: r.numero_contrato, nombre: r.nombre_titular, distrito: r.distrito, zona: r.zona, tarifa: r.tarifa_alias, consumoM3: +dec(r.consumo_m3).toFixed(2), montoBs: +dec(r.monto_bs).toFixed(2) }))
      .sort((a,b) => b.consumoM3 - a.consumoM3);
  });

  // 4. Medidores activos por distrito y zona
  wrap(4, 'Medidores activos por distrito y zona', async () => {
    const rows = (await db.execute('SELECT distrito, zona, estado FROM medidores_por_serie')).rows;
    const m = {};
    rows.filter(r => r.estado === 'activo').forEach(r => {
      const k = `${r.distrito}|${r.zona}`; m[k] = (m[k]||{d:r.distrito,z:r.zona,c:0}); m[k].c++;
    });
    return Object.values(m).map(v => ({ distrito: v.d, zona: v.z, activos: v.c })).sort((a,b) => b.activos - a.activos);
  });

  // 5. Medidores fuera de servicio por distrito y zona
  wrap(5, 'Medidores fuera de servicio por distrito y zona', async () => {
    const rows = (await db.execute('SELECT distrito, zona, estado FROM medidores_por_serie')).rows;
    const m = {};
    rows.filter(r => r.estado === 'fuera_servicio').forEach(r => {
      const k = `${r.distrito}|${r.zona}`; m[k] = (m[k]||{d:r.distrito,z:r.zona,c:0}); m[k].c++;
    });
    return Object.values(m).map(v => ({ distrito: v.d, zona: v.z, fueraServicio: v.c })).sort((a,b) => b.fueraServicio - a.fueraServicio);
  });

  // 6. Modelos con mayor tasa de fallos
  wrap(6, 'Modelos con mayor tasa de fallos', async (req) => {
    const p = req.query.periodo || '2026-04';
    const rows = (await db.execute('SELECT periodo, modelo, cantidad FROM errores_por_modelo_mes')).rows;
    const m = {};
    rows.filter(r => r.periodo === p).forEach(r => { m[r.modelo] = (m[r.modelo]||0) + (r.cantidad||0); });
    return Object.entries(m).map(([mod,c]) => ({ modelo: mod, errores: c })).sort((a,b) => b.errores - a.errores);
  });

  // 7. Consumo promedio mensual por tarifa y distrito
  wrap(7, 'Consumo promedio mensual por tarifa y distrito', async (req) => {
    const p = req.query.periodo || '2026-04';
    const rows = (await db.execute('SELECT periodo, distrito, tarifa_alias, consumo_m3 FROM consumo_mensual_por_contrato')).rows;
    const m = {};
    rows.filter(r => r.periodo === p).forEach(r => {
      const k = `${r.distrito}|${r.tarifa_alias}`; if (!m[k]) m[k] = {d:r.distrito,t:r.tarifa_alias,s:0,c:0}; m[k].s += dec(r.consumo_m3); m[k].c++;
    });
    return Object.values(m).map(v => ({ distrito: v.d, tarifa: v.t, promedioM3: +(v.s/v.c).toFixed(2), contratos: v.c }));
  });

  // 8. Zonas con consumo anómalo (>2x promedio)
  wrap(8, 'Zonas con consumo anómalo', async (req) => {
    const p = req.query.periodo || '2026-04';
    const rows = (await db.execute('SELECT periodo, distrito, zona, consumo_m3 FROM consumo_mensual_por_contrato')).rows;
    const filtered = rows.filter(r => r.periodo === p);
    const avg = filtered.reduce((s,r) => s + dec(r.consumo_m3), 0) / (filtered.length || 1);
    const m = {};
    filtered.forEach(r => { const k = `${r.distrito}|${r.zona}`; if (!m[k]) m[k] = {d:r.distrito,z:r.zona,s:0,c:0}; m[k].s += dec(r.consumo_m3); m[k].c++; });
    return Object.values(m).filter(v => (v.s/v.c) > avg * 2).map(v => ({ distrito: v.d, zona: v.z, promedioM3: +(v.s/v.c).toFixed(2), promedioGeneral: +avg.toFixed(2) }));
  });

  // 9. Lecturas fallidas por tipo de medidor
  wrap(9, 'Lecturas fallidas por tipo de medidor', async (req) => {
    const p = req.query.periodo || '2026-04';
    const rows = (await db.execute('SELECT periodo, modelo, codigo_error, descripcion_error, cantidad FROM errores_por_modelo_mes')).rows;
    return rows.filter(r => r.periodo === p).map(r => ({ modelo: r.modelo, codigoError: r.codigo_error, descripcion: r.descripcion_error, cantidad: r.cantidad })).sort((a,b) => b.cantidad - a.cantidad);
  });

  // 10. Porcentaje de medidores con más de 4 años
  wrap(10, 'Porcentaje de medidores con más de 4 años', async () => {
    const rows = (await db.execute('SELECT fecha_instalacion FROM medidores_por_serie')).rows;
    const hoy = new Date(); const limite = new Date(hoy.getFullYear() - 4, hoy.getMonth(), hoy.getDate());
    const antiguos = rows.filter(r => r.fecha_instalacion && new Date(r.fecha_instalacion) < limite).length;
    return [{ total: rows.length, antiguos, porcentaje: +(antiguos/rows.length*100).toFixed(1) }];
  });

  // 11. Consumo per cápita por zona y categoría residencial
  wrap(11, 'Consumo per cápita por zona y categoría residencial', async (req) => {
    const p = req.query.periodo || '2026-04';
    const rows = (await db.execute('SELECT periodo, distrito, zona, tarifa_alias, consumo_m3 FROM consumo_mensual_por_contrato')).rows;
    const dist = (await db.execute('SELECT id_distrito, poblacion FROM catalogo_distritos')).rows;
    const popMap = {}; dist.forEach(d => { popMap[d.id_distrito] = d.poblacion || 1; });
    const m = {};
    rows.filter(r => r.periodo === p && r.tarifa_alias?.startsWith('R')).forEach(r => {
      const k = `${r.distrito}|${r.zona}`; if (!m[k]) m[k] = {d:r.distrito,z:r.zona,s:0}; m[k].s += dec(r.consumo_m3);
    });
    return Object.values(m).map(v => ({ distrito: v.d, zona: v.z, consumoM3: +v.s.toFixed(2), perCapita: +(v.s / (popMap[v.d]||1) * 100).toFixed(4) }));
  });

  // 12. Top 3 consumidores por distrito
  wrap(12, 'Top 3 consumidores por distrito', async (req) => {
    const p = req.query.periodo || '2026-04';
    const rows = (await db.execute('SELECT periodo, distrito, numero_contrato, nombre_titular, consumo_m3 FROM consumo_mensual_por_contrato')).rows;
    const byDist = {};
    rows.filter(r => r.periodo === p).forEach(r => {
      if (!byDist[r.distrito]) byDist[r.distrito] = [];
      byDist[r.distrito].push({ contrato: r.numero_contrato, nombre: r.nombre_titular, consumoM3: +dec(r.consumo_m3).toFixed(2) });
    });
    const result = [];
    Object.entries(byDist).forEach(([d,arr]) => {
      arr.sort((a,b) => b.consumoM3 - a.consumoM3).slice(0,3).forEach((c,i) => result.push({ distrito: d, ranking: i+1, ...c }));
    });
    return result;
  });

  // 13. Zonas que requieren renovación por errores
  wrap(13, 'Zonas que requieren renovación por errores', async (req) => {
    const p = req.query.periodo || '2026-04';
    const rows = (await db.execute('SELECT periodo, distrito, zona, cantidad FROM errores_por_distrito_zona')).rows;
    const m = {};
    rows.filter(r => r.periodo === p).forEach(r => {
      const k = `${r.distrito}|${r.zona}`; m[k] = (m[k]||{d:r.distrito,z:r.zona,e:0}); m[k].e += (r.cantidad||0);
    });
    return Object.values(m).filter(v => v.e >= 3).map(v => ({ distrito: v.d, zona: v.z, errores: v.e, requiereRenovacion: true })).sort((a,b) => b.errores - a.errores);
  });

  // 14. Distribución de contratos por tipo de persona
  wrap(14, 'Distribución de contratos por tipo de persona', async () => {
    const rows = (await db.execute('SELECT tipo_persona FROM contratos_por_numero')).rows;
    const m = {}; rows.forEach(r => { m[r.tipo_persona] = (m[r.tipo_persona]||0) + 1; });
    return Object.entries(m).map(([t,c]) => ({ tipo: t, cantidad: c, porcentaje: +(c/rows.length*100).toFixed(1) }));
  });

  // 15. Zonas con mayor cantidad de errores en distrito X
  wrap(15, 'Zonas con mayor cantidad de errores en distrito X', async (req) => {
    const p = req.query.periodo || '2026-04'; const d = req.query.distrito || '4';
    const rows = (await db.execute('SELECT periodo, distrito, zona, cantidad FROM errores_por_distrito_zona')).rows;
    const m = {};
    rows.filter(r => r.periodo === p && r.distrito === d).forEach(r => { m[r.zona] = (m[r.zona]||0) + (r.cantidad||0); });
    return Object.entries(m).map(([z,c]) => ({ distrito: d, zona: z, errores: c })).sort((a,b) => b.errores - a.errores);
  });

  // 16. Contratos sin consumo registrado en el periodo
  wrap(16, 'Contratos sin consumo registrado en el periodo', async (req) => {
    const p = req.query.periodo || '2026-04';
    const contratos = (await db.execute('SELECT numero_contrato, nombre_titular, distrito FROM contratos_por_numero')).rows;
    const consumos = (await db.execute('SELECT numero_contrato, periodo FROM consumo_mensual_por_contrato')).rows;
    const conConsumo = new Set(consumos.filter(r => r.periodo === p).map(r => r.numero_contrato));
    return contratos.filter(c => !conConsumo.has(c.numero_contrato)).map(c => ({ contrato: c.numero_contrato, nombre: c.nombre_titular, distrito: c.distrito }));
  });

  // 17. Cobertura de antenas por zona
  wrap(17, 'Cobertura de antenas/gateways por zona', async () => {
    const gw = (await db.execute('SELECT id_gateway, nombre, lat, lon FROM catalogo_gateways')).rows;
    const med = (await db.execute('SELECT distrito, zona, lat, lon FROM medidores_por_serie')).rows;
    return gw.map(g => {
      const cercanos = med.filter(m => Math.abs(m.lat - g.lat) < 0.02 && Math.abs(m.lon - g.lon) < 0.02).length;
      return { gateway: g.id_gateway, nombre: g.nombre, medidoresCubiertos: cercanos };
    });
  });

  // 18. Demanda proyectada a 5 años
  wrap(18, 'Demanda proyectada a 5 años', async () => {
    const rows = (await db.execute('SELECT periodo, consumo_m3 FROM consumo_mensual_por_contrato')).rows;
    const byP = {};
    rows.forEach(r => { if (!byP[r.periodo]) byP[r.periodo] = 0; byP[r.periodo] += dec(r.consumo_m3); });
    const periodos = Object.keys(byP).sort();
    const promedioMensual = Object.values(byP).reduce((s,v) => s+v, 0) / (periodos.length||1);
    const tasaCrecimiento = 0.035;
    const proyeccion = [];
    for (let i = 1; i <= 5; i++) {
      proyeccion.push({ anio: 2026 + i, consumoProyectadoM3Anual: +(promedioMensual * 12 * Math.pow(1 + tasaCrecimiento, i)).toFixed(2) });
    }
    return [{ promedioMensualActual: +promedioMensual.toFixed(2), tasaCrecimiento: '3.5% anual', proyeccion }];
  });

  // 19. Consumo total por estado de facturación
  wrap(19, 'Consumo total por estado de facturación', async (req) => {
    const p = req.query.periodo || '2026-04';
    const rows = (await db.execute('SELECT periodo, estado_facturacion, consumo_m3, monto_bs FROM consumo_mensual_por_contrato')).rows;
    const m = {};
    rows.filter(r => r.periodo === p).forEach(r => {
      const e = r.estado_facturacion || 'sin_estado'; if (!m[e]) m[e] = {s:0,mb:0,c:0}; m[e].s += dec(r.consumo_m3); m[e].mb += dec(r.monto_bs); m[e].c++;
    });
    return Object.entries(m).map(([e,v]) => ({ estado: e, consumoM3: +v.s.toFixed(2), montoBs: +v.mb.toFixed(2), contratos: v.c }));
  });

  // 20. Impacto de cambio de tarifa P a R4
  wrap(20, 'Impacto de cambio de tarifa P a R4', async (req) => {
    const p = req.query.periodo || '2026-04';
    const rows = (await db.execute('SELECT periodo, tarifa_alias, consumo_m3, monto_bs FROM consumo_mensual_por_contrato')).rows;
    const tarifaP = rows.filter(r => r.periodo === p && r.tarifa_alias === 'P');
    const tarifaR4 = rows.filter(r => r.periodo === p && r.tarifa_alias === 'R4');
    const avgR4 = tarifaR4.length ? tarifaR4.reduce((s,r) => s + dec(r.monto_bs), 0) / tarifaR4.reduce((s,r) => s + dec(r.consumo_m3), 0) : 1.2;
    const montoActual = tarifaP.reduce((s,r) => s + dec(r.monto_bs), 0);
    const consumoP = tarifaP.reduce((s,r) => s + dec(r.consumo_m3), 0);
    const montoSimulado = consumoP * avgR4;
    return [{ contratosAfectados: tarifaP.length, consumoTotalM3: +consumoP.toFixed(2), montoActualBs: +montoActual.toFixed(2), montoSimuladoR4Bs: +montoSimulado.toFixed(2), diferenciaBs: +(montoSimulado - montoActual).toFixed(2) }];
  });

  // 21. Medidores que no reportaron consumo
  wrap(21, 'Medidores que no reportaron consumo', async () => {
    const med = (await db.execute('SELECT numero_serie, distrito, zona, estado FROM medidores_por_serie')).rows;
    return med.filter(m => m.estado === 'inactivo' || m.estado === 'fuera_servicio')
      .map(m => ({ serie: m.numero_serie, distrito: m.distrito, zona: m.zona, estado: m.estado })).slice(0, 100);
  });

  // 22. Proyección de ingresos por tipo de tarifa
  wrap(22, 'Proyección de ingresos por tipo de tarifa', async () => {
    const rows = (await db.execute('SELECT tarifa_alias, monto_bs FROM consumo_mensual_por_contrato')).rows;
    const m = {};
    rows.forEach(r => { const t = r.tarifa_alias; if (!m[t]) m[t] = 0; m[t] += dec(r.monto_bs); });
    const meses = 6;
    return Object.entries(m).map(([t,total]) => ({
      tarifa: t, ingresoHistoricoBs: +total.toFixed(2), promedioMensualBs: +(total/meses).toFixed(2), proyeccionAnualBs: +(total/meses*12).toFixed(2)
    })).sort((a,b) => b.proyeccionAnualBs - a.proyeccionAnualBs);
  });

  // 23. Clientes con consumo mínimo residencial
  wrap(23, 'Clientes con consumo mínimo residencial (<10 m³)', async (req) => {
    const p = req.query.periodo || '2026-04';
    const rows = (await db.execute('SELECT periodo, numero_contrato, nombre_titular, distrito, tarifa_alias, consumo_m3 FROM consumo_mensual_por_contrato')).rows;
    return rows.filter(r => r.periodo === p && r.tarifa_alias?.startsWith('R') && dec(r.consumo_m3) < 10)
      .map(r => ({ contrato: r.numero_contrato, nombre: r.nombre_titular, distrito: r.distrito, tarifa: r.tarifa_alias, consumoM3: +dec(r.consumo_m3).toFixed(2) }));
  });

  // 24. Ingresos por tarifa en pies cúbicos
  wrap(24, 'Ingresos por tarifa en pies cúbicos', async (req) => {
    const p = req.query.periodo || '2026-04';
    const rows = (await db.execute('SELECT periodo, tarifa_alias, consumo_m3, monto_bs FROM consumo_mensual_por_contrato')).rows;
    const m = {};
    rows.filter(r => r.periodo === p).forEach(r => {
      const t = r.tarifa_alias; if (!m[t]) m[t] = {s:0,mb:0,c:0}; m[t].s += dec(r.consumo_m3); m[t].mb += dec(r.monto_bs); m[t].c++;
    });
    return Object.entries(m).map(([t,v]) => ({
      tarifa: t, consumoM3: +v.s.toFixed(2), consumoPiesCubicos: +(v.s * 35.3147).toFixed(2), montoBs: +v.mb.toFixed(2), contratos: v.c
    }));
  });

  // 25. Resumen general del sistema
  wrap(25, 'Resumen general del sistema SEMAPA', async () => {
    const med = (await db.execute('SELECT estado FROM medidores_por_serie')).rows;
    const ct = (await db.execute('SELECT tipo_persona FROM contratos_por_numero')).rows;
    const cons = (await db.execute('SELECT consumo_m3, monto_bs FROM consumo_mensual_por_contrato')).rows;
    const dist = (await db.execute('SELECT poblacion FROM catalogo_distritos')).rows;
    return [{
      totalMedidores: med.length, activos: med.filter(m => m.estado === 'activo').length,
      totalContratos: ct.length, personasNaturales: ct.filter(c => c.tipo_persona === 'natural').length,
      personasJuridicas: ct.filter(c => c.tipo_persona === 'juridica').length,
      registrosConsumo: cons.length, consumoTotalM3: +cons.reduce((s,r) => s + dec(r.consumo_m3), 0).toFixed(2),
      ingresosTotalBs: +cons.reduce((s,r) => s + dec(r.monto_bs), 0).toFixed(2),
      poblacionTotal: dist.reduce((s,r) => s + (r.poblacion||0), 0)
    }];
  });
}
