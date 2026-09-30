package sys.hris.sims.divisi.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import sys.hris.sims.divisi.entity.Divisi;
import sys.hris.sims.divisi.service.DivisiService;

import sys.hris.sims.activity_logs.service.ActivityLogService;
import sys.hris.sims.user.repository.UserRepository;
import sys.hris.sims.user.entity.User;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/divisi")
public class DivisiController {

    private final DivisiService divisiService;
    private final ActivityLogService activityLogService;
    private final UserRepository userRepository;

    public DivisiController(DivisiService divisiService, 
                            ActivityLogService activityLogService, 
                            UserRepository userRepository) {
        this.divisiService = divisiService;
        this.activityLogService = activityLogService;
        this.userRepository = userRepository;
    }

    private Long getCurrentUserId(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName());
        return user != null ? user.getUserId() : null;
    }

    @GetMapping
    public ResponseEntity<List<Divisi>> getAll() {
        return ResponseEntity.ok(divisiService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Divisi> getById(@PathVariable Long id) {
        return ResponseEntity.ok(divisiService.getById(id));
    }

    @PostMapping
    public ResponseEntity<Divisi> create(@RequestBody Divisi divisi, 
                                         Authentication authentication, 
                                         HttpServletRequest httpRequest) {
        Divisi created = divisiService.create(divisi);
        
        // Log aktivitas
        activityLogService.log(
            authentication.getName(),
            getCurrentUserId(authentication),
            "CREATE_DIVISI",
            "divisi",
            created.getId(),
            "Membuat divisi baru: " + created.getNamaDivisi() + " (" + created.getTipeDivisi() + ")",
            httpRequest
        );
        
        return ResponseEntity.ok(created); 
    }

    @PutMapping("/{id}")
    public ResponseEntity<Divisi> update(@PathVariable Long id, 
                                         @RequestBody Divisi divisi,
                                         Authentication authentication, 
                                         HttpServletRequest httpRequest) {
        Divisi updated = divisiService.update(id, divisi);
        
        // Log aktivitas
        activityLogService.log(
            authentication.getName(),
            getCurrentUserId(authentication),
            "UPDATE_DIVISI",
            "divisi",
            id,
            "Mengupdate divisi: " + updated.getNamaDivisi() + " (" + updated.getTipeDivisi() + ")",
            httpRequest
        );
        
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       Authentication authentication, 
                                       HttpServletRequest httpRequest) {
        divisiService.delete(id);
        
        // Log aktivitas
        activityLogService.log(
            authentication.getName(),
            getCurrentUserId(authentication),
            "DELETE_DIVISI",
            "divisi",
            id,
            "Menghapus divisi dengan ID: " + id,
            httpRequest
        );
        
        return ResponseEntity.noContent().build();
    }
}