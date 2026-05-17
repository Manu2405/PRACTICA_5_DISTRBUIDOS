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

export const getMedidorByCodigo = async (req, res) => {
  const codigo = req.params.codigo;
  try {
    const row = (
      await db.execute('SELECT * FROM medidores_por_serie WHERE numero_serie = ?', [codigo], { prepare: true })
    ).rows[0];
    if (!row) return res.status(404).json({ error: 'Medidor no encontrado' });
    const medidor = await enrichMedidor(row);

    const periodo = req.query.periodo || new Date().toISOString().slice(0, 7);
    const lecturas = (
      await db.execute(
        'SELECT fecha_hora, lectura_m3, lectura_litros, status, descripcion_status FROM lecturas_por_medidor_mes WHERE numero_serie = ? AND periodo = ?',
        [codigo, periodo],
        { prepare: true }
      )
    ).rows;

    const ultima = lecturas[0];
    const anterior = lecturas[1];
    const lecturaActual = ultima ? dec(ultima.lectura_m3) : 0;
    const lecturaAnterior = anterior ? dec(anterior.lectura_m3) : lecturaActual;

    res.json({
      ...medidor,
      periodo,
      lecturaActual,
      lecturaAnterior,
      consumoParcial: +(lecturaActual - lecturaAnterior).toFixed(2),
      ultimaLectura: ultima
        ? { fechaHora: ultima.fecha_hora, lecturaM3: dec(ultima.lectura_m3), status: ultima.status }
        : null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
