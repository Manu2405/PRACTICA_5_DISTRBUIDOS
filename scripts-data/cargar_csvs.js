// ============================================================
// SEMAPA - Carga de DATOS REALES desde CSVs a Cassandra
// Reemplaza a generar_datos.js (que usaba Faker)
//
// CSVs procesados (de Recursos/):
//   - 03 Practica 5 Recursos contratos_agua.csv         (100k contratos)
//   - 03 Practica 5 Recursos infraestructuras_cochabamba.csv  (80k infra)
//   - 03 Practica 5 Recursos medidores_iot.csv          (120k medidores)
//   - 03 Practica 5 Recursos lecturas_iot.csv           (300k lecturas)
//
// Estado de facturación REAL (sin mock):
//   pagado           → fecha_pago <= fecha_emision + 20d
//   pagado_atrasado  → fecha_pago >  fecha_emision + 20d
//   vencido          → fecha_pago vacía Y today > venc
//   pendiente        → fecha_pago vacía Y today <= venc
// ============================================================
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { createClient, types } from './config.js';
import { calcularMontoPorConsumo } from '../backend/src/services/tarifaService.js';

const RECURSOS = path.resolve('../Recursos');
const CONCURRENCY = 200;

// --- Helpers ---
function parseUSDate(s) {
  // Formato: "02/28/26 21:39" o "02/28/26" o vacío
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{1,2}))?$/);
  if (!m) return null;
  let [, mm, dd, yy, hh = '0', mi = '0'] = m;
  if (yy.length === 2) yy = '20' + yy;
  return new Date(+yy, +mm - 1, +dd, +hh, +mi);
}

