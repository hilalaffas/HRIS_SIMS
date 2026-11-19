# Tahap 1: Build aplikasi menggunakan Maven dan Java 25
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Tahap 2: Menjalankan aplikasi (hanya butuh JRE agar server Render lebih ringan)
FROM eclipse-temurin:25-jre
WORKDIR /app
# [BARU] Jalankan sebagai user biasa (bukan root) -- kalau ada celah RCE, dampaknya lebih kecil.
RUN groupadd --system app && useradd --system --gid app --home-dir /app app \
    && mkdir -p /app/uploads && chown -R app:app /app
COPY --from=build --chown=app:app /app/target/*.jar app.jar
USER app
EXPOSE 8080
# [UBAH] + ExitOnOutOfMemoryError (container restart bersih, bukan hidup setengah mati)
#        + UseG1GC & random-urandom (start lebih cepat, tidak macet menunggu entropy)
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-XX:+ExitOnOutOfMemoryError", "-XX:+UseG1GC", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]