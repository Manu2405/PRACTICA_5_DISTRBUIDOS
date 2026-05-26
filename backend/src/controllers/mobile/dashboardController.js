import db from '../../../db.js';

const dec = (v) => (v != null ? parseFloat(v.toString()) : 0);

export const getDashboardMobile = async (req, res) => {
  const hoy = new Date();
  const periodo = hoy.toISOString().slice(0, 7);
  const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  try {
    const medidores = (await db.execute('SELECT numero_serie, estado FROM medidores_por_serie')).rows;
    const activos = medidores.filter((m) => m.estado === 'activo').length;
    const pendientes = medidores.filter((m) => m.estado !== 'activo').length;

    const lecturasHoy = [];
    const muestra = medidores.slice(0, 200);
    for (const m of muestra) {
      const rows = (
        await db.execute(
          'SELECT fecha_hora, lectura_m3 FROM lecturas_por_medidor_mes WHERE numero_serie = ? AND periodo = ?',
          [m.numero_serie, periodo],
          { prepare: true }
        )
      ).rows;
      rows.forEach((r) => {
        if (new Date(r.fecha_hora) >= inicioDia) lecturasHoy.push(r);
      });
    }

    const consumos = lecturasHoy.map((l) => dec(l.lectura_m3));
    const promedio = consumos.length ? consumos.reduce((a, b) => a + b, 0) / consumos.length : 0;

    res.json({
      fecha: hoy.toISOString().slice(0, 10),
      periodo,
      lecturasDelDia: lecturasHoy.length,
      medidoresActivos: activos,
      medidoresPendientes: pendientes,
      consumoPromedioM3: +promedio.toFixed(2),
      alertas: pendientes > 0 ? [`${pendientes} medidores requieren revisión`] : [],
      sincronizacion: { estado: 'ok', ultimaActualizacion: hoy.toISOString() },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
