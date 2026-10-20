// src/components/RouteErrorBoundary.jsx
// [BARU] Pengaman untuk lazy route: kalau chunk halaman gagal dimuat (koneksi
// putus, dsb.) user melihat pesan + tombol "Muat ulang", bukan layar putih.
// Error di-reset otomatis saat user pindah ke halaman lain (prop resetKey).
import React from 'react';
import './RouteFallback.css';

export default class RouteErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="route-error" role="alert">
        <h3 className="route-error__title">Halaman gagal dimuat</h3>
        <p className="route-error__text">
          Periksa koneksi internet Anda, lalu coba muat ulang halaman ini.
        </p>
        <button type="button" className="route-error__btn" onClick={() => window.location.reload()}>
          Muat ulang
        </button>
      </div>
    );
  }
}