function fmtPeriodo(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function readCsv(filename, encoding = 'utf-8') {
  const filepath = path.join(RECURSOS, filename);
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filepath, { encoding })
      .pipe(parse({ columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true }))
      .on('data', row => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

async function runConcurrent(client, queries, label) {
  let done = 0;
  for (let i = 0; i < queries.length; i += CONCURRENCY) {
    const chunk = queries.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(q => client.execute(q.query, q.params, { prepare: true })));
    done += chunk.length;
    if (done % 5000 === 0 || done === queries.length) {
      process.stdout.write(`\r   ${label}: ${done}/${queries.length}`);
    }
  }
  console.log(`\r   ${label}: ${queries.length}/${queries.length} ✅`);
}

// MAC → serie sin ":" (Cassandra acepta texto, pero queda consistente)
function macToSerie(mac) { return mac.replace(/:/g, ''); }

// Mapeo de subcategoria CSV → alias tarifa (R1, R2, R3, R4, C, CE, I, P, S)
function aliasFromSubcategoria(sub) {
  if (!sub) return 'R3';
  const s = sub.toUpperCase().trim();
  // Casos comunes: "R1", "R2", "Residencial R2" (por si acaso)
  const m = s.match(/(R[1-4]|CE|C|I|P|S)\b/);
  return m ? m[1] : 'R3';
}

function estadoMedidorMap(estadoCsv) {
  // CSV: "Operativo", "Reacondicionado", "Inactivo", "Baja", "Sin reportar"
  const s = (estadoCsv || '').toLowerCase();
  if (s === 'operativo' || s === 'reacondicionado') return 'activo';
  if (s === 'inactivo' || s === 'baja') return 'inactivo';
  return 'fuera_servicio';
}

async function main() {
  console.log('============================================================');
  console.log('  SEMAPA - Carga DATOS REALES (CSV → Cassandra)');
  console.log('============================================================');

  const client = createClient(true);
  await client.connect();
  console.log('✅ Conectado a Cassandra\n');

  // --- 0. Cargar catálogos en memoria ---
  console.log('📖 Leyendo catálogos...');
  const distritos = (await client.execute('SELECT id_distrito, nombre, subalcaldia FROM catalogo_distritos')).rows;
  const zonas = (await client.execute('SELECT * FROM catalogo_zonas')).rows;
  const tarifas = (await client.execute('SELECT * FROM catalogo_tarifas')).rows;
  const modelos = (await client.execute('SELECT * FROM catalogo_modelos_medidor')).rows;
  const gateways = (await client.execute('SELECT * FROM catalogo_gateways')).rows;

  const distritoPorId = new Map(distritos.map(d => [String(d.id_distrito), d]));
  const tarifaPorAlias = new Map(tarifas.map(t => [t.alias, t]));
  const modeloPorId = new Map(modelos.map(m => [m.id_modelo, m]));
  const gatewayPorId = new Map(gateways.map(g => [String(g.id_gateway), g]));
  const zonasPorDistritoId = {};
  zonas.forEach(z => {
    const k = String(z.id_distrito);
    if (!zonasPorDistritoId[k]) zonasPorDistritoId[k] = [];
    zonasPorDistritoId[k].push(z);
  });
  console.log(`   ${distritos.length} distritos · ${zonas.length} zonas · ${tarifas.length} tarifas · ${modelos.length} modelos`);

  // --- 1. CONTRATOS ---
  console.log('\n📋 Leyendo contratos_agua.csv...');
  const tCSV1 = Date.now();
  const contratosCsv = await readCsv('03 Practica 5 Recursos contratos_agua.csv');
  console.log(`   ${contratosCsv.length} contratos leídos (${Date.now() - tCSV1}ms)`);

  // --- 2. INFRAESTRUCTURAS ---
  console.log('\n🏠 Leyendo infraestructuras_cochabamba.csv...');
  const tCSV2 = Date.now();
  const infraCsv = await readCsv('03 Practica 5 Recursos infraestructuras_cochabamba.csv');
  console.log(`   ${infraCsv.length} infraestructuras leídas (${Date.now() - tCSV2}ms)`);

  const infraPorCatastro = new Map(infraCsv.map(i => [i.numero_catastro, i]));

  // --- 3. MEDIDORES ---
  console.log('\n🔧 Leyendo medidores_iot.csv...');
  const tCSV3 = Date.now();
  const medidoresCsv = await readCsv('03 Practica 5 Recursos medidores_iot.csv');
  console.log(`   ${medidoresCsv.length} medidores leídos (${Date.now() - tCSV3}ms)`);

  const medidorPorMac = new Map(medidoresCsv.map(m => [m.medidor_iot, m]));

  // --- 4. Construcción de índices contrato↔MAC y enriquecimiento con infra ---
  console.log('\n🔗 Cruzando contratos ↔ medidores ↔ infraestructuras...');
  const contratoPorMac = new Map();
  let contratosConInfra = 0, contratosSinInfra = 0;

  for (const c of contratosCsv) {
    if (c.medidor_iot) contratoPorMac.set(c.medidor_iot, c);

    const infra = infraPorCatastro.get(c.numero_catastro);
    if (infra) {
      contratosConInfra++;
      c._distrito_id = infra.distrito;
      c._zona = infra.zona;
      c._direccion = infra.direccion;
      c._lat = parseFloat(infra.latitud) || null;
      c._lon = parseFloat(infra.longitud) || null;
    } else {
      contratosSinInfra++;
      // Asignar distrito/zona random según el catálogo (estable por contrato)
      const idsDist = Object.keys(zonasPorDistritoId);
      const dId = idsDist[c.numero_contrato.charCodeAt(c.numero_contrato.length - 1) % idsDist.length];
      const z = pick(zonasPorDistritoId[dId]);
      c._distrito_id = dId;
      c._zona = z.zona;
      c._direccion = '';
    }
    const d = distritoPorId.get(String(c._distrito_id));
    c._distrito_nombre = d ? d.nombre : `Distrito ${c._distrito_id}`;
  }
  console.log(`   ${contratosConInfra} con infra · ${contratosSinInfra} sin infra (random distrito)`);

  // --- 5. USUARIOS (únicos por CI) ---
  console.log('\n👥 Insertando usuarios únicos...');
  const usuariosUnicos = new Map();
  for (const c of contratosCsv) {
    const ident = (c.ci_titular || '').trim();
    if (!ident || usuariosUnicos.has(ident)) continue;
    usuariosUnicos.set(ident, {
      identificador: ident,
      tipo_persona: c.categoria === 'Residencial' ? 'natural' : 'juridica',
      nombre: c.titular_contrato || '',
      direccion: c._direccion || '',
    });
  }
  const userQueries = [...usuariosUnicos.values()].map(u => ({
    query: 'INSERT INTO usuarios_por_identificador (identificador,tipo_persona,nombre,telefono,email,direccion) VALUES (?,?,?,?,?,?)',
    params: [u.identificador, u.tipo_persona, u.nombre, '', '', u.direccion],
  }));
  await runConcurrent(client, userQueries, 'usuarios');

  // --- 6. CONTRATOS por número ---
  console.log('\n📜 Insertando contratos...');
  const contratoQueries = contratosCsv.map(c => {
    const fAlta = parseUSDate(c.fecha_contrato);
    return {
      query: 'INSERT INTO contratos_por_numero (numero_contrato,identificador_titular,nombre_titular,tipo_persona,direccion,distrito,zona,tarifa_alias,estado,fecha_alta) VALUES (?,?,?,?,?,?,?,?,?,?)',
      params: [
        c.numero_contrato,
        (c.ci_titular || '').trim(),
        c.titular_contrato || '',
        c.categoria === 'Residencial' ? 'natural' : 'juridica',
        c._direccion || '',
        c._distrito_nombre,
        c._zona,
        aliasFromSubcategoria(c.subcategoria),
        (c.estado_contrato || 'activo').toLowerCase(),
        fAlta ? types.LocalDate.fromDate(fAlta) : null,
      ],
    };
  });
  await runConcurrent(client, contratoQueries, 'contratos');

  // --- 7. INFRAESTRUCTURAS (solo las que tienen contrato asociado) ---
  console.log('\n🏗️  Insertando infraestructuras...');
  // Construir mapa catastro → numero_contrato (puede haber varios contratos por catastro, tomamos uno)
  const catastroAContrato = new Map();
  for (const c of contratosCsv) {
    if (!catastroAContrato.has(c.numero_catastro)) {
      catastroAContrato.set(c.numero_catastro, c);
    }
  }

  const tiposInfra = ['Vivienda', 'Edificio', 'Condominio', 'Comercio'];
  const infraQueries1 = [];
  const infraQueries2 = [];
  for (const i of infraCsv) {
    const c = catastroAContrato.get(i.numero_catastro);
    if (!c) continue; // skip infra sin contrato
    const infraId = types.Uuid.random();
    const tipoI = pick(tiposInfra);
    const lat = parseFloat(i.latitud) || null;
    const lon = parseFloat(i.longitud) || null;
    const d = distritoPorId.get(String(i.distrito));
    const distNombre = d ? d.nombre : `Distrito ${i.distrito}`;

    infraQueries1.push({
      query: 'INSERT INTO infraestructura_por_id (id_infraestructura,numero_contrato,identificador_titular,tipo_infraestructura,direccion,distrito,zona,lat,lon,cantidad_medidores) VALUES (?,?,?,?,?,?,?,?,?,?)',
      params: [infraId, c.numero_contrato, (c.ci_titular || '').trim(), tipoI, i.direccion || '', distNombre, i.zona, lat, lon, 1],
    });
    infraQueries2.push({
      query: 'INSERT INTO infraestructuras_por_zona (distrito,zona,id_infraestructura,numero_contrato,tipo_infraestructura,direccion,lat,lon,cantidad_medidores) VALUES (?,?,?,?,?,?,?,?,?)',
      params: [distNombre, i.zona, infraId, c.numero_contrato, tipoI, i.direccion || '', lat, lon, 1],
    });
  }
  await runConcurrent(client, infraQueries1, 'infra_por_id');
  await runConcurrent(client, infraQueries2, 'infra_por_zona');

  // --- 8. MEDIDORES ---
  console.log('\n📟 Insertando medidores...');
  const medQ1 = [], medQ2 = [], medQ3 = [], medQ4 = [];
  let medSinContrato = 0;

  for (const m of medidoresCsv) {
    const c = contratoPorMac.get(m.medidor_iot);
    if (!c) { medSinContrato++; continue; }

    const tipoId = parseInt(m.tipo_medidor_id) || 1;
    const modelo = modeloPorId.get(tipoId);
    const serie = macToSerie(m.medidor_iot);
    const estado = estadoMedidorMap(m.estado);
    const fInst = m.fecha_instalacion ? new Date(m.fecha_instalacion) : null;
    // Asignar gateway determinístico por hash de MAC
    const gwKeys = [...gatewayPorId.keys()];
    const gwId = gwKeys[m.medidor_iot.charCodeAt(0) % gwKeys.length];
    const gw = gatewayPorId.get(gwId);
    const lat = c._lat;
    const lon = c._lon;

    medQ1.push({
      query: 'INSERT INTO medidores_por_serie (numero_serie,mac,id_modelo,modelo,numero_contrato,id_infraestructura,tarifa_alias,distrito,zona,radiobase,fecha_instalacion,estado,lat,lon) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      params: [serie, m.medidor_iot, tipoId, modelo?.nombre || 'Desconocido', c.numero_contrato, null, aliasFromSubcategoria(c.subcategoria), c._distrito_nombre, c._zona, gw?.nombre || `GW-${gwId}`, fInst ? types.LocalDate.fromDate(fInst) : null, estado, lat, lon],
    });
    medQ2.push({
      query: 'INSERT INTO medidores_por_mac (mac,numero_serie,numero_contrato,distrito,zona,estado) VALUES (?,?,?,?,?,?)',
      params: [m.medidor_iot, serie, c.numero_contrato, c._distrito_nombre, c._zona, estado],
    });
    medQ3.push({
      query: 'INSERT INTO medidores_por_distrito_zona (distrito,zona,estado,numero_serie,mac,modelo,tarifa_alias,fecha_instalacion,lat,lon) VALUES (?,?,?,?,?,?,?,?,?,?)',
      params: [c._distrito_nombre, c._zona, estado, serie, m.medidor_iot, modelo?.nombre || 'Desconocido', aliasFromSubcategoria(c.subcategoria), fInst ? types.LocalDate.fromDate(fInst) : null, lat, lon],
    });
    medQ4.push({
      query: 'INSERT INTO medidores_por_radiobase_zona (radiobase,distrito,zona,numero_serie,mac,modelo,estado) VALUES (?,?,?,?,?,?,?)',
      params: [gw?.nombre || `GW-${gwId}`, c._distrito_nombre, c._zona, serie, m.medidor_iot, modelo?.nombre || 'Desconocido', estado],
    });
  }
  console.log(`   ${medSinContrato} medidores sin contrato (omitidos)`);
  await runConcurrent(client, medQ1, 'medidores_por_serie');
  await runConcurrent(client, medQ2, 'medidores_por_mac');
  await runConcurrent(client, medQ3, 'medidores_por_distrito_zona');
  await runConcurrent(client, medQ4, 'medidores_por_radiobase_zona');

  // --- 9. LECTURAS (streaming + agregados) ---
  console.log('\n📈 Procesando lecturas_iot.csv (streaming)...');
  const tLec = Date.now();
  const lecturaQueries = [];
  const consumoPorContratoPeriodo = new Map(); // key: contrato|periodo

  await new Promise((resolve, reject) => {
    let count = 0, skipped = 0;
    fs.createReadStream(path.join(RECURSOS, '03 Practica 5 Recursos lecturas_iot.csv'), { encoding: 'utf-8' })
      .pipe(parse({ columns: true, skip_empty_lines: true, relax_quotes: true }))
      .on('data', row => {
        const mac = row.medidor_iot;
        const c = contratoPorMac.get(mac);
        if (!c) { skipped++; return; }

        const fechaLectura = parseUSDate(row.fechaHoraLectura);
        if (!fechaLectura) { skipped++; return; }

        const periodo = fmtPeriodo(fechaLectura);
        const lecAnterior = parseInt(row.lecturaAnterior) || 0;
        const lecActual = parseInt(row.LecturaActual) || 0;
        const consumo = Math.max(0, lecActual - lecAnterior);
        const radiobase = String(row.radiobase || '0');
        const gw = gatewayPorId.get(radiobase);
        const radiobaseNombre = gw?.nombre || `GW-${radiobase}`;

        lecturaQueries.push({
          query: 'INSERT INTO lecturas_por_medidor_mes (numero_serie,periodo,fecha_hora,mac,radiobase,lectura_m3,lectura_litros,lectura_anterior_m3,lectura_actual_m3,status,descripcion_status,distrito,zona,origen) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
          params: [macToSerie(mac), periodo, fechaLectura, mac, radiobaseNombre, consumo, consumo * 1000, lecAnterior, lecActual, 1, 'Automatico (Bien)', c._distrito_nombre, c._zona, 'iot'],
        });

        const k = `${c.numero_contrato}|${periodo}`;
        if (!consumoPorContratoPeriodo.has(k)) {
          consumoPorContratoPeriodo.set(k, {
            contrato: c.numero_contrato, periodo, consumo: 0,
            ci: (c.ci_titular || '').trim(), nombre: c.titular_contrato || '',
            distrito: c._distrito_nombre, zona: c._zona,
            tarifa: aliasFromSubcategoria(c.subcategoria),
            fechasPago: [],
          });
        }
        const entry = consumoPorContratoPeriodo.get(k);
        entry.consumo += consumo;

        const fPago = parseUSDate(row.fecha_pago);
        if (fPago) entry.fechasPago.push(fPago);

        count++;
        if (count % 50000 === 0) process.stdout.write(`\r   leídas: ${count}`);
      })
      .on('end', () => {
        console.log(`\r   ${count} lecturas válidas (${skipped} descartadas) — ${Date.now() - tLec}ms`);
        resolve();
      })
      .on('error', reject);
  });

  console.log(`\n📈 Insertando ${lecturaQueries.length} lecturas...`);
  await runConcurrent(client, lecturaQueries, 'lecturas');

  // --- 10. CONSUMO MENSUAL POR CONTRATO (con estado_facturacion REAL) ---
  console.log('\n💵 Calculando estado_facturacion real (sin mock)...');
  const today = new Date();
  const consumoQueries = [];
  let pagados = 0, pagadosAtrasados = 0, vencidos = 0, pendientes = 0;

  for (const [, data] of consumoPorContratoPeriodo) {
    const tarifa = tarifaPorAlias.get(data.tarifa);
    const monto = tarifa ? calcularMontoPorConsumo(data.consumo, tarifa).montoBs : 0;

    // Emisión = día 1 del mes siguiente al período. Vencimiento = +20 días.
    const [y, m] = data.periodo.split('-').map(Number);
    const fechaEmision = new Date(y, m, 1);   // mes siguiente (m porque getMonth es 0-indexed)
    const fechaVencimiento = new Date(y, m, 21);

    let estado, fechaPagoFinal = null, diasAtraso = 0;
    if (data.fechasPago.length > 0) {
      fechaPagoFinal = data.fechasPago.sort((a, b) => a - b)[0];
      if (fechaPagoFinal <= fechaVencimiento) {
        estado = 'pagado'; pagados++;
      } else {
        estado = 'pagado_atrasado'; pagadosAtrasados++;
        diasAtraso = Math.floor((fechaPagoFinal - fechaVencimiento) / 86400000);
      }
    } else {
      if (today > fechaVencimiento) {
        estado = 'vencido'; vencidos++;
        diasAtraso = Math.floor((today - fechaVencimiento) / 86400000);
      } else {
        estado = 'pendiente'; pendientes++;
      }
    }

    consumoQueries.push({
      query: 'INSERT INTO consumo_mensual_por_contrato (numero_contrato,periodo,identificador_titular,nombre_titular,distrito,zona,tarifa_alias,consumo_m3,monto_bs,estado_facturacion,fecha_emision,fecha_vencimiento,fecha_pago,dias_atraso) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      params: [
        data.contrato, data.periodo, data.ci, data.nombre,
        data.distrito, data.zona, data.tarifa,
        data.consumo, +monto.toFixed(2), estado,
        types.LocalDate.fromDate(fechaEmision),
        types.LocalDate.fromDate(fechaVencimiento),
        fechaPagoFinal, diasAtraso,
      ],
    });
  }
  console.log(`   Distribución: ${pagados} pagados · ${pagadosAtrasados} pagados atrasados · ${vencidos} vencidos · ${pendientes} pendientes`);
  await runConcurrent(client, consumoQueries, 'consumo_mensual');

  // --- 11. PREAVISOS (notificaciones para los vencidos/pendientes con atraso > 0) ---
  console.log('\n📨 Generando preavisos para contratos con deuda...');
  const canales = ['email', 'sms', 'whatsapp'];
  const notifQueries = [];

  for (const [, data] of consumoPorContratoPeriodo) {
    if (data.fechasPago.length > 0) continue; // ya pagó
    // 65% de los morosos reciben preaviso
    const seed = data.contrato.charCodeAt(data.contrato.length - 1);
    if ((seed % 100) >= 65) continue;

    const canalIdx = seed % 3;
    const canal = canales[canalIdx];
    const [y, m] = data.periodo.split('-').map(Number);
    const fechaEnvio = new Date(y, m, 5 + (seed % 10), 9 + (seed % 8), 0); // entre día 5-14, hora 9-16
    // 85% entregado, 10% enviado pendiente, 5% fallido
    const estPick = seed % 100;
    const estado = estPick < 85 ? 'entregado' : estPick < 95 ? 'enviado' : 'fallido';

    notifQueries.push({
      query: 'INSERT INTO notificaciones_por_contrato (numero_contrato,periodo,fecha_hora,formato,identificador,estado,tipo,mensaje) VALUES (?,?,?,?,?,?,?,?)',
      params: [
        data.contrato, data.periodo, fechaEnvio, canal, data.ci, estado, 'preaviso',
        `SEMAPA: Estimado(a) ${data.nombre}, su factura del período ${data.periodo} por Bs ${(tarifaPorAlias.get(data.tarifa) ? calcularMontoPorConsumo(data.consumo, tarifaPorAlias.get(data.tarifa)).montoBs : 0).toFixed(2)} está pendiente. Regularice su pago.`,
      ],
    });
  }
  await runConcurrent(client, notifQueries, 'preavisos');

  // --- 12. AGREGADOS PARA DASHBOARDS (errores por modelo y distrito) ---
  // En esta carga real, status siempre = 1 (las lecturas del CSV no tienen errores).
  // Para simular errores realistas según el PDF (0.5%), generamos errores derivados.
  console.log('\n⚠️  Generando errores derivados (0.5% según PDF)...');
  const codigosError = [3, 4, 5];
  const descError = { 3: 'Falla en la alimentación eléctrica', 4: 'Fallo en la conectividad de red', 5: 'Configuración incorrecta del sensor o gateway' };

  const erroresPorModelo = new Map();   // key: periodo|modelo|cod
  const erroresPorDistrito = new Map(); // key: periodo|distrito|zona|cod

  // Generar ~0.5% de errores en las lecturas existentes, distribuidos entre los 5 modelos × 3 códigos.
  // BUG fix 1: usar un contador propio (errIdx) en vez de `i`, porque `i` salta de 200 en 200
  //            y `200 % 5 === 0` siempre → todos caían en el mismo modelo.
  // BUG fix 2: código usa floor(errIdx/3) para no sincronizar con el período de la lectura
  //            (períodos vienen alternados en el CSV, así garantizamos 3 cods × cada período).
  let errIdx = 0;
  for (let i = 0; i < lecturaQueries.length; i += 200) {
    const q = lecturaQueries[i];
    const cod = codigosError[Math.floor(errIdx / 3) % 3];
    const modeloId = (errIdx % 5) + 1;
    const modeloNombre = modelos.find(m => m.id_modelo === modeloId)?.nombre || 'Desconocido';
    const periodo = q.params[1];
    const distrito = q.params[11];
    const zona = q.params[12];

    const kM = `${periodo}|${modeloNombre}|${cod}`;
    erroresPorModelo.set(kM, (erroresPorModelo.get(kM) || 0) + 1);
    const kD = `${periodo}|${distrito}|${zona}|${cod}`;
    erroresPorDistrito.set(kD, (erroresPorDistrito.get(kD) || 0) + 1);
    errIdx++;
  }

  const errMQueries = [...erroresPorModelo.entries()].map(([k, cant]) => {
    const [periodo, modelo, codStr] = k.split('|');
    const cod = parseInt(codStr);
    return {
      query: 'INSERT INTO errores_por_modelo_mes (periodo,modelo,codigo_error,descripcion_error,cantidad) VALUES (?,?,?,?,?)',
      params: [periodo, modelo, cod, descError[cod], cant],
    };
  });
  const errDQueries = [...erroresPorDistrito.entries()].map(([k, cant]) => {
    const [periodo, distrito, zona, codStr] = k.split('|');
    const cod = parseInt(codStr);
    return {
      query: 'INSERT INTO errores_por_distrito_zona (periodo,distrito,zona,codigo_error,descripcion_error,cantidad) VALUES (?,?,?,?,?,?)',
      params: [periodo, distrito, zona, cod, descError[cod], cant],
    };
  });
  await runConcurrent(client, errMQueries, 'errores_por_modelo');
  await runConcurrent(client, errDQueries, 'errores_por_distrito');

  // --- 13. VERIFICACIÓN ---
  console.log('\n🔍 Verificación final...');
  const tablasVerif = [
    'usuarios_por_identificador', 'contratos_por_numero', 'infraestructura_por_id',
    'medidores_por_serie', 'lecturas_por_medidor_mes', 'consumo_mensual_por_contrato',
    'notificaciones_por_contrato', 'errores_por_modelo_mes', 'errores_por_distrito_zona',
  ];
  for (const t of tablasVerif) {
    const r = await client.execute(`SELECT COUNT(*) as cnt FROM ${t}`);
    console.log(`   📋 ${t}: ${r.rows[0].cnt.toNumber().toLocaleString()}`);
  }

  console.log('\n============================================================');
  console.log('  ✅ CARGA DE DATOS REALES COMPLETADA');
  console.log('============================================================\n');
  await client.shutdown();
}

main().catch(err => {
  console.error('❌ Error fatal:', err.message);
  console.error(err.stack);
  process.exit(1);
});
