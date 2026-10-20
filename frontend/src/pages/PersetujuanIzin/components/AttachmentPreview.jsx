// src/pages/PersetujuanIzin/components/AttachmentPreview.jsx
//
// [BARU] Pratinjau "Bukti Lampiran": gambar (klik = buka ukuran penuh di tab
// baru), PDF (kartu berkas), atau keadaan "belum dilampirkan".
import React, { useState } from 'react';
import { ExternalLink, FileText, ImageOff, Info, Paperclip } from 'lucide-react';
import './AttachmentPreview.css';

function FileRow({ attachment }) {
  return (
    <a className="pzn-file" href={attachment.url} target="_blank" rel="noreferrer">
      <Paperclip aria-hidden="true" />
      <span className="pzn-file__name">{attachment.fileName}</span>
      <ExternalLink className="pzn-file__open" aria-hidden="true" />
    </a>
  );
}

function AttachmentPreview({ attachment }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!attachment) {
    return (
      <div className="pzn-attach pzn-attach--empty">
        <Info aria-hidden="true" />
        <p>Surat belum dilampirkan (menyusul). Pengajuan tetap dapat diputuskan.</p>
      </div>
    );
  }

  const showImage = attachment.isImage && !imageFailed;

  return (
    <div className="pzn-attach">
      {showImage ? (
        <a className="pzn-attach__preview" href={attachment.url} target="_blank" rel="noreferrer" title="Buka ukuran penuh">
          <img
            src={attachment.url}
            alt={`Bukti lampiran ${attachment.fileName}`}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        </a>
      ) : (
        <div className="pzn-attach__fallback">
          {attachment.isPdf ? <FileText aria-hidden="true" /> : <ImageOff aria-hidden="true" />}
          <span>{attachment.isPdf ? 'Dokumen PDF' : 'Pratinjau tidak tersedia'}</span>
        </div>
      )}
      <FileRow attachment={attachment} />
    </div>
  );
}

export default React.memo(AttachmentPreview);
