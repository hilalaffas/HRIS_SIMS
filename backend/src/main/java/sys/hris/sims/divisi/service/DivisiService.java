package sys.hris.sims.divisi.service;

import java.util.List;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.time.LocalTime;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sys.hris.sims.divisi.entity.Divisi;
import sys.hris.sims.divisi.repository.DivisiRepository;
import sys.hris.sims.divisi.entity.DivisiDaySchedule;
import sys.hris.sims.divisi.entity.DivisiShift;
import sys.hris.sims.shift.entity.Shift;
import sys.hris.sims.shift.repository.ShiftRepository;

@Service
public class DivisiService {

    private final DivisiRepository divisiRepository;
    private final ShiftRepository shiftRepository;

    public DivisiService(DivisiRepository divisiRepository, ShiftRepository shiftRepository) {
        this.divisiRepository = divisiRepository;
        this.shiftRepository = shiftRepository;
    }

    @Transactional
    public List<Divisi> getAll() {
        List<Divisi> divisions = divisiRepository.findAll();
        divisions.stream()
                .filter(divisi -> "SHIFTING".equals(divisi.getTipeDivisi()))
                .filter(divisi -> divisi.getShifts().stream().anyMatch(shift -> shift.getScheduleShiftId() == null))
                .forEach(divisi -> {
                    syncScheduleShifts(divisi);
                    divisiRepository.save(divisi);
                });
        return divisions;
    }

    public Divisi getById(Long id) {
        return divisiRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Divisi tidak ditemukan"));
    }

    // [UBAH] Validasi nama + tipe divisi sebelum simpan.
    @Transactional
    public Divisi create(Divisi divisi) {
        divisi.setNamaDivisi(cleanName(divisi.getNamaDivisi()));
        divisi.setTipeDivisi(normalizeTipe(divisi.getTipeDivisi()));
        normalizeShifts(divisi);
        normalizeRegularSchedule(divisi); // [BARU]
        Divisi saved = divisiRepository.save(divisi);
        syncScheduleShifts(saved);
        return divisiRepository.save(saved);
    }

    @Transactional
    public Divisi update(Long id, Divisi request) {
        Divisi divisi = getById(id);
        boolean replaceShiftCatalog = request.getShifts() != null || "REGULAR".equalsIgnoreCase(request.getTipeDivisi());
        divisi.setNamaDivisi(cleanName(request.getNamaDivisi()));
        divisi.setTipeDivisi(normalizeTipe(request.getTipeDivisi()));
        if (request.getShifts() != null) {
            divisi.getShifts().clear();
            divisi.getShifts().addAll(request.getShifts());
        }
        normalizeShifts(divisi);
        // [BARU] Jam reguler hanya diganti bila request membawanya. DataDivisi (edit nama/tipe)
        // tidak mengirim field ini, jadi jam yang sudah diatur tidak ter-reset ke 08:00 - 17:00.
        if (request.getRegularStartTime() != null || request.getRegularEndTime() != null) {
            divisi.setRegularStartTime(request.getRegularStartTime());
            divisi.setRegularEndTime(request.getRegularEndTime());
            mergeDaySchedules(divisi, request.getDaySchedules());
        }
        normalizeRegularSchedule(divisi);
        Divisi saved = divisiRepository.save(divisi);
        if (replaceShiftCatalog) syncScheduleShifts(saved);
        return divisiRepository.save(saved);
    }

    // [BARU] Jadwal khusus per hari diperbarui di tempat (per hari), bukan hapus-lalu-isi-ulang:
    // Hibernate menjalankan INSERT sebelum DELETE, sehingga mengganti baris hari yang sama akan
    // menabrak UNIQUE (divisi_id, day_of_week). Hari yang tidak lagi dikirim dihapus (orphanRemoval).
    private void mergeDaySchedules(Divisi divisi, List<DivisiDaySchedule> incoming) {
        List<DivisiDaySchedule> current = divisi.getDaySchedules();
        List<DivisiDaySchedule> requested = incoming == null ? List.of() : incoming;
        if (requested.stream().anyMatch(rule -> rule.getDayOfWeek() == null)) {
            throw new IllegalArgumentException("Jadwal khusus hanya dapat diatur untuk hari Senin sampai Jumat.");
        }
        Map<Integer, DivisiDaySchedule> byDay = new HashMap<>();
        current.forEach(rule -> byDay.put(rule.getDayOfWeek(), rule));
        Set<Integer> keptDays = new HashSet<>();
        for (DivisiDaySchedule rule : requested) {
            if (!keptDays.add(rule.getDayOfWeek())) continue; // duplikat ditolak di bawah
            DivisiDaySchedule target = byDay.get(rule.getDayOfWeek());
            if (target == null) {
                target = new DivisiDaySchedule();
                target.setDayOfWeek(rule.getDayOfWeek());
                target.setDivisi(divisi);
                current.add(target);
            }
            target.setStartTime(rule.getStartTime());
            target.setBreakStartTime(rule.getBreakStartTime());
            target.setBreakEndTime(rule.getBreakEndTime());
            target.setEndTime(rule.getEndTime());
        }
        current.removeIf(rule -> !keptDays.contains(rule.getDayOfWeek()));
        if (requested.size() != keptDays.size()) {
            throw new IllegalArgumentException("Satu hari hanya boleh memiliki satu jadwal khusus.");
        }
    }

