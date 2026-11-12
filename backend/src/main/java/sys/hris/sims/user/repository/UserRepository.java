package sys.hris.sims.user.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sys.hris.sims.user.entity.User;


public interface UserRepository
        extends JpaRepository<User,Long>{

    User findByUsername(String username);

    // [BARU] Cek username tanpa membedakan huruf besar/kecil -- dipakai import karyawan (dev)
    boolean existsByUsernameIgnoreCase(String username);

    // [BARU] Penerima notifikasi berdasarkan nama role (tanpa membedakan huruf besar/kecil)
    @Query("select u from User u where upper(u.roleId.roleName) in :names")
    List<User> findByRoleNamesUpper(@Param("names") Collection<String> names);

}