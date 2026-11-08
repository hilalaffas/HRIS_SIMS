// src/i18n/locales/jaHolidays.js
// Nama hari libur dari API publik (api-hari-libur / dayoffapi) berubah-ubah penulisannya, maka dipakai
// glosarium istilah (diterapkan di dalam kalimat) + pola. Juga nama divisi/jabatan umum (hanya cocok
// persis, agar kata umum seperti "tetap" tidak merusak kalimat lain).
export const holidayTerms = {
  'cuti bersama': '会社指定休日', 'libur nasional': '国民の祝日', 'hari libur nasional': '国民の祝日',
  'hari raya idul fitri': '断食明け大祭（イド・アル＝フィトル）', 'idul fitri': '断食明け大祭（イド・アル＝フィトル）', 'idulfitri': '断食明け大祭（イド・アル＝フィトル）',
  'hari raya idul adha': '犠牲祭（イド・アル＝アドハー）', 'idul adha': '犠牲祭（イド・アル＝アドハー）', 'iduladha': '犠牲祭（イド・アル＝アドハー）',
  'hari raya imlek': '旧正月（春節）', 'tahun baru imlek': '旧正月（春節）', imlek: '旧正月（春節）',
  'hari suci nyepi': 'ニュピ（静寂の日）', 'tahun baru saka': 'サカ暦新年', nyepi: 'ニュピ（静寂の日）',
  'hari raya waisak': 'ワイサック（仏誕祭）', waisak: 'ワイサック（仏誕祭）',
  'hari raya natal': 'クリスマス', natal: 'クリスマス', 'hari paskah': 'イースター（復活祭）', paskah: 'イースター（復活祭）',
  'wafat yesus kristus': 'キリスト受難日（聖金曜日）', 'kenaikan yesus kristus': 'キリスト昇天祭',
  'isra mikraj nabi muhammad saw': 'イスラ・ミラージュ（預言者ムハンマドの昇天）', 'isra miraj nabi muhammad saw': 'イスラ・ミラージュ（預言者ムハンマドの昇天）',
  "isra mi'raj nabi muhammad saw": 'イスラ・ミラージュ（預言者ムハンマドの昇天）', 'isra mi’raj nabi muhammad saw': 'イスラ・ミラージュ（預言者ムハンマドの昇天）',
  'maulid nabi muhammad saw': '預言者ムハンマド生誕祭', 'tahun baru islam': 'イスラム暦新年', 'tahun baru masehi': '元日（西暦新年）',
  'hari buruh internasional': 'メーデー（国際労働者の日）', 'hari buruh': 'メーデー', 'hari lahir pancasila': 'パンチャシラの日',
  'hari kemerdekaan republik indonesia': 'インドネシア共和国独立記念日', 'hari kemerdekaan ri': 'インドネシア独立記念日', 'hari kemerdekaan': '独立記念日',
  'hari pahlawan': '英雄の日', 'nabi muhammad saw': '預言者ムハンマド', hijriyah: 'ヒジュラ暦', kongzili: '孔子暦', 'hari raya': '祝祭日',
};

export const holidayPatterns = [
  [/^tahun baru (\d{4}) masehi$/i, '$1年 元日（西暦新年）'],
  [/^(.+?)\s*\(hari (\d+)\)$/i, '$1（$2日目）'],
];

// Hanya cocok persis (tidak dipakai sebagai glosarium dalam kalimat).
export const exactOnly = {
  tetap: '正社員', kontrak: '契約社員', magang: 'インターン', probasi: '試用期間', staf: 'スタッフ', 'karyawan tetap': '正社員',
  'karyawan kontrak': '契約社員', keuangan: '経理・財務', pemasaran: 'マーケティング', operasional: 'オペレーション',
  'teknologi informasi': '情報技術', 'sumber daya manusia': '人事', umum: '総務', produksi: '製造', penjualan: '営業', gudang: '倉庫',
  'layanan pelanggan': 'カスタマーサービス', hukum: '法務', pengadaan: '調達', 'riset dan pengembangan': '研究開発', teknik: '技術',
  direktur: '取締役', 'kepala divisi': '部長', manajer: 'マネージャー', penyelia: 'スーパーバイザー', 'staf administrasi': '事務スタッフ',
  akuntan: '会計担当', 'staf hrd': '人事スタッフ', 'direktur utama': '代表取締役', 'wakil direktur': '副取締役', 'kepala bagian': '課長',
  'manajer hrd': '人事マネージャー', 'staf keuangan': '経理スタッフ', 'staf it': 'ITスタッフ',
};
