// ============================================================
// SLIPPY PWA — app.js
// ============================================================

// ── CATEGORIES ───────────────────────────────────────────────
const CATS = [
  { id:'groceries', nameEn:'Groceries',   name:'Alimentari',    icon:'🛒', color:'#30D158',
    kw:['supermercato','esselunga','carrefour','coop','lidl','aldi','pam','despar','conad','sigma','bennet','sma','eurospin','penny','tigros','famila','ipercoop','iper','simply','selex','alimentari','grocery','market','frutta','verdura','macelleria','panetteria','panificio','forno'] },
  { id:'restaurants', nameEn:'Restaurants', name:'Ristoranti',    icon:'🍽️', color:'#FF9500',
    kw:['ristorante','trattoria','osteria','pizzeria','bar ','caffè','café','restaurant','bistro','mcdonald','burger','kebab','sushi','piadineria','gelateria','pasticceria','bakery','coffee','starbucks','autogrill','self service'] },
  { id:'pharmacy', nameEn:'Pharmacy',    name:'Farmacia',      icon:'💊', color:'#FF3B30',
    kw:['farmacia','pharmacy','parafarmacia','medical','salute','sanitá','lloyds','boots','docto'] },
  { id:'fuel', nameEn:'Fuel',        name:'Carburante',    icon:'⛽', color:'#FF6B00',
    kw:['eni','agip','q8','ip ','shell','tamoil','total','bp ','benzina','carburante','fuel','petrol','diesel','stazione di servizio','distributore'] },
  { id:'transport', nameEn:'Transport',   name:'Trasporti',     icon:'🚆', color:'#34AADC',
    kw:['trenitalia','italo','flixbus','atm ','atac','bus','metro','taxi','uber','parking','parcheggio','autostrada','telepass','aeroporto','airport','ryanair','easyjet','alitalia','ita airways','volo','biglietto'] },
  { id:'shopping', nameEn:'Shopping',    name:'Shopping',      icon:'🛍️', color:'#007AFF',
    kw:['amazon','zalando','h&m','zara','ikea','obi','leroy','bricofer','brico','decathlon','tiger','primark','shein','aliexpress','ebay','shopping','centrocommerciale'] },
  { id:'clothing', nameEn:'Clothing',    name:'Abbigliamento', icon:'👗', color:'#AF52DE',
    kw:['abbigliamento','moda','clothing','fashion','boutique','sartoria','calzature','scarpe','bershka','pull&bear','mango','massimo dutti','lacoste','nike','adidas','footlocker'] },
  { id:'electronics', nameEn:'Electronics', name:'Elettronica',   icon:'📱', color:'#5856D6',
    kw:['mediaworld','euronics','unieuro','apple','fnac','trony','electronics','informatica','tech','samsung','google','microsoft','iphone','ipad','computer','laptop','telefono'] },
  { id:'health', nameEn:'Health & Sport',      name:'Salute & Sport', icon:'🏋️', color:'#64D2FF',
    kw:['palestra','gym','fitness','sport','piscina','wellness','spa','fisioterapia','dentista','oculista','medico','clinica','ospedale','visita','analisi','decathlon sport','running'] },
  { id:'other', nameEn:'Other',       name:'Altro',         icon:'📁', color:'#8E8E93', kw:[] },
];

// ── CURRENCIES ───────────────────────────────────────────────
const CURRENCIES = [
  { code:'EUR', nameEn:'Euro', symbol:'€',   name:'Euro' },
  { code:'USD', nameEn:'US Dollar', symbol:'$',   name:'Dollaro USA' },
  { code:'GBP', nameEn:'Pound Sterling', symbol:'£',   name:'Sterlina' },
  { code:'CHF', nameEn:'Swiss Franc', symbol:'CHF', name:'Franco Svizzero' },
  { code:'JPY', nameEn:'Japanese Yen', symbol:'¥',   name:'Yen Giapponese' },
  { code:'CAD', nameEn:'Canadian Dollar', symbol:'CA$', name:'Dollaro Canadese' },
  { code:'AUD', nameEn:'Australian Dollar', symbol:'A$',  name:'Dollaro Australiano' },
  { code:'DKK', nameEn:'Danish Krone', symbol:'kr',  name:'Corona Danese' },
  { code:'SEK', nameEn:'Swedish Krona', symbol:'kr',  name:'Corona Svedese' },
  { code:'NOK', nameEn:'Norwegian Krone', symbol:'kr',  name:'Corona Norvegese' },
];
function currSym() {
  const code = state.settings.currency || 'EUR';
  return CURRENCIES.find(c => c.code === code)?.symbol || code;
}

// ── STATE ─────────────────────────────────────────────────────
const state = {
  tab: 'd',
  dashMonth: new Date(),
  receipts: [],
  settings: { apiKey: '', budget: 0, currency: 'EUR', geminiKey: '', lang: 'it' },
  learned: {},

  pendingPhoto: null,
  detailId: null,
  searchQ: '',
  filterCat: null,
  sortOrder: 'date_desc',
  aiTips: {},
  monthlyAnalysis: {},
};

// ── STORAGE ───────────────────────────────────────────────────
function persist() {
  try { localStorage.setItem('slippy_receipts', JSON.stringify(state.receipts)); } catch(_) {}
}
function persistTips() {
  try { localStorage.setItem('slippy_tips', JSON.stringify(state.aiTips)); } catch(_) {}
}
function persistAnalysis() {
  try { localStorage.setItem('slippy_analysis', JSON.stringify(state.monthlyAnalysis)); } catch(_) {}
}
function loadStorage() {
  try {
    state.receipts = JSON.parse(localStorage.getItem('slippy_receipts') || '[]');
    const saved = JSON.parse(localStorage.getItem('slippy_settings') || '{"apiKey":""}');
    state.settings = Object.assign({ apiKey: '', budget: 0, currency: 'EUR', geminiKey: '', lang: 'it' }, saved);
    state.learned         = JSON.parse(localStorage.getItem('slippy_learned')   || '{}');
    state.aiTips          = JSON.parse(localStorage.getItem('slippy_tips')      || '{}');
    state.monthlyAnalysis = JSON.parse(localStorage.getItem('slippy_analysis')  || '{}');
  } catch(_) {
    state.receipts = []; state.settings = { apiKey: '', budget: 0, currency: 'EUR', lang: 'it' };
    state.learned = {}; state.aiTips = {}; state.monthlyAnalysis = {};
  }
}
function saveSettings() { localStorage.setItem('slippy_settings', JSON.stringify(state.settings)); }
function saveLearned()  { localStorage.setItem('slippy_learned',  JSON.stringify(state.learned));  }

// ── HELPERS ───────────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function fmt(n) {
  const code = state.settings.currency || 'EUR';
  const cur = CURRENCIES.find(c => c.code === code);
  const locale = { EUR:'it-IT', GBP:'en-GB', USD:'en-US', JPY:'ja-JP', CHF:'de-CH', CAD:'en-CA', AUD:'en-AU', DKK:'da-DK', SEK:'sv-SE', NOK:'nb-NO' }[code] || 'it-IT';
  const sym = cur?.symbol || code;
  return sym + '\u00A0' + Number(n || 0).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function uiLocale() { return (state?.settings?.lang || 'it') === 'en' ? 'en-GB' : 'it-IT'; }
