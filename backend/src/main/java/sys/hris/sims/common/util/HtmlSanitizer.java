package sys.hris.sims.common.util;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.safety.Safelist;

/**
 * [BARU] Membersihkan HTML dari editor rich-text berita sebelum disimpan.
 *
 * Alasan: konten berita dirender frontend lewat dangerouslySetInnerHTML. Tanpa
 * sanitasi, satu akun admin yang bocor (atau satu bug) cukup untuk menyisipkan
 * <script>/onerror= yang mencuri token milik semua pembaca. Sanitasi di backend
 * adalah lapisan utama; DOMPurify di frontend adalah lapisan kedua.
 *
 * Yang dipertahankan: format dasar editor (b, i, u, ul, ol, li, a, img, br, p, ...).
 * Yang dibuang: script, style, iframe, atribut on*, javascript: / data: URL,
 * tautan relatif.
 */
public final class HtmlSanitizer {

    private static final Safelist NEWS_SAFELIST = Safelist.relaxed()
            .addTags("s")
            .addAttributes("a", "target")
            .removeProtocols("a", "href", "ftp")
            .addProtocols("a", "href", "tel")
            // Semua tautan dipaksa rel aman (mencegah reverse tabnabbing).
            .addEnforcedAttribute("a", "rel", "noopener noreferrer");

    private static final Document.OutputSettings OUTPUT_SETTINGS =
            new Document.OutputSettings().prettyPrint(false);

    private HtmlSanitizer() {
    }

    public static String sanitizeNewsHtml(String html) {
        if (html == null) {
            return null;
        }
        return Jsoup.clean(html, "", NEWS_SAFELIST, OUTPUT_SETTINGS);
    }
}
