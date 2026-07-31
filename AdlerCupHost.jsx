import React, { useState, useEffect, useRef } from "react";
import { sb, sbInsertReturn, sbPatch } from "./supabase";
import { shuffle } from "./utils";
import { LEVELS } from "./constants";
import { SHAPES, ShapeIcon } from "./shapes";

const T = {
  navy: "#003366", text: "#2A3D3C", textSoft: "rgba(42,61,60,0.68)",
  accent: "#00A896", warm: "#FF8C00", surface: "#FFFFFF",
  border: "rgba(42,61,60,0.14)", gold: "#D4AF37",
};

const QUESTION_COUNT = 12;
const TIME_LIMIT = 20;

const MODES = [
  { key: "lesson",  label: "Ders tekrari",  icon: "\u{1F3AF}", desc: "Secilmis seviyyenin qrammatika suallari" },
  { key: "germany", label: "Almaniya turu", icon: "\u{1F1E9}\u{1F1EA}", desc: "Medeniyyet ve heyat suallari" },
  { key: "vocab",   label: "Soz yarisi",    icon: "\u{1F4D6}", desc: "Lugetden suretli tercume" },
  { key: "mixed",   label: "Qarisiq",       icon: "\u{1F3B2}", desc: "Hamisindan birlikde" },
];

function makePin() { return String(Math.floor(100000 + Math.random() * 900000)); }

async function buildQuestions(mode, level) {
  const map = { A: 0, B: 1, C: 2 };
  async function fromLessons() {
    const lvl = level || "A1";
    const rows = await sb(`lesson_questions?level=eq.${lvl}&select=question,option_a,option_b,option_c,correct&limit=400`);
    return shuffle(rows).slice(0, QUESTION_COUNT).map((r) => ({
      q: r.question, options: [r.option_a, r.option_b, r.option_c], correct: map[r.correct] ?? 0, tag: lvl,
    }));
  }
  async function fromGermany() {
    const rows = await sb("germany_facts?select=question,option_a,option_b,option_c,correct&limit=100");
    return shuffle(rows).slice(0, QUESTION_COUNT).map((r) => ({
      q: r.question, options: [r.option_a, r.option_b, r.option_c], correct: map[r.correct] ?? 0, tag: "Almaniya",
    }));
  }
  async function fromVocab() {
    const lvl = level || "A1";
    // Dəqiq etiketlənmiş (level) sözlərdən istifadə et; kifayət qədər olmasa, bütün lüğətə keç
    let rows = await sb(`dictionary?direction=eq.de-az&level=eq.${lvl}&select=term,translation&limit=400`);
    if (!rows || rows.length < 6) {
      rows = await sb("dictionary?direction=eq.de-az&select=term,translation&limit=400");
    }
    const pool = shuffle(rows).filter((r) => r.term && r.translation);
    return pool.slice(0, QUESTION_COUNT).map((r) => {
      const wrong = shuffle(pool.filter((x) => x.translation !== r.translation)).slice(0, 2).map((x) => x.translation);
      const opts = shuffle([r.translation, ...wrong]);
      return { q: `"${r.term}" sozunun menasi?`, options: opts, correct: opts.indexOf(r.translation), tag: lvl };
    });
  }
  if (mode === "lesson")  return await fromLessons();
  if (mode === "germany") return await fromGermany();
  if (mode === "vocab")   return await fromVocab();
  const a = await fromLessons(), b = await fromGermany(), c = await fromVocab();
  return shuffle([...a.slice(0, 4), ...b.slice(0, 4), ...c.slice(0, 4)]).slice(0, QUESTION_COUNT);
}