function fmtDate(iso) {
  if (!iso) return '';
  return parseDate(iso).toLocaleDateString(uiLocale(), { day:'2-digit', month:'short', year:'numeric' });
}
function monthLabel(d) { return d.toLocaleDateString(uiLocale(), { month:'long', year:'numeric' }); }
function isFutureMonth(d) {
  const now = new Date();
  return d.getFullYear() > now.getFullYear() ||
    (d.getFullYear() === now.getFullYear() && d.getMonth() > now.getMonth());
}
function sameMonth(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth(); }
function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function parseDate(s) {
  if (!s) return new Date(NaN);
  if (s.length > 10) return new Date(s);
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function catById(id) { return CATS.find(c => c.id === id) || CATS[CATS.length - 1]; }
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
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
    const d = parseDate(r.date || r.createdAt);
    let g;
    if      (d.toDateString() === todayStr)     g = t('date.today');
    else if (d.toDateString() === yesterdayStr) g = t('date.yesterday');
    else if (now - d < 7 * 86400000)            g = t('date.this_week');
    else if (sameMonth(d, now))                 g = t('date.this_month');
    else {
      g = d.toLocaleDateString(uiLocale(), { month:'long', year:'numeric' });
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
    const s = r.storeName || t('misc.store');
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
    <div class="ts-title">${t('dash.top_stores')} <span style="font-size:9px;opacity:.5;font-weight:400;text-transform:none">${t('dash.top_stores_tap')}</span></div>
    ${sorted.map(([name, data], i) => {
      const cat = catById(data.cat);
      return `
      <div class="ts-row" onclick="drillStore('${esc(name)}')" style="cursor:pointer">
        <span class="ts-medal">${medals[i]}</span>
        <span class="ts-ico">${cat.icon}</span>
        <div class="ts-info">
          <div class="ts-name">${esc(name)}</div>
          <div class="ts-meta">${data.count} ${data.count === 1 ? t('misc.visits_one') : t('misc.visits_many')}</div>
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
    `${cat.icon} ${r.storeName || t('misc.store')}`,
    `${fmtDate(r.date || r.createdAt)} · ${catName(cat)}`,
    `${t('share.receipt_total')} ${fmt(r.totalAmount || 0)}`,
    r.note ? `📝 ${r.note}` : '',
  ].filter(Boolean).join('\n');

  if (navigator.share) {
    try { await navigator.share({ title: 'Slippy', text }); haptic('light'); }
    catch(e) { if (e.name !== 'AbortError') toast(t('toast.cant_share')); }
  } else {
    try { await navigator.clipboard.writeText(text); toast(t('toast.copied')); }
    catch(e) { toast(t('toast.no_share')); }
  }
}

// ── SHARE MONTH SUMMARY ───────────────────────────────────────
async function shareMonthSummary(moKey) {
  const [year, month] = moKey.split('-').map(Number);
  const mo = new Date(year, month, 1);
  const rx = state.receipts.filter(r => sameMonth(parseDate(r.date || r.createdAt), mo));
  if (!rx.length) { toast(t('misc.no_data_month')); return; }
  const total = rx.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const catTotals = {};
  rx.forEach(r => { catTotals[r.category] = (catTotals[r.category] || 0) + (r.totalAmount || 0); });
  const topCats = Object.entries(catTotals)
    .sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([id, amt]) => { const c = catById(id); return `${c.icon} ${catName(c)}: ${fmt(amt)}`; });

  const text = [
    `📊 ${t('share.summary', {month: monthLabel(mo)})}`,
    ``,
    `${t('share.total')} ${fmt(total)}`,
    `${t('share.receipts')} ${rx.length}`,
    `${t('share.average')} ${fmt(total / rx.length)}`,
    ``,
    `${t('share.by_cat')}`,
    ...topCats,
    ``,
    `— Slippy`,
  ].join('\n');

  haptic('light');
  if (navigator.share) {
    try { await navigator.share({ title: t('share.title', {month: monthLabel(mo)}), text }); }
    catch(e) { if (e.name !== 'AbortError') toast(t('toast.cant_share')); }
  } else {
    try { await navigator.clipboard.writeText(text); toast(t('toast.summary_copied')); }
    catch(e) { toast(t('toast.no_share')); }
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
    <div class="forecast-lbl">${t('dash.forecast')}</div>
    <div class="forecast-main">
      <div class="forecast-amt" style="color:${color}">${fmt(projected)}</div>
      <div class="forecast-rate">${fmt(dailyRate)}<span>${t('dash.per_day')}</span></div>
    </div>
    <div class="forecast-sub">
      ${t('misc.next_days', {amount: fmt(Math.round(dailyRate * daysLeft)), n: daysLeft})}
      ${overBudget ? `<span style="color:var(--red);font-weight:600"> ${t('misc.over_budget_dot')}</span>` : ''}
    </div>
  </div>`;
}

// ── STREAK ───────────────────────────────────────────────────
function calcStreak() {
  if (!state.receipts.length) return 0;
  const days = new Set(state.receipts.map(r =>
    r.date || localDateStr(new Date(r.createdAt))
  ));
  let streak = 0;
  const d = new Date();
  while (true) {
    const ds = localDateStr(d);
    if (days.has(ds)) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

// ── AI MONTHLY ANALYSIS ───────────────────────────────────────
async function fetchMonthlyAnalysis(monthKey) {
  const key = state.settings.apiKey;
  if (!key) { toast(t('toast.need_claude_key')); return; }

  state.monthlyAnalysis[monthKey] = { loading: true };
  const card = document.getElementById('dash-ai-card');
  if (card) card.innerHTML = `
    <div class="ai-hdr"><span style="font-size:16px">✦</span><h3>${t('dash.ai_monthly')}</h3><span class="ai-badge">Claude</span></div>
    <div class="spin" style="width:26px;height:26px;border-width:3px;margin:12px auto"></div>`;

  try {
    const [y, m] = monthKey.split('-').map(Number);
    const mo = new Date(y, m, 1);
    const rx = state.receipts.filter(r => sameMonth(parseDate(r.date||r.createdAt), mo));
    const total = rx.reduce((s, r) => s + (r.totalAmount||0), 0);
    const catMap = {};
    rx.forEach(r => { catMap[r.category] = (catMap[r.category]||0) + (r.totalAmount||0); });
    const catLines = Object.entries(catMap).sort((a,b)=>b[1]-a[1])
      .map(([k,v]) => `${catById(k).icon} ${catById(k).name}: ${fmt(v)}`).join(', ');

    const isEn = state.settings.lang === 'en';
    const prompt = isEn
      ? `You are a financial advisor. Analyse these expenses for ${monthLabel(mo)} and reply with exactly 3 short practical bullet points (•), max 80 words total:\nTotal: ${fmt(total)} | ${rx.length} receipts | ${catLines}`
      : `Sei un consulente finanziario. Analizza queste spese di ${monthLabel(mo)} in italiano e rispondi con esattamente 3 bullet point (•) brevi e pratici, max 80 parole totali:\nTotale: ${fmt(total)} | ${rx.length} scontrini | ${catLines}`;

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
    persistAnalysis();
    renderDashboard();
  } catch(err) {
    state.monthlyAnalysis[monthKey] = null;
    if (card) card.innerHTML = `
      <div class="ai-hdr"><span style="font-size:16px">✦</span><h3>${t('dash.ai_monthly')}</h3><span class="ai-badge">Claude</span></div>
      <p style="font-size:13px;color:var(--red);margin-bottom:8px">${esc(err.message)}</p>
      <button class="ai-btn" onclick="fetchMonthlyAnalysis('${monthKey}')">${t('btn.retry')}</button>`;
  }
}

// ── HAPTIC FEEDBACK ───────────────────────────────────────────
function haptic(type = 'light') {
  if (!navigator.vibrate) return;
  const patterns = { light: [8], medium: [20], heavy: [40] };
  if (patterns[type]) navigator.vibrate(patterns[type]);
}

// ── CONFIRM BOTTOM SHEET ──────────────────────────────────────
let _confirmCb = null;
function confirmSheet(message, label, cb, danger = true) {
  _confirmCb = cb;
  openSheet(`
  <div style="padding:4px 0 8px">
    <div style="font-size:16px;font-weight:600;text-align:center;padding:0 16px 4px;color:var(--lbl);line-height:1.45">${esc(message)}</div>
    <div class="scan-btns" style="margin-top:18px">
      <button class="btn ${danger ? 'btn-d' : 'btn-p'}" onclick="_runConfirm()">${esc(label)}</button>
      <button class="btn btn-s" onclick="closeSheet()">${t('btn.cancel')}</button>
    </div>
  </div>`);
}
function _runConfirm() {
  const cb = _confirmCb;
  _confirmCb = null;
  closeSheet();
  setTimeout(() => cb && cb(), 30);
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
  if (!el) return;
  el.classList.remove('on');
  setTimeout(() => {
    if (!el.classList.contains('on')) el.innerHTML = '';
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
  const sel = document.getElementById('mc') || document.getElementById('fc');
  if (sel) sel.value = categorize(storeName);
}


// ── I18N ─────────────────────────────────────────────────────────
const LANG = {
  it: {
    'tab.receipts':'Scontrini','tab.settings':'Impostazioni',
    'overlay.new_receipt':'Nuovo Scontrino','overlay.receipt':'Scontrino','overlay.edit':'Modifica',
    'form.store':'Negozio','form.total':'Totale','form.date':'Data','form.category':'Categoria',
    'form.products':'Prodotti (opzionale)','form.notes_opt':'Note (opzionale)','form.notes':'Note',
    'form.store_ph':'Nome negozio','form.product_ph':'Nome prodotto','form.note_ph':'Aggiungi una nota…',
    'form.photo':'Aggiungi foto scontrino (opzionale)','form.add_item':'+ Aggiungi',
    'btn.save':'Salva','btn.cancel':'Annulla','btn.save_receipt':'Salva Scontrino',
    'btn.save_changes':'Salva Modifiche','btn.save_anyway':'Salva Comunque',
    'btn.delete':'Elimina','btn.delete_receipt':'Elimina Scontrino','btn.duplicate':'Duplica Scontrino',
    'btn.edit':'Modifica','btn.back':'Indietro','btn.camera':'Fotocamera',
    'btn.library':'Scegli dalla Libreria','btn.remove_photo':'Rimuovi foto',
    'btn.analyze_ai':'✨ Analizza con AI','btn.analyzing':'⧗ Analisi in corso…',
    'btn.prefilled':'✓ Pre-compilato','btn.analyze_month':'Analizza questo mese →',
    'btn.regenerate':'↺ Rigenera','btn.retry':'Riprova','btn.get_advice':'Ottieni consiglio',
    'btn.show':'Mostra','btn.hide':'Nascondi','btn.remove_key':'Rimuovi Chiave',
    'btn.save_budget':'Salva Budget','btn.prev_month':'Mese precedente','btn.next_month':'Mese successivo',
    'misc.streak_days':'gg',
    'toast.saved':'Scontrino salvato!','toast.deleted':'Scontrino eliminato',
    'toast.updated':'Scontrino aggiornato',
    'toast.duplicated':'Scontrino duplicato — aggiorna data e importo se necessario',
    'toast.copied':'Copiato negli appunti!','toast.no_share':'Condivisione non supportata',
    'toast.cant_share':'Impossibile condividere','toast.summary_copied':'Riepilogo copiato!',
    'toast.need_claude_key':'Aggiungi la tua API key Claude nelle Impostazioni',
    'toast.need_gemini_key':'Aggiungi la API key Gemini nelle Impostazioni',
    'toast.need_photo':'Prima aggiungi una foto dello scontrino',
    'toast.photo_error':'Impossibile caricare la foto',
    'toast.prefilled':'Campi pre-compilati — controlla e salva',
    'toast.ai_key_error':'Errore AI — API key non valida',
    'toast.ai_error':'Errore AI — riprova','toast.enter_total':'Inserisci il totale',
    'toast.api_saved':'API key salvata ✓','toast.api_removed':'API key rimossa',
    'toast.gemini_saved':'Gemini API key salvata ✓','toast.gemini_removed':'Gemini API key rimossa',
    'toast.csv_exported':'CSV esportato!','toast.csv_invalid':'File CSV vuoto o non valido.',
    'toast.csv_format':'Formato CSV non riconosciuto.','toast.csv_none':'Nessun nuovo scontrino trovato.',
    'toast.csv_error':'Errore durante l\'importazione.','toast.data_deleted':'Dati eliminati',
    'toast.template_downloaded':'Template scaricato!',
    'toast.no_advice':'Nessun consiglio disponibile.','toast.invalid_response':'Risposta non valida',
    'dash.spending':'Spesa totale','dash.receipts':'Scontrini','dash.average':'Media',
    'dash.categories':'Categorie','dash.top_stores':'Top Negozi del Mese',
    'dash.top_stores_tap':'· tocca per cercare','dash.forecast':'Proiezione Fine Mese',
    'dash.per_day':'/giorno','dash.week':'Questa Settimana','dash.by_category':'Per Categoria',
    'dash.cat_tap':'· tocca per filtrare','dash.trends':'Tendenze',
    'dash.last6':'Ultimi 6 Mesi','dash.calendar':'Calendario Spese','dash.budget':'Budget Mensile',
    'dash.ai_monthly':'Analisi Mensile AI','dash.ai_tip':'Consiglio AI',
    'dash.ai_desc':'Analisi intelligente delle spese di {month}.',
    'dash.ai_tip_desc':'Ottieni un consiglio personalizzato per questo scontrino.',
    'dash.nudge_budget':'Imposta un budget',
    'dash.nudge_budget_desc':'Monitora quanto stai spendendo rispetto al tuo obiettivo mensile.',
    'dash.nudge_ai':'Sblocca l\'analisi AI',
    'dash.nudge_ai_desc':'Aggiungi la tua API key Claude per ricevere consigli personalizzati.',
    'dash.share':'Condividi riepilogo',
    'date.today':'Oggi','date.yesterday':'Ieri','date.this_week':'Questa Settimana','date.this_month':'Questo Mese',
    'rx.filter_all':'Tutti','rx.empty_filtered':'Nessun risultato',
    'rx.empty_filtered_sub':'Prova a cambiare filtro o ricerca.',
    'rx.empty':'Nessuno scontrino','rx.empty_sub':'Tocca + per aggiungere il primo scontrino.',
    'rx.search_ph':'Cerca scontrini…',
    'set.currency':'Valuta','set.budget':'Budget Mensile','set.budget_lbl':'{sym} Budget mensile',
    'set.claude':'Claude API Key','set.ai':'AI (Opzionale)','set.data':'Dati','set.info':'Informazioni',
    'set.export':'Esporta CSV','set.import':'Importa CSV','set.template':'Scarica Template','set.delete_all':'Cancella tutti i dati',
    'set.version':'Versione','set.language':'Lingua','set.ai_engine':'Analisi AI',
    'set.currency_note':'Usata in tutti i totali e nel budget.',
    'set.budget_note':'Imposta un budget mensile per monitorare la spesa nella Dashboard.',
    'set.claude_note':'Salvata nel browser. Ottieni la tua su console.anthropic.com.',
    'set.gemini_ph':'Gemini API Key (aistudio.google.com)',
    'set.gemini_note':'Gratuita su aistudio.google.com — abilita l\'analisi automatica degli scontrini.',
    'set.data_note':'I dati sono archiviati localmente sul tuo dispositivo.',
    'set.tagline':'Fotografa lo scontrino. Conosci la tua spesa.',
    'confirm.duplicate':'Questo scontrino sembra un duplicato. Salvare comunque?',
    'confirm.delete_quick':'Eliminare questo scontrino?',
    'confirm.delete':'Eliminare questo scontrino? Non sarà possibile annullare.',
    'confirm.delete_all':'Eliminare tutti i {n} scontrini? Non sarà possibile annullare.',
    'detail.products':'Prodotti','detail.category':'Categoria','detail.view_photo':'Vedi foto',
    'detail.photo_title':'Foto Scontrino',
    'share.summary':'Riepilogo {month}','share.total':'Spesa totale:','share.receipts':'Scontrini:',
    'share.average':'Media:','share.by_cat':'Per categoria:','share.title':'{month} Spese',
    'share.receipt_total':'Totale:',
    'year.title':'Riepilogo {year}','year.total':'Totale anno','year.receipts':'Scontrini','year.avg_month':'Media/mese',
    'year.top_cat':'Categoria principale','year.top_month':'📈 Mese più costoso',
    'welcome.title':'Benvenuto su Slippy','welcome.sub':'Il modo più intelligente di tracciare le spese quotidiane.',
    'welcome.step1':'Fotografa uno scontrino con la fotocamera',
    'welcome.step2':'Slippy legge importo e negozio automaticamente',
    'welcome.step3':'Analizza le spese mensili con AI integrata',
    'welcome.cta':'Aggiungi il primo scontrino →',
    'welcome.ai_hint':'💡 Aggiungi una chiave API Claude nelle Impostazioni per sbloccare l\'analisi AI.',
    'misc.store':'Negozio','misc.over_budget':'Sopra budget','misc.over_budget_dot':'· sopra budget',
    'aria.fab':'Aggiungi scontrino','aria.clear_search':'Cancella ricerca',
    'misc.remaining':'{amount} rimanenti','misc.next_days':'{amount} nei prossimi {n} giorni',
    'misc.restore':'Ripristina','misc.cal_legend':'= spesa','misc.visits_one':'visita','misc.visits_many':'visite',
    'misc.this_month':'{amount} questo mese','misc.results':'{n} risultat{s} · {amount}',
    'misc.first_month':'Primo mese tracciato','misc.vs_last':'{dir} {n}% rispetto al mese scorso',
    'misc.budget_set':'Budget impostato: {amount}/mese','misc.budget_removed':'Budget rimosso',
    'misc.currency_changed':'Valuta: {sym} {code}','misc.receipt_count':'{n} scontrin{s}',
    'misc.import_ok':'{n} scontrin{s} importat{s}!',
    'misc.delete_all':'Elimina tutto',
    'misc.of':' di ','misc.in_year':'nel {year}',
    'misc.vs_more':'in più','misc.vs_less':'in meno',
    'misc.spending_vs':'Stai spendendo {n}% {dir} rispetto al mese scorso',
    'misc.cat_spending':'{cat} {n}% della spesa questo mese',
    'misc.no_data_month':'Nessuna spesa in questo periodo',
    'days.short':'L,M,M,G,V,S,D',
  },
  en: {
    'tab.receipts':'Receipts','tab.settings':'Settings',
    'overlay.new_receipt':'New Receipt','overlay.receipt':'Receipt','overlay.edit':'Edit',
    'form.store':'Store','form.total':'Total','form.date':'Date','form.category':'Category',
    'form.products':'Products (optional)','form.notes_opt':'Notes (optional)','form.notes':'Notes',
    'form.store_ph':'Store name','form.product_ph':'Product name','form.note_ph':'Add a note…',
    'form.photo':'Add receipt photo (optional)','form.add_item':'+ Add',
    'btn.save':'Save','btn.cancel':'Cancel','btn.save_receipt':'Save Receipt',
    'btn.save_changes':'Save Changes','btn.save_anyway':'Save Anyway',
    'btn.delete':'Delete','btn.delete_receipt':'Delete Receipt','btn.duplicate':'Duplicate Receipt',
    'btn.edit':'Edit','btn.back':'Back','btn.camera':'Camera',
    'btn.library':'Choose from Library','btn.remove_photo':'Remove photo',
    'btn.analyze_ai':'✨ Analyse with AI','btn.analyzing':'⧗ Analysing…',
    'btn.prefilled':'✓ Pre-filled','btn.analyze_month':'Analyse this month →',
    'btn.regenerate':'↺ Regenerate','btn.retry':'Retry','btn.get_advice':'Get advice',
    'btn.show':'Show','btn.hide':'Hide','btn.remove_key':'Remove Key',
    'btn.save_budget':'Save Budget','btn.prev_month':'Previous month','btn.next_month':'Next month',
    'misc.streak_days':'d',
    'toast.saved':'Receipt saved!','toast.deleted':'Receipt deleted',
    'toast.updated':'Receipt updated',
    'toast.duplicated':'Receipt duplicated — update date and amount if needed',
    'toast.copied':'Copied to clipboard!','toast.no_share':'Sharing not supported',
    'toast.cant_share':'Unable to share','toast.summary_copied':'Summary copied!',
    'toast.need_claude_key':'Add your Claude API key in Settings',
    'toast.need_gemini_key':'Add your Gemini API key in Settings',
    'toast.need_photo':'First add a photo of the receipt',
    'toast.photo_error':'Could not load the photo',
    'toast.prefilled':'Fields pre-filled — check and save',
    'toast.ai_key_error':'AI error — invalid API key',
    'toast.ai_error':'AI error — try again','toast.enter_total':'Enter the total',
    'toast.api_saved':'API key saved ✓','toast.api_removed':'API key removed',
    'toast.gemini_saved':'Gemini API key saved ✓','toast.gemini_removed':'Gemini API key removed',
    'toast.csv_exported':'CSV exported!','toast.csv_invalid':'CSV file empty or invalid.',
    'toast.csv_format':'CSV format not recognised.','toast.csv_none':'No new receipts found.',
    'toast.csv_error':'Error during import.','toast.data_deleted':'Data deleted',
    'toast.template_downloaded':'Template downloaded!',
    'toast.no_advice':'No advice available.','toast.invalid_response':'Invalid response',
    'dash.spending':'Total spending','dash.receipts':'Receipts','dash.average':'Average',
    'dash.categories':'Categories','dash.top_stores':'Top Stores This Month',
    'dash.top_stores_tap':'· tap to search','dash.forecast':'End-of-Month Forecast',
    'dash.per_day':'/day','dash.week':'This Week','dash.by_category':'By Category',
    'dash.cat_tap':'· tap to filter','dash.trends':'Trends',
    'dash.last6':'Last 6 Months','dash.calendar':'Expense Calendar','dash.budget':'Monthly Budget',
    'dash.ai_monthly':'Monthly AI Analysis','dash.ai_tip':'AI Advice',
    'dash.ai_desc':'Intelligent analysis of {month} expenses.',
    'dash.ai_tip_desc':'Get personalised advice for this receipt.',
    'dash.nudge_budget':'Set a budget',
    'dash.nudge_budget_desc':'Monitor how much you are spending against your monthly goal.',
    'dash.nudge_ai':'Unlock AI analysis',
    'dash.nudge_ai_desc':'Add your Claude API key to receive personalised advice.',
    'dash.share':'Share summary',
    'date.today':'Today','date.yesterday':'Yesterday','date.this_week':'This Week','date.this_month':'This Month',
    'rx.filter_all':'All','rx.empty_filtered':'No results',
    'rx.empty_filtered_sub':'Try changing the filter or search.',
    'rx.empty':'No receipts','rx.empty_sub':'Tap + to add the first receipt.',
    'rx.search_ph':'Search receipts…',
    'set.currency':'Currency','set.budget':'Monthly Budget','set.budget_lbl':'{sym} Monthly budget',
    'set.claude':'Claude API Key','set.ai':'AI (Optional)','set.data':'Data','set.info':'Information',
    'set.export':'Export CSV','set.import':'Import CSV','set.template':'Download Template','set.delete_all':'Delete all data',
    'set.version':'Version','set.language':'Language','set.ai_engine':'AI Analysis',
    'set.currency_note':'Used in all totals and budget.',
    'set.budget_note':'Set a monthly budget to monitor spending in the Dashboard.',
    'set.claude_note':'Saved in browser. Get yours at console.anthropic.com.',
    'set.gemini_ph':'Gemini API Key (aistudio.google.com)',
    'set.gemini_note':'Free at aistudio.google.com — enables automatic receipt analysis.',
    'set.data_note':'Data is stored locally on your device.',
    'set.tagline':'Photograph the receipt. Know your spending.',
    'confirm.duplicate':'This receipt looks like a duplicate. Save anyway?',
    'confirm.delete_quick':'Delete this receipt?',
    'confirm.delete':'Delete this receipt? This cannot be undone.',
    'confirm.delete_all':'Delete all {n} receipts? This cannot be undone.',
    'detail.products':'Products','detail.category':'Category','detail.view_photo':'View photo',
    'detail.photo_title':'Receipt Photo',
    'share.summary':'{month} Summary','share.total':'Total spending:','share.receipts':'Receipts:',
    'share.average':'Average:','share.by_cat':'By category:','share.title':'{month} Expenses',
    'share.receipt_total':'Total:',
    'year.title':'{year} in Review','year.total':'Year total','year.receipts':'Receipts','year.avg_month':'Avg/month',
    'year.top_cat':'Top category','year.top_month':'📈 Most expensive month',
    'welcome.title':'Welcome to Slippy','welcome.sub':'The smartest way to track daily expenses.',
    'welcome.step1':'Photograph a receipt with the camera',
    'welcome.step2':'Slippy reads amount and store automatically',
    'welcome.step3':'Analyse monthly expenses with built-in AI',
    'welcome.cta':'Add the first receipt →',
    'welcome.ai_hint':'💡 Add a Claude API key in Settings to unlock AI analysis.',
    'misc.store':'Store','misc.over_budget':'Over budget','misc.over_budget_dot':'· over budget',
    'aria.fab':'Add receipt','aria.clear_search':'Clear search',
    'misc.remaining':'{amount} remaining','misc.next_days':'{amount} in the next {n} days',
    'misc.restore':'Restore','misc.cal_legend':'= spend','misc.visits_one':'visit','misc.visits_many':'visits',
    'misc.this_month':'{amount} this month','misc.results':'{n} result{s} · {amount}',
    'misc.first_month':'First tracked month','misc.vs_last':'{dir} {n}% vs last month',
    'misc.budget_set':'Budget set: {amount}/month','misc.budget_removed':'Budget removed',
    'misc.currency_changed':'Currency: {sym} {code}','misc.receipt_count':'{n} receipt{s}',
    'misc.import_ok':'{n} receipt{s} imported!',
    'misc.delete_all':'Delete all',
    'misc.of':' of ','misc.in_year':'in {year}',
    'misc.vs_more':'more','misc.vs_less':'less',
    'misc.spending_vs':'Spending {n}% {dir} vs last month',
    'misc.cat_spending':'{cat} {n}% of spending this month',
    'misc.no_data_month':'No spending in this period',
    'days.short':'M,T,W,T,F,S,S',
  },
};
function t(key, vars = {}) {
  const lang = state?.settings?.lang || 'it';
  let s = (LANG[lang] || LANG.it)[key];
  if (s == null) s = LANG.it[key] || key;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] !== undefined ? vars[k] : '{' + k + '}');
}
function catName(cat) { return (state?.settings?.lang || 'it') === 'en' ? (cat.nameEn || cat.name) : cat.name; }
function changeLang(lang) {
  state.settings.lang = lang;
  saveSettings();
  document.documentElement.lang = lang === 'en' ? 'en' : 'it';
  const r = document.getElementById('tab-lbl-r');
  const s = document.getElementById('tab-lbl-s');
  if (r) r.textContent = t('tab.receipts');
  if (s) s.textContent = t('tab.settings');
  const fab = document.getElementById('fab');
  if (fab) fab.setAttribute('aria-label', t('aria.fab'));
  renderDashboard();
  renderReceipts();
  renderSettings();
}

function categorize(storeName) {
  const s = (storeName || '').toLowerCase();
  if (state.learned[s]) return state.learned[s];
  for (const c of CATS) {
    if (c.kw.some(k => s.includes(k))) return c.id;
  }
  return 'other';
}


// ── FILE → DATA URL (resized to max 1200px, ≤500KB) ───────────
function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = rej;
    r.onload = e => {
      const img = new Image();
      img.onerror = rej;
      img.onload = () => {
        const MAX = 1200;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        res(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = e.target.result;
    };
    r.readAsDataURL(file);
  });
}

// ── ITEM ROW HELPER ───────────────────────────────────────────
function addItemRow() {
  const container = document.getElementById('items-rows');
  if (!container) return;
  let i = 0;
  while (document.getElementById('itn' + i)) i++;
  const row = document.createElement('div');
  row.className = 'frow';
  row.style.gap = '8px';
  row.innerHTML = `
    <input class="finp" style="text-align:left;flex:1" placeholder="${t('form.product_ph')}" id="itn${i}" autofocus/>
    <input class="finp" style="width:72px;text-align:right" type="number" step="0.01" placeholder="0.00" id="ita${i}" inputmode="decimal"/>`;
  container.appendChild(row);
  row.querySelector('input').focus();
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

// ── MANUAL ENTRY ─────────────────────────────────────────────
function openManualEntry() {
  haptic('light');
  state.pendingPhoto = null;
  const today = localDateStr();
  const catsOpt = CATS.map(c =>
    `<option value="${c.id}" ${c.id === 'groceries' ? 'selected' : ''}>${c.icon} ${catName(c)}</option>`
  ).join('');
  const aiBtn = state.settings.geminiKey
    ? `<button class="btn btn-s" id="ai-btn" onclick="analyzeWithAI()" style="gap:6px;margin-top:4px">${t('btn.analyze_ai')}</button>`
    : '';
  openOverlay('oscanner', `
  <div class="nav-row">
    <button class="back-btn" onclick="closeOverlay('oscanner')"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>
    <h2>${t('overlay.new_receipt')}</h2>
    <button class="nav-act" onclick="saveManualEntry()">${t('btn.save')}</button>
  </div>
  <div style="padding-bottom:40px">
    <div class="fsec">
      <div class="photo-attach" id="photo-area" onclick="openPhotoOptions()">
        <div id="photo-placeholder" style="display:flex;flex-direction:column;align-items:center;gap:6px;color:var(--lbl2);padding:16px 0">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          <span style="font-size:13px">${t('form.photo')}</span>
        </div>
        <div id="photo-preview-wrap" style="display:none;position:relative;width:100%">
          <img id="photo-preview" src="" alt="" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px;display:block"/>
          <button onclick="event.stopPropagation();removePendingPhoto()" aria-label="${t('btn.remove_photo')}" style="position:absolute;top:6px;right:6px;width:26px;height:26px;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;border:none;font-size:15px;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer">✕</button>
        </div>
      </div>
    </div>
    <div class="fsec">
      <div class="fhdr">${t('form.store')}</div>
      <div class="frow" style="border-radius:var(--r)">
        <input class="finp" style="text-align:left;flex:1" id="mn"
          placeholder="${t('form.store_ph')}" oninput="autoCategory(this.value)" autofocus/>
      </div>
    </div>
    <div class="fsec">
      <div class="fhdr">${t('form.total')}</div>
      <div class="frow" style="border-radius:var(--r) var(--r) 0 0">
        <span class="flbl">${currSym()}</span>
        <input class="finp" id="mt" type="number" step="0.01"
          placeholder="0.00" inputmode="decimal"/>
      </div>
      <div class="qa-row">
        ${[5,10,15,20,30,50].map(v => `<button type="button" class="qa-chip" onclick="setQuickAmt('mt',${v})">${currSym()}${v}</button>`).join('')}
      </div>
    </div>
    <div class="fsec">
      <div class="fhdr">${t('form.date')}</div>
      <div class="frow" style="border-radius:var(--r)">
        <input class="finp" id="md" type="date" value="${today}"/>
      </div>
    </div>
    <div class="fsec">
      <div class="fhdr">${t('form.category')}</div>
      <div class="frow" style="border-radius:var(--r)">
        <select class="finp" id="mc">${catsOpt}</select>
      </div>
    </div>
    <div class="fsec" id="items-fsec">
      <div class="fhdr" style="display:flex;justify-content:space-between;align-items:center">
        <span>${t('form.products')}</span>
        <button type="button" style="background:none;border:none;color:var(--accent);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;padding:0" onclick="addItemRow()">${t('form.add_item')}</button>
      </div>
      <div id="items-rows"></div>
    </div>
    <div class="fsec">
      <div class="fhdr">${t('form.notes_opt')}</div>
      <div class="frow" style="border-radius:var(--r)">
        <input class="finp" style="text-align:left;flex:1" id="mnote"
          placeholder="${t('form.note_ph')}"/>
      </div>
    </div>
    <div class="pad"></div>
    ${aiBtn}
    <button class="btn btn-p" onclick="saveManualEntry()" style="margin-top:8px">${t('btn.save_receipt')}</button>
    <div class="pad"></div>
  </div>`);
}

function setQuickAmt(id, val) {
  const el = document.getElementById(id);
  if (el) { el.value = val.toFixed(2); el.focus(); }
}

function saveManualEntry() {
  const name  = (document.getElementById('mn')?.value || '').trim() || t('misc.store');
  const total = parseFloat(document.getElementById('mt')?.value || '0') || 0;
  const date  = document.getElementById('md')?.value || localDateStr();
  const catId = document.getElementById('mc')?.value || 'other';
  const note  = (document.getElementById('mnote')?.value || '').trim();

  if (!(total > 0)) { toast(t('toast.enter_total')); return; }

  if (isDuplicate(name, total)) {
    confirmSheet(t('confirm.duplicate'), t('btn.save_anyway'), () => {
      _doSaveManual(name, total, date, catId, note);
    }, false);
    return;
  }
  _doSaveManual(name, total, date, catId, note);
}

function _doSaveManual(name, total, date, catId, note) {
  const items = [];
  let i = 0;
  while (document.getElementById('itn' + i)) {
    const n = (document.getElementById('itn' + i).value || '').trim();
    const aVal = (document.getElementById('ita' + i).value || '').trim();
    const a = aVal === '' ? undefined : (parseFloat(aVal) || 0);
    if (n) items.push({ name: n, price: a });
    i++;
  }
  const receipt = {
    id: uid(), storeName: name, totalAmount: total,
    date, createdAt: new Date().toISOString(),
    category: catId, items, rawText: '',
    imageDataURL: state.pendingPhoto || null,
    note: note || undefined,
  };
  state.pendingPhoto = null;
  state.receipts.unshift(receipt);
  persist();
  if (name) { state.learned[name.toLowerCase()] = catId; saveLearned(); }
  haptic('medium');
  closeOverlay('oscanner');
  toast(t('toast.saved'));
  renderDashboard();
  if (state.tab === 'r') renderReceipts();
}

// ── NAVIGATION ────────────────────────────────────────────────
function gotoTab(tab) {
  haptic('light');
  state.tab = tab;
  const ids = ['d', 'r', 's'];
  ids.forEach(id => document.getElementById('v' + id).classList.toggle('on', id === tab));
  document.querySelectorAll('.tab').forEach((el, i) => el.classList.toggle('on', ids[i] === tab));
  if (tab === 'd') renderDashboard();
  if (tab === 'r') renderReceipts();
  if (tab === 's') renderSettings();
}

function openScanner() {
  openManualEntry();
}

function triggerCapture(camera) {
  const fi = document.getElementById('filein');
  if (camera) fi.setAttribute('capture', 'environment');
  else        fi.removeAttribute('capture');
  fi.click();
}

function openPhotoOptions() {
  const html = `
  <div style="padding:4px 0 16px">
    <div style="font-size:17px;font-weight:700;text-align:center;margin-bottom:16px;color:var(--lbl)">${t('detail.photo_title')}</div>
    <div class="scan-btns">
      <button class="btn btn-p" onclick="closeSheet();triggerCapture(true)">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        ${t('btn.camera')}
      </button>
      <button class="btn btn-s" onclick="closeSheet();triggerCapture(false)">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        ${t('btn.library')}
      </button>
      ${state.pendingPhoto ? `<button class="btn btn-s" style="color:var(--red,#FF3B30)" onclick="closeSheet();removePendingPhoto()">${t('btn.remove_photo')}</button>` : ''}
    </div>
  </div>`;
  openSheet(html);
}

function removePendingPhoto() {
  state.pendingPhoto = null;
  const prev = document.getElementById('photo-preview');
  const wrap = document.getElementById('photo-preview-wrap');
  const ph = document.getElementById('photo-placeholder');
  if (prev) prev.src = '';
  if (wrap) wrap.style.display = 'none';
  if (ph) ph.style.display = 'flex';
}

async function analyzeWithAI() {
  const key = state.settings.geminiKey;
  if (!key) { toast(t('toast.need_gemini_key')); return; }
  if (!state.pendingPhoto) { toast(t('toast.need_photo')); return; }

  const btn = document.getElementById('ai-btn');
  if (btn) btn.textContent = t('btn.analyzing');

  try {
    const base64 = state.pendingPhoto.split(',')[1];
    const mime   = state.pendingPhoto.split(';')[0].split(':')[1];

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: state.settings.lang === 'en'
                  ? 'Read this receipt. Reply ONLY with valid JSON (no markdown): {"store":"store name","total":9.90,"date":"YYYY-MM-DD","items":[{"name":"product","price":9.90}]}. Use null for unreadable fields. Convert any date format to YYYY-MM-DD.'
                  : 'Leggi questo scontrino. Rispondi SOLO con JSON valido (nessun markdown): {"store":"nome negozio","total":9.90,"date":"YYYY-MM-DD","items":[{"name":"prodotto","price":9.90}]}. Usa null per campi non leggibili. Converti qualsiasi formato data in YYYY-MM-DD.' },
              { inline_data: { mime_type: mime, data: base64 } }
            ]
          }],
          generationConfig: { temperature: 0, maxOutputTokens: 512 }
        })
      }
    );

    if (!res.ok) throw new Error(`API error ${res.status}`);
    const json = await res.json();
    const raw  = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const m    = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error(t('toast.invalid_response'));
    const data = JSON.parse(m[0]);

    const mn = document.getElementById('mn');
    const mt = document.getElementById('mt');
    const md = document.getElementById('md');

    if (mn && data.store)  mn.value = data.store;
    if (mt && data.total != null) mt.value = Number(data.total).toFixed(2);
    if (md && data.date)   md.value = data.date;
    if (mn && data.store)  autoCategory(data.store);

    if (data.items?.length > 0) {
      const container = document.getElementById('items-rows');
      if (container) {
        container.innerHTML = '';
        data.items.forEach((it, i) => {
          const row = document.createElement('div');
          row.className = 'frow';
          row.style.gap = '8px';
          row.innerHTML = `
            <input class="finp" style="text-align:left;flex:1" placeholder="${t('form.product_ph')}" id="itn${i}" value="${esc(it.name || '')}"/>
            <input class="finp" style="width:72px;text-align:right" type="number" step="0.01" placeholder="0.00" id="ita${i}" inputmode="decimal" value="${it.price != null ? Number(it.price).toFixed(2) : ''}"/>`;
          container.appendChild(row);
        });
      }
    }

    if (btn) { btn.textContent = t('btn.prefilled'); btn.style.color = 'var(--green,#34C759)'; }
    toast(t('toast.prefilled'));
  } catch (err) {
    if (btn) { btn.textContent = t('btn.analyze_ai'); btn.style.color = ''; }
    toast(err.message.includes('400') ? t('toast.ai_key_error') : t('toast.ai_error'));
  }
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
      currentX = lrow.dataset.revealed === '1' ? -80 : 0;
      dragging = true;
      lrow.style.transition = 'none';
    }, { passive: true });

    lrow.addEventListener('touchmove', e => {
      if (!dragging) return;
      const dx = e.touches[0].clientX - startX;
      if (lrow.dataset.revealed === '1') {
        currentX = Math.min(0, -80 + dx);
      } else {
        currentX = Math.min(0, dx);
      }
      lrow.style.transform = `translateX(${currentX}px)`;
    }, { passive: true });

    lrow.addEventListener('touchend', () => {
      if (!dragging) return;
      dragging = false;
      lrow.style.transition = 'transform .25s ease';
      if (currentX < -40) {
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
  haptic('medium');
  confirmSheet(t('confirm.delete_quick'), t('btn.delete'), () => {
    haptic('heavy');
    state.receipts = state.receipts.filter(x => x.id !== id);
    delete state.aiTips[id];
    persist();
    persistTips();
    toast(t('toast.deleted'));
    renderDashboard();
    renderReceipts();
  });
}

// ── CATEGORY FILTER ───────────────────────────────────────────
function setFilter(cat) {
  state.filterCat = cat;
  renderReceipts();
}

function setSort(order) {
  state.sortOrder = order;
  renderReceipts();
}

function drillStore(name) {
  haptic('light');
  state.filterCat = null;
  gotoTab('r');
  renderReceipts(name);
}

// ── WEEK SUMMARY ──────────────────────────────────────────────
function renderWeekSection(allRx) {
  const now = new Date();
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0=Mon
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - dow); weekStart.setHours(0,0,0,0);
  const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(weekStart.getDate() - 7);

  const thisW = allRx.filter(r => parseDate(r.date || r.createdAt) >= weekStart);
  const lastW = allRx.filter(r => { const d = parseDate(r.date||r.createdAt); return d >= lastWeekStart && d < weekStart; });
  if (!thisW.length) return '';

  const thisT = thisW.reduce((s,r)=>s+(r.totalAmount||0),0);
  const lastT = lastW.reduce((s,r)=>s+(r.totalAmount||0),0);
  const diff  = lastT > 0 ? ((thisT - lastT) / lastT * 100) : null;
  const dc    = diff !== null ? (diff > 0 ? 'var(--red)' : 'var(--green)') : '';

  // Daily bar chart Mon–Sun
  const dayLabels = t('days.short').split(',');
  const dayTotals = new Array(7).fill(0);
  thisW.forEach(r => {
    const d = parseDate(r.date || r.createdAt);
    const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
    dayTotals[idx] += r.totalAmount || 0;
  });
  const maxDay = Math.max(...dayTotals, 1);
  const todayIdx = now.getDay() === 0 ? 6 : now.getDay() - 1;

  const dayBars = dayTotals.map((amt, i) => {
    const pct = Math.max(6, Math.round(amt / maxDay * 100));
    const isToday = i === todayIdx;
    const isPast  = i <= todayIdx;
    const bg = isToday ? 'var(--accent)' : (isPast && amt > 0) ? 'var(--accent-end)' : 'var(--fill2)';
    return `<div class="wd-col">
      <div class="wd-bar-wrap">
        <div class="wd-bar" style="height:${amt > 0 ? pct : 6}%;background:${bg};opacity:${!isPast && amt === 0 ? .35 : 1}"></div>
      </div>
      <div class="wd-lbl" style="${isToday ? 'color:var(--accent);font-weight:700' : ''}">${dayLabels[i]}</div>
    </div>`;
  }).join('');

  return `
  <div class="card week-wrap">
    <div class="week-top">
      <div>
        <div class="week-lbl">${t('dash.week')}</div>
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
    `<option value="${c.id}" ${c.id === r.category ? 'selected' : ''}>${c.icon} ${catName(c)}</option>`
  ).join('');
  const el = document.getElementById('odetail');
  el.scrollTop = 0;
  el.innerHTML = `
  <div class="nav-row">
    <button class="back-btn" onclick="openDetail('${id}')">${t('btn.cancel')}</button>
    <h2>${t('overlay.edit')}</h2>
    <button class="nav-act" onclick="saveReceiptEdit('${id}')">${t('btn.save')}</button>
  </div>
  <div style="padding-bottom:40px">
    <div class="fsec">
      <div class="fhdr">${t('form.store')}</div>
      <div class="frow" style="border-radius:var(--r)">
        <input class="finp" style="text-align:left;flex:1" id="en" value="${esc(r.storeName||'')}"/>
      </div>
    </div>
    <div class="fsec">
      <div class="fhdr">${t('form.total')}</div>
      <div class="frow" style="border-radius:var(--r)">
        <span class="flbl">${currSym()}</span>
        <input class="finp" id="et" type="number" step="0.01" value="${(r.totalAmount||0).toFixed(2)}"/>
      </div>
    </div>
    <div class="fsec">
      <div class="fhdr">${t('form.date')}</div>
      <div class="frow" style="border-radius:var(--r)">
        <input class="finp" id="ed" type="date" value="${r.date||''}"/>
      </div>
    </div>
    <div class="fsec">
      <div class="fhdr">${t('form.category')}</div>
      <div class="frow" style="border-radius:var(--r)">
        <select class="finp" id="ec">${catsOpt}</select>
      </div>
    </div>
    <div class="fsec">
      <div class="fhdr">${t('form.notes')}</div>
      <div class="frow" style="border-radius:var(--r)">
        <input class="finp" style="text-align:left;flex:1" id="enote"
          placeholder="${t('form.note_ph')}" value="${esc(r.note||'')}"/>
      </div>
    </div>
    <div class="pad"></div>
    <button class="btn btn-p" onclick="saveReceiptEdit('${id}')">${t('btn.save_changes')}</button>
    <div style="height:10px"></div>
    <button class="btn btn-s" onclick="duplicateReceipt('${id}')">${t('btn.duplicate')}</button>
    <div style="height:10px"></div>
    <button class="btn btn-d" onclick="confirmDelete('${id}')">${t('btn.delete_receipt')}</button>
    <div class="pad"></div>
  </div>`;
}

function saveReceiptEdit(id) {
  const r = state.receipts.find(x => x.id === id);
  if (!r) return;
  const name = (document.getElementById('en')?.value||'').trim();
  if (name) r.storeName = name;
  const tot = parseFloat(document.getElementById('et')?.value||'');
  if (!isNaN(tot) && tot > 0) r.totalAmount = tot;
  const dt = document.getElementById('ed')?.value;
  if (dt) r.date = dt;
  const cat = document.getElementById('ec')?.value;
  if (cat) { r.category = cat; state.learned[(r.storeName||'').toLowerCase()] = cat; saveLearned(); }
  const noteVal = (document.getElementById('enote')?.value || '').trim();
  r.note = noteVal || undefined;
  persist();
  haptic('medium');
  toast(t('toast.updated'));
  openDetail(id);
  renderDashboard();
  if (state.tab === 'r') renderReceipts();
}

function duplicateReceipt(id) {
  const r = state.receipts.find(x => x.id === id);
  if (!r) return;
  const copy = { ...r, id: uid(), date: localDateStr(), createdAt: new Date().toISOString() };
  delete copy.imageDataURL;
  delete copy.rawText;
  state.receipts.unshift(copy);
  persist();
  haptic('medium');
  closeOverlay('odetail');
  toast(t('toast.duplicated'));
  renderDashboard();
  if (state.tab === 'r') renderReceipts();
  setTimeout(() => openDetail(copy.id), 400);
}

// ── MONTHLY TOTALS FOR SPARKLINE ──────────────────────────────
function getMonthlyTotals(n) {
  const now = new Date();
  const result = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const rx = state.receipts.filter(r => sameMonth(parseDate(r.date || r.createdAt), d));
    const total = rx.reduce((s, r) => s + (r.totalAmount || 0), 0);
    const label = d.toLocaleDateString(uiLocale(), { month:'short' }).replace('.', '');
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
    const dir = diff > 0 ? t('misc.vs_more') : t('misc.vs_less');
    const color = diff > 0 ? 'var(--red)' : 'var(--green)';
    const icon = diff > 0 ? '📈' : '📉';
    insights.push({ color, icon, text: t('misc.spending_vs', {n: Math.abs(diff), dir}) });
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
        insights.push({ color: cat.color, icon: cat.icon, text: t('misc.cat_spending', {cat: catName(cat), n: pct}) });
      }
    }
  }

  // 3. Negozio più visitato
  if (thisRx.length >= 2) {
    const storeCounts = {};
    thisRx.forEach(r => { const s = r.storeName || t('misc.store'); storeCounts[s] = (storeCounts[s] || 0) + 1; });
    const topStore = Object.entries(storeCounts).sort((a, b) => b[1] - a[1])[0];
    if (topStore && topStore[1] >= 2) {
      insights.push({ color: 'var(--purple)', icon: '🏪', text: `${topStore[0]}: ${topStore[1]} ${topStore[1] === 1 ? t('misc.visits_one') : t('misc.visits_many')}` });
    }
  }

  return insights.slice(0, 2);
}

// ── RENDER: CALENDAR HEATMAP ──────────────────────────────────
function renderCalendarSection(thisRx, mo) {
  if (thisRx.length < 2) return '';
  const year = mo.getFullYear(), month = mo.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const now = new Date();
  const isCurrentMonth = sameMonth(mo, now);

  // Build daily totals map
  const dayMap = {};
  thisRx.forEach(r => {
    const d = parseDate(r.date || r.createdAt).getDate();
    dayMap[d] = (dayMap[d] || 0) + (r.totalAmount || 0);
  });
  const maxDay = Math.max(...Object.values(dayMap), 1);

  // Day-of-week of the 1st (0=Sun, but we use Mon-start so offset)
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const startOffset = firstDow === 0 ? 6 : firstDow - 1; // Mon=0

  const dayNames = t('days.short').split(',');
  const header = dayNames.map(d => `<div class="cal-dname">${d}</div>`).join('');

  let cells = Array(startOffset).fill(`<div class="cal-cell cal-empty"></div>`);
  for (let d = 1; d <= daysInMonth; d++) {
    const amt = dayMap[d] || 0;
    const isToday = isCurrentMonth && d === now.getDate();
    const isFuture = isCurrentMonth && d > now.getDate();
    const opacity = amt > 0 ? Math.max(0.15, amt / maxDay) : 0;
    const hasSpend = amt > 0;
    cells.push(`<div class="cal-cell ${isToday ? 'cal-today' : ''} ${isFuture ? 'cal-future' : ''}"
      ${hasSpend ? `onclick="calDayTap(${year},${month},${d})" style="cursor:pointer" title="${fmt(amt)}"` : ''}
      data-amt="${amt.toFixed(2)}">
      <div class="cal-fill" style="opacity:${opacity.toFixed(2)};background:var(--accent)"></div>
      <span class="cal-n ${hasSpend ? 'cal-has-amt' : ''}">${d}</span>
    </div>`);
  }

  return `
  <div class="card cal-wrap">
    <div class="cal-hdr">
      <span class="cal-title">${t('dash.calendar')}</span>
      <span class="cal-legend"><span class="cal-legend-dot"></span>${t('misc.cal_legend')}</span>
    </div>
    <div class="cal-grid">
      ${header}
      ${cells.join('')}
    </div>
  </div>`;
}

function calDayTap(year, month, day) {
  const d = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  state.filterCat = null;
  gotoTab('r');
  renderReceipts(d.slice(0, 7));
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
    ? `<span style="color:var(--red);font-weight:700">${t('misc.over_budget')}</span>`
    : t('misc.remaining', { amount: fmt(remaining) });

  return `
  <div class="card budget-wrap">
    <svg class="budget-ring" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--fill2)" stroke-width="9"/>
      <circle class="budget-fill" cx="50" cy="50" r="${r}" fill="none" stroke="${ringColor}" stroke-width="9"
        stroke-dasharray="0 ${circ}" stroke-dashoffset="${offset}"
        stroke-linecap="round" data-dash="${dash}" data-circ="${circ}"/>
      <text x="50" y="46" text-anchor="middle" dominant-baseline="middle"
        font-size="18" font-weight="800" style="fill:var(--lbl)">${pctRound}%</text>
      <text x="50" y="62" text-anchor="middle" font-size="9" style="fill:var(--lbl2)">budget</text>
    </svg>
    <div class="budget-info">
      <div class="budget-lbl">${t('dash.budget')}</div>
      <div class="budget-remain">${remainText}</div>
      <div class="budget-meta">${fmt(spent)}${t('misc.of')}${fmt(budget)}</div>
    </div>
  </div>`;
}

// ── RENDER: INSIGHTS SECTION ──────────────────────────────────
function renderInsightsSection(insights) {
  if (!insights || insights.length === 0) return '';
  const rows = insights.map(ins => `
    <div class="insight-row">
      <div class="insight-ico" style="background:${ins.color}20;color:${ins.color}">${ins.icon || '●'}</div>
      <div class="insight-txt">${esc(ins.text)}</div>
    </div>`).join('');
  return `
  <div class="card insight-wrap">
    <div class="insight-hdr">${t('dash.trends')}</div>
    ${rows}
  </div>`;
}

// ── RENDER: SPARKLINE SECTION ─────────────────────────────────
function renderSparkSection(data) {
  const hasData = data.some(d => d.total > 0);
  if (!hasData) return '';
  const year = new Date().getFullYear();
  const yearRx = state.receipts.filter(r => parseDate(r.date||r.createdAt).getFullYear() === year);
  const yearTotal = yearRx.reduce((s,r)=>s+(r.totalAmount||0),0);
  return `
  <div class="card spark-wrap">
    <div class="spark-hdr">
      <span class="spark-title">${t('dash.last6')}</span>
      ${yearTotal > 0 ? `<span style="font-size:12px;font-weight:700;color:var(--lbl)">${fmt(yearTotal)} ${t('misc.in_year', {year})}</span>` : ''}
    </div>
    ${sparklineSVG(data)}
  </div>`;
}

// ── RENDER: YEARLY SUMMARY ────────────────────────────────────
function renderYearlySection() {
  const now = new Date();
  const year = now.getFullYear();
  const yearRx = state.receipts.filter(r => parseDate(r.date||r.createdAt).getFullYear() === year);
  if (yearRx.length < 6) return '';

  const yearTotal = yearRx.reduce((s,r)=>s+(r.totalAmount||0),0);

  const monthMap = {};
  yearRx.forEach(r => {
    const m = parseDate(r.date||r.createdAt).getMonth();
    monthMap[m] = (monthMap[m]||0) + (r.totalAmount||0);
  });
  const monthCount = Object.keys(monthMap).length;
  if (monthCount < 3) return '';

  const avgMonthly = yearTotal / monthCount;
  const [worstM, worstAmt] = Object.entries(monthMap).sort((a,b)=>b[1]-a[1])[0];
  const worstName = new Date(year, +worstM, 1)
    .toLocaleDateString(uiLocale(),{month:'long'});
  const worstNameCap = worstName[0].toUpperCase() + worstName.slice(1);

  const catMap = {};
  yearRx.forEach(r => { catMap[r.category] = (catMap[r.category]||0) + (r.totalAmount||0); });
  const [topCatId] = Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0] || [];
  const topCat = topCatId ? catById(topCatId) : null;

  return `
  <div class="card yearly-card">
    <div class="yearly-hdr">${t('year.title', {year})}</div>
    <div class="yearly-stats">
      <div class="ys-item">
        <div class="ys-val">${fmt(yearTotal)}</div>
        <div class="ys-lbl">${t('year.total')}</div>
      </div>
      <div class="ys-divider"></div>
      <div class="ys-item">
        <div class="ys-val">${yearRx.length}</div>
        <div class="ys-lbl">${t('year.receipts')}</div>
      </div>
      <div class="ys-divider"></div>
      <div class="ys-item">
        <div class="ys-val">${fmt(avgMonthly)}</div>
        <div class="ys-lbl">${t('year.avg_month')}</div>
      </div>
    </div>
    ${topCat ? `<div class="yearly-row">
      <span>${topCat.icon} ${t('year.top_cat')}</span>
      <strong>${catName(topCat)}</strong>
    </div>` : ''}
    <div class="yearly-row">
      <span>${t('year.top_month')}</span>
      <strong>${worstNameCap} · ${fmt(+worstAmt)}</strong>
    </div>
  </div>`;
}

// ── RENDER: DASHBOARD ─────────────────────────────────────────
function renderDashboard() {
  const el = document.getElementById('vd');
  const mo = state.dashMonth;
  const prevMo = new Date(mo.getFullYear(), mo.getMonth() - 1, 1);

  const thisRx = state.receipts.filter(r => sameMonth(parseDate(r.date || r.createdAt), mo));
  const prevRx = state.receipts.filter(r => sameMonth(parseDate(r.date || r.createdAt), prevMo));

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
    ? `<div class="s-delta" style="color:${deltaColor}">${t('misc.vs_last', {dir: delta <= 0 ? '↓' : '↑', n: Math.abs(delta).toFixed(0)})}</div>`
    : `<div class="s-delta" style="color:var(--lbl2)">${t('misc.first_month')}</div>`;

  const chartSection = catRows.length > 0 ? `
  <div class="card chart-card">
    <div class="chart-title">${t('dash.by_category')} <span style="font-size:9px;opacity:.5;font-weight:400;text-transform:none">${t('dash.cat_tap')}</span></div>
    ${catRows.map(({ cat, amt }, i) => `
    <div class="brow" onclick="gotoTab('r');setFilter('${cat.id}')" style="cursor:pointer">
      <span class="bico">${cat.icon}</span>
      <span class="bnm">${catName(cat)}</span>
      <div class="btrk"><div class="bfll" style="width:${(amt / maxAmt * 100).toFixed(1)}%;background:${cat.color};animation-delay:${i * 65}ms"></div></div>
      <span class="bval">${fmt(amt)}</span>
    </div>`).join('')}
  </div>` : '';

  const emptyMonthState = (state.receipts.length > 0 && thisRx.length === 0) ? `
  <div style="text-align:center;padding:32px 16px;color:var(--lbl2);font-size:14px">
    <div style="font-size:32px;margin-bottom:8px">📅</div>
    <div style="font-weight:600;color:var(--lbl)">${t('misc.no_data_month')}</div>
  </div>` : '';

  const emptyState = state.receipts.length === 0 ? `
  <div class="welcome-wrap">
    <div class="welcome-hero">
      <div class="welcome-ico-wrap"><span class="welcome-ico">S</span></div>
      <h2 class="welcome-title">${t('welcome.title')}</h2>
      <p class="welcome-sub">${t('welcome.sub')}</p>
    </div>
    <div class="card welcome-steps">
      <div class="ws-row"><span class="ws-num">1</span><div>${t('welcome.step1')}</div></div>
      <div class="ws-row"><span class="ws-num">2</span><div>${t('welcome.step2')}</div></div>
      <div class="ws-row"><span class="ws-num">3</span><div>${t('welcome.step3')}</div></div>
    </div>
    <button class="welcome-cta" onclick="document.getElementById('fab').click()">${t('welcome.cta')}</button>
    ${!state.settings.apiKey ? `<p class="welcome-hint">${t('welcome.ai_hint')}</p>` : ''}
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
      <h3>${t('dash.ai_monthly')}</h3>
      <span class="ai-badge">Claude</span>
    </div>
    ${cachedAnalysis?.text
      ? `<p class="ai-tip">${esc(cachedAnalysis.text)}</p>
         <button class="ai-regen-btn" onclick="fetchMonthlyAnalysis('${monthKey}')">${t('btn.regenerate')}</button>`
      : `<p style="font-size:13px;color:var(--lbl2);margin-bottom:10px">${t('dash.ai_desc', {month: monthLabel(mo)})}</p>
         <button class="ai-btn" onclick="fetchMonthlyAnalysis('${monthKey}')">${t('btn.analyze_month')}</button>`}
  </div>` : '';

  const forecastSection   = renderForecastSection(thisRx, mo);
  const calendarSection   = renderCalendarSection(thisRx, mo);
  const topStoresSection  = renderTopStoresSection(thisRx);
  const yearlySection     = renderYearlySection();

  const nudgeBudget = (!state.settings.budget && thisRx.length >= 3 && sameMonth(mo, new Date())) ? `
  <div class="card nudge-card" onclick="gotoTab('s')">
    <div class="nudge-ico">💰</div>
    <div class="nudge-body">
      <div class="nudge-title">${t('dash.nudge_budget')}</div>
      <div class="nudge-sub">${t('dash.nudge_budget_desc')}</div>
    </div>
    <div class="nudge-arr">›</div>
  </div>` : '';

  const nudgeAI = (!state.settings.apiKey && thisRx.length >= 5 && sameMonth(mo, new Date())) ? `
  <div class="card nudge-card" onclick="gotoTab('s')">
    <div class="nudge-ico">✦</div>
    <div class="nudge-body">
      <div class="nudge-title">${t('dash.nudge_ai')}</div>
      <div class="nudge-sub">${t('dash.nudge_ai_desc')}</div>
    </div>
    <div class="nudge-arr">›</div>
  </div>` : '';

  el.innerHTML = `
  <div class="nav brand-nav">
    <div class="brand-row">
      <div class="brand-ico-wrap"><span class="brand-ico">S</span></div>
      <span class="brand-name">slippy</span>
    </div>
    ${streak >= 3 ? `<span class="streak-badge">🔥 ${streak}${t('misc.streak_days')}</span>` : ''}
  </div>
  ${state.receipts.length > 0 ? `<div class="card spend-card">
    <div class="spend-mrow">
      <button onclick="shiftMonth(-1)" ${prevDisabled} aria-label="${t('btn.prev_month')}">‹</button>
      <span>${monthLabel(mo)}</span>
      <button onclick="shiftMonth(1)" ${nextDisabled} aria-label="${t('btn.next_month')}">›</button>
    </div>
    <div class="s-lbl">${t('dash.spending')}</div>
    <div class="s-amt">${fmt(total)}</div>
    ${deltaStr}
    <div class="s-stats">
      <div class="sp"><div class="sp-v">${thisRx.length}</div><div class="sp-l">${t('dash.receipts')}</div></div>
      <div class="sp"><div class="sp-v">${fmt(avg)}</div><div class="sp-l">${t('dash.average')}</div></div>
      <div class="sp"><div class="sp-v">${catRows.length}</div><div class="sp-l">${t('dash.categories')}</div></div>
    </div>
    ${thisRx.length > 0 ? `<button class="spend-share-btn" onclick="shareMonthSummary('${mo.getFullYear()}-${mo.getMonth()}')">
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
      ${t('dash.share')}
    </button>` : ''}
  </div>` : ''}
  ${forecastSection}
  ${weekSection}
  ${calendarSection}
  ${budgetSection}
  ${insightSection}
  ${sparkSection}
  ${yearlySection}
  ${chartSection}
  ${topStoresSection}
  ${emptyMonthState}
  ${aiMonthCard}
  ${nudgeBudget}
  ${nudgeAI}
  ${emptyState}
  <div class="pad-xl"></div>`;

  // Count-up animation on the main spend amount
  animateCount(el.querySelector('.s-amt'), total);

  // Budget ring fill animation
  const fill = el.querySelector('.budget-fill');
  if (fill) {
    const dash = parseFloat(fill.dataset.dash);
    const circ = parseFloat(fill.dataset.circ);
    requestAnimationFrame(() => {
      fill.style.transition = 'stroke-dasharray .9s cubic-bezier(.4,0,.2,1)';
      fill.style.strokeDasharray = `${dash} ${circ}`;
    });
  }
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

  let list = [...state.receipts].sort((a, b) => {
    if (state.sortOrder === 'amt_desc') return (b.totalAmount || 0) - (a.totalAmount || 0);
    if (state.sortOrder === 'amt_asc') return (a.totalAmount || 0) - (b.totalAmount || 0);
    if (state.sortOrder === 'date_asc') return parseDate(a.date || a.createdAt) - parseDate(b.date || b.createdAt);
    return parseDate(b.date || b.createdAt) - parseDate(a.date || a.createdAt);
  });
  if (query) {
    list = list.filter(r => {
      const cat = catById(r.category);
      return (r.storeName || '').toLowerCase().includes(query) ||
        cat.name.toLowerCase().includes(query) ||
        (cat.nameEn || '').toLowerCase().includes(query) ||
        (r.note || '').toLowerCase().includes(query) ||
        (r.items || []).some(it => (it.name || '').toLowerCase().includes(query));
    });
  }
  if (state.filterCat) {
    list = list.filter(r => r.category === state.filterCat);
  }

  // Build store frequency map for recurring badge
  const storeFreq = {};
  state.receipts.forEach(r => {
    const s = r.storeName || t('misc.store');
    storeFreq[s] = (storeFreq[s] || 0) + 1;
  });

  // Category filter chips with counts
  const usedCats = [...new Set(state.receipts.map(r => r.category))];
  const catCounts = {};
  state.receipts.forEach(r => { catCounts[r.category] = (catCounts[r.category] || 0) + 1; });
  const dateStr = t('form.date');
  const sortLabel = { date_desc: '↓ ' + dateStr, date_asc: '↑ ' + dateStr, amt_desc: '↓ ' + currSym(), amt_asc: '↑ ' + currSym() };
  const nextSort  = { date_desc: 'amt_desc', amt_desc: 'amt_asc', amt_asc: 'date_asc', date_asc: 'date_desc' };
  const filterBar = `
  <div class="filter-bar-row">
    <div class="filter-wrap">
      <button class="fchip ${!state.filterCat ? 'on' : ''}" onclick="setFilter(null)">${t('rx.filter_all')} <span class="chip-cnt">${state.receipts.length}</span></button>
      ${usedCats.map(cid => {
        const c = catById(cid);
        const active = state.filterCat === cid;
        return `<button class="fchip ${active ? 'on' : ''}"
          style="${active ? `background:${c.color};border-color:${c.color}` : ''}"
          onclick="setFilter('${cid}')">${c.icon} ${catName(c)} <span class="chip-cnt">${catCounts[cid] || 0}</span></button>`;
      }).join('')}
    </div>
    <button class="sort-btn" onclick="setSort('${nextSort[state.sortOrder] || 'date_desc'}')">${sortLabel[state.sortOrder] || ('↓ ' + dateStr)}</button>
  </div>`;

  const isFiltered = query || state.filterCat;
  const filteredTotal = list.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const countLine = isFiltered && list.length > 0
    ? `<div class="result-count">${t('misc.results', {n: list.length, s: state.settings.lang === 'en' ? (list.length===1?'':'s') : (list.length===1?'o':'i'), amount: fmt(filteredTotal)})}</div>`
    : '';

  let bodyHTML = '';
  if (list.length === 0) {
    bodyHTML = `<div class="empty">
      <div class="empty-ico">${isFiltered ? '🔍' : '🧾'}</div>
      <h3>${isFiltered ? t('rx.empty_filtered') : t('rx.empty')}</h3>
      <p>${isFiltered ? t('rx.empty_filtered_sub') : t('rx.empty_sub')}</p>
    </div>`;
  } else {
    groupByDate(list).forEach(([grp, rows]) => {
      const grpTotal = rows.reduce((s, r) => s + (r.totalAmount || 0), 0);
      bodyHTML += `<div class="sec"><div class="sec-hdr"><span>${esc(grp)}</span><span class="sec-total">${fmt(grpTotal)}</span></div><div class="sec-list">`;
      rows.forEach(r => {
        const cat   = catById(r.category);
        const freq  = storeFreq[r.storeName || t('misc.store')] || 0;
        const badge = freq >= 3 ? `<span class="freq-badge">×${freq}</span>` : '';
        bodyHTML += `
        <div class="rx-wrap">
          <div class="rx-del-btn" onclick="quickDelete('${r.id}')"><span>${t('btn.delete')}</span></div>
          <div class="lrow" data-id="${r.id}" onclick="handleRowTap('${r.id}')">
            ${r.imageDataURL
              ? `<img src="${r.imageDataURL}" class="rx-thumb" alt="${esc(r.storeName || t('misc.store'))}"/>`
              : `<div class="ico-box" style="background:${cat.color}22">${cat.icon}</div>`}
            <div class="ri">
              <div class="rn">${esc(r.storeName || t('misc.store'))}${badge}</div>
              <div class="rs">${r.imageDataURL ? `${cat.icon} ` : ''}${esc(catName(cat))} · ${fmtDate(r.date || r.createdAt)}${r.note ? `<span class="note-pip"> · 📝</span>` : ''}</div>
            </div>
            <div class="ra" style="color:${cat.color}">${fmt(r.totalAmount || 0)}</div>
          </div>
        </div>`;
      });
      bodyHTML += `</div></div>`;
    });
  }

  const thisMonthRx = state.receipts.filter(r => {
    const d = parseDate(r.date || r.createdAt);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const thisMonthTotal = thisMonthRx.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const totalLine = state.receipts.length > 0
    ? `<span class="rx-month-total">${t('misc.this_month', {amount: fmt(thisMonthTotal)})}</span>`
    : '';

  el.innerHTML = `
  <div class="nav" style="display:flex;justify-content:space-between;align-items:baseline">
    <h1>${t('tab.receipts')}</h1>
    ${totalLine}
  </div>
  <div class="search-wrap">
    <svg class="search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    <input class="search-inp" placeholder="${t('rx.search_ph')}"
      value="${esc(state.searchQ)}" oninput="renderReceipts(this.value)"/>
    ${state.searchQ ? `<button class="search-clear" onclick="renderReceipts('')" aria-label="${t('aria.clear_search')}">✕</button>` : ''}
  </div>
  ${usedCats.length > 0 ? filterBar : ''}
  ${countLine}
  ${bodyHTML}
  <div class="pad-xl"></div>`;

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
    onclick="setCategory('${id}','${c.id}')">${c.icon} ${catName(c)}</button>`).join('');

  const itemsHTML = (r.items || []).length > 0 ? `
  <div class="det-sec">
    <h3>${t('detail.products')}</h3>
    <div class="card">
      ${r.items.map(it => `
      <div class="irow">
        <span class="in">${esc(it.name)}</span>
        <span class="ia">${(it.price ?? it.amount) != null ? fmt(it.price ?? it.amount) : '—'}</span>
      </div>`).join('')}
    </div>
  </div>` : '';

  const rawHTML = r.rawText ? `
  <div class="det-sec">
    <h3>OCR</h3>
    <div class="card" style="padding:12px 16px">
      <pre style="font-size:11px;white-space:pre-wrap;color:var(--lbl2);font-family:'Menlo',monospace;line-height:1.5">${esc(r.rawText)}</pre>
    </div>
  </div>` : '';

  const existingTip = state.aiTips[id];
  const tipHTML = existingTip
    ? `<p class="ai-tip">${esc(existingTip)}</p>`
    : `<p style="font-size:13px;color:var(--lbl2);margin-bottom:10px">${t('dash.ai_tip_desc')}</p>
       <button class="ai-btn" onclick="fetchTip('${id}')">${t('btn.get_advice')}</button>`;

  return `
  <div class="nav-row">
    <button class="back-btn" onclick="closeOverlay('odetail')"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg> ${t('btn.back')}</button>
    <h2>${t('overlay.receipt')}</h2>
    <div style="display:flex;gap:6px;align-items:center">
      <button class="back-btn share-btn" onclick="shareReceipt('${id}')" title="${t('dash.share')}">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <polyline points="16 6 12 2 8 6"/>
          <line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
      </button>
      <button class="nav-act" onclick="showEditForm('${id}')">${t('btn.edit')}</button>
    </div>
  </div>
  <div style="padding-bottom:48px">
    <div class="det-hero" style="--cat:${cat.color}">
      <div class="det-hero-top">
        <div class="det-hero-ico">${cat.icon}</div>
        <div>
          <div class="det-hero-store">${esc(r.storeName || t('misc.store'))}</div>
          <div class="det-hero-cat">${esc(catName(cat))}</div>
        </div>
      </div>
      <div class="det-hero-amt">${fmt(r.totalAmount || 0)}</div>
      <div class="det-hero-date">${fmtDate(r.date || r.createdAt)}</div>
      ${r.imageDataURL ? `<div class="det-hero-thumb" onclick="openImage('${id}')">
        <img src="${r.imageDataURL}" style="width:48px;height:48px;object-fit:cover;border-radius:10px;opacity:.85" alt="${esc(t('detail.photo_title'))}"/>
        <span style="font-size:11px;color:rgba(255,255,255,.55);margin-top:4px">${t('detail.view_photo')}</span>
      </div>` : ''}
    </div>
    ${r.note ? `<div class="det-note"><span class="det-note-ico">📝</span>${esc(r.note)}</div>` : ''}
    <div class="det-sec" style="margin-top:14px">
      <h3>${t('detail.category')}</h3>
      <div class="chips">${chipsHTML}</div>
    </div>
    ${itemsHTML}
    <div class="card ai-card" id="tip_${id}">
      <div class="ai-hdr">
        <span style="font-size:16px">✦</span>
        <h3>${t('dash.ai_tip')}</h3>
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
  haptic('medium');
  confirmSheet(t('confirm.delete'), t('btn.delete'), () => {
    haptic('heavy');
    state.receipts = state.receipts.filter(x => x.id !== id);
    delete state.aiTips[id];
    persist();
    persistTips();
    closeOverlay('odetail');
    toast(t('toast.deleted'));
    renderDashboard();
    if (state.tab === 'r') renderReceipts();
    else if (state.tab === 's') renderSettings();
  });
}

// ── RENDER: SETTINGS ─────────────────────────────────────────
function renderSettings() {
  const el    = document.getElementById('vs');
  const count = state.receipts.length;
  const key   = state.settings.apiKey || '';
  const budget = state.settings.budget || 0;
  const curCode = state.settings.currency || 'EUR';
  el.innerHTML = `
  <div class="nav"><h1>${t('tab.settings')}</h1></div>
  <div class="ssel">
    <div class="sshdr">${t('set.language')}</div>
    <div style="display:flex;gap:8px;padding:4px 0 8px">
      <button class="btn ${state.settings.lang === 'it' ? 'btn-p' : 'btn-s'}" style="flex:1;padding:12px;font-size:15px;margin:0" onclick="changeLang('it')">🇮🇹 Italiano</button>
      <button class="btn ${state.settings.lang === 'en' ? 'btn-p' : 'btn-s'}" style="flex:1;padding:12px;font-size:15px;margin:0" onclick="changeLang('en')">🇬🇧 English</button>
    </div>
  </div>
  <div class="ssel">
    <div class="sshdr">${t('set.currency')}</div>
    <div class="cur-grid">
      ${CURRENCIES.map(c => `
        <button class="cur-chip ${c.code === curCode ? 'cur-active' : ''}"
          onclick="saveCurrency('${c.code}')">
          <span class="cur-sym">${c.symbol}</span>
          <span class="cur-code">${c.code}</span>
        </button>`).join('')}
    </div>
    <div class="snote">${t('set.currency_note')}</div>
  </div>
  <div class="ssel">
    <div class="sshdr">${t('set.budget')}</div>
    <div class="srow si-row" style="border-radius:var(--r)">
      <div class="si-ico" style="background:#34C75922">💰</div>
      <span class="slbl">${t('set.budget_lbl', {sym: currSym()})}</span>
      <input class="kinp" id="budgetInp" type="number" min="0" step="10"
        placeholder="0" value="${budget > 0 ? budget : ''}"
        style="text-align:right;font-size:15px;font-family:inherit;color:var(--accent);max-width:90px"/>
    </div>
    <div class="snote">${t('set.budget_note')}</div>
    <button class="btn btn-p" style="margin-top:8px" onclick="saveBudget()">${t('btn.save_budget')}</button>
  </div>
  <div class="ssel">
    <div class="sshdr">${t('set.claude')}</div>
    <div class="srow" style="flex-direction:column;align-items:stretch;gap:10px;padding:14px 16px">
      <input class="kinp" id="apik" type="password"
        placeholder="sk-ant-…" value="${esc(key)}"
        autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"/>
      <div style="display:flex;gap:8px">
        <button class="btn btn-s" id="api-vis-btn" style="flex:1;width:auto;padding:11px;font-size:14px;margin:0"
          onclick="toggleKeyVis()">${t('btn.show')}</button>
        <button class="btn btn-p" style="flex:1;width:auto;padding:11px;font-size:14px;margin:0"
          onclick="saveApiKey()">${t('btn.save')}</button>
      </div>
      ${key ? `<button class="btn btn-d" style="width:auto;padding:10px;font-size:13px;margin:0"
        onclick="removeApiKey()">${t('btn.remove_key')}</button>` : ''}
    </div>
    <div class="snote">${t('set.claude_note')}</div>
  </div>
  <div class="ssel">
    <div class="sshdr">${t('set.ai')}</div>
    <div class="fsec" style="margin:0">
      <div class="frow" style="border-radius:var(--r) var(--r) 0 0">
        <input class="finp" style="text-align:left;flex:1" id="gemini-key"
          type="password" placeholder="${t('set.gemini_ph')}"
          value="${esc(state.settings.geminiKey || '')}"/>
      </div>
      <div class="frow" style="border-radius:0 0 var(--r) var(--r);border-bottom:none;padding-top:10px;padding-bottom:10px">
        <button class="btn btn-p" style="width:auto;flex:1;padding:11px;font-size:14px;margin:0" onclick="saveGeminiKey()">${t('btn.save')}</button>
      </div>
    </div>
    <div class="snote">${t('set.gemini_note')}</div>
  </div>
  <div class="ssel">
    <div class="sshdr">${t('set.data')}</div>
    <div class="srow si-row" style="${count ? 'cursor:pointer' : ''}" onclick="${count ? 'exportCSV()' : ''}">
      <div class="si-ico" style="background:#007AFF22">📤</div>
      <span class="slbl" style="${!count ? 'color:var(--lbl3)' : ''}">${t('set.export')}</span>
      <span class="sval">${t('misc.receipt_count', {n: count, s: state.settings.lang === 'en' ? (count===1?'':'s') : (count===1?'o':'i')})}</span>
    </div>
    <div class="srow si-row" style="cursor:pointer" onclick="importCSV()">
      <div class="si-ico" style="background:#34C75922">📥</div>
      <span class="slbl">${t('set.import')}</span>
      <span class="sval">${t('misc.restore')}</span>
    </div>
    <div class="srow si-row" style="cursor:pointer" onclick="downloadTemplate()">
      <div class="si-ico" style="background:#5856D622">📋</div>
      <span class="slbl">${t('set.template')}</span>
    </div>
    <input type="file" id="csv-import-inp" accept=".csv,text/csv" style="display:none" onchange="handleCSVImport(this)"/>
    <div class="srow si-row" style="${count ? 'cursor:pointer' : ''}" onclick="${count ? 'clearAllData()' : ''}">
      <div class="si-ico" style="background:#FF3B3022">🗑️</div>
      <span class="slbl" style="${!count ? 'color:var(--lbl3)' : 'color:var(--red)'}">${t('set.delete_all')}</span>
    </div>
    <div class="snote">${t('set.data_note')}</div>
  </div>
  <div class="ssel">
    <div class="sshdr">${t('set.info')}</div>
    <div class="srow si-row">
      <div class="si-ico" style="background:#5E5CE622">✦</div>
      <span class="slbl">${t('set.version')}</span>
      <span class="sval">3.0 PWA</span>
    </div>
    <div class="srow si-row">
      <div class="si-ico" style="background:#FF950022">🤖</div>
      <span class="slbl">${t('set.ai_engine')}</span>
      <span class="sval">Gemini 2.0 Flash</span>
    </div>
  </div>
  <div class="settings-brand">
    <div class="settings-brand-ico">S</div>
    <div class="settings-brand-name">slippy</div>
    <div class="settings-brand-tag">${t('set.tagline')}</div>
  </div>
  <div class="pad-xl"></div>`;
}

function saveBudget() {
  const v = Math.max(0, parseFloat(document.getElementById('budgetInp')?.value || '0') || 0);
  state.settings.budget = v;
  saveSettings();
  haptic('medium');
  toast(v > 0 ? t('misc.budget_set', {amount: fmt(v)}) : t('misc.budget_removed'));
  renderSettings();
  renderDashboard();
}

function saveCurrency(code) {
  state.settings.currency = code;
  saveSettings();
  haptic('light');
  toast(t('misc.currency_changed', {sym: CURRENCIES.find(c => c.code === code)?.symbol || code, code}));
  renderSettings();
  renderDashboard();
  if (state.tab === 'r') renderReceipts();
}

function toggleKeyVis() {
  const inp = document.getElementById('apik');
  if (!inp) return;
  const showing = inp.type === 'password';
  inp.type = showing ? 'text' : 'password';
  const btn = document.getElementById('api-vis-btn');
  if (btn) btn.textContent = showing ? t('btn.hide') : t('btn.show');
}
function saveApiKey() {
  const v = (document.getElementById('apik')?.value || '').trim();
  state.settings.apiKey = v;
  saveSettings();
  toast(v ? t('toast.api_saved') : t('toast.api_removed'));
  renderSettings();
}
function removeApiKey() {
  state.settings.apiKey = '';
  saveSettings();
  toast(t('toast.api_removed'));
  renderSettings();
}
function saveGeminiKey() {
  const v = (document.getElementById('gemini-key')?.value || '').trim();
  state.settings.geminiKey = v;
  saveSettings();
  toast(v ? t('toast.gemini_saved') : t('toast.gemini_removed'));
  renderSettings();
}
function csvQ(s) { return `"${String(s || '').replace(/"/g, '""')}"`; }
function downloadCSVBlob(content, filename) {
  const bom = '﻿';
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
function exportCSV() {
  if (!state.receipts.length) return;
  const header = ['ID','Store','Total','Currency','Date','Category','Items','Notes'];
  const rows = [header.join(',')];
  state.receipts.forEach(r => {
    rows.push([
      r.id,
      csvQ(r.storeName),
      (r.totalAmount || 0).toFixed(2),
      state.settings.currency || 'EUR',
      r.date || localDateStr(parseDate(r.createdAt)),
      r.category || 'other',
      csvQ((r.items || []).map(i => { const p = i.price ?? i.amount; return p != null ? `${i.name}:${Number(p).toFixed(2)}` : i.name; }).join('; ')),
      csvQ(r.note || r.notes),
    ].join(','));
  });
  downloadCSVBlob(rows.join('\n'), `slippy-export-${localDateStr()}.csv`);
  toast(t('toast.csv_exported'));
}
function downloadTemplate() {
  const header = ['ID','Store','Total','Currency','Date','Category','Items','Notes'];
  const example = ['', csvQ('Esselunga'), '47.30', 'EUR', localDateStr(), 'groceries', csvQ('Pasta:2.50; Latte:1.20'), csvQ('')];
  const content = [header.join(','), example.join(',')].join('\n');
  downloadCSVBlob(content, 'slippy-template.csv');
  toast(t('toast.template_downloaded'));
}

function importCSV() {
  const inp = document.getElementById('csv-import-inp');
  if (inp) inp.click();
}

function handleCSVImport(input) {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      // Strip BOM if present
      let text = e.target.result;
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) { toast(t('toast.csv_invalid')); return; }
      const header = parseCSVRow(lines[0]).map(h => h.toLowerCase().trim());
      const idIdx    = header.indexOf('id');
      const storeIdx = header.indexOf('store');
      const totalIdx = header.findIndex(h => h.includes('total'));
      const dateIdx  = header.indexOf('date');
      const catIdx   = header.indexOf('category');
      const itemsIdx = header.indexOf('items');
      const notesIdx = header.indexOf('notes');
      if (storeIdx < 0 || totalIdx < 0) { toast(t('toast.csv_format')); return; }

      const validCatIds = new Set(CATS.map(c => c.id));
      const existing = new Set(state.receipts.map(r => r.id));
      let added = 0;
      lines.slice(1).forEach(line => {
        const cols  = parseCSVRow(line);
        const id    = (idIdx >= 0 && cols[idIdx]) ? cols[idIdx] : uid();
        if (existing.has(id)) return;
        const store = cols[storeIdx] || t('misc.store');
        const total = parseFloat((cols[totalIdx] || '0').replace(',', '.')) || 0;
        if (!(total > 0)) return;
        const rawDate = dateIdx >= 0 ? (cols[dateIdx] || '').trim() : '';
        const dm = rawDate.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
        const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate
          : dm ? `${dm[3]}-${dm[2].padStart(2,'0')}-${dm[1].padStart(2,'0')}`
          : localDateStr();
        const rawCat = catIdx >= 0 ? (cols[catIdx] || '').toLowerCase().trim() : '';
        const category = validCatIds.has(rawCat) ? rawCat : 'other';
        const itemsRaw = itemsIdx >= 0 ? (cols[itemsIdx] || '') : '';
        const items = itemsRaw
          ? itemsRaw.split(';').map(s => s.trim()).filter(Boolean).map(s => {
              const ci = s.lastIndexOf(':');
              if (ci < 0) return { name: s.trim() };
              const p = parseFloat(s.slice(ci + 1).trim());
              return { name: s.slice(0, ci).trim(), price: isNaN(p) ? undefined : p };
            })
          : [];
        const note = notesIdx >= 0 ? (cols[notesIdx] || '') : '';
        existing.add(id);
        state.receipts.push({ id, storeName: store, totalAmount: total, date, category, items, note: note || undefined, createdAt: new Date().toISOString() });
        added++;
      });

      if (added > 0) {
        persist();
        renderDashboard();
        renderReceipts();
        renderSettings();
        const s = state.settings.lang === 'en' ? (added===1?'':'s') : (added===1?'o':'i');
        toast(t('misc.import_ok', {n: added, s}));
      } else {
        toast(t('toast.csv_none'));
      }
    } catch(_) { toast(t('toast.csv_error')); }
    input.value = '';
  };
  reader.readAsText(file, 'UTF-8');
}

