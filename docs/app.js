// ============================================================
// SLIPPY PWA — app.js
// ============================================================

// ── CATEGORIES ───────────────────────────────────────────────
const CATS = [
  { id:'groceries',   name:'Alimentari',    icon:'🛒', color:'#30D158',
    kw:['supermercato','esselunga','carrefour','coop','lidl','aldi','pam','despar','conad','sigma','bennet','sma','grocery','market'] },
  { id:'restaurants', name:'Ristoranti',    icon:'🍽️', color:'#FF9500',
    kw:['ristorante','trattoria','osteria','pizzeria','bar ','caffè','café','restaurant','bistro','mcdonald','burger','kebab','sushi'] },
  { id:'pharmacy',    name:'Farmacia',      icon:'💊', color:'#FF3B30',
    kw:['farmacia','pharmacy','parafarmacia','medical','salute','sanitá'] },
  { id:'fuel',        name:'Carburante',    icon:'⛽', color:'#FF6B00',
    kw:['eni','agip','q8','ip ','shell','tamoil','total','benzina','carburante','fuel','petrol'] },
  { id:'shopping',    name:'Shopping',      icon:'🛍️', color:'#007AFF',
    kw:['amazon','zalando','h&m','zara','ikea','obi','leroy','bricofer','brico','shopping'] },
  { id:'clothing',    name:'Abbigliamento', icon:'👗', color:'#AF52DE',
    kw:['abbigliamento','moda','clothing','fashion','boutique','sartoria','calzature'] },
  { id:'electronics', name:'Elettronica',   icon:'📱', color:'#5856D6',
    kw:['mediaworld','euronics','unieuro','apple','fnac','trony','electronics','informatica','tech'] },
  { id:'other',       name:'Altro',         icon:'📁', color:'#8E8E93', kw:[] },
];

// ── STATE ─────────────────────────────────────────────────────
const state = {
  tab: 'd',
  dashMonth: new Date(),
  receipts: [],
  settings: { apiKey: '', budget: 0 },
  learned: {},
  ocrData: null,
  detailId: null,
  searchQ: '',
  filterCat: null,
  aiTips: {},
  monthlyAnalysis: {},
};

// ── STORAGE ───────────────────────────────────────────────────
function persist() {
  try { localStorage.setItem('slippy_receipts', JSON.stringify(state.receipts)); } catch(_) {}
}
function loadStorage() {
  try {
    state.receipts = JSON.parse(localStorage.getItem('slippy_receipts') || '[]');
    const saved = JSON.parse(localStorage.getItem('slippy_settings') || '{"apiKey":""}');
    state.settings = Object.assign({ apiKey: '', budget: 0 }, saved);
    state.learned  = JSON.parse(localStorage.getItem('slippy_learned')  || '{}');
  } catch(_) {
    state.receipts = []; state.settings = { apiKey: '', budget: 0 }; state.learned = {};
  }
}
function saveSettings() { localStorage.setItem('slippy_settings', JSON.stringify(state.settings)); }
function saveLearned()  { localStorage.setItem('slippy_learned',  JSON.stringify(state.learned));  }

// ── HELPERS ───────────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function fmt(n) { return '€ ' + Number(n || 0).toFixed(2).replace('.', ','); }
function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('it-IT', { day:'2-digit', month:'short', year:'numeric' });
}
function monthLabel(d) { return d.toLocaleDateString('it-IT', { month:'long', year:'numeric' }); }
function isFutureMonth(d) {
  const now = new Date();
  return d.getFullYear() > now.getFullYear() ||
    (d.getFullYear() === now.getFullYear() && d.getMonth() > now.getMonth());
}
function sameMonth(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth(); }
function catById(id) { return CATS.find(c => c.id === id) || CATS[CATS.length - 1]; }
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2400);
}
function groupByDate(receipts) {
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterdayStr = new Date(now - 86400000).toDateString();
  const groups = Object.create(null);
  const order  = [];
  receipts.forEach(r => {
    const d = new Date(r.date || r.createdAt);
    let g;
    if      (d.toDateString() === todayStr)     g = 'Oggi';
    else if (d.toDateString() === yesterdayStr) g = 'Ieri';
    else if (now - d < 7 * 86400000)            g = 'Questa Settimana';
    else if (sameMonth(d, now))                 g = 'Questo Mese';
    else {
      g = d.toLocaleDateString('it-IT', { month:'long', year:'numeric' });
      g = g[0].toUpperCase() + g.slice(1);
    }
    if (!groups[g]) { groups[g] = []; order.push(g); }
    groups[g].push(r);
  });
  return order.map(k => [k, groups[k]]);
}

// ── COUNT-UP ANIMATION ────────────────────────────────────────
function animateCount(el, target) {
  if (!el || target <= 0) return;
  const dur = 680;
  const start = performance.now();
  function step(now) {
    const p = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(target * eased);
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = fmt(target);
  }
  requestAnimationFrame(step);
}

// ── TOP STORES ───────────────────────────────────────────────
function renderTopStoresSection(thisRx) {
  if (thisRx.length < 3) return '';
  const storeMap = {};
  thisRx.forEach(r => {
    const s = r.storeName || 'Negozio';
    if (!storeMap[s]) storeMap[s] = { count: 0, total: 0, cat: r.category };
    storeMap[s].count++;
    storeMap[s].total += r.totalAmount || 0;
  });
  const sorted = Object.entries(storeMap)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 4);
  if (sorted.length < 2) return '';
  const medals = ['🥇','🥈','🥉',''];
  return `
  <div class="card top-stores-card">
    <div class="ts-title">Top Negozi del Mese</div>
    ${sorted.map(([name, data], i) => {
      const cat = catById(data.cat);
      return `
      <div class="ts-row">
        <span class="ts-medal">${medals[i]}</span>
        <span class="ts-ico">${cat.icon}</span>
        <div class="ts-info">
          <div class="ts-name">${esc(name)}</div>
          <div class="ts-meta">${data.count} ${data.count === 1 ? 'visita' : 'visite'}</div>
        </div>
        <div class="ts-amt">${fmt(data.total)}</div>
      </div>`;
    }).join('')}
  </div>`;
}

// ── SHARE RECEIPT ────────────────────────────────────────────
async function shareReceipt(id) {
  const r = state.receipts.find(x => x.id === id);
  if (!r) return;
  const cat = catById(r.category);
  const text = [
    `${cat.icon} ${r.storeName || 'Negozio'}`,
    `${fmtDate(r.date || r.createdAt)} · ${cat.name}`,
    `Totale: ${fmt(r.totalAmount || 0)}`,
    r.note ? `📝 ${r.note}` : '',
  ].filter(Boolean).join('\n');

  if (navigator.share) {
    try { await navigator.share({ title: 'Slippy', text }); haptic('light'); }
    catch(e) { if (e.name !== 'AbortError') toast('Impossibile condividere'); }
  } else {
    try { await navigator.clipboard.writeText(text); toast('Copiato negli appunti!'); }
    catch(e) { toast('Condivisione non supportata'); }
  }
}

// ── FORECAST ─────────────────────────────────────────────────
function renderForecastSection(thisRx, mo) {
  const now = new Date();
  if (!sameMonth(now, mo) || thisRx.length < 3) return '';
  const day = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - day;
  if (daysLeft <= 1) return '';
  const total = thisRx.reduce((s, r) => s + (r.totalAmount||0), 0);
  const projected = Math.round((total / day) * daysInMonth);
  const dailyRate = total / day;
  const budget = state.settings.budget || 0;
  const overBudget = budget > 0 && projected > budget;
  const color = overBudget ? 'var(--red)' : 'var(--accent)';
  return `
  <div class="card forecast-card">
    <div class="forecast-lbl">Proiezione Fine Mese</div>
    <div class="forecast-main">
      <div class="forecast-amt" style="color:${color}">${fmt(projected)}</div>
      <div class="forecast-rate">${fmt(dailyRate)}<span>/giorno</span></div>
    </div>
    <div class="forecast-sub">
      ${fmt(Math.round(dailyRate * daysLeft))} nei prossimi ${daysLeft} giorni
      ${overBudget ? `<span style="color:var(--red);font-weight:600"> · sopra budget</span>` : ''}
    </div>
  </div>`;
}

