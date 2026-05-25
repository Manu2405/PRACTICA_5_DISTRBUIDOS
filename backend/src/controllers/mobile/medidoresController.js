import db from '../../../db.js';

const dec = (v) => (v != null ? parseFloat(v.toString()) : 0);

async function enrichMedidor(row) {
  if (!row) return null;
  let contrato = null;
  if (row.numero_contrato) {
    const cr = (
      await db.execute('SELECT * FROM contratos_por_numero WHERE numero_contrato = ?', [row.numero_contrato], {
        prepare: true,
      })
    ).rows[0];
    if (cr) {
      contrato = {
        numero: cr.numero_contrato,
        titular: cr.nombre_titular,
        direccion: cr.direccion,
        distrito: cr.distrito,
        zona: cr.zona,
        tarifa: cr.tarifa_alias,
      };
    }
  }
  return {
    codigo: row.numero_serie,
    numeroSerie: row.numero_serie,
    mac: row.mac,
    modelo: row.modelo,
    estado: row.estado,
    distrito: row.distrito,
    zona: row.zona,
    tarifaAlias: row.tarifa_alias,
    lat: row.lat,
    lon: row.lon,
    radiobase: row.radiobase,
    numeroContrato: row.numero_contrato,
    contrato,
  };
}

export const listMedidores = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
    const estado = req.query.estado;
    let rows = (await db.execute('SELECT * FROM medidores_por_serie')).rows;
    if (estado) rows = rows.filter((r) => r.estado === estado);
    const slice = rows.slice(0, limit);
    res.json(await Promise.all(slice.map(enrichMedidor)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Normaliza MAC con o sin ":" a serie sin ":"
const normalizeMedidorCodigo = (codigo) =>
  String(codigo || '').toUpperCase().replace(/:/g, '').trim();

export const getMedidorByCodigo = async (req, res) => {
  const codigo = normalizeMedidorCodigo(req.params.codigo);
  try {
    const row = (
      await db.execute('SELECT * FROM medidores_por_serie WHERE numero_serie = ?', [codigo], { prepare: true })
    ).rows[0];
    if (!row) return res.status(404).json({ error: 'Medidor no encontrado' });
    const medidor = await enrichMedidor(row);

    // Buscar la última lectura del medidor en los últimos 4 períodos
    const hoy = new Date();
    const periodos = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      periodos.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    let ultimaLectura = null;
    for (const p of periodos) {
      const rows = (
        await db.execute(
          'SELECT fecha_hora, lectura_m3, lectura_actual_m3, lectura_anterior_m3, status FROM lecturas_por_medidor_mes WHERE numero_serie = ? AND periodo = ?',
          [codigo, p],
          { prepare: true }
        )
      ).rows;
      if (rows.length) {
        ultimaLectura = { ...rows[0], periodo: p };
        break;
      }
    }

    // Prioridad: lectura_actual_m3 (real del medidor) > lectura_m3 (consumo)
    const lecturaAnterior = ultimaLectura
      ? (ultimaLectura.lectura_actual_m3 != null
          ? Math.round(dec(ultimaLectura.lectura_actual_m3))
          : Math.round(dec(ultimaLectura.lectura_m3)))
      : 0;

    const periodoActual = req.query.periodo || `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;

    res.json({
      ...medidor,
      periodo: periodoActual,
      lecturaActual: lecturaAnterior, // sugerencia visual (la app pide >= esto)
      lecturaAnterior,
      consumoParcial: 0,
      ultimaLectura: ultimaLectura
        ? {
            fechaHora: ultimaLectura.fecha_hora,
            periodo: ultimaLectura.periodo,
            lecturaM3: dec(ultimaLectura.lectura_m3),
            lecturaActualM3: dec(ultimaLectura.lectura_actual_m3),
            status: ultimaLectura.status,
          }
        : null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
