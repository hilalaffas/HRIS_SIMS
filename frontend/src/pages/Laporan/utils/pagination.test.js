import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_PAGE_SIZE, resolvePagination } from './pagination.js';

const pick = (result, keys) => Object.fromEntries(keys.map((key) => [key, result[key]]));

test('5 data per halaman dari 20 karyawan = 4 halaman', () => {
  assert.deepEqual(pick(resolvePagination({ page: 0, pageSize: 5, totalItems: 20 }), ['totalPages', 'safePage', 'start', 'end']),
    { totalPages: 4, safePage: 0, start: 0, end: 5 });
  assert.deepEqual(pick(resolvePagination({ page: 3, pageSize: 5, totalItems: 20 }), ['safePage', 'start', 'end']),
    { safePage: 3, start: 15, end: 20 });
});

test('halaman terakhir boleh berisi sisa data', () => {
  assert.deepEqual(pick(resolvePagination({ page: 2, pageSize: 10, totalItems: 23 }), ['totalPages', 'start', 'end']),
    { totalPages: 3, start: 20, end: 23 });
});

test("pageSize 'all' = semua data dalam satu halaman", () => {
  assert.deepEqual(pick(resolvePagination({ page: 4, pageSize: ALL_PAGE_SIZE, totalItems: 20 }), ['totalPages', 'safePage', 'start', 'end']),
    { totalPages: 1, safePage: 0, start: 0, end: 20 });
});

test('halaman yang melewati batas (mis. setelah filter) dijepit ke halaman terakhir', () => {
  assert.deepEqual(pick(resolvePagination({ page: 9, pageSize: 5, totalItems: 7 }), ['safePage', 'start', 'end']),
    { safePage: 1, start: 5, end: 7 });
});

test('data kosong tetap 1 halaman tanpa error', () => {
  assert.deepEqual(pick(resolvePagination({ page: 0, pageSize: 5, totalItems: 0 }), ['totalPages', 'safePage', 'start', 'end']),
    { totalPages: 1, safePage: 0, start: 0, end: 0 });
  assert.equal(resolvePagination({ page: 0, pageSize: ALL_PAGE_SIZE, totalItems: 0 }).end, 0);
});