    // [BARU] Validasi jam kerja divisi REGULAR. Divisi SHIFTING tidak memakai jadwal khusus hari.
    // Jam masuk < jam pulang (Regular tidak lintas hari); jadwal khusus: masuk < istirahat mulai <
    // istirahat selesai < pulang, hanya Senin-Jumat (Sabtu & Minggu tetap libur).
    private void normalizeRegularSchedule(Divisi divisi) {
        if (divisi.getRegularStartTime() == null || divisi.getRegularStartTime().isBlank()) divisi.setRegularStartTime("08:00");
        if (divisi.getRegularEndTime() == null || divisi.getRegularEndTime().isBlank()) divisi.setRegularEndTime("17:00");
        if (divisi.getDaySchedules() == null) divisi.setDaySchedules(new ArrayList<>());
        if (!"REGULAR".equals(divisi.getTipeDivisi())) {
            divisi.getDaySchedules().clear();
            return;
        }
        divisi.setRegularStartTime(divisi.getRegularStartTime().trim());
        divisi.setRegularEndTime(divisi.getRegularEndTime().trim());
        if (!validTime(divisi.getRegularStartTime()) || !validTime(divisi.getRegularEndTime())) {
            throw new IllegalArgumentException("Jam masuk dan jam pulang divisi Regular wajib diisi dengan format HH:mm.");
        }
        if (!LocalTime.parse(divisi.getRegularStartTime()).isBefore(LocalTime.parse(divisi.getRegularEndTime()))) {
            throw new IllegalArgumentException("Jam pulang divisi Regular harus lebih besar dari jam masuk.");
        }
        Set<Integer> usedDays = new HashSet<>();
        for (DivisiDaySchedule rule : divisi.getDaySchedules()) {
            if (rule.getDayOfWeek() == null || rule.getDayOfWeek() < 1 || rule.getDayOfWeek() > 5) {
                throw new IllegalArgumentException("Jadwal khusus hanya dapat diatur untuk hari Senin sampai Jumat.");
            }
            if (!usedDays.add(rule.getDayOfWeek())) {
                throw new IllegalArgumentException("Satu hari hanya boleh memiliki satu jadwal khusus.");
            }
            if (!validTime(rule.getStartTime()) || !validTime(rule.getBreakStartTime())
                    || !validTime(rule.getBreakEndTime()) || !validTime(rule.getEndTime())) {
                throw new IllegalArgumentException("Jam masuk, istirahat mulai, istirahat selesai, dan jam pulang jadwal khusus wajib diisi.");
            }
            LocalTime start = LocalTime.parse(rule.getStartTime());
            LocalTime breakStart = LocalTime.parse(rule.getBreakStartTime());
            LocalTime breakEnd = LocalTime.parse(rule.getBreakEndTime());
            LocalTime end = LocalTime.parse(rule.getEndTime());
            if (!(start.isBefore(breakStart) && breakStart.isBefore(breakEnd) && breakEnd.isBefore(end))) {
                throw new IllegalArgumentException("Urutan jam jadwal khusus harus: masuk, istirahat mulai, istirahat selesai, pulang.");
            }
            rule.setDivisi(divisi);
        }
    }

