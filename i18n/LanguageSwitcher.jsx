import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "./LanguageContext";
import { LANGUAGES } from "./translations";

const T = { accent: "#00A896", navy: "#003366", border: "rgba(0,51,102,0.12)" };

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("touchstart", onClickOutside);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("touchstart", onClickOutside);
    };
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Dil seç"
        style={{
          display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 999,
          border: `1px solid ${T.border}`, background: "#fff", cursor: "pointer",
          fontSize: 13, fontWeight: 700, color: T.navy,
        }}
      >
        <span style={{ fontSize: 15, lineHeight: 1 }}>{current.flag}</span>
        <span>{current.code.toUpperCase()}</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 60,
          background: "#fff", borderRadius: 12, border: `1px solid ${T.border}`,
          boxShadow: "0 10px 28px rgba(0,51,102,0.14)", overflow: "hidden", minWidth: 150,
        }}>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px",
                border: "none", background: l.code === lang ? "rgba(0,168,150,0.08)" : "#fff",
                cursor: "pointer", fontSize: 13.5, fontWeight: l.code === lang ? 800 : 600,
                color: l.code === lang ? T.accent : T.navy, textAlign: "left",
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
