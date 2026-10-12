import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { builders: b, eanCheckDigit } = require('../js/payloads.js');

test('link adds https and validates', () => {
  assert.equal(b.link({ url: 'example.com/a?b=1' }).data, 'https://example.com/a?b=1');
  assert.equal(b.link({ url: 'http://x.org' }).data, 'http://x.org');
  assert.ok(b.link({ url: '' }).error);
  assert.ok(b.link({ url: 'not a url' }).error);
});

test('text keeps content as-is', () => {
  assert.equal(b.text({ text: 'Héllo\nworld 🎉' }).data, 'Héllo\nworld 🎉');
  assert.ok(b.text({ text: '   ' }).error);
});

test('email builds mailto with encoded params', () => {
  assert.equal(b.email({ to: 'a@b.co', subject: 'Hi there', body: 'L1\nL2 & more' }).data,
    'mailto:a@b.co?subject=Hi%20there&body=L1%0AL2%20%26%20more');
  assert.equal(b.email({ to: 'a@b.co' }).data, 'mailto:a@b.co');
  assert.ok(b.email({ to: 'nope' }).error);
});

test('call and sms clean phone numbers', () => {
  assert.equal(b.call({ phone: '+33 6 12-34-56-78' }).data, 'tel:+33612345678');
  assert.equal(b.sms({ phone: '06 12 34 56 78', message: 'Hi: ok' }).data, 'SMSTO:0612345678:Hi: ok');
  assert.ok(b.call({ phone: 'abc' }).error);
});

test('vcard escapes special characters', () => {
  const r = b.vcard({ firstName: 'Jean', lastName: 'Dupont; Jr', org: 'A, B', mobile: '+33 6 00', email: 'j@d.fr', note: 'x\ny', city: 'Paris' });
  assert.equal(r.data, [
    'BEGIN:VCARD', 'VERSION:3.0',
    'N:Dupont\\; Jr;Jean;;;', 'FN:Jean Dupont\\; Jr', 'ORG:A\\, B',
    'TEL;TYPE=CELL:+33600', 'EMAIL;TYPE=INTERNET:j@d.fr',
    'ADR;TYPE=WORK:;;;Paris;;;', 'NOTE:x\\ny', 'END:VCARD',
  ].join('\n'));
  assert.ok(b.vcard({}).error);
});

test('whatsapp builds wa.me link', () => {
  assert.equal(b.whatsapp({ phone: '+33 6 12 34 56 78', message: 'Salut !' }).data, 'https://wa.me/33612345678?text=Salut%20!');
  assert.ok(b.whatsapp({ phone: '12' }).error);
});

test('wifi escapes and handles modes', () => {
  assert.equal(b.wifi({ ssid: 'My;Net', password: 'p:ss"word', encryption: 'WPA', hidden: true }).data,
    'WIFI:T:WPA;S:My\\;Net;P:p\\:ss\\"word;H:true;;');
  assert.equal(b.wifi({ ssid: 'Open', encryption: 'nopass' }).data, 'WIFI:T:nopass;S:Open;;');
  assert.ok(b.wifi({ ssid: 'X', password: 'short', encryption: 'WPA' }).error);
});

test('app handles package ids and store links', () => {
  assert.equal(b.app({ store: 'play', value: 'com.whatsapp' }).data, 'https://play.google.com/store/apps/details?id=com.whatsapp');
  assert.equal(b.app({ store: 'appstore', value: '310633997' }).data, 'https://apps.apple.com/app/id310633997');
});

test('social builds profile URLs', () => {
  assert.equal(b.social({ platform: 'instagram', username: '@nasa' }).data, 'https://www.instagram.com/nasa');
  assert.equal(b.social({ platform: 'tiktok', username: 'nasa' }).data, 'https://www.tiktok.com/@nasa');
  assert.equal(b.social({ platform: 'x', username: 'https://x.com/nasa' }).data, 'https://x.com/nasa');
  assert.ok(b.social({ platform: 'x', username: 'a b' }).error);
});

test('event builds VEVENT in UTC and all-day', () => {
  const r = b.event({ title: 'Meet, now', start: new Date(Date.UTC(2026, 9, 12, 14, 30)), location: 'Room 1' });
  assert.equal(r.data, 'BEGIN:VEVENT\nSUMMARY:Meet\\, now\nDTSTART:20261012T143000Z\nDTEND:20261012T153000Z\nLOCATION:Room 1\nEND:VEVENT');
  const a = b.event({ title: 'Holiday', allDay: true, startDate: '2026-12-31', endDate: '2026-12-31' });
  assert.match(a.data, /DTSTART;VALUE=DATE:20261231\nDTEND;VALUE=DATE:20270101/);
  assert.ok(b.event({ title: 'x', allDay: true, startDate: '2026-01-02', endDate: '2026-01-01' }).error);
});

test('barcode validates and computes check digits', () => {
  assert.equal(eanCheckDigit('400638133393'), '1');
  assert.deepEqual(b.barcode({ format: 'ean13', value: '400638133393' }), { data: '4006381333931', bcid: 'ean13' });
  assert.ok(b.barcode({ format: 'ean13', value: '4006381333932' }).error);
  assert.equal(b.barcode({ format: 'upca', value: '03600029145' }).data, '036000291452');
  assert.equal(b.barcode({ format: 'code39', value: 'abc-1' }).data, 'ABC-1');
  assert.equal(b.barcode({ format: 'datamatrix', value: 'Hello' }).bcid, 'datamatrix');
  assert.ok(b.barcode({ format: 'code128', value: 'é' }).error);
});
