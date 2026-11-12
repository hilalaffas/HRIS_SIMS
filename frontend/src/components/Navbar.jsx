import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isDevAccessUser, isDevAccessPath } from '../config/devAccessConfig';
import { getCurrentUser } from '../services/authService';
import NotifPasswordResetModal from './NotifPasswordResetModal';
import NotifLeaveDetailModal from './NotifLeaveDetailModal'; // [BARU] popup detail cuti di halaman saat ini
import NotifBellToast from './NotifBellToast';
import { getNotificationAction } from '../config/notificationRoutes';
import useNotifications from '../hooks/useNotifications'; // [BARU] notifikasi dari database
import useI18n from '../i18n/useI18n';
import LanguageSwitcher from './LanguageSwitcher';
import './Navbar.css';

// [UBAH] Seluruh notifikasi kini disimpan di database (tabel `notifications`) dan diambil
// lewat useNotifications. Navbar tidak lagi menghitung notifikasi dari data cuti/absensi/reset
// sandi di browser, dan status "dibaca" tidak lagi di localStorage -- jadi notifikasi yang
// sudah dibaca tidak muncul lagi di perangkat/browser mana pun.
const NOTIF_PAGE_SIZE = 10; // default: 10 notifikasi terbaru per halaman
const LEAVE_DATE_FORMAT = { day: 'numeric', month: 'short', year: 'numeric' };

// Tipe notifikasi -> kunci teks i18n
const TEXT_KEY_BY_TYPE = {
  approved: 'notif.text.approved',
  'step-approved': 'notif.text.stepApproved',
  returned: 'notif.text.returned',
  rejected: 'notif.text.rejected',
  'leave-approval': 'notif.text.leaveApproval',
  'password-reset': 'notif.text.passwordReset',
  'sick-approved': 'notif.text.sickApproved',
  'sick-rejected': 'notif.text.sickRejected',
};

