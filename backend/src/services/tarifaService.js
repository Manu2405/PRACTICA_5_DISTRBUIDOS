/**
 * Cálculo tarifario SEMAPA según catalogo_tarifas (R1, R2, R3 y demás).
 * Bloques progresivos: mínimo fijo + tramos 13-25, 26-50, 51-75, 76-100, 101-150, >151 m³.
 */

const dec = (v) => (v != null ? parseFloat(v.toString()) : 0);

const BLOQUES = [
  { desde: 13, hasta: 25, campo: 'rango_13_25' },
  { desde: 26, hasta: 50, campo: 'rango_26_50' },
  { desde: 51, hasta: 75, campo: 'rango_51_75' },
  { desde: 76, hasta: 100, campo: 'rango_76_100' },
  { desde: 101, hasta: 150, campo: 'rango_101_150' },
  { desde: 151, hasta: Infinity, campo: 'rango_151_mas' },
];

export function calcularMontoPorConsumo(consumoM3, tarifa) {
  if (!tarifa) throw new Error('Tarifa no encontrada');

  const minimo = dec(tarifa.consumo_minimo_m3) || 12;
  const cargoFijo = dec(tarifa.cargo_fijo);
  const consumo = Math.max(0, dec(consumoM3));

  let monto = cargoFijo;
  let detalleBloques = [];

  if (consumo <= minimo) {
    return {
      consumoM3: +consumo.toFixed(2),
      montoBs: +monto.toFixed(2),
      cargoFijo: +cargoFijo.toFixed(2),
      consumoMinimo: minimo,
      categoria: tarifa.categoria,
      alias: tarifa.alias,
      excesoM3: 0,
      detalleBloques: [{ bloque: `0-${minimo}`, m3: consumo, tarifa: 0, subtotal: cargoFijo }],
    };
  }

  let exceso = consumo - minimo;
  detalleBloques.push({
    bloque: `0-${minimo}`,
    m3: minimo,
    tarifa: 0,
    subtotal: cargoFijo,
  });

  for (const bloque of BLOQUES) {
    if (exceso <= 0) break;
    const ancho = bloque.hasta === Infinity ? exceso : bloque.hasta - bloque.desde + 1;
    const m3EnBloque = Math.min(exceso, ancho);
    const tarifaM3 = dec(tarifa[bloque.campo]);
    const subtotal = m3EnBloque * tarifaM3;
    monto += subtotal;
    detalleBloques.push({
      bloque: `${bloque.desde}-${bloque.hasta === Infinity ? '+' : bloque.hasta}`,
      m3: +m3EnBloque.toFixed(2),
      tarifa: tarifaM3,
      subtotal: +subtotal.toFixed(2),
    });
    exceso -= m3EnBloque;
  }

  return {
    consumoM3: +consumo.toFixed(2),
    montoBs: +monto.toFixed(2),
    cargoFijo: +cargoFijo.toFixed(2),
    consumoMinimo: minimo,
    categoria: tarifa.categoria,
    alias: tarifa.alias,
    excesoM3: +(consumo - minimo).toFixed(2),
    detalleBloques,
  };
}

/** Vivienda con varios medidores: suma consumos y aplica una tarifa común */
export function calcularMontoMultiplesMedidores(medidoresConsumo, tarifa) {
  const consumoTotal = medidoresConsumo.reduce((s, m) => s + dec(m.consumoM3), 0);
  const resultado = calcularMontoPorConsumo(consumoTotal, tarifa);
  return {
    ...resultado,
    medidores: medidoresConsumo,
    cantidadMedidores: medidoresConsumo.length,
  };
}
