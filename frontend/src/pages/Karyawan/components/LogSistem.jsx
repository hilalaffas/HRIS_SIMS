import React from 'react';
import './LogSistem.css';

const LogSistem = ({ logList }) => {
  return (
    <div className="card-wrapper_log_sistem">
      <div className="header_log_sistem">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <h3>Log Sistem HR Khusus (Read-Only)</h3>
      </div>
      
      <div className="body_log_sistem">
        {logList.map((log) => (
          <div 
            key={log.id} 
            className={`log-item_log_sistem ${log.type === 'system' ? 'item-system_log_sistem' : 'item-normal_log_sistem'}`}
          >
            <div className="log-time_log_sistem">
              <span>{log.tanggal}</span>
              <span>{log.jam}</span>
            </div>
            <div className="log-content_log_sistem">
              <strong>{log.aktor}</strong> {log.aksi}
            </div>
          </div>
        ))}

        {logList.length === 0 && (
          <div className="empty-log_log_sistem">Belum ada aktivitas terekam.</div>
        )}
      </div>
    </div>
  );
};

export default LogSistem;