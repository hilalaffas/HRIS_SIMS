package sys.hris.sims.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    // [BARU] Folder upload dibaca dari storage.local.dir (default "uploads", sama seperti
    // sebelumnya) dan diubah ke path absolut -- supaya lokasi yang DIBACA di sini selalu
    // sama dengan lokasi yang DITULIS CloudinaryService.saveLocal(), apa pun working
    // directory-nya (terminal di /backend atau tombol Run VS Code dari root repo).
    @Value("${storage.local.dir:uploads}")
    private String localDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = "file:" + Paths.get(localDir).toAbsolutePath().normalize().toString().replace('\\', '/') + "/";
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(location);
    }
}