export default function Navbar({ toggleSidebar, user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, tRich, formatDate, locale } = useI18n();
  const [currentDate, setCurrentDate] = useState('');

  // Akun dev tidak punya data notifikasi, jadi polling-nya dilewati.
  const isDevAccount = isDevAccessUser(getCurrentUser());
  const notificationOwner = user?.username || user?.name || user?.nama || 'guest';
  const notificationsEnabled = notificationOwner !== 'guest' && !isDevAccount;

  const [showDropdown, setShowDropdown] = useState(false);
  const notificationRef = useRef(null);
  const showDropdownRef = useRef(false);

  // Popup mini dari lonceng -- HANYA untuk notifikasi BELUM DIBACA yang baru masuk.
  const bellButtonRef = useRef(null);
  const [bellToast, setBellToast] = useState(null); // { key, notification, extraCount }
  const [bellRingTick, setBellRingTick] = useState(0); // naik tiap ada notif baru -> ulang animasi lonceng & badge

  const [selectedResetNotif, setSelectedResetNotif] = useState(null);
  const [leaveModal, setLeaveModal] = useState(null); // { id, mode, type, params }
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    showDropdownRef.current = showDropdown;
  }, [showDropdown]);

  // Kunci lama (status dibaca di localStorage) sudah tidak dipakai -- bersihkan sekali.
  useEffect(() => {
    try {
      localStorage.removeItem(`read-leave-status-notifications:${notificationOwner}`);
    } catch { /* abaikan */ }
  }, [notificationOwner]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ada notifikasi belum dibaca yang baru: lonceng bergoyang; popup mini hanya bila dropdown tertutup.
  const handleNewUnread = useCallback((fresh) => {
    setBellRingTick((tick) => tick + 1);
    if (showDropdownRef.current) return;
    setBellToast({ key: Date.now(), notification: fresh[0], extraCount: fresh.length - 1 }); // urut terbaru dulu
  }, []);

  const notifications = useNotifications({
    enabled: notificationsEnabled,
    pageSize: NOTIF_PAGE_SIZE,
    onNewUnread: handleNewUnread,
  });

  // Ubah data server (type + params) menjadi teks & tanggal sesuai bahasa aktif.
  const resolveNotification = (notification) => {
    const params = notification.params || {};
    const textParams = {};
    let dateLine = null;

    switch (notification.type) {
      case 'approved':
      case 'rejected':
      case 'returned':
      case 'step-approved':
      case 'leave-approval': {
        textParams.leave = params.leaveType || t('notif.defaultLeaveType');
        if (notification.type === 'leave-approval') {
          textParams.name = params.requesterName || t('notif.defaultRequester');
        }
        if (notification.type === 'step-approved') {
          const roleKey = `notif.approverRole.${params.actorRole}`;
          const roleLabel = t(roleKey) === roleKey ? params.actorRole : t(roleKey);
          textParams.approver = t('notif.approverFormat', { role: roleLabel, name: params.actorName || '-' });
        }
        if (params.startDate && params.endDate) {
          dateLine = `${formatDate(`${params.startDate}T00:00:00`, LEAVE_DATE_FORMAT)} - ${formatDate(`${params.endDate}T00:00:00`, LEAVE_DATE_FORMAT)}`;
        }
        break;
      }
      case 'password-reset':
        textParams.name = params.employeeName || params.username || '';
        break;
      case 'sick-approved':
      case 'sick-rejected': {
        const daysCount = Number(params.daysCount) > 1 ? Number(params.daysCount) : 0;
        textParams.days = daysCount > 0 ? t('notif.days', { count: daysCount }) : '';
        if (params.attendanceDate) dateLine = formatDate(`${params.attendanceDate}T00:00:00`);
        break;
      }
      default:
        break;
    }

    const textKey = TEXT_KEY_BY_TYPE[notification.type];
    return {
      ...notification,
      text: textKey ? tRich(textKey, textParams) : '',
      date: dateLine || (notification.createdAt ? formatDate(notification.createdAt) : t('notif.dateUnavailable')),
    };
  };

  const items = notifications.items.map(resolveNotification);

  const handleProcessReset = (request) => {
    setSelectedResetNotif(null);
    setShowDropdown(false);
    navigate(`/karyawan?employeeId=${request.employeeId}&resetRequestId=${request.id}`);
  };

  // Tombol opsional di popup detail untuk atasan: pindah ke Pusat Persetujuan.
  const handleOpenApproval = (leaveRequestId) => {
    setLeaveModal(null);
    navigate(`/ApproveLeave?leaveRequestId=${encodeURIComponent(String(leaveRequestId))}`);
  };

  // Satu handler terpusat (config/notificationRoutes.js). Klik = otomatis ditandai dibaca
  // (jadi abu-abu & tidak memicu popup lagi), tetapi tetap bisa diklik kapan saja.
  const handleNotifClick = (notif) => {
    const action = getNotificationAction(notif);
    if (!notif.read) notifications.markRead(notif.id);
    if (!action) return;

    const params = notif.params || {};

    if (action.kind === 'leave-modal') {
      const leaveRequestId = params.leaveRequestId ?? notif.referenceId;
      if (!leaveRequestId) return;
      setShowDropdown(false);
      setLeaveModal({ id: leaveRequestId, mode: action.mode, type: notif.type, params });
      return;
    }

    if (action.kind === 'modal') {
      setSelectedResetNotif({
        id: params.requestId ?? notif.referenceId,
        userId: params.userId,
        username: params.username,
        email: params.email,
        employeeId: params.employeeId,
        employeeName: params.employeeName,
        position: params.position,
        divisiName: params.divisiName,
        requestedAt: params.requestedAt,
      });
      return;
    }

    const path = action.getPath?.(notif);
    if (!path) return;
    setShowDropdown(false);
    navigate(path);
  };

  // Aksesibilitas keyboard untuk item notifikasi (Enter / Spasi).
  const handleNotifKeyDown = (event, notif) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handleNotifClick(notif);
  };

  useEffect(() => {
    const formatIndonesiaDate = () => {
      const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
      const today = new Date().toLocaleDateString(locale, options);
      setCurrentDate(today);
    };

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    formatIndonesiaDate();
    window.addEventListener('resize', handleResize);
    const timer = setInterval(formatIndonesiaDate, 3600000);

    return () => {
      clearInterval(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [locale]); // [UBAH] ikut bahasa terpilih

  const getSubHeaderTitle = () => {
    if (isDevAccessPath(location.pathname)) return t('navbar.subtitle.featureSettings');

    switch (location.pathname) {
      case '/':
      case '/dashboard': return t('navbar.subtitle.dashboard');
      case '/ApplyCuti': return t('navbar.subtitle.applyLeave');
      case '/history-cuti': return t('navbar.subtitle.leaveHistory');
      case '/absensi': return t('navbar.subtitle.attendance');
      case '/karyawan': return t('navbar.subtitle.employees');
      case '/approval-cuti': return t('navbar.subtitle.approvalList');
      case '/reject-cuti': return t('navbar.subtitle.rejectList');
      case '/return-cuti': return t('navbar.subtitle.returnList');
      default: return t('navbar.subtitle.default');
    }
  };

  return (
    <header className="navbar-header">
      {isMobile && (
        <button className="btn-hamburger" onClick={toggleSidebar}>
          <i className="fa-solid fa-bars"></i>
        </button>
      )}
      <div className="navbar-brand">
        <div className="navbar-title-container">
          <span className="badge-sims">SIMS</span>
          <h1 className="navbar-title">SYS Indonesia Management System</h1>
        </div>
        <p className="navbar-subtitle">{getSubHeaderTitle()}</p>
      </div>

      <div className="navbar-actions">
        <span className="navbar-date">{currentDate}</span>

        {/* [BARU] Pemilih bahasa Indonesia / 日本語 */}
        <LanguageSwitcher />

        <div className="notification-container" ref={notificationRef}>
          <button
            ref={bellButtonRef}
            className="btn-notification"
            title={t('notif.bell')}
            onClick={() => {
              setBellToast(null);
              if (!showDropdown) notifications.refresh(); // segarkan saat dibuka
              setShowDropdown(!showDropdown);
            }}
          >
            <span key={`ring-${bellRingTick}`} className={`bell-icon${bellRingTick > 0 ? ' bell-icon--ring' : ''}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </span>
            {bellRingTick > 0 && <span key={`wave-${bellRingTick}`} className="bell-wave" aria-hidden="true" />}
            {notifications.unreadCount > 0 && (
              <span
                key={`badge-${bellRingTick}`}
                className={`notification-badge${bellRingTick > 0 ? ' notification-badge--pop' : ''}`}
              >
                {notifications.unreadCount > 99 ? '99+' : notifications.unreadCount}
              </span>
            )}
          </button>

          {/* Popup mini dari lonceng (hanya notifikasi belum dibaca yang baru masuk) */}
          {bellToast && !showDropdown && (
            <NotifBellToast
              key={bellToast.key}
              notification={resolveNotification(bellToast.notification)}
              extraCount={bellToast.extraCount}
              anchorRef={bellButtonRef}
              onOpen={() => {
                // Notifikasi tunggal -> langsung dibuka. Ada notifikasi lain (+N) atau
                // tipenya tak dikenal -> buka daftar.
                const target = bellToast.notification;
                const canOpenDirectly = bellToast.extraCount === 0 && getNotificationAction(target);
                setBellToast(null);
                if (canOpenDirectly) {
                  handleNotifClick(target);
                  return;
                }
                notifications.refresh();
                setShowDropdown(true);
              }}
              onClose={() => setBellToast(null)}
            />
          )}

          {showDropdown && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <span className="notification-header-title">{t('notif.latest')}</span>
                <button
                  className="btn-mark-read"
                  onClick={notifications.markAllRead}
                  disabled={notifications.unreadCount === 0}
                >
                  {t('notif.markRead')}
                </button>
              </div>
              <ul className="notification-list">
                {items.length === 0 ? (
                  <li className="notification-empty">{t('notif.empty')}</li>
                ) : (
                  items.map((notif) => {
                    const action = getNotificationAction(notif);
                    return (
                    <li
                      key={notif.id}
                      className={`notification-item${action ? ' notification-item--clickable' : ''}${notif.read ? ' notification-item--read' : ''}`}
                    >
                      {/* Area klik dipisah dari tombol "×" supaya tidak ada tombol di dalam tombol. */}
                      <div
                        className="notification-item__main"
                        role={action ? 'button' : undefined}
                        tabIndex={action ? 0 : undefined}
                        onClick={action ? () => handleNotifClick(notif) : undefined}
                        onKeyDown={action ? (event) => handleNotifKeyDown(event, notif) : undefined}
                      >
                      <div className="notification-icon-wrapper">
                        {notif.type === 'returned' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="9" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" fill="none"/>
                            <path d="M8 12h8M8 12l3-3m-3 3l3 3" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {(notif.type === 'approved' || notif.type === 'sick-approved') && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="2" fill="none"/>
                            <path d="M8 12l3 3 5-5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {notif.type === 'step-approved' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="#14b8a6" strokeWidth="2" fill="none"/>
                            <path d="M8 12l3 3 5-5" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {(notif.type === 'rejected' || notif.type === 'sick-rejected') && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2" fill="none"/>
                            <path d="M8.5 8.5l7 7m0-7l-7 7" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        )}
                        {notif.type === 'new' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="#3b82f6" strokeWidth="2" fill="none"/>
                            <circle cx="12" cy="12" r="4" fill="#3b82f6"/>
                          </svg>
                        )}
                        {notif.type === 'password-reset' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="#8b5cf6" strokeWidth="2" fill="none"/>
                            <circle cx="9" cy="12" r="2.2" stroke="#8b5cf6" strokeWidth="1.8" fill="none"/>
                            <path d="M11 12h5m0 0v2m0-2v-2" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round"/>
                          </svg>
                        )}
                        {notif.type === 'leave-approval' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <rect x="3" y="4" width="18" height="17" rx="2" stroke="#0284c7" strokeWidth="2"/>
                            <path d="M3 9h18M8 2v4M16 2v4" stroke="#0284c7" strokeWidth="2" strokeLinecap="round"/>
                            <circle cx="12" cy="14.5" r="1.6" fill="#0284c7"/>
                          </svg>
                        )}
                      </div>

                      <div className="notification-content">
                        <p className="notification-text">{notif.text}</p>
                        <span className="notification-time">{notif.date}</span>
                        {action && (
                          <span className={`notification-action-hint notification-action-hint--${action.tone}`}>
                            {t(action.hintKey)}
                          </span>
                        )}
                      </div>
                      </div>{/* /notification-item__main */}

                      {notif.read ? (
                        <button
                          type="button"
                          className="notification-dismiss-btn"
                          aria-label={t('notif.dismiss')}
                          title={t('notif.dismiss')}
                          onClick={(e) => {
                            e.stopPropagation();
                            notifications.remove(notif.id);
                          }}
                        >
                          &times;
                        </button>
                      ) : (
                        <span className="notification-unread-dot" aria-hidden="true" />
                      )}
                    </li>
                    );
                  })
                )}
              </ul>

              {(notifications.totalPages > 1 || notifications.readCount > 0) && (
                <div className="notification-footer">
                  {notifications.totalPages > 1 && (
                    <div className="notification-pager">
                      <button
                        type="button"
                        className="notification-pager__btn"
                        disabled={notifications.page <= 0 || notifications.isLoading}
                        onClick={() => notifications.goToPage(notifications.page - 1)}
                      >
                        &lsaquo; {t('notif.prev')}
                      </button>
                      <span className="notification-pager__info">
                        {t('notif.page', { page: notifications.page + 1, total: notifications.totalPages })}
                      </span>
                      <button
                        type="button"
                        className="notification-pager__btn"
                        disabled={notifications.page >= notifications.totalPages - 1 || notifications.isLoading}
                        onClick={() => notifications.goToPage(notifications.page + 1)}
                      >
                        {t('notif.next')} &rsaquo;
                      </button>
                    </div>
                  )}
                  {notifications.readCount > 0 && (
                    <button type="button" className="notification-clear-read" onClick={notifications.removeAllRead}>
                      {t('notif.deleteRead')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      <NotifPasswordResetModal
        request={selectedResetNotif}
        onClose={() => setSelectedResetNotif(null)}
        onProcess={handleProcessReset}
      />

      {/* [BARU] Popup detail cuti langsung di halaman saat ini (menggantikan redirect ke halaman cuti lama) */}
      <NotifLeaveDetailModal
        target={leaveModal}
        onClose={() => setLeaveModal(null)}
        onOpenApproval={handleOpenApproval}
      />
    </header>
  );
}
