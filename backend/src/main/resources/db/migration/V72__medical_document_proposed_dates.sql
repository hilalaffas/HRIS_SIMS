ALTER TABLE attendances
    ADD COLUMN document_start_date DATE,
    ADD COLUMN document_end_date DATE;
ALTER TABLE attendances ADD CONSTRAINT ck_document_proposed_dates
    CHECK ((document_start_date IS NULL AND document_end_date IS NULL)
        OR (document_start_date IS NOT NULL AND document_end_date IS NOT NULL
            AND document_end_date >= document_start_date));