    private void syncScheduleShifts(Divisi divisi) {
        if (!"SHIFTING".equals(divisi.getTipeDivisi())) return;
        List<Shift> savedShifts = shiftRepository.findAllByDivisionIdOrderByDisplayOrderAsc(divisi.getId());
        for (int i = 0; i < divisi.getShifts().size(); i++) {
            DivisiShift detail = divisi.getShifts().get(i);
            Shift shift = null;
            if (detail.getScheduleShiftId() != null) {
                shift = savedShifts.stream()
                        .filter(candidate -> candidate.getShiftId().equals(detail.getScheduleShiftId()))
                        .findFirst().orElse(null);
            }
            if (shift == null) {
                shift = new Shift();
                String code = "D" + divisi.getId() + "_" + (i + 1);
                int suffix = i + 1;
                while (shiftRepository.existsByDivisionIdAndCode(divisi.getId(), code)) {
                    code = "D" + divisi.getId() + "_" + (i + 1) + "_" + suffix++;
                }
                shift.setCode(code);
            }
            shift.setName(detail.getName());
            shift.setStartTime(LocalTime.parse(detail.getStartTime()));
            shift.setEndTime(LocalTime.parse(detail.getEndTime()));
            shift.setDisplayOrder(i);
            shift.setDivisionId(divisi.getId());
            detail.setScheduleShiftId(shiftRepository.save(shift).getShiftId());
        }
    }

    private void normalizeShifts(Divisi divisi) {
        if (divisi.getShifts() == null) divisi.setShifts(new ArrayList<>());
        if (!"SHIFTING".equals(divisi.getTipeDivisi())) { divisi.getShifts().clear(); return; }
        int count = divisi.getShifts().size();
        if (count < 2 || count > 6) {
            throw new IllegalArgumentException("Mode Custom mendukung 2 sampai 6 shift.");
        }
        List<LocalTime> startTimes = new ArrayList<>();
        List<int[]> shiftIntervals = new ArrayList<>();
        for (int i = 0; i < divisi.getShifts().size(); i++) {
            DivisiShift shift = divisi.getShifts().get(i);
            if (shift.getName() == null || shift.getName().isBlank() || !validTime(shift.getStartTime()) || !validTime(shift.getEndTime()) || shift.getStartTime().equals(shift.getEndTime())) throw new IllegalArgumentException("Nama dan rentang jam shift wajib valid");
            int minutes = (LocalTime.parse(shift.getEndTime()).toSecondOfDay()
                    - LocalTime.parse(shift.getStartTime()).toSecondOfDay()
                    + 24 * 60 * 60) % (24 * 60 * 60) / 60;
            if (minutes <= 0) {
                throw new IllegalArgumentException("Durasi setiap shift Custom harus lebih dari 0 jam.");
            }
            LocalTime start = LocalTime.parse(shift.getStartTime());
            LocalTime end = LocalTime.parse(shift.getEndTime());
            startTimes.add(start);
            int startMinute = start.getHour() * 60 + start.getMinute();
            int endMinute = end.getHour() * 60 + end.getMinute();
            if (endMinute > startMinute) {
                shiftIntervals.add(new int[] { startMinute, endMinute });
            } else {
                shiftIntervals.add(new int[] { startMinute, 24 * 60 });
                shiftIntervals.add(new int[] { 0, endMinute });
            }
            shift.setName(shift.getName().trim()); shift.setDisplayOrder(i); shift.setDivisi(divisi);
        }
        long distinctStarts = startTimes.stream().distinct().count();
        if (distinctStarts != count) {
            throw new IllegalArgumentException("Jam masuk setiap shift harus berbeda.");
        }
        shiftIntervals.sort(Comparator.comparingInt(interval -> interval[0]));
        for (int i = 1; i < shiftIntervals.size(); i++) {
            if (shiftIntervals.get(i - 1)[1] > shiftIntervals.get(i)[0]) {
                throw new IllegalArgumentException("Jam shift tidak boleh saling bertabrakan atau tumpang tindih.");
            }
        }
    }

    private boolean validTime(String value) { return value != null && value.matches("([01]\\d|2[0-3]):[0-5]\\d"); }

    // [BARU]
    private String cleanName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Nama divisi wajib diisi");
        }
        return name.trim();
    }

    // [BARU] Kosong -> REGULAR; selain REGULAR/SHIFTING ditolak.
    private String normalizeTipe(String tipe) {
        if (tipe == null || tipe.isBlank()) {
            return "REGULAR";
        }
        String value = tipe.trim().toUpperCase();
        if (!value.equals("REGULAR") && !value.equals("SHIFTING")) {
            throw new IllegalArgumentException("Tipe divisi harus REGULAR atau SHIFTING");
        }
        return value;
    }

    public void delete(Long id) {
        divisiRepository.deleteById(id);
    }
}