// ── STREAK ───────────────────────────────────────────────────
function calcStreak() {
  if (!state.receipts.length) return 0;
  const days = new Set(state.receipts.map(r =>
    r.date || new Date(r.createdAt).toISOString().split('T')[0]
  ));
  let streak = 0;
  const d = new Date();
  while (true) {
    const ds = d.toISOString().split('T')[0];
    if (days.has(ds)) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

// ── AI MONTHLY ANALYSIS ───────────────────────────────────────
async function fetchMonthlyAnalysis(monthKey) {
  const key = state.settings.apiKey;
  if (!key) { toast('Aggiungi la tua API key Claude nelle Impostazioni'); return; }

  state.monthlyAnalysis[monthKey] = { loading: true };
  const card = document.getElementById('dash-ai-card');
  if (card) card.innerHTML = `
    <div class="ai-hdr"><span style="font-size:16px">✦</span><h3>Analisi Mensile AI</h3><span class="ai-badge">Claude</span></div>
    <div class="spin" style="width:26px;height:26px;border-width:3px;margin:12px auto"></div>`;

  try {
    const [y, m] = monthKey.split('-').map(Number);
    const mo = new Date(y, m, 1);
    const rx = state.receipts.filter(r => sameMonth(new Date(r.date||r.createdAt), mo));
    const total = rx.reduce((s, r) => s + (r.totalAmount||0), 0);
    const catMap = {};
    rx.forEach(r => { catMap[r.category] = (catMap[r.category]||0) + (r.totalAmount||0); });
    const catLines = Object.entries(catMap).sort((a,b)=>b[1]-a[1])
      .map(([k,v]) => `${catById(k).icon} ${catById(k).name}: ${fmt(v)}`).join(', ');

    const prompt = `Sei un consulente finanziario. Analizza queste spese di ${monthLabel(mo)} in italiano e rispondi con esattamente 3 bullet point (•) brevi e pratici, max 80 parole totali:
Totale: ${fmt(total)} | ${rx.length} scontrini | ${catLines}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':'application/json',
        'x-api-key': key,
        'anthropic-version':'2023-06-01',
        'anthropic-dangerous-direct-browser-access':'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{ role:'user', content: prompt }],
      }),
    });

    if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error?.message||`API ${res.status}`); }
    const data = await res.json();
    const text = data.content?.[0]?.text?.trim() || '';
    state.monthlyAnalysis[monthKey] = { text };
    renderDashboard();
  } catch(err) {
    state.monthlyAnalysis[monthKey] = null;
    if (card) card.innerHTML = `
      <div class="ai-hdr"><span style="font-size:16px">✦</span><h3>Analisi Mensile AI</h3><span class="ai-badge">Claude</span></div>
      <p style="font-size:13px;color:var(--red);margin-bottom:8px">${esc(err.message)}</p>
      <button class="ai-btn" onclick="fetchMonthlyAnalysis('${monthKey}')">Riprova</button>`;
  }
}

// ── HAPTIC FEEDBACK ───────────────────────────────────────────
function haptic(type = 'light') {
  if (!navigator.vibrate) return;
  const patterns = { light: [8], medium: [20], heavy: [40] };
  if (patterns[type]) navigator.vibrate(patterns[type]);
}

// ── BOTTOM SHEET ──────────────────────────────────────────────
function openSheet(html) {
  const body = document.getElementById('sht-body');
  const sht  = document.getElementById('sht');
  const sbd  = document.getElementById('sbd');
  body.innerHTML = html;
  // force reflow
  sht.getBoundingClientRect();
  sht.classList.add('on');
  sbd.classList.add('on');
}

function closeSheet() {
  const sht = document.getElementById('sht');
  const sbd = document.getElementById('sbd');
  sht.classList.remove('on');
  sbd.classList.remove('on');
  setTimeout(() => {
    document.getElementById('sht-body').innerHTML = '';
  }, 360);
}

// ── OVERLAY TRANSITIONS ───────────────────────────────────────
function openOverlay(id, html) {
  const el = document.getElementById(id);
  el.innerHTML = html;
  // force reflow for transition
  el.getBoundingClientRect();
  el.classList.add('on');
}

function closeOverlay(id) {
  const el = document.getElementById(id);
  el.classList.remove('on');
  setTimeout(() => {
    el.innerHTML = '';
    if (id === 'oscanner') state.ocrData = null;
  }, 300);
}

// ── IMAGE FULLSCREEN ─────────────────────────────────────────
function openImage(receiptId) {
  const r = state.receipts.find(x => x.id === receiptId);
  if (!r?.imageDataURL) return;
  const el = document.getElementById('oimg');
  el.innerHTML = `
    <img src="${r.imageDataURL}"
      style="max-width:100%;max-height:100%;object-fit:contain;touch-action:manipulation"
      onclick="closeImage()"/>
    <button onclick="closeImage()"
      style="position:absolute;top:calc(env(safe-area-inset-top,44px)+12px);right:16px;
             background:rgba(255,255,255,.15);backdrop-filter:blur(8px);border:none;
             color:#fff;width:36px;height:36px;border-radius:50%;font-size:16px;
             cursor:pointer;display:flex;align-items:center;justify-content:center;
             font-family:inherit">✕</button>`;
  el.getBoundingClientRect();
  el.classList.add('on');
}
function closeImage() {
  const el = document.getElementById('oimg');
  el.classList.remove('on');
  setTimeout(() => { el.innerHTML = ''; }, 250);
}

// ── CATEGORIZE ────────────────────────────────────────────────
function autoCategory(storeName) {
  const sel = document.getElementById('mc');
  if (sel) sel.value = categorize(storeName);
}

function categorize(storeName) {
  const s = (storeName || '').toLowerCase();
  if (state.learned[s]) return state.learned[s];
  for (const c of CATS) {
    if (c.kw.some(k => s.includes(k))) return c.id;
  }
  return 'other';
}

// ── OCR TEXT PARSING ──────────────────────────────────────────
function extractStoreName(lines) {
  const skip = /SCONTRINO|RICEVUTA|FISCALE|CODICE|P\.IVA|C\.F\.|VAT|TEL|FAX|VIA |CORSO |PIAZZA |\*/i;
  // Prefer all-caps lines (typical store headers on Italian receipts)
  for (const l of lines.slice(0, 8)) {
    const t = l.trim();
    if (t.length > 2 && !/^\d/.test(t) && !skip.test(t) && t === t.toUpperCase() && /[A-Z]/.test(t)) {
      return t[0] + t.slice(1).toLowerCase(); // Title-case it
    }
  }
  // Fallback: first non-numeric, non-skip line
  for (const l of lines.slice(0, 6)) {
    const t = l.trim();
    if (t.length > 2 && !/^\d/.test(t) && !skip.test(t)) return t;
  }
  return 'Negozio';
}

function extractTotal(lines) {
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i];
    if (/TOTALE|TOTAL(?!\s*IVA)|TOT\b|DA PAGARE|IMPORTO|PAGAMENTO/i.test(l)) {
      const m = l.match(/(\d{1,4}[.,]\d{2})/);
      if (m) return parseFloat(m[1].replace(',', '.'));
    }
  }
  let max = 0;
  for (const l of lines) {
    const m = l.match(/(\d{1,4}[.,]\d{2})/);
    if (m) { const v = parseFloat(m[1].replace(',', '.')); if (v > max) max = v; }
  }
  return max;
}

function extractDate(lines) {
  const patterns = [
    /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/,
    /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{2})\b/,
  ];
  for (const l of lines) {
    for (const p of patterns) {
      const m = l.match(p);
      if (m) {
        let y = parseInt(m[3]);
        if (y < 100) y += 2000;
        const d = new Date(y, parseInt(m[2]) - 1, parseInt(m[1]));
        if (!isNaN(d.getTime()) && d.getFullYear() >= 2000 && d <= new Date()) {
          return d.toISOString().split('T')[0];
        }
      }
    }
  }
  return new Date().toISOString().split('T')[0];
}

function extractItems(lines) {
  const items = [];
  const priceRe = /(\d{1,4}[.,]\d{2})\s*[€A]?\s*$/;
  const skipRe  = /TOTALE|TOTAL|TOT\b|SUBTOT|SCONTO|IVA|CASSA|SCONTRINO|RICEVUTA|OPERATORE|GRAZIE|RESTO|CONTANTE|CARTA/i;
  for (const l of lines) {
    if (skipRe.test(l)) continue;
    const m = l.match(priceRe);
    if (m) {
      const price = parseFloat(m[1].replace(',', '.'));
      if (price > 0 && price < 500) {
        let name = l.replace(m[0], '').trim().replace(/\s{2,}/g, ' ');
        // Strip leading item codes like "001 " or "A1 "
        name = name.replace(/^[A-Z0-9]{1,5}\s+/, '').trim();
        if (name.length > 1) items.push({ name, amount: price });
      }
    }
  }
  return items.slice(0, 20);
}

function parseOCRText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  return {
    storeName: extractStoreName(lines),
    total:     extractTotal(lines),
    date:      extractDate(lines),
    items:     extractItems(lines),
    rawText:   text,
  };
}

// ── FILE → DATA URL ───────────────────────────────────────────
function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ── OCR PIPELINE ─────────────────────────────────────────────
async function runOCR(file) {
  const imgURL = await fileToDataURL(file);
  const html   = processingScreenHTML(0);
  openOverlay('oscanner', html);

  const worker = await Tesseract.createWorker(['ita', 'eng'], 1, {
    logger: m => {
      const staticPct = {
        'loading tesseract core': 5,
        'loading language traineddata': 12,
        'initializing api': 22,
        'initialized api': 30,
      };
      let pct;
      if (m.status === 'recognizing text') {
        pct = Math.round(30 + (m.progress || 0) * 68);
      } else if (staticPct[m.status] !== undefined) {
        pct = staticPct[m.status];
      } else return;
      const pe = document.querySelector('.prog-pct');
      const pb = document.querySelector('.prog-bar');
      if (pe) pe.textContent = pct + '%';
      if (pb) pb.style.width  = pct + '%';
      updateProcSteps(pct);
    },
  });

  const { data: { text } } = await worker.recognize(file);
  await worker.terminate();

  const parsed = parseOCRText(text);
  parsed.imgDataURL = imgURL;
  state.ocrData = parsed;
  renderOCRPreview(parsed, imgURL);
}

