package sys.hris.sims.divisi.service;

import java.util.List;

import org.springframework.stereotype.Service;

import sys.hris.sims.divisi.entity.Divisi;
import sys.hris.sims.divisi.repository.DivisiRepository;

@Service
public class DivisiService {

    private final DivisiRepository divisiRepository;

    public DivisiService(DivisiRepository divisiRepository) {
        this.divisiRepository = divisiRepository;
    }

    public List<Divisi> getAll() {
        return divisiRepository.findAll();
    }

    public Divisi getById(Long id) {
        return divisiRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Divisi tidak ditemukan"));
    }

    public Divisi create(Divisi divisi) {
        return divisiRepository.save(divisi);
    }

    public Divisi update(Long id, Divisi request) {
        Divisi divisi = getById(id);
        divisi.setNamaDivisi(request.getNamaDivisi());
        return divisiRepository.save(divisi);
    }

    public void delete(Long id) {
        divisiRepository.deleteById(id);
    }
}