export default function AdlerCupHost({ profile, onExit }) {
  const [mode, setMode] = useState("mixed");
  const [level, setLevel] = useState("A1");
  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [left, setLeft] = useState(TIME_LIMIT);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const poll = useRef(null);
  const tickRef = useRef(null);

  useEffect(() => {
    if (!game) return;
    async function refresh() {
      try {
        const ps = await sb(`live_game_players?game_id=eq.${game.id}&select=*&order=score.desc`);
        setPlayers(ps || []);
        if (game.status === "active" && game.current_index >= 0) {
          const as = await sb(`live_game_answers?game_id=eq.${game.id}&question_index=eq.${game.current_index}&select=player_id,is_correct`);
          setAnswers(as || []);
        }
      } catch {}
    }
    refresh();
    poll.current = setInterval(refresh, 1800);
    return () => clearInterval(poll.current);
  }, [game]);

  // geri sayim
  useEffect(() => {
    clearInterval(tickRef.current);
    if (!game || game.status !== "active" || game.revealed) return;
    setLeft(TIME_LIMIT);
    tickRef.current = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) { clearInterval(tickRef.current); reveal(); return 0; }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [game && game.current_index, game && game.revealed, game && game.status]);

  async function createGame() {
    setBusy(true); setErr("");
    try {
      const qs = await buildQuestions(mode, level);
      if (!qs.length) { setErr("Bu rejim ucun sual tapilmadi."); setBusy(false); return; }
      const row = await sbInsertReturn("live_games", {
        pin: makePin(), host_email: profile?.email || null, host_name: profile?.name || "Muellim",
        mode, level: mode === "lesson" ? level : null,
        status: "waiting", current_index: -1, revealed: false, questions: qs,
      });
      setGame(row);
    } catch { setErr("Oyun yaradila bilmedi."); }
    setBusy(false);
  }

  async function startNext() {
    const nextIdx = game.current_index + 1;
    const total = (game.questions || []).length;
    if (nextIdx >= total) return finish();
    await sbPatch(`live_games?id=eq.${game.id}`, {
      status: "active", current_index: nextIdx, revealed: false,
      question_started_at: new Date().toISOString(),
    });
    setGame({ ...game, status: "active", current_index: nextIdx, revealed: false });
    setAnswers([]);
  }

  async function reveal() {
    if (!game || game.revealed) return;
    await sbPatch(`live_games?id=eq.${game.id}`, { revealed: true });
    setGame((g) => ({ ...g, revealed: true }));
  }

  async function finish() {
    await sbPatch(`live_games?id=eq.${game.id}`, { status: "finished" });
    setGame({ ...game, status: "finished" });
  }

  const box = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 16px" };
  const btn = { background: T.accent, color: "#fff", border: "none", borderRadius: 10, padding: "13px 22px", fontWeight: 800, fontSize: 14.5, cursor: "pointer" };
  const ghost = { background: "transparent", color: T.textSoft, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" };

  // ---------- Qurulus ----------
  if (!game) {
    return (
      <div style={box}>
        <h3 style={{ margin: "0 0 4px", fontFamily: "'Fraunces', serif", fontSize: 19, color: T.navy }}>Yeni oyun yarat</h3>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: T.textSoft }}>
          Bu ekran proyektorda gosterilir. Telebeler telefonda yalniz fiqurlari gorur.
        </p>
        <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
          {MODES.map((m) => (
            <button key={m.key} onClick={() => setMode(m.key)} style={{
              display: "flex", alignItems: "center", gap: 11, textAlign: "left",
              padding: "12px 14px", borderRadius: 11, cursor: "pointer",
              background: mode === m.key ? "rgba(0,168,150,0.10)" : "transparent",
              border: `1px solid ${mode === m.key ? T.accent : T.border}`,
            }}>
              <span style={{ fontSize: 20 }}>{m.icon}</span>
              <span>
                <span style={{ display: "block", fontWeight: 800, fontSize: 14, color: T.navy }}>{m.label}</span>
                <span style={{ display: "block", fontSize: 11.5, color: T.textSoft }}>{m.desc}</span>
              </span>
            </button>
          ))}
        </div>
        {(mode === "lesson" || mode === "vocab") && (
          <div style={{ display: "flex", gap: 7, marginBottom: 14, flexWrap: "wrap" }}>
            {LEVELS.map((l) => (
              <button key={l} onClick={() => setLevel(l)} style={{
                padding: "7px 15px", borderRadius: 18, fontSize: 13, fontWeight: 800, cursor: "pointer",
                background: level === l ? T.accent : "transparent",
                color: level === l ? "#fff" : T.warm,
                border: `1px solid ${level === l ? T.accent : T.border}`,
              }}>{l}</button>
            ))}
          </div>
        )}
        {err && <p style={{ color: "#C0392B", fontSize: 13, margin: "0 0 10px" }}>{err}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={createGame} disabled={busy} style={{ ...btn, flex: 1, opacity: busy ? 0.6 : 1 }}>
            {busy ? "Hazirlanir..." : "Oyunu yarat"}
          </button>
          {onExit && <button onClick={onExit} style={ghost}>Bagla</button>}
        </div>
      </div>
    );
  }

  const total = (game.questions || []).length;
  const cur = game.current_index >= 0 ? game.questions[game.current_index] : null;

  // ---------- Lobbi ----------
  if (game.status === "waiting") {
    return (
      <div style={{ ...box, textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: 1.6, color: T.warm }}>QOSULMA KODU</p>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 54, fontWeight: 700, color: T.navy, letterSpacing: 8, margin: "6px 0 4px" }}>
          {game.pin}
        </div>
        <p style={{ margin: "0 0 18px", fontSize: 12.5, color: T.textSoft }}>
          Telebeler "Adler Cup" bolmesinde bu kodu yazir
        </p>
        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14, textAlign: "left" }}>
          <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, color: T.navy }}>Qosulanlar ({players.length})</p>
          {players.length === 0 && <p style={{ fontSize: 12.5, color: T.textSoft, margin: 0 }}>Gozlenilir...</p>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {players.map((p) => (
              <span key={p.id} style={{
                padding: "6px 12px", borderRadius: 16, fontSize: 12.5, fontWeight: 700,
                background: "rgba(0,168,150,0.10)", color: T.navy, border: `1px solid ${T.border}`,
              }}>{p.nickname}</span>
            ))}
          </div>
        </div>
        <button onClick={startNext} disabled={players.length === 0}
          style={{ ...btn, width: "100%", marginTop: 18, opacity: players.length === 0 ? 0.5 : 1 }}>
          Oyunu basla ({total} sual)
        </button>
      </div>
    );
  }

  // ---------- Yekun ----------
  if (game.status === "finished") {
    const medals = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];
    return (
      <div style={box}>
        <h3 style={{ margin: "0 0 14px", fontFamily: "'Fraunces', serif", fontSize: 21, color: T.navy, textAlign: "center" }}>
          Adler Cup yekunu
        </h3>
        <div style={{ display: "grid", gap: 8 }}>
          {players.map((p, i) => (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 11,
              background: i < 3 ? "rgba(212,175,55,0.12)" : "transparent",
              border: `1px solid ${i < 3 ? T.gold : T.border}`,
            }}>
              <span style={{ fontSize: 17, width: 26 }}>{medals[i] || i + 1}</span>
              <span style={{ fontWeight: 700, color: T.navy, flex: 1 }}>{p.nickname}</span>
              <span style={{ fontWeight: 800, color: T.accent }}>{p.score}</span>
            </div>
          ))}
        </div>
        <button onClick={() => { setGame(null); setPlayers([]); }} style={{ ...btn, width: "100%", marginTop: 16 }}>
          Yeni oyun
        </button>
      </div>
    );
  }

  // ---------- Sual ekrani (proyektor) ----------
  const correctCount = answers.filter((a) => a.is_correct).length;
  return (
    <div style={box}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: T.warm }}>PIN {game.pin}</span>
        <span style={{ fontSize: 12, color: T.textSoft }}>Sual {game.current_index + 1}/{total}</span>
      </div>

      {/* Taymer */}
      {!game.revealed && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: left <= 5 ? "rgba(226,27,60,0.12)" : "rgba(0,168,150,0.12)",
            border: `2px solid ${left <= 5 ? "#E21B3C" : T.accent}`,
            fontWeight: 800, fontSize: 16, color: left <= 5 ? "#E21B3C" : T.accent,
          }}>{left}</div>
          <div style={{ flex: 1 }}>
            <div style={{ height: 6, borderRadius: 4, background: "rgba(42,61,60,0.10)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(left / TIME_LIMIT) * 100}%`, background: T.accent, transition: "width 1s linear" }} />
            </div>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: T.textSoft }}>
              Cavab veren: <b style={{ color: T.navy }}>{answers.length}</b> / {players.length}
            </p>
          </div>
        </div>
      )}

      {/* Sual */}
      <p style={{ fontSize: 20, fontWeight: 800, color: T.navy, lineHeight: 1.4, margin: "0 0 16px", textAlign: "center" }}>
        {cur?.q}
      </p>

      {/* Cavab qutulari */}
      <div style={{ display: "grid", gap: 10 }}>
        {(cur?.options || []).map((o, i) => {
          const sh = SHAPES[i];
          const isRight = i === cur.correct;
          const dim = game.revealed && !isRight;
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "15px 16px", borderRadius: 12,
              background: sh.color, opacity: dim ? 0.32 : 1,
              transition: "opacity .3s",
              boxShadow: game.revealed && isRight ? "0 0 0 3px #D4AF37" : "none",
            }}>
              <ShapeIcon kind={sh.key} size={26} />
              <span style={{ color: "#fff", fontSize: 15.5, fontWeight: 700, flex: 1 }}>{o}</span>
              {game.revealed && isRight && <span style={{ color: "#fff", fontSize: 20 }}>&#10003;</span>}
            </div>
          );
        })}
      </div>

      {/* Idareetme */}
      {!game.revealed ? (
        <button onClick={reveal} style={{ ...btn, width: "100%", marginTop: 14 }}>Cavabi ac</button>
      ) : (
        <>
          <p style={{ textAlign: "center", fontSize: 13, color: T.textSoft, margin: "14px 0 10px" }}>
            Duzgun cavab veren: <b style={{ color: T.accent }}>{correctCount}</b> / {answers.length}
          </p>
          <button onClick={startNext} style={{ ...btn, width: "100%" }}>
            {game.current_index + 1 >= total ? "Oyunu bitir" : "Novbeti sual"}
          </button>
          {players.length > 0 && (
            <div style={{ marginTop: 16, borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
              {players.slice(0, 5).map((p, i) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "3px 0" }}>
                  <span style={{ color: T.text }}>{i + 1}. {p.nickname}</span>
                  <span style={{ fontWeight: 700, color: T.accent }}>{p.score}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
