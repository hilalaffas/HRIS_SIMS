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

import sys.hris.sims.divisi.entity.Divisi;
import sys.hris.sims.divisi.service.DivisiService;

@RestController
@RequestMapping("/api/divisi")
public class DivisiController {

    private final DivisiService divisiService;

    public DivisiController(DivisiService divisiService) {
        this.divisiService = divisiService;
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
    public ResponseEntity<Divisi> create(@RequestBody Divisi divisi) {
        return ResponseEntity.ok(divisiService.create(divisi));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Divisi> update(@PathVariable Long id, @RequestBody Divisi divisi) {
        return ResponseEntity.ok(divisiService.update(id, divisi));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        divisiService.delete(id);
        return ResponseEntity.noContent().build();
    }
}