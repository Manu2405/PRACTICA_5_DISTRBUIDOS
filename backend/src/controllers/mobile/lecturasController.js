import db from '../../../db.js';
import { types } from 'cassandra-driver';

const dec = (v) => (v != null ? parseFloat(v.toString()) : 0);

// Normaliza MAC (XX:XX:XX:XX:XX:XX) o serie a serie sin ":"
const normalizeMedidorCodigo = (codigo) =>
  String(codigo || '').toUpperCase().replace(/:/g, '').trim();

export const registrarLectura = async (req, res) => {
  const {
    codigo_medidor,
    lectura_m3,
    lectura_actual_m3,
    lectura_anterior_m3,
    observaciones,
    lat,
    lon,
    fecha_hora,
  } = req.body;

  if (!codigo_medidor) {
    return res.status(400).json({ error: 'codigo_medidor requerido' });
  }

  try {
    const codigo = normalizeMedidorCodigo(codigo_medidor);
    const med = (
      await db.execute('SELECT * FROM medidores_por_serie WHERE numero_serie = ?', [codigo], {
        prepare: true,
      })
    ).rows[0];
    if (!med) return res.status(404).json({ error: 'Medidor no encontrado' });

    const ts = fecha_hora ? new Date(fecha_hora) : new Date();
    const periodo = ts.toISOString().slice(0, 7);

    // Si vienen lectura_actual_m3 + lectura_anterior_m3, usar diferencial; si no, usar lectura_m3
    const lecAct = lectura_actual_m3 != null ? dec(lectura_actual_m3) : 0;
    const lecAnt = lectura_anterior_m3 != null ? dec(lectura_anterior_m3) : 0;
    let consumoM3 = dec(lectura_m3);
    if (lecAct > 0 || lecAnt > 0) {
      consumoM3 = Math.max(0, lecAct - lecAnt);
    }
    const lecturaLitros = consumoM3 * 1000;
    const status = 1;
    const descripcion = observaciones || 'Lectura manual via AppRegistro';

    await db.execute(
      `INSERT INTO lecturas_por_medidor_mes
       (numero_serie, periodo, fecha_hora, mac, radiobase, lectura_m3, lectura_litros, lectura_anterior_m3, lectura_actual_m3, status, descripcion_status, distrito, zona, origen)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigo,
        periodo,
        ts,
        med.mac || '',
        med.radiobase || '',
        types.BigDecimal.fromString(consumoM3.toFixed(4)),
        types.BigDecimal.fromString(lecturaLitros.toFixed(2)),
        types.BigDecimal.fromString(lecAnt.toFixed(4)),
        types.BigDecimal.fromString(lecAct.toFixed(4)),
        status,
        descripcion,
        med.distrito || '',
        med.zona || '',
        'app_movil',
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
