import React, { Children, Fragment, isValidElement, useSyncExternalStore } from 'react';

// Keep the desktop table intact and reuse its already-rendered cells/actions for
// mobile cards. Only one view is mounted, so forms, images and IDs are never duplicated.
const MOBILE_QUERY = '(max-width: 900px)';
function subscribeViewport(listener) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const media = window.matchMedia(MOBILE_QUERY);
  if (media.addEventListener) {
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }
  media.addListener(listener);
  return () => media.removeListener(listener);
}
const isMobile = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.(MOBILE_QUERY).matches);
const serverDesktop = () => false;

export default function MobileRecords(props) {
  const mobile = useSyncExternalStore(subscribeViewport, isMobile, serverDesktop);
  return <div className="mobile-records">{mobile
    ? <MobileRecordCards {...props} />
    : <div className="mobile-records__desktop">{props.children}</div>}</div>;
}
function elements(children) {
  return Children.toArray(children).flatMap(child => (
    isValidElement(child) && child.type === Fragment ? elements(child.props.children)
      : isValidElement(child) ? [child] : []
  ));
}

export function MobileRecordCards({ children, labels, titleIndex = 0, statusIndex = -1,
  actionIndex = -1, hiddenIndexes = [], detailIndexes = [], controls = null, ariaLabel = 'Daftar data' }) {
  const table = Children.only(children);
  const sections = elements(table.props.children);
  const native = table.type === 'table';
  const body = native ? sections.find(section => section.type === 'tbody') : table;
  const rows = elements(body?.props.children).filter(row => native ? row.type === 'tr'
    : !/--head/.test(row.props.className || '') && (row.type === 'div' || row.props.role === 'row'));

  return <div className="mobile-records__mobile" aria-label={ariaLabel}>
      {controls && <div className="mobile-records__controls">{controls}</div>}
      {rows.map((row, index) => {
        const cells = elements(row.props.children);
        if (cells.length === 1 && cells[0].props.colSpan) {
          return <div className="mobile-records__empty" key={row.key || index}>{cells[0].props.children}</div>;
        }
        const content = cell => cell?.props.children;
        const display = (cell, className = '') => <div className={`mobile-records__value ${cell?.props.className || ''} ${className}`}>{content(cell)}</div>;
        const fields = cells.map((cell, cellIndex) => ({ cell, cellIndex })).filter(({ cellIndex }) => (
          cellIndex !== titleIndex && cellIndex !== statusIndex && cellIndex !== actionIndex && !hiddenIndexes.includes(cellIndex)
        ));
        return <article className={`mobile-records__card ${row.props.className || ''}`} key={row.key || index}
          aria-hidden={row.props['aria-hidden']}>
          <header className="mobile-records__heading">
            <div className="mobile-records__identity"><span className="mobile-records__label">{labels[titleIndex]}</span>{display(cells[titleIndex])}</div>
            {statusIndex >= 0 && statusIndex !== titleIndex && <div className="mobile-records__status">
              <span className="mobile-records__label">{labels[statusIndex]}</span>{display(cells[statusIndex])}
            </div>}
          </header>
          <dl className="mobile-records__fields">
            {fields.filter(({ cellIndex }) => !detailIndexes.includes(cellIndex)).map(({ cell, cellIndex }) => (
              <div className="mobile-records__field" key={cellIndex}>
                <dt>{labels[cellIndex]}</dt><dd>{display(cell)}</dd>
              </div>
            ))}
          </dl>
          {fields.some(({ cellIndex }) => detailIndexes.includes(cellIndex)) && <details className="mobile-records__details">
            <summary>Keterangan <span aria-hidden="true">⌄</span></summary>
            {fields.filter(({ cellIndex }) => detailIndexes.includes(cellIndex)).map(({ cell, cellIndex }) => (
              <div className="mobile-records__field" key={cellIndex}><span className="mobile-records__label">{labels[cellIndex]}</span>{display(cell)}</div>
            ))}
          </details>}
          {actionIndex >= 0 && actionIndex !== statusIndex && <footer className="mobile-records__actions">{content(cells[actionIndex])}</footer>}
        </article>;
      })}
  </div>;
}
