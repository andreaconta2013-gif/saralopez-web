const BASE_PRICES = { 'Microempresa': 150, 'Pequeña empresa': 300, 'Mediana empresa': 550, 'Empresa en expansión': 900 };
const ADD_ONS = { 'Planeamiento tributario': 120, 'Finanzas y flujo de caja': 180, 'Auditoría o NIIF': 350, 'Financiamiento bancario': 250 };
const quote = (company, needs) => (BASE_PRICES[company] || 150) + needs.reduce((sum, item) => sum + (ADD_ONS[item] || 0), 0);
const esc = value => String(value || '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

async function send({ to, subject, html, replyTo }) {
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.FROM_EMAIL, to: [to], subject, html, reply_to: replyTo }) });
  if (!response.ok) throw new Error(await response.text());
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!process.env.RESEND_API_KEY || !process.env.FROM_EMAIL) return res.status(503).json({ error: 'Correo no configurado' });
  const { name, email, phone, company, sales, needs = [] } = req.body || {};
  if (!name || !email || !phone || !company || !needs.length) return res.status(400).json({ error: 'Datos incompletos' });
  const total = quote(company, needs);
  const amount = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(total);
  const services = needs.map(esc).join(', ');
  try {
    await Promise.all([
      send({ to: 'andreaconta2013@gmail.com', replyTo: email, subject: `Nueva cotización: ${esc(name)} — ${amount}/mes`, html: `<h2>Nueva solicitud de cotización</h2><p><b>Cliente:</b> ${esc(name)}</p><p><b>Correo:</b> ${esc(email)}</p><p><b>WhatsApp:</b> ${esc(phone)}</p><p><b>Empresa:</b> ${esc(company)}</p><p><b>Ventas:</b> ${esc(sales)}</p><p><b>Servicios:</b> ${services}</p><p><b>Cotización:</b> ${amount} mensuales + IGV</p>` }),
      send({ to: email, replyTo: 'andreaconta2013@gmail.com', subject: `Tu cotización GESCO — ${amount}/mes`, html: `<h2>Hola, ${esc(name)}</h2><p>Gracias por solicitar una cotización con GESCO.</p><p>Para <b>${esc(company)}</b>, con <b>${services}</b>, tu inversión referencial es:</p><p style="font-size:26px;font-weight:bold;color:#007d79">${amount} mensuales + IGV</p><p>Incluye el servicio base y las soluciones seleccionadas. Nuestro equipo validará el alcance y te contactará si requiere información adicional.</p><p>Equipo GESCO</p>` }),
    ]);
    res.status(200).json({ total, amount });
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: 'No fue posible enviar los correos' });
  }
}
