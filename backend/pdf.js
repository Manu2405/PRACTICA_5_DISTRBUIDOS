import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

// Convierte número a letras en español (solo enteros + 2 decimales como 'N/100')
function numeroALetras(num) {
  const entero = Math.floor(num);
  const cent = Math.round((num - entero) * 100);
  const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const especiales = { 10: 'diez', 11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince',
    16: 'dieciseis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve',
    20: 'veinte', 21: 'veintiuno', 22: 'veintidos', 23: 'veintitres', 24: 'veinticuatro',
    25: 'veinticinco', 26: 'veintiseis', 27: 'veintisiete', 28: 'veintiocho', 29: 'veintinueve',
    100: 'cien' };
  const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
    'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

  function aLetras(n) {
    if (n === 0) return 'cero';
    if (n < 30 && especiales[n]) return especiales[n];
    if (n < 100) {
      const d = Math.floor(n / 10), u = n % 10;
      return u === 0 ? decenas[d] : `${decenas[d]} y ${unidades[u]}`;
    }
    if (n === 100) return 'cien';
    if (n < 1000) {
      const c = Math.floor(n / 100), r = n % 100;
      return r === 0 ? centenas[c] : `${centenas[c]} ${aLetras(r)}`;
    }
    if (n < 1000000) {
      const miles = Math.floor(n / 1000), r = n % 1000;
      const prefijo = miles === 1 ? 'mil' : `${aLetras(miles)} mil`;
      return r === 0 ? prefijo : `${prefijo} ${aLetras(r)}`;
    }
    return String(n);
  }
  const letras = aLetras(entero);
  return `${letras.charAt(0).toUpperCase() + letras.slice(1)} ${String(cent).padStart(2, '0')}/100`;
}

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

