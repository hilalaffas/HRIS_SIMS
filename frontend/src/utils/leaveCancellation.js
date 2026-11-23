export function cancellationText(item) {
  const date = new Date(`${item.date}T00:00:00`).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
  const time = new Date(item.cancelledAt).toLocaleString('id-ID', {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  return `Batal Cuti — ${date} · Dibatalkan oleh: ${item.actorName} · ${time} WIB · Kuota dikembalikan: ${Number(item.returnedQuotaDays || 0).toLocaleString('id-ID')} hari`;
}
export function attachLeaveCancellations(rows, leaves = []) {
  const notes = new Map();
  leaves.flatMap(l => l.cancellations || []).forEach(c => {
    const date = new Date(`${c.date}T00:00:00`).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
    notes.set(c.date, [...(notes.get(c.date) || []), `Batal Cuti — ${date}`]);
  });
  return rows.map(row => {
    const text = notes.get(row.date)?.join(' · ');
    return text ? { ...row, note:[row.note,text].filter(Boolean).join(' · '), noteDetail:[row.noteDetail,text].filter(Boolean).join(' · ') } : row;
  });
}
