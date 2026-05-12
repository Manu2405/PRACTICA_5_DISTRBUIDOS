// ============================================================
// SEMAPA - Generador de datos simulados (optimizado)
// Nivel: 1,000 medidores (prueba inicial)
// ============================================================
import { createClient, types } from './config.js';
import { faker } from '@faker-js/faker/locale/es_MX';

// --- CONFIG ---
const TOTAL_MEDIDORES = 1000;
const MESES_LECTURAS = 6;
const TASA_ERROR = 0.005;
const TASA_DUPLICADO = 0.0007;
const CONCURRENCY = 80; // promesas paralelas

// --- Helpers ---
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomFloat(min, max) { return Math.random() * (max - min) + min; }
function pick(arr) { return arr[randomInt(0, arr.length - 1)]; }
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}
function formatPeriodo(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function generateMAC() {
  return Array.from({ length: 6 }, () => randomInt(0, 255).toString(16).padStart(2, '0')).join(':');
}
function generateSerial(modelId) {
  const prefixes = { 1: 'KH', 2: 'SG', 3: 'BM', 4: 'ED', 5: 'LH' };
  return `${prefixes[modelId] || 'XX'}-${randomInt(100000, 999999)}`;
}

// Cola de ejecución concurrente
async function runBatch(client, queries) {
  const chunks = [];
  for (let i = 0; i < queries.length; i += CONCURRENCY) {
    chunks.push(queries.slice(i, i + CONCURRENCY));
  }
  for (const chunk of chunks) {
    await Promise.all(chunk.map(q => client.execute(q.query, q.params, { prepare: true })));
  }
}

const CALLES = [
  'Av. Heroínas', 'Av. Ayacucho', 'Av. Aroma', 'Av. América', 'Av. Ballivián',
  'Av. Oquendo', 'Av. Blanco Galindo', 'Av. Petrolera', 'Av. Beijing', 'Av. Villazón',
  'C. España', 'C. Colombia', 'C. Ecuador', 'C. Jordán', 'C. Sucre',
  'C. Bolívar', 'C. Hamiraya', 'C. Baptista', 'C. 25 de Mayo', 'C. Lanza',
  'C. Nataniel Aguirre', 'C. Esteban Arze', 'C. Antezana', 'C. Ladislao Cabrera',
  'C. General Achá', 'Psj. Boulevard', 'C. Tumusla', 'C. Calama', 'C. Punata',
  'Av. Tadeo Haenke', 'Av. Circunvalación', 'Av. D\'Orbigny', 'Av. Pando',
];

const ESTADOS_MEDIDOR = ['activo','activo','activo','activo','activo',
  'activo','activo','activo','inactivo','fuera_servicio'];

const BASE_LAT = -17.3935;
const BASE_LON = -66.1570;

async function main() {
  console.log('============================================================');
  console.log('  SEMAPA - Generación de Datos Simulados (optimizado)');
  console.log(`  Objetivo: ${TOTAL_MEDIDORES} medidores, ${MESES_LECTURAS} meses`);
  console.log('============================================================');

  const client = createClient(true);
  await client.connect();
  console.log('✅ Conectado a Cassandra\n');

  // --- 1. Leer catálogos ---
  console.log('📖 Leyendo catálogos...');
  const zonas = (await client.execute('SELECT * FROM catalogo_zonas')).rows;
  const tarifas = (await client.execute('SELECT * FROM catalogo_tarifas')).rows;
  const modelos = (await client.execute('SELECT * FROM catalogo_modelos_medidor')).rows;
  const errores = (await client.execute('SELECT * FROM catalogo_errores_iot')).rows;
  const gateways = (await client.execute('SELECT * FROM catalogo_gateways')).rows;
  const tiposInfra = (await client.execute('SELECT * FROM catalogo_tipos_infraestructura')).rows;
  const erroresList = errores.filter(e => e.codigo > 1);
  console.log(`   Zonas: ${zonas.length}, Tarifas: ${tarifas.length}, Modelos: ${modelos.length}`);

  // --- 2. Distribución por zona ---
  const totalMedCSV = zonas.reduce((s, z) => s + (z.total || 0), 0);
  const zonaDistrib = zonas.map(z => ({
    ...z,
    medidoresAsignados: Math.max(1, Math.round((z.total / totalMedCSV) * TOTAL_MEDIDORES)),
    tarifaDist: { R1: z.r1||0, R2: z.r2||0, R3: z.r3||0, R4: z.r4||0,
      C: z.c||0, CE: z.ce||0, I: z.i||0, P: z.p||0, S: z.s||0 }
  }));
  let totalAsig = zonaDistrib.reduce((s, z) => s + z.medidoresAsignados, 0);
  while (totalAsig !== TOTAL_MEDIDORES) {
    const idx = randomInt(0, zonaDistrib.length - 1);
    if (totalAsig < TOTAL_MEDIDORES) { zonaDistrib[idx].medidoresAsignados++; totalAsig++; }
    else if (zonaDistrib[idx].medidoresAsignados > 1) { zonaDistrib[idx].medidoresAsignados--; totalAsig--; }
  }

  // --- 3. Generar personas/contratos/infra/medidores (en memoria + batch insert) ---
  console.log('\n🏭 Generando entidades...');
  const allMedidores = []; // guardamos para lecturas
  let queries = [];
  let pCnt = 0, cCnt = 0, iCnt = 0, mCnt = 0;

  for (const zona of zonaDistrib) {
    const distrito = String(zona.id_distrito);
    const zonaN = zona.zona;
    const gwName = zona.gateway;
    const tarifaTotal = Object.values(zona.tarifaDist).reduce((s,v) => s+v, 0) || 1;

    function elegirTarifa() {
      const r = Math.random() * tarifaTotal;
      let acum = 0;
      for (const [alias, peso] of Object.entries(zona.tarifaDist)) {
        acum += peso;
        if (r <= acum) return alias;
      }
      return 'R3';
    }

    let rest = zona.medidoresAsignados;
    while (rest > 0) {
      const medPorInfra = Math.min(randomInt(1, 3), rest);
      rest -= medPorInfra;

      // Persona
      const esJur = Math.random() < 0.06;
      const ident = esJur ? `NIT-${randomInt(1000000,9999999)}` : `CI-${randomInt(1000000,9999999)}`;
      const nombre = esJur ? faker.company.name()
        : `${faker.person.lastName()} ${faker.person.lastName()} ${faker.person.firstName()}`;
      const tipoPers = esJur ? 'juridica' : 'natural';
      const tel = `+591 ${randomInt(60000000,79999999)}`;
      const email = faker.internet.email({firstName: nombre.split(' ')[0]}).toLowerCase();
      const dir = `${pick(CALLES)} #${randomInt(1,2500)}`;

      queries.push({ query: 'INSERT INTO usuarios_por_identificador (identificador,tipo_persona,nombre,telefono,email,direccion) VALUES (?,?,?,?,?,?)',
        params: [ident,tipoPers,nombre,tel,email,dir] });
      pCnt++;

      // Contrato
      const numCont = `CONT-${distrito.padStart(2,'0')}-${randomInt(100000,999999)}`;
      const tarAlias = elegirTarifa();
      const fAlta = types.LocalDate.fromDate(randomDate(new Date('2015-01-01'), new Date('2024-06-01')));

      queries.push({ query: `INSERT INTO contratos_por_numero (numero_contrato,identificador_titular,nombre_titular,tipo_persona,direccion,distrito,zona,tarifa_alias,estado,fecha_alta) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        params: [numCont,ident,nombre,tipoPers,dir,distrito,zonaN,tarAlias,'activo',fAlta] });
      cCnt++;

      // Infraestructura
      const infraId = types.Uuid.random();
      const tipoI = pick(tiposInfra).descripcion;
      const latI = BASE_LAT + randomFloat(-0.06,0.06);
      const lonI = BASE_LON + randomFloat(-0.06,0.06);

      queries.push({ query: `INSERT INTO infraestructura_por_id (id_infraestructura,numero_contrato,identificador_titular,tipo_infraestructura,direccion,distrito,zona,lat,lon,cantidad_medidores) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        params: [infraId,numCont,ident,tipoI,dir,distrito,zonaN,latI,lonI,medPorInfra] });
      queries.push({ query: `INSERT INTO infraestructuras_por_zona (distrito,zona,id_infraestructura,numero_contrato,tipo_infraestructura,direccion,lat,lon,cantidad_medidores) VALUES (?,?,?,?,?,?,?,?,?)`,
        params: [distrito,zonaN,infraId,numCont,tipoI,dir,latI,lonI,medPorInfra] });
      iCnt++;

      // Medidores
      for (let m = 0; m < medPorInfra; m++) {
        const mod = pick(modelos);
        const mac = generateMAC();
        const serie = generateSerial(mod.id_modelo);
        const estado = pick(ESTADOS_MEDIDOR);
        const fInst = types.LocalDate.fromDate(randomDate(new Date('2020-01-01'), new Date('2025-03-01')));
        const latM = latI + randomFloat(-0.001,0.001);
        const lonM = lonI + randomFloat(-0.001,0.001);

        queries.push({ query: `INSERT INTO medidores_por_serie (numero_serie,mac,id_modelo,modelo,numero_contrato,id_infraestructura,tarifa_alias,distrito,zona,radiobase,fecha_instalacion,estado,lat,lon) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          params: [serie,mac,mod.id_modelo,mod.nombre,numCont,infraId,tarAlias,distrito,zonaN,gwName,fInst,estado,latM,lonM] });
        queries.push({ query: 'INSERT INTO medidores_por_mac (mac,numero_serie,numero_contrato,distrito,zona,estado) VALUES (?,?,?,?,?,?)',
          params: [mac,serie,numCont,distrito,zonaN,estado] });
        queries.push({ query: `INSERT INTO medidores_por_distrito_zona (distrito,zona,estado,numero_serie,mac,modelo,tarifa_alias,fecha_instalacion,lat,lon) VALUES (?,?,?,?,?,?,?,?,?,?)`,
          params: [distrito,zonaN,estado,serie,mac,mod.nombre,tarAlias,fInst,latM,lonM] });
        queries.push({ query: `INSERT INTO medidores_por_radiobase_zona (radiobase,distrito,zona,numero_serie,mac,modelo,estado) VALUES (?,?,?,?,?,?,?)`,
          params: [gwName,distrito,zonaN,serie,mac,mod.nombre,estado] });

        allMedidores.push({ serie, mac, tarifa: tarAlias, distrito, zona: zonaN, radiobase: gwName, estado, contrato: numCont, modelo: mod.nombre });
        mCnt++;
      }
    }
  }

  // Insertar entidades
  console.log(`   Insertando ${queries.length} registros de entidades...`);
  await runBatch(client, queries);
  console.log(`   ✅ ${pCnt} personas | ${cCnt} contratos | ${iCnt} infraestructuras | ${mCnt} medidores`);

  // --- 4. Generar lecturas ---
  const medActivos = allMedidores.filter(m => m.estado === 'activo');
  console.log(`\n📈 Generando lecturas para ${medActivos.length} medidores activos × ${MESES_LECTURAS} meses...`);

  const ahora = new Date();
  let lecturasCount = 0, erroresCount = 0;
  const consumoMensualContrato = new Map();
  const erroresPorModelo = new Map();
  const erroresPorDistrito = new Map();

  // Procesar en lotes de medidores para no acumular todo en memoria
  const BATCH_SIZE_MED = 50;
  for (let bStart = 0; bStart < medActivos.length; bStart += BATCH_SIZE_MED) {
    const medBatch = medActivos.slice(bStart, bStart + BATCH_SIZE_MED);
    let lectQueries = [];

    for (const med of medBatch) {
      for (let mesOff = 0; mesOff < MESES_LECTURAS; mesOff++) {
        const mesDate = new Date(ahora.getFullYear(), ahora.getMonth() - mesOff - 1, 1);
        const periodo = formatPeriodo(mesDate);
        const diasEnMes = new Date(mesDate.getFullYear(), mesDate.getMonth()+1, 0).getDate();
        let consumoMes = 0;

        for (let dia = 1; dia <= diasEnMes; dia++) {
          const franjas = [
            { hora: randomInt(0,7), max: 1300 },
            { hora: randomInt(8,15), max: 380 },
            { hora: randomInt(16,23), max: 190 },
          ];
          for (const fr of franjas) {
            const fechaHora = new Date(mesDate.getFullYear(), mesDate.getMonth(), dia,
              fr.hora, randomInt(0,59), randomInt(0,59));
            const hayError = Math.random() < TASA_ERROR;
            const status = hayError ? pick(erroresList).codigo : 1;
            const descStatus = hayError
              ? (errores.find(e => e.codigo === status)?.descripcion || 'Error')
              : 'Automatico (Bien)';

            let litros = ['R1','R2','R3','R4'].includes(med.tarifa)
              ? randomFloat(0, fr.max) : randomFloat(0, 250);
            if (hayError) litros = 0;

            const m3 = litros / 1000;
            consumoMes += m3;

            lectQueries.push({ query: `INSERT INTO lecturas_por_medidor_mes (numero_serie,periodo,fecha_hora,mac,radiobase,lectura_m3,lectura_litros,status,descripcion_status,distrito,zona) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
              params: [med.serie, periodo, fechaHora, med.mac, med.radiobase,
                parseFloat(m3.toFixed(4)), parseFloat(litros.toFixed(2)),
                status, descStatus, med.distrito, med.zona] });
            lecturasCount++;

            if (hayError) {
              erroresCount++;
              const emK = `${periodo}|${med.modelo}|${status}`;
              erroresPorModelo.set(emK, (erroresPorModelo.get(emK)||0)+1);
              const edK = `${periodo}|${med.distrito}|${med.zona}|${status}`;
              erroresPorDistrito.set(edK, (erroresPorDistrito.get(edK)||0)+1);
            }

            if (Math.random() < TASA_DUPLICADO) {
              lectQueries.push({ query: `INSERT INTO lecturas_por_medidor_mes (numero_serie,periodo,fecha_hora,mac,radiobase,lectura_m3,lectura_litros,status,descripcion_status,distrito,zona) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
                params: [med.serie, periodo, new Date(fechaHora.getTime()+1), med.mac, pick(gateways).nombre,
                  parseFloat(m3.toFixed(4)), parseFloat(litros.toFixed(2)),
                  status, descStatus, med.distrito, med.zona] });
              lecturasCount++;
            }
          }
        }

        // Consumo mensual
        const cmK = `${med.contrato}|${periodo}`;
        if (!consumoMensualContrato.has(cmK)) {
          consumoMensualContrato.set(cmK, { contrato: med.contrato, periodo, consumo: 0,
            ident: '', nombre: '', distrito: med.distrito, zona: med.zona, tarifa: med.tarifa });
        }
        consumoMensualContrato.get(cmK).consumo += consumoMes;
      }
    }

    // Insertar lote
    await runBatch(client, lectQueries);
    process.stdout.write(`\r   📈 Progreso: ${Math.min(bStart + BATCH_SIZE_MED, medActivos.length)}/${medActivos.length} medidores (${lecturasCount} lecturas)`);
  }

  console.log(`\n   ✅ ${lecturasCount} lecturas generadas`);
  console.log(`   ✅ ${erroresCount} errores (${(erroresCount/lecturasCount*100).toFixed(2)}%)`);

  // --- 5. Agregados ---
  console.log('\n📊 Insertando agregados...');
  let aggQueries = [];

  // Necesitamos datos del contrato para los agregados
  const contratosMap = new Map();
  const contratosRes = (await client.execute('SELECT * FROM contratos_por_numero')).rows;
  for (const c of contratosRes) contratosMap.set(c.numero_contrato, c);

  for (const [, data] of consumoMensualContrato) {
    const cont = contratosMap.get(data.contrato);
    if (!cont) continue;
    const tarifa = tarifas.find(t => t.alias === cont.tarifa_alias);
    let monto = tarifa ? parseFloat(tarifa.cargo_fijo || 0) : 0;
    if (tarifa && data.consumo > parseFloat(tarifa.consumo_minimo_m3 || 0)) {
      monto += (data.consumo - parseFloat(tarifa.consumo_minimo_m3 || 0)) * parseFloat(tarifa.rango_26_50 || 2);
    }
    aggQueries.push({ query: `INSERT INTO consumo_mensual_por_contrato (numero_contrato,periodo,identificador_titular,nombre_titular,distrito,zona,tarifa_alias,consumo_m3,monto_bs,estado_facturacion) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      params: [data.contrato, data.periodo, cont.identificador_titular, cont.nombre_titular,
        cont.distrito, cont.zona, cont.tarifa_alias,
        parseFloat(data.consumo.toFixed(4)), parseFloat(monto.toFixed(2)), 'pendiente'] });
  }

  for (const [key, cant] of erroresPorModelo) {
    const [periodo, modelo, codStr] = key.split('|');
    const cod = parseInt(codStr);
    const desc = errores.find(e => e.codigo === cod)?.descripcion || 'Error';
    aggQueries.push({ query: `INSERT INTO errores_por_modelo_mes (periodo,modelo,codigo_error,descripcion_error,cantidad) VALUES (?,?,?,?,?)`,
      params: [periodo, modelo, cod, desc, cant] });
  }

  for (const [key, cant] of erroresPorDistrito) {
    const [periodo, distrito, zona, codStr] = key.split('|');
    const cod = parseInt(codStr);
    const desc = errores.find(e => e.codigo === cod)?.descripcion || 'Error';
    aggQueries.push({ query: `INSERT INTO errores_por_distrito_zona (periodo,distrito,zona,codigo_error,descripcion_error,cantidad) VALUES (?,?,?,?,?,?)`,
      params: [periodo, distrito, zona, cod, desc, cant] });
  }

  await runBatch(client, aggQueries);
  console.log(`   ✅ ${consumoMensualContrato.size} consumos mensuales`);
  console.log(`   ✅ ${erroresPorModelo.size} errores por modelo`);
  console.log(`   ✅ ${erroresPorDistrito.size} errores por distrito`);

  // --- 6. Verificación ---
  console.log('\n🔍 Verificación final...');
  for (const t of ['usuarios_por_identificador','contratos_por_numero','infraestructura_por_id',
    'medidores_por_serie','lecturas_por_medidor_mes','consumo_mensual_por_contrato',
    'errores_por_modelo_mes','errores_por_distrito_zona']) {
    const r = await client.execute(`SELECT COUNT(*) as cnt FROM ${t}`);
    console.log(`   📋 ${t}: ${r.rows[0].cnt.toNumber()}`);
  }

  console.log('\n============================================================');
  console.log('  ✅ GENERACIÓN DE DATOS COMPLETADA');
  console.log('============================================================\n');
  await client.shutdown();
}

main().catch(err => { console.error('❌', err.message, err.stack); process.exit(1); });