function processingScreenHTML(pct) {
  return `
  <div class="nav-row">
    <button class="back-btn" onclick="closeOverlay('oscanner')">✕</button>
    <h2>Scansione</h2><div style="min-width:56px"></div>
  </div>
  <div class="processing">
    <div class="proc-ring">
      <span class="proc-ico">🧾</span>
    </div>
    <div style="width:100%;max-width:280px">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:14px;font-weight:600;color:var(--lbl)">Lettura scontrino</span>
        <span class="prog-pct" style="font-size:14px;font-weight:700;color:var(--accent)">${pct}%</span>
      </div>
      <div style="width:100%;height:6px;background:var(--fill2);border-radius:3px;overflow:hidden">
        <div class="prog-bar" style="height:100%;background:linear-gradient(90deg,var(--accent),var(--accent-end));border-radius:3px;transition:width .3s;width:${pct}%"></div>
      </div>
    </div>
    <div class="proc-steps">
      <div class="proc-step ${pct > 15 ? 'done' : ''}">
        <div class="proc-dot"></div><span>Caricamento immagine</span>
      </div>
      <div class="proc-step ${pct > 50 ? 'done' : ''}">
        <div class="proc-dot"></div><span>Riconoscimento testo</span>
      </div>
      <div class="proc-step ${pct >= 100 ? 'done' : ''}">
        <div class="proc-dot"></div><span>Estrazione dati</span>
      </div>
    </div>
  </div>`;
}

function updateProcSteps(pct) {
  const steps = document.querySelectorAll('.proc-step');
  if (steps[0]) steps[0].classList.toggle('done', pct > 15);
  if (steps[1]) steps[1].classList.toggle('done', pct > 50);
  if (steps[2]) steps[2].classList.toggle('done', pct >= 100);
}

// ── RENDER: OCR PREVIEW FORM ──────────────────────────────────
function renderOCRPreview(parsed, imgURL) {
  const overlay = document.getElementById('oscanner');
  const catId   = categorize(parsed.storeName);
  const catsOpt = CATS.map(c =>
    `<option value="${c.id}" ${c.id === catId ? 'selected' : ''}>${c.icon} ${c.name}</option>`
  ).join('');

  const itemsRows = parsed.items.map((it, i) => `
    <div class="frow" style="gap:8px">
      <input class="finp" style="text-align:left;flex:1" placeholder="Nome prodotto"
             value="${esc(it.name)}" id="itn${i}"/>
      <input class="finp" style="width:72px;text-align:right" type="number" step="0.01"
             value="${it.amount.toFixed(2)}" id="ita${i}"/>
    </div>`).join('');

  overlay.innerHTML = `
  <div class="nav-row">
    <button class="back-btn" onclick="closeOverlay('oscanner')">‹ Indietro</button>
    <h2>Conferma</h2>
    <button class="nav-act" onclick="saveReceiptFromForm()">Salva</button>
  </div>
  <div style="padding-bottom:40px">
    ${imgURL ? `<img src="${imgURL}" class="img-thumb" style="margin:12px auto"/>` : ''}
    <div class="fsec">
      <div class="fhdr">Negozio</div>
      <div class="frow" style="border-radius:var(--r)">
        <input class="finp" style="text-align:left;flex:1" id="fn" value="${esc(parsed.storeName)}" placeholder="Nome negozio"/>
      </div>
    </div>
    <div class="fsec">
      <div class="fhdr">Totale</div>
      <div class="frow" style="border-radius:var(--r)">
        <span class="flbl">€</span>
        <input class="finp" id="ft" type="number" step="0.01" value="${parsed.total.toFixed(2)}" placeholder="0.00"/>
      </div>
    </div>
    <div class="fsec">
      <div class="fhdr">Data</div>
      <div class="frow" style="border-radius:var(--r)">
        <input class="finp" id="fd" type="date" value="${parsed.date}"/>
      </div>
    </div>
    <div class="fsec">
      <div class="fhdr">Categoria</div>
      <div class="frow" style="border-radius:var(--r)">
        <select class="finp" id="fc">${catsOpt}</select>
      </div>
    </div>
    ${parsed.items.length > 0 ? `
    <div class="fsec">
      <div class="fhdr">Prodotti rilevati</div>
      ${itemsRows}
    </div>` : ''}
    <div class="pad"></div>
    <button class="btn btn-p" onclick="saveReceiptFromForm()">Salva Scontrino</button>
    <div class="pad"></div>
  </div>`;
}

// ── DUPLICATE DETECTION ───────────────────────────────────────
function isDuplicate(name, total) {
  const now = Date.now();
  const window48h = 48 * 60 * 60 * 1000;
  return state.receipts.some(r => {
    const age = now - new Date(r.createdAt || r.date).getTime();
    if (age > window48h) return false;
    const sameName = (r.storeName || '').toLowerCase() === (name || '').toLowerCase();
    const pct = r.totalAmount > 0 ? Math.abs(r.totalAmount - total) / r.totalAmount : 1;
    return sameName && pct <= 0.05;
  });
}

function saveReceiptFromForm() {
  const name  = (document.getElementById('fn')?.value || '').trim() || 'Negozio';
  const total = parseFloat(document.getElementById('ft')?.value || '0') || 0;
  const date  = document.getElementById('fd')?.value || new Date().toISOString().split('T')[0];
  const catId = document.getElementById('fc')?.value || 'other';

  // Duplicate detection
  if (isDuplicate(name, total)) {
    if (!confirm('Sembra un duplicato. Salvare comunque?')) return;
  }

  const items = [];
  let i = 0;
  while (document.getElementById('itn' + i)) {
    const n = (document.getElementById('itn' + i).value || '').trim();
    const a = parseFloat(document.getElementById('ita' + i).value || '0') || 0;
    if (n) items.push({ name: n, amount: a });
    i++;
  }

  const receipt = {
    id: uid(), storeName: name, totalAmount: total,
    date, createdAt: new Date().toISOString(),
    category: catId, items,
    rawText: state.ocrData?.rawText || '',
    imageDataURL: state.ocrData?.imgDataURL || null,
  };

  state.receipts.unshift(receipt);
  persist();
  if (name) { state.learned[name.toLowerCase()] = catId; saveLearned(); }

  haptic('medium');
  closeOverlay('oscanner');
  toast('Scontrino salvato!');
  renderDashboard();
  if (state.tab === 'r') renderReceipts();
}

// ── MANUAL ENTRY ─────────────────────────────────────────────
function openManualEntry() {
  haptic('light');
  const today = new Date().toISOString().split('T')[0];
  const catsOpt = CATS.map(c =>
    `<option value="${c.id}" ${c.id === 'groceries' ? 'selected' : ''}>${c.icon} ${c.name}</option>`
  ).join('');
  openOverlay('oscanner', `
  <div class="nav-row">
    <button class="back-btn" onclick="closeOverlay('oscanner')">✕</button>
    <h2>Nuovo Scontrino</h2>
    <button class="nav-act" onclick="saveManualEntry()">Salva</button>
  </div>
  <div style="padding-bottom:40px">
    <div class="fsec">
      <div class="fhdr">Negozio</div>
      <div class="frow" style="border-radius:var(--r)">
        <input class="finp" style="text-align:left;flex:1" id="mn"
          placeholder="Nome negozio" oninput="autoCategory(this.value)" autofocus/>
      </div>
    </div>
    <div class="fsec">
      <div class="fhdr">Totale</div>
      <div class="frow" style="border-radius:var(--r)">
        <span class="flbl">€</span>
        <input class="finp" id="mt" type="number" step="0.01"
          placeholder="0.00" inputmode="decimal"/>
      </div>
    </div>
    <div class="fsec">
      <div class="fhdr">Data</div>
      <div class="frow" style="border-radius:var(--r)">
        <input class="finp" id="md" type="date" value="${today}"/>
      </div>
    </div>
    <div class="fsec">
      <div class="fhdr">Categoria</div>
      <div class="frow" style="border-radius:var(--r)">
        <select class="finp" id="mc">${catsOpt}</select>
      </div>
    </div>
    <div class="fsec">
      <div class="fhdr">Note (opzionale)</div>
      <div class="frow" style="border-radius:var(--r)">
        <input class="finp" style="text-align:left;flex:1" id="mnote"
          placeholder="Aggiungi una nota…"/>
      </div>
    </div>
    <div class="pad"></div>
    <button class="btn btn-p" onclick="saveManualEntry()">Salva Scontrino</button>
    <div class="pad"></div>
  </div>`);
}

function saveManualEntry() {
  const name  = (document.getElementById('mn')?.value || '').trim() || 'Negozio';
  const total = parseFloat(document.getElementById('mt')?.value || '0') || 0;
  const date  = document.getElementById('md')?.value || new Date().toISOString().split('T')[0];
  const catId = document.getElementById('mc')?.value || 'other';
  const note  = (document.getElementById('mnote')?.value || '').trim();

  if (!total) { toast('Inserisci il totale'); return; }

  if (isDuplicate(name, total)) {
    if (!confirm('Sembra un duplicato. Salvare comunque?')) return;
  }

  const receipt = {
    id: uid(), storeName: name, totalAmount: total,
    date, createdAt: new Date().toISOString(),
    category: catId, items: [], rawText: '', imageDataURL: null,
    note: note || undefined,
  };

  state.receipts.unshift(receipt);
  persist();
  if (name) { state.learned[name.toLowerCase()] = catId; saveLearned(); }

  haptic('medium');
  closeOverlay('oscanner');
  toast('Scontrino salvato!');
  renderDashboard();
  if (state.tab === 'r') renderReceipts();
}

