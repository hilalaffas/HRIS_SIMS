package sys.hris.sims.holiday.dto;

public class HolidaySyncResult {
    private int inserted;
    private int updated;
    private int skipped;

    public HolidaySyncResult(int inserted, int updated, int skipped) {
        this.inserted = inserted;
        this.updated = updated;
        this.skipped = skipped;
    }

    public int getInserted() { return inserted; }
    public int getUpdated() { return updated; }
    public int getSkipped() { return skipped; }
}