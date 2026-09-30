package sys.hris.sims.shift.service;

import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sys.hris.sims.shift.dto.ShiftResponse;
import sys.hris.sims.shift.dto.ShiftUpdateRequest;
import sys.hris.sims.shift.entity.Shift;
import sys.hris.sims.shift.repository.ShiftRepository;

@Service
public class ShiftService {

    private final ShiftRepository shiftRepository;

    public ShiftService(ShiftRepository shiftRepository) {
        this.shiftRepository = shiftRepository;
    }

    public List<ShiftResponse> getAll() {
        return shiftRepository.findAllByOrderByDisplayOrderAsc()
                .stream()
                .map(ShiftResponse::from)
                .toList();
    }

    @Transactional
    public Shift updateHours(Long id, ShiftUpdateRequest request) {
        Shift shift = shiftRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Shift tidak ditemukan"));

        LocalTime start = parseTime(request.startTime(), "Jam mulai");
        LocalTime end = parseTime(request.endTime(), "Jam selesai");
        if (start.equals(end)) {
            throw new IllegalArgumentException("Jam mulai dan jam selesai tidak boleh sama");
        }

        shift.setStartTime(start);
        shift.setEndTime(end);
        return shiftRepository.save(shift);
    }

    private LocalTime parseTime(String value, String label) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(label + " wajib diisi");
        }
        try {
            return LocalTime.parse(value.trim());
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException(label + " tidak valid, gunakan format HH:mm");
        }
    }
}
