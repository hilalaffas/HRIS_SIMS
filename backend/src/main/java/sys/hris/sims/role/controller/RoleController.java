package sys.hris.sims.role.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import sys.hris.sims.role.entity.Roles;
import sys.hris.sims.role.repository.RoleRepository;

/**
 * Endpoint referensi (read-only) untuk mengisi dropdown "Hak Akses Role" di
 * ModalDetailKaryawan.jsx.
 *
 * Dibuat karena sebelumnya pilihan role di form edit di-hardcode
 * ("MEMBER"/"HR"/"MANAGER") dan tidak cocok dengan role_name asli di database
 * (SUPER_ADMIN, HRD_Admin, HRD_Karyawan, Manager, SPV, Leader, Member),
 * sehingga field Role tidak pernah benar-benar bisa disimpan. Polanya sama
 * persis dengan DivisiController.
 */
@RestController
@RequestMapping("/api/roles")
public class RoleController {

    private final RoleRepository roleRepository;

    public RoleController(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    @GetMapping
    public ResponseEntity<List<Roles>> getAll() {
        return ResponseEntity.ok(roleRepository.findAll());
    }
}
