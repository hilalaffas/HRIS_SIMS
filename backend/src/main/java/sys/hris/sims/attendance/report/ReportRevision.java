package sys.hris.sims.attendance.report;

import jakarta.persistence.*;
import lombok.Data;
import java.time.*;

@Entity
@Table(name = "attendance_report_revisions")
@Data
public class ReportRevision {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long employeeId;
    private LocalDate date;
    private boolean scheduleChange;
    private String beforeShift;
    private String afterShift;
    private String beforeStatus;
    private String afterStatus;
    @Column(length = 2000) private String beforeNote;
    @Column(length = 2000) private String afterNote;
    @Column(length = 1000) private String reason;
    private String editedBy;
    private String editorName;
    private LocalDateTime editedAt;
}
