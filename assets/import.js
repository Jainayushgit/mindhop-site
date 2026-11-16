/* Sales Desk: bulk import leads from CSV / Excel.
   Depends on globals from sales/index.html: sb, me, normPhone, esc, load, $ */
(function () {
  const FIELDS = [
    { key: 'parent_name', label: "Parent's name", req: false, hints: ['parent', 'parent name', 'father', 'mother', 'guardian', 'name', 'contact name', 'full name'] },
    { key: 'phone', label: 'Phone / WhatsApp', req: true, hints: ['phone', 'whatsapp', 'mobile', 'number', 'contact', 'phone number', 'mobile number', 'whatsapp number', 'cell'] },
    { key: 'child_name', label: "Child's name", req: false, hints: ['child', 'child name', 'kid', 'student', 'student name', 'son', 'daughter'] },
    { key: 'child_age', label: "Child's age", req: false, hints: ['age', 'child age', 'kid age', 'student age'] },
    { key: 'market', label: 'Market (IN/US)', req: false, hints: ['market', 'country', 'region'] },
    { key: 'source', label: 'Source', req: false, hints: ['source', 'lead source', 'list', 'campaign', 'school'] },
    { key: 'notes', label: 'Notes', req: false, hints: ['notes', 'note', 'comments', 'remarks', 'city', 'interest'] }
  ];
  const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  let rows = [], headers = [], parsed = [];

  function loadXLSX() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = '/assets/xlsx-0.18.5.full.min.js'; s.onload = res; s.onerror = () => rej(new Error('Could not load the spreadsheet reader.'));
      document.head.appendChild(s);
    });
  }

  function guess(field) {
    // exact match first, then "contains", never reuse the parent "name" hint for child columns
    const H = headers.map(norm);
    for (const h of field.hints) { const i = H.indexOf(h); if (i >= 0) return i; }
    for (const h of field.hints) {
      const i = H.findIndex(x => x.includes(h) && !(field.key === 'parent_name' && /child|kid|student/.test(x)));
      if (i >= 0) return i;
    }
    return -1;
  }

  function parseAge(v) {
    const m = String(v ?? '').match(/\d{1,2}/); if (!m) return null;
    const n = parseInt(m[0], 10); return n >= 4 && n <= 18 ? n : null;
  }
  function parseMarket(v, phone, fallback) {
    const s = norm(v);
    if (/^(us|usa|united states|america)/.test(s)) return 'US';
    if (/^(in|ind|india)/.test(s)) return 'IN';
    if (phone.startsWith('91') && phone.length === 12) return 'IN';
    if (phone.startsWith('1') && phone.length === 11) return 'US';
    return fallback;
  }

  function mapping() {
    const m = {};
    FIELDS.forEach(f => { m[f.key] = parseInt($('map_' + f.key).value, 10); });
    return m;
  }

  async function build() {
    const m = mapping(), fallback = document.querySelector('input[name=imarket]:checked').value;
    const srcDefault = $('isrc').value.trim() || null;
    const cell = (r, k) => (m[k] >= 0 ? String(r[m[k]] ?? '').trim() : '');
    const seen = new Set(); parsed = [];
    let bad = 0, dupFile = 0;
    for (const r of rows) {
      if (!r.some(c => String(c ?? '').trim())) continue;
      const rawPhone = cell(r, 'phone');
      const mkt0 = parseMarket(cell(r, 'market'), rawPhone.replace(/\D/g, ''), fallback);
      const phone = normPhone(rawPhone, mkt0);
      if (phone.length < 11 || phone.length > 15) { bad++; continue; }
      if (seen.has(phone)) { dupFile++; continue; }
      seen.add(phone);
      parsed.push({
        parent_name: cell(r, 'parent_name') || 'Unknown', phone,
        child_name: cell(r, 'child_name') || null, child_age: parseAge(cell(r, 'child_age')),
        market: parseMarket(cell(r, 'market'), phone, fallback),
        source: cell(r, 'source') || srcDefault, notes: cell(r, 'notes') || null,
        owner_email: me.email, status: 'new'
      });
    }
    // which phones already exist?
    let existing = new Set();
    for (let i = 0; i < parsed.length; i += 200) {
      const { data } = await sb.from('leads').select('phone').in('phone', parsed.slice(i, i + 200).map(p => p.phone));
      (data || []).forEach(d => existing.add(d.phone));
    }
    const fresh = parsed.filter(p => !existing.has(p.phone));
    parsed = fresh;
    $('iSummary').innerHTML =
      `<b>${fresh.length}</b> new lead${fresh.length === 1 ? '' : 's'} ready to import` +
      (existing.size ? ` · ${existing.size} already in the list (skipped)` : '') +
      (dupFile ? ` · ${dupFile} repeated in the file (skipped)` : '') +
      (bad ? ` · <span class="err">${bad} without a valid phone number (skipped)</span>` : '');
    $('iPreview').innerHTML = fresh.slice(0, 5).map(p =>
      `<div class="meta">${esc(p.parent_name)} · +${esc(p.phone)} · ${esc(p.child_name || '—')}${p.child_age ? ', ' + p.child_age : ''} · ${p.market}</div>`).join('') +
      (fresh.length > 5 ? `<div class="muted">…and ${fresh.length - 5} more</div>` : '');
    $('iGo').disabled = !fresh.length;
    $('iGo').textContent = fresh.length ? `Import ${fresh.length} lead${fresh.length === 1 ? '' : 's'}` : 'Nothing to import';
  }

  async function onFile(e) {
    const file = e.target.files[0]; if (!file) return;
    $('iMsg').textContent = 'Reading file…'; $('iStep2').classList.add('hide');
    try {
      await loadXLSX();
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', raw: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const all = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
      const hi = all.findIndex(r => r.filter(c => String(c).trim()).length >= 1);
      if (hi < 0 || all.length - hi < 2) throw new Error('The file looks empty. The first row should be column headings.');
      headers = all[hi].map(h => String(h).trim()); rows = all.slice(hi + 1);
      $('iMap').innerHTML = FIELDS.map(f => {
        const g = guess(f);
        return `<div class="field"><label for="map_${f.key}">${f.label}${f.req ? ' *' : ''}</label><select id="map_${f.key}">
          <option value="-1">— not in file —</option>${headers.map((h, i) => `<option value="${i}" ${i === g ? 'selected' : ''}>${esc(h || 'Column ' + (i + 1))}</option>`).join('')}</select></div>`;
      }).join('');
      $('iMap').querySelectorAll('select').forEach(s => s.addEventListener('change', build));
      $('iMsg').textContent = `${file.name}: ${rows.length} rows. Check the columns below.`;
      $('iStep2').classList.remove('hide');
      if (parseInt($('map_phone').value, 10) < 0) { $('iSummary').innerHTML = '<span class="err">Pick which column has the phone number.</span>'; $('iGo').disabled = true; return; }
      await build();
    } catch (err) { $('iMsg').innerHTML = `<span class="err">${esc(err.message)}</span>`; }
  }

  async function doImport() {
    if (!parsed.length) return;
    $('iGo').disabled = true; let done = 0;
    for (let i = 0; i < parsed.length; i += 300) {
      const batch = parsed.slice(i, i + 300);
      const { data, error } = await sb.from('leads').upsert(batch, { onConflict: 'phone', ignoreDuplicates: true }).select('id');
      if (error) { $('iSummary').innerHTML = `<span class="err">Stopped after ${done}: ${esc(error.message)}</span>`; return; }
      done += (data || []).length;
      if (data && data.length) await sb.from('lead_events').insert(data.map(d => ({ lead_id: d.id, type: 'imported', actor: me.email, data: { file: $('iFile').files[0]?.name || null } })));
      $('iGo').textContent = `Importing… ${done}/${parsed.length}`;
    }
    $('iSummary').innerHTML = `<b>Imported ${done} lead${done === 1 ? '' : 's'}.</b> They're in the list as "New".`;
    $('iPreview').innerHTML = ''; $('iGo').textContent = 'Done'; parsed = [];
    $('iFile').value = ''; load();
  }

  window.initImport = function () {
    $('iFile').addEventListener('change', onFile);
    $('iGo').addEventListener('click', doImport);
    document.querySelectorAll('input[name=imarket]').forEach(r => r.addEventListener('change', () => rows.length && build()));
    $('isrc').addEventListener('change', () => rows.length && build());
  };
})();
