// src/i18n/locales/ja.js
// 日本語（ビジネス日本語）。方針:
//  - 利用者向けの案内文・エラー文は「です・ます」体＋「〜してください」「〜をお願いいたします」。
//  - ラベル・メニューは名詞止め（体言止め）で簡潔に。
//  - 用語は日本の人事・勤怠システムの標準表記に統一:
//      Cuti=休暇 / Cuti tahunan=年次有給休暇 / Pengajuan=申請 / Persetujuan=承認 /
//      Ditolak=却下 / Dikembalikan=差戻し / Absensi=勤怠 / Karyawan=従業員 /
//      Divisi=部署 / HRD=人事部 / Reset sandi=パスワード再設定
const ja = {
  // ===== 共通 =====
  'common.cancel': 'キャンセル',
  'common.confirm': '確認',
  'common.loading': '読み込み中...',

  // ===== 言語切替 =====
  'lang.label': '言語',
  'lang.switchTo': '言語を{language}に切り替える',

  // ===== サイドバー =====
  'sidebar.group.main': 'メインメニュー',
  'sidebar.group.settings': '設定',
  'sidebar.group.approval': '承認メニュー',
  'sidebar.group.hr': '人事システム',
  'sidebar.group.superAdmin': 'スーパー管理者',
  'sidebar.featureSettings': '機能設定',
  'sidebar.home': 'ホーム',
  'sidebar.myAttendance': 'マイ勤怠',
  'sidebar.requests': '各種申請',
  'sidebar.approvals': '承認',
  'sidebar.manageEmployees': '従業員管理（人事）',
  'sidebar.manageDivisionShift': '部署・シフト管理',
  'sidebar.reports': 'レポート',
  'sidebar.permissionApprovals': '病気・遅刻の承認',
  'sidebar.accountSettings': 'アカウント設定',
  'sidebar.editProfile': 'プロフィール編集',
  'sidebar.logout': 'ログアウト',
  'sidebar.unavailable': 'ご利用の権限ではまだ利用できません',

  // ===== ナビバー =====
  'navbar.subtitle.default': '管理システム',
  'navbar.subtitle.featureSettings': '機能設定',
  'navbar.subtitle.dashboard': 'ダッシュボード',
  'navbar.subtitle.applyLeave': '休暇申請フォーム',
  'navbar.subtitle.leaveHistory': '休暇履歴・承認状況の確認',
  'navbar.subtitle.attendance': '従業員勤怠記録',
  'navbar.subtitle.employees': '従業員データ管理',
  'navbar.subtitle.approvalList': '休暇承認一覧',
  'navbar.subtitle.rejectList': '休暇却下一覧',
  'navbar.subtitle.returnList': '休暇差戻し一覧',

  // ===== 通知 =====
  'notif.bell': '通知',
  'notif.latest': '最新の通知',
  'notif.markRead': '既読にする',
  'notif.empty': '新しい通知はありません',
  'notif.dismiss': '通知を削除',
  'notif.dateUnavailable': '日付なし',
  'notif.defaultLeaveType': '年次有給休暇',
  'notif.defaultRequester': '従業員',
  'notif.text.returned': 'ご申請の<b>{leave}</b>が<b>差し戻されました。</b>',
  'notif.text.approved': 'ご申請の<b>{leave}</b>が<b>承認されました。</b>',
  'notif.text.rejected': 'ご申請の<b>{leave}</b>が<b>却下されました。</b>',
  'notif.text.new': '従業員（{name}）より<b>{leave}</b>の新規申請があります。ご承認をお願いいたします。',
  'notif.text.stepApproved': 'ご申請の<b>{leave}</b>が<b>{approver}</b>により承認されました。',
  'notif.text.sickApproved': 'ご申請の<b>病気休暇{days}</b>が<b>承認されました。</b>',
  'notif.text.sickRejected': 'ご申請の<b>病気休暇{days}</b>が<b>却下されました。</b>',
  'notif.text.passwordReset': '従業員<b>{name}</b>より<b>パスワード再設定</b>の依頼がありました。',
  'notif.text.leaveApproval': '<b>{name}</b>より<b>{leave}</b>の申請があります。ご対応をお願いいたします。',
  'notif.days': '（{count}日間）',
  'notif.approverRole.LEADER': 'リーダー',
  'notif.approverRole.SPV': 'スーパーバイザー',
  'notif.approverRole.MANAGER': 'マネージャー',
  'notif.approverFormat': '{name} {role}',
  'notif.hint.process': 'クリックして対応する →',
  'notif.hint.detail': 'クリックして詳細を確認 →',
  'notif.hint.progress': 'クリックして進捗を確認 →',
  'notif.hint.note': 'クリックして差戻しコメントを確認 →',
  'notif.hint.reason': 'クリックして却下理由を確認 →',
  'notif.hint.attendance': 'クリックして勤怠画面で確認 →',
  'notif.toast.approved': '申請が承認されました',
  'notif.toast.stepApproved': '段階承認のお知らせ',
  'notif.toast.returned': '申請が差し戻されました',
  'notif.toast.rejected': '申請が却下されました',
  'notif.toast.new': '新規申請',
  'notif.toast.passwordReset': 'パスワード再設定の依頼',
  'notif.toast.sickApproved': '病気休暇が承認されました',
  'notif.toast.sickRejected': '病気休暇が却下されました',
  'notif.toast.justNow': 'たった今',
  'notif.toast.more': '他{count}件の通知',
  'notif.toast.close': '通知を閉じる',
  'notif.toast.default': '新着通知',

  // ===== ログアウト・セッション =====
  'logout.title': 'ログアウト',
  'logout.text': 'SIMSからログアウトしますか？',
  'session.title': 'セッション終了',
  'session.message': 'セキュリティ保護のため、セッションが終了いたしました。お手数ですが、再度ログインをお願いいたします。',
  'session.inactive': '1時間操作がなかったため、セッションが終了いたしました。お手数ですが、再度ログインをお願いいたします。',
  'session.ok': 'OK（再ログイン）',

  // ===== グローバルトースト =====
  'toast.welcomeBack': '{name}様、おかえりなさいませ。',
  'toast.loggedOut': 'ログアウトいたしました。',

  // ===== ログイン =====
  'login.subtitle': '従業員休暇管理情報システム',
  'login.username': 'ユーザー名',
  'login.usernamePlaceholder': 'ユーザー名を入力',
  'login.usernameLabel': 'ユーザー名',
  'login.password': 'パスワード',
  'login.passwordLabel': 'パスワード',
  'login.forgot': 'パスワードをお忘れですか？',
  'login.submit': 'ログイン',
  'login.fallbackError': 'ユーザー名またはパスワードが正しくありません。',
  'login.required': '{label}を入力してください。',
  'login.copyright': '© 2026 SYS Indonesia. All rights reserved.',
  'login.logoAlt': 'アプリケーションロゴ',
  'locked.title': 'アカウントが無効化されました',
  'locked.text': 'パスワードを3回連続で誤って入力されたため、アカウントを無効化いたしました。最大3営業日お待ちください。お急ぎの場合は、人事部まで直接ご連絡をお願いいたします。',
  'locked.back': 'ログイン画面に戻る',

  // ===== フッター =====
  'footer.copyright': '© {year} SYS Indonesia. All rights reserved.',
};

export default ja;
