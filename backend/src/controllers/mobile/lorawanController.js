import db from '../../../db.js';

const dec = (v) => (v != null ? parseFloat(v.toString()) : 0);

const PERFILES = {
  bajo: { min: 0.3, max: 0.8 },
  medio: { min: 0.8, max: 1.5 },
  alto: { min: 1.5, max: 3.0 },
  industrial: { min: 2.5, max: 8.0 },
};

function rand(min, max) {
  return min + Math.random() * (max - min);
}

export const simularLecturaLorawan = async (req, res) => {
  const { codigo_medidor, perfil = 'medio', fecha } = req.body;
  const codigo = codigo_medidor || req.params.codigo;
  if (!codigo) return res.status(400).json({ error: 'codigo_medidor requerido' });
  try {
    const data = await buildSimulacion(codigo, perfil, fecha);
    if (!data) return res.status(404).json({ error: 'Medidor no encontrado' });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

async function buildSimulacion(codigo, perfil, fecha) {
  const med = (
    await db.execute('SELECT * FROM medidores_por_serie WHERE numero_serie = ?', [codigo], { prepare: true })
  ).rows[0];
  if (!med) return null;
  const periodo = (fecha || new Date().toISOString().slice(0, 10)).slice(0, 7);
  const ultima = (
    await db.execute(
      'SELECT lectura_m3 FROM lecturas_por_medidor_mes WHERE numero_serie = ? AND periodo = ? LIMIT 1',
      [codigo, periodo],
      { prepare: true }
    )
  ).rows[0];
  const acumuladoBase = ultima ? dec(ultima.lectura_m3) : rand(14000, 16000);
  const p = PERFILES[perfil] || PERFILES.medio;
  const consumoDia = +rand(p.min, p.max).toFixed(2);
  return {
    codigo_medidor: codigo,
    mac: med.mac,
    radiobase: med.radiobase,
    fecha: fecha || new Date().toISOString().slice(0, 10),
    consumo_dia: consumoDia,
    consumo_acumulado: +(acumuladoBase + consumoDia).toFixed(2),
    perfil,
    tecnologia: 'LoRaWAN',
    rssi: Math.floor(rand(-120, -70)),
    snr: +rand(5, 12).toFixed(1),
  };
}

export const simularBatchLorawan = async (req, res) => {
  const { medidores = [], perfil = 'medio', fecha } = req.body;
  try {
    const lista = medidores.length
      ? medidores
      : (await db.execute('SELECT numero_serie FROM medidores_por_serie LIMIT 10')).rows.map((r) => r.numero_serie);
    const lecturas = (
      await Promise.all(lista.slice(0, 20).map((c) => buildSimulacion(c, perfil, fecha)))
    ).filter(Boolean);
    res.json({ cantidad: lecturas.length, lecturas });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
