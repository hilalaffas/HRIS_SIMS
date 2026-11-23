import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachLeaveCancellations } from './leaveCancellation.js';
import { buildEmployeeReport } from '../pages/Laporan/utils/attendanceReportBuilder.js';
import { normalWorkMinutes } from '../pages/Absensi/utils/normalWorkDuration.js';
import { applyLeaveSession, toDisplayLeaveToday } from '../pages/Absensi/utils/leaveToday.js';
import { buildLeaveBalanceTimeline } from './leaveBalanceTimeline.js';
import { mapApproval, mapKaryawanLeave, mapMyLeave } from '../services/CutiService.js';
import { buildLeaveCardModel } from './approvalCardModels.js';
const event = {date:'2026-11-20',cancelledAt:'2026-11-20T15:55:00',actorName:'Pemohon',days:1,returnedQuotaDays:1};
const now = new Date('2026-11-25T12:00:00');

test('report cancellation note includes only cancellation date without changing attendance', () => {
  const rows = attachLeaveCancellations([{date:event.date,status:'HADIR TEPAT WAKTU',note:'Bekerja Normal',checkIn:'08:00'}],[{cancellations:[event]}]);
  assert.equal(rows[0].status,'HADIR TEPAT WAKTU'); assert.equal(rows[0].checkIn,'08:00');
  assert.match(rows[0].note,/Batal Cuti/); assert.match(rows[0].note,/20 November 2026/);
  assert.doesNotMatch(rows[0].note,/Dibatalkan oleh|Kuota dikembalikan|Pemohon/);
  assert.doesNotMatch(rows[0].noteDetail,/Dibatalkan oleh|Kuota dikembalikan|Pemohon/);
});
test('report frees only cancelled day; remaining approved date still counts as leave', () => {
  const report=buildEmployeeReport({divisionType:'REGULAR',leaves:[{startDate:'2026-11-20',endDate:'2026-11-23',totalDays:1,leaveTypeName:'Cuti tahunan',cancellations:[event]}]},
    {range:{from:'2026-11-20',to:'2026-11-23'},now,holidaysByDate:{}});
  assert.equal(report.rows.find(r=>r.date==='2026-11-20').status,'TANPA KETERANGAN');
  assert.match(report.rows[0].note,/Batal Cuti/);
  assert.equal(report.rows.find(r=>r.date==='2026-11-23').status,'CUTI');
  assert.equal(report.summary.leave,1);
});
test('fully cancelled leave stays in history with final Batal Cuti instead of pending approval', () => {
  const item=mapMyLeave({leaveRequestId:1,status:{statusName:'CANCELLED'},leaveType:{name:'Cuti tahunan'},totalDays:0,originalTotalDays:1,startDate:event.date,endDate:event.date,cancellations:[event]});
  assert.equal(item.status,'Batal Cuti'); assert.equal(buildLeaveCardModel(item).badgeLabel,'Batal Cuti'); assert.match(item.totalHari,/Batal Cuti/);
});
test('half-day work uses server session for checkout and required duration', () => {
  const leave=toDisplayLeaveToday({mode:'HALF_AFTERNOON',workDate:event.date,workStart:'2026-11-20T08:00:00',workEnd:'2026-11-20T12:00:00',requiredMinutes:240});
  const context=applyLeaveSession({workDate:event.date,canCheckIn:true,shiftName:'Reguler'},leave,new Date('2026-11-20T09:00:00+07:00'));
  assert.equal(context.hoursLabel,'08:00 - 12:00'); assert.equal(context.requiredAttendanceHours,4); assert.equal(context.halfDayLeave,true);
  const day={scheduledWorkStart:leave.workStart,scheduledWorkEnd:leave.workEnd,requiredMinutes:240};
  assert.equal(normalWorkMinutes(new Date('2026-11-20T08:00:00'),new Date('2026-11-20T17:00:00'),event.date,day),240);
});
test('morning leave early checkin opening does not count the leave hour as work', () => {
  const day={scheduledWorkStart:new Date('2026-11-20T13:00:00'),scheduledWorkEnd:new Date('2026-11-20T17:00:00'),requiredMinutes:240};
  assert.equal(normalWorkMinutes(new Date('2026-11-20T12:00:00'),new Date('2026-11-20T17:00:00'),event.date,day),240);
  assert.equal(normalWorkMinutes(new Date('2026-11-20T14:00:00'),new Date('2026-11-20T17:00:00'),event.date,day),180);
});
test('overnight half shift preserves dates when counting four worked hours', () => {
  const day={scheduledWorkStart:new Date('2026-11-21T03:00:00'),scheduledWorkEnd:new Date('2026-11-21T07:00:00'),requiredMinutes:240};
  assert.equal(normalWorkMinutes(new Date('2026-11-21T03:00:00'),new Date('2026-11-21T08:00:00'),event.date,day),240);
});

