import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import MobileRecords, { MobileRecordCards } from './MobileRecords.jsx';

function collect(node, type) {
  if (!React.isValidElement(node)) return [];
  return [...(node.type === type ? [node] : []), ...React.Children.toArray(node.props.children).flatMap(child => collect(child, type))];
}

test('native table remains intact while mobile cards retain every label and field', () => {
  const table = <table><thead><tr><th>Pemohon</th><th>Durasi</th><th>Status</th><th>Aksi</th></tr></thead>
    <tbody>{false}<tr key="a"><td>Member A</td><td>0 hari</td><td>Batal Cuti</td><td><button disabled>Proses</button></td></tr></tbody></table>;
  const tree = MobileRecordCards({ children: table, labels: ['Pemohon', 'Durasi', 'Status', 'Aksi'], statusIndex: 2, actionIndex: 3 });
  const desktop = renderToStaticMarkup(<MobileRecords labels={['Pemohon', 'Durasi', 'Status', 'Aksi']}>{table}</MobileRecords>);
  assert.equal((desktop.match(/<table>/g) || []).length, 1);
  assert.doesNotMatch(desktop, /mobile-records__card/);
  assert.equal(collect(tree, 'article').length, 1);
  const html = renderToStaticMarkup(tree);
  assert.match(html, /<dt>Durasi<\/dt>/);
  assert.match(html, /Batal Cuti/);
  assert.match(html, /0 hari/);
  assert.equal(collect(tree, 'button').filter(button => button.props.disabled).length, 1);
});

test('grid headers are not mistaken for records and existing callbacks are reused', () => {
  const onProcess = () => {};
  const grid = <div role="table"><div className="leaveList__row--head" role="row"><div>Pemohon</div><div>Detail</div><div>Aksi</div></div>
    {[<div role="row" key="1"><div>A</div><div>Cuti tahunan</div><div><button onClick={onProcess}>Rincian</button></div></div>,
      <div role="row" key="2"><div>B</div><div>Izin sakit</div><div><button onClick={onProcess}>Proses</button></div></div>]}</div>;
  const tree = MobileRecordCards({ children: grid, labels: ['Pemohon', 'Detail', 'Aksi'], actionIndex: 2 });
  assert.equal(collect(tree, 'article').length, 2);
  assert.equal(collect(tree, 'button').length, 2);
  assert.ok(collect(tree, 'button').every(button => button.props.onClick === onProcess));
});

test('long notes collapse into details without losing content or safe React escaping', () => {
  const note = '<script>alert(1)</script> Alasan panjang';
  const tree = MobileRecordCards({ children: <table><tbody><tr><td>A</td><td>{note}</td></tr></tbody></table>,
    labels: ['Pemohon', 'Alasan'], detailIndexes: [1] });
  const html = renderToStaticMarkup(tree);
  assert.equal(collect(tree, 'details').length, 1);
  assert.equal(collect(tree, 'details')[0].props.open, undefined);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test('empty/loading colspan rows retain the state instead of rendering broken cards', () => {
  const tree = MobileRecordCards({ children: <table><tbody><tr><td colSpan={5}>Memuat data...</td></tr></tbody></table>, labels: ['Pemohon'] });
  assert.equal(collect(tree, 'article').length, 0);
  assert.match(renderToStaticMarkup(tree), /mobile-records__empty/);
});

test('overtime status button stays available and row number does not use card space', () => {
  const onStatus = () => {};
  const tree = MobileRecordCards({ children: <table><tbody><tr><td>99</td><td>25 Nov 2026</td><td><button onClick={onStatus}>Menunggu</button></td></tr></tbody></table>,
    labels: ['No', 'Tanggal lembur', 'Status'], titleIndex: 1, statusIndex: 2, hiddenIndexes: [0] });
  const card = collect(tree, 'article')[0];
  assert.doesNotMatch(renderToStaticMarkup(card), />99</);
  assert.equal(collect(card, 'button')[0].props.onClick, onStatus);
});

test('mobile sort controls retain original handlers and remain outside data rows', () => {
  const onSort = () => {};
  const controls = <button onClick={onSort}>Tanggal ↓</button>;
  const tree = MobileRecordCards({ children: <div><div key="row"><div>A</div></div></div>, labels: ['Pemohon'], controls });
  assert.equal(collect(tree, 'article').length, 1);
  assert.equal(collect(tree, 'button')[0].props.onClick, onSort);
});