// ============================================================
// AVISO DE COBRANZA — formato similar al recibo oficial SEMAPA
// Toma datos reales: contrato, titular, lecturas, historial 6 meses,
// conceptos (Agua/Alcantarillado/Rep. Formulario), monto en letras.
// ============================================================
export function generarAvisoCobranzaPDF(d) {
  const dir = './recibos/avisos_cobranza';
  ensureDir(dir);
  const fn = `aviso-${d.contrato}-${d.periodo}.pdf`;
  return new Promise((ok, fail) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const ws = fs.createWriteStream(path.join(dir, fn));
    doc.pipe(ws);

    // Conceptos (calculados desde el monto total y meses de atraso)
    const totalDeuda = d.deudaTotalBs || (d.monto * (d.mesesAtraso || 1));
    const agua = +(totalDeuda * 0.70).toFixed(2);
    const alcantarillado = +(totalDeuda * 0.28).toFixed(2);
    const repFormulario = 2.00;
    const total = +(agua + alcantarillado + repFormulario).toFixed(2);

    // --- Encabezado: SEMAPA + título ---
    doc.font('Courier-Bold').fontSize(14)
      .text('SEMAPA', 50, 50, { align: 'center', width: 512 });
    doc.fontSize(12)
      .text('AVISO DE COBRANZA', 50, 68, { align: 'center', width: 512 });

    // --- Código cliente ---
    let y = 95;
    doc.font('Courier-Bold').fontSize(9);
    doc.text('CODIGO CLIENTE', 50, y);
    y += 12;
    doc.font('Courier').text(d.codigoCliente || d.contrato, 50, y);
    y += 18;

    // --- Datos del titular: 2 columnas ---
    doc.font('Courier-Bold').text('NOMBRE', 50, y);
    doc.text('CATEGORIA', 300, y);
    doc.text('CICLO', 420, y);
    doc.text('Servicio', 470, y);
    y += 12;
    doc.font('Courier');
    doc.text((d.nombre || '').toUpperCase().substring(0, 40), 50, y);
    doc.text(d.categoria || 'Residencial', 300, y);
    doc.text(d.ciclo || '01', 420, y);
    doc.text('Agua y Alcantarillado', 470, y);
    y += 22;

    // --- Dirección + tipo medidor ---
    doc.font('Courier-Bold').text('DIRECCION', 50, y);
    doc.text('TipoMedidor', 300, y);
    doc.text('NroMedAgua', 380, y);
    doc.text('NroMedPozo', 470, y);
    y += 12;
    doc.font('Courier');
    doc.text((d.direccion || 'S/D').substring(0, 40), 50, y);
    doc.text(d.tipoMedidor || 'A', 300, y);
    doc.text(d.nroMedAgua || '-', 380, y);
    doc.text(d.nroMedPozo || '-', 470, y);
    y += 22;

    // --- Lectura actual ---
    doc.font('Courier-Bold').text('FechaLecActual', 50, y);
    doc.text('LectActual', 150, y);
    doc.text('Consumo', 240, y);
    doc.text('FechaEmision', 320, y);
    doc.text('Periodo', 430, y);
    y += 12;
    doc.font('Courier');
    doc.text(d.fechaLecActual || '-', 50, y);
    doc.text(String(d.lectActual ?? '-'), 150, y);
    doc.text(String(d.consumo ?? '-'), 240, y);
    doc.text(d.fechaEmision || '-', 320, y);
    doc.text(d.periodo || '-', 430, y);
    y += 22;

    // --- Lectura anterior ---
    doc.font('Courier-Bold').text('FechaLecAnterior', 50, y);
    doc.text('LectAnterior', 150, y);
    doc.text('ConsumoPromedio', 240, y);
    y += 12;
    doc.font('Courier');
    doc.text(d.fechaLecAnterior || '-', 50, y);
    doc.text(String(d.lectAnterior ?? '-'), 150, y);
    doc.text(String(d.consumoPromedio ?? '-'), 240, y);
    y += 22;

    // --- Bloque Histórico + Conceptos (2 columnas) ---
    const yHist = y;
    doc.font('Courier-Bold').text('Consumo Histórico', 70, y);
    doc.text('Conceptos', 340, y);
    y += 14;

    const historial = d.historial || [];
    let yL = y;
    historial.slice(0, 6).forEach(h => {
      doc.font('Courier').text(h.mes.padEnd(15), 90, yL);
      doc.text(String(h.consumo), 200, yL);
      yL += 12;
    });

    // Conceptos (derecha)
    let yR = y;
    doc.font('Courier');
    doc.text('Agua:', 340, yR);
    doc.text(agua.toFixed(2), 500, yR, { align: 'right', width: 50 });
    yR += 12;
    doc.text('Alcantarillado:', 340, yR);
    doc.text(alcantarillado.toFixed(2), 500, yR, { align: 'right', width: 50 });
    yR += 12;
    doc.text('Rep. Formulario:', 340, yR);
    doc.text(repFormulario.toFixed(2), 500, yR, { align: 'right', width: 50 });
    yR += 16;

    y = Math.max(yL, yR) + 18;

    // --- Importe en texto + Vencimiento + Total ---
    doc.font('Courier-Bold').text('Importe de factura en texto', 50, y);
    doc.text('Fecha Vto:', 280, y);
    doc.text(d.fechaVto || '-', 360, y);
    doc.text(`Total: ${total.toFixed(2)}`, 460, y);
    y += 12;
    doc.font('Courier').text(numeroALetras(total), 50, y, { width: 220 });
    y += 30;

    // --- Observación ---
    doc.font('Courier-Bold').text('Observacion:', 50, y);
    doc.font('Courier').text(d.observacion || 'CON MEDIDOR', 145, y);
    y += 18;
    doc.fillColor('#333').font('Courier')
      .text('Estimado cliente: se le recomienda pagar su factura para evitar recargos/cortes', 50, y);
    y += 12;
    doc.text('que le generen molestias innecesarias.', 50, y);
    y += 30;

    // --- Aviso rojo de DEUDA TOTAL (nuestro extra, en el espíritu del email) ---
    if (d.mesesAtraso && d.mesesAtraso > 1) {
      doc.rect(50, y, 512, 60).fill('#ffe6e6').stroke('#cc0000');
      doc.fillColor('#cc0000').font('Helvetica-Bold').fontSize(11)
        .text('⚠ AVISO DE DEUDA ACUMULADA', 60, y + 8);
      doc.fillColor('#333').font('Helvetica').fontSize(9)
        .text(`Esta factura corresponde al período ${d.periodo}. Usted registra ${d.mesesAtraso} mes(es) de atraso.`, 60, y + 24)
        .text(`Total adeudado: Bs ${totalDeuda.toFixed(2)}. Regularice su pago en cualquier sucursal o por QR.`, 60, y + 38);
      y += 75;
    }

    // --- Pie ---
    doc.fillColor('#999').font('Helvetica').fontSize(7)
      .text('SEMAPA - Servicio Municipal de Agua Potable y Alcantarillado | Cochabamba, Bolivia',
        50, 740, { align: 'center', width: 512 })
      .text('Generado automáticamente por el sistema de gestión de cobranza | 800-10-1234',
        50, 750, { align: 'center', width: 512 });

    doc.end();
    ws.on('finish', () => ok(path.join(dir, fn)));
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