function parseCSVRow(line) {
  const cols = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ && ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
    else if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { cols.push(cur); cur = ''; }
    else { cur += ch; }
  }
  cols.push(cur);
  return cols;
}

function clearAllData() {
  haptic('medium');
  confirmSheet(t('confirm.delete_all', {n: state.receipts.length}), t('btn.delete'), () => {
    haptic('heavy');
    state.receipts        = [];
    state.aiTips          = {};
    state.monthlyAnalysis = {};
    persist();
    localStorage.removeItem('slippy_tips');
    localStorage.removeItem('slippy_analysis');
    toast(t('toast.data_deleted'));
    renderDashboard();
    renderReceipts();
    renderSettings();
  });
}

// ── CLAUDE API ────────────────────────────────────────────────
async function fetchTip(receiptId) {
  const r   = state.receipts.find(x => x.id === receiptId);
  const key = state.settings.apiKey;
  const tipEl = document.getElementById('tip_' + receiptId);
  if (!r) return;

  if (!key) {
    toast(t('toast.need_claude_key'));
    return;
  }

  if (tipEl) tipEl.innerHTML = `
    <div class="ai-hdr"><span style="font-size:16px">✦</span><h3>${t('dash.ai_tip')}</h3><span class="ai-badge">Claude</span></div>
    <div class="spin" style="width:26px;height:26px;margin:10px auto;border-width:3px"></div>`;

  try {
    const cat    = catById(r.category);
    const itemsLine = r.items?.length > 0
      ? ` ${isEn ? 'Products' : 'Prodotti'}: ${r.items.slice(0,5).map(i=>i.name).join(', ')}.`
      : '';
    const isEn = state.settings.lang === 'en';
    const prompt = isEn
      ? `You are a financial advisor. I spent ${fmt(r.totalAmount || 0)} at "${r.storeName || 'a store'}" (category: ${catName(cat)}).${itemsLine} Give me 1 short practical tip in max 2 sentences. Be friendly.`
      : `Sei un consulente finanziario. Ho speso ${fmt(r.totalAmount || 0)} da "${r.storeName || 'un negozio'}" (categoria: ${catName(cat)}).${itemsLine} Dammi 1 consiglio pratico e specifico in italiano in massimo 2 frasi. Sii amichevole.`;

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
    const tip  = data.content?.[0]?.text?.trim() || t('toast.no_advice');
    state.aiTips[receiptId] = tip;
    persistTips();

    if (tipEl) tipEl.innerHTML = `
      <div class="ai-hdr"><span style="font-size:16px">✦</span><h3>${t('dash.ai_tip')}</h3><span class="ai-badge">Claude</span></div>
      <p class="ai-tip">${esc(tip)}</p>`;
  } catch (err) {
    const msg = err.message || t('toast.ai_error');
    if (tipEl) tipEl.innerHTML = `
      <div class="ai-hdr"><span style="font-size:16px">✦</span><h3>${t('dash.ai_tip')}</h3><span class="ai-badge">Claude</span></div>
      <p style="font-size:13px;color:var(--red);margin-bottom:8px">${esc(msg)}</p>
      <button class="ai-btn" onclick="fetchTip('${receiptId}')">${t('btn.retry')}</button>`;
  }
}

