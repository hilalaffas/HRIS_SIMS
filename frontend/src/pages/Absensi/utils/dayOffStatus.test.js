import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyDayOff } from './dayOffStatus.js';

const dayOff = { dayOff: true };

test("hari libur mengalahkan cuti penuh dan cuti setengah hari (kasus cuti 27-30, Sabtu 28)", () => {
  assert.equal(applyDayOff("onLeave", dayOff), "holiday");
  assert.equal(applyDayOff("leaveWait", dayOff), "holiday");
});

test("hari libur tanpa cuti tampil Hari Libur, bukan Belum Absen", () => {
  assert.equal(applyDayOff("idle", dayOff), "holiday");
});

test("status yang sedang berjalan / sakit tidak ditimpa", () => {
  for (const status of ["checkedIn", "done", "sick", "sickPending"]) {
    assert.equal(applyDayOff(status, dayOff), status);
  }
});

test("hari kerja biasa: cuti tetap Sedang Cuti", () => {
  assert.equal(applyDayOff("onLeave", { dayOff: false }), "onLeave");
  assert.equal(applyDayOff("onLeave", {}), "onLeave");
  assert.equal(applyDayOff("onLeave", null), "onLeave");
  assert.equal(applyDayOff("idle", undefined), "idle");
});
