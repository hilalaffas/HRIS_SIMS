package sys.hris.sims.employee.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import sys.hris.sims.employee.entity.EmergencyContactRelationship;
import sys.hris.sims.employee.repository.EmergencyContactRelationshipRepository;

/**
 * Endpoint referensi (read-only) untuk mengisi dropdown "Hubungan Kontak
 * Darurat" di FormKaryawan.jsx & ModalDetailKaryawan.jsx.
 *
 * Dibuat karena sebelumnya id hubungan (Orang Tua/Pasangan/dst) di-hardcode
 * manual di frontend dan TIDAK cocok dengan data asli di tabel
 * emergency_contact_relationships (lihat migration V16), sehingga field
 * "Hubungan" bisa tersimpan salah tanpa disadari. Polanya sama persis dengan
 * DivisiController.
 */
@RestController
@RequestMapping("/api/emergency-contact-relationships")
public class EmergencyContactRelationshipController {

    private final EmergencyContactRelationshipRepository relationshipRepository;

    public EmergencyContactRelationshipController(EmergencyContactRelationshipRepository relationshipRepository) {
        this.relationshipRepository = relationshipRepository;
    }

    @GetMapping
    public ResponseEntity<List<EmergencyContactRelationship>> getAll() {
        return ResponseEntity.ok(relationshipRepository.findAll());
    }
}
