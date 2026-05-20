// ============================================================
// SEMAPA - Carga de catálogos desde CSV a Cassandra
// ============================================================
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { createClient, types } from './config.js';

const RECURSOS_DIR = path.resolve('../Recursos');

// ============================================================
// Utilidades
// ============================================================
function readCsv(filename) {
  const filepath = path.join(RECURSOS_DIR, filename);
  const content = fs.readFileSync(filepath, 'utf-8');
  return parse(content, {
    columns: false,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
  });
}

function clean(val) {
  if (!val || val.trim() === '' || val.trim() === '.') return null;
  return val.trim();
}

function toInt(val) {
  const c = clean(val);
  if (c === null) return null;
  const n = parseInt(c, 10);
  return isNaN(n) ? null : n;
}

function toDecimal(val) {
  const c = clean(val);
  if (c === null) return null;
  const n = parseFloat(c);
  return isNaN(n) ? null : n;
}

function parseDMS(dmsStr) {
  if (!dmsStr) return { lat: null, lon: null };
  const cleaned = dmsStr.replace(/[""]/g, '"');
  const parts = cleaned.match(/([\d.]+)°([\d.]+)'([\d.]+)"([NSEW])/g);
  if (!parts || parts.length < 2) return { lat: null, lon: null };

  function dmsToDecimal(dms) {
    const m = dms.match(/([\d.]+)°([\d.]+)'([\d.]+)"([NSEW])/);
    if (!m) return null;
    let dec = parseFloat(m[1]) + parseFloat(m[2]) / 60 + parseFloat(m[3]) / 3600;
    if (m[4] === 'S' || m[4] === 'W') dec = -dec;
    return dec;
  }

  return {
    lat: dmsToDecimal(parts[0]),
    lon: dmsToDecimal(parts[1]),
  };
}

// ============================================================
// 1. Cargar Errores IoT y Gateways (están en el mismo CSV)
// ============================================================
async function cargarErroresYGateways(client) {
  console.log('\n📡 Cargando errores IoT y gateways...');
  const rows = readCsv('Recursos Practica 5 - ErroresIOT.csv');

  let erroresCount = 0;
  let gatewaysCount = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const codigo = toInt(row[0]);
    const descripcion = clean(row[1]);

    if (codigo !== null && descripcion !== null) {
      await client.execute(
        'INSERT INTO catalogo_errores_iot (codigo, descripcion) VALUES (?, ?)',
        [codigo, descripcion],
        { prepare: true }
      );
      erroresCount++;
    }

    const gwId = toInt(row[4]);
    const gwName = clean(row[5]);
    const gwLoc = clean(row[6]);

    if (gwId !== null && gwName !== null) {
      const coords = parseDMS(gwLoc);
      await client.execute(
        'INSERT INTO catalogo_gateways (id_gateway, nombre, lat, lon) VALUES (?, ?, ?, ?)',
        [gwId, gwName, coords.lat, coords.lon],
        { prepare: true }
      );
      gatewaysCount++;
    }
  }

  console.log(`   ✅ ${erroresCount} errores IoT cargados`);
  console.log(`   ✅ ${gatewaysCount} gateways cargados`);
}

// ============================================================
// 2. Cargar Modelos de Medidores
// ============================================================
async function cargarModelos(client) {
  console.log('\n📊 Cargando modelos de medidores...');
  const rows = readCsv('Recursos Practica 5 - ModeloMedidores.csv');

  let count = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const id = toInt(row[0]);
    const fabricante = clean(row[1]);
    const nombre = clean(row[2]);
    const tecnologia = clean(row[3]);
    const aplicacion = clean(row[4]);
    const datasheet = clean(row[5]);

    if (id !== null) {
      await client.execute(
        'INSERT INTO catalogo_modelos_medidor (id_modelo, nombre, fabricante, tecnologia, aplicacion, datasheet) VALUES (?, ?, ?, ?, ?, ?)',
        [id, nombre, fabricante, tecnologia, aplicacion, datasheet],
        { prepare: true }
      );
      count++;
    }
  }

  console.log(`   ✅ ${count} modelos cargados`);
}

