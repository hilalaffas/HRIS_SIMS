import React from 'react';

// Satu baris input di form edit — otomatis textarea/text, dan terkunci (disabled)
// jika field tersebut tidak boleh diedit oleh role yang sedang login.
const ProfileFieldInput = ({ cfg, value, onChange, editable }) => (
  <div
    className={`info-group ${cfg.required ? 'emergency-contact' : ''} ${cfg.fullWidth ? 'info-group-full' : ''}`}
  >
    <label>
      {cfg.label}
      {!editable && <span className="field-lock-icon" title="Kolom ini dikunci untuk role Anda">🔒</span>}
    </label>
    {cfg.select ? (
      <select
        name={cfg.key}
        value={value}
        onChange={onChange}
        disabled={!editable}
        title={!editable ? 'Kolom ini dikunci untuk role Anda — hubungi admin/HR untuk perubahan' : undefined}
        className="form-input-profile"
      >
        <option value="" disabled>Pilih...</option>
        {cfg.options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    ) : cfg.textarea ? (
      <textarea
        name={cfg.key}
        value={value}
        onChange={onChange}
        disabled={!editable}
        rows="3"
        className="form-input-profile"
      />
    ) : (
      <input
        type="text"
        name={cfg.key}
        value={value}
        onChange={onChange}
        disabled={!editable}
        title={!editable ? 'Kolom ini dikunci untuk role Anda — hubungi admin/HR untuk perubahan' : undefined}
        className="form-input-profile"
      />
    )}
  </div>
);

export default ProfileFieldInput;
