package sys.hris.sims.holiday.service;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import sys.hris.sims.holiday.dto.ExternalHolidayDto;
import sys.hris.sims.holiday.dto.HolidayRequest;
import sys.hris.sims.holiday.dto.HolidayResponse;
import sys.hris.sims.holiday.dto.HolidaySyncResult;
import sys.hris.sims.holiday.entity.Holiday;
import sys.hris.sims.holiday.repository.HolidayRepository;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HolidayService {

    private final HolidayRepository holidayRepository;
    private final RestTemplate restTemplate = createRestTemplate();

    private static final String PRIMARY_API = "https://api-hari-libur.vercel.app/api?year=%d";
    private static final String FALLBACK_API = "https://dayoffapi.vercel.app/api?year=%d";

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

    public HolidayResponse createHoliday(HolidayRequest request, Long createdBy) {
        if (holidayRepository.existsByDate(request.getDate())) {
            throw new RuntimeException("Tanggal " + request.getDate() + " sudah ada di daftar hari libur");
        }
        Holiday holiday = Holiday.builder()
                .name(request.getName()).date(request.getDate())
                .description(request.getDescription()).isNational(request.getIsNational())
                .createdBy(createdBy).build();
        return toResponse(holidayRepository.save(holiday));
    }

    public HolidayResponse updateHoliday(Long id, HolidayRequest request) {
        Holiday holiday = holidayRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Hari libur tidak ditemukan"));
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

    public HolidaySyncResult syncNationalHolidays(int year, Long createdBy) {
        List<ExternalHolidayDto> external = fetchFromExternalApi(year);
        int inserted = 0, updated = 0, skipped = 0;

        for (ExternalHolidayDto dto : external) {
            LocalDate date = LocalDate.parse(dto.getDate());
            Optional<Holiday> existing = holidayRepository.findByDate(date);
            try {
                if (existing.isEmpty()) {
                    Holiday holiday = Holiday.builder()
                            .name(dto.getDescription()).date(date)
                            .description(dto.getDescription()).isNational(true)
                            .createdBy(createdBy).build();
                    holidayRepository.save(holiday);
                    inserted++;
                } else if (!Boolean.TRUE.equals(existing.get().getIsNational())) {
                    Holiday holiday = existing.get();
                    holiday.setIsNational(true);
                    holidayRepository.save(holiday);
                    updated++;
                } else {
                    skipped++;
                }
            } catch (DataIntegrityViolationException e) {
                skipped++;
            }
        }
        return new HolidaySyncResult(inserted, updated, skipped);
    }

    private List<ExternalHolidayDto> fetchFromExternalApi(int year) {
        try {
            ApiHariLiburResponse res = restTemplate.getForObject(
                    String.format(PRIMARY_API, year), ApiHariLiburResponse.class);
            if (res != null && res.getData() != null && !res.getData().isEmpty()) {
                return res.getData();
            }
            throw new RuntimeException("Primary API kosong");
        } catch (Exception e) {
            try {
                ExternalHolidayDto[] fallback = restTemplate.getForObject(
                        String.format(FALLBACK_API, year), ExternalHolidayDto[].class);
                return fallback != null ? Arrays.asList(fallback) : List.of();
            } catch (Exception e2) {
                return List.of();
            }
        }
    }

    private HolidayResponse toResponse(Holiday holiday) {
        return new HolidayResponse(
                holiday.getHolidayId(), holiday.getName(), holiday.getDate(),
                holiday.getDescription(), holiday.getIsNational(),
                holiday.getCreatedBy(), holiday.getCreatedAt());
    }

    private static class ApiHariLiburResponse {
        private List<ExternalHolidayDto> data;
        public List<ExternalHolidayDto> getData() { return data; }
        public void setData(List<ExternalHolidayDto> data) { this.data = data; }
    }
}