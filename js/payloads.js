// Payload builders: turn form fields into the text encoded in the QR code.
// Each builder returns { data } on success or { error } when input is invalid.
// Works as a classic browser script (window.QRPayloads) and as a CommonJS module (tests).
(function (root) {
  'use strict';

  const trim = (v) => (v == null ? '' : String(v).trim());
  const ok = (data) => ({ data });
  const fail = (error) => ({ error });

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function normalizeUrl(raw) {
    const v = trim(raw);
    if (!v) return '';
    if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return v;
    return 'https://' + v;
  }

  function isValidUrl(v) {
    try {
      const u = new URL(v);
      return !!u.protocol && (u.protocol !== 'http:' && u.protocol !== 'https:' || u.hostname.includes('.') || u.hostname === 'localhost');
    } catch (_) {
      return false;
    }
  }

  function urlPayload(raw, label) {
    const url = normalizeUrl(raw);
    if (!url) return fail(`Enter the ${label || 'URL'}.`);
    if (!isValidUrl(url)) return fail('This does not look like a valid URL.');
    return ok(url);
  }

  // Keep a leading "+" and digits only.
  function cleanPhone(raw) {
    const v = trim(raw);
    const plus = v.startsWith('+') ? '+' : '';
    return plus + v.replace(/\D/g, '');
  }

  function phoneError(phone) {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return 'Enter a phone number.';
    if (digits.length < 3 || digits.length > 15) return 'Phone number must have 3 to 15 digits.';
    return null;
  }

  // vCard 3.0 text escaping (RFC 2426).
  function escVcard(v) {
    return trim(v).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  // iCalendar text escaping (RFC 5545).
  const escIcal = escVcard;

  // Wi-Fi QR field escaping (ZXing convention).
  function escWifi(v) {
    return String(v == null ? '' : v).replace(/([\\;,:"])/g, '\\$1');
  }

  function pad(n, len = 2) {
    return String(n).padStart(len, '0');
  }

  function icalUtc(date) {
    return date.getUTCFullYear() + pad(date.getUTCMonth() + 1) + pad(date.getUTCDate()) +
      'T' + pad(date.getUTCHours()) + pad(date.getUTCMinutes()) + pad(date.getUTCSeconds()) + 'Z';
  }

  function icalDate(ymd) {
    return ymd.replace(/-/g, '');
  }

  function nextDay(ymd) {
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + 1));
    return dt.getUTCFullYear() + '-' + pad(dt.getUTCMonth() + 1) + '-' + pad(dt.getUTCDate());
  }

  function eanCheckDigit(digits) {
    // digits: string without check digit (7 for EAN-8, 11 for UPC-A, 12 for EAN-13)
    let sum = 0;
    const rev = digits.split('').reverse();
    rev.forEach((c, i) => { sum += Number(c) * (i % 2 === 0 ? 3 : 1); });
    return String((10 - (sum % 10)) % 10);
  }

  const SOCIAL = {
    instagram: { label: 'Instagram', url: (u) => `https://www.instagram.com/${u}` },
    facebook: { label: 'Facebook', url: (u) => `https://www.facebook.com/${u}` },
    x: { label: 'X (Twitter)', url: (u) => `https://x.com/${u}` },
    tiktok: { label: 'TikTok', url: (u) => `https://www.tiktok.com/@${u}` },
    linkedin: { label: 'LinkedIn', url: (u) => `https://www.linkedin.com/in/${u}` },
    youtube: { label: 'YouTube', url: (u) => `https://www.youtube.com/@${u}` },
    github: { label: 'GitHub', url: (u) => `https://github.com/${u}` },
    snapchat: { label: 'Snapchat', url: (u) => `https://www.snapchat.com/add/${u}` },
    telegram: { label: 'Telegram', url: (u) => `https://t.me/${u}` },
    pinterest: { label: 'Pinterest', url: (u) => `https://www.pinterest.com/${u}` },
    twitch: { label: 'Twitch', url: (u) => `https://www.twitch.tv/${u}` },
    threads: { label: 'Threads', url: (u) => `https://www.threads.net/@${u}` },
  };

  const builders = {
    link(f) {
      return urlPayload(f.url, 'website URL');
    },

    text(f) {
      const t = f.text == null ? '' : String(f.text);
      if (!t.trim()) return fail('Enter some text.');
      return ok(t);
    },

    email(f) {
      const to = trim(f.to);
      if (!to) return fail('Enter an email address.');
      if (!EMAIL_RE.test(to)) return fail('This email address is not valid.');
      const params = [];
      if (trim(f.subject)) params.push('subject=' + encodeURIComponent(trim(f.subject)));
      if (trim(f.body)) params.push('body=' + encodeURIComponent(String(f.body).trim()));
      return ok('mailto:' + to + (params.length ? '?' + params.join('&') : ''));
    },

    call(f) {
      const phone = cleanPhone(f.phone);
      const err = phoneError(phone);
      if (err) return fail(err);
      return ok('tel:' + phone);
    },

    sms(f) {
      const phone = cleanPhone(f.phone);
      const err = phoneError(phone);
      if (err) return fail(err);
      return ok('SMSTO:' + phone + ':' + (f.message == null ? '' : String(f.message)));
    },

    vcard(f) {
      const first = trim(f.firstName);
      const last = trim(f.lastName);
      if (!first && !last && !trim(f.org)) return fail('Enter at least a name or a company.');
      if (trim(f.email) && !EMAIL_RE.test(trim(f.email))) return fail('This email address is not valid.');
      const full = [first, last].filter(Boolean).join(' ') || trim(f.org);
      const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
      lines.push(`N:${escVcard(last)};${escVcard(first)};;;`);
      lines.push(`FN:${escVcard(full)}`);
      if (trim(f.org)) lines.push(`ORG:${escVcard(f.org)}`);
      if (trim(f.title)) lines.push(`TITLE:${escVcard(f.title)}`);
      if (trim(f.mobile)) lines.push(`TEL;TYPE=CELL:${cleanPhone(f.mobile)}`);
      if (trim(f.workPhone)) lines.push(`TEL;TYPE=WORK,VOICE:${cleanPhone(f.workPhone)}`);
      if (trim(f.email)) lines.push(`EMAIL;TYPE=INTERNET:${trim(f.email)}`);
      if (trim(f.website)) lines.push(`URL:${normalizeUrl(f.website)}`);
      if (trim(f.street) || trim(f.city) || trim(f.zip) || trim(f.country) || trim(f.region)) {
        lines.push(`ADR;TYPE=WORK:;;${escVcard(f.street)};${escVcard(f.city)};${escVcard(f.region)};${escVcard(f.zip)};${escVcard(f.country)}`);
      }
      if (trim(f.note)) lines.push(`NOTE:${escVcard(f.note)}`);
      lines.push('END:VCARD');
      return ok(lines.join('\n'));
    },

    whatsapp(f) {
      const digits = cleanPhone(f.phone).replace(/\D/g, '');
      if (!digits) return fail('Enter a WhatsApp number with country code.');
      if (digits.length < 7 || digits.length > 15) return fail('Use the full international number (country code + number).');
      const msg = trim(f.message);
      return ok('https://wa.me/' + digits + (msg ? '?text=' + encodeURIComponent(msg) : ''));
    },

    wifi(f) {
      const ssid = f.ssid == null ? '' : String(f.ssid);
      if (!ssid) return fail('Enter the network name (SSID).');
      const enc = ['WPA', 'WEP', 'nopass'].includes(f.encryption) ? f.encryption : 'WPA';
      const pass = f.password == null ? '' : String(f.password);
      if (enc !== 'nopass' && !pass) return fail('Enter the Wi-Fi password, or choose "No password".');
      if (enc === 'WPA' && pass.length < 8) return fail('WPA passwords have at least 8 characters.');
      let s = `WIFI:T:${enc};S:${escWifi(ssid)};`;
      if (enc !== 'nopass') s += `P:${escWifi(pass)};`;
      if (f.hidden) s += 'H:true;';
      return ok(s + ';');
    },

    pdf(f) {
      return urlPayload(f.url, 'link to the PDF');
    },

    images(f) {
      return urlPayload(f.url, 'link to the image or gallery');
    },

    video(f) {
      return urlPayload(f.url, 'link to the video');
    },

    app(f) {
      const store = f.store || 'play';
      const v = trim(f.value);
      if (store === 'play') {
        if (!v) return fail('Enter the Android package name (e.g. com.whatsapp) or the Play Store link.');
        if (/^[a-zA-Z][\w]*(\.[a-zA-Z_][\w]*)+$/.test(v)) {
          return ok('https://play.google.com/store/apps/details?id=' + v);
        }
        return urlPayload(v, 'Play Store link');
      }
      if (store === 'appstore') {
        if (!v) return fail('Enter the App Store link (apps.apple.com/...).');
        if (/^\d{6,}$/.test(v)) return ok('https://apps.apple.com/app/id' + v);
        return urlPayload(v, 'App Store link');
      }
      return urlPayload(v, 'app download link');
    },

    social(f) {
      const platform = SOCIAL[f.platform];
      let u = trim(f.username);
      if (!u) return fail('Enter a username or a profile link.');
      if (/^https?:\/\//i.test(u) || /^www\./i.test(u)) return urlPayload(u, 'profile link');
      if (!platform) return fail('Choose a platform.');
      u = u.replace(/^@/, '');
      if (/\s/.test(u)) return fail('Usernames cannot contain spaces.');
      return ok(platform.url(encodeURIComponent(u).replace(/%2F/gi, '/')));
    },

    event(f) {
      const title = trim(f.title);
      if (!title) return fail('Enter the event title.');
      const lines = ['BEGIN:VEVENT', `SUMMARY:${escIcal(title)}`];
      if (f.allDay) {
        const start = trim(f.startDate);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return fail('Choose the start date.');
        let end = trim(f.endDate) || start;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) return fail('The end date is not valid.');
        if (end < start) return fail('The end date is before the start date.');
        lines.push(`DTSTART;VALUE=DATE:${icalDate(start)}`);
        lines.push(`DTEND;VALUE=DATE:${icalDate(nextDay(end))}`);
      } else {
        const start = f.start instanceof Date ? f.start : (trim(f.start) ? new Date(f.start) : null);
        if (!start || isNaN(start)) return fail('Choose the start date and time.');
        let end = f.end instanceof Date ? f.end : (trim(f.end) ? new Date(f.end) : null);
        if (end && isNaN(end)) return fail('The end date is not valid.');
        if (!end) end = new Date(start.getTime() + 60 * 60 * 1000);
        if (end < start) return fail('The end is before the start.');
        lines.push(`DTSTART:${icalUtc(start)}`);
        lines.push(`DTEND:${icalUtc(end)}`);
      }
      if (trim(f.location)) lines.push(`LOCATION:${escIcal(f.location)}`);
      if (trim(f.description)) lines.push(`DESCRIPTION:${escIcal(f.description)}`);
      lines.push('END:VEVENT');
      return ok(lines.join('\n'));
    },

    // Returns { data, bcid } — bcid is the bwip-js symbology id.
    barcode(f) {
      const fmt = f.format || 'datamatrix';
      const v = f.value == null ? '' : String(f.value);
      if (!v.trim()) return fail('Enter the content to encode.');
      const digitsOnly = /^\d+$/.test(v);
      const withBcid = (data) => ({ data, bcid: fmt });
      switch (fmt) {
        case 'datamatrix':
        case 'pdf417':
        case 'azteccode':
          return withBcid(v);
        case 'code128':
          if (/[^\x00-\x7F]/.test(v)) return fail('Code 128 only supports basic ASCII characters.');
          return withBcid(v);
        case 'code39': {
          const up = v.toUpperCase();
          if (!/^[0-9A-Z \-.$/+%]+$/.test(up)) return fail('Code 39 supports A-Z, 0-9, space and - . $ / + %');
          return withBcid(up);
        }
        case 'ean13':
        case 'upca':
        case 'ean8': {
          const len = { ean13: 13, upca: 12, ean8: 8 }[fmt];
          const name = { ean13: 'EAN-13', upca: 'UPC-A', ean8: 'EAN-8' }[fmt];
          if (!digitsOnly) return fail(`${name} only contains digits.`);
          if (v.length === len - 1) return withBcid(v + eanCheckDigit(v));
          if (v.length === len) {
            if (eanCheckDigit(v.slice(0, -1)) !== v.slice(-1)) {
              return fail(`Wrong check digit: the last digit should be ${eanCheckDigit(v.slice(0, -1))}.`);
            }
            return withBcid(v);
          }
          return fail(`${name} needs ${len - 1} digits (the check digit is added) or ${len} digits.`);
        }
        default:
          return fail('Unknown barcode format.');
      }
    },
  };

  const api = { builders, SOCIAL, normalizeUrl, eanCheckDigit, escWifi, escVcard, icalUtc };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.QRPayloads = api;
})(typeof window !== 'undefined' ? window : globalThis);
