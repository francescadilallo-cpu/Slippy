// ============================================================
// SLIPPY PWA — app.js
// ============================================================

// ── CATEGORIES ───────────────────────────────────────────────
const CATS = [
  { id:'groceries',   name:'Groceries',   icon:'🛒', color:'#30D158',
    kw:['supermercato','esselunga','carrefour','coop','lidl','aldi','pam','despar','conad','sigma','bennet','sma','grocery','market'] },
  { id:'restaurants', name:'Restaurants', icon:'🍽️', color:'#FF9500',
    kw:['ristorante','trattoria','osteria','pizzeria','bar ','caffè','café','restaurant','bistro','mcdonald','burger','kebab','sushi'] },
  { id:'pharmacy',    name:'Pharmacy',    icon:'💊', color:'#FF3B30',
    kw:['farmacia','pharmacy','parafarmacia','medical','salute','sanitá'] },
  { id:'fuel',        name:'Fuel',        icon:'⛽', color:'#FF6B00',
    kw:['eni','agip','q8','ip ','shell','tamoil','total','benzina','carburante','fuel','petrol'] },
  { id:'shopping',    name:'Shopping',    icon:'🛍️', color:'#007AFF',
    kw:['amazon','zalando','h&m','zara','ikea','obi','leroy','bricofer','brico','shopping'] },
  { id:'clothing',    name:'Clothing',    icon:'👗', color:'#AF52DE',
    kw:['abbigliamento','moda','clothing','fashion','boutique','sartoria','calzature'] },
  { id:'electronics', name:'Electronics', icon:'📱', color:'#5856D6',
    kw:['mediaworld','euronics','unieuro','apple','fnac','trony','electronics','informatica','tech'] },
  { id:'other',       name:'Other',       icon:'📁', color:'#8E8E93', kw:[] },
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
    if      (d.toDateString() === todayStr)     g = 'Today';
    else if (d.toDateString() === yesterdayStr) g = 'Yesterday';
    else if (now - d < 7 * 86400000)            g = 'This Week';
    else if (sameMonth(d, now))                 g = 'This Month';
    else {
      g = d.toLocaleDateString('it-IT', { month:'long', year:'numeric' });
      g = g[0].toUpperCase() + g.slice(1);
    }
    if (!groups[g]) { groups[g] = []; order.push(g); }
    groups[g].push(r);
  });
  return order.map(k => [k, groups[k]]);
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

// ── CATEGORIZE ────────────────────────────────────────────────
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
  for (const l of lines.slice(0, 6)) {
    const t = l.trim();
    if (t.length > 2 && !/^\d/.test(t) &&
        !/SCONTRINO|RICEVUTA|FISCALE|CODICE|P\.IVA|C\.F\.|VAT|TEL|FAX|\*/i.test(t)) {
      return t;
    }
  }
  return 'Store';
}

