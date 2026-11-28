export function formatLateDuration(totalMinutes) {
  const value = Number(totalMinutes);
  if (!Number.isFinite(value) || value <= 0) return '';
  const wholeMinutes = Math.floor(value);
  const hours = Math.floor(wholeMinutes / 60);
  const minutes = wholeMinutes % 60;
  return [hours > 0 ? `${hours} Jam` : '', minutes > 0 ? `${minutes} Menit` : '']
    .filter(Boolean).join(' ');
}
