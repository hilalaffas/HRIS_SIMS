import React from 'react';

const LeaveSummaryCard = ({ sisaCutiTahunan }) => {
  const tahunBerjalan = new Date().getFullYear();

  return (
    <div className="applycuti-cards-container">
      <div className="applycuti-card total-leave-card">
        <span className="applycuti-card-title">TOTAL SISA CUTI TAHUNAN</span>
        <div className="applycuti-card-value-container">
          <span className="applycuti-card-value">{sisaCutiTahunan}</span>
          <span className="applycuti-card-unit">Hari</span>
        </div>
        <span className="applycuti-card-footer">Dapat digunakan hingga 31 Des {tahunBerjalan}</span>
      </div>
    </div>
  );
};

export default LeaveSummaryCard;