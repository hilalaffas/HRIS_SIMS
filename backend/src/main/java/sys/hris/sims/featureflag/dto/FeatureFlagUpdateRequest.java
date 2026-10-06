package sys.hris.sims.featureflag.dto;

// [BARU] Body PUT /api/feature-flags/{key}, contoh: { "enabled": false }.
// Boolean (bukan boolean) supaya field yang hilang terdeteksi sebagai null.
public record FeatureFlagUpdateRequest(Boolean enabled) {
}
