package sys.hris.sims.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import sys.hris.sims.user.entity.User;


public interface UserRepository
        extends JpaRepository<User,Long>{

    User findByUsername(String username);

    // [BARU] Cek username tanpa membedakan huruf besar/kecil -- dipakai import karyawan (dev)
    boolean existsByUsernameIgnoreCase(String username);

}