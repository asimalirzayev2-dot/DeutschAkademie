import React, { useState, useEffect } from "react";
import { sb, sbAuthInsert } from "./supabase";
import { Flame, Award } from "lucide-react";

const T = {
  navy: "#003366", text: "#2A3D3C", textSoft: "rgba(42,61,60,0.66)",
  accent: "#00A896", warm: "#FF8C00", surface: "#FFFFFF",
  border: "rgba(42,61,60,0.14)", gold: "#D4AF37", danger: "#C0392B",
  bronze: "#B8860B",
};
const LEVELS = ["A1", "A2", "B1", "B2"];
const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV","XVI","XVII","XVIII","XIX","XX","XXI","XXII","XXIII","XXIV","XXV"];

// ---- Səviyyəyə görə tədrici bəzək ("ağırlıq") — A1 ən sadə, B2 ən zəngin ----
const LEVEL_TIER = { A1: 0, A2: 1, B1: 2, B2: 3 };

function tierAccentColor(tier) {
  if (tier === 1) return T.accent;
  if (tier === 2) return T.warm;
  if (tier === 3) return T.bronze;
  return T.textSoft;
}

function DiamondWatermark() {
  // B2 kartının küncündə, arxa fondakı romb motivinin təkrarı — çox aşağı opasitlik
  return (
    <svg
      style={{ position: "absolute", right: -10, top: -10, pointerEvents: "none", opacity: 0.08 }}
      width="64" height="64" viewBox="0 0 72 72" fill="none"
    >
      <rect x="18" y="0" width="36" height="36" rx="4" transform="rotate(45 36 18)" stroke={T.bronze} strokeWidth="2" />
      <rect x="4" y="20" width="20" height="20" rx="3" transform="rotate(45 14 30)" stroke={T.bronze} strokeWidth="1.5" />
    </svg>
  );
}

// box-un tier-ə görə haşiyə/kölgə variasiyası — bazadakı `box` üzərinə əlavə olunur
function tierBoxStyle(tier) {
  if (tier === 0) return {};
  if (tier === 1) return { borderBottom: `2px solid rgba(0,168,150,0.35)` };
  if (tier === 2) return { borderLeft: `4px solid ${T.warm}`, paddingLeft: 13 };
  return { border: `2px solid rgba(184,134,11,0.4)`, position: "relative", overflow: "hidden" };
}