test('HRD report counts half-day leave and caps an older check-in using checkout session metadata', () => {
  const report=buildEmployeeReport({divisionType:'REGULAR',attendances:[
    {attendanceId:1,attendanceDate:event.date,action:'MASUK',reason:'ABSEN',status:'ON_TIME',recordedAt:'2026-11-20T08:00:00'},
    {attendanceId:2,attendanceDate:event.date,action:'KELUAR',reason:'ABSEN',status:'DONE',recordedAt:'2026-11-20T17:00:00',scheduledWorkStart:'2026-11-20T08:00:00',scheduledWorkEnd:'2026-11-20T12:00:00',scheduledWorkMinutes:240}
  ],leaves:[{startDate:event.date,endDate:event.date,totalDays:0.5,session:'SIANG',leaveTypeName:'Cuti setengah hari'}]},
  {range:{from:event.date,to:event.date},now,holidaysByDate:{}});
  assert.equal(report.rows[0].durationMinutes,240);
  assert.equal(report.summary.leave,0.5);
});


test('cancelled HR auto approval keeps original duration, status and audit logs', () => {
  const raw = {leaveRequestId:1,employee:{employeeId:1,fullName:'Pemohon'},leaveType:{name:'Cuti Urgent'},
    status:{statusName:'CANCELLED'},totalDays:0,originalTotalDays:1,startDate:event.date,endDate:event.date,
    approvedAt:'2026-11-20T10:00:00',reviewedBy:{fullName:'HRD'},cancellations:[event]};
  const row = mapKaryawanLeave(raw);
  assert.equal(row.statusBerkas,'DIBATALKAN');
  assert.equal(row.totalDays,0);
  assert.match(row.durasi,/1 Hari/);
  assert.match(row.durasi,/Batal 1 hari/);
  assert.equal(row.riwayatLog[0].statusBadge,'DISETUJUI (ACC)');
  assert.equal(row.riwayatLog[1].statusBadge,'BATAL CUTI');
  const detail = mapApproval({...raw,overallStatus:'CANCELLED',approvalLogs:[
    {action:'APPROVED',approverName:'HRD'}, {action:'CANCELLED',approverName:'Pemohon'}]});
  assert.equal(detail.statusBerkas,'DIBATALKAN');
  assert.equal(detail.approvalProgressStatus,'Batal Cuti');
  assert.match(detail.durasi,/1 Hari/);
  assert.equal(detail.riwayatLog.at(-1).statusBadge,'BATAL CUTI');
});

test('balance timeline shows refund after cancellation without refunding twice', () => {
  const rows = [
    {id:1,employeeId:1,statusBerkas:'DIBATALKAN',approvedAt:'2026-11-19T10:00:00',
      totalDays:0,originalTotalDays:1,deductsQuota:true,cancellations:[event]},
    {id:2,employeeId:1,statusBerkas:'DISETUJUI',approvedAt:'2026-11-20T10:00:00',totalDays:2,deductsQuota:true},
  ];
  assert.deepEqual(buildLeaveBalanceTimeline(rows,{1:10}),{1:10,2:9});
});

test('partial cancellation and non-quota leave keep remaining balance and days', () => {
  const row = mapKaryawanLeave({leaveRequestId:3,employee:{employeeId:1},status:{statusName:'APPROVED'},
    leaveType:{name:'Cuti tahunan'},totalDays:2,originalTotalDays:3,cancellations:[event]});
  assert.equal(row.totalDays,2);
  assert.match(row.durasi,/3 Hari/);
  assert.equal(buildLeaveBalanceTimeline([row],{1:10})[3],10);
  const free = {...row,id:4,statusBerkas:'DIBATALKAN',totalDays:0,deductsQuota:false};
  assert.equal(buildLeaveBalanceTimeline([free],{1:10})[4],10);
});
