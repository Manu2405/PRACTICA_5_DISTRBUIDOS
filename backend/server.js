import express from 'express';
import cors from 'cors';
import db from './db.js';
import { generarMediaCarta, generarRolloTermico } from './pdf.js';
import { enviarEmail, generarMensajeTexto } from './email.js';
import { registrarConsultas } from './consultas.js';

const app = express();
app.use(cors({ origin: ['http://localhost:5173','http://localhost:5174','http://localhost:3000'], credentials: true }));
app.use(express.json());
app.use('/recibos', express.static('./recibos'));

const dec = v => v ? parseFloat(v.toString()) : 0;
const periodo = q => q.periodo || new Date().toISOString().slice(0, 7);

// HEALTH
app.get('/health', async (_, res) => {
  try { await db.execute('SELECT now() FROM system.local'); res.json({ status:'ok', database:'connected', service:'semapa-backend' }); }
  catch { res.status(503).json({ status:'error', database:'disconnected' }); }
});

// OPERACIONAL - Resumen
app.get('/api/operacional/resumen', async (req, res) => {
  const p = periodo(req.query);
  try {
    const med = (await db.execute('SELECT estado FROM medidores_por_serie')).rows;
    const activos = med.filter(m => m.estado === 'activo').length;
    const inactivos = med.filter(m => m.estado === 'inactivo').length;
    const fuera = med.filter(m => m.estado === 'fuera_servicio').length;
    const cons = (await db.execute('SELECT periodo, consumo_m3 FROM consumo_mensual_por_contrato')).rows;
    const consumo = cons.filter(r => r.periodo === p).reduce((s, r) => s + dec(r.consumo_m3), 0);
    const errs = (await db.execute('SELECT periodo, cantidad FROM errores_por_modelo_mes')).rows;
    const errTotal = errs.filter(r => r.periodo === p).reduce((s, r) => s + (r.cantidad || 0), 0);
    const pob = (await db.execute('SELECT poblacion FROM catalogo_distritos')).rows.reduce((s, r) => s + (r.poblacion || 0), 0);
    res.json({ periodo: p, consumoTotalM3: +consumo.toFixed(2), cantidadMedidores: med.length,
      medidoresActivos: activos, medidoresInactivos: inactivos, medidoresFueraServicio: fuera,
      poblacionBeneficiaria: pob, cantidadErrores: errTotal });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// OPERACIONAL - Consumo distrito
app.get('/api/operacional/consumo-distrito', async (req, res) => {
  const p = periodo(req.query);
  try {
    const rows = (await db.execute('SELECT periodo, distrito, tarifa_alias, consumo_m3, monto_bs FROM consumo_mensual_por_contrato')).rows;
    const m = {};
    rows.filter(r => r.periodo === p).forEach(r => {
      if (!m[r.distrito]) m[r.distrito] = { distrito: r.distrito, consumoM3: 0, montoBs: 0, contratos: 0 };
      m[r.distrito].consumoM3 += dec(r.consumo_m3); m[r.distrito].montoBs += dec(r.monto_bs); m[r.distrito].contratos++;
    });
    res.json(Object.values(m).map(d => ({ ...d, consumoM3: +d.consumoM3.toFixed(2), montoBs: +d.montoBs.toFixed(2) })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// OPERACIONAL - Mapa medidores
app.get('/api/operacional/mapa-medidores', async (_, res) => {
  try {
    const rows = (await db.execute('SELECT numero_serie, estado, lat, lon, distrito, zona, modelo FROM medidores_por_serie')).rows;
    res.json(rows.slice(0, 500).map(r => ({ serie: r.numero_serie, estado: r.estado, lat: r.lat, lon: r.lon, distrito: r.distrito, zona: r.zona, modelo: r.modelo })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// OPERACIONAL - Medidores estado
app.get('/api/operacional/medidores-estado', async (_, res) => {
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
});

// CONTABILIDAD - Ingresos tarifa
app.get('/api/contabilidad/ingresos-tarifa', async (req, res) => {
  const p = periodo(req.query);
  try {
    const rows = (await db.execute('SELECT periodo, tarifa_alias, consumo_m3, monto_bs FROM consumo_mensual_por_contrato')).rows;
    const m = {};
    rows.filter(r => r.periodo === p).forEach(r => {
      const t = r.tarifa_alias;
      if (!m[t]) m[t] = { tarifa: t, consumoM3: 0, montoBs: 0, contratos: 0 };
      m[t].consumoM3 += dec(r.consumo_m3); m[t].montoBs += dec(r.monto_bs); m[t].contratos++;
    });
    res.json(Object.values(m).map(t => ({ ...t, consumoM3: +t.consumoM3.toFixed(2), montoBs: +t.montoBs.toFixed(2) })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// CONTABILIDAD - Top consumidores
app.get('/api/contabilidad/top-consumidores', async (req, res) => {
  const p = periodo(req.query); const lim = parseInt(req.query.limit || '20');
  try {
    const rows = (await db.execute('SELECT numero_contrato, periodo, nombre_titular, distrito, zona, tarifa_alias, consumo_m3, monto_bs FROM consumo_mensual_por_contrato')).rows;
    const filtered = rows.filter(r => r.periodo === p).map(r => ({
      contrato: r.numero_contrato, nombre: r.nombre_titular, distrito: r.distrito, zona: r.zona,
      tarifa: r.tarifa_alias, consumoM3: +dec(r.consumo_m3).toFixed(2), montoBs: +dec(r.monto_bs).toFixed(2)
    })).sort((a, b) => b.consumoM3 - a.consumoM3).slice(0, lim);
    res.json(filtered);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ADMIN - Errores modelo
app.get('/api/administracion/errores-modelo', async (req, res) => {
  const p = periodo(req.query);
  try {
    const rows = (await db.execute('SELECT periodo, modelo, codigo_error, descripcion_error, cantidad FROM errores_por_modelo_mes')).rows;
    res.json(rows.filter(r => r.periodo === p).map(r => ({ periodo: r.periodo, modelo: r.modelo, codigoError: r.codigo_error, descripcion: r.descripcion_error, cantidad: r.cantidad })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ADMIN - Errores distrito
app.get('/api/administracion/errores-distrito', async (req, res) => {
  const p = periodo(req.query);
  try {
    const rows = (await db.execute('SELECT periodo, distrito, zona, codigo_error, descripcion_error, cantidad FROM errores_por_distrito_zona')).rows;
    res.json(rows.filter(r => r.periodo === p).map(r => ({ periodo: r.periodo, distrito: r.distrito, zona: r.zona, codigoError: r.codigo_error, descripcion: r.descripcion_error, cantidad: r.cantidad })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// CONSULTAS
app.get('/api/consultas/contrato/:n', async (req, res) => {
  try { const r = (await db.execute('SELECT * FROM contratos_por_numero WHERE numero_contrato = ?', [req.params.n], { prepare: true })).rows[0];
    if (!r) return res.status(404).json({ error: 'No encontrado' }); res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/consultas/medidor/:s', async (req, res) => {
  try { const r = (await db.execute('SELECT * FROM medidores_por_serie WHERE numero_serie = ?', [req.params.s], { prepare: true })).rows[0];
    if (!r) return res.status(404).json({ error: 'No encontrado' }); res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/consultas/consumo/:c', async (req, res) => {
  try { const rows = (await db.execute('SELECT periodo, consumo_m3, monto_bs, estado_facturacion FROM consumo_mensual_por_contrato WHERE numero_contrato = ?', [req.params.c], { prepare: true })).rows;
    res.json(rows.map(r => ({ periodo: r.periodo, consumoM3: +dec(r.consumo_m3).toFixed(2), montoBs: +dec(r.monto_bs).toFixed(2), estado: r.estado_facturacion })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// CATÁLOGOS
app.get('/api/catalogos/distritos', async (_, res) => { try { res.json((await db.execute('SELECT id_distrito, nombre, subalcaldia, poblacion, lat, lon FROM catalogo_distritos')).rows); } catch (e) { res.status(500).json({ error: e.message }); } });
app.get('/api/catalogos/tarifas', async (_, res) => { try { res.json((await db.execute('SELECT * FROM catalogo_tarifas')).rows); } catch (e) { res.status(500).json({ error: e.message }); } });
app.get('/api/catalogos/gateways', async (_, res) => { try { res.json((await db.execute('SELECT * FROM catalogo_gateways')).rows); } catch (e) { res.status(500).json({ error: e.message }); } });
app.get('/api/catalogos/contratos', async (req, res) => { const l = parseInt(req.query.limit || '50'); try { res.json((await db.execute(`SELECT * FROM contratos_por_numero LIMIT ${l}`)).rows); } catch (e) { res.status(500).json({ error: e.message }); } });

// FACTURACIÓN con PDFs reales
app.post('/api/factura/generar', async (req, res) => {
  const { numeroContrato, periodo: p } = req.body;
  if (!numeroContrato || !p) return res.status(400).json({ error: 'Faltan campos' });
  try {
    const ct = (await db.execute('SELECT * FROM contratos_por_numero WHERE numero_contrato = ?', [numeroContrato], { prepare: true })).rows[0];
    if (!ct) return res.status(404).json({ error: 'Contrato no encontrado' });
    const cm = (await db.execute('SELECT consumo_m3, monto_bs FROM consumo_mensual_por_contrato WHERE numero_contrato = ? AND periodo = ?', [numeroContrato, p], { prepare: true })).rows[0];
    if (!cm) return res.status(404).json({ error: 'Sin consumo para ese periodo' });
    const consumo = dec(cm.consumo_m3), monto = dec(cm.monto_bs);
    // Buscar medidor
    let medidor = '';
    try { const mr = (await db.execute('SELECT numero_serie FROM medidores_por_serie')).rows.find(r => r.numero_contrato === numeroContrato); if (mr) medidor = mr.numero_serie; } catch {}
    const datos = { contrato: numeroContrato, nombre: ct.nombre_titular, identificador: ct.identificador_titular,
      tipo: ct.tipo_persona, direccion: ct.direccion, distrito: ct.distrito, zona: ct.zona,
      tarifa: ct.tarifa_alias, periodo: p, consumo, monto, medidor };
    const [pdfMedia, pdfRollo] = await Promise.all([generarMediaCarta(datos), generarRolloTermico(datos)]);
    res.json({ estado: 'generado', cliente: ct.nombre_titular, periodo: p, consumoM3: +consumo.toFixed(2),
      montoBs: +monto.toFixed(2), pdfMediaCarta: `/recibos/${pdfMedia}`, pdfRollo: `/recibos/${pdfRollo}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// NOTIFICACIÓN (email real + SMS/WhatsApp simulado)
app.post('/api/notificacion/simular', async (req, res) => {
  const { formato, numeroContrato, periodo: p, destinatarioEmail } = req.body;
  if (!formato || !numeroContrato || !p) return res.status(400).json({ error: 'Faltan campos' });
  try {
    const ct = (await db.execute('SELECT nombre_titular, identificador_titular FROM contratos_por_numero WHERE numero_contrato = ?', [numeroContrato], { prepare: true })).rows[0];
    if (!ct) return res.status(404).json({ error: 'Contrato no encontrado' });
    let consumo = 0, monto = 0;
    try { const cm = (await db.execute('SELECT consumo_m3, monto_bs FROM consumo_mensual_por_contrato WHERE numero_contrato = ? AND periodo = ?', [numeroContrato, p], { prepare: true })).rows[0];
      if (cm) { consumo = dec(cm.consumo_m3); monto = dec(cm.monto_bs); }
    } catch {}

    const msg = generarMensajeTexto({ nombre: ct.nombre_titular, contrato: numeroContrato, periodo: p, consumo, monto });
    let emailResult = null;

    // Si es email, enviar de verdad
    if (formato === 'email' && destinatarioEmail) {
      try {
        // Rutas de los PDFs
        const pdfMedia = `./recibos/media_carta/${numeroContrato}-${p}.pdf`;
        const pdfRollo = `./recibos/rollo_termico/${numeroContrato}-${p}.pdf`;
        emailResult = await enviarEmail({
          destinatario: destinatarioEmail,
          nombre: ct.nombre_titular,
          contrato: numeroContrato,
          periodo: p, consumo, monto, pdfMedia, pdfRollo,
        });
        console.log(`📧 Email enviado a ${destinatarioEmail} → ${emailResult.messageId}`);
      } catch (emailErr) {
        console.error('❌ Error email:', emailErr.message);
        emailResult = { error: emailErr.message };
      }
    }

    // Registrar en Cassandra
    await db.execute('INSERT INTO notificaciones_por_contrato (numero_contrato, periodo, fecha_hora, formato, identificador, estado, mensaje) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [numeroContrato, p, new Date(), formato, ct.identificador_titular, formato === 'email' && emailResult && !emailResult.error ? 'enviado' : 'simulado', msg], { prepare: true });

    const response = { estado: formato === 'email' && emailResult && !emailResult.error ? 'enviado' : 'simulado', formato, mensaje: msg };
    if (emailResult) response.email = emailResult;
    res.json(response);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// VISOR DE PAGOS — Búsqueda unificada por contrato o serie de medidor
app.get('/api/visor/buscar', async (req, res) => {
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
});

// ALCALDÍA — Mapa de burbujas por distrito
app.get('/api/alcaldia/mapa-distritos', async (req, res) => {
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
});

// ALCALDÍA — KPIs por período
app.get('/api/alcaldia/kpis', async (req, res) => {
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
    res.json({
      periodo: p,
      consumo_total_m3: +totalConsumo.toFixed(2),
      indice_hidrico_total: +(totalConsumo * 0.8).toFixed(2),
      ingresos_esperados_bs: +totalMonto.toFixed(2),
      poblacion_beneficiaria: totalPob,
      top_distrito: distList[0]?.nombre || '—',
      top_consumo_m3: +(distList[0]?.consumo || 0).toFixed(2),
      ranking: distList.slice(0, 5).map(d => ({ nombre: d.nombre, consumo_m3: +d.consumo.toFixed(2) })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 25 CONSULTAS ESTRATÉGICAS
registrarConsultas(app, db);

// START
await db.connect();
console.log('✅ Cassandra conectada');
app.listen(8080, () => { console.log('🚀 SEMAPA Backend en http://localhost:8080 (25 consultas activas)'); });
