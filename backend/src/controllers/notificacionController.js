import db from '../../db.js';
import { enviarEmail, generarMensajeTexto } from '../../email.js';

const dec = v => v ? parseFloat(v.toString()) : 0;

export const simularNotificacion = async (req, res) => {
  const { formato, numeroContrato, periodo: p, destinatarioEmail } = req.body;
  if (!formato || !numeroContrato || !p) return res.status(400).json({ error: 'Faltan campos' });
  try {
    const ct = (await db.execute('SELECT nombre_titular, identificador_titular FROM contratos_por_numero WHERE numero_contrato = ?', [numeroContrato], { prepare: true })).rows[0];
    if (!ct) return res.status(404).json({ error: 'Contrato no encontrado' });
    let consumo = 0, monto = 0;
    try { 
      const cm = (await db.execute('SELECT consumo_m3, monto_bs FROM consumo_mensual_por_contrato WHERE numero_contrato = ? AND periodo = ?', [numeroContrato, p], { prepare: true })).rows[0];
      if (cm) { consumo = dec(cm.consumo_m3); monto = dec(cm.monto_bs); }
    } catch {}

    const msg = generarMensajeTexto({ nombre: ct.nombre_titular, contrato: numeroContrato, periodo: p, consumo, monto });
    let emailResult = null;

    // Si es email, enviar de verdad
    if (formato === 'email' && destinatarioEmail) {
      try {
        const pdfMedia = `./recibos/media_carta/${numeroContrato}-${p}.pdf`;
        const pdfRollo = `./recibos/rollo_termico/${numeroContrato}-${p}.pdf`;
        emailResult = await enviarEmail({
          destinatario: destinatarioEmail,
          nombre: ct.nombre_titular,
          contrato: numeroContrato,
          periodo: p, consumo, monto, pdfMedia, pdfRollo,
        });
        console.log(`📧 Email enviado a ${destinatarioEmail} → ${emailResult.messageId}`);
      } catch (emailErr) {
        console.error('❌ Error email:', emailErr.message);
        emailResult = { error: emailErr.message };
      }
    }

    // Registrar en Cassandra
    await db.execute('INSERT INTO notificaciones_por_contrato (numero_contrato, periodo, fecha_hora, formato, identificador, estado, mensaje) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [numeroContrato, p, new Date(), formato, ct.identificador_titular, formato === 'email' && emailResult && !emailResult.error ? 'enviado' : 'simulado', msg], { prepare: true });

    const response = { estado: formato === 'email' && emailResult && !emailResult.error ? 'enviado' : 'simulado', formato, mensaje: msg };
    if (emailResult) response.email = emailResult;
    res.json(response);
  } catch (e) { res.status(500).json({ error: e.message }); }
};
