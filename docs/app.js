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
  settings: { apiKey: '' },
  learned: {},
  ocrData: null,
  detailId: null,
  searchQ: '',
  aiTips: {},
};

// ── STORAGE ───────────────────────────────────────────────────
function persist() {
  try { localStorage.setItem('slippy_receipts', JSON.stringify(state.receipts)); } catch(_) {}
}
function loadStorage() {
  try {
    state.receipts = JSON.parse(localStorage.getItem('slippy_receipts') || '[]');
    state.settings = JSON.parse(localStorage.getItem('slippy_settings') || '{"apiKey":""}');
    state.learned  = JSON.parse(localStorage.getItem('slippy_learned')  || '{}');
  } catch(_) {
    state.receipts = []; state.settings = { apiKey:'' }; state.learned = {};
  }
}
function saveSettings() { localStorage.setItem('slippy_settings', JSON.stringify(state.settings)); }
function saveLearned()  { localStorage.setItem('slippy_learned',  JSON.stringify(state.learned));  }

// ── HELPERS ───────────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function fmt(n) { return '€ ' + Number(n || 0).toFixed(2).replace('.', ','); }
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
  const overlay = document.getElementById('oscanner');
  const imgURL  = await fileToDataURL(file);

  overlay.innerHTML = processingScreenHTML(0);

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
    <h2>Scanning</h2><div style="width:48px"></div>
  </div>
  <div class="processing">
    <div class="spin"></div>
    <p style="font-size:17px;font-weight:600">Reading receipt…</p>
    <div style="width:100%;max-width:280px;height:6px;background:var(--fill);border-radius:3px;overflow:hidden;margin-top:4px">
      <div class="prog-bar" style="height:100%;background:var(--blue);border-radius:3px;transition:width .3s;width:${pct}%"></div>
    </div>
    <span class="prog-pct" style="font-size:14px;color:var(--gray)">${pct}%</span>
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
    <button class="back-btn" onclick="renderScannerPicker()">‹</button>
    <h2>Confirm Receipt</h2>
    <button class="nav-act" onclick="saveReceiptFromForm()">Save</button>
  </div>
  <div style="padding-bottom:40px">
    ${imgURL ? `<img src="${imgURL}" class="img-thumb" style="margin:12px auto"/>` : ''}
    <div class="fsec">
      <div class="fhdr">Store</div>
      <div class="frow" style="border-radius:14px">
        <input class="finp" style="text-align:left;flex:1" id="fn" value="${esc(parsed.storeName)}" placeholder="Store name"/>
      </div>
    </div>
    <div class="fsec">
      <div class="fhdr">Total</div>
      <div class="frow" style="border-radius:14px">
        <span class="flbl">€</span>
        <input class="finp" id="ft" type="number" step="0.01" value="${parsed.total.toFixed(2)}" placeholder="0.00"/>
      </div>
    </div>
    <div class="fsec">
      <div class="fhdr">Date</div>
      <div class="frow" style="border-radius:14px">
        <input class="finp" id="fd" type="date" value="${parsed.date}"/>
      </div>
    </div>
    <div class="fsec">
      <div class="fhdr">Category</div>
      <div class="frow" style="border-radius:14px">
        <select class="finp" id="fc">${catsOpt}</select>
      </div>
    </div>
    ${parsed.items.length > 0 ? `
    <div class="fsec">
      <div class="fhdr">Detected Items</div>
      ${itemsRows}
    </div>` : ''}
    <div class="pad"></div>
    <button class="btn btn-p" onclick="saveReceiptFromForm()">💾  Save Receipt</button>
    <div class="pad"></div>
  </div>`;
}

function saveReceiptFromForm() {
  const name  = (document.getElementById('fn')?.value || '').trim() || 'Store';
  const total = parseFloat(document.getElementById('ft')?.value || '0') || 0;
  const date  = document.getElementById('fd')?.value || new Date().toISOString().split('T')[0];
  const catId = document.getElementById('fc')?.value || 'other';

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

  closeOverlay('oscanner');
  toast('Receipt saved!');
  renderDashboard();
  if (state.tab === 'r') renderReceipts();
}

// ── NAVIGATION ────────────────────────────────────────────────
function gotoTab(t) {
  state.tab = t;
  const ids = ['d', 'r', 's'];
  ids.forEach(id => document.getElementById('v' + id).classList.toggle('on', id === t));
  document.querySelectorAll('.tab').forEach((el, i) => el.classList.toggle('on', ids[i] === t));
  if (t === 'd') renderDashboard();
  if (t === 'r') renderReceipts();
  if (t === 's') renderSettings();
}

function openScanner() {
  document.getElementById('oscanner').classList.add('on');
  renderScannerPicker();
}

function openDetail(id) {
  state.detailId = id;
  document.getElementById('odetail').classList.add('on');
  renderReceiptDetail(id);
}

function closeOverlay(id) {
  const el = document.getElementById(id);
  el.classList.remove('on');
  el.innerHTML = '';
  if (id === 'oscanner') state.ocrData = null;
}

// ── RENDER: SCANNER PICKER ────────────────────────────────────
function renderScannerPicker() {
  document.getElementById('oscanner').innerHTML = `
  <div class="nav-row">
    <button class="back-btn" onclick="closeOverlay('oscanner')">✕</button>
    <h2>Add Receipt</h2><div style="width:48px"></div>
  </div>
  <div class="scan-pick">
    <div class="scan-pick-ico">🧾</div>
    <div class="scan-btns">
      <button class="btn btn-p" onclick="triggerCapture(true)">📷  Use Camera</button>
      <button class="btn btn-s" onclick="triggerCapture(false)">🖼️  Choose from Library</button>
    </div>
    <p style="font-size:13px;color:var(--gray);margin-top:12px;line-height:1.6;text-align:center">
      Point your camera at a receipt or pick a photo from your library.<br>
      OCR runs in-browser via Tesseract.js.
    </p>
  </div>`;
}

function triggerCapture(camera) {
  const fi = document.getElementById('filein');
  if (camera) fi.setAttribute('capture', 'environment');
  else        fi.removeAttribute('capture');
  fi.click();
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
    ? `<div class="s-delta" style="color:${deltaColor}">${delta <= 0 ? '↓' : '↑'} ${Math.abs(delta).toFixed(0)}% vs last month</div>`
    : `<div class="s-delta" style="color:var(--gray)">First month tracked</div>`;

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

  el.innerHTML = `
  <div class="nav"><h1>Dashboard</h1></div>
  <div class="mpick">
    <button onclick="shiftMonth(-1)" ${prevDisabled}>‹</button>
    <span>${monthLabel(mo)}</span>
    <button onclick="shiftMonth(1)" ${nextDisabled}>›</button>
  </div>
  <div class="card spend-card">
    <div class="s-lbl">SPENT THIS MONTH</div>
    <div class="s-amt">${fmt(total)}</div>
    ${deltaStr}
    <div class="s-stats">
      <div class="sp"><div class="sp-v">${thisRx.length}</div><div class="sp-l">Receipts</div></div>
      <div class="sp"><div class="sp-v">${fmt(avg)}</div><div class="sp-l">Average</div></div>
      <div class="sp"><div class="sp-v">${catRows.length}</div><div class="sp-l">Categories</div></div>
    </div>
  </div>
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

  let bodyHTML = '';
  if (list.length === 0) {
    bodyHTML = `<div class="empty">
      <div class="empty-ico">${query ? '🔍' : '🧾'}</div>
      <h3>${query ? 'No results' : 'No receipts'}</h3>
      <p>${query ? `Nothing matches "${esc(state.searchQ)}"` : 'Tap + to add your first receipt.'}</p>
    </div>`;
  } else {
    groupByDate(list).forEach(([grp, rows]) => {
      bodyHTML += `<div class="sec"><div class="sec-hdr">${esc(grp)}</div>`;
      rows.forEach(r => {
        const cat = catById(r.category);
        bodyHTML += `
        <div class="lrow" onclick="openDetail('${r.id}')">
          <div class="ico-box" style="background:${cat.color}22">${cat.icon}</div>
          <div class="ri">
            <div class="rn">${esc(r.storeName || 'Store')}</div>
            <div class="rs">${esc(cat.name)} · ${fmtDate(r.date || r.createdAt)}</div>
          </div>
          <div class="ra">${fmt(r.totalAmount || 0)}</div>
        </div>`;
      });
      bodyHTML += `</div>`;
    });
  }

  el.innerHTML = `
  <div class="nav"><h1>Receipts</h1></div>
  <div class="search-wrap">
    <input class="search-inp" placeholder="🔍  Search receipts…"
      value="${esc(state.searchQ)}" oninput="renderReceipts(this.value)"/>
  </div>
  ${bodyHTML}
  <div class="pad"></div>`;
}

