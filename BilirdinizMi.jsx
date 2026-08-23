import React, { useState, useEffect } from "react";
import { sb } from "./supabase";
import { useLanguage } from "./i18n/LanguageContext";

const T = {
  navy: "#003366",
  text: "#2A3D3C",
  textSoft: "rgba(42,61,60,0.68)",
  accent: "#00A896",
  warm: "#FF8C00",
  surface: "#FFFFFF",
  border: "rgba(42,61,60,0.14)",
};

// Hər ziyarətçi üçün sabit təsadüfi toxum -> eyni gündə fərqli fakt
function visitorSeed() {
  try {
    let s = localStorage.getItem("factSeed");
    if (!s) {
      s = String(Math.floor(Math.random() * 100000));
      localStorage.setItem("factSeed", s);
    }
    return parseInt(s, 10) || 0;
  } catch {
    return 0;
  }
}

function dayNumber() {
  return Math.floor(Date.now() / 86400000);
}

export default function BilirdinizMi() {
  const { t, lang } = useLanguage();
  const [item, setItem] = useState(null);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    let alive = true;
    sb("daily_facts?select=*&order=id")
      .then((rows) => {
        if (!alive || !rows || rows.length === 0) return;
        const i = (dayNumber() + visitorSeed()) % rows.length;
        setItem(rows[i]);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!item) return null;

  const localizedTitle = (lang !== "az" && item[`title_${lang}`]) || item.title;
  const localizedFact = (lang !== "az" && item[`fact_${lang}`]) || item.fact;
  const localizedCategory = (lang !== "az" && item[`category_${lang}`]) || item.category;

  const face = {
    position: "absolute", inset: 0,
    backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
    borderRadius: 18, padding: "24px 22px",
    display: "flex", flexDirection: "column", justifyContent: "center",
    boxSizing: "border-box",
  };

  return (
    <div style={{ margin: "8px 0 4px" }}>
      <style>{`
        @keyframes bdmGlow {
          0%,100% { box-shadow: 0 6px 26px rgba(0,51,102,0.13); }
          50%     { box-shadow: 0 8px 34px rgba(255,140,0,0.22); }
        }
        .bdm-scene { perspective: 1400px; }
        .bdm-inner {
          position: relative; width: 100%; min-height: 250px;
          transition: transform .62s cubic-bezier(.22,.75,.28,1);
          transform-style: preserve-3d; cursor: pointer;
        }
        .bdm-inner.is-flipped { transform: rotateY(180deg); }
        .bdm-shell { border-radius: 18px; animation: bdmGlow 4.5s ease-in-out infinite; }
      `}</style>

      <div className="bdm-scene bdm-shell">
        <div
          className={`bdm-inner${flipped ? " is-flipped" : ""}`}
          onClick={() => setFlipped((v) => !v)}
        >
          <div style={{
            ...face,
            background: `linear-gradient(150deg, ${T.navy} 0%, #00284F 55%, #001F3D 100%)`,
            border: "1px solid rgba(255,140,0,0.35)",
            textAlign: "center", alignItems: "center",
          }}>
            <svg viewBox="0 0 120 74" width="100" height="62" style={{ marginBottom: 12 }}>
              <defs>
                <linearGradient id="bdmWing" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FF8C00" />
                  <stop offset="100%" stopColor="#D4AF37" />
                </linearGradient>
              </defs>
              <path d="M60 12 L67 27 L60 33 L53 27 Z" fill="url(#bdmWing)" />
              <path d="M53 27 C40 21, 22 20, 6 30 C22 30, 34 34, 47 42 C50 37, 51 32, 53 27 Z" fill="url(#bdmWing)" />
              <path d="M67 27 C80 21, 98 20, 114 30 C98 30, 86 34, 73 42 C70 37, 69 32, 67 27 Z" fill="url(#bdmWing)" />
              <path d="M60 33 L66 52 L60 66 L54 52 Z" fill="url(#bdmWing)" opacity="0.92" />
              <circle cx="60" cy="19" r="2.6" fill="#F5F5DC" />
            </svg>

            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2.4, color: T.warm, marginBottom: 7 }}>
              {t("qartal_gozu")}
            </div>

            <div style={{
              fontFamily: "'Fraunces', serif", fontSize: 27, fontWeight: 700,
              color: "#F5F5DC", lineHeight: 1.18, marginBottom: 12,
            }}>
              {t("bilirdiniz_mi")}
            </div>

            <p style={{
              margin: 0, fontSize: 15, lineHeight: 1.5, fontWeight: 600,
              color: "rgba(245,245,220,0.92)", maxWidth: 340,
            }}>
              {localizedTitle}
            </p>

            <div style={{
              marginTop: 16, fontSize: 11.5, fontWeight: 700,
              color: T.warm, letterSpacing: 0.5,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{
                width: 20, height: 20, borderRadius: "50%",
                border: `1.5px solid ${T.warm}`,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 11,
              }}>&#8635;</span>
              {t("flip_card")}
            </div>
          </div>

          <div style={{
            ...face,
            transform: "rotateY(180deg)",
            background: T.surface,
            border: `1px solid ${T.border}`,
          }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.6, color: T.warm, marginBottom: 10 }}>
              &#129413; {(localizedCategory || t("fact_fallback_category")).toUpperCase()}
            </div>

            <p style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: T.navy, lineHeight: 1.4 }}>
              {localizedTitle}
            </p>

            <p style={{ margin: 0, fontSize: 13.5, color: T.text, lineHeight: 1.68, maxHeight: 130, overflow: "auto" }}>
              {localizedFact}
            </p>

            <div style={{
              marginTop: 14, paddingTop: 11, borderTop: `1px solid ${T.border}`,
              fontSize: 11.5, color: T.textSoft, display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ color: T.accent, fontWeight: 700 }}>&#9679;</span>
              {t("next_fact_tomorrow")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
