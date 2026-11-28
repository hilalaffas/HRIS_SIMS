import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatLateDuration } from './formatLateDuration.js';

test('late duration displays minutes, whole hours, and mixed hours without zero units', () => {
  for (const [minutes, label] of [[20, '20 Menit'], [60, '1 Jam'], [80, '1 Jam 20 Menit'], [120, '2 Jam'], [150, '2 Jam 30 Menit']]) {
    assert.equal(formatLateDuration(minutes), label);
  }
});

test('missing or invalid late duration does not display a time', () => {
  for (const value of [null, undefined, 0, -1, NaN, Infinity]) assert.equal(formatLateDuration(value), '');
});
