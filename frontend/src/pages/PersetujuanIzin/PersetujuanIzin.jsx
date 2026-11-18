import React from 'react';
import PermissionHistoryList from './components/PermissionHistoryList';
import Toast from '../../components/Toast';
import './PersetujuanIzin.css';

// Both tabs share the same table. Decisions are available only in queue mode.
export default function PersetujuanIzin({ approvals, mode = 'queue' }) {
  return <>
    <PermissionHistoryList approvals={approvals} mode={mode} />
    <Toast show={!!approvals.toast} message={approvals.toast?.message} type={approvals.toast?.type} />
  </>;
}