// ── INIT ──────────────────────────────────────────────────────
function init() {
  loadStorage();

  document.getElementById('filein').addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const url = await fileToDataURL(file);
      state.pendingPhoto = url;
      const prev = document.getElementById('photo-preview');
      const wrap = document.getElementById('photo-preview-wrap');
      const ph = document.getElementById('photo-placeholder');
      if (prev) prev.src = url;
      if (wrap) wrap.style.display = 'block';
      if (ph) ph.style.display = 'none';
    } catch (_) { toast(t('toast.photo_error')); }
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

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (document.getElementById('sht')?.classList.contains('on')) { closeSheet(); }
      else {
        const overlays = ['oscanner','odetail'];
        const open = overlays.find(id => document.getElementById(id)?.classList.contains('on'));
        if (open) closeOverlay(open);
      }
    }
  });

  // Apply saved language to tab labels and FAB
  const _r = document.getElementById('tab-lbl-r');
  const _s = document.getElementById('tab-lbl-s');
  if (_r) _r.textContent = t('tab.receipts');
  if (_s) _s.textContent = t('tab.settings');
  const _fab = document.getElementById('fab');
  if (_fab) _fab.setAttribute('aria-label', t('aria.fab'));
  document.documentElement.lang = (state.settings.lang || 'it') === 'en' ? 'en' : 'it';

  renderDashboard();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);
