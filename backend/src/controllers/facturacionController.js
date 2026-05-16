import db from '../../db.js';
import { generarMediaCarta, generarRolloTermico } from '../../pdf.js';

const dec = v => v ? parseFloat(v.toString()) : 0;

export const generarFactura = async (req, res) => {
  const { numeroContrato, periodo: p } = req.body;
  if (!numeroContrato || !p) return res.status(400).json({ error: 'Faltan campos' });
  try {
    const ct = (await db.execute('SELECT * FROM contratos_por_numero WHERE numero_contrato = ?', [numeroContrato], { prepare: true })).rows[0];
    if (!ct) return res.status(404).json({ error: 'Contrato no encontrado' });
    const cm = (await db.execute('SELECT consumo_m3, monto_bs FROM consumo_mensual_por_contrato WHERE numero_contrato = ? AND periodo = ?', [numeroContrato, p], { prepare: true })).rows[0];
    if (!cm) return res.status(404).json({ error: 'Sin consumo para ese periodo' });
    const consumo = dec(cm.consumo_m3), monto = dec(cm.monto_bs);
    
    // Buscar medidor
    let medidor = '';
    try { const mr = (await db.execute('SELECT numero_serie, numero_contrato FROM medidores_por_serie ALLOW FILTERING')).rows.find(r => r.numero_contrato === numeroContrato); if (mr) medidor = mr.numero_serie; } catch {}
    
    const datos = { contrato: numeroContrato, nombre: ct.nombre_titular, identificador: ct.identificador_titular,
      tipo: ct.tipo_persona, direccion: ct.direccion, distrito: ct.distrito, zona: ct.zona,
      tarifa: ct.tarifa_alias, periodo: p, consumo, monto, medidor };
      
    const [pdfMedia, pdfRollo] = await Promise.all([generarMediaCarta(datos), generarRolloTermico(datos)]);
    
    res.json({ estado: 'generado', cliente: ct.nombre_titular, periodo: p, consumoM3: +consumo.toFixed(2),
      montoBs: +monto.toFixed(2), pdfMediaCarta: `/recibos/${pdfMedia}`, pdfRollo: `/recibos/${pdfRollo}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
