import React, { useState, useEffect } from "react";
import { sb } from "./supabase";

const T = {
  navy: "#003366", text: "#2A3D3C", textSoft: "rgba(42,61,60,0.66)",
  accent: "#00A896", warm: "#FF8C00", surface: "#FFFFFF",
  border: "rgba(42,61,60,0.14)", gold: "#D4AF37", danger: "#C0392B",
};
const LEVELS = ["A1", "A2", "B1", "B2"];
const LETTERS = ["a", "b", "c", "d", "e"];

export default function OxuAnlama() {
  const [screen, setScreen] = useState("level"); // level | list | test | result
  const [level, setLevel] = useState("A1");
  const [units, setUnits] = useState(null);
  const [current, setCurrent] = useState(null);
  const [answers, setAnswers] = useState({}); // { msg1: 'R', match1: 'a', info1: 'F', ... }
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (screen !== "list") return;
    setUnits(null);
    sb(`reading_units?level=eq.${level}&select=id,unit_number&order=unit_number.asc`)
      .then((rows) => setUnits(rows || []))
      .catch(() => setUnits([]));
  }, [screen, level]);

  function openUnit(id) {
    sb(`reading_units?id=eq.${id}&select=*`).then((rows) => {
      if (rows && rows[0]) {
        setCurrent(rows[0]);
        setAnswers({});
        setSubmitted(false);
        setScreen("test");
      }
    });
  }

  function setAns(key, val) {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [key]: val }));
  }

  function score() {
    if (!current) return { correct: 0, total: 15 };
    let correct = 0;
    for (let i = 1; i <= 5; i++) {
      if (answers[`msg${i}`] === current[`msg_a${i}`]) correct++;
      if (answers[`match${i}`] === current[`match_${i}`]) correct++;
      if (answers[`info${i}`] === current[`info_a${i}`]) correct++;
    }
    return { correct, total: 15 };
  }

  const box = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 16px" };
  const btnPrimary = { background: T.accent, color: "#fff", border: "none", borderRadius: 10, padding: "13px 20px", fontWeight: 800, fontSize: 14.5, cursor: "pointer" };
  const btnGhost = { background: "transparent", color: T.textSoft, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" };

  // ---------- 1. Səviyyə seçimi ----------
  if (screen === "level") {
    return (
      <section style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 9, padding: "7px 16px",
            borderRadius: 22, background: "rgba(0,168,150,0.12)", border: `1px solid ${T.border}`,
          }}>
            <span style={{ fontSize: 17 }}>📖</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 700, color: T.navy }}>
              Oxu Anlama
            </span>
          </div>
          <p style={{ fontSize: 13.5, color: T.textSoft, margin: "10px 0 0" }}>
            TELC/Goethe formatında mətn və suallar — real imtahana hazırlaş.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {LEVELS.map((l) => (
            <button key={l} onClick={() => { setLevel(l); setScreen("list"); }} style={{
              textAlign: "left", padding: "16px", borderRadius: 13, cursor: "pointer",
              background: T.surface, border: `1px solid ${T.border}`,
            }}>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: T.navy }}>{l}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  // ---------- 2. Vahid siyahısı ----------
  if (screen === "list") {
    return (
      <section style={{ maxWidth: 560, margin: "0 auto" }}>
        <button onClick={() => setScreen("level")} style={{ ...btnGhost, marginBottom: 14 }}>← Səviyyələr</button>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 700, color: T.navy, margin: "0 0 14px" }}>
          {level} · Oxu Anlama Vahidləri
        </p>
        {units === null && <p style={{ color: T.textSoft, textAlign: "center" }}>Yüklənir...</p>}
        {units && units.length === 0 && (
          <p style={{ color: T.textSoft, textAlign: "center" }}>Bu səviyyədə hələ vahid yoxdur.</p>
        )}
        <div style={{ display: "grid", gap: 9 }}>
          {units && units.map((u) => (
            <button key={u.id} onClick={() => openUnit(u.id)} style={{
              ...box, textAlign: "left", cursor: "pointer",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontWeight: 700, color: T.navy }}>Vahid {u.unit_number}</span>
              <span style={{ color: T.textSoft, fontSize: 12 }}>3 mətn · 15 sual →</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  // ---------- 3. Test ekranı ----------
  if (screen === "test" && current) {
    const u = current;
    const sc = submitted ? score() : null;

    return (
      <section style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <button onClick={() => setScreen("list")} style={btnGhost}>← Geri</button>
          <span style={{ fontSize: 12.5, color: T.textSoft, fontWeight: 700 }}>{u.level} · Vahid {u.unit_number}</span>
        </div>

        {submitted && (
          <div style={{
            ...box, marginBottom: 16, textAlign: "center",
            background: sc.correct >= 12 ? "rgba(0,168,150,0.08)" : "rgba(255,140,0,0.06)",
          }}>
            <p style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700, color: T.navy }}>
              {sc.correct} / {sc.total}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: T.textSoft }}>doğru cavab</p>
          </div>
        )}

        {/* ---- Aufgabe 1: Mesaj ---- */}
        <TaskHeader n={1} title="Mesajı oxuyun. Cümlələr doğru, yoxsa yanlışdır?" />
        <div style={{ ...box, marginBottom: 16 }}>
          <p style={{ whiteSpace: "pre-line", fontSize: 14, lineHeight: 1.65, color: T.text, margin: "0 0 16px", fontStyle: "italic" }}>
            {u.msg_text}
          </p>
          {[1, 2, 3, 4, 5].map((i) => (
            <RFQuestion key={i} num={i} question={u[`msg_q${i}`]}
              value={answers[`msg${i}`]} correct={u[`msg_a${i}`]} submitted={submitted}
              onChange={(v) => setAns(`msg${i}`, v)} />
          ))}
        </div>

        {/* ---- Aufgabe 2: Uyğunlaşdırma ---- */}
        <TaskHeader n={2} title="Hər şəxsə uyğun elanı seçin" />
        <div style={{ ...box, marginBottom: 16 }}>
          <div style={{ display: "grid", gap: 7, marginBottom: 16 }}>
            {LETTERS.map((l) => (
              <div key={l} style={{ fontSize: 12.5, color: T.text, display: "flex", gap: 8 }}>
                <span style={{ fontWeight: 800, color: T.warm, flexShrink: 0 }}>{l.toUpperCase()})</span>
                <span>{u[`ad_${l}`]}</span>
              </div>
            ))}
          </div>
          <div style={{ height: 1, background: T.border, margin: "0 0 16px" }} />
          {[1, 2, 3, 4, 5].map((i) => (
            <MatchQuestion key={i} num={i} person={u[`person_${i}`]}
              value={answers[`match${i}`]} correct={u[`match_${i}`]} submitted={submitted}
              onChange={(v) => setAns(`match${i}`, v)} />
          ))}
        </div>

        {/* ---- Aufgabe 3: İctimai mətn ---- */}
        <TaskHeader n={3} title="Mətni oxuyun. Cümlələr doğru, yoxsa yanlışdır?" />
        <div style={{ ...box, marginBottom: 18 }}>
          <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 800, color: T.navy }}>{u.info_title}</p>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: T.text, margin: "0 0 16px" }}>{u.info_text}</p>
          {[1, 2, 3, 4, 5].map((i) => (
            <RFQuestion key={i} num={i + 15} question={u[`info_q${i}`]}
              value={answers[`info${i}`]} correct={u[`info_a${i}`]} submitted={submitted}
              onChange={(v) => setAns(`info${i}`, v)} />
          ))}
        </div>

        {!submitted ? (
          <button onClick={() => setSubmitted(true)} style={{ ...btnPrimary, width: "100%" }}>
            Yoxla
          </button>
        ) : (
          <button onClick={() => setScreen("list")} style={{ ...btnPrimary, width: "100%" }}>
            Vahidlərə qayıt
          </button>
        )}
      </section>
    );
  }

  return null;
}

