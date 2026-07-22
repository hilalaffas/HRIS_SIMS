import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
// [UBAH] getRiwayatByUser (status akhir saja) diganti getMyApprovalTimeline
// (per-level Leader/SPV/Manager) supaya notifikasi bisa granular per approve.
import { getMyApprovalTimeline, getPendingApprovals, logDateText } from '../services/CutiService';
// [BARU] Untuk notifikasi permintaan reset sandi (lonceng HR Admin/Super Admin)
import { getPendingResetRequests, getPendingResetCount } from '../services/passwordResetService';
import { isHrAdmin, isSuperAdmin, isManagerOrSpv } from '../utils/roles';
import NotifPasswordResetModal from './NotifPasswordResetModal';
import NotifLeaveApprovalModal from './NotifLeaveApprovalModal'; // [BARU]
import './Navbar.css'; 

// [BARU] Backend belum punya tabel Notification (status read/unread persisten),
// jadi untuk notifikasi status cuti milik pengaju sendiri, "sudah dibaca"
// disimpan sementara di localStorage per user (key = username, satu-satunya
// identifier stabil yang ada di object user saat ini -- lihat authService.js).
// Supaya begitu ditandai dibaca, notif yang sama tidak muncul lagi terus.
const SEEN_NOTIF_PREFIX = 'sims_seen_leave_notif_';

function getSeenLeaveNotifIds(userKey) {
  try {
    return new Set(JSON.parse(localStorage.getItem(`${SEEN_NOTIF_PREFIX}${userKey}`) || '[]'));
  } catch {
    return new Set();
  }
}

function markLeaveNotifSeen(userKey, seenKeys) {
  if (!seenKeys || seenKeys.length === 0) return;
  const current = getSeenLeaveNotifIds(userKey);
  seenKeys.forEach((key) => current.add(key));
  try {
    localStorage.setItem(`${SEEN_NOTIF_PREFIX}${userKey}`, JSON.stringify([...current]));
  } catch {
    // localStorage penuh/diblokir browser -- notifikasi tetap tampil normal, cuma tidak persist
  }
}

// [UBAH] Sebelumnya cuma 1 notif per status akhir (approved/rejected/returned).
// Sekarang per-LEVEL: setiap kali Leader/SPV/Manager approve, pengaju dapat
// notif sendiri-sendiri -- teksnya otomatis beda tergantung siapa yang approve
// (dan Manager, karena selalu level terakhir di alur SIMS, jadi notif finalnya
// "Cuti Anda disetujui"). Reject/Return tetap 1 notif (langsung hentikan alur).
const ROLE_LABEL = { LEADER: 'Leader', SPV: 'SPV', MANAGER: 'Manager' };

function buildLeaveStepNotifText(role, approverName, action, jenis) {
  const roleLabel = ROLE_LABEL[role] || role;
  const name = approverName || 'Approver';

  if (action === 'APPROVED') {
    if (role === 'MANAGER') {
      // Manager = approver level terakhir (BRD 4.4) -> ini notif final "disetujui".
      return <><strong>{name}</strong> ({roleLabel}) telah menyetujui cuti <strong>{jenis}</strong> Anda. Cuti Anda <strong>disetujui.</strong></>;
    }
    const nextRole = role === 'LEADER' ? 'SPV' : 'Manager';
    return <><strong>{name}</strong> ({roleLabel}) telah menyetujui cuti <strong>{jenis}</strong> Anda. Menunggu persetujuan {nextRole}.</>;
  }
  if (action === 'REJECTED') {
    return <><strong>{name}</strong> ({roleLabel}) menolak pengajuan cuti <strong>{jenis}</strong> Anda.</>;
  }
  if (action === 'RETURNED') {
    return <><strong>{name}</strong> ({roleLabel}) mengembalikan pengajuan cuti <strong>{jenis}</strong> Anda untuk diperbaiki.</>;
  }
  return null;
}

