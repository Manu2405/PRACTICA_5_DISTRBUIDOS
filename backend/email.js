import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'semapa632@gmail.com',
    pass: 'dkzj xneh afeo osgx',
  },
});

/**
 * Envía notificación real por email con PDFs adjuntos.
 * @param {{ destinatario: string, nombre: string, contrato: string, periodo: string, consumo: number, monto: number, pdfMedia?: string, pdfRollo?: string }} opts
 */
export async function enviarEmail({ destinatario, nombre, contrato, periodo, consumo, monto, pdfMedia, pdfRollo }) {
  const adjuntos = [];
  if (pdfMedia && fs.existsSync(pdfMedia)) {
    adjuntos.push({ filename: `Recibo_MediaCarta_${contrato}_${periodo}.pdf`, path: path.resolve(pdfMedia) });
  }
  if (pdfRollo && fs.existsSync(pdfRollo)) {
    adjuntos.push({ filename: `Recibo_Termico_${contrato}_${periodo}.pdf`, path: path.resolve(pdfRollo) });
  }

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #0066cc, #00a3cc); padding: 30px; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 28px;">💧 SEMAPA</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 13px;">Servicio Municipal de Agua Potable y Alcantarillado</p>
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #333; margin: 0 0 10px;">Estimado/a ${nombre},</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
          Le informamos que su recibo de consumo de agua potable para el período
          <strong>${periodo}</strong> ha sido generado exitosamente.
        </p>
        <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 10px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 8px 0; color: #888;">Contrato</td><td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${contrato}</td></tr>
            <tr><td style="padding: 8px 0; color: #888;">Período</td><td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${periodo}</td></tr>
            <tr><td style="padding: 8px 0; color: #888;">Consumo</td><td style="padding: 8px 0; text-align: right; font-weight: 600; color: #333;">${consumo.toFixed(2)} m³</td></tr>
            <tr style="border-top: 2px solid #0066cc;">
              <td style="padding: 12px 0; color: #0066cc; font-weight: 700; font-size: 16px;">Total a Pagar</td>
              <td style="padding: 12px 0; text-align: right; font-weight: 800; font-size: 22px; color: #0066cc;">Bs ${monto.toFixed(2)}</td>
            </tr>
          </table>
        </div>
        <p style="color: #555; font-size: 14px; line-height: 1.6;">
          Adjuntamos su recibo en formato <strong>media carta</strong> y <strong>rollo térmico</strong>.
          Para cualquier consulta, comuníquese al <strong>800-10-1234</strong>.
        </p>
      </div>
      <div style="background: #f0f0f0; padding: 16px; text-align: center; font-size: 11px; color: #999;">
        SEMAPA — Cochabamba, Bolivia | www.semapa.gob.bo<br>
        Este es un correo automático generado por el sistema de gestión.
      </div>
    </div>
  `;

  const info = await transporter.sendMail({
    from: '"SEMAPA - Facturación" <semapa632@gmail.com>',
    to: destinatario,
    subject: `💧 SEMAPA — Recibo de Consumo ${periodo} | Contrato ${contrato}`,
    html,
    attachments: adjuntos,
  });

  return { messageId: info.messageId, accepted: info.accepted };
}

/**
 * Genera texto para notificación SMS/WhatsApp
 */
export function generarMensajeTexto({ nombre, contrato, periodo, consumo, monto }) {
  return `Estimado/a ${nombre}, SEMAPA le informa que su consumo del período ${periodo} fue de ${consumo.toFixed(2)} m³, con un monto de Bs ${monto.toFixed(2)}. Contrato: ${contrato}. Para consultas: 800-10-1234.`;
}
