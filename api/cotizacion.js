const BASE_PRICES = { 'Microempresa': 150, 'Pequeña empresa': 300, 'Mediana empresa': 550, 'Empresa en expansión': 900 };
const ADD_ONS = { 'Planeamiento tributario': 120, 'Finanzas y flujo de caja': 180, 'Auditoría o NIIF': 350, 'Financiamiento bancario': 250 };
const quote = (company, needs) => (BASE_PRICES[company] || 150) + needs.reduce((sum, item) => sum + (ADD_ONS[item] || 0), 0);

async function saveQuote({ name, email, phone, company, sales, needs, total }) {
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/quote_requests`, {
    method: 'POST',
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ name, email, phone, company, monthly_sales: sales, services: needs, monthly_quote: total }),
  });
  if (!response.ok) throw new Error(await response.text());
}

async function sendWithGmail(payload) {
  const response = await fetch(process.env.GOOGLE_APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, secret: process.env.GOOGLE_APPS_SCRIPT_SECRET }),
  });
  if (!response.ok) throw new Error(await response.text());
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.GOOGLE_APPS_SCRIPT_URL || !process.env.GOOGLE_APPS_SCRIPT_SECRET) return res.status(503).json({ error: 'Servicio no configurado' });
  const { name, email, phone, company, sales, needs = [] } = req.body || {};
  if (!name || !email || !phone || !company || !needs.length) return res.status(400).json({ error: 'Datos incompletos' });
  const total = quote(company, needs);
  try {
    await saveQuote({ name, email, phone, company, sales, needs, total });
    await sendWithGmail({ name, email, phone, company, sales, needs, total });
    res.status(200).json({ total });
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: 'No fue posible registrar o enviar la cotización' });
  }
}
