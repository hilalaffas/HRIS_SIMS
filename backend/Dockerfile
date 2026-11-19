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
# [UBAH] Hemat memori untuk container 512 MB (Render). Heap 75% + metaspace + thread + code cache
#        sebelumnya melewati batas 512 MiB -> container dimatikan ("Out of memory").
#        MaxRAMPercentage 75 -> 50 (sisakan ruang untuk memori non-heap), SerialGC (lebih hemat
#        daripada G1 untuk heap kecil), C1 saja (TieredStopAtLevel=1) + batas code cache & metaspace,
#        stack thread 512k. ExitOnOutOfMemoryError tetap: container restart bersih bila heap habis.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=50", "-XX:MaxMetaspaceSize=160m", "-XX:ReservedCodeCacheSize=48m", "-XX:TieredStopAtLevel=1", "-XX:+UseSerialGC", "-Xss512k", "-XX:+ExitOnOutOfMemoryError", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