// ============================================================
// 3. Cargar Tarifario
// ============================================================
async function cargarTarifario(client) {
  console.log('\n💰 Cargando tarifario...');
  const rows = readCsv('Recursos Practica 5 - Tarifario.csv');

  let count = 0;
  let lastCategoria = null;

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    let categoria = clean(row[0]);
    if (categoria) lastCategoria = categoria;
    else categoria = lastCategoria;

    const alias = clean(row[1]);
    // Reglamento SEMAPA Art.4: los primeros 12 m³ son fijos para todas las categorías.
    // CSV col[2] (16.74, 33.37, ...) = monto TOTAL por esos 12 m³ → cargo_fijo.
    // CSV col[3] (1.40, 2.78, ...) es redundante (= col[2]/12), se ignora.
    const consumo_minimo = 12;
    const cargo_fijo = toDecimal(row[2]);
    const r13_25 = toDecimal(row[4]);
    const r26_50 = toDecimal(row[5]);
    const r51_75 = toDecimal(row[6]);
    const r76_100 = toDecimal(row[7]);
    const r101_150 = toDecimal(row[8]);
    const r151_mas = toDecimal(row[9]);
    const descripcion = clean(row[10]);

    if (alias) {
      await client.execute(
        `INSERT INTO catalogo_tarifas (alias, categoria, descripcion, consumo_minimo_m3, cargo_fijo,
         rango_13_25, rango_26_50, rango_51_75, rango_76_100, rango_101_150, rango_151_mas, moneda)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [alias, categoria, descripcion, consumo_minimo, cargo_fijo,
         r13_25, r26_50, r51_75, r76_100, r101_150, r151_mas, 'USD'],
        { prepare: true }
      );
      count++;
    }
  }

  console.log(`   ✅ ${count} tarifas cargadas`);
}

// ============================================================
// 4. Cargar Tipos de Infraestructura
// ============================================================
async function cargarTiposInfraestructura(client) {
  console.log('\n🏗️  Cargando tipos de infraestructura...');
  const rows = readCsv('Recursos Practica 5 - Infraestructuras.csv');

  let count = 0;
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    const id = toInt(row[0]);
    const descripcion = clean(row[1]);

    if (id !== null && descripcion) {
      await client.execute(
        'INSERT INTO catalogo_tipos_infraestructura (id_tipo, descripcion) VALUES (?, ?)',
        [id, descripcion],
        { prepare: true }
      );
      count++;
    }
  }

  console.log(`   ✅ ${count} tipos de infraestructura cargados`);
}

// ============================================================
// 5. Cargar Distritos y Zonas (desde Distritos.csv)
//
// ESTRUCTURA DEL CSV:
//   Col 0: SUB ALCALDÍA (solo aparece cuando cambia)
//   Col 1: DISTRITO (número, solo aparece cuando cambia)
//   Col 2: SUB-DISTRITO
//   Col 3: ZONA
//   Col 4: Gateway(s)
//   Col 5: HABITANTES (solo aparece en la primera fila de cada subalcaldía)
//   Col 6-14: R1, R2, R3, R4, C, CE, I, P, S
//   Col 15: Total
//
// MAPEO CORRECTO (6 subalcaldías → 15 distritos):
//   TUNARI          → Distritos 1, 2, 13   → Población 90,026
//   MOLLE           → Distritos 3, 4       → Población 91,442
//   ALEJO CALATAYUD → Distritos 5, 8       → Población 101,368
//   VALLE HERMOSO   → Distritos 6, 7, 14   → Población 98,167
//   ITOCTA          → Distritos 9, 15      → Población 131,295
//   ADELA ZAMUDIO   → Distritos 10, 11, 12 → Población 119,710
// ============================================================
async function cargarDistritosYZonas(client) {
  console.log('\n🗺️  Cargando distritos y zonas...');
  const rows = readCsv('Recursos Practica 5 - Distritos.csv');

  // --- PASO 1: Parsear todas las filas y determinar mapeo subalcaldía → distritos ---
  let lastSubalcaldia = null;
  let lastDistrito = null;

  // Mapa: subalcaldía → { población, distritos: Set }
  const subalcaldiaMap = new Map();
  // Mapa: distrito → { subalcaldía, zonas[] }
  const distritoMap = new Map();

  const zonasData = [];

  for (let i = 2; i < rows.length - 1; i++) { // -1 para saltar fila de totales
    const row = rows[i];

    // --- Subalcaldía ---
    let subalcaldia = clean(row[0]);
    if (subalcaldia) {
      subalcaldia = subalcaldia.replace(/\n\s*/g, ' ').trim();
      lastSubalcaldia = subalcaldia;
    } else {
      subalcaldia = lastSubalcaldia;
    }

    // --- Distrito ---
    let distritoRaw = clean(row[1]);
    let distritoNum;
    if (distritoRaw) {
      distritoNum = parseInt(distritoRaw, 10);
      lastDistrito = distritoNum;
    } else {
      distritoNum = lastDistrito;
    }

    // --- Otros campos ---
    const subdistrito = clean(row[2]);
    const zona = clean(row[3]);
    const gateway = clean(row[4]);
    const habitantes = toInt(row[5]);
    const r1 = toInt(row[6]);
    const r2 = toInt(row[7]);
    const r3 = toInt(row[8]);
    const r4 = toInt(row[9]);
    const c = toInt(row[10]);
    const ce = toInt(row[11]);
    const indust = toInt(row[12]);
    const p = toInt(row[13]);
    const s = toInt(row[14]);
    const total = toInt(row[15]);

    // --- Registrar subalcaldía ---
    if (!subalcaldiaMap.has(subalcaldia)) {
      subalcaldiaMap.set(subalcaldia, { poblacion: null, distritos: new Set() });
    }
    const subEntry = subalcaldiaMap.get(subalcaldia);
    subEntry.distritos.add(distritoNum);
    if (habitantes !== null) {
      subEntry.poblacion = habitantes; // Tomar la primera que aparezca
    }

    // --- Registrar distrito ---
    if (!distritoMap.has(distritoNum)) {
      distritoMap.set(distritoNum, { subalcaldia });
    }

    // --- Guardar zona ---
    if (zona) {
      zonasData.push({
        distrito: distritoNum,
        subdistrito,
        zona,
        subalcaldia,
        gateway,
        habitantes, // solo la de la fila, puede ser null
        r1, r2, r3, r4, c, ce, i: indust, p, s, total,
      });
    }
  }

  // --- Log del mapeo encontrado ---
  console.log('   📋 Mapeo subalcaldías → distritos:');
  for (const [sub, data] of subalcaldiaMap) {
    const dists = [...data.distritos].sort((a, b) => a - b).join(', ');
    console.log(`      ${sub}: Distritos [${dists}] → Población: ${data.poblacion || '???'}`);
  }

  // --- PASO 2: Insertar distritos con población propagada ---
  let distritosCount = 0;

  // Coordenadas base aproximadas por subalcaldía (centro Cochabamba)
  const coordsSub = {
    'TUNARI':          { lat: -17.370, lon: -66.165 },
    'MOLLE':           { lat: -17.378, lon: -66.185 },
    'ALEJO CALATAYUD': { lat: -17.400, lon: -66.150 },
    'VALLE HERMOSO':   { lat: -17.420, lon: -66.135 },
    'ITOCTA':          { lat: -17.440, lon: -66.155 },
    'ADELA ZAMUDIO':   { lat: -17.385, lon: -66.130 },
  };

  for (const [distritoNum, distData] of distritoMap) {
    const subData = subalcaldiaMap.get(distData.subalcaldia);
    const poblacion = subData.poblacion; // Propagada desde la subalcaldía

    // Coordenadas con pequeña variación por distrito
    const baseCoords = coordsSub[distData.subalcaldia] || { lat: -17.39, lon: -66.16 };
    const lat = baseCoords.lat + (Math.random() - 0.5) * 0.02;
    const lon = baseCoords.lon + (Math.random() - 0.5) * 0.02;

    await client.execute(
      'INSERT INTO catalogo_distritos (id_distrito, nombre, subalcaldia, poblacion, lat, lon) VALUES (?, ?, ?, ?, ?, ?)',
      [distritoNum, `Distrito ${distritoNum}`, distData.subalcaldia, poblacion, lat, lon],
      { prepare: true }
    );
    distritosCount++;
  }

  // --- PASO 3: Insertar zonas ---
  let zonasCount = 0;

  for (const z of zonasData) {
    const zonaId = types.Uuid.random();
    await client.execute(
      `INSERT INTO catalogo_zonas (id_zona, id_distrito, distrito, subdistrito, zona, subalcaldia,
       gateway, habitantes, r1, r2, r3, r4, c, ce, i, p, s, total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [zonaId, z.distrito, String(z.distrito), z.subdistrito, z.zona, z.subalcaldia,
       z.gateway, z.habitantes, z.r1, z.r2, z.r3, z.r4, z.c, z.ce, z.i, z.p, z.s, z.total],
      { prepare: true }
    );
    zonasCount++;
  }

  console.log(`   ✅ ${distritosCount} distritos cargados (población propagada desde subalcaldía)`);
  console.log(`   ✅ ${zonasCount} zonas cargadas`);
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('============================================================');
  console.log('  SEMAPA - Carga de Catálogos a Cassandra');
  console.log('============================================================');

  const client = createClient(true);

  try {
    await client.connect();
    console.log('✅ Conectado a Cassandra (keyspace: semapa)');

    // Limpiar catálogos antes de recargar
    console.log('\n🧹 Limpiando catálogos anteriores...');
    const tables = [
      'catalogo_errores_iot', 'catalogo_gateways', 'catalogo_modelos_medidor',
      'catalogo_tarifas', 'catalogo_tipos_infraestructura',
      'catalogo_distritos', 'catalogo_zonas'
    ];
    for (const t of tables) {
      await client.execute(`TRUNCATE ${t}`);
    }
    console.log('   ✅ Catálogos limpiados');

    await cargarErroresYGateways(client);
    await cargarModelos(client);
    await cargarTarifario(client);
    await cargarTiposInfraestructura(client);
    await cargarDistritosYZonas(client);

    // --- VERIFICACIÓN FINAL ---
    console.log('\n🔍 Verificación final...');
    const checks = [
      { table: 'catalogo_errores_iot', expected: 9 },
      { table: 'catalogo_gateways', expected: 4 },
      { table: 'catalogo_modelos_medidor', expected: 5 },
      { table: 'catalogo_tarifas', expected: 9 },
      { table: 'catalogo_tipos_infraestructura', expected: 12 },
      { table: 'catalogo_distritos', expected: 15 },
      { table: 'catalogo_zonas', expected: 54 },
    ];

    let allGood = true;
    for (const chk of checks) {
      const result = await client.execute(`SELECT COUNT(*) as cnt FROM ${chk.table}`);
      const count = result.rows[0].cnt.toNumber();
      const status = count === chk.expected ? '✅' : '❌';
      if (count !== chk.expected) allGood = false;
      console.log(`   ${status} ${chk.table}: ${count}/${chk.expected}`);
    }

    // Verificar que no haya distritos con población NULL
    const distCheck = await client.execute('SELECT id_distrito, nombre, subalcaldia, poblacion FROM catalogo_distritos');
    const nullPob = distCheck.rows.filter(r => r.poblacion === null);
    if (nullPob.length > 0) {
      console.log(`   ❌ ${nullPob.length} distritos con población NULL: ${nullPob.map(r => r.id_distrito).join(', ')}`);
      allGood = false;
    } else {
      console.log('   ✅ Todos los distritos tienen población');
    }

    console.log('\n============================================================');
    console.log(allGood
      ? '  ✅ TODOS LOS CATÁLOGOS CARGADOS Y VERIFICADOS CORRECTAMENTE'
      : '  ⚠️  CATÁLOGOS CARGADOS CON ADVERTENCIAS');
    console.log('============================================================\n');
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
  } finally {
    await client.shutdown();
  }
}

main();
