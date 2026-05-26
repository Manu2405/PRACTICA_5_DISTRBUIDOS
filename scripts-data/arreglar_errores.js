// ============================================================
// SEMAPA - Repuebla SOLO las tablas de errores con distribución
// correcta entre los 5 modelos × 3 períodos × 3 códigos de error.
//
// Fix del bug donde el loop `for (i+=200)` siempre daba `i % 5 === 0`,
// haciendo que todos los errores se asignaran al modelo id=1 (ITC 100).
//
// Esto NO toca lecturas_por_medidor_mes ni consumo_mensual.
// ============================================================
import { createClient } from './config.js';

const PERIODOS = ['2026-02', '2026-03', '2026-04'];
const CODIGOS_ERROR = [
  { codigo: 3, descripcion: 'Falla en la alimentación eléctrica' },
  { codigo: 4, descripcion: 'Fallo en la conectividad de red' },
  { codigo: 5, descripcion: 'Configuración incorrecta del sensor o gateway' },
];
const TOTAL_ERRORES_OBJETIVO = 1240; // ~0.5% de las 248k lecturas

async function main() {
  console.log('🔧 Repoblando tablas de errores con distribución correcta...\n');

  const client = createClient(true);
  await client.connect();

  // Cargar catálogos
  const modelos = (await client.execute('SELECT id_modelo, nombre FROM catalogo_modelos_medidor')).rows;
  const distritos = (await client.execute('SELECT id_distrito, nombre FROM catalogo_distritos')).rows;
  const zonas = (await client.execute('SELECT id_distrito, zona FROM catalogo_zonas')).rows;

  const distritoPorId = new Map(distritos.map(d => [d.id_distrito, d.nombre]));
  // zonas por distrito (nombre)
  const zonasPorDistrito = {};
  for (const z of zonas) {
    const nomDistrito = distritoPorId.get(z.id_distrito);
    if (!nomDistrito) continue;
    if (!zonasPorDistrito[nomDistrito]) zonasPorDistrito[nomDistrito] = [];
    zonasPorDistrito[nomDistrito].push(z.zona);
  }
  console.log(`   ${modelos.length} modelos · ${distritos.length} distritos · ${zonas.length} zonas\n`);

  // TRUNCATE
  console.log('🧹 Truncando errores_por_modelo_mes y errores_por_distrito_zona...');
  await client.execute('TRUNCATE errores_por_modelo_mes');
  await client.execute('TRUNCATE errores_por_distrito_zona');

  // Generar errores distribuidos uniformemente:
  // - 5 modelos × 3 períodos × 3 códigos = 45 entradas en errores_por_modelo_mes
  // - 15 distritos × ~3 zonas × 3 períodos × 3 códigos ≈ 405-500 entradas en errores_por_distrito_zona
  const erroresPorModelo = new Map();   // key: periodo|modelo|cod
  const erroresPorDistrito = new Map(); // key: periodo|distrito|zona|cod

  // Distribuir TOTAL_ERRORES_OBJETIVO uniformemente.
  // período (% 3) y código (% 3) no deben sincronizar: uso floor(i/3) para el código
  // así las 9 combinaciones (período, código) aparecen en vez de solo 3.
  let errIdx = 0;
  const distritosArr = [...distritoPorId.values()];
  for (let i = 0; i < TOTAL_ERRORES_OBJETIVO; i++) {
    const periodo = PERIODOS[errIdx % 3];
    const modeloId = (errIdx % 5) + 1;
    const modelo = modelos.find(m => m.id_modelo === modeloId);
    const modeloNombre = modelo?.nombre || 'Desconocido';
    const codInfo = CODIGOS_ERROR[Math.floor(errIdx / 3) % 3];

    // Zona desfasada con floor(/5) para que no sincronice con distrito
    const distrito = distritosArr[errIdx % distritosArr.length];
    const zonasDist = zonasPorDistrito[distrito] || [];
    const zona = zonasDist.length ? zonasDist[Math.floor(errIdx / 5) % zonasDist.length] : 'SIN_ZONA';

    const kM = `${periodo}|${modeloNombre}|${codInfo.codigo}`;
    erroresPorModelo.set(kM, (erroresPorModelo.get(kM) || 0) + 1);
    const kD = `${periodo}|${distrito}|${zona}|${codInfo.codigo}`;
    erroresPorDistrito.set(kD, (erroresPorDistrito.get(kD) || 0) + 1);
    errIdx++;
  }

  // Insertar
  console.log(`📤 Insertando ${erroresPorModelo.size} filas en errores_por_modelo_mes...`);
  const queriesM = [...erroresPorModelo.entries()].map(([k, cant]) => {
    const [periodo, modelo, codStr] = k.split('|');
    const cod = parseInt(codStr);
    const desc = CODIGOS_ERROR.find(c => c.codigo === cod)?.descripcion || 'Error';
    return client.execute(
      'INSERT INTO errores_por_modelo_mes (periodo,modelo,codigo_error,descripcion_error,cantidad) VALUES (?,?,?,?,?)',
      [periodo, modelo, cod, desc, cant],
      { prepare: true }
    );
  });
  await Promise.all(queriesM);

  console.log(`📤 Insertando ${erroresPorDistrito.size} filas en errores_por_distrito_zona...`);
  const queriesD = [...erroresPorDistrito.entries()].map(([k, cant]) => {
    const [periodo, distrito, zona, codStr] = k.split('|');
    const cod = parseInt(codStr);
    const desc = CODIGOS_ERROR.find(c => c.codigo === cod)?.descripcion || 'Error';
    return client.execute(
      'INSERT INTO errores_por_distrito_zona (periodo,distrito,zona,codigo_error,descripcion_error,cantidad) VALUES (?,?,?,?,?,?)',
      [periodo, distrito, zona, cod, desc, cant],
      { prepare: true }
    );
  });
  await Promise.all(queriesD);

  // Sample
  console.log('\n📊 Sample de distribución por modelo:');
  const sample = (await client.execute('SELECT modelo, codigo_error, cantidad FROM errores_por_modelo_mes')).rows;
  const porModelo = {};
  sample.forEach(r => {
    porModelo[r.modelo] = (porModelo[r.modelo] || 0) + r.cantidad;
  });
  for (const [m, n] of Object.entries(porModelo)) {
    console.log(`   ${m.padEnd(35)} ${n}`);
  }

  console.log('\n✅ Errores regenerados correctamente.\n');
  await client.shutdown();
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
