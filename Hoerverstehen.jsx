import React, { useState, useEffect, useRef } from "react";
import { sb, sbAuthInsert } from "./supabase";

const T = {
  navy: "#003366", text: "#2A3D3C", textSoft: "rgba(42,61,60,0.66)",
  accent: "#00A896", warm: "#FF8C00", surface: "#FFFFFF",
  border: "rgba(42,61,60,0.14)", gold: "#D4AF37",
};
const LEVELS = ["A1", "A2", "B1", "B2"];

function speakLong(text, { onEnd, rate = 0.92 } = {}) {
  if (!("speechSynthesis" in window)) return null;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "de-DE";
  utter.rate = rate;
  if (onEnd) utter.onend = onEnd;
  window.speechSynthesis.speak(utter);
  return utter;
}

function AudioBlock({ text, audioUrl }) {
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(false);
  const audioRef = useRef(null);

  function toggle() {
    if (audioUrl) {
      if (playing) {
        audioRef.current?.pause();
        setPlaying(false);
        return;
      }
      setPlaying(true);
      audioRef.current?.play();
      return;
    }
    // Hazır fayl yoxdursa, brauzerin öz səsi ilə oxu (ehtiyat variant)
    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    speakLong(text, { onEnd: () => { setPlaying(false); setPlayed(true); } });
  }

  useEffect(() => () => window.speechSynthesis.cancel(), []);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, padding: "16px 18px",
      borderRadius: 12, background: "rgba(0,168,150,0.08)", border: `1px solid ${T.accent}`,
      marginBottom: 16,
    }}>
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl}
          onEnded={() => { setPlaying(false); setPlayed(true); }} style={{ display: "none" }} />
      )}
      <button onClick={toggle} style={{
        width: 48, height: 48, borderRadius: "50%", border: "none", cursor: "pointer",
        background: T.accent, color: "#fff", fontSize: 20, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>{playing ? "⏸" : "▶"}</button>
      <div>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: T.navy }}>
          {playing ? "Dinlənilir..." : played ? "Yenidən dinlə" : "Dinləmək üçün bas"}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: T.textSoft }}>
          {audioUrl ? "Mətni istədiyin qədər təkrar dinləyə bilərsən" : "Mətni istədiyin qədər təkrar dinləyə bilərsən"}
        </p>
      </div>
    </div>
  );
}

