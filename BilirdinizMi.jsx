import React, { useState, useEffect } from "react";
import { sb } from "./supabase";
import { shuffle } from "./utils";

const T = {
  navy: "#003366",
  text: "#2A3D3C",
  textSoft: "rgba(42,61,60,0.68)",
  accent: "#00A896",
  warm: "#FF8C00",
  surface: "#FFFFFF",
  border: "rgba(42,61,60,0.14)",
};

export default function BilirdinizMi() {
  const [pool, setPool] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    let alive = true;
    sb("germany_facts?select=*")
      .then((rows) => { if (alive) setPool(shuffle(rows)); })
      .catch(() => { if (alive) setPool([]); });
    return () => { alive = false; };
  }, []);

  const item = pool[idx];
  if (!item) return null;

  function next(e) {
    e.stopPropagation();
    setFlipped(false);
    setTimeout(() => setIdx((i) => (i + 1 < pool.length ? i + 1 : 0)), 260);
  }

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
          position: relative; width: 100%; min-height: 230px;
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
          {/* ---------- ÖN ÜZ ---------- */}
          <div style={{
            ...face,
            background: `linear-gradient(150deg, ${T.navy} 0%, #00284F 55%, #001F3D 100%)`,
            border: `1px solid rgba(255,140,0,0.35)`,
            textAlign: "center", alignItems: "center",
          }}>
            {/* qartal silueti */}
            <svg viewBox="0 0 120 74" width="104" height="64" style={{ marginBottom: 12, opacity: 0.95 }}>
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

            <div style={{
              fontSize: 11, fontWeight: 800, letterSpacing: 2.4,
              color: T.warm, marginBottom: 7,
            }}>
              QARTAL GÖZÜ
            </div>

            <div style={{
              fontFamily: "'Fraunces', serif", fontSize: 27, fontWeight: 700,
              color: "#F5F5DC", lineHeight: 1.18, marginBottom: 10,
            }}>
              BİLİRDİNİZ Mİ?
            </div>

            <p style={{
              margin: 0, fontSize: 13.5, lineHeight: 1.55,
              color: "rgba(245,245,220,0.82)", maxWidth: 330,
            }}>
              {item.question}
            </p>

            <div style={{
              marginTop: 15, fontSize: 11.5, fontWeight: 700,
              color: T.warm, letterSpacing: 0.5,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{
                width: 20, height: 20, borderRadius: "50%",
                border: `1.5px solid ${T.warm}`,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 11,
              }}>↻</span>
              Kartı çevir
            </div>
          </div>

          {/* ---------- ARXA ÜZ ---------- */}
          <div style={{
            ...face,
            transform: "rotateY(180deg)",
            background: T.surface,
            border: `1px solid ${T.border}`,
          }}>
            <div style={{
              fontSize: 10.5, fontWeight: 800, letterSpacing: 1.6,
              color: T.warm, marginBottom: 9,
            }}>
              🦅 CAVAB
            </div>

            <p style={{
              margin: "0 0 10px", fontSize: 15.5, fontWeight: 700,
              color: T.accent, lineHeight: 1.4,
            }}>
              {item.correct === "A" ? item.option_a : item.correct === "B" ? item.option_b : item.option_c}
            </p>

            <p style={{
              margin: 0, fontSize: 13.5, color: T.text, lineHeight: 1.65,
              maxHeight: 118, overflow: "auto",
            }}>
              {item.fact}
            </p>

            <div style={{
              marginTop: 14, display: "flex", gap: 8, alignItems: "center",
            }}>
              <button onClick={next} style={{
                flex: 1, padding: "10px 0", borderRadius: 9, border: "none",
                background: T.accent, color: "#fff",
                fontSize: 13.5, fontWeight: 800, cursor: "pointer",
              }}>
                Növbəti fakt →
              </button>
              <span style={{ fontSize: 10.5, color: T.textSoft, whiteSpace: "nowrap" }}>
                {item.category}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