function TaskHeader({ n, title }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: T.textSoft, margin: "0 0 8px" }}>
      AUFGABE {n} — <span style={{ color: T.text, fontWeight: 600, letterSpacing: 0 }}>{title}</span>
    </p>
  );
}

function RFQuestion({ num, question, value, correct, submitted, onChange }) {
  return (
    <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${T.border}` }}>
      <p style={{ margin: "0 0 8px", fontSize: 13.5, color: T.text, lineHeight: 1.4 }}>
        <b style={{ color: T.textSoft }}>{num}.</b> {question}
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        {["R", "F"].map((opt) => {
          const active = value === opt;
          let bg = "transparent", bd = T.border, col = T.text;
          if (submitted) {
            if (opt === correct) { bg = "rgba(0,168,150,0.14)"; bd = T.accent; col = T.navy; }
            else if (active) { bg = "rgba(192,57,43,0.10)"; bd = T.danger; col = T.danger; }
          } else if (active) { bg = "rgba(0,51,102,0.08)"; bd = T.navy; col = T.navy; }
          return (
            <button key={opt} disabled={submitted} onClick={() => onChange(opt)} style={{
              flex: 1, padding: "9px 0", borderRadius: 8, fontWeight: 700, fontSize: 13,
              background: bg, border: `1px solid ${bd}`, color: col, cursor: submitted ? "default" : "pointer",
            }}>
              {opt === "R" ? "Doğru" : "Yanlış"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MatchQuestion({ num, person, value, correct, submitted, onChange }) {
  return (
    <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${T.border}` }}>
      <p style={{ margin: "0 0 8px", fontSize: 13.5, color: T.text, lineHeight: 1.4 }}>
        <b style={{ color: T.textSoft }}>{num + 10}.</b> {person}
      </p>
      <div style={{ display: "flex", gap: 6 }}>
        {LETTERS.map((l) => {
          const active = value === l;
          let bg = "transparent", bd = T.border, col = T.text;
          if (submitted) {
            if (l === correct) { bg = "rgba(0,168,150,0.14)"; bd = T.accent; col = T.navy; }
            else if (active) { bg = "rgba(192,57,43,0.10)"; bd = T.danger; col = T.danger; }
          } else if (active) { bg = "rgba(0,51,102,0.08)"; bd = T.navy; col = T.navy; }
          return (
            <button key={l} disabled={submitted} onClick={() => onChange(l)} style={{
              width: 34, height: 34, borderRadius: 8, fontWeight: 800, fontSize: 13,
              background: bg, border: `1px solid ${bd}`, color: col, cursor: submitted ? "default" : "pointer",
            }}>
              {l.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
