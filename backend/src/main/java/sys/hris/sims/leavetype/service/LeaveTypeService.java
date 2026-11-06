package sys.hris.sims.leavetype.service;

import lombok.RequiredArgsConstructor;
import sys.hris.sims.leavetype.entity.LeaveType;
import sys.hris.sims.leavetype.repository.LeaveTypeRepository;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LeaveTypeService {

    private final LeaveTypeRepository jenisCutiRepository;

    // [UBAH] Jenis sistem "Cuti hangus" tidak ditawarkan di form pengajuan cuti.
    public List<LeaveType> getAllJenisCuti() {
        return jenisCutiRepository.findAll().stream()
                .filter(type -> !Boolean.TRUE.equals(type.getForfeiture()))
                .toList();
    }

    public LeaveType getJenisCutiById(Long id) {
        return jenisCutiRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Jenis cuti tidak ditemukan"));
    }

    public LeaveType createJenisCuti(LeaveType jenisCuti) {
        return jenisCutiRepository.save(jenisCuti);
    }

    public LeaveType updateJenisCuti(Long id, LeaveType jenisCutiBaru) {
        LeaveType jenisCuti = getJenisCutiById(id);
        jenisCuti.setName(jenisCutiBaru.getName());
        jenisCuti.setQuotaMale(jenisCutiBaru.getQuotaMale());
        jenisCuti.setQuotaFemale(jenisCutiBaru.getQuotaFemale());
        return jenisCutiRepository.save(jenisCuti);
    }

    public void deleteJenisCuti(Long id) {
        LeaveType jenisCuti = getJenisCutiById(id);
        jenisCutiRepository.delete(jenisCuti);
    }
}