// ── NAVIGATION ────────────────────────────────────────────────
function gotoTab(t) {
  haptic('light');
  state.tab = t;
  const ids = ['d', 'r', 's'];
  ids.forEach(id => document.getElementById('v' + id).classList.toggle('on', id === t));
  document.querySelectorAll('.tab').forEach((el, i) => el.classList.toggle('on', ids[i] === t));
  if (t === 'd') renderDashboard();
  if (t === 'r') renderReceipts();
  if (t === 's') renderSettings();
}

function openScanner() {
  haptic('light');
  renderScannerPicker();
}

function renderScannerPicker() {
  const html = `
  <div style="padding:4px 0 16px">
    <div style="font-size:17px;font-weight:700;text-align:center;margin-bottom:16px;color:var(--lbl)">Aggiungi Scontrino</div>
    <div class="scan-btns">
      <button class="btn btn-p" onclick="closeSheet();triggerCapture(true)">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        Usa Fotocamera
      </button>
      <button class="btn btn-s" onclick="closeSheet();triggerCapture(false)">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        Scegli dalla Libreria
      </button>
      <button class="btn btn-s" onclick="closeSheet();setTimeout(openManualEntry,380)">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Inserimento Manuale
      </button>
    </div>
    <p style="font-size:12px;color:var(--lbl2);margin-top:12px;line-height:1.6;text-align:center;padding:0 16px">
      OCR elaborato nel browser — nessun upload, completamente privato.
    </p>
  </div>`;
  openSheet(html);
}

// Helper: open scanner overlay after sheet is closed (called from file input)
function renderScannerPickerOverlay() {
  const html = `
  <div class="nav-row">
    <button class="back-btn" onclick="closeOverlay('oscanner')">✕</button>
    <h2>Aggiungi</h2><div style="min-width:56px"></div>
  </div>
  <div class="scan-pick">
    <div class="scan-pick-ico">🧾</div>
    <div class="scan-btns">
      <button class="btn btn-p" onclick="triggerCapture(true)">Usa Fotocamera</button>
      <button class="btn btn-s" onclick="triggerCapture(false)">Scegli dalla Libreria</button>
    </div>
    <p style="font-size:13px;color:var(--lbl2);margin-top:8px;line-height:1.6;text-align:center">
      OCR elaborato nel browser — nessun upload, completamente privato.
    </p>
  </div>`;
  openOverlay('oscanner', html);
}

function triggerCapture(camera) {
  const fi = document.getElementById('filein');
  if (camera) fi.setAttribute('capture', 'environment');
  else        fi.removeAttribute('capture');
  fi.click();
}

function openDetail(id) {
  haptic('light');
  state.detailId = id;
  const html = buildDetailHTML(id);
  if (!html) return;
  openOverlay('odetail', html);
}

// ── SWIPE-TO-DELETE ───────────────────────────────────────────
function setupSwipe() {
  document.querySelectorAll('.rx-wrap .lrow').forEach(lrow => {
    let startX = 0, currentX = 0, dragging = false;

    lrow.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
      currentX = 0;
      dragging = true;
      lrow.style.transition = 'none';
    }, { passive: true });

    lrow.addEventListener('touchmove', e => {
      if (!dragging) return;
      const dx = e.touches[0].clientX - startX;
      currentX = Math.min(0, dx); // only left
      lrow.style.transform = `translateX(${currentX}px)`;
    }, { passive: true });

    lrow.addEventListener('touchend', () => {
      if (!dragging) return;
      dragging = false;
      lrow.style.transition = 'transform .25s ease';
      if (currentX < -60) {
        lrow.style.transform = 'translateX(-80px)';
        lrow.dataset.revealed = '1';
        haptic('medium');
      } else {
        lrow.style.transform = 'translateX(0)';
        lrow.dataset.revealed = '0';
      }
    });
  });
}

function handleRowTap(id) {
  // Find the lrow for this id
  const lrow = document.querySelector(`.lrow[data-id="${id}"]`);
  if (lrow && lrow.dataset.revealed === '1') {
    // Close the revealed state on tap
    lrow.style.transition = 'transform .25s ease';
    lrow.style.transform = 'translateX(0)';
    lrow.dataset.revealed = '0';
    return;
  }
  openDetail(id);
}

function quickDelete(id) {
  haptic('heavy');
  if (!confirm('Eliminare questo scontrino?')) return;
  state.receipts = state.receipts.filter(x => x.id !== id);
  persist();
  toast('Scontrino eliminato');
  renderDashboard();
  renderReceipts();
}

// ── CATEGORY FILTER ───────────────────────────────────────────
function setFilter(cat) {
  state.filterCat = cat;
  renderReceipts();
}

// ── WEEK SUMMARY ──────────────────────────────────────────────
function renderWeekSection(allRx) {
  const now = new Date();
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0=Mon
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - dow); weekStart.setHours(0,0,0,0);
  const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(weekStart.getDate() - 7);

  const thisW = allRx.filter(r => new Date(r.date || r.createdAt) >= weekStart);
  const lastW = allRx.filter(r => { const d = new Date(r.date||r.createdAt); return d >= lastWeekStart && d < weekStart; });
  if (!thisW.length) return '';

  const thisT = thisW.reduce((s,r)=>s+(r.totalAmount||0),0);
  const lastT = lastW.reduce((s,r)=>s+(r.totalAmount||0),0);
  const diff  = lastT > 0 ? ((thisT - lastT) / lastT * 100) : null;
  const dc    = diff !== null ? (diff > 0 ? 'var(--red)' : 'var(--green)') : '';

  // Daily bar chart Mon–Sun
  const dayLabels = ['L','M','M','G','V','S','D'];
  const dayTotals = new Array(7).fill(0);
  thisW.forEach(r => {
    const d = new Date(r.date || r.createdAt);
    const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
    dayTotals[idx] += r.totalAmount || 0;
  });
  const maxDay = Math.max(...dayTotals, 1);
  const todayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;

  const dayBars = dayTotals.map((t, i) => {
    const pct = Math.max(6, Math.round(t / maxDay * 100));
    const isToday = i === todayIdx;
    const isPast  = i <= todayIdx;
    const bg = isToday ? 'var(--accent)' : (isPast && t > 0) ? 'var(--accent-end)' : 'var(--fill2)';
    return `<div class="wd-col">
      <div class="wd-bar-wrap">
        <div class="wd-bar" style="height:${t > 0 ? pct : 6}%;background:${bg};opacity:${!isPast && t === 0 ? .35 : 1}"></div>
      </div>
      <div class="wd-lbl" style="${isToday ? 'color:var(--accent);font-weight:700' : ''}">${dayLabels[i]}</div>
    </div>`;
  }).join('');

  return `
  <div class="card week-wrap">
    <div class="week-top">
      <div>
        <div class="week-lbl">Questa Settimana</div>
        <div class="week-amt">${fmt(thisT)}</div>
      </div>
      ${diff !== null ? `<div class="week-delta-badge" style="background:${diff > 0 ? 'rgba(255,59,48,.12)' : 'rgba(52,199,89,.12)'};color:${dc}">${diff > 0 ? '↑' : '↓'} ${Math.abs(diff).toFixed(0)}%</div>` : ''}
    </div>
    <div class="wd-bars">${dayBars}</div>
  </div>`;
}

// ── EDIT RECEIPT ──────────────────────────────────────────────
function showEditForm(id) {
  const r = state.receipts.find(x => x.id === id);
  if (!r) return;
  const catsOpt = CATS.map(c =>
    `<option value="${c.id}" ${c.id === r.category ? 'selected' : ''}>${c.icon} ${c.name}</option>`
  ).join('');
  const el = document.getElementById('odetail');
  el.scrollTop = 0;
  el.innerHTML = `
  <div class="nav-row">
    <button class="back-btn" onclick="openDetail('${id}')">Annulla</button>
    <h2>Modifica</h2>
    <button class="nav-act" onclick="saveReceiptEdit('${id}')">Salva</button>
  </div>
  <div style="padding-bottom:40px">
    <div class="fsec">
      <div class="fhdr">Negozio</div>
      <div class="frow" style="border-radius:var(--r)">
        <input class="finp" style="text-align:left;flex:1" id="en" value="${esc(r.storeName||'')}"/>
      </div>
    </div>
    <div class="fsec">
      <div class="fhdr">Totale</div>
      <div class="frow" style="border-radius:var(--r)">
        <span class="flbl">€</span>
        <input class="finp" id="et" type="number" step="0.01" value="${(r.totalAmount||0).toFixed(2)}"/>
      </div>
    </div>
    <div class="fsec">
      <div class="fhdr">Data</div>
      <div class="frow" style="border-radius:var(--r)">
        <input class="finp" id="ed" type="date" value="${r.date||''}"/>
      </div>
    </div>
    <div class="fsec">
      <div class="fhdr">Categoria</div>
      <div class="frow" style="border-radius:var(--r)">
        <select class="finp" id="ec">${catsOpt}</select>
      </div>
    </div>
    <div class="fsec">
      <div class="fhdr">Note</div>
      <div class="frow" style="border-radius:var(--r)">
        <input class="finp" style="text-align:left;flex:1" id="enote"
          placeholder="Aggiungi una nota…" value="${esc(r.note||'')}"/>
      </div>
    </div>
    <div class="pad"></div>
    <button class="btn btn-p" onclick="saveReceiptEdit('${id}')">Salva Modifiche</button>
    <div style="height:10px"></div>
    <button class="btn btn-d" onclick="confirmDelete('${id}')">Elimina Scontrino</button>
    <div class="pad"></div>
  </div>`;
}

