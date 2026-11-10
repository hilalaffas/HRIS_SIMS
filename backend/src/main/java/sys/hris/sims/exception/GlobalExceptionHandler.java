package sys.hris.sims.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidationException(MethodArgumentNotValidException e) {
        Map<String, String> errors = new HashMap<>();
        e.getBindingResult().getFieldErrors().forEach(error ->
                errors.put(error.getField(), error.getDefaultMessage())
        );
        return ResponseEntity.badRequest().body(errors);
    }

    // [BARU] Pelanggaran constraint database (NOT NULL, UNIQUE, FK): detail SQL hanya masuk log server,
    // pengguna hanya menerima pesan umum agar nama tabel/kolom dan isi baris tidak bocor ke popup.
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> handleDataIntegrityViolation(DataIntegrityViolationException e) {
        log.error("Data integrity violation", e);
        return ResponseEntity
                .badRequest()
                .body("Data tidak dapat disimpan karena ada isian yang tidak lengkap atau sudah terdaftar. Silakan periksa kembali data Anda.");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> error(Exception e) {
        log.error("Unhandled exception", e);
        return ResponseEntity
                .badRequest()
                .body(e.getMessage());
    }
    

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<?> handleMaxSizeException(MaxUploadSizeExceededException exc) {
        return ResponseEntity.badRequest().body("Gagal: Ukuran file foto melebihi batas maksimal 1MB.");
    }
}