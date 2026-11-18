// src/utils/excelValueConverters.test.js
// Jalankan: node --test src/utils/excelValueConverters.test.js
import assert from 'node:assert/strict';
import test from 'node:test';
import { toExcelDate, toExcelDuration, toExcelNumber, toExcelTime } from './excelValueConverters.js';

test('toExcelDate mengubah yyyy-mm-dd menjadi Date UTC tanpa pergeseran zona waktu', () => {
  assert.equal(toExcelDate('2026-10-21').toISOString(), '2026-10-21T00:00:00.000Z');
  assert.equal(toExcelDate('2026-10-21T08:00:00').toISOString(), '2026-10-21T00:00:00.000Z');
  assert.equal(toExcelDate('-'), null);
  assert.equal(toExcelDate(null), null);
});

test('toExcelTime menerima HH:mm maupun HH:mm:ss dan mengembalikan pecahan hari', () => {
  assert.equal(toExcelTime('12:00'), 0.5);
  assert.equal(toExcelTime('06:00:00'), 0.25);
  assert.ok(Math.abs(toExcelTime('07:55:12') - 0.33) < 1e-12);
  assert.equal(toExcelTime('-'), null);
  assert.equal(toExcelTime(undefined), null);
});

test('toExcelDuration mengubah menit menjadi pecahan hari; nol atau tidak valid menjadi null', () => {
  assert.equal(toExcelDuration(720), 0.5);
  assert.equal(toExcelDuration(0), null);
  assert.equal(toExcelDuration(null), null);
  assert.equal(toExcelDuration('abc'), null);
});

test('toExcelNumber menjaga angka dan mengosongkan nilai kosong', () => {
  assert.equal(toExcelNumber('1.5'), 1.5);
  assert.equal(toExcelNumber(0), 0);
  assert.equal(toExcelNumber(''), null);
  assert.equal(toExcelNumber(undefined), null);
});
