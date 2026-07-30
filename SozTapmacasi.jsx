import React, { useState, useEffect, useRef } from "react";
import { sb } from "./supabase";
import { shuffle } from "./utils";

const T = {
  navy: "#003366", text: "#2A3D3C", textSoft: "rgba(42,61,60,0.68)",
  accent: "#00A896", warm: "#FF8C00", surface: "#FFFFFF",
  border: "rgba(42,61,60,0.14)", gold: "#D4AF37", danger: "#C0392B",
};

// Sozun uzunluguna gore tebliqi seviyye tesnifati
// (lugetde ayrica CEFR sahesi olmadigi ucun temeli yaxinlasdirmadir)
const LEVEL_RANGES = {
  A1: [1, 6],
  A2: [7, 9],
  B1: [10, 13],
  B2: [14, 99],
};

function normalize(s) {
  return (s || "").trim().toLowerCase()
    .replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss");
}

export default function SozTapmacasi() {
  const [level, setLevel] = useState("A1");
  const [pool, setPool] = useState(null);
  const [word, setWord] = useState(null);
  const [guess, setGuess] = useState("");
  const [status, setStatus] = useState(null); // null | 'correct' | 'wrong'
  const [tries, setTries] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    let alive = true;
    sb("dictionary?direction=eq.de-az&select=term,translation&limit=2000")
      .then((rows) => { if (alive) setPool(rows || []); })
      .catch(() => { if (alive) setPool([]); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (pool) pickWord(level, pool);
    // eslint-disable-next-line
  }, [pool, level]);

  function pickWord(lvl, list) {
    const [min, max] = LEVEL_RANGES[lvl];
    const filtered = (list || []).filter((r) => {
      const len = normalize(r.term).replace(/[^a-z]/g, "").length;
      return r.term && r.translation && len >= min && len <= max;
    });
    const w = shuffle(filtered)[0] || null;
    setWord(w);
    setGuess(""); setStatus(null); setTries(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function submit(e) {
    e.preventDefault();
    if (!word || status === "correct") return;
    const ok = normalize(guess) === normalize(word.term);
    if (ok) {
      setStatus("correct");
      setScore((s) => s + Math.max(10, 30 - tries * 8));
      setStreak((s) => s + 1);
    } else {
      const t = tries + 1;
      setTries(t);
      if (t >= 3) { setStatus("wrong"); setStreak(0); }
      else { setGuess(""); }
    }
  }

  function next() { pickWord(level, pool); }

  const box = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 16px", maxWidth: 560, margin: "0 auto" };
  const btn = { background: T.accent, color: "#fff", border: "none", borderRadius: 10, padding: "13px 22px", fontWeight: 800, fontSize: 14.5, cursor: "pointer" };

  const letters = word ? word.term.split("") : [];

  return (
    <section>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 9, padding: "7px 16px",
          borderRadius: 22, background: "rgba(0,168,150,0.12)", border: `1px solid ${T.border}`,
        }}>
          <span style={{ fontSize: 17 }}>&#129513;</span>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 700, color: T.navy }}>
            Söz Tapmacası
          </span>
        </div>
        <p style={{ fontSize: 13.5, color: T.textSoft, margin: "10px 0 0" }}>
          Azərbaycanca izaha görə alman sözünü tap.
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 7, marginBottom: 16, flexWrap: "wrap" }}>
        {Object.keys(LEVEL_RANGES).map((l) => (
          <button key={l} onClick={() => setLevel(l)} style={{
            padding: "7px 16px", borderRadius: 18, fontSize: 13, fontWeight: 800, cursor: "pointer",
            background: level === l ? T.accent : "transparent",
            color: level === l ? "#fff" : T.navy,
            border: `1px solid ${level === l ? T.accent : T.border}`,
          }}>{l}</button>
        ))}
      </div>

      <div style={box}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: T.textSoft, marginBottom: 14 }}>
          <span>Xal: <b style={{ color: T.accent }}>{score}</b></span>
          <span>Ardıcıl düzgün: <b style={{ color: T.warm }}>{streak}</b></span>
        </div>

        {!pool && <p style={{ textAlign: "center", color: T.textSoft }}>Yüklənir...</p>}
        {pool && !word && (
          <p style={{ textAlign: "center", color: T.textSoft }}>Bu səviyyədə söz tapılmadı.</p>
        )}

        {word && (
          <>
            <p style={{
              textAlign: "center", fontSize: 16, fontWeight: 700, color: T.navy,
              lineHeight: 1.5, margin: "0 0 18px",
            }}>
              {word.translation}
            </p>

            <div style={{
              display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 6, marginBottom: 18,
            }}>
              {letters.map((ch, i) => {
                const revealed = status === "correct" || status === "wrong" || ch === " " || ch === "-";
                return (
                  <span key={i} style={{
                    width: ch === " " ? 14 : 30, height: 38, borderRadius: 7,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: ch === " " ? "transparent" : "rgba(0,51,102,0.06)",
                    border: ch === " " ? "none" : `1.5px solid ${T.border}`,
                    fontSize: 17, fontWeight: 800, color: T.navy,
                  }}>
                    {revealed ? ch : ""}
                  </span>
                );
              })}
            </div>

            {status === null && (
              <form onSubmit={submit} style={{ display: "flex", gap: 8 }}>
                <input ref={inputRef} value={guess} onChange={(e) => setGuess(e.target.value)}
                  placeholder={`${letters.length} hərf`} autoCapitalize="none" autoCorrect="off"
                  style={{
                    flex: 1, padding: "12px 14px", borderRadius: 10, border: `1px solid ${T.border}`,
                    background: "#FFFFFF", color: T.text, fontSize: 15, boxSizing: "border-box",
                  }} />
                <button type="submit" style={btn}>Yoxla</button>
              </form>
            )}

            {tries > 0 && status === null && (
              <p style={{ textAlign: "center", fontSize: 12.5, color: T.danger, margin: "10px 0 0" }}>
                Səhv cavab — {3 - tries} cəhd qalıb
              </p>
            )}

            {status === "correct" && (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 15, fontWeight: 800, color: T.accent, margin: "0 0 10px" }}>
                  &#10003; Düzgün! +{Math.max(10, 30 - (tries) * 8)} xal
                </p>
                <button onClick={next} style={btn}>Növbəti söz →</button>
              </div>
            )}

            {status === "wrong" && (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 13.5, color: T.textSoft, margin: "0 0 4px" }}>Düzgün cavab:</p>
                <p style={{ fontSize: 17, fontWeight: 800, color: T.navy, margin: "0 0 12px" }}>{word.term}</p>
                <button onClick={next} style={btn}>Növbəti söz →</button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
