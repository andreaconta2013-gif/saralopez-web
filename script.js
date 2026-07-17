document.addEventListener('DOMContentLoaded', () => {
  window.lucide?.createIcons();
  const nav = document.querySelector('#main-nav');
  const menu = document.querySelector('.menu-toggle');
  menu?.addEventListener('click', () => { const open = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', String(open)); });
  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { nav.classList.remove('open'); menu?.setAttribute('aria-expanded', 'false'); }));

  const form = document.querySelector('#quote-form');
  const result = document.querySelector('#quote-result');
  const resultCopy = document.querySelector('#quote-copy');
  const whatsapp = document.querySelector('#whatsapp-quote');
  const businessEmail = 'andreaconta2013@gmail.com';
  const whatsappNumber = '51999999999'; // Reemplázalo por el WhatsApp comercial de GESCO.
  const emailQuote = document.createElement('a');
  emailQuote.className = 'button';
  emailQuote.style.cssText = 'background:#0c2138;color:#fff;margin-left:8px';
  emailQuote.innerHTML = 'Solicitar por correo <i data-lucide="mail"></i>';
  whatsapp?.insertAdjacentElement('afterend', emailQuote);
  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(form);
    const needs = data.getAll('needs');
    if (!needs.length) { alert('Selecciona al menos una necesidad para preparar tu orientación.'); return; }
    const company = data.get('company');
    const basePrices = { Microempresa: 150, 'Pequeña empresa': 300, 'Mediana empresa': 550, 'Empresa en expansión': 900 };
    const extras = { 'Planeamiento tributario': 120, 'Finanzas y flujo de caja': 180, 'Auditoría o NIIF': 350, 'Financiamiento bancario': 250 };
    const total = (basePrices[company] || 150) + needs.reduce((sum, item) => sum + (extras[item] || 0), 0);
    const amount = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 0 }).format(total);
    const serviceText = needs.join(', ');
    const tailored = needs.includes('Auditoría o NIIF') ? 'Por la naturaleza de tu consulta, recomendamos una evaluación técnica inicial para definir el alcance y los entregables.' : needs.includes('Planeamiento tributario') ? 'Vemos oportunidades para ordenar tus obligaciones y evaluar una estrategia tributaria dentro del marco legal.' : 'Podemos ayudarte a ordenar la información de tu empresa y convertirla en decisiones de gestión.';
    resultCopy.textContent = `Para tu ${company}, la ruta inicial considera: ${serviceText}. ${tailored}`;
    const message = `Hola GESCO, deseo una cotización. Empresa: ${company}. Ventas mensuales: ${data.get('sales')}. Necesito: ${serviceText}. Mi nombre es ${data.get('name')}, WhatsApp: ${data.get('phone')}, correo: ${data.get('email')}.`;
    resultCopy.textContent = `Tu cotización referencial es ${amount} mensuales + IGV. Incluye: ${serviceText}. También la enviaremos a tu correo.`;
    whatsapp.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    emailQuote.href = `mailto:${businessEmail}?subject=${encodeURIComponent('Solicitud de cotización - ' + data.get('name'))}&body=${encodeURIComponent(message)}`;
    window.lucide?.createIcons({ nodes: [emailQuote] });
    form.hidden = true; result.hidden = false; result.scrollIntoView({ behavior: 'smooth', block: 'center' });
    try {
      const response = await fetch('/api/cotizacion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: data.get('name'), email: data.get('email'), phone: data.get('phone'), company, sales: data.get('sales'), needs }) });
      if (!response.ok) throw new Error('email');
    } catch {
      resultCopy.textContent = `Tu cotización referencial es ${amount} mensuales + IGV. El envío automático está en configuración; usa WhatsApp o correo para recibirla de inmediato.`;
    }
  });
  document.querySelector('#restart-quote')?.addEventListener('click', () => { form.reset(); form.hidden = false; result.hidden = true; });

  const assistant = document.querySelector('.virtual-assistant');
  const trigger = document.querySelector('.assistant-trigger');
  const close = document.querySelector('.assistant-close');
  const messages = document.querySelector('.assistant-messages');
  const add = (text, user = false) => { const el = document.createElement('div'); el.className = user ? 'user-message' : 'bot-message'; el.textContent = text; messages.append(el); messages.scrollTop = messages.scrollHeight; };
  trigger?.addEventListener('click', () => assistant.classList.toggle('open'));
  close?.addEventListener('click', () => assistant.classList.remove('open'));
  document.querySelectorAll('.assistant-options button').forEach(button => button.addEventListener('click', () => { add(button.textContent, true); if (button.dataset.action === 'quote') { add('Perfecto. Te llevo al cotizador para preparar una propuesta según tu empresa.'); document.querySelector('#cotizador').scrollIntoView({ behavior: 'smooth' }); assistant.classList.remove('open'); } else add(button.dataset.answer); }));
  document.querySelector('.assistant-form')?.addEventListener('submit', event => { event.preventDefault(); const input = event.currentTarget.querySelector('input'); const question = input.value.trim(); if (!question) return; add(question, true); input.value = ''; setTimeout(() => add('Gracias por escribirnos. Para darte una cotización exacta, completa el cotizador o solicita tu diagnóstico gratuito. Nuestro equipo te responderá pronto.'), 350); });
  const videoScripts = {
    bienvenida: 'En GESCO no nos limitamos a registrar operaciones. Convertimos la información contable de tu empresa en decisiones claras que protegen tu rentabilidad, fortalecen tu caja y te ayudan a crecer.',
    tributario: 'Pagar impuestos correctamente no significa pagar de más. Revisamos tu situación tributaria, tus obligaciones y las oportunidades permitidas por ley para que tu empresa opere con orden y tranquilidad.',
    metodo: 'Con el Método GESCO 360 analizamos tu situación contable, tributaria y financiera. Luego definimos indicadores y un plan de acción de noventa días para que sepas exactamente qué mejorar primero.'
  };
  let activeUtterance;
  const stopVideos = () => {
    window.speechSynthesis?.cancel();
    document.querySelectorAll('.video-frame.is-playing').forEach(frame => { frame.classList.remove('is-playing'); frame.querySelector('.video-captions').textContent = ''; const icon = frame.querySelector('.video-play i'); if (icon) { icon.setAttribute('data-lucide', 'play'); window.lucide?.createIcons({ nodes: [icon] }); } });
  };
  document.querySelectorAll('.video-play').forEach(button => button.addEventListener('click', () => {
    const frame = button.closest('.video-frame');
    if (frame.classList.contains('is-playing')) { stopVideos(); return; }
    stopVideos();
    const text = videoScripts[button.dataset.video];
    const captions = frame.querySelector('.video-captions');
    frame.classList.add('is-playing'); captions.textContent = text;
    const icon = button.querySelector('svg'); if (icon) icon.outerHTML = '<i data-lucide="square"></i>'; window.lucide?.createIcons({ nodes: [button] });
    if (!('speechSynthesis' in window)) { captions.textContent = `${text} (La narración de IA no está disponible en este navegador.)`; return; }
    activeUtterance = new SpeechSynthesisUtterance(text); activeUtterance.lang = 'es-PE'; activeUtterance.rate = .96;
    const voice = speechSynthesis.getVoices().find(item => item.lang.startsWith('es') && /female|mujer|helena|sabina|maria/i.test(item.name)) || speechSynthesis.getVoices().find(item => item.lang.startsWith('es'));
    if (voice) activeUtterance.voice = voice;
    activeUtterance.onend = stopVideos; activeUtterance.onerror = stopVideos; speechSynthesis.speak(activeUtterance);
  }));
});
