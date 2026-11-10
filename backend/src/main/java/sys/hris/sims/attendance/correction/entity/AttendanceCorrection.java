package sys.hris.sims.attendance.correction.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import jakarta.persistence.*;
import lombok.*;
import sys.hris.sims.employee.entity.Employee;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
@Entity @Table(name = "attendance_corrections")
public class AttendanceCorrection {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "correction_id")
    private Long correctionId;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "attendance_id", nullable = false, unique = true)
    private sys.hris.sims.attendance.entity.Attendance attendance;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @Column(name = "reason", nullable = false, length = 500)
    private String reason;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "review_note", length = 500)
    private String reviewNote;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() { if (createdAt == null) createdAt = LocalDateTime.now(); if (status == null) status = "PENDING"; }
}
