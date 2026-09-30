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

    // [UBAH] Validasi nama + tipe divisi sebelum simpan.
    public Divisi create(Divisi divisi) {
        divisi.setNamaDivisi(cleanName(divisi.getNamaDivisi()));
        divisi.setTipeDivisi(normalizeTipe(divisi.getTipeDivisi()));
        return divisiRepository.save(divisi);
    }

    public Divisi update(Long id, Divisi request) {
        Divisi divisi = getById(id);
        divisi.setNamaDivisi(cleanName(request.getNamaDivisi()));
        divisi.setTipeDivisi(normalizeTipe(request.getTipeDivisi()));
        return divisiRepository.save(divisi);
    }

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