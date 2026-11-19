package sys.hris.sims;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone; // [BARU]

@SpringBootApplication
@EnableScheduling
public class SimsApplication {

	public static void main(String[] args) {
		// [BARU] Server Render berjalan di UTC. Paksa zona waktu JVM ke WIB sebelum Spring start,
		// supaya semua LocalDateTime.now() (log, notifikasi, cuti, lembur, dst) tercatat dalam WIB.
		TimeZone.setDefault(TimeZone.getTimeZone("Asia/Jakarta"));
		SpringApplication.run(SimsApplication.class, args);
	}

}
