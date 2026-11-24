package sys.hris.sims.holiday.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties; // [BARU]
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional; // [BARU]
import org.springframework.web.client.RestTemplate;
import sys.hris.sims.activity_logs.service.ActivityLogService; // [BARU]
import sys.hris.sims.holiday.dto.ExternalHolidayDto;
import sys.hris.sims.holiday.dto.HolidayRequest;
import sys.hris.sims.holiday.dto.HolidayResponse;
import sys.hris.sims.holiday.dto.HolidaySyncResult;
import sys.hris.sims.holiday.entity.Holiday;
import sys.hris.sims.holiday.repository.HolidayRepository;
import sys.hris.sims.leave.dto.LeaveDaysAdjustment; // [BARU]
import sys.hris.sims.leave.service.LeaveService; // [BARU]

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.TreeSet; // [BARU]
import java.util.function.Supplier; // [BARU]
import java.util.stream.Collectors;

@Slf4j // [BARU]
@Service
@RequiredArgsConstructor
public class HolidayService {

    private final HolidayRepository holidayRepository;
    private final LeaveService leaveService; // [BARU] hitung ulang total hari cuti saat libur berubah
    private final ActivityLogService activityLogService; // [BARU] catat perubahan total hari cuti
    private final RestTemplate restTemplate = createRestTemplate();

    // Refnusa serves SKB national holidays and joint leave without an API key.
    private static final String REFNUSA_API = "https://refnusa.dev/v1/holidays?year=%d";
    // [UBAH] Host primary diperbaiki: "api-harilibur" (tanpa tanda hubung antara "hari" dan "libur").
    // Responsnya array JSON langsung dengan field holiday_date / holiday_name.
    private static final String PRIMARY_API = "https://api-harilibur.vercel.app/api?year=%d";
    private static final String FALLBACK_API = "https://dayoffapi.vercel.app/api?year=%d";
    // [BARU] Sumber ketiga (hanya libur nasional resmi, belum tentu memuat cuti bersama).
    private static final String NAGER_API = "https://date.nager.at/api/v3/PublicHolidays/%d/ID";

    private static RestTemplate createRestTemplate() {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(5000);
        return new RestTemplate(factory);
    }