function saveReceiptEdit(id) {
  const r = state.receipts.find(x => x.id === id);
  if (!r) return;
  const name = (document.getElementById('en')?.value||'').trim();
  if (name) r.storeName = name;
  const tot = parseFloat(document.getElementById('et')?.value||'');
  if (!isNaN(tot)) r.totalAmount = tot;
  const dt = document.getElementById('ed')?.value;
  if (dt) r.date = dt;
  const cat = document.getElementById('ec')?.value;
  if (cat) { r.category = cat; state.learned[(r.storeName||'').toLowerCase()] = cat; saveLearned(); }
  const noteVal = (document.getElementById('enote')?.value || '').trim();
  r.note = noteVal || undefined;
  persist();
  haptic('medium');
  toast('Scontrino aggiornato');
  openDetail(id);
  renderDashboard();
  if (state.tab === 'r') renderReceipts();
}

// ── MONTHLY TOTALS FOR SPARKLINE ──────────────────────────────
function getMonthlyTotals(n) {
  const now = new Date();
  const result = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const rx = state.receipts.filter(r => sameMonth(new Date(r.date || r.createdAt), d));
    const total = rx.reduce((s, r) => s + (r.totalAmount || 0), 0);
    const label = d.toLocaleDateString('it-IT', { month:'short' }).replace('.', '');
    result.push({ label, total, isCurrent: i === 0 });
  }
  return result;
}

