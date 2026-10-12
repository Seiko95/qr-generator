(function () {
  'use strict';

  const { builders, SOCIAL } = window.QRPayloads;
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

  const $ = (id) => document.getElementById(id);

  // ---------- Icons (24x24, stroke) ----------
  const I = (d, fill) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="${fill ? 'currentColor' : 'none'}" stroke="${fill ? 'none' : 'currentColor'}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICONS = {
    link: I('<path d="M10 14a4.5 4.5 0 006.4 0l3-3a4.5 4.5 0 00-6.4-6.4l-1.2 1.2"/><path d="M14 10a4.5 4.5 0 00-6.4 0l-3 3a4.5 4.5 0 006.4 6.4l1.2-1.2"/>'),
    text: I('<path d="M4 5h16M4 9.5h16M4 14h16M4 18.5h16"/>'),
    email: I('<path d="M2.5 5.5A1.5 1.5 0 014 4h16a1.5 1.5 0 011.5 1.5v.6L12 12.3 2.5 6.1zM2.5 8.5l9.5 6.2 9.5-6.2v10A1.5 1.5 0 0120 20H4a1.5 1.5 0 01-1.5-1.5z"/>', true),
    call: I('<path d="M5 3h3.5l1.8 4.5-2.3 1.4a11 11 0 006.1 6.1l1.4-2.3L20 14.5V18a2 2 0 01-2 2A16 16 0 013 5a2 2 0 012-2z"/><path d="M14.5 3.5a6 6 0 016 6M14.5 7a2.5 2.5 0 012.5 2.5"/>'),
    sms: I('<path d="M12 3C6.5 3 2.5 6.6 2.5 11c0 2.3 1.1 4.3 2.8 5.8L4.5 21l4.4-2.2c1 .3 2 .4 3.1.4 5.5 0 9.5-3.6 9.5-8.1S17.5 3 12 3z"/><circle cx="8" cy="11" r="1.2" fill="#fff"/><circle cx="12" cy="11" r="1.2" fill="#fff"/><circle cx="16" cy="11" r="1.2" fill="#fff"/>', true),
    vcard: I('<rect x="2.5" y="4.5" width="19" height="15" rx="2"/><circle cx="8.5" cy="10.5" r="2"/><path d="M5.5 16c.6-1.6 1.7-2.3 3-2.3s2.4.7 3 2.3M14.5 10h4M14.5 14h4"/>'),
    whatsapp: I('<path d="M3.5 20.5l1.3-4.3A8.5 8.5 0 1112 20.5a8.5 8.5 0 01-4.1-1z"/><path d="M9 8.5c0 3.2 2.9 6.3 6.3 6.5l1-1.5-2-1-1 .8a5 5 0 01-2.4-2.4l.8-1-1-2z" stroke-width="1.4"/>'),
    wifi: I('<path d="M2.5 9a14 14 0 0119 0M5.5 12.5a9.5 9.5 0 0113 0M8.7 16a5 5 0 016.6 0"/><circle cx="12" cy="19.5" r="1.2" fill="currentColor"/>'),
    app: I('<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18.5h2"/>'),
    social: I('<circle cx="18" cy="5.5" r="2.8"/><circle cx="6" cy="12" r="2.8"/><circle cx="18" cy="18.5" r="2.8"/><path d="M8.5 13.3l7 3.9M15.5 6.8l-7 3.9"/>'),
    event: I('<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M7.5 13.5h3M13.5 13.5h3M7.5 17h3" stroke-width="2"/>'),
    barcode: I('<path d="M3 5v14M6 5v14M8.5 5v14M12 5v14M14.5 5v14M17 5v14M21 5v14" stroke-width="1.6"/><path d="M4.5 5v14M10 5v14M19 5v14" stroke-width="1"/>'),
  };

  // ---------- Field definitions per type ----------
  const t = (name, label, extra = {}) => ({ name, label, type: 'text', ...extra });
  const SOCIAL_OPTS = Object.entries(SOCIAL).map(([v, s]) => [v, s.label]);

  const TYPES = [
    { id: 'link', label: 'Link', title: 'Link', hint: 'Opens any link: a website, a YouTube video, a PDF or photo shared from Drive / Dropbox…',
      fields: [t('url', 'URL', { type: 'url', placeholder: 'https://example.com  or  https://youtu.be/…', required: true, full: true })] },
    { id: 'text', label: 'Text', title: 'Plain text', hint: 'Shows a text message on the phone. Works offline.',
      fields: [t('text', 'Text', { type: 'textarea', placeholder: 'Type your message…', required: true, full: true, counter: true })] },
    { id: 'email', label: 'E-mail', title: 'E-mail', hint: 'Opens a new e-mail, ready to send.',
      fields: [t('to', 'Recipient', { type: 'email', placeholder: 'name@example.com', required: true, full: true }),
        t('subject', 'Subject', { full: true }),
        t('body', 'Message', { type: 'textarea', full: true })] },
    { id: 'call', label: 'Call', title: 'Phone call', hint: 'Dials this number when scanned.',
      fields: [t('phone', 'Phone number', { type: 'tel', placeholder: '+33 6 12 34 56 78', required: true, full: true, sub: 'Include the country code to work abroad.' })] },
    { id: 'sms', label: 'SMS', title: 'SMS', hint: 'Opens the messaging app with the number and text pre-filled.',
      fields: [t('phone', 'Phone number', { type: 'tel', placeholder: '+33 6 12 34 56 78', required: true, full: true }),
        t('message', 'Message', { type: 'textarea', full: true, counter: true })] },
    { id: 'vcard', label: 'V-card', title: 'Contact card (vCard)', hint: 'Saves a contact to the phone in one tap.',
      fields: [t('firstName', 'First name'), t('lastName', 'Last name'),
        t('mobile', 'Mobile', { type: 'tel' }), t('workPhone', 'Work phone', { type: 'tel' }),
        t('email', 'E-mail', { type: 'email' }), t('website', 'Website', { type: 'url' }),
        t('org', 'Company'), t('title', 'Job title'),
        t('street', 'Street', { full: true }), t('city', 'City'), t('zip', 'Postal code'),
        t('region', 'State / Region'), t('country', 'Country'),
        t('note', 'Note', { type: 'textarea', full: true })] },
    { id: 'whatsapp', label: 'WhatsApp', title: 'WhatsApp', hint: 'Opens a WhatsApp chat with this number.',
      fields: [t('phone', 'WhatsApp number', { type: 'tel', placeholder: '+33 6 12 34 56 78', required: true, full: true, sub: 'Full international number with country code.' }),
        t('message', 'Pre-filled message', { type: 'textarea', full: true })] },
    { id: 'wifi', label: 'WI-FI', title: 'Wi-Fi network', hint: 'Connects the phone to the network without typing the password.',
      fields: [t('ssid', 'Network name (SSID)', { required: true, full: true }),
        t('encryption', 'Security', { type: 'select', options: [['WPA', 'WPA / WPA2 / WPA3'], ['WEP', 'WEP'], ['nopass', 'No password']], value: 'WPA' }),
        t('password', 'Password', { type: 'password', showIf: (v) => v.encryption !== 'nopass' }),
        t('hidden', 'Hidden network', { type: 'checkbox', full: true })] },
    { id: 'app', label: 'App', title: 'App download', hint: 'Sends people to your app in the store.',
      fields: [t('store', 'Store', { type: 'select', options: [['play', 'Google Play (Android)'], ['appstore', 'App Store (iPhone)']], value: 'play', full: true }),
        t('value', 'App', { required: true, full: true, placeholderFn: (v) => ({ play: 'com.whatsapp  or  https://play.google.com/store/apps/details?id=…', appstore: 'https://apps.apple.com/app/…  or  app ID (310633997)' })[v.store || 'play'] })] },
    { id: 'social', label: 'Social Media', title: 'Social media profile', hint: 'Opens your profile so people can follow you.',
      fields: [t('platform', 'Platform', { type: 'select', options: SOCIAL_OPTS, value: 'instagram' }),
        t('username', 'Username or profile link', { required: true, placeholder: '@username' })] },
    { id: 'event', label: 'Event', title: 'Calendar event', hint: 'Adds the event to the phone calendar.',
      fields: [t('title', 'Event title', { required: true, full: true }),
        t('allDay', 'All-day event', { type: 'checkbox', full: true }),
        t('start', 'Starts', { type: 'datetime-local', required: true, showIf: (v) => !v.allDay }),
        t('end', 'Ends', { type: 'datetime-local', showIf: (v) => !v.allDay, sub: 'Default: 1 hour after start.' }),
        t('startDate', 'Start date', { type: 'date', required: true, showIf: (v) => v.allDay }),
        t('endDate', 'End date', { type: 'date', showIf: (v) => v.allDay }),
        t('location', 'Location', { full: true }),
        t('description', 'Description', { type: 'textarea', full: true })] },
    { id: 'barcode', label: '2D Barcode', title: '2D & linear barcodes', hint: 'Data Matrix, PDF417 and Aztec (2D), or product / logistics barcodes.',
      fields: [t('format', 'Format', { type: 'select', full: true, value: 'datamatrix', options: [
        ['datamatrix', 'Data Matrix (2D)'], ['pdf417', 'PDF417 (2D)'], ['azteccode', 'Aztec (2D)'],
        ['code128', 'Code 128'], ['code39', 'Code 39'], ['ean13', 'EAN-13 (products)'], ['ean8', 'EAN-8'], ['upca', 'UPC-A']] }),
        t('value', 'Content', { required: true, full: true, placeholderFn: (v) => ({ ean13: '12 digits, e.g. 400638133393', ean8: '7 digits, e.g. 9638507', upca: '11 digits, e.g. 03600029145', code39: 'ABC-123' })[v.format] || 'Text or number to encode' })] },
  ];
  const TYPE_BY_ID = Object.fromEntries(TYPES.map((x) => [x.id, x]));

  // ---------- State ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem('qrgen:' + k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem('qrgen:' + k, JSON.stringify(v)); } catch (_) {} },
  };

  const state = {
    type: TYPE_BY_ID[store.get('type')] ? store.get('type') : 'link',
    values: store.get('values', {}),
    opts: Object.assign({ fg: '#000000', bg: '#ffffff', style: 'square', ecc: 'M', size: 1024, margin: 4, showText: true }, store.get('opts', {})),
    logo: null, // HTMLImageElement
    result: null, // { kind: 'qr'|'barcode', data, qr?, bcid? }
  };

  // ---------- Type tabs ----------
  const typesEl = $('types');
  TYPES.forEach((ty) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.role = 'tab';
    b.id = 'tab-' + ty.id;
    b.dataset.type = ty.id;
    b.innerHTML = ICONS[ty.id] + `<span>${ty.label}</span>`;
    b.addEventListener('click', () => selectType(ty.id));
    typesEl.appendChild(b);
  });
  typesEl.addEventListener('keydown', (e) => {
    const idx = TYPES.findIndex((x) => x.id === state.type);
    const cols = getComputedStyle(typesEl).gridTemplateColumns.split(' ').length;
    const moves = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
    if (!(e.key in moves)) return;
    e.preventDefault();
    const next = TYPES[(idx + moves[e.key] + TYPES.length) % TYPES.length];
    selectType(next.id);
    $('tab-' + next.id).focus();
  });

  function selectType(id) {
    state.type = id;
    store.set('type', id);
    typesEl.querySelectorAll('button').forEach((b) => {
      const on = b.dataset.type === id;
      b.setAttribute('aria-selected', on);
      b.tabIndex = on ? 0 : -1;
    });
    renderForm();
    updateOptionVisibility();
    update();
  }

  // ---------- Form ----------
  const formEl = $('form');

  function valuesFor(id) {
    const ty = TYPE_BY_ID[id];
    const saved = state.values[id] || {};
    const v = {};
    ty.fields.forEach((f) => { v[f.name] = saved[f.name] !== undefined ? saved[f.name] : (f.value !== undefined ? f.value : (f.type === 'checkbox' ? false : '')); });
    return v;
  }

  function renderForm() {
    const ty = TYPE_BY_ID[state.type];
    const v = valuesFor(state.type);
    $('formTitle').textContent = ty.title;
    $('formHint').textContent = ty.hint;
    formEl.innerHTML = '';
    ty.fields.forEach((f) => {
      const id = 'f-' + f.name;
      const wrap = document.createElement('div');
      wrap.className = 'field' + (f.full ? ' full' : '');
      wrap.dataset.name = f.name;
      let control;
      if (f.type === 'checkbox') {
        wrap.innerHTML = `<label class="check"><input type="checkbox" id="${id}"> ${f.label}</label>`;
        control = wrap.querySelector('input');
        control.checked = !!v[f.name];
      } else {
        const label = document.createElement('label');
        label.htmlFor = id;
        label.innerHTML = f.label + (f.required ? ' <span class="req">*</span>' : '');
        wrap.appendChild(label);
        if (f.type === 'textarea') {
          control = document.createElement('textarea');
        } else if (f.type === 'select') {
          control = document.createElement('select');
          f.options.forEach(([val, text]) => control.add(new Option(text, val)));
        } else {
          control = document.createElement('input');
          control.type = f.type === 'url' ? 'url' : f.type;
          if (f.type === 'tel') control.inputMode = 'tel';
          if (f.type === 'url') control.inputMode = 'url';
          control.spellcheck = false;
          control.autocapitalize = 'off';
        }
        control.id = id;
        control.value = v[f.name] ?? '';
        if (f.placeholder) control.placeholder = f.placeholder;
        if (f.type === 'password') {
          const pw = document.createElement('div');
          pw.className = 'pw';
          const toggle = document.createElement('button');
          toggle.type = 'button';
          toggle.className = 'btn small';
          toggle.textContent = 'Show';
          toggle.addEventListener('click', () => {
            const show = control.type === 'password';
            control.type = show ? 'text' : 'password';
            toggle.textContent = show ? 'Hide' : 'Show';
          });
          pw.append(control, toggle);
          wrap.appendChild(pw);
        } else {
          wrap.appendChild(control);
        }
        if (f.sub || f.counter) {
          const sub = document.createElement('span');
          sub.className = 'sub';
          sub.dataset.sub = f.name;
          sub.textContent = f.sub || '';
          wrap.appendChild(sub);
        }
      }
      control.dataset.name = f.name;
      control.addEventListener('input', onFieldChange);
      control.addEventListener('change', onFieldChange);
      formEl.appendChild(wrap);
    });
    applyDynamicFields(v);
  }

  function readForm() {
    const v = {};
    formEl.querySelectorAll('[data-name]').forEach((el) => {
      if (el.tagName === 'DIV') return;
      v[el.dataset.name] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return v;
  }

  function applyDynamicFields(v) {
    const ty = TYPE_BY_ID[state.type];
    ty.fields.forEach((f) => {
      const wrap = formEl.querySelector(`.field[data-name="${f.name}"]`);
      if (f.showIf) wrap.hidden = !f.showIf(v);
      if (f.placeholderFn) wrap.querySelector('input,textarea').placeholder = f.placeholderFn(v) || '';
      if (f.counter) wrap.querySelector('[data-sub]').textContent = `${(v[f.name] || '').length} characters`;
    });
  }

  function onFieldChange() {
    const v = readForm();
    state.values[state.type] = v;
    // Never persist Wi-Fi passwords.
    const toSave = JSON.parse(JSON.stringify(state.values));
    if (toSave.wifi) delete toSave.wifi.password;
    store.set('values', toSave);
    applyDynamicFields(v);
    scheduleUpdate();
  }

  // ---------- Options ----------
  function setSeg(groupId, value) {
    $(groupId).querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === value));
  }
  ['style', 'ecc'].forEach((g) => {
    $(g).addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      state.opts[g] = b.dataset.v;
      setSeg(g, b.dataset.v);
      saveOpts();
      update();
    });
  });
  ['fg', 'bg'].forEach((k) => {
    $(k).addEventListener('input', (e) => {
      state.opts[k] = e.target.value;
      $(k + 'Code').textContent = e.target.value;
      saveOpts();
      scheduleUpdate();
    });
  });
  $('size').addEventListener('input', (e) => { state.opts.size = +e.target.value; $('sizeVal').textContent = e.target.value; saveOpts(); updateMeta(); });
  $('margin').addEventListener('input', (e) => { state.opts.margin = +e.target.value; $('marginVal').textContent = e.target.value; saveOpts(); scheduleUpdate(); });
  $('showText').addEventListener('change', (e) => { state.opts.showText = e.target.checked; saveOpts(); update(); });

  $('logo').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        state.logo = img;
        $('logoPreview').src = reader.result;
        $('logoPreview').hidden = false;
        $('logoClear').hidden = false;
        updateEccLock();
        update();
      };
      img.onerror = () => toast('This image could not be loaded.');
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });
  $('logoClear').addEventListener('click', () => {
    state.logo = null;
    $('logoPreview').hidden = true;
    $('logoClear').hidden = true;
    updateEccLock();
    update();
  });

  function updateEccLock() {
    const locked = !!state.logo;
    $('ecc').querySelectorAll('button').forEach((b) => { b.disabled = locked && b.dataset.v !== 'H'; });
    setSeg('ecc', locked ? 'H' : state.opts.ecc);
  }

  function saveOpts() { store.set('opts', state.opts); }

  function updateOptionVisibility() {
    const isBarcode = state.type === 'barcode';
    $('optStyle').hidden = isBarcode;
    $('optEcc').hidden = isBarcode;
    $('optLogo').hidden = isBarcode;
    const fmt = (state.values.barcode || {}).format || 'datamatrix';
    $('optText').hidden = !isBarcode || ['datamatrix', 'pdf417', 'azteccode'].includes(fmt);
  }

  function luminance(hex) {
    const n = parseInt(hex.slice(1), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }

  // ---------- Generation ----------
  let timer = null;
  function scheduleUpdate() { clearTimeout(timer); timer = setTimeout(update, 120); }

  function showError(msg) {
    $('error').textContent = msg || '';
    $('error').hidden = !msg;
  }

  function setResult(result) {
    state.result = result;
    const has = !!result;
    ['dlPng', 'dlSvg', 'copy', 'share'].forEach((id) => { $(id).disabled = !has; });
    $('empty').hidden = has;
    $('canvas').style.visibility = has ? 'visible' : 'hidden';
    $('payloadBox').hidden = !has;
    $('payload').textContent = has ? result.data : '';
    updateMeta();
  }

  function updateMeta() {
    const r = state.result;
    if (!r) { $('meta').textContent = ''; return; }
    const bytes = new TextEncoder().encode(r.data).length;
    if (r.kind === 'qr') {
      const n = r.qr.getModuleCount();
      $('meta').textContent = `QR version ${(n - 17) / 4} · ${n}×${n} modules · ECC ${r.ecc} · ${bytes} bytes · export ${state.opts.size}px`;
    } else {
      $('meta').textContent = `${r.formatLabel} · ${bytes} bytes`;
    }
  }

  function isEmpty(v) {
    return Object.entries(v).every(([k, x]) => (typeof x === 'boolean') || !String(x).trim() ||
      (TYPE_BY_ID[state.type].fields.find((f) => f.name === k) || {}).type === 'select');
  }

  function update() {
    const lowContrast = luminance(state.opts.fg) > luminance(state.opts.bg) || (luminance(state.opts.bg) + 0.05) / (luminance(state.opts.fg) + 0.05) < 3;
    $('contrastWarn').hidden = !lowContrast;
    updateOptionVisibility();

    const v = valuesFor(state.type);
    if (isEmpty(v)) { showError(''); setResult(null); return; }
    const out = builders[state.type](v);
    if (out.error) { showError(out.error); setResult(null); return; }

    if (state.type === 'barcode') {
      renderBarcode(out);
      return;
    }

    const ecc = state.logo ? 'H' : state.opts.ecc;
    let qr;
    try {
      qr = qrcode(0, ecc);
      qr.addData(out.data, 'Byte');
      qr.make();
    } catch (err) {
      showError(`Too much content for a QR code (${new TextEncoder().encode(out.data).length} bytes). Shorten it or lower the error correction.`);
      setResult(null);
      return;
    }
    showError('');
    drawQR(qr, $('canvas'), 600);
    setResult({ kind: 'qr', data: out.data, qr, ecc });
  }

  // ---------- QR drawing ----------
  function isFinder(r, c, n) {
    return (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Shapes in module units; shared by canvas and SVG output.
  function qrShapes(qr) {
    const n = qr.getModuleCount();
    const style = state.opts.style;
    const shapes = [];
    const finderRadius = style === 'square' ? 0 : style === 'rounded' ? 1.6 : 2.2;
    [[0, 0], [0, n - 7], [n - 7, 0]].forEach(([r, c]) => {
      shapes.push({ kind: 'ring', x: c, y: r, size: 7, radius: finderRadius });
      shapes.push({ kind: 'rect', x: c + 2, y: r + 2, w: 3, h: 3, radius: finderRadius ? finderRadius * 0.5 : 0 });
    });
    // Leave room for the logo: skip modules under it.
    const hole = logoBox(n);
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (!qr.isDark(r, c) || isFinder(r, c, n)) continue;
        if (hole && c + 1 > hole.x && c < hole.x + hole.size && r + 1 > hole.y && r < hole.y + hole.size) continue;
        if (style === 'dots') shapes.push({ kind: 'dot', x: c, y: r });
        else if (style === 'rounded') shapes.push({ kind: 'rect', x: c + 0.04, y: r + 0.04, w: 0.92, h: 0.92, radius: 0.3 });
        else shapes.push({ kind: 'rect', x: c, y: r, w: 1, h: 1, radius: 0 });
      }
    }
    return { n, shapes, hole };
  }

  // Logo area: ~22% of the code width, centred, in whole modules.
  function logoBox(n) {
    if (!state.logo) return null;
    let size = Math.round(n * 0.22);
    if ((n - size) % 2) size++;
    const x = (n - size) / 2;
    return { x, y: x, size };
  }

  function drawQR(qr, canvas, px) {
    const { n, shapes, hole } = qrShapes(qr);
    const margin = state.opts.margin;
    const total = n + margin * 2;
    const scale = px / total;
    canvas.width = canvas.height = Math.round(px);
    canvas.classList.toggle('smooth', state.opts.style !== 'square' || !!state.logo);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = state.opts.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = state.opts.fg;
    const o = margin * scale;
    ctx.beginPath();
    shapes.forEach((s) => {
      if (s.kind === 'dot') {
        ctx.moveTo(o + (s.x + 0.95) * scale, o + (s.y + 0.5) * scale);
        ctx.arc(o + (s.x + 0.5) * scale, o + (s.y + 0.5) * scale, 0.45 * scale, 0, Math.PI * 2);
      } else if (s.kind === 'rect') {
        if (s.radius) roundRect(ctx, o + s.x * scale, o + s.y * scale, s.w * scale, s.h * scale, s.radius * scale);
        else ctx.rect(o + s.x * scale, o + s.y * scale, s.w * scale + 0.5, s.h * scale + 0.5);
      }
    });
    ctx.fill();
    // Finder rings: outer minus inner.
    shapes.filter((s) => s.kind === 'ring').forEach((s) => {
      ctx.beginPath();
      const x = o + s.x * scale, y = o + s.y * scale, w = s.size * scale;
      if (s.radius) {
        roundRect(ctx, x, y, w, w, s.radius * scale);
        roundRect(ctx, x + scale, y + scale, w - 2 * scale, w - 2 * scale, Math.max(0, (s.radius - 1)) * scale);
      } else {
        ctx.rect(x, y, w, w);
        ctx.rect(x + scale, y + scale, w - 2 * scale, w - 2 * scale);
      }
      ctx.fill('evenodd');
    });
    if (hole) {
      const pad = scale * 0.5;
      const x = o + hole.x * scale, s = hole.size * scale;
      ctx.fillStyle = state.opts.bg;
      ctx.beginPath();
      roundRect(ctx, x, x, s, s, scale);
      ctx.fill();
      const img = state.logo;
      const ratio = Math.min((s - 2 * pad) / img.width, (s - 2 * pad) / img.height);
      const w = img.width * ratio, h = img.height * ratio;
      ctx.drawImage(img, x + (s - w) / 2, x + (s - h) / 2, w, h);
    }
  }

  function qrSvg(qr) {
    const { n, shapes, hole } = qrShapes(qr);
    const m = state.opts.margin;
    const total = n + 2 * m;
    const f = (x) => +(x).toFixed(3);
    const rr = (x, y, w, h, r) => {
      if (!r) return `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}z`;
      return `M${f(x + r)} ${f(y)}h${f(w - 2 * r)}a${f(r)} ${f(r)} 0 0 1 ${f(r)} ${f(r)}v${f(h - 2 * r)}a${f(r)} ${f(r)} 0 0 1 ${f(-r)} ${f(r)}h${f(-(w - 2 * r))}a${f(r)} ${f(r)} 0 0 1 ${f(-r)} ${f(-r)}v${f(-(h - 2 * r))}a${f(r)} ${f(r)} 0 0 1 ${f(r)} ${f(-r)}z`;
    };
    let d = '';
    shapes.forEach((s) => {
      const x = s.x + m, y = s.y + m;
      if (s.kind === 'dot') d += `M${f(x + 0.05)} ${f(y + 0.5)}a0.45 0.45 0 1 0 0.9 0a0.45 0.45 0 1 0 -0.9 0z`;
      else if (s.kind === 'rect') d += rr(x, y, s.w, s.h, s.radius);
      else if (s.kind === 'ring') d += rr(x, y, 7, 7, s.radius) + rr(x + 1, y + 1, 5, 5, Math.max(0, s.radius - 1));
    });
    let logo = '';
    if (hole) {
      const x = hole.x + m, s = hole.size;
      logo = `<path fill="${state.opts.bg}" d="${rr(x, x, s, s, 1)}"/>` +
        `<image href="${logoDataUrl()}" x="${x + 0.5}" y="${x + 0.5}" width="${s - 1}" height="${s - 1}" preserveAspectRatio="xMidYMid meet"/>`;
    }
    const px = state.opts.size;
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${total} ${total}" shape-rendering="${state.opts.style === 'square' ? 'crispEdges' : 'geometricPrecision'}">` +
      `<rect width="100%" height="100%" fill="${state.opts.bg}"/><path fill="${state.opts.fg}" fill-rule="evenodd" d="${d}"/>${logo}</svg>`;
  }

  function logoDataUrl() {
    const img = state.logo;
    const c = document.createElement('canvas');
    const max = 512, ratio = Math.min(1, max / Math.max(img.width, img.height));
    c.width = Math.round(img.width * ratio);
    c.height = Math.round(img.height * ratio);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  }

  // ---------- Barcodes (bwip-js, loaded on demand) ----------
  let bwipPromise = null;
  function loadBwip() {
    if (window.bwipjs) return Promise.resolve(window.bwipjs);
    if (!bwipPromise) {
      bwipPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'lib/bwip-js.min.js';
        s.onload = () => resolve(window.bwipjs);
        s.onerror = () => { bwipPromise = null; reject(new Error('Could not load the barcode library.')); };
        document.head.appendChild(s);
      });
    }
    return bwipPromise;
  }

  const FORMAT_LABELS = { datamatrix: 'Data Matrix', pdf417: 'PDF417', azteccode: 'Aztec', code128: 'Code 128', code39: 'Code 39', ean13: 'EAN-13', ean8: 'EAN-8', upca: 'UPC-A' };
  const LINEAR = ['code128', 'code39', 'ean13', 'ean8', 'upca'];

  function bwipOptions(out, scale) {
    const linear = LINEAR.includes(out.bcid);
    const pad = state.opts.margin * (linear ? 2 : 1);
    const o = {
      bcid: out.bcid, text: out.data, scale,
      barcolor: state.opts.fg.slice(1), backgroundcolor: state.opts.bg.slice(1),
      paddingwidth: pad, paddingheight: pad,
    };
    if (linear) {
      o.height = 18;
      if (state.opts.showText) { o.includetext = true; o.textxalign = 'center'; o.textcolor = state.opts.fg.slice(1); }
    }
    if (out.bcid === 'pdf417') o.columns = 0;
    if (/[^\x00-\x7F]/.test(out.data) && !linear) {
      // Encode UTF-8 bytes so accented characters survive in 2D symbols.
      o.text = Array.from(new TextEncoder().encode(out.data), (b) => b >= 128 || b === 94 ? '^' + String(b).padStart(3, '0') : String.fromCharCode(b)).join('');
      o.parse = true;
    }
    return o;
  }

  let barcodeSeq = 0;
  async function renderBarcode(out) {
    const seq = ++barcodeSeq;
    let bwip;
    try { bwip = await loadBwip(); } catch (e) { showError(e.message); setResult(null); return; }
    if (seq !== barcodeSeq) return;
    try {
      const canvas = $('canvas');
      bwip.toCanvas(canvas, bwipOptions(out, 4));
      canvas.classList.remove('smooth');
      showError('');
      setResult({ kind: 'barcode', data: out.data, bcid: out.bcid, formatLabel: FORMAT_LABELS[out.bcid] });
    } catch (err) {
      showError('Cannot create this barcode: ' + String(err.message || err).replace(/^bwipp\.\w+#\d+:\s*/, ''));
      setResult(null);
    }
  }

  // ---------- Export ----------
  function fileBase() {
    return 'qr-' + state.type + '-' + new Date().toISOString().slice(0, 10);
  }

  async function pngBlob() {
    const r = state.result;
    const c = document.createElement('canvas');
    if (r.kind === 'qr') {
      drawQR(r.qr, c, state.opts.size);
    } else {
      const bwip = await loadBwip();
      // Pick a scale so the output is close to the chosen size.
      const probe = document.createElement('canvas');
      bwip.toCanvas(probe, bwipOptions({ data: r.data, bcid: r.bcid }, 1));
      const scale = Math.max(1, Math.round(state.opts.size / Math.max(probe.width, probe.height)));
      bwip.toCanvas(c, bwipOptions({ data: r.data, bcid: r.bcid }, scale));
    }
    return new Promise((res) => c.toBlob(res, 'image/png'));
  }

  async function svgText() {
    const r = state.result;
    if (r.kind === 'qr') return qrSvg(r.qr);
    const bwip = await loadBwip();
    return bwip.toSVG(bwipOptions({ data: r.data, bcid: r.bcid }, 1));
  }

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  $('dlPng').addEventListener('click', async () => {
    download(await pngBlob(), fileBase() + '.png');
    toast('PNG downloaded');
  });
  $('dlSvg').addEventListener('click', async () => {
    download(new Blob([await svgText()], { type: 'image/svg+xml' }), fileBase() + '.svg');
    toast('SVG downloaded');
  });
  $('copy').addEventListener('click', async () => {
    try {
      if (!navigator.clipboard || !window.ClipboardItem) throw new Error();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob() })]);
      toast('Image copied to clipboard');
    } catch (_) {
      try { await navigator.clipboard.writeText(state.result.data); toast('Image copy not supported here: copied the text instead'); }
      catch (__) { toast('Copy is not available in this browser'); }
    }
  });
  $('share').addEventListener('click', async () => {
    try {
      const file = new File([await pngBlob()], fileBase() + '.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'QR code' });
      } else if (navigator.share) {
        await navigator.share({ text: state.result.data });
      } else {
        download(file, file.name);
        toast('Sharing not supported: downloaded instead');
      }
    } catch (err) {
      if (err && err.name !== 'AbortError') toast('Sharing failed');
    }
  });

  let toastTimer;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  // ---------- Install prompt (Chrome / Edge on Windows, Linux, Android) ----------
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    $('install').hidden = false;
  });
  $('install').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    $('install').hidden = true;
  });
  window.addEventListener('appinstalled', () => { $('install').hidden = true; });

  // ---------- Init ----------
  $('fg').value = state.opts.fg; $('fgCode').textContent = state.opts.fg;
  $('bg').value = state.opts.bg; $('bgCode').textContent = state.opts.bg;
  $('size').value = state.opts.size; $('sizeVal').textContent = state.opts.size;
  $('margin').value = state.opts.margin; $('marginVal').textContent = state.opts.margin;
  $('showText').checked = state.opts.showText;
  setSeg('style', state.opts.style);
  setSeg('ecc', state.opts.ecc);

  // Test hook: lets automated tests read the encoded payload.
  window.__qrgen = { state, pngBlob, svgText, selectType };

  selectType(state.type);
})();
