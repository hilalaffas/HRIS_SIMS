// src/pages/PersetujuanIzin/components/RequestList.jsx
//
// [BARU] Daftar pengajuan (panel kiri) + keadaan memuat / kosong / error.
import React from 'react';
import { Inbox, TriangleAlert } from 'lucide-react';
import RequestListItem from './RequestListItem';
import './RequestList.css';

function ListSkeleton() {
  return (
    <ul className="pzn-list" aria-busy="true" aria-label="Memuat pengajuan">
      {[0, 1, 2].map((key) => (
        <li key={key} className="pzn-skeleton">
          <span className="pzn-skeleton__avatar" />
          <span className="pzn-skeleton__lines">
            <span style={{ width: '42%' }} />
            <span style={{ width: '28%' }} />
            <span style={{ width: '70%' }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function RequestList({ rows, selectedId, leavingId, loading, loadError, emptyMessage, onSelect }) {
  if (loading) return <ListSkeleton />;

  if (loadError && rows.length === 0) {
    return (
      <div className="pzn-state pzn-state--error" role="alert">
        <TriangleAlert aria-hidden="true" />
        <p>{loadError}</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="pzn-state">
        <Inbox aria-hidden="true" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="pzn-list">
      {rows.map((row, index) => (
        <RequestListItem
          key={row.id}
          row={row}
          index={index}
          selected={row.id === selectedId}
          leaving={row.id === leavingId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}

export default React.memo(RequestList);