// ── RENDER: RECEIPT DETAIL ────────────────────────────────────
function renderReceiptDetail(id) {
  const r = state.receipts.find(x => x.id === id);
  if (!r) { closeOverlay('odetail'); return; }
  const overlay = document.getElementById('odetail');

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
    : `<p style="font-size:13px;color:var(--gray);margin-bottom:10px">Get a personalized saving tip for this receipt.</p>
       <button class="ai-btn" onclick="fetchTip('${id}')">Get tip →</button>`;

  overlay.innerHTML = `
  <div class="nav-row">
    <button class="back-btn" onclick="closeOverlay('odetail')">‹ Back</button>
    <h2>Receipt</h2>
    <button class="nav-act" style="color:var(--red)" onclick="confirmDelete('${id}')">Delete</button>
  </div>
  <div style="padding-bottom:48px">
    ${r.imageDataURL ? `<img src="${r.imageDataURL}" class="img-thumb" style="margin:12px auto"/>` : ''}
    <div class="card det-hdr">
      <div class="det-store">${esc(r.storeName || 'Store')}</div>
      <div class="det-date">${fmtDate(r.date || r.createdAt)}</div>
      <div class="det-total">${fmt(r.totalAmount || 0)}</div>
    </div>
    <div class="det-sec" style="margin-top:12px">
      <h3>Category</h3>
      <div class="chips">${chipsHTML}</div>
    </div>
    ${itemsHTML}
    <div class="card ai-card" id="tip_${id}">
      <div class="ai-hdr">
        <span style="font-size:18px">✨</span>
        <h3>AI Saving Tip</h3>
        <span class="ai-badge">Claude</span>
      </div>
      ${tipHTML}
    </div>
    ${rawHTML}
    <div class="pad"></div>
  </div>`;
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
  el.innerHTML = `
  <div class="nav"><h1>Settings</h1></div>
  <div class="ssel">
    <div class="sshdr">🔑  Claude API Key</div>
    <div class="srow" style="flex-direction:column;align-items:stretch;gap:10px;padding:14px 16px">
      <input class="kinp" id="apik" type="password"
        placeholder="sk-ant-…" value="${esc(key)}"
        autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"/>
      <div style="display:flex;gap:8px">
        <button class="btn btn-s" style="flex:1;width:auto;padding:10px;font-size:14px;margin:0"
          onclick="toggleKeyVis()">👁 Show/Hide</button>
        <button class="btn btn-p" style="flex:1;width:auto;padding:10px;font-size:14px;margin:0"
          onclick="saveApiKey()">Save</button>
      </div>
      ${key ? `<button class="btn btn-d" style="width:auto;padding:10px;font-size:13px;margin:0"
        onclick="removeApiKey()">Remove Key</button>` : ''}
    </div>
    <div class="snote">Stored in localStorage. Get yours at console.anthropic.com.</div>
  </div>
  <div class="ssel">
    <div class="sshdr">📦  Data</div>
    <button class="btn btn-s" style="margin-bottom:10px" onclick="exportCSV()" ${!count ? 'disabled' : ''}>
      ⬆️  Export to CSV
    </button>
    <button class="btn btn-d" onclick="clearAllData()" ${!count ? 'disabled' : ''}>
      🗑  Clear All Data
    </button>
    <div class="snote">${count} receipt${count === 1 ? '' : 's'} stored locally.</div>
  </div>
  <div class="ssel">
    <div class="sshdr">ℹ️  About</div>
    <div class="srow"><span class="slbl">Version</span><span class="sval">1.0 PWA</span></div>
    <div class="srow"><span class="slbl">OCR Engine</span><span class="sval">Tesseract.js 5</span></div>
    <div class="srow"><span class="slbl">AI Model</span><span class="sval">claude-sonnet-4</span></div>
    <div class="srow"><span class="slbl">Languages</span><span class="sval">Italian, English</span></div>
    <div class="snote" style="text-align:center;padding:14px 4px;font-style:italic">
      Snap your slip. Know your spending.
    </div>
  </div>
  <div class="pad"></div>`;
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
    <div class="ai-hdr"><span style="font-size:18px">✨</span><h3>AI Saving Tip</h3><span class="ai-badge">Claude</span></div>
    <div class="spin" style="width:28px;height:28px;margin:10px auto;border-width:3px"></div>`;

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
      <div class="ai-hdr"><span style="font-size:18px">✨</span><h3>AI Saving Tip</h3><span class="ai-badge">Claude</span></div>
      <p class="ai-tip">${esc(tip)}</p>`;
  } catch (err) {
    const msg = err.message || 'Failed to fetch tip';
    if (tipEl) tipEl.innerHTML = `
      <div class="ai-hdr"><span style="font-size:18px">✨</span><h3>AI Saving Tip</h3><span class="ai-badge">Claude</span></div>
      <p style="font-size:13px;color:var(--red);margin-bottom:8px">${esc(msg)}</p>
      <button class="ai-btn" onclick="fetchTip('${receiptId}')">Retry →</button>`;
  }
}

// ── INIT ──────────────────────────────────────────────────────
function init() {
  loadStorage();

  document.getElementById('filein').addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const overlay = document.getElementById('oscanner');
    overlay.classList.add('on');
    try {
      await runOCR(file);
    } catch (err) {
      overlay.innerHTML = `
      <div class="nav-row">
        <button class="back-btn" onclick="closeOverlay('oscanner')">✕</button>
        <h2>Error</h2><div style="width:48px"></div>
      </div>
      <div class="empty">
        <div class="empty-ico">⚠️</div>
        <h3>OCR Failed</h3>
        <p>${esc(err.message || 'Could not read the image.')}</p>
        <button class="btn btn-s" style="width:200px;margin-top:8px"
          onclick="closeOverlay('oscanner');openScanner()">Try Again</button>
      </div>`;
    }
  });

  renderDashboard();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);