export default function Hoerverstehen({ session, guestMode, setAuthModal }) {
  const [screen, setScreen] = useState("level"); // level | groups | list | test
  const [level, setLevel] = useState(null);
  const [units, setUnits] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [current, setCurrent] = useState(null);
  const [qLang, setQLang] = useState("az"); // az | de -- yalnnız B1 ucun anlamli, ancaq metnler ucun deyil
  const [answers1, setAnswers1] = useState({});
  const [answers2, setAnswers2] = useState({});
  const [answers3, setAnswers3] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [progress, setProgress] = useState({});
  const [levelStats, setLevelStats] = useState({});

  useEffect(() => {
    sb(`listening_units?select=level`).then((rows) => {
      const counts = {};
      (rows || []).forEach((r) => { counts[r.level] = (counts[r.level] || 0) + 1; });
      setLevelStats((prev) => {
        const next = { ...prev };
        LEVELS.forEach((l) => { next[l] = { ...(next[l] || {}), total: counts[l] || 0 }; });
        return next;
      });
    }).catch(() => {});

    if (session?.user?.id) {
      sb(`listening_progress?user_id=eq.${session.user.id}&select=level`).then((rows) => {
        const counts = {};
        (rows || []).forEach((r) => { counts[r.level] = (counts[r.level] || 0) + 1; });
        setLevelStats((prev) => {
          const next = { ...prev };
          LEVELS.forEach((l) => { next[l] = { ...(next[l] || {}), done: counts[l] || 0 }; });
          return next;
        });
      }).catch(() => {});
    }
  }, [session]);

  useEffect(() => {
    if (!level) return;
    sb(`listening_units?level=eq.${level}&select=id,unit_number&order=unit_number.asc`)
      .then(setUnits).catch(() => setUnits([]));
    const progP = session?.user?.id
      ? sb(`listening_progress?user_id=eq.${session.user.id}&level=eq.${level}&select=unit_number`)
      : Promise.resolve([]);
    progP.then((rows) => {
      const map = {};
      (rows || []).forEach((r) => { map[r.unit_number] = true; });
      setProgress(map);
    }).catch(() => {});
  }, [level, session]);

  function txt(azVal, deVal) {
    return (qLang === "de" && deVal) ? deVal : azVal;
  }

  function LangToggle() {
    return (
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setQLang("az")} style={{
          padding: "6px 16px", borderRadius: 999, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
          background: qLang === "az" ? T.accent : "#fff", color: qLang === "az" ? "#fff" : T.text,
          border: `1px solid ${qLang === "az" ? T.accent : T.border}`,
        }}>Azərbaycanca suallar</button>
        <button onClick={() => setQLang("de")} style={{
          padding: "6px 16px", borderRadius: 999, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
          background: qLang === "de" ? T.accent : "#fff", color: qLang === "de" ? "#fff" : T.text,
          border: `1px solid ${qLang === "de" ? T.accent : T.border}`,
        }}>Tam Almanca (B1+)</button>
      </div>
    );
  }

  function openUnit(u) {
    if (guestMode && u.unit_number !== 1) {
      if (setAuthModal) setAuthModal("signup");
      return;
    }
    sb(`listening_units?id=eq.${u.id}&select=*`).then((rows) => {
      if (rows && rows[0]) {
        setCurrent(rows[0]);
        setAnswers1({}); setAnswers2({}); setAnswers3({}); setSubmitted(false);
        setScreen("test");
      }
    });
  }

  function score() {
    if (!current) return { correct: 0, total: 0 };
    let correct = 0, total = 0;
    if (current.part1_items) {
      (current.part1_items || []).forEach((it, i) => {
        total++;
        if (answers1[i] === it.a) correct++;
      });
    } else {
      (current.part1_questions || []).forEach((q, i) => {
        total++;
        if (answers1[i] === q.a) correct++;
      });
    }
    (current.part2_questions || []).forEach((q, i) => {
      total++;
      if (answers2[i] === q.a) correct++;
    });
    if (current.part3_questions) {
      (current.part3_questions || []).forEach((q, i) => {
        total++;
        if (answers3[i] === q.a) correct++;
      });
    }
    return { correct, total };
  }

  function handleSubmit() {
    setSubmitted(true);
    if (session?.user?.id && current) {
      const wasAlreadyDone = !!progress[current.unit_number];
      const { correct, total } = score();
      const passed = total > 0 && correct / total >= 0.6;

      sbAuthInsert("listening_progress", session.access_token, {
        user_id: session.user.id, level: current.level, unit_number: current.unit_number,
      }).then(() => {
        setProgress((prev) => ({ ...prev, [current.unit_number]: true }));
      }).catch(() => {});

      if (!wasAlreadyDone && passed) {
        sbAuthInsert("xp_log", session.access_token, {
          user_id: session.user.id, source: "hoerverstehen", amount: 20,
          meta: { level: current.level, unit_number: current.unit_number },
        }).catch(() => {});
      }
    }
  }

  const box = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 16px" };

  // ---------- Seviyye ekrani ----------
  if (screen === "level") {
    const LEVEL_META = {
      A1: { title: "Başlanğıc Səviyyə" },
      A2: { title: "Əsas Səviyyə" },
      B1: { title: "Orta Səviyyə" },
      B2: { title: "Yuxarı Səviyyə" },
    };
    return (
      <section style={{ maxWidth: 620, margin: "0 auto" }}>
        <style>{`
          .dl-level-card { transition: box-shadow .25s ease, transform .25s ease, border-color .25s ease; }
          .dl-level-card:hover { box-shadow: 0 14px 30px rgba(0,51,102,0.12); transform: translateY(-2px); border-color: rgba(0,168,150,0.45); }
          .dl-level-arrow { transition: background .2s ease, color .2s ease, transform .2s ease; }
          .dl-level-card:hover .dl-level-arrow { background: ${T.accent}; color: #fff; transform: translateX(2px); }
        `}</style>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 9, padding: "7px 18px",
            borderRadius: 22, background: "rgba(0,168,150,0.14)", border: `1px solid ${T.accent}`,
          }}>
            <span style={{ fontSize: 17 }}>🎧</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: T.navy }}>
              Dinləmə (Hörverstehen)
            </span>
          </div>
          <p style={{ fontSize: 13.5, color: T.textSoft, margin: "10px 0 0" }}>
            TELC/Goethe formatında dinləmə hazırlığı
          </p>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {LEVELS.map((l) => {
            const stat = levelStats[l] || {};
            const total = stat.total || 0;
            const done = stat.done || 0;
            const pct = total > 0 && done > 0 ? Math.round((done / total) * 100) : 0;
            const started = done > 0;
            return (
              <button key={l} className="dl-level-card" onClick={() => { setLevel(l); setScreen("groups"); }} style={{
                position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "16px 16px 16px 20px", borderRadius: 18, cursor: "pointer", textAlign: "left",
                background: "rgba(255,255,255,0.75)", backdropFilter: "blur(10px)",
                border: `1px solid ${T.border}`, boxShadow: "0 1px 4px rgba(0,51,102,0.05)",
                overflow: "hidden",
              }}>
                {started && (
                  <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: T.accent }} />
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 13, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 900, fontSize: 16,
                    background: started ? "rgba(0,168,150,0.12)" : "rgba(0,51,102,0.06)",
                    color: started ? T.accent : T.navy,
                  }}>{l}</div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: T.navy }}>{LEVEL_META[l].title}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: T.textSoft }}>
                      {total > 0 ? `${total} Fəsil` : "Tezliklə"}{started ? ` • ${done} tamamlandı` : ""}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  {started && (
                    <span style={{
                      fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 999,
                      background: "rgba(0,168,150,0.15)", color: T.accent,
                    }}>{pct}%</span>
                  )}
                  <span className="dl-level-arrow" style={{
                    width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(42,61,60,0.06)", color: T.textSoft, fontSize: 15,
                  }}>→</span>
                </div>
              </button>
            );
          })}</div>
      </section>
    );
  }

  // ---------- Qruplar ekrani ----------
  if (screen === "groups") {
    const groups = [];
    for (let i = 0; i < units.length; i += 5) groups.push(units.slice(i, i + 5));
    return (
      <section style={{ maxWidth: 620, margin: "0 auto" }}>
        <button onClick={() => setScreen("level")} style={{ background: "none", border: "none", color: T.accent, fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 12 }}>← Səviyyələr</button>
        <h3 style={{ fontFamily: "'Fraunces', serif", color: T.navy, marginBottom: 14 }}>{level} — Fəsillər</h3>
        {groups.length === 0 && <p style={{ color: T.textSoft, fontSize: 14 }}>Bu səviyyədə hələ material yoxdur.</p>}
        <div style={{ display: "grid", gap: 9 }}>
          {groups.map((g, i) => (
            <button key={i} onClick={() => { setSelectedGroup(g); setScreen("list"); }} style={{
              ...box, textAlign: "left", cursor: "pointer", display: "flex",
              justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontWeight: 700, color: T.navy }}>Fəsil {g[0].unit_number}-{g[g.length - 1].unit_number}</span>
              <span style={{ fontSize: 12, color: T.textSoft }}>
                {g.filter((u) => progress[u.unit_number]).length}/{g.length} tamamlandı
              </span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  // ---------- Siyahi ekrani ----------
  if (screen === "list") {
    return (
      <section style={{ maxWidth: 620, margin: "0 auto" }}>
        <button onClick={() => setScreen("groups")} style={{ background: "none", border: "none", color: T.accent, fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 12 }}>← Qruplar</button>
        <div style={{ display: "grid", gap: 9 }}>
          {selectedGroup.map((u) => {
            const locked = guestMode && u.unit_number !== 1;
            return (
              <button key={u.id} onClick={() => openUnit(u)} style={{
                ...box, textAlign: "left", cursor: "pointer", display: "flex",
                justifyContent: "space-between", alignItems: "center",
                ...(locked ? { opacity: 0.55 } : {}),
              }}>
                <span style={{ fontWeight: 700, color: T.navy }}>Fəsil {u.unit_number}</span>
                <span style={{ color: locked ? T.textSoft : (progress[u.unit_number] ? T.accent : T.textSoft), fontSize: 12, fontWeight: progress[u.unit_number] ? 700 : 400 }}>
                  {locked ? "🔒 Qeydiyyat lazımdır" : (progress[u.unit_number] ? "✓ Tamamlandı" : "→")}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  // ---------- Test ekrani ----------
  if (screen === "test" && current) {
    const { correct, total } = submitted ? score() : { correct: 0, total: 0 };
    return (
      <section style={{ maxWidth: 620, margin: "0 auto" }}>
        <button onClick={() => setScreen("list")} style={{ background: "none", border: "none", color: T.accent, fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 12 }}>← Geri</button>
        {current.level === "B1" && current.part2_questions?.[0]?.q_de && <LangToggle />}

        {/* Hisse 1 */}
        <div style={{ ...box, marginBottom: 18 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: T.warm, margin: "0 0 8px", textTransform: "uppercase" }}>
            Hissə 1{current.part1_items ? " — 5 qısa mətn" : ` — ${current.part1_title}`}
          </p>
          {current.part1_items ? (
            <>
              <AudioBlock
                text={(current.part1_items || []).map((it, i) => `Mətn ${i + 1}. ${it.text}`).join(" ")}
                audioUrl={current.part1_audio_url}
              />
              <div style={{ display: "grid", gap: 16 }}>
                {(current.part1_items || []).map((it, i) => (
                  <div key={i}>
                    <p style={{ fontSize: 12, fontWeight: 800, color: T.textSoft, margin: "0 0 4px", textTransform: "uppercase" }}>Mətn {i + 1}</p>
                    <p style={{ fontSize: 14, color: T.text, fontWeight: 600, marginBottom: 6 }}>{txt(it.question, it.question_de)}</p>
                    <div style={{ display: "grid", gap: 6 }}>
                      {Object.entries(txt(it.options, it.options_de) || {}).map(([key, val]) => (
                        <button key={key} disabled={submitted}
                          onClick={() => setAnswers1((prev) => ({ ...prev, [i]: key }))}
                          style={{
                            textAlign: "left", padding: "9px 12px", borderRadius: 8, cursor: submitted ? "default" : "pointer",
                            fontSize: 13, background: answers1[i] === key ? "rgba(0,168,150,0.10)" : "#fff",
                            border: `1px solid ${answers1[i] === key ? T.accent : T.border}`,
                            ...(submitted && it.a === key ? { borderColor: T.accent, borderWidth: 2 } : {}),
                          }}>{val}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <AudioBlock text={current.part1_text} audioUrl={current.part1_audio_url} />
              <div style={{ display: "grid", gap: 10 }}>
                {(current.part1_questions || []).map((q, i) => (
                  <div key={i}>
                    <p style={{ fontSize: 14, color: T.text, fontWeight: 600, marginBottom: 6 }}>{i + 1}. {q.q}</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      {["R", "F"].map((opt) => (
                        <button key={opt} disabled={submitted}
                          onClick={() => setAnswers1((prev) => ({ ...prev, [i]: opt }))}
                          style={{
                            flex: 1, padding: "9px 0", borderRadius: 8, cursor: submitted ? "default" : "pointer",
                            fontWeight: 700, fontSize: 13,
                            background: answers1[i] === opt ? T.accent : "#fff",
                            color: answers1[i] === opt ? "#fff" : T.text,
                            border: `1px solid ${answers1[i] === opt ? T.accent : T.border}`,
                            ...(submitted && q.a === opt ? { borderColor: T.accent, borderWidth: 2 } : {}),
                          }}>{opt === "R" ? "Doğru" : "Yanlış"}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Hisse 2 */}
        <div style={{ ...box, marginBottom: 18 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: T.warm, margin: "0 0 8px", textTransform: "uppercase" }}>Hissə 2 — {current.part2_title}</p>
          <AudioBlock text={current.part2_text} audioUrl={current.part2_audio_url} />
          <div style={{ display: "grid", gap: 14 }}>
            {(current.part2_questions || []).map((q, i) => (
              current.part1_items ? (
                <div key={i}>
                  <p style={{ fontSize: 14, color: T.text, fontWeight: 600, marginBottom: 6 }}>{i + 1}. {txt(q.q, q.q_de)}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["R", "F"].map((opt) => (
                      <button key={opt} disabled={submitted}
                        onClick={() => setAnswers2((prev) => ({ ...prev, [i]: opt }))}
                        style={{
                          flex: 1, padding: "9px 0", borderRadius: 8, cursor: submitted ? "default" : "pointer",
                          fontWeight: 700, fontSize: 13,
                          background: answers2[i] === opt ? T.accent : "#fff",
                          color: answers2[i] === opt ? "#fff" : T.text,
                          border: `1px solid ${answers2[i] === opt ? T.accent : T.border}`,
                          ...(submitted && q.a === opt ? { borderColor: T.accent, borderWidth: 2 } : {}),
                        }}>{opt === "R" ? "Doğru" : "Yanlış"}</button>
                    ))}
                  </div>
                </div>
              ) : (
                <div key={i}>
                  <p style={{ fontSize: 14, color: T.text, fontWeight: 600, marginBottom: 6 }}>{i + 1}. {q.q}</p>
                  <div style={{ display: "grid", gap: 6 }}>
                    {Object.entries(q.options || {}).map(([key, val]) => (
                      <button key={key} disabled={submitted}
                        onClick={() => setAnswers2((prev) => ({ ...prev, [i]: key }))}
                        style={{
                          textAlign: "left", padding: "9px 12px", borderRadius: 8, cursor: submitted ? "default" : "pointer",
                          fontSize: 13, background: answers2[i] === key ? "rgba(0,168,150,0.10)" : "#fff",
                          border: `1px solid ${answers2[i] === key ? T.accent : T.border}`,
                          ...(submitted && q.a === key ? { borderColor: T.accent, borderWidth: 2 } : {}),
                        }}>{val}</button>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        </div>

        {/* Hisse 3 — yalniz B1 */}
        {current.part3_text && (
          <div style={{ ...box, marginBottom: 18 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: T.warm, margin: "0 0 8px", textTransform: "uppercase" }}>Hissə 3 — {current.part3_title}</p>
            <AudioBlock text={current.part3_text} audioUrl={current.part3_audio_url} />
            <div style={{ display: "grid", gap: 14 }}>
              {(current.part3_questions || []).map((q, i) => (
                <div key={i}>
                  <p style={{ fontSize: 14, color: T.text, fontWeight: 600, marginBottom: 6 }}>{i + 1}. {txt(q.q, q.q_de)}</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(current.part3_speakers || []).map((name) => (
                      <button key={name} disabled={submitted}
                        onClick={() => setAnswers3((prev) => ({ ...prev, [i]: name }))}
                        style={{
                          padding: "7px 14px", borderRadius: 999, cursor: submitted ? "default" : "pointer",
                          fontSize: 12.5, fontWeight: 700,
                          background: answers3[i] === name ? T.accent : "#fff",
                          color: answers3[i] === name ? "#fff" : T.text,
                          border: `1px solid ${answers3[i] === name ? T.accent : T.border}`,
                          ...(submitted && q.a === name ? { borderColor: T.accent, borderWidth: 2 } : {}),
                        }}>{name}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!submitted ? (
          <button onClick={handleSubmit} style={{
            width: "100%", padding: "14px 0", borderRadius: 10, border: "none", cursor: "pointer",
            background: T.warm, color: "#fff", fontWeight: 800, fontSize: 15,
          }}>Yoxla</button>
        ) : (
          <div style={{ ...box, textAlign: "center" }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: correct / total >= 0.6 ? T.accent : "#C0392B", margin: "0 0 6px" }}>
              {correct} / {total}
            </p>
            <p style={{ fontSize: 13, color: T.textSoft, margin: 0 }}>
              {correct / total >= 0.6 ? "Təbriklər, keçdin!" : "Bir daha cəhd et"}
            </p>
          </div>
        )}
      </section>
    );
  }

  return null;
}
