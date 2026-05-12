import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

export function generarMediaCarta(d) {
  const dir = './recibos/media_carta';
  ensureDir(dir);
  const fn = `${d.contrato}-${d.periodo}.pdf`;
  return new Promise((ok, fail) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const ws = fs.createWriteStream(path.join(dir, fn));
    doc.pipe(ws);
    // Header
    doc.rect(0, 0, 612, 55).fill('#0066cc');
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#fff').text('SEMAPA', 50, 12);
    doc.fontSize(9).font('Helvetica').text('Servicio Municipal de Agua Potable y Alcantarillado', 50, 32);
    doc.text('Cochabamba - Bolivia', 50, 42);
    // Titulo
    doc.fillColor('#0066cc').fontSize(14).font('Helvetica-Bold').text(`RECIBO DE CONSUMO - ${d.periodo}`, 50, 70, { align: 'center' });
    doc.moveTo(50, 88).lineTo(562, 88).stroke('#0066cc');
    // Datos
    doc.fillColor('#333').fontSize(10).font('Helvetica-Bold').text('DATOS DEL TITULAR', 50, 95);
    let y = 110;
    const row = (l, v) => {
      doc.font('Helvetica-Bold').text(l, 50, y, { continued: false });
      doc.font('Helvetica').text(v || '-', 180, y); y += 17;
    };
    row('Contrato:', d.contrato); row('Titular:', d.nombre);
    row('Identificador:', d.identificador); row('Tipo:', d.tipo);
    row('Dirección:', d.direccion); row('Distrito:', d.distrito);
    row('Zona:', d.zona); row('Tarifa:', d.tarifa);
    if (d.medidor) row('Medidor:', d.medidor);
    // Consumo
    y += 5;
    doc.moveTo(50, y).lineTo(562, y).stroke('#0066cc'); y += 10;
    doc.fillColor('#0066cc').font('Helvetica-Bold').fontSize(10).text('DETALLE DE CONSUMO', 50, y); y += 17;
    doc.fillColor('#333');
    row('Período:', d.periodo);
    row('Consumo:', `${d.consumo.toFixed(2)} m³`);
    row('Estado:', 'pendiente');
    y += 5;
    doc.moveTo(50, y).lineTo(562, y).stroke('#0066cc'); y += 12;
    doc.fillColor('#0066cc').fontSize(20).font('Helvetica-Bold')
      .text(`TOTAL A PAGAR: Bs ${d.monto.toFixed(2)}`, 50, y, { align: 'center' });
    y += 30;
    doc.moveTo(50, y).lineTo(562, y).stroke('#0066cc'); y += 10;
    doc.fillColor('#999').fontSize(7).font('Helvetica')
      .text('Este documento es un comprobante digital generado por el sistema SEMAPA.', 50, y, { align: 'center' })
      .text('Para consultas: 800-10-1234 | www.semapa.gob.bo', { align: 'center' });
    doc.end();
    ws.on('finish', () => ok(`media_carta/${fn}`));
    ws.on('error', fail);
  });
}

export function generarRolloTermico(d) {
  const dir = './recibos/rollo_termico';
  ensureDir(dir);
  const fn = `${d.contrato}-${d.periodo}.pdf`;
  return new Promise((ok, fail) => {
    const doc = new PDFDocument({ size: [226, 500], margin: 15 }); // ~80mm
    const ws = fs.createWriteStream(path.join(dir, fn));
    doc.pipe(ws);
    doc.font('Courier-Bold').fontSize(16).text('SEMAPA', { align: 'center' });
    doc.font('Courier').fontSize(9).text('RECIBO DE AGUA', { align: 'center' });
    doc.text('------------------------------', { align: 'center' });
    const row = (l, v) => { doc.font('Courier-Bold').fontSize(7).text(`${l} ${v}`, { continued: false }); };
    row('Cliente:', (d.nombre || '').substring(0, 30));
    row('Contrato:', d.contrato);
    row('ID:', d.identificador);
    row('Periodo:', d.periodo);
    if (d.medidor) row('Medidor:', d.medidor);
    row('Tarifa:', d.tarifa);
    row('Distrito:', d.distrito);
    row('Zona:', (d.zona || '').substring(0, 28));
    doc.font('Courier').fontSize(9).text('------------------------------', { align: 'center' });
    doc.font('Courier-Bold').fontSize(9).text(`Consumo: ${d.consumo.toFixed(2)} m3`);
    doc.moveDown(0.3);
    doc.font('Courier-Bold').fontSize(14).text(`TOTAL: Bs ${d.monto.toFixed(2)}`, { align: 'center' });
    doc.font('Courier').fontSize(9).text('------------------------------', { align: 'center' });
    doc.font('Courier').fontSize(6).text('Gracias por su pago puntual', { align: 'center' });
    doc.text('SEMAPA - Cochabamba | 800-10-1234', { align: 'center' });
    doc.end();
    ws.on('finish', () => ok(`rollo_termico/${fn}`));
    ws.on('error', fail);
  });
}
