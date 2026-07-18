import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const BASE_PRICES = { 'Microempresa': 150, 'Pequeña empresa': 300, 'Mediana empresa': 550, 'Empresa en expansión': 900 };
const ADD_ONS = { 'Planeamiento tributario': 120, 'Finanzas y flujo de caja': 180, 'Auditoría o NIIF': 350, 'Financiamiento bancario': 250 };
const quote = (company, needs) => (BASE_PRICES[company] || 150) + needs.reduce((sum, item) => sum + (ADD_ONS[item] || 0), 0);
const esc = value => String(value || '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

const pen = value => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(value);

async function quotePdf({ name, company, sales, needs, total }) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.047, 0.129, 0.22);
  const teal = rgb(0, 0.49, 0.47);
  const lime = rgb(0.84, 0.9, 0.44);
  const pale = rgb(0.92, 0.96, 0.95);
  const width = page.getWidth();
  page.drawRectangle({ x: 0, y: 756, width, height: 86, color: navy });
  page.drawRectangle({ x: 0, y: 750, width, height: 6, color: lime });
  page.drawText('GESCO', { x: 48, y: 795, size: 25, font: bold, color: rgb(1, 1, 1) });
  page.drawText('GESTIÓN ESTRATÉGICA CONTABLE', { x: 49, y: 775, size: 8, font: bold, color: lime });
  page.drawText('COTIZACIÓN REFERENCIAL', { x: 365, y: 794, size: 10, font: bold, color: rgb(1, 1, 1) });
  page.drawText(`Emitida: ${new Date().toLocaleDateString('es-PE')}`, { x: 365, y: 775, size: 8, font: regular, color: rgb(0.8, 0.88, 0.88) });
  page.drawText('Datos de la empresa', { x: 48, y: 710, size: 13, font: bold, color: navy });
  page.drawText(`Cliente: ${name}`, { x: 48, y: 684, size: 10, font: regular, color: navy });
  page.drawText(`Tipo de empresa: ${company}`, { x: 48, y: 665, size: 10, font: regular, color: navy });
  page.drawText(`Ventas mensuales: ${sales}`, { x: 48, y: 646, size: 10, font: regular, color: navy });
  page.drawRectangle({ x: 48, y: 600, width: 499, height: 25, color: teal });
  page.drawText('SERVICIO', { x: 60, y: 609, size: 8, font: bold, color: rgb(1, 1, 1) });
  page.drawText('INVERSIÓN MENSUAL', { x: 412, y: 609, size: 8, font: bold, color: rgb(1, 1, 1) });
  let y = 579;
  const items = [['Servicio base - ' + company, BASE_PRICES[company] || 150], ...needs.filter(item => item !== 'Contabilidad y declaraciones').map(item => [item, ADD_ONS[item] || 0])];
  items.forEach(([label, value], index) => {
    if (index % 2 === 0) page.drawRectangle({ x: 48, y: y - 8, width: 499, height: 23, color: pale });
    page.drawText(label, { x: 60, y, size: 9, font: regular, color: navy });
    page.drawText(pen(value), { x: 460, y, size: 9, font: bold, color: navy });
    y -= 27;
  });
  page.drawRectangle({ x: 48, y: y - 38, width: 499, height: 38, color: navy });
  page.drawText('INVERSIÓN MENSUAL REFERENCIAL', { x: 60, y: y - 23, size: 10, font: bold, color: rgb(1, 1, 1) });
  page.drawText(`${pen(total)} + IGV`, { x: 415, y: y - 23, size: 12, font: bold, color: lime });
  page.drawText('Esta propuesta es referencial y se valida tras revisar el alcance, volumen de operaciones y obligaciones específicas.', { x: 48, y: y - 72, size: 8, font: regular, color: rgb(0.32, 0.4, 0.45), maxWidth: 499 });
  page.drawLine({ start: { x: 48, y: 83 }, end: { x: 547, y: 83 }, thickness: 0.6, color: rgb(0.75, 0.82, 0.82) });
  page.drawText('GESCO | Gestión Estratégica Contable', { x: 48, y: 62, size: 8, font: bold, color: teal });
  page.drawText('Cotización generada automáticamente para fines informativos.', { x: 48, y: 47, size: 7, font: regular, color: rgb(0.38, 0.47, 0.5) });
  return Buffer.from(await pdf.save()).toString('base64');
}

async function send({ to, subject, html, replyTo, attachments = [] }) {
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.FROM_EMAIL, to: [to], subject, html, reply_to: replyTo, attachments }) });
  if (!response.ok) throw new Error(await response.text());
}

async function saveQuote({ name, email, phone, company, sales, needs, total }) {
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/quote_requests`, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ name, email, phone, company, monthly_sales: sales, services: needs, monthly_quote: total }),
  });
  if (!response.ok) throw new Error(await response.text());
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!process.env.RESEND_API_KEY || !process.env.FROM_EMAIL || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(503).json({ error: 'Servicio no configurado' });
  const { name, email, phone, company, sales, needs = [] } = req.body || {};
  if (!name || !email || !phone || !company || !needs.length) return res.status(400).json({ error: 'Datos incompletos' });
  const total = quote(company, needs);
  const amount = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(total);
  const services = needs.map(esc).join(', ');
  try {
    await saveQuote({ name, email, phone, company, sales, needs, total });
    const attachment = [{ filename: `Cotizacion-GESCO-${name.replace(/[^a-z0-9]/gi, '-')}.pdf`, content: await quotePdf({ name, company, sales, needs, total }) }];
    await Promise.all([
      send({ to: 'andreaconta2013@gmail.com', replyTo: email, subject: `Nueva cotización: ${esc(name)} — ${amount}/mes`, html: `<h2>Nueva solicitud de cotización</h2><p><b>Cliente:</b> ${esc(name)}</p><p><b>Correo:</b> ${esc(email)}</p><p><b>WhatsApp:</b> ${esc(phone)}</p><p><b>Empresa:</b> ${esc(company)}</p><p><b>Ventas:</b> ${esc(sales)}</p><p><b>Servicios:</b> ${services}</p><p><b>Cotización:</b> ${amount} mensuales + IGV</p>`, attachments: attachment }),
      send({ to: email, replyTo: 'andreaconta2013@gmail.com', subject: `Tu cotización GESCO — ${amount}/mes`, html: `<h2>Hola, ${esc(name)}</h2><p>Gracias por solicitar una cotización con GESCO.</p><p>Para <b>${esc(company)}</b>, con <b>${services}</b>, tu inversión referencial es:</p><p style="font-size:26px;font-weight:bold;color:#007d79">${amount} mensuales + IGV</p><p>Adjuntamos tu cotización membretada en PDF.</p><p>Equipo GESCO</p>`, attachments: attachment }),
    ]);
    res.status(200).json({ total, amount });
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: 'No fue posible enviar los correos' });
  }
}
