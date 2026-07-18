const OWNER_EMAIL = 'andreaconta2013@gmail.com';
const BASE_PRICES = { 'Microempresa': 150, 'Pequeña empresa': 300, 'Mediana empresa': 550, 'Empresa en expansión': 900 };
const ADD_ONS = { 'Planeamiento tributario': 120, 'Finanzas y flujo de caja': 180, 'Auditoría o NIIF': 350, 'Financiamiento bancario': 250 };

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const secret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET');
  if (!secret || data.secret !== secret) return json({ error: 'No autorizado' }, 401);
  const total = Number(data.total) || calculate(data.company, data.needs || []);
  const pdf = createQuotePdf(data, total);
  const amount = `S/ ${total.toLocaleString('es-PE')} + IGV`;
  const services = (data.needs || []).join(', ');
  MailApp.sendEmail({ to: OWNER_EMAIL, replyTo: data.email, subject: `Nueva cotización: ${data.name} — ${amount}/mes`, htmlBody: `<h2>Nueva solicitud de cotización</h2><p><b>Cliente:</b> ${data.name}</p><p><b>Correo:</b> ${data.email}</p><p><b>WhatsApp:</b> ${data.phone}</p><p><b>Empresa:</b> ${data.company}</p><p><b>Ventas:</b> ${data.sales}</p><p><b>Servicios:</b> ${services}</p><p><b>Cotización:</b> ${amount} mensuales</p>`, attachments: [pdf] });
  MailApp.sendEmail({ to: data.email, replyTo: OWNER_EMAIL, subject: `Tu cotización GESCO — ${amount}/mes`, htmlBody: `<h2>Hola, ${data.name}</h2><p>Gracias por solicitar una cotización con GESCO.</p><p>Tu inversión referencial es <b>${amount} mensuales</b>.</p><p>Adjuntamos tu cotización membretada en PDF.</p><p>Equipo GESCO</p>`, attachments: [pdf] });
  return json({ ok: true, total: total });
}

function calculate(company, needs) {
  return (BASE_PRICES[company] || 150) + needs.reduce((sum, item) => sum + (ADD_ONS[item] || 0), 0);
}

function createQuotePdf(data, total) {
  const doc = DocumentApp.create(`Cotización GESCO - ${data.name}`);
  const body = doc.getBody();
  body.appendParagraph('GESCO').setHeading(DocumentApp.ParagraphHeading.TITLE).setForegroundColor('#0C2138');
  body.appendParagraph('GESTIÓN ESTRATÉGICA CONTABLE').setBold(true).setForegroundColor('#007D79');
  body.appendParagraph('COTIZACIÓN REFERENCIAL').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(`Fecha: ${Utilities.formatDate(new Date(), 'America/Lima', 'dd/MM/yyyy')}`);
  body.appendParagraph(`Cliente: ${data.name}`);
  body.appendParagraph(`Tipo de empresa: ${data.company}`);
  body.appendParagraph(`Ventas mensuales: ${data.sales}`);
  const rows = [['SERVICIO', 'INVERSIÓN MENSUAL'], [`Servicio base - ${data.company}`, `S/ ${(BASE_PRICES[data.company] || 150).toLocaleString('es-PE')}`]];
  (data.needs || []).filter(item => item !== 'Contabilidad y declaraciones').forEach(item => rows.push([item, `S/ ${(ADD_ONS[item] || 0).toLocaleString('es-PE')}`]));
  rows.push(['TOTAL REFERENCIAL', `S/ ${total.toLocaleString('es-PE')} + IGV`]);
  body.appendTable(rows);
  body.appendParagraph('Esta propuesta es referencial y se valida tras revisar el alcance, volumen de operaciones y obligaciones específicas.').setItalic(true);
  body.appendParagraph('GESCO | Gestión Estratégica Contable');
  doc.saveAndClose();
  const file = DriveApp.getFileById(doc.getId());
  const pdf = file.getAs(MimeType.PDF).setName(`Cotizacion-GESCO-${data.name}.pdf`);
  file.setTrashed(true);
  return pdf;
}

function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
