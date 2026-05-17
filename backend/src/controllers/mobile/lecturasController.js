import db from '../../../db.js';
import { types } from 'cassandra-driver';

const dec = (v) => (v != null ? parseFloat(v.toString()) : 0);

export const registrarLectura = async (req, res) => {
  const {
    codigo_medidor,
    lectura_m3,
    observaciones,
    lat,
    lon,
    fecha_hora,
  } = req.body;

  if (!codigo_medidor || lectura_m3 == null) {
    return res.status(400).json({ error: 'codigo_medidor y lectura_m3 son requeridos' });
  }

  try {
    const med = (
      await db.execute('SELECT * FROM medidores_por_serie WHERE numero_serie = ?', [codigo_medidor], {
        prepare: true,
      })
    ).rows[0];
    if (!med) return res.status(404).json({ error: 'Medidor no encontrado' });

    const ts = fecha_hora ? new Date(fecha_hora) : new Date();
    const periodo = ts.toISOString().slice(0, 7);
    const lecturaLitros = dec(lectura_m3) * 1000;
    const status = 0;
    const descripcion = observaciones || 'Lectura campo AppRegistro';

    await db.execute(
      `INSERT INTO lecturas_por_medidor_mes 
       (numero_serie, periodo, fecha_hora, mac, radiobase, lectura_m3, lectura_litros, status, descripcion_status, distrito, zona) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigo_medidor,
        periodo,
        ts,
        med.mac || '',
        med.radiobase || '',
        types.BigDecimal.fromString(dec(lectura_m3).toFixed(4)),
        types.BigDecimal.fromString(lecturaLitros.toFixed(2)),
        status,
        descripcion,
        med.distrito || '',
        med.zona || '',
      ],
      { prepare: true }
    );

    const historial = (
      await db.execute(
        'SELECT fecha_hora, lectura_m3 FROM lecturas_por_medidor_mes WHERE numero_serie = ? AND periodo = ?',
        [codigo_medidor, periodo],
        { prepare: true }
      )
    ).rows;

    const lecturaActual = dec(historial[0]?.lectura_m3);
    const lecturaAnterior = dec(historial[1]?.lectura_m3);
    const consumo = +(lecturaActual - lecturaAnterior).toFixed(2);

    res.status(201).json({
      ok: true,
      codigo_medidor,
      periodo,
      fecha_hora: ts.toISOString(),
      lectura_m3: lecturaActual,
      consumo,
      usuario: req.user?.username,
      gps: lat != null && lon != null ? { lat, lon } : null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getHistorial = async (req, res) => {
  const codigo = req.query.codigo_medidor || req.query.codigo;
  const periodo = req.query.periodo;
  const desde = req.query.desde;
  const hasta = req.query.hasta;

  if (!codigo) return res.status(400).json({ error: 'codigo_medidor requerido' });

  try {
    let rows;
    if (periodo) {
      rows = (
        await db.execute(
          'SELECT fecha_hora, lectura_m3, lectura_litros, status, descripcion_status, periodo FROM lecturas_por_medidor_mes WHERE numero_serie = ? AND periodo = ?',
          [codigo, periodo],
          { prepare: true }
        )
      ).rows;
    } else {
      rows = (
        await db.execute(
          'SELECT fecha_hora, lectura_m3, lectura_litros, status, descripcion_status, periodo FROM lecturas_por_medidor_mes WHERE numero_serie = ?',
          [codigo],
          { prepare: true }
        )
      ).rows;
    }

    if (desde) {
      const d0 = new Date(desde);
      rows = rows.filter((r) => new Date(r.fecha_hora) >= d0);
    }
    if (hasta) {
      const d1 = new Date(hasta);
      rows = rows.filter((r) => new Date(r.fecha_hora) <= d1);
    }

    const historial = rows
      .sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora))
      .map((r, i, arr) => {
        const actual = dec(r.lectura_m3);
        const prev = arr[i + 1] ? dec(arr[i + 1].lectura_m3) : actual;
        return {
          fechaHora: r.fecha_hora,
          periodo: r.periodo,
          lecturaM3: actual,
          consumo: +(actual - prev).toFixed(2),
          status: r.status,
          observaciones: r.descripcion_status,
        };
      });

    res.json({ codigo_medidor: codigo, historial });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
