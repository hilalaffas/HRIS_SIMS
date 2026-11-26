package sys.hris.sims.monitoring.service;

import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import jakarta.annotation.PreDestroy;
import sys.hris.sims.monitoring.entity.RequestEvent;
import sys.hris.sims.monitoring.repository.RequestEventRepository;

/**
 * [BARU] Menyimpan kejadian request ke database di thread terpisah supaya request pengguna TIDAK
 * menunggu proses tulis. Antrian dibatasi: bila penuh (database lambat/mati), kejadian dibuang dan
 * hanya dihitung -- pemantauan tidak boleh sampai membuat aplikasi ikut lambat atau error.
 */
@Component
public class RequestEventWriter {

    private static final Logger log = LoggerFactory.getLogger(RequestEventWriter.class);
    private static final int QUEUE_CAPACITY = 1000;

    private final RequestEventRepository repository;
    private final RequestMetrics metrics;
    private final ThreadPoolExecutor executor = new ThreadPoolExecutor(
            1, 1, 0L, TimeUnit.MILLISECONDS,
            new LinkedBlockingQueue<>(QUEUE_CAPACITY),
            runnable -> {
                Thread thread = new Thread(runnable, "request-event-writer");
                thread.setDaemon(true);
                return thread;
            },
            (task, pool) -> { /* antrian penuh: dibuang, dihitung di submit() */ });

    public RequestEventWriter(RequestEventRepository repository, RequestMetrics metrics) {
        this.repository = repository;
        this.metrics = metrics;
    }

    public void submit(RequestEvent event) {
        if (executor.getQueue().remainingCapacity() == 0) {
            metrics.recordDropped();
            return;
        }
        executor.execute(() -> {
            try {
                repository.save(event);
            } catch (Exception ex) {
                // Jangan pernah melempar: kegagalan pencatatan tidak boleh mengganggu apa pun.
                log.warn("Gagal menyimpan kejadian request: {}", ex.getMessage());
            }
        });
    }

    @PreDestroy
    void shutdown() {
        executor.shutdown();
    }
}
