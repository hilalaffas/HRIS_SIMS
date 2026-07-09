package sys.hris.sims.holiday.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import sys.hris.sims.holiday.dto.HolidayRequest;
import sys.hris.sims.holiday.dto.HolidayResponse;
import sys.hris.sims.holiday.entity.Holiday;
import sys.hris.sims.holiday.repository.HolidayRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HolidayService {

    private final HolidayRepository holidayRepository;

    public List<HolidayResponse> getAllHolidays() {
        return holidayRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<HolidayResponse> getHolidaysByRange(LocalDate start, LocalDate end) {
        return holidayRepository.findByDateBetweenOrderByDateAsc(start, end).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public List<HolidayResponse> getHolidaysByMonth(int year, int month) {
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
        return getHolidaysByRange(start, end);
    }

    public HolidayResponse createHoliday(HolidayRequest request, Long createdBy) {
        if (holidayRepository.existsByDate(request.getDate())) {
            throw new RuntimeException("Tanggal " + request.getDate() + " sudah ada di daftar hari libur");
        }

        Holiday holiday = Holiday.builder()
                .name(request.getName())
                .date(request.getDate())
                .description(request.getDescription())
                .isNational(request.getIsNational())
                .createdBy(createdBy)
                .build();

        return toResponse(holidayRepository.save(holiday));
    }

    public HolidayResponse updateHoliday(Long id, HolidayRequest request) {
        Holiday holiday = holidayRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Hari libur tidak ditemukan"));

        // cek kalau tanggal diubah, pastikan tidak duplikat
        if (!holiday.getDate().equals(request.getDate()) && holidayRepository.existsByDate(request.getDate())) {
            throw new RuntimeException("Tanggal " + request.getDate() + " sudah ada di daftar hari libur");
        }

        holiday.setName(request.getName());
        holiday.setDate(request.getDate());
        holiday.setDescription(request.getDescription());
        holiday.setIsNational(request.getIsNational());

        return toResponse(holidayRepository.save(holiday));
    }

    public void deleteHoliday(Long id) {
        Holiday holiday = holidayRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Hari libur tidak ditemukan"));
        holidayRepository.delete(holiday);
    }

    public boolean isHoliday(LocalDate date) {
        return holidayRepository.existsByDate(date);
    }

    private HolidayResponse toResponse(Holiday holiday) {
        return new HolidayResponse(
                holiday.getHolidayId(),
                holiday.getName(),
                holiday.getDate(),
                holiday.getDescription(),
                holiday.getIsNational(),
                holiday.getCreatedBy(),
                holiday.getCreatedAt()
        );
    }
}