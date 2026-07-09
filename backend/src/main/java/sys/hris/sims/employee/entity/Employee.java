package sys.hris.sims.employee.entity;

import jakarta.persistence.*;
import lombok.*;
import sys.hris.sims.divisi.entity.Divisi;
import sys.hris.sims.user.entity.User;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "employees")
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "employee_id")
    private Long employeeId;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "divisi_id", nullable = false)
    private Divisi divisi;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(name = "address")
    private String address;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Column(name = "gender", nullable = false, columnDefinition = "bpchar(1)")
    private String gender;

    @Column(name = "join_date")
    private LocalDate joinDate;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}