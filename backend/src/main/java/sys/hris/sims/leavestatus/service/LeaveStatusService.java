package sys.hris.sims.leavestatus.service;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.leavestatus.entity.LeaveStatus;
import sys.hris.sims.leavestatus.repository.LeaveStatusRepository;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LeaveStatusService {

    private final LeaveStatusRepository statusCutiRepository;

    public List<LeaveStatus> getAllStatusCuti() {
        return statusCutiRepository.findAll();
    }

    public LeaveStatus getStatusCutiById(Long id) {
        return statusCutiRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Status cuti tidak ditemukan"));
    }

    public LeaveStatus createStatusCuti(LeaveStatus statusCuti) {
        return statusCutiRepository.save(statusCuti);
    }

    public LeaveStatus updateStatusCuti(Long id, LeaveStatus statusCutiBaru) {
        LeaveStatus statusCuti = getStatusCutiById(id);
        statusCuti.setStatusName(statusCutiBaru.getStatusName());
        return statusCutiRepository.save(statusCuti);
    }

    public void deleteStatusCuti(Long id) {
        LeaveStatus statusCuti = getStatusCutiById(id);
        statusCutiRepository.delete(statusCuti);
    }
}