    public List<HolidayResponse> getAllHolidays() {
        return holidayRepository.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<HolidayResponse> getHolidaysByRange(LocalDate start, LocalDate end) {
        return holidayRepository.findByDateBetweenOrderByDateAsc(start, end).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    public List<HolidayResponse> getHolidaysByMonth(int year, int month) {
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
        return getHolidaysByRange(start, end);
    }

    @Transactional // [BARU] simpan libur + hitung ulang cuti dalam satu transaksi
    public HolidayResponse createHoliday(HolidayRequest request, Long createdBy) {
        if (holidayRepository.existsByDate(request.getDate())) {
            throw new RuntimeException("Tanggal " + request.getDate() + " sudah ada di daftar hari libur");
        }
        Holiday holiday = Holiday.builder()
                .name(request.getName()).date(request.getDate())
                .description(request.getDescription()).isNational(request.getIsNational())
                .createdBy(createdBy).build();
        HolidayResponse saved = toResponse(holidayRepository.save(holiday));
        recalculateLeaveDays(saved.getDate(), saved.getDate()); // [BARU]
        return saved;
    }

    @Transactional // [BARU]
    public HolidayResponse updateHoliday(Long id, HolidayRequest request) {
        Holiday holiday = holidayRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Hari libur tidak ditemukan"));
        if (!holiday.getDate().equals(request.getDate()) && holidayRepository.existsByDate(request.getDate())) {
            throw new RuntimeException("Tanggal " + request.getDate() + " sudah ada di daftar hari libur");
        }
        LocalDate oldDate = holiday.getDate(); // [BARU] tanggal lama ikut dihitung ulang bila dipindah
        holiday.setName(request.getName());
        holiday.setDate(request.getDate());
        holiday.setDescription(request.getDescription());
        holiday.setIsNational(request.getIsNational());
        HolidayResponse saved = toResponse(holidayRepository.save(holiday));
        recalculateLeaveDays(oldDate, oldDate); // [BARU]
        if (!oldDate.equals(saved.getDate())) {
            recalculateLeaveDays(saved.getDate(), saved.getDate());
        }
        return saved;
    }

    @Transactional // [BARU]
    public void deleteHoliday(Long id) {
        Holiday holiday = holidayRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Hari libur tidak ditemukan"));
        holidayRepository.delete(holiday);
        recalculateLeaveDays(holiday.getDate(), holiday.getDate()); // [BARU]
    }

    // [BARU] Dipakai HolidaySyncScheduler: sudah ada libur nasional di tahun ini?
    public boolean hasNationalHolidays(int year) {
        return holidayRepository.existsByIsNationalAndDateBetween(
                true, LocalDate.of(year, 1, 1), LocalDate.of(year, 12, 31));
    }

    public boolean isHoliday(LocalDate date) {
        return holidayRepository.existsByDate(date);
    }

    public HolidaySyncResult syncNationalHolidays(int year, Long createdBy) {
        List<ExternalHolidayDto> external = fetchFromExternalApi(year);
        int inserted = 0, updated = 0, skipped = 0;
        TreeSet<LocalDate> changedDates = new TreeSet<>(); // [BARU] tanggal libur yang baru/berubah

        if (external.isEmpty()) {
            log.warn("Sync libur nasional {}: semua API eksternal tidak mengembalikan data", year);
        }

        for (ExternalHolidayDto dto : external) {
            // [BARU] Lewati data tak valid (tanggal kosong/format salah) supaya satu baris
            // buruk tidak menggagalkan sync seluruh tahun.
            LocalDate date;
            try {
                date = parseFlexibleDate(dto.getDate()); // [UBAH] toleran terhadap "2026-01-1"
            } catch (Exception e) {
                skipped++;
                continue;
            }
            // [BARU] Abaikan data yang bukan tahun yang diminta.
            if (date.getYear() != year) {
                skipped++;
                continue;
            }
            // [BARU] Kolom name NOT NULL & maks 100 karakter.
            String holidayName = (dto.getDescription() == null || dto.getDescription().isBlank())
                    ? "Libur Nasional"
                    : dto.getDescription().trim();
            if (holidayName.length() > 100) holidayName = holidayName.substring(0, 100);
            Optional<Holiday> existing = holidayRepository.findByDate(date);
            try {
                if (existing.isEmpty()) {
                    Holiday holiday = Holiday.builder()
                            .name(holidayName).date(date) // [UBAH]
                            .description(holidayName).isNational(true)
                            .createdBy(createdBy).build();
                    holidayRepository.save(holiday);
                    changedDates.add(date); // [BARU]
                    inserted++;
                } else if (!Boolean.TRUE.equals(existing.get().getIsNational())) {
                    Holiday holiday = existing.get();
                    holiday.setIsNational(true);
                    holidayRepository.save(holiday);
                    changedDates.add(date); // [BARU]
                    updated++;
                } else {
                    skipped++;
                }
            } catch (DataIntegrityViolationException e) {
                skipped++;
            }
        }
        // [BARU] Libur baru bisa saja jatuh di rentang cuti yang sudah diajukan sebelum libur itu
        // ter-sync (mis. libur 2027 baru masuk bulan Agustus). Hitung ulang total hari cuti yang
        // beririsan. Sengaja TIDAK satu transaksi dengan sync: satu baris duplikat (constraint)
        // tidak boleh menggagalkan seluruh sync; kegagalan hitung ulang cukup dicatat di log.
        if (!changedDates.isEmpty()) {
            try {
                recalculateLeaveDays(changedDates.first(), changedDates.last());
            } catch (RuntimeException e) {
                log.error("Hitung ulang hari cuti setelah sync libur {} gagal: {}", year, e.getMessage(), e);
            }
        }
        return new HolidaySyncResult(inserted, updated, skipped);
    }

    // [BARU] Penyelarasan massal: hitung ulang SEMUA cuti PENDING/APPROVED (belum selesai) dari
    // hari ini sampai akhir tahun depan terhadap kalender libur saat ini. Dipanggil sekali saat
    // startup (HolidaySyncScheduler) supaya cuti yang diajukan sebelum libur ter-sync/ditambah
    // HRD ikut benar tanpa HRD menyimpan ulang libur satu per satu. Aman dijalankan berulang:
    // cuti yang totalnya sudah sesuai kalender tidak diubah. Satu transaksi: gagal = tidak ada
    // perubahan sama sekali.
    @Transactional
    public int recalculateUpcomingLeaveDays(LocalDate today) {
        int adjusted = recalculateLeaveDays(today, LocalDate.of(today.getYear() + 1, 12, 31));
        log.info("Penyelarasan hari cuti terhadap kalender libur selesai: {} pengajuan diperbarui", adjusted);
        return adjusted;
    }

    // [BARU] Hitung ulang total hari cuti PENDING/APPROVED yang beririsan dengan rentang tanggal libur
    // yang berubah, lalu catat setiap perubahan ke Log Sistem (aktor "System", IP "SYSTEM").
    private int recalculateLeaveDays(LocalDate from, LocalDate to) {
        List<LeaveDaysAdjustment> adjustments = leaveService.recalculateLeaveDaysForHolidayChange(from, to);
        for (LeaveDaysAdjustment adjustment : adjustments) {
            activityLogService.log("System", null, "RECALC_LEAVE_DAYS", "leave_requests",
                    adjustment.leaveRequestId(), adjustment.describe(), null);
        }
        if (!adjustments.isEmpty()) {
            log.info("{} pengajuan cuti dihitung ulang karena perubahan hari libur {} s/d {}",
                    adjustments.size(), from, to);
        }
        return adjustments.size();
    }

    // [UBAH] Mencoba beberapa sumber berurutan sampai ada yang mengembalikan data.
    private List<ExternalHolidayDto> fetchFromExternalApi(int year) {
        List<String> sourceNames = List.of("refnusa", "api-harilibur", "dayoffapi", "nager.date");
        List<Supplier<List<ExternalHolidayDto>>> sources = List.of(
                () -> fetchFromRefnusa(year),
                () -> fetchHolidayArray(String.format(PRIMARY_API, year)),
                () -> fetchHolidayArray(String.format(FALLBACK_API, year)),
                () -> fetchFromNager(year));

        for (int i = 0; i < sources.size(); i++) {
            try {
                List<ExternalHolidayDto> result = sources.get(i).get();
                if (!result.isEmpty()) {
                    log.info("Libur nasional {} diambil dari {} ({} data)", year, sourceNames.get(i), result.size());
                    return result;
                }
                log.warn("Sumber {} mengembalikan data kosong (tahun {})", sourceNames.get(i), year);
            } catch (Exception e) {
                log.warn("Sumber {} gagal (tahun {}): {}", sourceNames.get(i), year, e.getMessage());
            }
        }
        log.error("Semua sumber libur nasional gagal (tahun {})", year);
        return List.of();
    }

    // [BARU] API yang mengembalikan array JSON langsung.
    private List<ExternalHolidayDto> fetchHolidayArray(String url) {
        ExternalHolidayDto[] body = restTemplate.getForObject(url, ExternalHolidayDto[].class);
        return body != null ? Arrays.asList(body) : List.of();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record RefnusaResponse(Integer year, List<RefnusaHoliday> holidays) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record RefnusaHoliday(String date, String name, String type) {}

    private List<ExternalHolidayDto> fetchFromRefnusa(int year) {
        RefnusaResponse body = restTemplate.getForObject(String.format(REFNUSA_API, year), RefnusaResponse.class);
        if (body == null || body.year() == null || body.year() != year || body.holidays() == null)
            return List.of();
        return body.holidays().stream()
                .filter(h -> h != null && h.date() != null && h.name() != null && !h.name().isBlank())
                .filter(h -> "libur_nasional".equals(h.type()) || "cuti_bersama".equals(h.type()))
                .filter(h -> {
                    try { return LocalDate.parse(h.date()).getYear() == year; }
                    catch (RuntimeException invalidDate) { return false; }
                })
                .map(h -> {
                    ExternalHolidayDto dto = new ExternalHolidayDto();
                    dto.setDate(h.date());
                    dto.setDescription(("cuti_bersama".equals(h.type()) ? "Cuti Bersama " : "") + h.name().trim());
                    return dto;
                }).toList();
    }

    // [BARU] Nager.Date: field yang dipakai hanya "date" dan "localName".
    @JsonIgnoreProperties(ignoreUnknown = true)
    record NagerHolidayDto(String date, String localName) {}

    private List<ExternalHolidayDto> fetchFromNager(int year) {
        NagerHolidayDto[] body = restTemplate.getForObject(String.format(NAGER_API, year), NagerHolidayDto[].class);
        if (body == null) return List.of();
        return Arrays.stream(body).map(h -> {
            ExternalHolidayDto dto = new ExternalHolidayDto();
            dto.setDate(h.date());
            dto.setDescription(h.localName());
            return dto;
        }).collect(Collectors.toList());
    }

    // [BARU] Menerima "2026-01-01" maupun "2026-01-1" (sebagian API tidak memakai nol di depan).
    private LocalDate parseFlexibleDate(String raw) {
        String[] parts = raw.trim().split("-");
        return LocalDate.of(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]), Integer.parseInt(parts[2]));
    }

    private HolidayResponse toResponse(Holiday holiday) {
        return new HolidayResponse(
                holiday.getHolidayId(), holiday.getName(), holiday.getDate(),
                holiday.getDescription(), holiday.getIsNational(),
                holiday.getCreatedBy(), holiday.getCreatedAt());
    }
}
