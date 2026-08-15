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
  const [answers1, setAnswers1] = useState({});
  const [answers2, setAnswers2] = useState({});
  const [answers3, setAnswers3] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [progress, setProgress] = useState({});

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
    if (current.level === "B1") {
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
    if (current.level === "B1") {
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
    return (
      <section style={{ maxWidth: 620, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
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
        <div style={{ display: "grid", gap: 10 }}>
          {LEVELS.map((l) => (
            <button key={l} onClick={() => { setLevel(l); setScreen("groups"); }} style={{
              ...box, textAlign: "left", cursor: "pointer", display: "flex",
              justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: T.navy }}>{l}</span>
              <span style={{ color: T.textSoft, fontSize: 13 }}>→</span>
            </button>
          ))}
        </div>
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

        {/* Hisse 1 */}
        <div style={{ ...box, marginBottom: 18 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: T.warm, margin: "0 0 8px", textTransform: "uppercase" }}>
            Hissə 1{current.level === "B1" ? " — 5 qısa mətn" : ` — ${current.part1_title}`}
          </p>
          {current.level === "B1" ? (
            <>
              <AudioBlock
                text={(current.part1_items || []).map((it, i) => `Mətn ${i + 1}. ${it.text}`).join(" ")}
                audioUrl={current.part1_audio_url}
              />
              <div style={{ display: "grid", gap: 16 }}>
                {(current.part1_items || []).map((it, i) => (
                  <div key={i}>
                    <p style={{ fontSize: 12, fontWeight: 800, color: T.textSoft, margin: "0 0 4px", textTransform: "uppercase" }}>Mətn {i + 1}</p>
                    <p style={{ fontSize: 14, color: T.text, fontWeight: 600, marginBottom: 6 }}>{it.question}</p>
                    <div style={{ display: "grid", gap: 6 }}>
                      {Object.entries(it.options || {}).map(([key, val]) => (
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
              current.level === "B1" ? (
                <div key={i}>
                  <p style={{ fontSize: 14, color: T.text, fontWeight: 600, marginBottom: 6 }}>{i + 1}. {q.q}</p>
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
        {current.level === "B1" && (
          <div style={{ ...box, marginBottom: 18 }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: T.warm, margin: "0 0 8px", textTransform: "uppercase" }}>Hissə 3 — {current.part3_title}</p>
            <AudioBlock text={current.part3_text} audioUrl={current.part3_audio_url} />
            <div style={{ display: "grid", gap: 14 }}>
              {(current.part3_questions || []).map((q, i) => (
                <div key={i}>
                  <p style={{ fontSize: 14, color: T.text, fontWeight: 600, marginBottom: 6 }}>{i + 1}. {q.q}</p>
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
