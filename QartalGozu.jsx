import React, { useState, useEffect } from "react";
import { Bird } from "lucide-react";
import { sb } from "./supabase";

const CATS = [
  "Hamısı",
  "Gündəlik həyat",
  "Mədəniyyət və adətlər",
  "Şəhərlər və coğrafiya",
  "Dil maraqlıları",
  "İş və təhsil",
  "Tarix və ixtiralar",
];

// Brighter, more playful take on the brand palette
const C = {
  bg: "#12100C",
  card: "#1E1A14",
  cardBack: "#17251F",
  border: "rgba(0,168,150,0.30)",
  turq: "#00A896",
  turqBright: "#00A896",
  orange: "#FF8C00",
  orangeBright: "#FF8C00",
  text: "#FBF6EC",
  textSoft: "rgba(251,246,236,0.62)",
};

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function FactCard({ item, onNext }) {
  const [picked, setPicked] = useState(null);
  const options = [item.option_a, item.option_b, item.option_c];
  const correctIdx = { A: 0, B: 1, C: 2 }[item.correct] ?? 0;
  const revealed = picked !== null;
  const gotIt = picked === correctIdx;

  return (
    <div style={{
      background: revealed ? C.cardBack : C.card,
      border: `1px solid ${revealed ? C.turq : C.border}`,
      borderRadius: 18,
      padding: "22px 20px 20px",
      position: "relative",
      transition: "background .35s ease, border-color .35s ease",
      boxShadow: revealed ? `0 0 0 1px ${C.turq}22, 0 10px 34px rgba(0,0,0,0.35)` : "0 8px 26px rgba(0,0,0,0.28)",
    }}>
      {/* corner eagle mark */}
      <div style={{ position: "absolute", top: 14, right: 14, opacity: 0.5 }}>
        <Bird size={17} color={C.orange} />
      </div>

      <span style={{
        display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
        color: C.orange, background: "rgba(255,140,0,0.12)",
        border: "1px solid rgba(255,140,0,0.28)", borderRadius: 20,
        padding: "4px 11px", marginBottom: 14,
      }}>{item.category}</span>

      <p style={{
        fontSize: 16.5, lineHeight: 1.45, fontWeight: 600, color: C.text,
        margin: "0 0 16px", paddingRight: 20,
      }}>{item.question}</p>

      <div style={{ display: "grid", gap: 8 }}>
        {options.map((opt, i) => {
          const isCorrect = i === correctIdx;
          const isPicked = i === picked;
          let bg = "rgba(255,255,255,0.85)", bc = "rgba(251,246,236,0.14)", col = C.text;
          if (revealed && isCorrect) { bg = "rgba(0,168,150,0.16)"; bc = C.turq; col = C.turqBright; }
          else if (revealed && isPicked) { bg = "rgba(192,57,43,0.14)"; bc = "#C0392B"; col = "#E3A99E"; }
          else if (revealed) { col = C.textSoft; }
          return (
            <button key={i}
              onClick={() => !revealed && setPicked(i)}
              disabled={revealed}
              style={{
                textAlign: "left", padding: "12px 14px", borderRadius: 10,
                background: bg, border: `1px solid ${bc}`, color: col,
                fontSize: 14.5, cursor: revealed ? "default" : "pointer",
                transition: "all .2s ease", fontFamily: "inherit",
              }}>
              {revealed && isCorrect ? "✓ " : ""}{opt}
            </button>
          );
        })}
      </div>

      {revealed && (
        <div style={{
          marginTop: 16, padding: "14px 15px", borderRadius: 12,
          background: "rgba(255,140,0,0.09)", border: "1px solid rgba(255,140,0,0.25)",
        }}>
          <p style={{ margin: "0 0 6px", fontSize: 12.5, fontWeight: 800, color: C.orangeBright, letterSpacing: 0.3 }}>
            🦅 BİLİRDİNMİ?
          </p>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: C.text }}>{item.fact}</p>
          <p style={{ margin: "10px 0 0", fontSize: 12.5, color: gotIt ? C.turqBright : C.textSoft }}>
            {gotIt ? "Doğru tapdın!" : "Bu dəfə fərqli idi — indi bilirsən."}
          </p>
        </div>
      )}

      {revealed && (
        <button onClick={onNext} style={{
          marginTop: 14, width: "100%", padding: "13px 20px", borderRadius: 10,
          background: C.turq, color: "#0B0F0D", border: "none",
          fontSize: 14.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
        }}>Növbəti kart →</button>
      )}
    </div>
  );
}

function QartalGozu() {
  const [all, setAll] = useState(null);
  const [cat, setCat] = useState("Hamısı");
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);
  const [seen, setSeen] = useState(0);

  useEffect(() => {
    sb("germany_facts?select=*")
      .then((rows) => setAll(rows))
      .catch(() => setAll([]));
  }, []);

  useEffect(() => {
    if (!all) return;
    const pool = cat === "Hamısı" ? all : all.filter((r) => r.category === cat);
    setQueue(shuffleArr(pool));
    setIdx(0);
  }, [all, cat]);

  function next() {
    setSeen((s) => s + 1);
    setIdx((i) => (i + 1 < queue.length ? i + 1 : 0));
  }

  const current = queue[idx];

  return (
    <section style={{ maxWidth: 680, margin: "0 auto", padding: "0 4px 40px" }}>
      {/* header */}
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 9, marginBottom: 8,
        }}>
          <Bird size={26} color={C.orange} />
          <h2 style={{
            fontFamily: "'Fraunces', serif", fontSize: 25, margin: 0,
            color: C.text, letterSpacing: 0.2,
          }}>Qartal Gözü</h2>
        </div>
        <p style={{ margin: 0, fontSize: 13.5, color: C.textSoft, lineHeight: 1.5 }}>
          Almaniyanı yaxından tanı — qrammatika yox, real həyat.<br />
          Kartı seç, cavab ver, arxasındakı hekayəni öyrən.
        </p>
      </div>

      {/* category pills */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center", marginBottom: 20 }}>
        {CATS.map((c) => (
          <button key={c} onClick={() => setCat(c)}
            style={{
              padding: "7px 13px", borderRadius: 20, fontSize: 12.5, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
              background: cat === c ? C.orange : "rgba(255,255,255,0.85)",
              color: cat === c ? "#1A1206" : C.textSoft,
              border: `1px solid ${cat === c ? C.orange : "rgba(251,246,236,0.16)"}`,
              transition: "all .18s ease",
            }}>{c}</button>
        ))}
      </div>

      {all === null && (
        <p style={{ textAlign: "center", color: C.textSoft, fontSize: 14 }}>Yüklənir...</p>
      )}

      {all !== null && queue.length === 0 && (
        <p style={{ textAlign: "center", color: C.textSoft, fontSize: 14 }}>
          Bu kateqoriyada hələ kart yoxdur.
        </p>
      )}

      {current && (
        <FactCard key={`${cat}-${idx}-${current.id}`} item={current} onNext={next} />
      )}

      {seen > 0 && (
        <p style={{ textAlign: "center", marginTop: 16, fontSize: 12.5, color: C.textSoft }}>
          Bu gün {seen} kart açdın 🦅
        </p>
      )}
    </section>
  );
}

export default QartalGozu;