export default function OxuAnlama({ session }) {
  const [screen, setScreen] = useState("level"); // level | groups | list | test
  const [level, setLevel] = useState("A1");
  const [allUnits, setAllUnits] = useState(null);
  const [progress, setProgress] = useState({});
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [current, setCurrent] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (screen !== "groups") return;
    setAllUnits(null);
    const unitsP = sb(`reading_units?level=eq.${level}&select=id,unit_number&order=unit_number.asc`);
    const progP = session?.user?.id
      ? sb(`reading_progress?user_id=eq.${session.user.id}&level=eq.${level}&select=unit_number`)
      : Promise.resolve([]);
    Promise.all([unitsP, progP]).then(([units, prog]) => {
      setAllUnits(units || []);
      const p = {};
      (prog || []).forEach((r) => { p[r.unit_number] = true; });
      setProgress(p);
    }).catch(() => setAllUnits([]));
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
    let correct = 0, total = 0;
    current.msg_questions.forEach((q, i) => { total++; if (answers[`msg${i}`] === q.a) correct++; });
    if (current.article_questions) {
      current.article_questions.forEach((q, i) => { total++; if (answers[`art_${i}`] === q.a) correct++; });
    }
    current.people.forEach((p, i) => { total++; if (answers[`match${i}`] === p.answer) correct++; });
    current.task3_questions.forEach((q, i) => { total++; if (answers[`t3_${i}`] === q.a) correct++; });
    return { correct, total };
  }

  function handleSubmit() {
    setSubmitted(true);
    if (session?.user?.id && current) {
      sbAuthInsert("reading_progress", session.access_token, {
        user_id: session.user.id, level: current.level, unit_number: current.unit_number,
      }).then(() => {
        setProgress((prev) => ({ ...prev, [current.unit_number]: true }));
      }).catch(() => {});
    }
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
          {LEVELS.map((l) => {
            const tier = LEVEL_TIER[l];
            return (
              <button key={l} onClick={() => { setLevel(l); setScreen("groups"); }} style={{
                textAlign: "left", padding: "16px", borderRadius: 13, cursor: "pointer",
                background: T.surface, border: `1px solid ${T.border}`,
                position: "relative", overflow: "hidden",
                ...(tier === 3 ? { border: `2px solid rgba(184,134,11,0.4)` } : {}),
                ...(tier === 2 ? { borderLeft: `4px solid ${T.warm}` } : {}),
                ...(tier === 1 ? { borderBottom: `2px solid rgba(0,168,150,0.35)` } : {}),
              }}>
                {tier === 3 && <DiamondWatermark />}
                <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  {tier === 2 && <Flame size={14} color={T.warm} strokeWidth={2.5} />}
                  {tier === 3 && (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: "rgba(184,134,11,0.1)" }}>
                      <Award size={12} color={T.bronze} strokeWidth={2.5} />
                    </span>
                  )}
                  <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: T.navy, letterSpacing: tier === 3 ? 0.3 : 0 }}>{l}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  // ---------- 2. Qruplar (I, II, III...) ----------
  if (screen === "groups") {
    const groups = [];
    if (allUnits) {
      for (let i = 0; i < allUnits.length; i += 5) groups.push(allUnits.slice(i, i + 5));
    }
    const tier = LEVEL_TIER[level] ?? 0;
    const accent = tierAccentColor(tier);
    return (
      <section style={{ maxWidth: 560, margin: "0 auto" }}>
        <button onClick={() => setScreen("level")} style={{ ...btnGhost, marginBottom: 14 }}>← Səviyyələr</button>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 700, color: T.navy, margin: "0 0 14px" }}>
          {level} · Oxu Anlama
        </p>
        {allUnits === null && <p style={{ color: T.textSoft, textAlign: "center" }}>Yüklənir...</p>}
        {allUnits && groups.length === 0 && (
          <p style={{ color: T.textSoft, textAlign: "center" }}>Bu səviyyədə hələ vahid yoxdur.</p>
        )}
        <div style={{ display: "grid", gap: 9 }}>
          {groups.map((g, gi) => {
            const done = g.filter((u) => progress[u.unit_number]).length;
            const roman = ROMAN[gi] || String(gi + 1);
            return (
              <button key={gi} onClick={() => { setSelectedGroup(g); setScreen("list"); }} style={{
                ...box, ...tierBoxStyle(tier), textAlign: "left", cursor: "pointer",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                {tier === 3 && <DiamondWatermark />}
                <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  {tier === 2 && <Flame size={15} color={T.warm} strokeWidth={2.5} />}
                  {tier === 3 && (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: "50%", background: "rgba(184,134,11,0.1)", flexShrink: 0 }}>
                      <Award size={13} color={T.bronze} strokeWidth={2.5} />
                    </span>
                  )}
                  <span>
                    <span style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 700, color: T.navy, letterSpacing: tier === 3 ? 0.3 : 0 }}>{roman} Qrup</span>
                    <span style={{ display: "block", fontSize: 12, color: T.textSoft, marginTop: 2 }}>
                      Fəsil {g[0].unit_number}-{g[g.length - 1].unit_number}
                    </span>
                  </span>
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: done === g.length ? T.accent : (tier > 0 ? accent : T.textSoft) }}>
                  {done > 0 ? `${done}/${g.length} tamamlandı` : `${g.length} vahid →`}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  // ---------- 3. Qrup daxilindəki vahidlər ----------
  if (screen === "list" && selectedGroup) {
    const tier = LEVEL_TIER[level] ?? 0;
    const accent = tierAccentColor(tier);
    return (
      <section style={{ maxWidth: 560, margin: "0 auto" }}>
        <button onClick={() => setScreen("groups")} style={{ ...btnGhost, marginBottom: 14 }}>← Qruplar</button>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 700, color: T.navy, margin: "0 0 14px" }}>
          {level} · Fəsil {selectedGroup[0].unit_number}-{selectedGroup[selectedGroup.length - 1].unit_number}
        </p>
        <div style={{ display: "grid", gap: 9 }}>
          {selectedGroup.map((u) => (
            <button key={u.id} onClick={() => openUnit(u.id)} style={{
              ...box, ...tierBoxStyle(tier), textAlign: "left", cursor: "pointer",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              {tier === 3 && <DiamondWatermark />}
              <span style={{ fontWeight: 700, color: T.navy }}>Fəsil {u.unit_number}</span>
              <span style={{
                color: progress[u.unit_number] ? T.accent : (tier > 0 ? accent : T.textSoft),
                fontSize: 12, fontWeight: progress[u.unit_number] ? 700 : 400,
              }}>
                {progress[u.unit_number] ? "✓ Tamamlandı" : "→"}
              </span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  // ---------- 4. Test ekranı ----------
  if (screen === "test" && current) {
    const u = current;
    const sc = submitted ? score() : null;
    const adLetters = Object.keys(u.ads).sort();
    const isB1 = !!u.article_questions;

    return (
      <section style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <button onClick={() => setScreen("list")} style={btnGhost}>← Geri</button>
          <span style={{ fontSize: 12.5, color: T.textSoft, fontWeight: 700 }}>{u.level} · Fəsil {u.unit_number}</span>
        </div>

        {submitted && (
          <div style={{
            ...box, marginBottom: 16, textAlign: "center",
            background: sc.correct >= sc.total * 0.7 ? "rgba(0,168,150,0.08)" : "rgba(255,140,0,0.06)",
          }}>
            <p style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700, color: T.navy }}>
              {sc.correct} / {sc.total}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: T.textSoft }}>doğru cavab</p>
          </div>
        )}

        {/* ---- Aufgabe 1 ---- */}
        <TaskHeader n={1} title="Mesajı oxuyun. Cümlələr doğru, yoxsa yanlışdır?" />
        <div style={{ ...box, marginBottom: 16 }}>
          <p style={{ whiteSpace: "pre-line", fontSize: 14, lineHeight: 1.65, color: T.text, margin: "0 0 16px", fontStyle: "italic" }}>
            {u.msg_text}
          </p>
          {u.msg_questions.map((q, i) => (
            <RFQuestion key={i} num={i + 1} question={q.q}
              value={answers[`msg${i}`]} correct={q.a} submitted={submitted}
              onChange={(v) => setAns(`msg${i}`, v)} />
          ))}
        </div>

        {isB1 && (
          <>
            {/* ---- Teil 2: qəzet məqaləsi ---- */}
            <TaskHeader n={2} title="Məqaləni oxuyun və düzgün cavabı seçin" />
            <div style={{ ...box, marginBottom: 16 }}>
              {u.article_title && <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 800, color: T.navy }}>{u.article_title}</p>}
              <p style={{ whiteSpace: "pre-line", fontSize: 14, lineHeight: 1.65, color: T.text, margin: "0 0 16px" }}>{u.article_text}</p>
              {u.article_questions.map((q, i) => (
                <MCQuestion key={i} num={i + 6} question={q.q} options={q.options}
                  value={answers[`art_${i}`]} correct={q.a} submitted={submitted}
                  onChange={(v) => setAns(`art_${i}`, v)} />
              ))}
            </div>

            {/* ---- Teil 3: fikirlər ---- */}
            <TaskHeader n={3} title="Fikirləri oxuyun — kim nə deyir?" />
            <div style={{ ...box, marginBottom: 16 }}>
              <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                {u.task3_speakers.map((s, i) => (
                  <div key={i} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(0,51,102,0.04)" }}>
                    <p style={{ margin: "0 0 3px", fontSize: 12, fontWeight: 800, color: T.navy }}>{s.name}</p>
                    <p style={{ margin: 0, fontSize: 13, color: T.text, lineHeight: 1.5, fontStyle: "italic" }}>„{s.text}"</p>
                  </div>
                ))}
              </div>
              {u.task3_questions.map((q, i) => (
                <OpinionQuestion key={i} num={i + 11} question={q.q} names={u.task3_speakers.map((s) => s.name)}
                  value={answers[`t3_${i}`]} correct={q.a} submitted={submitted}
                  onChange={(v) => setAns(`t3_${i}`, v)} />
              ))}
            </div>

            {/* ---- Teil 4: elanlar ---- */}
            <TaskHeader n={4} title="Hər şəxsə uyğun elanı seçin (hamısı istifadə olunmaya bilər)" />
            <div style={{ ...box, marginBottom: 18 }}>
              <div style={{ display: "grid", gap: 7, marginBottom: 16 }}>
                {adLetters.map((l) => (
                  <div key={l} style={{ fontSize: 12.5, color: T.text, display: "flex", gap: 8 }}>
                    <span style={{ fontWeight: 800, color: T.warm, flexShrink: 0 }}>{l.toUpperCase()})</span>
                    <span>{u.ads[l]}</span>
                  </div>
                ))}
              </div>
              <div style={{ height: 1, background: T.border, margin: "0 0 16px" }} />
              {u.people.map((p, i) => (
                <MatchQuestion key={i} num={i + 16} person={p.text} letters={adLetters}
                  value={answers[`match${i}`]} correct={p.answer} submitted={submitted}
                  onChange={(v) => setAns(`match${i}`, v)} />
              ))}
            </div>
          </>
        )}

        {!isB1 && (
          <>
            {/* ---- Aufgabe 2 ---- */}
            <TaskHeader n={2} title="Hər şəxsə uyğun elanı seçin (hamısı istifadə olunmaya bilər)" />
            <div style={{ ...box, marginBottom: 16 }}>
              <div style={{ display: "grid", gap: 7, marginBottom: 16 }}>
                {adLetters.map((l) => (
                  <div key={l} style={{ fontSize: 12.5, color: T.text, display: "flex", gap: 8 }}>
                    <span style={{ fontWeight: 800, color: T.warm, flexShrink: 0 }}>{l.toUpperCase()})</span>
                    <span>{u.ads[l]}</span>
                  </div>
                ))}
              </div>
              <div style={{ height: 1, background: T.border, margin: "0 0 16px" }} />
              {u.people.map((p, i) => (
                <MatchQuestion key={i} num={i + 11} person={p.text} letters={adLetters}
                  value={answers[`match${i}`]} correct={p.answer} submitted={submitted}
                  onChange={(v) => setAns(`match${i}`, v)} />
              ))}
            </div>

            {/* ---- Aufgabe 3 ---- */}
            <TaskHeader n={3} title={
              u.task3_type === "mc" ? "Mətni oxuyun və düzgün cavabı seçin"
              : u.task3_type === "opinion" ? "Fikirləri oxuyun — kim nə deyir?"
              : "Mətni oxuyun. Cümlələr doğru, yoxsa yanlışdır?"
            } />
            <div style={{ ...box, marginBottom: 18 }}>
              {u.task3_type !== "opinion" && (
                <>
                  {u.task3_title && <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 800, color: T.navy }}>{u.task3_title}</p>}
                  <p style={{ fontSize: 14, lineHeight: 1.65, color: T.text, margin: "0 0 16px" }}>{u.task3_text}</p>
                </>
              )}

              {u.task3_type === "opinion" && (
                <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                  {u.task3_speakers.map((s, i) => (
                    <div key={i} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(0,51,102,0.04)" }}>
                      <p style={{ margin: "0 0 3px", fontSize: 12, fontWeight: 800, color: T.navy }}>{s.name}</p>
                      <p style={{ margin: 0, fontSize: 13, color: T.text, lineHeight: 1.5, fontStyle: "italic" }}>„{s.text}"</p>
                    </div>
                  ))}
                </div>
              )}

              {u.task3_type === "tf" && u.task3_questions.map((q, i) => (
                <RFQuestion key={i} num={i + 16} question={q.q}
                  value={answers[`t3_${i}`]} correct={q.a} submitted={submitted}
                  onChange={(v) => setAns(`t3_${i}`, v)} />
              ))}

              {u.task3_type === "mc" && u.task3_questions.map((q, i) => (
                <MCQuestion key={i} num={i + 16} question={q.q} options={q.options}
                  value={answers[`t3_${i}`]} correct={q.a} submitted={submitted}
                  onChange={(v) => setAns(`t3_${i}`, v)} />
              ))}

              {u.task3_type === "opinion" && u.task3_questions.map((q, i) => (
                <OpinionQuestion key={i} num={i + 16} question={q.q} names={u.task3_speakers.map((s) => s.name)}
                  value={answers[`t3_${i}`]} correct={q.a} submitted={submitted}
                  onChange={(v) => setAns(`t3_${i}`, v)} />
              ))}
            </div>
          </>
        )}

        {!submitted ? (
          <button onClick={handleSubmit} style={{ ...btnPrimary, width: "100%" }}>Yoxla</button>
        ) : (
          <button onClick={() => setScreen("list")} style={{ ...btnPrimary, width: "100%" }}>Fəsillərə qayıt</button>
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

function optStyle(active, isRight, isWrongPick, submitted) {
  let bg = "transparent", bd = T.border, col = T.text;
  if (submitted) {
    if (isRight) { bg = "rgba(0,168,150,0.14)"; bd = T.accent; col = T.navy; }
    else if (isWrongPick) { bg = "rgba(192,57,43,0.10)"; bd = T.danger; col = T.danger; }
  } else if (active) { bg = "rgba(0,51,102,0.08)"; bd = T.navy; col = T.navy; }
  return { bg, bd, col };
}

function RFQuestion({ num, question, value, correct, submitted, onChange }) {
  return (
    <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${T.border}` }}>
      <p style={{ margin: "0 0 8px", fontSize: 13.5, color: T.text, lineHeight: 1.4 }}>
        <b style={{ color: T.textSoft }}>{num}.</b> {question}
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        {["R", "F"].map((opt) => {
          const s = optStyle(value === opt, submitted && opt === correct, submitted && value === opt && opt !== correct, submitted);
          return (
            <button key={opt} disabled={submitted} onClick={() => onChange(opt)} style={{
              flex: 1, padding: "9px 0", borderRadius: 8, fontWeight: 700, fontSize: 13,
              background: s.bg, border: `1px solid ${s.bd}`, color: s.col, cursor: submitted ? "default" : "pointer",
            }}>
              {opt === "R" ? "Doğru" : "Yanlış"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MatchQuestion({ num, person, letters, value, correct, submitted, onChange }) {
  return (
    <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${T.border}` }}>
      <p style={{ margin: "0 0 8px", fontSize: 13.5, color: T.text, lineHeight: 1.4 }}>
        <b style={{ color: T.textSoft }}>{num}.</b> {person}
      </p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {letters.map((l) => {
          const s = optStyle(value === l, submitted && l === correct, submitted && value === l && l !== correct, submitted);
          return (
            <button key={l} disabled={submitted} onClick={() => onChange(l)} style={{
              width: 32, height: 32, borderRadius: 8, fontWeight: 800, fontSize: 12.5,
              background: s.bg, border: `1px solid ${s.bd}`, color: s.col, cursor: submitted ? "default" : "pointer",
            }}>
              {l.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MCQuestion({ num, question, options, value, correct, submitted, onChange }) {
  const keys = Object.keys(options).sort();
  return (
    <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${T.border}` }}>
      <p style={{ margin: "0 0 8px", fontSize: 13.5, color: T.text, lineHeight: 1.4 }}>
        <b style={{ color: T.textSoft }}>{num}.</b> {question}
      </p>
      <div style={{ display: "grid", gap: 6 }}>
        {keys.map((k) => {
          const s = optStyle(value === k, submitted && k === correct, submitted && value === k && k !== correct, submitted);
          return (
            <button key={k} disabled={submitted} onClick={() => onChange(k)} style={{
              textAlign: "left", padding: "8px 11px", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
              background: s.bg, border: `1px solid ${s.bd}`, color: s.col, cursor: submitted ? "default" : "pointer",
            }}>
              <b>{k})</b> {options[k]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OpinionQuestion({ num, question, names, value, correct, submitted, onChange }) {
  return (
    <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${T.border}` }}>
      <p style={{ margin: "0 0 8px", fontSize: 13.5, color: T.text, lineHeight: 1.4 }}>
        <b style={{ color: T.textSoft }}>{num}.</b> {question}
      </p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {names.map((n) => {
          const s = optStyle(value === n, submitted && n === correct, submitted && value === n && n !== correct, submitted);
          return (
            <button key={n} disabled={submitted} onClick={() => onChange(n)} style={{
              padding: "7px 12px", borderRadius: 8, fontWeight: 700, fontSize: 12.5,
              background: s.bg, border: `1px solid ${s.bd}`, color: s.col, cursor: submitted ? "default" : "pointer",
            }}>
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