function extractTotal(lines) {
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i];
    if (/TOTALE|TOTAL(?!\s*IVA)|TOT\b/i.test(l)) {
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
        const name = l.replace(m[0], '').trim().replace(/\s{2,}/g, ' ');
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
      if (m.status === 'recognizing text') {
        const pct = Math.round((m.progress || 0) * 100);
        const pe = document.querySelector('.prog-pct');
        const pb = document.querySelector('.prog-bar');
        if (pe) pe.textContent = pct + '%';
        if (pb) pb.style.width  = pct + '%';
      }
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
    <h2>Scanning</h2><div style="min-width:56px"></div>
  </div>
  <div class="processing">
    <div class="spin"></div>
    <p style="font-size:16px;font-weight:600;color:var(--lbl)">Reading receipt…</p>
    <div style="width:100%;max-width:260px;height:4px;background:var(--fill2);border-radius:2px;overflow:hidden;margin-top:2px">
      <div class="prog-bar" style="height:100%;background:var(--accent);border-radius:2px;transition:width .3s;width:${pct}%"></div>
    </div>
    <span class="prog-pct" style="font-size:13px;color:var(--lbl2)">${pct}%</span>
  </div>`;
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
      <input class="finp" style="text-align:left;flex:1" placeholder="Item name"
             value="${esc(it.name)}" id="itn${i}"/>
      <input class="finp" style="width:72px;text-align:right" type="number" step="0.01"
             value="${it.amount.toFixed(2)}" id="ita${i}"/>
    </div>`).join('');

  overlay.innerHTML = `
  <div class="nav-row">
    <button class="back-btn" onclick="closeOverlay('oscanner')">‹ Back</button>
    <h2>Confirm</h2>
    <button class="nav-act" onclick="saveReceiptFromForm()">Save</button>
  </div>
  <div style="padding-bottom:40px">
    ${imgURL ? `<img src="${imgURL}" class="img-thumb" style="margin:12px auto"/>` : ''}
    <div class="fsec">
      <div class="fhdr">Store</div>
      <div class="frow" style="border-radius:var(--r)">
        <input class="finp" style="text-align:left;flex:1" id="fn" value="${esc(parsed.storeName)}" placeholder="Store name"/>
      </div>
    </div>
    <div class="fsec">
      <div class="fhdr">Total</div>
      <div class="frow" style="border-radius:var(--r)">
        <span class="flbl">€</span>
        <input class="finp" id="ft" type="number" step="0.01" value="${parsed.total.toFixed(2)}" placeholder="0.00"/>
      </div>
    </div>
    <div class="fsec">
      <div class="fhdr">Date</div>
      <div class="frow" style="border-radius:var(--r)">
        <input class="finp" id="fd" type="date" value="${parsed.date}"/>
      </div>
    </div>
    <div class="fsec">
      <div class="fhdr">Category</div>
      <div class="frow" style="border-radius:var(--r)">
        <select class="finp" id="fc">${catsOpt}</select>
      </div>
    </div>
    ${parsed.items.length > 0 ? `
    <div class="fsec">
      <div class="fhdr">Detected Items</div>
      ${itemsRows}
    </div>` : ''}
    <div class="pad"></div>
    <button class="btn btn-p" onclick="saveReceiptFromForm()">Save Receipt</button>
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
  const name  = (document.getElementById('fn')?.value || '').trim() || 'Store';
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
  toast('Receipt saved!');
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
  <div style="padding:4px 16px 16px">
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
    </div>
    <p style="font-size:12px;color:var(--lbl2);margin-top:12px;line-height:1.6;text-align:center">
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
    <h2>Add Receipt</h2><div style="min-width:56px"></div>
  </div>
  <div class="scan-pick">
    <div class="scan-pick-ico">🧾</div>
    <div class="scan-btns">
      <button class="btn btn-p" onclick="triggerCapture(true)">Use Camera</button>
      <button class="btn btn-s" onclick="triggerCapture(false)">Choose from Library</button>
    </div>
    <p style="font-size:13px;color:var(--lbl2);margin-top:8px;line-height:1.6;text-align:center">
      OCR runs in-browser — no upload, fully private.
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

  return `
  <div class="card week-wrap">
    <div class="week-lbl">Questa settimana</div>
    <div class="week-body">
      <div class="week-amt">${fmt(thisT)}</div>
      ${diff !== null ? `<div class="week-delta" style="color:${dc}">${diff > 0 ? '↑' : '↓'} ${Math.abs(diff).toFixed(0)}%</div>` : ''}
    </div>
    <div class="week-sub">${thisW.length} scontrin${thisW.length===1?'o':'i'} · ${lastT > 0 ? (diff > 0 ? 'più della sett. scorsa' : 'meno della sett. scorsa') : 'prima settimana tracciata'}</div>
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
    <div class="pad"></div>
    <button class="btn btn-p" onclick="saveReceiptEdit('${id}')">Salva Modifiche</button>
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
  const W = 280, H = 70, pad = 4;
  const max = Math.max(...data.map(d => d.total), 1);
  const barW = Math.floor((W - pad * (data.length + 1)) / data.length);
  let bars = '';
  let labels = '';
  data.forEach((d, i) => {
    const x = pad + i * (barW + pad);
    const barH = Math.max(4, Math.round((d.total / max) * (H - 20)));
    const y = H - 16 - barH;
    const color = d.isCurrent ? 'var(--accent)' : 'var(--fill2)';
    bars += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="3" fill="${color}"/>`;
    labels += `<text x="${x + barW / 2}" y="${H - 2}" text-anchor="middle" font-size="9" fill="var(--lbl2)" font-family="-apple-system,sans-serif">${d.label}</text>`;
  });
  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${bars}${labels}</svg>`;
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
    thisRx.forEach(r => { const s = r.storeName || 'Store'; storeCounts[s] = (storeCounts[s] || 0) + 1; });
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
  const pct = Math.min(100, Math.round(spent / budget * 100));
  const remaining = budget - spent;
  const overBudget = spent > budget;
  const barColor = pct < 70 ? 'var(--green)' : pct < 90 ? 'var(--orange)' : 'var(--red)';
  const remainText = overBudget
    ? `<span style="color:var(--red);font-weight:700">Over budget</span>`
    : `${fmt(remaining)} rimanenti`;

  return `
  <div class="card budget-wrap">
    <div class="budget-top">
      <div>
        <div class="budget-lbl">Budget Mensile</div>
        <div class="budget-remain">${remainText}</div>
      </div>
      <div class="budget-pct" style="color:${barColor}">${pct}%</div>
    </div>
    <div class="budget-track">
      <div class="budget-fill" style="width:${pct}%;background:${barColor}"></div>
    </div>
    <div class="budget-sub">
      <span>${fmt(spent)} spesi</span>
      <span>su ${fmt(budget)}</span>
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
    <div class="insight-hdr">Smart Insights</div>
    ${rows}
  </div>`;
}

// ── RENDER: SPARKLINE SECTION ─────────────────────────────────
function renderSparkSection(data) {
  const hasData = data.some(d => d.total > 0);
  if (!hasData) return '';
  return `
  <div class="card spark-wrap">
    <div class="spark-hdr">
      <span class="spark-title">Ultimi 6 Mesi</span>
    </div>
    ${sparklineSVG(data)}
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
    <div class="chart-title">By Category</div>
    ${catRows.map(({ cat, amt }) => `
    <div class="brow">
      <span class="bico">${cat.icon}</span>
      <span class="bnm">${cat.name}</span>
      <div class="btrk"><div class="bfll" style="width:${(amt / maxAmt * 100).toFixed(1)}%;background:${cat.color}"></div></div>
      <span class="bval">${fmt(amt)}</span>
    </div>`).join('')}
  </div>` : '';

  const emptyState = state.receipts.length === 0 ? `
  <div class="empty" style="margin-top:20px">
    <div class="empty-ico">🧾</div>
    <h3>No receipts yet</h3>
    <p>Tap <strong>＋</strong> to scan your first receipt and start tracking your spending.</p>
  </div>` : '';

  const weekSection    = renderWeekSection(state.receipts);
  const budgetSection  = renderBudgetSection(total, state.settings.budget || 0);
  const insights       = calcInsights(thisRx, prevRx, mo);
  const insightSection = renderInsightsSection(insights);
  const sparkData      = getMonthlyTotals(6);
  const sparkSection   = renderSparkSection(sparkData);

  el.innerHTML = `
  <div class="nav"><h1>Dashboard</h1></div>
  <div class="mpick">
    <button onclick="shiftMonth(-1)" ${prevDisabled}>‹</button>
    <span>${monthLabel(mo)}</span>
    <button onclick="shiftMonth(1)" ${nextDisabled}>›</button>
  </div>
  <div class="card spend-card">
    <div class="s-lbl">Questo mese</div>
    <div class="s-amt">${fmt(total)}</div>
    ${deltaStr}
    <div class="s-stats">
      <div class="sp"><div class="sp-v">${thisRx.length}</div><div class="sp-l">Scontrini</div></div>
      <div class="sp"><div class="sp-v">${fmt(avg)}</div><div class="sp-l">Media</div></div>
      <div class="sp"><div class="sp-v">${catRows.length}</div><div class="sp-l">Categorie</div></div>
    </div>
  </div>
  ${weekSection}
  ${budgetSection}
  ${insightSection}
  ${sparkSection}
  ${chartSection}
  ${emptyState}
  <div class="pad"></div>`;
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
      catById(r.category).name.toLowerCase().includes(query)
    );
  }
  if (state.filterCat) {
    list = list.filter(r => r.category === state.filterCat);
  }

  // Build store frequency map for recurring badge
  const storeFreq = {};
  state.receipts.forEach(r => {
    const s = r.storeName || 'Store';
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
  const countLine = isFiltered && list.length > 0
    ? `<div class="result-count">${list.length} risultat${list.length===1?'o':'i'}</div>`
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
        const freq  = storeFreq[r.storeName || 'Store'] || 0;
        const badge = freq >= 3 ? `<span class="freq-badge">×${freq}</span>` : '';
        bodyHTML += `
        <div class="rx-wrap">
          <div class="rx-del-btn" onclick="quickDelete('${r.id}')"><span>Elimina</span></div>
          <div class="lrow" data-id="${r.id}" onclick="handleRowTap('${r.id}')">
            <div class="ico-box" style="background:${cat.color}22">${cat.icon}</div>
            <div class="ri">
              <div class="rn">${esc(r.storeName || 'Store')}${badge}</div>
              <div class="rs">${esc(cat.name)} · ${fmtDate(r.date || r.createdAt)}</div>
            </div>
            <div class="ra">${fmt(r.totalAmount || 0)}</div>
          </div>
        </div>`;
      });
      bodyHTML += `</div></div>`;
    });
  }

  el.innerHTML = `
  <div class="nav"><h1>Scontrini</h1></div>
  <div class="search-wrap">
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

  const chipsHTML = CATS.map(c => `
  <button class="chip ${c.id === r.category ? 'sel' : ''}"
    style="${c.id === r.category ? 'background:' + c.color + ';' : ''}"
    onclick="setCategory('${id}','${c.id}')">${c.icon} ${c.name}</button>`).join('');

  const itemsHTML = (r.items || []).length > 0 ? `
  <div class="det-sec">
    <h3>Items</h3>
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
    <h3>Raw OCR Text</h3>
    <div class="card" style="padding:12px 16px">
      <pre style="font-size:11px;white-space:pre-wrap;color:var(--lbl2);font-family:'Menlo',monospace;line-height:1.5">${esc(r.rawText)}</pre>
    </div>
  </div>` : '';

  const existingTip = state.aiTips[id];
  const tipHTML = existingTip
    ? `<p class="ai-tip">${esc(existingTip)}</p>`
    : `<p style="font-size:13px;color:var(--lbl2);margin-bottom:10px">Get a personalized saving tip for this receipt.</p>
       <button class="ai-btn" onclick="fetchTip('${id}')">Get tip</button>`;

  return `
  <div class="nav-row">
    <button class="back-btn" onclick="closeOverlay('odetail')">‹ Indietro</button>
    <h2>Scontrino</h2>
    <button class="nav-act" onclick="showEditForm('${id}')">Modifica</button>
  </div>
  <div style="padding-bottom:48px">
    ${r.imageDataURL ? `<img src="${r.imageDataURL}" class="img-thumb" style="margin:12px auto"/>` : ''}
    <div class="card det-hdr">
      <div class="det-store">${esc(r.storeName || 'Store')}</div>
      <div class="det-date">${fmtDate(r.date || r.createdAt)}</div>
      <div class="det-total">${fmt(r.totalAmount || 0)}</div>
    </div>
    <div class="det-sec" style="margin-top:14px">
      <h3>Category</h3>
      <div class="chips">${chipsHTML}</div>
    </div>
    ${itemsHTML}
    <div class="card ai-card" id="tip_${id}">
      <div class="ai-hdr">
        <span style="font-size:16px">✦</span>
        <h3>AI Saving Tip</h3>
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
  if (!confirm('Delete this receipt? This cannot be undone.')) return;
  state.receipts = state.receipts.filter(x => x.id !== id);
  persist();
  closeOverlay('odetail');
  toast('Receipt deleted');
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
  <div class="nav"><h1>Settings</h1></div>
  <div class="ssel">
    <div class="sshdr">Budget Mensile</div>
    <div class="srow" style="border-radius:var(--r)">
      <span class="slbl">€ Budget</span>
      <input class="kinp" id="budgetInp" type="number" min="0" step="10"
        placeholder="0" value="${budget > 0 ? budget : ''}"
        style="text-align:right;font-size:15px;font-family:inherit;color:var(--accent)"/>
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
          onclick="toggleKeyVis()">Show / Hide</button>
        <button class="btn btn-p" style="flex:1;width:auto;padding:11px;font-size:14px;margin:0"
          onclick="saveApiKey()">Save</button>
      </div>
      ${key ? `<button class="btn btn-d" style="width:auto;padding:10px;font-size:13px;margin:0"
        onclick="removeApiKey()">Remove Key</button>` : ''}
    </div>
    <div class="snote">Stored in localStorage. Get yours at console.anthropic.com.</div>
  </div>
  <div class="ssel">
    <div class="sshdr">Data</div>
    <button class="btn btn-s" style="margin-bottom:10px" onclick="exportCSV()" ${!count ? 'disabled' : ''}>
      Export to CSV
    </button>
    <button class="btn btn-d" onclick="clearAllData()" ${!count ? 'disabled' : ''}>
      Clear All Data
    </button>
    <div class="snote">${count} receipt${count === 1 ? '' : 's'} stored locally.</div>
  </div>
  <div class="ssel">
    <div class="sshdr">About</div>
    <div class="srow"><span class="slbl">Version</span><span class="sval">1.1 PWA</span></div>
    <div class="srow"><span class="slbl">OCR Engine</span><span class="sval">Tesseract.js 5</span></div>
    <div class="srow"><span class="slbl">AI Model</span><span class="sval">Claude Sonnet</span></div>
    <div class="srow"><span class="slbl">Languages</span><span class="sval">Italian · English</span></div>
    <div class="snote" style="text-align:center;padding:16px 4px;color:var(--lbl3)">
      Snap your slip. Know your spending.
    </div>
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
  toast(v ? 'API key saved ✓' : 'API key cleared');
  renderSettings();
}
function removeApiKey() {
  state.settings.apiKey = '';
  saveSettings();
  toast('API key removed');
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
  toast('CSV exported!');
}
function clearAllData() {
  if (!confirm(`Delete all ${state.receipts.length} receipts? This cannot be undone.`)) return;
  state.receipts = [];
  state.aiTips   = {};
  persist();
  toast('All data cleared');
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
    toast('Add your Claude API key in Settings first');
    return;
  }

  if (tipEl) tipEl.innerHTML = `
    <div class="ai-hdr"><span style="font-size:16px">✦</span><h3>AI Saving Tip</h3><span class="ai-badge">Claude</span></div>
    <div class="spin" style="width:26px;height:26px;margin:10px auto;border-width:3px"></div>`;

  try {
    const cat    = catById(r.category);
    const prompt = `I spent ${fmt(r.totalAmount || 0)} at "${r.storeName || 'a store'}" (${cat.name}). Give me 1 practical, actionable saving tip in 2 sentences max. Be specific and friendly.`;

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
    const tip  = data.content?.[0]?.text?.trim() || 'No tip available.';
    state.aiTips[receiptId] = tip;

    if (tipEl) tipEl.innerHTML = `
      <div class="ai-hdr"><span style="font-size:16px">✦</span><h3>AI Saving Tip</h3><span class="ai-badge">Claude</span></div>
      <p class="ai-tip">${esc(tip)}</p>`;
  } catch (err) {
    const msg = err.message || 'Failed to fetch tip';
    if (tipEl) tipEl.innerHTML = `
      <div class="ai-hdr"><span style="font-size:16px">✦</span><h3>AI Saving Tip</h3><span class="ai-badge">Claude</span></div>
      <p style="font-size:13px;color:var(--red);margin-bottom:8px">${esc(msg)}</p>
      <button class="ai-btn" onclick="fetchTip('${receiptId}')">Retry</button>`;
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
        <h3>OCR Failed</h3>
        <p>${esc(err.message || 'Could not read the image.')}</p>
        <button class="btn btn-s" style="width:200px;margin-top:8px"
          onclick="closeOverlay('oscanner');openScanner()">Try Again</button>
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