function sparklineSVG(data) {
  const W = 320, H = 84, padX = 14, padY = 18, btm = 18;
  const plotH = H - padY - btm;
  const max = Math.max(...data.map(d => d.total), 1);
  const step = (W - padX * 2) / Math.max(data.length - 1, 1);

  const pts = data.map((d, i) => ({
    x: padX + i * step,
    y: padY + plotH - (d.total / max * plotH),
    ...d,
  }));

  const line = pts.map((p, i) => {
    if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    const pr = pts[i - 1];
    const cx = step * 0.4;
    return `C ${(pr.x + cx).toFixed(1)} ${pr.y.toFixed(1)} ${(p.x - cx).toFixed(1)} ${p.y.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }).join(' ');

  const area = `${line} L ${pts[pts.length-1].x.toFixed(1)} ${(H-btm).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(H-btm).toFixed(1)} Z`;

  const dots = pts.map(p => p.total > 0
    ? `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${p.isCurrent ? 4 : 2.5}" fill="${p.isCurrent ? 'var(--accent)' : 'var(--lbl3)'}"/>`
    : '').join('');

  const labels = pts.map(p =>
    `<text x="${p.x.toFixed(1)}" y="${H - 3}" text-anchor="middle" font-size="9"
      fill="${p.isCurrent ? 'var(--accent)' : 'var(--lbl2)'}"
      font-weight="${p.isCurrent ? '700' : '400'}"
      font-family="-apple-system,sans-serif">${p.label}</text>`).join('');

  const curr = pts.find(p => p.isCurrent);
  const currAmt = curr && curr.total > 0
    ? `<text x="${curr.x.toFixed(1)}" y="${(curr.y - 8).toFixed(1)}" text-anchor="middle"
        font-size="9" font-weight="700" fill="var(--accent)"
        font-family="-apple-system,sans-serif">${fmt(curr.total)}</text>`
    : '';

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--accent)" stop-opacity=".20"/>
        <stop offset="100%" stop-color="var(--accent)" stop-opacity=".01"/>
      </linearGradient>
    </defs>
    <path d="${area}" fill="url(#sg)"/>
    <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}${currAmt}${labels}
  </svg>`;
}

// ── SMART INSIGHTS ────────────────────────────────────────────
function calcInsights(thisRx, prevRx, mo) {
  const insights = [];

  // 1. Confronto con mese precedente
  const thisTotal = thisRx.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const prevTotal = prevRx.reduce((s, r) => s + (r.totalAmount || 0), 0);
  if (prevTotal > 0 && thisTotal > 0) {
    const diff = ((thisTotal - prevTotal) / prevTotal * 100).toFixed(0);
    const sign = diff > 0 ? 'in più' : 'in meno';
    const color = diff > 0 ? 'var(--red)' : 'var(--green)';
    insights.push({ color, text: `Stai spendendo ${Math.abs(diff)}% ${sign} rispetto al mese scorso` });
  }

  // 2. Categoria dominante
  if (thisRx.length > 0) {
    const catTotals = {};
    thisRx.forEach(r => { catTotals[r.category] = (catTotals[r.category] || 0) + (r.totalAmount || 0); });
    const top = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
    if (top && thisTotal > 0) {
      const pct = Math.round(top[1] / thisTotal * 100);
      const cat = catById(top[0]);
      if (pct >= 25) {
        insights.push({ color: cat.color, text: `${cat.name} è il ${pct}% della tua spesa questo mese` });
      }
    }
  }

  // 3. Forecast se a metà mese
  const now = new Date();
  if (sameMonth(now, mo) && thisRx.length >= 2) {
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    if (dayOfMonth >= 5 && dayOfMonth <= daysInMonth - 3) {
      const forecast = Math.round((thisTotal / dayOfMonth) * daysInMonth);
      insights.push({ color: 'var(--accent)', text: `Al ritmo attuale spenderai circa ${fmt(forecast)} questo mese` });
    }
  }

  // 4. Negozio più visitato
  if (thisRx.length >= 2) {
    const storeCounts = {};
    thisRx.forEach(r => { const s = r.storeName || 'Negozio'; storeCounts[s] = (storeCounts[s] || 0) + 1; });
    const topStore = Object.entries(storeCounts).sort((a, b) => b[1] - a[1])[0];
    if (topStore && topStore[1] >= 2) {
      insights.push({ color: 'var(--purple)', text: `${topStore[0]}: ${topStore[1]} visite questo mese` });
    }
  }

  return insights.slice(0, 3);
}

// ── RENDER: BUDGET SECTION ────────────────────────────────────
function renderBudgetSection(spent, budget) {
  if (!budget || budget <= 0) return '';
  const pct      = Math.min(100, spent / budget * 100);
  const pctRound = Math.round(pct);
  const remaining  = budget - spent;
  const overBudget = spent > budget;
  const ringColor  = pct < 70 ? 'var(--green)' : pct < 90 ? 'var(--orange)' : 'var(--red)';
  const r = 40, circ = +(2 * Math.PI * r).toFixed(2);
  const dash = (Math.min(pct, 100) / 100 * circ).toFixed(2);
  const offset = (circ / 4).toFixed(2);
  const remainText = overBudget
    ? `<span style="color:var(--red);font-weight:700">Sopra budget</span>`
    : `${fmt(remaining)} rimanenti`;

  return `
  <div class="card budget-wrap">
    <svg class="budget-ring" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--fill2)" stroke-width="9"/>
      <circle cx="50" cy="50" r="${r}" fill="none" stroke="${ringColor}" stroke-width="9"
        stroke-dasharray="${dash} ${circ}" stroke-dashoffset="${offset}"
        stroke-linecap="round"/>
      <text x="50" y="46" text-anchor="middle" dominant-baseline="middle"
        font-size="18" font-weight="800" style="fill:var(--lbl)">${pctRound}%</text>
      <text x="50" y="62" text-anchor="middle" font-size="9" style="fill:var(--lbl2)">budget</text>
    </svg>
    <div class="budget-info">
      <div class="budget-lbl">Budget Mensile</div>
      <div class="budget-remain">${remainText}</div>
      <div class="budget-meta">${fmt(spent)} di ${fmt(budget)}</div>
    </div>
  </div>`;
}

// ── RENDER: INSIGHTS SECTION ──────────────────────────────────
function renderInsightsSection(insights) {
  if (!insights || insights.length === 0) return '';
  const rows = insights.map(ins => `
    <div class="insight-row">
      <div class="insight-dot" style="background:${ins.color}"></div>
      <div class="insight-txt">${esc(ins.text)}</div>
    </div>`).join('');
  return `
  <div class="card insight-wrap">
    <div class="insight-hdr">Tendenze</div>
    ${rows}
  </div>`;
}

// ── RENDER: SPARKLINE SECTION ─────────────────────────────────
function renderSparkSection(data) {
  const hasData = data.some(d => d.total > 0);
  if (!hasData) return '';
  const year = new Date().getFullYear();
  const yearRx = state.receipts.filter(r => new Date(r.date||r.createdAt).getFullYear() === year);
  const yearTotal = yearRx.reduce((s,r)=>s+(r.totalAmount||0),0);
  return `
  <div class="card spark-wrap">
    <div class="spark-hdr">
      <span class="spark-title">Ultimi 6 Mesi</span>
      ${yearTotal > 0 ? `<span style="font-size:12px;font-weight:700;color:var(--lbl)">${fmt(yearTotal)} nel ${year}</span>` : ''}
    </div>
    ${sparklineSVG(data)}
  </div>`;
}

// ── RENDER: YEARLY SUMMARY ────────────────────────────────────
function renderYearlySection() {
  const now = new Date();
  const year = now.getFullYear();
  const yearRx = state.receipts.filter(r => new Date(r.date||r.createdAt).getFullYear() === year);
  if (yearRx.length < 6) return '';

  const yearTotal = yearRx.reduce((s,r)=>s+(r.totalAmount||0),0);

  const monthMap = {};
  yearRx.forEach(r => {
    const m = new Date(r.date||r.createdAt).getMonth();
    monthMap[m] = (monthMap[m]||0) + (r.totalAmount||0);
  });
  const monthCount = Object.keys(monthMap).length;
  if (monthCount < 3) return '';

  const avgMonthly = yearTotal / monthCount;
  const [worstM, worstAmt] = Object.entries(monthMap).sort((a,b)=>b[1]-a[1])[0];
  const worstName = new Date(year, +worstM, 1)
    .toLocaleDateString('it-IT',{month:'long'});
  const worstNameCap = worstName[0].toUpperCase() + worstName.slice(1);

  const catMap = {};
  yearRx.forEach(r => { catMap[r.category] = (catMap[r.category]||0) + (r.totalAmount||0); });
  const [topCatId] = Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0] || [];
  const topCat = topCatId ? catById(topCatId) : null;

  return `
  <div class="card yearly-card">
    <div class="yearly-hdr">Riepilogo ${year}</div>
    <div class="yearly-stats">
      <div class="ys-item">
        <div class="ys-val">${fmt(yearTotal)}</div>
        <div class="ys-lbl">Totale anno</div>
      </div>
      <div class="ys-divider"></div>
      <div class="ys-item">
        <div class="ys-val">${yearRx.length}</div>
        <div class="ys-lbl">Scontrini</div>
      </div>
      <div class="ys-divider"></div>
      <div class="ys-item">
        <div class="ys-val">${fmt(avgMonthly)}</div>
        <div class="ys-lbl">Media/mese</div>
      </div>
    </div>
    ${topCat ? `<div class="yearly-row">
      <span>${topCat.icon} Categoria principale</span>
      <strong>${topCat.name}</strong>
    </div>` : ''}
    <div class="yearly-row">
      <span>📈 Mese più costoso</span>
      <strong>${worstNameCap} · ${fmt(+worstAmt)}</strong>
    </div>
  </div>`;
}

// ── RENDER: DASHBOARD ─────────────────────────────────────────
function renderDashboard() {
  const el = document.getElementById('vd');
  const mo = state.dashMonth;
  const prevMo = new Date(mo.getFullYear(), mo.getMonth() - 1, 1);

  const thisRx = state.receipts.filter(r => sameMonth(new Date(r.date || r.createdAt), mo));
  const prevRx = state.receipts.filter(r => sameMonth(new Date(r.date || r.createdAt), prevMo));

  const total     = thisRx.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const prevTotal = prevRx.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const delta     = prevTotal > 0 ? (total - prevTotal) / prevTotal * 100 : null;
  const avg       = thisRx.length > 0 ? total / thisRx.length : 0;

  const catTotals = {};
  thisRx.forEach(r => { catTotals[r.category] = (catTotals[r.category] || 0) + (r.totalAmount || 0); });
  const catRows = Object.entries(catTotals).sort((a, b) => b[1] - a[1])
    .map(([id, amt]) => ({ cat: catById(id), amt }));
  const maxAmt = catRows[0]?.amt || 1;

  const nextMonthDate = new Date(mo.getFullYear(), mo.getMonth() + 1, 1);
  const nextDisabled  = isFutureMonth(nextMonthDate) ? 'disabled' : '';
  const prevDisabled  = mo.getFullYear() < 2020 ? 'disabled' : '';

  const deltaColor = delta !== null && delta <= 0 ? 'var(--green)' : 'var(--red)';
  const deltaStr   = delta !== null
    ? `<div class="s-delta" style="color:${deltaColor}">${delta <= 0 ? '↓' : '↑'} ${Math.abs(delta).toFixed(0)}% rispetto al mese scorso</div>`
    : `<div class="s-delta" style="color:var(--lbl2)">Primo mese tracciato</div>`;

  const chartSection = catRows.length > 0 ? `
  <div class="card chart-card">
    <div class="chart-title">Per Categoria</div>
    ${catRows.map(({ cat, amt }, i) => `
    <div class="brow">
      <span class="bico">${cat.icon}</span>
      <span class="bnm">${cat.name}</span>
      <div class="btrk"><div class="bfll" style="width:${(amt / maxAmt * 100).toFixed(1)}%;background:${cat.color};animation-delay:${i * 65}ms"></div></div>
      <span class="bval">${fmt(amt)}</span>
    </div>`).join('')}
  </div>` : '';

  const emptyState = state.receipts.length === 0 ? `
  <div class="welcome-wrap">
    <div class="welcome-hero">
      <div class="welcome-ico-wrap"><span class="welcome-ico">S</span></div>
      <h2 class="welcome-title">Benvenuto su Slippy</h2>
      <p class="welcome-sub">Il modo più intelligente di tracciare le spese quotidiane.</p>
    </div>
    <div class="card welcome-steps">
      <div class="ws-row"><span class="ws-num">1</span><div><strong>Fotografa</strong> uno scontrino con la fotocamera</div></div>
      <div class="ws-row"><span class="ws-num">2</span><div><strong>Slippy legge</strong> importo e negozio automaticamente</div></div>
      <div class="ws-row"><span class="ws-num">3</span><div><strong>Analizza</strong> le spese mensili con AI integrata</div></div>
    </div>
    <button class="welcome-cta" onclick="document.getElementById('fab').click()">Aggiungi il primo scontrino →</button>
    ${!state.settings.apiKey ? `<p class="welcome-hint">💡 Aggiungi una chiave API Claude nelle Impostazioni per sbloccare l'analisi AI.</p>` : ''}
  </div>` : '';

  const weekSection    = renderWeekSection(state.receipts);
  const budgetSection  = renderBudgetSection(total, state.settings.budget || 0);
  const insights       = calcInsights(thisRx, prevRx, mo);
  const insightSection = renderInsightsSection(insights);
  const sparkData      = getMonthlyTotals(6);
  const sparkSection   = renderSparkSection(sparkData);

  const streak = calcStreak();
  const monthKey = `${mo.getFullYear()}-${mo.getMonth()}`;
  const cachedAnalysis = state.monthlyAnalysis[monthKey];
  const aiMonthCard = (state.settings.apiKey && thisRx.length > 0) ? `
  <div class="card ai-month-card" id="dash-ai-card">
    <div class="ai-hdr">
      <span style="font-size:16px">✦</span>
      <h3>Analisi Mensile AI</h3>
      <span class="ai-badge">Claude</span>
    </div>
    ${cachedAnalysis?.text
      ? `<p class="ai-tip">${esc(cachedAnalysis.text)}</p>`
      : `<p style="font-size:13px;color:var(--lbl2);margin-bottom:10px">Analisi intelligente delle spese di ${monthLabel(mo)}.</p>
         <button class="ai-btn" onclick="fetchMonthlyAnalysis('${monthKey}')">Analizza questo mese →</button>`}
  </div>` : '';

  const forecastSection   = renderForecastSection(thisRx, mo);
  const topStoresSection  = renderTopStoresSection(thisRx);
  const yearlySection     = renderYearlySection();

  el.innerHTML = `
  <div class="nav brand-nav">
    <div class="brand-row">
      <div class="brand-ico-wrap"><span class="brand-ico">S</span></div>
      <span class="brand-name">slippy</span>
    </div>
    ${streak >= 3 ? `<span class="streak-badge">🔥 ${streak}gg</span>` : ''}
  </div>
  <div class="card spend-card">
    <div class="spend-mrow">
      <button onclick="shiftMonth(-1)" ${prevDisabled}>‹</button>
      <span>${monthLabel(mo)}</span>
      <button onclick="shiftMonth(1)" ${nextDisabled}>›</button>
    </div>
    <div class="s-lbl">Spesa totale</div>
    <div class="s-amt">${fmt(total)}</div>
    ${deltaStr}
    <div class="s-stats">
      <div class="sp"><div class="sp-v">${thisRx.length}</div><div class="sp-l">Scontrini</div></div>
      <div class="sp"><div class="sp-v">${fmt(avg)}</div><div class="sp-l">Media</div></div>
      <div class="sp"><div class="sp-v">${catRows.length}</div><div class="sp-l">Categorie</div></div>
    </div>
  </div>
  ${forecastSection}
  ${weekSection}
  ${budgetSection}
  ${insightSection}
  ${sparkSection}
  ${yearlySection}
  ${chartSection}
  ${topStoresSection}
  ${aiMonthCard}
  ${emptyState}
  <div class="pad"></div>`;

  // Count-up animation on the main spend amount
  animateCount(el.querySelector('.s-amt'), total);
}

function shiftMonth(dir) {
  const m = state.dashMonth;
  const next = new Date(m.getFullYear(), m.getMonth() + dir, 1);
  if (dir > 0 && isFutureMonth(next)) return;
  state.dashMonth = next;
  renderDashboard();
}

// ── RENDER: RECEIPTS LIST ─────────────────────────────────────
function renderReceipts(q) {
  if (q !== undefined) state.searchQ = q;
  const el    = document.getElementById('vr');
  const query = (state.searchQ || '').toLowerCase().trim();

  let list = [...state.receipts].sort((a, b) =>
    new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
  );
  if (query) {
    list = list.filter(r =>
      (r.storeName || '').toLowerCase().includes(query) ||
      catById(r.category).name.toLowerCase().includes(query) ||
      (r.note || '').toLowerCase().includes(query)
    );
  }
  if (state.filterCat) {
    list = list.filter(r => r.category === state.filterCat);
  }

  // Build store frequency map for recurring badge
  const storeFreq = {};
  state.receipts.forEach(r => {
    const s = r.storeName || 'Negozio';
    storeFreq[s] = (storeFreq[s] || 0) + 1;
  });

  // Category filter chips
  const usedCats = [...new Set(state.receipts.map(r => r.category))];
  const filterBar = `
  <div class="filter-wrap">
    <button class="fchip ${!state.filterCat ? 'on' : ''}" onclick="setFilter(null)">Tutti</button>
    ${usedCats.map(cid => {
      const c = catById(cid);
      const active = state.filterCat === cid;
      return `<button class="fchip ${active ? 'on' : ''}"
        style="${active ? `background:${c.color};border-color:${c.color}` : ''}"
        onclick="setFilter('${cid}')">${c.icon} ${c.name}</button>`;
    }).join('')}
  </div>`;

  const isFiltered = query || state.filterCat;
  const filteredTotal = list.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const countLine = isFiltered && list.length > 0
    ? `<div class="result-count">${list.length} risultat${list.length===1?'o':'i'} · ${fmt(filteredTotal)}</div>`
    : '';

  let bodyHTML = '';
  if (list.length === 0) {
    bodyHTML = `<div class="empty">
      <div class="empty-ico">${isFiltered ? '🔍' : '🧾'}</div>
      <h3>${isFiltered ? 'Nessun risultato' : 'Nessuno scontrino'}</h3>
      <p>${isFiltered ? 'Prova a cambiare filtro o ricerca.' : 'Tocca + per aggiungere il primo scontrino.'}</p>
    </div>`;
  } else {
    groupByDate(list).forEach(([grp, rows]) => {
      bodyHTML += `<div class="sec"><div class="sec-hdr">${esc(grp)}</div><div class="sec-list">`;
      rows.forEach(r => {
        const cat   = catById(r.category);
        const freq  = storeFreq[r.storeName || 'Negozio'] || 0;
        const badge = freq >= 3 ? `<span class="freq-badge">×${freq}</span>` : '';
        bodyHTML += `
        <div class="rx-wrap">
          <div class="rx-del-btn" onclick="quickDelete('${r.id}')"><span>Elimina</span></div>
          <div class="lrow" data-id="${r.id}" onclick="handleRowTap('${r.id}')">
            ${r.imageDataURL
              ? `<img src="${r.imageDataURL}" class="rx-thumb"/>`
              : `<div class="ico-box" style="background:${cat.color}22">${cat.icon}</div>`}
            <div class="ri">
              <div class="rn">${esc(r.storeName || 'Negozio')}${badge}</div>
              <div class="rs">${r.imageDataURL ? `${cat.icon} ` : ''}${esc(cat.name)} · ${fmtDate(r.date || r.createdAt)}${r.note ? `<span class="note-pip"> · 📝</span>` : ''}</div>
            </div>
            <div class="ra" style="color:${cat.color}">${fmt(r.totalAmount || 0)}</div>
          </div>
        </div>`;
      });
      bodyHTML += `</div></div>`;
    });
  }

  const thisMonthRx = state.receipts.filter(r => {
    const d = new Date(r.date || r.createdAt);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const thisMonthTotal = thisMonthRx.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const totalLine = state.receipts.length > 0
    ? `<span class="rx-month-total">${fmt(thisMonthTotal)} questo mese</span>`
    : '';

  el.innerHTML = `
  <div class="nav" style="display:flex;justify-content:space-between;align-items:baseline">
    <h1>Scontrini</h1>
    ${totalLine}
  </div>
  <div class="search-wrap">
    <svg class="search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    <input class="search-inp" placeholder="Cerca scontrini…"
      value="${esc(state.searchQ)}" oninput="renderReceipts(this.value)"/>
  </div>
  ${usedCats.length > 0 ? filterBar : ''}
  ${countLine}
  ${bodyHTML}
  <div class="pad"></div>`;

  setupSwipe();
}

// ── RENDER: RECEIPT DETAIL ────────────────────────────────────
function buildDetailHTML(id) {
  const r = state.receipts.find(x => x.id === id);
  if (!r) return null;
  const cat = catById(r.category);

  const chipsHTML = CATS.map(c => `
  <button class="chip ${c.id === r.category ? 'sel' : ''}"
    style="${c.id === r.category ? 'background:' + c.color + ';' : ''}"
    onclick="setCategory('${id}','${c.id}')">${c.icon} ${c.name}</button>`).join('');

  const itemsHTML = (r.items || []).length > 0 ? `
  <div class="det-sec">
    <h3>Prodotti</h3>
    <div class="card">
      ${r.items.map(it => `
      <div class="irow">
        <span class="in">${esc(it.name)}</span>
        <span class="ia">${fmt(it.amount)}</span>
      </div>`).join('')}
    </div>
  </div>` : '';

  const rawHTML = r.rawText ? `
  <div class="det-sec">
    <h3>Testo OCR</h3>
    <div class="card" style="padding:12px 16px">
      <pre style="font-size:11px;white-space:pre-wrap;color:var(--lbl2);font-family:'Menlo',monospace;line-height:1.5">${esc(r.rawText)}</pre>
    </div>
  </div>` : '';

  const existingTip = state.aiTips[id];
  const tipHTML = existingTip
    ? `<p class="ai-tip">${esc(existingTip)}</p>`
    : `<p style="font-size:13px;color:var(--lbl2);margin-bottom:10px">Ottieni un consiglio personalizzato per questo scontrino.</p>
       <button class="ai-btn" onclick="fetchTip('${id}')">Ottieni consiglio</button>`;

  return `
  <div class="nav-row">
    <button class="back-btn" onclick="closeOverlay('odetail')">‹ Indietro</button>
    <h2>Scontrino</h2>
    <div style="display:flex;gap:6px;align-items:center">
      <button class="back-btn share-btn" onclick="shareReceipt('${id}')" title="Condividi">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <polyline points="16 6 12 2 8 6"/>
          <line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
      </button>
      <button class="nav-act" onclick="showEditForm('${id}')">Modifica</button>
    </div>
  </div>
  <div style="padding-bottom:48px">
    <div class="det-hero" style="--cat:${cat.color}">
      <div class="det-hero-top">
        <div class="det-hero-ico">${cat.icon}</div>
        <div>
          <div class="det-hero-store">${esc(r.storeName || 'Negozio')}</div>
          <div class="det-hero-cat">${esc(cat.name)}</div>
        </div>
      </div>
      <div class="det-hero-amt">${fmt(r.totalAmount || 0)}</div>
      <div class="det-hero-date">${fmtDate(r.date || r.createdAt)}</div>
      ${r.imageDataURL ? `<div class="det-hero-thumb" onclick="openImage('${id}')">
        <img src="${r.imageDataURL}" style="width:48px;height:48px;object-fit:cover;border-radius:10px;opacity:.85"/>
        <span style="font-size:11px;color:rgba(255,255,255,.55);margin-top:4px">Vedi foto</span>
      </div>` : ''}
    </div>
    ${r.note ? `<div class="det-note"><span class="det-note-ico">📝</span>${esc(r.note)}</div>` : ''}
    <div class="det-sec" style="margin-top:14px">
      <h3>Categoria</h3>
      <div class="chips">${chipsHTML}</div>
    </div>
    ${itemsHTML}
    <div class="card ai-card" id="tip_${id}">
      <div class="ai-hdr">
        <span style="font-size:16px">✦</span>
        <h3>Consiglio AI</h3>
        <span class="ai-badge">Claude</span>
      </div>
      ${tipHTML}
    </div>
    ${rawHTML}
    <div class="pad"></div>
  </div>`;
}

function renderReceiptDetail(id) {
  const html = buildDetailHTML(id);
  if (!html) { closeOverlay('odetail'); return; }
  document.getElementById('odetail').innerHTML = html;
}

function setCategory(id, catId) {
  const r = state.receipts.find(x => x.id === id);
  if (!r) return;
  r.category = catId;
  state.learned[(r.storeName || '').toLowerCase()] = catId;
  saveLearned();
  persist();
  renderReceiptDetail(id);
  renderDashboard();
  if (state.tab === 'r') renderReceipts();
}

function confirmDelete(id) {
  haptic('heavy');
  if (!confirm('Eliminare questo scontrino? Non sarà possibile annullare.')) return;
  state.receipts = state.receipts.filter(x => x.id !== id);
  persist();
  closeOverlay('odetail');
  toast('Scontrino eliminato');
  renderDashboard();
  if (state.tab === 'r') renderReceipts();
  else if (state.tab === 's') renderSettings();
}

// ── RENDER: SETTINGS ─────────────────────────────────────────
function renderSettings() {
  const el    = document.getElementById('vs');
  const count = state.receipts.length;
  const key   = state.settings.apiKey || '';
  const budget = state.settings.budget || 0;
  el.innerHTML = `
  <div class="nav"><h1>Impostazioni</h1></div>
  <div class="ssel">
    <div class="sshdr">Budget Mensile</div>
    <div class="srow si-row" style="border-radius:var(--r)">
      <div class="si-ico" style="background:#34C75922">💰</div>
      <span class="slbl">€ Budget mensile</span>
      <input class="kinp" id="budgetInp" type="number" min="0" step="10"
        placeholder="0" value="${budget > 0 ? budget : ''}"
        style="text-align:right;font-size:15px;font-family:inherit;color:var(--accent);max-width:90px"/>
    </div>
    <div class="snote">Imposta un budget mensile per monitorare la spesa nella Dashboard.</div>
    <button class="btn btn-p" style="margin-top:8px" onclick="saveBudget()">Salva Budget</button>
  </div>
  <div class="ssel">
    <div class="sshdr">Claude API Key</div>
    <div class="srow" style="flex-direction:column;align-items:stretch;gap:10px;padding:14px 16px">
      <input class="kinp" id="apik" type="password"
        placeholder="sk-ant-…" value="${esc(key)}"
        autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"/>
      <div style="display:flex;gap:8px">
        <button class="btn btn-s" style="flex:1;width:auto;padding:11px;font-size:14px;margin:0"
          onclick="toggleKeyVis()">Mostra / Nascondi</button>
        <button class="btn btn-p" style="flex:1;width:auto;padding:11px;font-size:14px;margin:0"
          onclick="saveApiKey()">Salva</button>
      </div>
      ${key ? `<button class="btn btn-d" style="width:auto;padding:10px;font-size:13px;margin:0"
        onclick="removeApiKey()">Rimuovi Chiave</button>` : ''}
    </div>
    <div class="snote">Salvata nel browser. Ottieni la tua su console.anthropic.com.</div>
  </div>
  <div class="ssel">
    <div class="sshdr">Dati</div>
    <div class="srow si-row" style="cursor:pointer" onclick="${count ? 'exportCSV()' : ''}">
      <div class="si-ico" style="background:#007AFF22">📤</div>
      <span class="slbl" style="${!count ? 'color:var(--lbl3)' : ''}">Esporta CSV</span>
      <span class="sval">${count} scontrin${count === 1 ? 'o' : 'i'}</span>
    </div>
    <div class="srow si-row" style="cursor:pointer" onclick="${count ? 'clearAllData()' : ''}">
      <div class="si-ico" style="background:#FF3B3022">🗑️</div>
      <span class="slbl" style="${!count ? 'color:var(--lbl3)' : 'color:var(--red)'}">Cancella tutti i dati</span>
    </div>
    <div class="snote">I dati sono archiviati localmente sul tuo dispositivo.</div>
  </div>
  <div class="ssel">
    <div class="sshdr">Informazioni</div>
    <div class="srow si-row">
      <div class="si-ico" style="background:#5E5CE622">✦</div>
      <span class="slbl">Versione</span>
      <span class="sval">2.0 PWA</span>
    </div>
    <div class="srow si-row">
      <div class="si-ico" style="background:#34C75922">🔬</div>
      <span class="slbl">Motore OCR</span>
      <span class="sval">Tesseract.js 5</span>
    </div>
    <div class="srow si-row">
      <div class="si-ico" style="background:#FF950022">🤖</div>
      <span class="slbl">Modello AI</span>
      <span class="sval">Claude Sonnet</span>
    </div>
    <div class="srow si-row">
      <div class="si-ico" style="background:#AF52DE22">🌍</div>
      <span class="slbl">Lingue</span>
      <span class="sval">Italiano · Inglese</span>
    </div>
  </div>
  <div class="settings-brand">
    <div class="settings-brand-ico">S</div>
    <div class="settings-brand-name">slippy</div>
    <div class="settings-brand-tag">Fotografa lo scontrino. Conosci la tua spesa.</div>
  </div>
  <div class="pad"></div>`;
}

function saveBudget() {
  const v = parseFloat(document.getElementById('budgetInp')?.value || '0') || 0;
  state.settings.budget = v;
  saveSettings();
  haptic('medium');
  toast(v > 0 ? `Budget impostato: ${fmt(v)}/mese` : 'Budget rimosso');
  renderSettings();
  renderDashboard();
}

function toggleKeyVis() {
  const inp = document.getElementById('apik');
  if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
}
function saveApiKey() {
  const v = (document.getElementById('apik')?.value || '').trim();
  state.settings.apiKey = v;
  saveSettings();
  toast(v ? 'API key salvata ✓' : 'API key rimossa');
  renderSettings();
}
function removeApiKey() {
  state.settings.apiKey = '';
  saveSettings();
  toast('API key rimossa');
  renderSettings();
}
function exportCSV() {
  if (!state.receipts.length) return;
  const rows = [['ID','Store','Total (€)','Date','Category','Items'].join(',')];
  state.receipts.forEach(r => {
    rows.push([
      r.id,
      `"${(r.storeName || '').replace(/"/g, '""')}"`,
      (r.totalAmount || 0).toFixed(2),
      r.date || '',
      catById(r.category).name,
      `"${(r.items || []).map(i => i.name).join('; ').replace(/"/g, '""')}"`,
    ].join(','));
  });
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `slippy-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('CSV esportato!');
}
function clearAllData() {
  if (!confirm(`Eliminare tutti i ${state.receipts.length} scontrini? Non sarà possibile annullare.`)) return;
  state.receipts = [];
  state.aiTips   = {};
  persist();
  toast('Dati eliminati');
  renderDashboard();
  renderReceipts();
  renderSettings();
}

// ── CLAUDE API ────────────────────────────────────────────────
async function fetchTip(receiptId) {
  const r   = state.receipts.find(x => x.id === receiptId);
  const key = state.settings.apiKey;
  const tipEl = document.getElementById('tip_' + receiptId);
  if (!r) return;

  if (!key) {
    toast('Aggiungi la tua API key Claude nelle Impostazioni');
    return;
  }

  if (tipEl) tipEl.innerHTML = `
    <div class="ai-hdr"><span style="font-size:16px">✦</span><h3>Consiglio AI</h3><span class="ai-badge">Claude</span></div>
    <div class="spin" style="width:26px;height:26px;margin:10px auto;border-width:3px"></div>`;

  try {
    const cat    = catById(r.category);
    const prompt = `Sei un consulente finanziario. Ho speso ${fmt(r.totalAmount || 0)} da "${r.storeName || 'un negozio'}" (categoria: ${cat.name}). Dammi 1 consiglio pratico in italiano in massimo 2 frasi. Sii specifico e amichevole.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 120,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `API error ${res.status}`);
    }

    const data = await res.json();
    const tip  = data.content?.[0]?.text?.trim() || 'Nessun consiglio disponibile.';
    state.aiTips[receiptId] = tip;

    if (tipEl) tipEl.innerHTML = `
      <div class="ai-hdr"><span style="font-size:16px">✦</span><h3>Consiglio AI</h3><span class="ai-badge">Claude</span></div>
      <p class="ai-tip">${esc(tip)}</p>`;
  } catch (err) {
    const msg = err.message || 'Errore nel recupero del consiglio';
    if (tipEl) tipEl.innerHTML = `
      <div class="ai-hdr"><span style="font-size:16px">✦</span><h3>Consiglio AI</h3><span class="ai-badge">Claude</span></div>
      <p style="font-size:13px;color:var(--red);margin-bottom:8px">${esc(msg)}</p>
      <button class="ai-btn" onclick="fetchTip('${receiptId}')">Riprova</button>`;
  }
}