// Tambahkan parameter object user untuk mengambil id data dari database/API
export default function Navbar({ toggleSidebar, user }) {
  const location = useLocation();
  const navigate = useNavigate(); // [BARU] untuk redirect ke /karyawan saat notif reset diproses
  const [currentDate, setCurrentDate] = useState('');
  
  // === BAGIAN TAMBAHAN NOTIFIKASI REAL-TIME DARI DATABASE (START) ===
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // [BARU] Notifikasi permintaan reset sandi -- terpisah dari notifikasi cuti
  // di atas karena sumber datanya beda (tabel password_reset_requests, bukan
  // riwayat cuti) dan hanya relevan untuk HR Admin / Super Admin.
  const [resetRequests, setResetRequests] = useState([]);
  const [selectedResetNotif, setSelectedResetNotif] = useState(null);
  const canSeeResetNotif = isHrAdmin(user) || isSuperAdmin(user);

  // [BARU] Notifikasi "ada cuti perlu diproses" -- ditujukan ke approver
  // (Leader/SPV/Manager) yang DIPILIH SPESIFIK oleh pemohon saat submit cuti
  // (lihat leaderEmployeeId/spvEmployeeId/managerEmployeeId di CutiService.js).
  // Sumber data: /api/cuti/approvals/my-task, yang backend-nya SUDAH otomatis
  // scoped ke employeeId approver yang sedang login -- jadi kalau Leader A,
  // SPV B, Manager C dipilih di satu pengajuan, masing-masing akan melihat
  // notifikasi ini di lonceng akun mereka sendiri saat login.
  const [leaveApprovalTasks, setLeaveApprovalTasks] = useState([]);
  const [selectedLeaveNotif, setSelectedLeaveNotif] = useState(null);
  const canSeeLeaveApprovalNotif = isManagerOrSpv(user); // true utk Leader, SPV, & Manager

  // State tambahan untuk mendeteksi layar handphone (mobile)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Normalisasi data user role
  // [UBAH] user.id TIDAK PERNAH ada di object user hasil login (lihat
  // authService.js -- cuma { username, role, name }), jadi userId di sini
  // selalu 'guest' dan bikin notifikasi status cuti pengaju tidak pernah
  // muncul. Diganti ke username, satu-satunya identifier stabil yang ada.
  const userKey = user?.username ?? 'guest';
  const userName = user?.nama || user?.name || 'Karyawan';

  useEffect(() => {
    const fetchNotificationFromDB = async () => {
      try {
        // [UBAH] Sebelumnya pakai getRiwayatByUser() yang cuma kasih status
        // AKHIR (approved/rejected/returned/pending) per cuti -- tidak bisa
        // tahu Leader sudah approve tapi SPV belum, dsb. Sekarang pakai
        // getMyApprovalTimeline() yang isinya approvalLogs per-level
        // (Leader/SPV/Manager), supaya bisa kasih notif setiap kali SATU
        // level approve -- bukan cuma sekali di akhir.
        const rawData = await getMyApprovalTimeline();

        if (!rawData || rawData.length === 0) {
          setNotifications([]);
          return;
        }

        const seenIds = getSeenLeaveNotifIds(userKey);
        const mappedNotifications = [];

        rawData.forEach((item) => {
          const jenisCutiNama = item.leaveType || 'Cuti';

          (item.approvalLogs || []).forEach((log) => {
            // PENDING (belum diproses level ini) tidak menghasilkan notif.
            if (!['APPROVED', 'REJECTED', 'RETURNED'].includes(log.action)) return;

            // [BARU] seenKey sekarang per-LEVEL (leaveRequestId + role + action),
            // bukan cuma per-cuti -- supaya notif "Leader approve" & "Manager
            // approve" pada cuti yang SAMA dianggap 2 notif terpisah, bukan 1.
            const seenKey = `${item.leaveRequestId}-${log.approverRole}-${log.action}`;
            if (seenIds.has(seenKey)) return;

            const text = buildLeaveStepNotifText(log.approverRole, log.approverName, log.action, jenisCutiNama);
            if (!text) return;

            // Type dipakai untuk ikon & hint klik -- direuse dari 3 tipe yang
            // sudah ada (approved/rejected/returned), teks yang membedakan
            // apakah itu approval per-level atau approval final.
            const notifType = log.action === 'APPROVED' ? 'approved' : log.action === 'REJECTED' ? 'rejected' : 'returned';

            mappedNotifications.push({
              id: seenKey,
              seenKey,
              text,
              date: logDateText(log.actedAt),
              type: notifType,
              rawDate: log.actedAt,
            });
          });

          // Catatan: notifikasi "ada pengajuan baru masuk" untuk atasan
          // (Leader/SPV/Manager) TIDAK ditangani di loop ini -- itu sepenuhnya
          // ditangani mekanisme leaveApprovalTasks di bawah (sumbernya
          // /api/cuti/approvals/my-task, sudah scoped per approver).
        });

        // Notifikasi terbaru di atas
        mappedNotifications.sort((a, b) => new Date(b.rawDate || 0) - new Date(a.rawDate || 0));

        setNotifications(mappedNotifications);
      } catch (error) {
        console.error("Gagal memuat data notifikasi dari API:", error);
      }
    };

    if (userKey !== 'guest') {
      fetchNotificationFromDB();
    }
  }, [userKey, showDropdown]); // Berjalan otomatis setiap kali identitas user berubah atau dropdown dibuka
  // === BAGIAN TAMBAHAN NOTIFIKASI REAL-TIME DARI DATABASE (END) ===

  // === [BARU] NOTIFIKASI PERMINTAAN RESET SANDI (HR ADMIN / SUPER ADMIN) ===
  useEffect(() => {
    if (!canSeeResetNotif) return;

    let isMounted = true;

    const fetchResetRequests = async () => {
      try {
        const data = await getPendingResetRequests();
        if (isMounted) setResetRequests(data || []);
      } catch (error) {
        console.error('Gagal memuat notifikasi permintaan reset sandi:', error);
      }
    };

    fetchResetRequests();
    // Polling ringan tiap 30 detik supaya badge lonceng ikut update tanpa
    // HR harus buka-tutup dropdown-nya sendiri.
    const intervalId = setInterval(fetchResetRequests, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [canSeeResetNotif]);

  // Notifikasi reset sandi diubah ke bentuk yang sama dengan `notifications`
  // (cuti) supaya bisa dirender dalam satu daftar & satu badge jumlah.
  const resetNotifications = resetRequests.map((req) => ({
    id: `reset-${req.id}`,
    text: (
      <>
        Karyawan <strong>{req.employeeName || req.username}</strong> meminta{' '}
        <strong>reset sandi.</strong>
      </>
    ),
    date: req.requestedAt
      ? new Date(req.requestedAt).toLocaleDateString('id-ID', {
          day: 'numeric', month: 'long', year: 'numeric',
        })
      : '-',
    type: 'password-reset',
    raw: req,
  }));

  const handleProcessReset = (request) => {
    setSelectedResetNotif(null);
    setShowDropdown(false);
    // Arahkan ke halaman Karyawan sambil bawa employeeId & resetRequestId
    // lewat query string -- Karyawan.jsx yang akan otomatis membuka modal
    // edit untuk karyawan bersangkutan (lihat Karyawan.jsx).
    navigate(`/karyawan?employeeId=${request.employeeId}&resetRequestId=${request.id}`);
  };
  // === [BARU] AKHIR BAGIAN NOTIFIKASI RESET SANDI ===

  // === [BARU] NOTIFIKASI "CUTI PERLU DIPROSES" (LEADER / SPV / MANAGER) ===
  useEffect(() => {
    if (!canSeeLeaveApprovalNotif) return;

    let isMounted = true;

    const fetchLeaveApprovalTasks = async () => {
      try {
        const data = await getPendingApprovals();
        if (isMounted) setLeaveApprovalTasks(data || []);
      } catch (error) {
        console.error('Gagal memuat notifikasi cuti perlu diproses:', error);
      }
    };

    fetchLeaveApprovalTasks();
    // Polling ringan tiap 30 detik, sama seperti notifikasi reset sandi.
    const intervalId = setInterval(fetchLeaveApprovalTasks, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [canSeeLeaveApprovalNotif]);

  const leaveApprovalNotifications = leaveApprovalTasks.map((task) => ({
    id: `leave-${task.id}`,
    text: (
      <>
        <strong>{task.karyawan?.nama}</strong> mengajukan{' '}
        <strong>{task.jenisCuti}</strong>, perlu diproses.
      </>
    ),
    date: task.submittedAt
      ? new Date(task.submittedAt).toLocaleDateString('id-ID', {
          day: 'numeric', month: 'long', year: 'numeric',
        })
      : '-',
    type: 'leave-approval',
    raw: task,
  }));

  const handleProcessLeaveApproval = (task) => {
    setSelectedLeaveNotif(null);
    setShowDropdown(false);
    // Arahkan ke halaman Approve Cuti sambil bawa leaveRequestId lewat query
    // string -- ApproveLeave.jsx yang akan otomatis membuka detail
    // pengajuan cuti yang bersangkutan (lihat ApproveLeave.jsx).
    navigate(`/ApproveLeave?leaveRequestId=${task.id}`);
  };
  // === [BARU] AKHIR BAGIAN NOTIFIKASI CUTI PERLU DIPROSES ===

  // Gabungan SEMUA jenis notifikasi jadi satu daftar/satu badge angka.
  const allNotifications = [...leaveApprovalNotifications, ...resetNotifications, ...notifications];

  const handleNotifClick = (notif) => {
    if (notif.type === 'password-reset') {
      setSelectedResetNotif(notif.raw);
    } else if (notif.type === 'leave-approval') {
      setSelectedLeaveNotif(notif.raw);
    } else if (['approved', 'rejected', 'returned'].includes(notif.type)) {
      // [BARU] Klik notifikasi status cuti sendiri -> tandai sudah dibaca
      // (tidak muncul lagi) & langsung ke halaman Cuti Saya.
      markLeaveNotifSeen(userKey, [notif.seenKey]);
      setNotifications((prev) => prev.filter((n) => n.seenKey !== notif.seenKey));
      setShowDropdown(false);
      navigate('/ApplyCuti');
    }
  };

  // Effect untuk meng-update tanggal secara otomatis dalam format Indonesia & Deteksi ukuran layar
  useEffect(() => {
    const formatIndonesiaDate = () => {
      const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
      const today = new Date().toLocaleDateString('id-ID', options);
      setCurrentDate(today);
    };

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768); // Batas ukuran handphone, bisa diganti sesuai kebutuhan (misal 480 atau 768)
    };

    formatIndonesiaDate();
    window.addEventListener('resize', handleResize);
    const timer = setInterval(formatIndonesiaDate, 3600000); 
    
    return () => {
      clearInterval(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const getSubHeaderTitle = () => {
    switch (location.pathname) {
      case '/':
      case '/dashboard': return 'Dashboard Utama';
      case '/ApplyCuti': return 'Formulir Pengajuan Cuti Baru';
      case '/history-cuti': return 'Riwayat & Pelacakan Alur Cuti';
      case '/absensi': return 'Pencatatan Absensi Karyawan';
      case '/karyawan': return 'Manajemen Data Karyawan';
      case '/approval-cuti': return 'Daftar Approval Cuti';
      case '/reject-cuti': return 'Daftar Reject Cuti';
      case '/return-cuti': return 'Daftar Return Cuti';
      default: return 'Management System';
    }
  };

  return (
    <header className="navbar-header">
      {/* DIEDIT: Tombol Hamburger hanya dirender jika diakses melalui handphone/mobile (lebar layar <= 768px) */}
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
        
        <div className="notification-container">
          <button 
            className="btn-notification" 
            title="Notifikasi"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            {allNotifications.length > 0 && (
              <span className="notification-badge">{allNotifications.length}</span>
            )}
          </button>

          {/* DROPDOWN PANEL NOTIFIKASI DISESUAIKAN PERSIS SEPERTI GAMBAR */}
          {showDropdown && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <span className="notification-header-title">Notifikasi Terbaru</span>
                <button
                  className="btn-mark-read"
                  onClick={() => {
                    // [UBAH] Sebelumnya cuma setNotifications([]) -- hilang lagi
                    // begitu dropdown dibuka ulang (langsung fetch ulang & muncul
                    // lagi). Sekarang benar-benar dipersist ke localStorage.
                    markLeaveNotifSeen(userKey, notifications.map((n) => n.seenKey));
                    setNotifications([]);
                  }}
                >
                  Tandai dibaca
                </button>
              </div>
              <ul className="notification-list">
                {allNotifications.length === 0 ? (
                  <li className="notification-empty">Tidak ada notifikasi baru</li>
                ) : (
                  allNotifications.map(notif => (
                    <li
                      key={notif.id}
                      className="notification-item"
                      onClick={() => handleNotifClick(notif)}
                      style={['password-reset', 'leave-approval', 'approved', 'rejected', 'returned'].includes(notif.type) ? { cursor: 'pointer' } : undefined}
                    >
                      <div className="notification-icon-wrapper">
                        {notif.type === 'returned' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="icon-svg-returned">
                            <circle cx="12" cy="12" r="9" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" fill="none"/>
                            <path d="M8 12h8M8 12l3-3m-3 3l3 3" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {notif.type === 'approved' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="icon-svg-approved">
                            <circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="2" fill="none"/>
                            <path d="M8 12l3 3 5-5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        {/* [BARU] Ikon khusus notifikasi cuti ditolak, sebelumnya tidak pernah ada */}
                        {notif.type === 'rejected' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="icon-svg-rejected">
                            <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2" fill="none"/>
                            <path d="M9 9l6 6m0-6l-6 6" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        )}
                        {notif.type === 'new' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="icon-svg-new">
                            <circle cx="12" cy="12" r="10" stroke="#3b82f6" strokeWidth="2" fill="none"/>
                            <circle cx="12" cy="12" r="4" fill="#3b82f6"/>
                          </svg>
                        )}
                        {/* [BARU] Ikon khusus notifikasi permintaan reset sandi */}
                        {notif.type === 'password-reset' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="icon-svg-password-reset">
                            <circle cx="12" cy="12" r="10" stroke="#8b5cf6" strokeWidth="2" fill="none"/>
                            <circle cx="9" cy="12" r="2.2" stroke="#8b5cf6" strokeWidth="1.8" fill="none"/>
                            <path d="M11 12h5m0 0v2m0-2v-2" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round"/>
                          </svg>
                        )}
                        {/* [BARU] Ikon khusus notifikasi cuti perlu diproses */}
                        {notif.type === 'leave-approval' && (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="icon-svg-leave-approval">
                            <rect x="3" y="4" width="18" height="17" rx="2" stroke="#0284c7" strokeWidth="2"/>
                            <path d="M3 9h18M8 2v4M16 2v4" stroke="#0284c7" strokeWidth="2" strokeLinecap="round"/>
                            <circle cx="12" cy="14.5" r="1.6" fill="#0284c7"/>
                          </svg>
                        )}
                      </div>

                      <div className="notification-content">
                        <p className="notification-text">{notif.text}</p>
                        <span className="notification-time">{notif.date}</span>
                        {notif.type === 'password-reset' && (
                          <span className="notification-action-hint">Klik untuk memproses →</span>
                        )}
                        {notif.type === 'leave-approval' && (
                          <span className="notification-action-hint notification-action-hint_leave">Klik untuk memproses →</span>
                        )}
                        {/* [BARU] Hint klik untuk notif status cuti sendiri (approved/rejected/returned) */}
                        {['approved', 'rejected', 'returned'].includes(notif.type) && (
                          <span className="notification-action-hint">Klik untuk lihat →</span>
                        )}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

      </div>

      {/* [BARU] Modal detail notifikasi permintaan reset sandi */}
      <NotifPasswordResetModal
        request={selectedResetNotif}
        onClose={() => setSelectedResetNotif(null)}
        onProcess={handleProcessReset}
      />

      {/* [BARU] Modal detail notifikasi cuti perlu diproses */}
      <NotifLeaveApprovalModal
        request={selectedLeaveNotif}
        onClose={() => setSelectedLeaveNotif(null)}
        onProcess={handleProcessLeaveApproval}
      />
    </header>
  );
}