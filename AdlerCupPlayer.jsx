import React, { useState, useEffect, useRef } from "react";
import { sb, sbInsertReturn, sbPatch } from "./supabase";
import { SHAPES, ShapeIcon } from "./shapes";

const T = {
  navy: "#003366", text: "#2A3D3C", textSoft: "rgba(42,61,60,0.68)",
  accent: "#00A896", warm: "#FF8C00", surface: "#FFFFFF",
  border: "rgba(42,61,60,0.14)", gold: "#D4AF37", danger: "#C0392B",
};

const BASE = 100;        // duzgun cavab
const FIRST_BONUS = 75;  // ilk duzgun cavab verene
const STEP = 12;         // her novbeti duzgun cavab ucun azalma

export default function AdlerCupPlayer({ onExit }) {
  const [pin, setPin] = useState("");
  const [nick, setNick] = useState("");
  const [player, setPlayer] = useState(null);
  const [game, setGame] = useState(null);
  const [picked, setPicked] = useState(null);
  const [result, setResult] = useState(null);
  const [rank, setRank] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const poll = useRef(null);
  const lastIdx = useRef(-1);

  useEffect(() => {
    if (!game || !player) return;
    async function tick() {
      try {
        const rows = await sb(`live_games?id=eq.${game.id}&select=*`);
        const g = rows && rows[0];
        if (!g) return;
        if (g.current_index !== lastIdx.current) {
          lastIdx.current = g.current_index;
          setPicked(null); setResult(null);
        }
        setGame(g);
        if (g.status === "finished") {
          const ps = await sb(`live_game_players?game_id=eq.${g.id}&select=id,nickname,score&order=score.desc`);
          const i = (ps || []).findIndex((p) => p.id === player.id);
          setRank({ pos: i + 1, total: (ps || []).length, list: ps || [] });
        }
      } catch {}
    }
    tick();
    poll.current = setInterval(tick, 1800);
    return () => clearInterval(poll.current);
  }, [game && game.id, player]);

  async function join() {
    setErr(""); setBusy(true);
    try {
      const rows = await sb(`live_games?pin=eq.${pin.trim()}&select=*`);
      const g = rows && rows[0];
      if (!g) { setErr("Bu kodla oyun tapilmadi."); setBusy(false); return; }
      if (g.status === "finished") { setErr("Bu oyun artiq bitib."); setBusy(false); return; }
      const p = await sbInsertReturn("live_game_players", {
        game_id: g.id, nickname: nick.trim().slice(0, 20) || "Telebe", score: 0,
      });
      lastIdx.current = g.current_index;
      setGame(g); setPlayer(p);
    } catch { setErr("Qosulmaq alinmadi."); }
    setBusy(false);
  }

  async function answer(i) {
    if (picked !== null || !game || game.current_index < 0 || game.revealed) return;
    setPicked(i);
    const q = (game.questions || [])[game.current_index];
    const correct = q && i === q.correct;
    let gain = 0, place = null;

    try {
      if (correct) {
        // necenci duzgun cavabdir?
        const prior = await sb(`live_game_answers?game_id=eq.${game.id}&question_index=eq.${game.current_index}&is_correct=is.true&select=id`);
        place = (prior || []).length + 1;
        gain = BASE + Math.max(0, FIRST_BONUS - STEP * (place - 1));
      }
      await sbInsertReturn("live_game_answers", {
        game_id: game.id, player_id: player.id,
        question_index: game.current_index, answer_index: i, is_correct: !!correct,
      });
      if (gain > 0) {
        await sbPatch(`live_game_players?id=eq.${player.id}`, { score: (player.score || 0) + gain });
        setPlayer((p) => ({ ...p, score: (p.score || 0) + gain }));
      }
    } catch {}
    setResult({ correct, gain, place });
  }

  const box = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 16px" };
  const btn = { background: T.accent, color: "#fff", border: "none", borderRadius: 10, padding: "13px 22px", fontWeight: 800, fontSize: 14.5, cursor: "pointer" };
  const input = { width: "100%", padding: "13px 14px", borderRadius: 10, border: `1px solid ${T.border}`, background: "#FFFFFF", color: T.text, fontSize: 15, boxSizing: "border-box", marginBottom: 10 };

  // ---------- Qosulma ----------
  if (!player) {
    return (
      <div style={box}>
        <h3 style={{ margin: "0 0 4px", fontFamily: "'Fraunces', serif", fontSize: 19, color: T.navy }}>Oyuna qosul</h3>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: T.textSoft }}>Muellimin ekranindaki kodu yaz.</p>
        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000" inputMode="numeric"
          style={{ ...input, letterSpacing: 6, fontWeight: 800, textAlign: "center", fontSize: 22 }} />
        <input value={nick} onChange={(e) => setNick(e.target.value)} placeholder="Adin" style={input} />
        {err && <p style={{ color: T.danger, fontSize: 13, margin: "0 0 10px" }}>{err}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={join} disabled={busy || pin.length < 6} style={{ ...btn, flex: 1, opacity: busy || pin.length < 6 ? 0.5 : 1 }}>
            {busy ? "Qosulur..." : "Qosul"}
          </button>
          {onExit && <button onClick={onExit} style={{ background: "transparent", color: T.textSoft, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Bagla</button>}
        </div>
      </div>
    );
  }

  // ---------- Yekun ----------
  if (game.status === "finished" && rank) {
    const medals = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];
    return (
      <div style={{ ...box, textAlign: "center" }}>
        <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.6, color: T.warm, margin: 0 }}>ADLER CUP</p>
        <div style={{ fontSize: 46, margin: "8px 0 2px" }}>{medals[rank.pos - 1] || "\u{1F3C5}"}</div>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: 25, fontWeight: 700, color: T.navy, margin: "0 0 4px" }}>
          {rank.pos}. yer
        </p>
        <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 16px" }}>
          {rank.total} istirakcidan &middot; <b style={{ color: T.accent }}>{player.score} xal</b>
        </p>
        <div style={{ textAlign: "left", borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
          {rank.list.slice(0, 5).map((p, i) => (
            <div key={p.id} style={{
              display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0",
              fontWeight: p.id === player.id ? 800 : 500,
              color: p.id === player.id ? T.navy : T.text,
            }}>
              <span>{i + 1}. {p.nickname}</span>
              <span style={{ color: T.accent, fontWeight: 700 }}>{p.score}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------- Gozleme ----------
  if (game.status === "waiting" || game.current_index < 0) {
    return (
      <div style={{ ...box, textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>&#129413;</div>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: T.navy, margin: "0 0 4px" }}>
          Salam, {player.nickname}!
        </p>
        <p style={{ fontSize: 13.5, color: T.textSoft, margin: 0 }}>Muellim oyunu baslayana qeder gozle...</p>
      </div>
    );
  }

  const q = (game.questions || [])[game.current_index];
  if (!q) return null;

  // ---------- Sual + tam cavab mətni ----------
  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0 2px 10px", fontSize: 12.5, color: T.textSoft,
      }}>
        <span>Sual {game.current_index + 1}/{(game.questions || []).length}</span>
        <span style={{ fontWeight: 800, color: T.accent, fontSize: 14 }}>{player.score} xal</span>
      </div>

      <p style={{ fontSize: 16.5, fontWeight: 700, color: T.navy, lineHeight: 1.45, margin: "0 0 14px" }}>
        {q.q}
      </p>

      <div style={{ display: "grid", gap: 9 }}>
        {(q.options || []).map((o, i) => {
          const sh = SHAPES[i];
          const isRight = i === q.correct;
          let opacity = 1, ring = "none";
          if (picked !== null || game.revealed) {
            if (game.revealed) {
              opacity = isRight ? 1 : 0.35;
              if (isRight) ring = "0 0 0 3px #D4AF37";
            } else {
              opacity = i === picked ? 1 : 0.4;
            }
          }
          return (
            <button key={i} onClick={() => answer(i)}
              disabled={picked !== null || game.revealed}
              style={{
                display: "flex", alignItems: "center", gap: 12, textAlign: "left", width: "100%",
                minHeight: 54, borderRadius: 12, border: "none", padding: "12px 14px",
                background: sh.color, opacity, boxShadow: ring,
                cursor: picked !== null || game.revealed ? "default" : "pointer",
                transition: "opacity .25s",
              }}>
              <ShapeIcon kind={sh.key} size={22} />
              <span style={{ color: "#fff", fontSize: 14.5, fontWeight: 700 }}>{o}</span>
              {game.revealed && isRight && <span style={{ marginLeft: "auto", color: "#fff", fontSize: 18 }}>&#10003;</span>}
            </button>
          );
        })}
      </div>

      {result && (
        <div style={{
          marginTop: 14, padding: "14px 16px", borderRadius: 12, textAlign: "center",
          background: result.correct ? "rgba(0,168,150,0.10)" : "rgba(192,57,43,0.08)",
          border: `1px solid ${result.correct ? T.accent : T.danger}`,
        }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: result.correct ? T.accent : T.danger }}>
            {result.correct ? `+${result.gain} xal` : "Duzgun deyil"}
          </span>
          {result.correct && result.place === 1 && (
            <span style={{ display: "block", fontSize: 12.5, color: T.warm, fontWeight: 700, marginTop: 4 }}>
              &#9889; Ilk duzgun cavab!
            </span>
          )}
          {result.correct && result.place > 1 && (
            <span style={{ display: "block", fontSize: 12, color: T.textSoft, marginTop: 4 }}>
              {result.place}. duzgun cavab
            </span>
          )}
          {!result.correct && (
            <span style={{ display: "block", fontSize: 12, color: T.textSoft, marginTop: 4 }}>
              Novbeti suala hazirlas
            </span>
          )}
        </div>
      )}

      {picked === null && !game.revealed && (
        <p style={{ textAlign: "center", fontSize: 11.5, color: T.textSoft, marginTop: 12 }}>
          Tez cavab ver \u2014 ilk duzgun cavab {BASE + FIRST_BONUS} xal qazandirir
        </p>
      )}
    </div>
  );
}