// ── INIT ──────────────────────────────────────────────────────
function init() {
  loadStorage();

  document.getElementById('filein').addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    // Sheet should be closing (was triggered by triggerCapture inside closeSheet callback)
    // Open scanner overlay with OCR
    try {
      await runOCR(file);
    } catch (err) {
      openOverlay('oscanner', `
      <div class="nav-row">
        <button class="back-btn" onclick="closeOverlay('oscanner')">✕</button>
        <h2>Error</h2><div style="min-width:56px"></div>
      </div>
      <div class="empty">
        <div class="empty-ico">⚠️</div>
        <h3>Scansione fallita</h3>
        <p>${esc(err.message || 'Impossibile leggere l\'immagine.')}</p>
        <button class="btn btn-s" style="width:200px;margin-top:8px"
          onclick="closeOverlay('oscanner');openScanner()">Riprova</button>
      </div>`);
    }
  });

  // FAB haptic
  document.getElementById('fab').addEventListener('click', () => haptic('light'));

  // Swipe-down to close bottom sheet
  const sht = document.getElementById('sht');
  let _shY = 0, _shDragging = false;
  sht.addEventListener('touchstart', e => {
    if (!sht.classList.contains('on')) return;
    _shY = e.touches[0].clientY;
    _shDragging = true;
    sht.style.transition = 'none';
  }, { passive: true });
  sht.addEventListener('touchmove', e => {
    if (!_shDragging) return;
    const dy = Math.max(0, e.touches[0].clientY - _shY);
    sht.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  sht.addEventListener('touchend', e => {
    if (!_shDragging) return;
    _shDragging = false;
    sht.style.transition = 'transform .36s cubic-bezier(.4,0,.2,1)';
    const dy = e.changedTouches[0].clientY - _shY;
    if (dy > 72) { closeSheet(); } else { sht.style.transform = 'translateY(0)'; }
  });

  renderDashboard();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);
