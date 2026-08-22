import React, { useState, useEffect, useRef } from "react";
import { sb, sbInsertReturn, sbRpc } from "./supabase";
import { SHAPES, ShapeIcon } from "./shapes";
import { useLanguage } from "./i18n/LanguageContext";

const T = {
  navy: "#003366", text: "#2A3D3C", textSoft: "rgba(42,61,60,0.68)",
  accent: "#00A896", warm: "#FF8C00", surface: "#FFFFFF",
  border: "rgba(42,61,60,0.14)", gold: "#D4AF37", danger: "#C0392B",
};

const BASE = 100;        // duzgun cavab
const FIRST_BONUS = 75;  // ilk duzgun cavab verene
const STEP = 12;         // her novbeti duzgun cavab ucun azalma

export default function AdlerCupPlayer({ onExit }) {
  const { t } = useLanguage();
  const [pin, setPin] = useState("");
  const [nick, setNick] = useState("");
  const [foundGame, setFoundGame] = useState(null); // PIN ile tapilan, hele qosulmamis oyun
  const [teamChoice, setTeamChoice] = useState(null);
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

  async function findGame() {
    setErr(""); setBusy(true);
    try {
      const rows = await sb(`live_games?pin=eq.${pin.trim()}&select=*`);
      const g = rows && rows[0];
      if (!g) { setErr(t("game_not_found")); setBusy(false); return; }
      if (g.status === "finished") { setErr(t("game_already_finished")); setBusy(false); return; }
      if (g.team_mode && (g.team_names || []).length > 0) {
        setFoundGame(g);
      } else {
        await finalJoin(g, null);
      }
    } catch { setErr(t("join_failed")); }
    setBusy(false);
  }

  async function finalJoin(g, teamName) {
    setErr(""); setBusy(true);
    try {
      const p = await sbInsertReturn("live_game_players", {
        game_id: g.id, nickname: nick.trim().slice(0, 20) || t("student_fallback"), score: 0,
        team_name: teamName || null,
      });
      lastIdx.current = g.current_index;
      setGame(g); setPlayer(p);
    } catch { setErr(t("join_failed")); }
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
        const newScore = await sbRpc("submit_player_score", {
          p_player_id: player.id, p_token: player.player_token, p_gain: gain,
        });
        setPlayer((p) => ({ ...p, score: newScore }));
      }
    } catch {}
    setResult({ correct, gain, place });
  }

  const box = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 16px" };
  const btn = { background: T.accent, color: "#fff", border: "none", borderRadius: 10, padding: "13px 22px", fontWeight: 800, fontSize: 14.5, cursor: "pointer" };
  const input = { width: "100%", padding: "13px 14px", borderRadius: 10, border: `1px solid ${T.border}`, background: "#FFFFFF", color: T.text, fontSize: 15, boxSizing: "border-box", marginBottom: 10 };

  // ---------- Qosulma ----------
  if (!player) {
    if (foundGame) {
      return (
        <div style={box}>
          <h3 style={{ margin: "0 0 4px", fontFamily: "'Fraunces', serif", fontSize: 19, color: T.navy }}>{t("choose_team_title")}</h3>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: T.textSoft }}>{t("team_game_desc")}</p>
          <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
            {(foundGame.team_names || []).map((tn) => (
              <button key={tn} onClick={() => setTeamChoice(tn)} style={{
                padding: "13px 14px", borderRadius: 10, textAlign: "left", cursor: "pointer",
                background: teamChoice === tn ? "rgba(0,168,150,0.10)" : "#fff",
                border: `1px solid ${teamChoice === tn ? T.accent : T.border}`,
                fontWeight: 800, fontSize: 14.5, color: T.navy,
              }}>{tn}</button>
            ))}
          </div>
          <input value={nick} onChange={(e) => setNick(e.target.value)} placeholder={t("name_placeholder")} style={input} />
          {err && <p style={{ color: T.danger, fontSize: 13, margin: "0 0 10px" }}>{err}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => finalJoin(foundGame, teamChoice)} disabled={busy || !teamChoice}
              style={{ ...btn, flex: 1, opacity: busy || !teamChoice ? 0.5 : 1 }}>
              {busy ? t("joining") : t("join_btn")}
            </button>
            <button onClick={() => { setFoundGame(null); setTeamChoice(null); }} style={{ background: "transparent", color: T.textSoft, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{t("back")}</button>
          </div>
        </div>
      );
    }
    return (
      <div style={box}>
        <h3 style={{ margin: "0 0 4px", fontFamily: "'Fraunces', serif", fontSize: 19, color: T.navy }}>{t("join_game_title")}</h3>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: T.textSoft }}>{t("teacher_code_desc")}</p>
        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000" inputMode="numeric"
          style={{ ...input, letterSpacing: 6, fontWeight: 800, textAlign: "center", fontSize: 22 }} />
        <input value={nick} onChange={(e) => setNick(e.target.value)} placeholder={t("name_placeholder")} style={input} />
        {err && <p style={{ color: T.danger, fontSize: 13, margin: "0 0 10px" }}>{err}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={findGame} disabled={busy || pin.length < 6} style={{ ...btn, flex: 1, opacity: busy || pin.length < 6 ? 0.5 : 1 }}>
            {busy ? t("checking") : t("continue")}
          </button>
          {onExit && <button onClick={onExit} style={{ background: "transparent", color: T.textSoft, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{t("close")}</button>}
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
          {rank.pos}. {t("place_suffix")}
        </p>
        <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 16px" }}>
          {rank.total} {t("participants_of")} &middot; <b style={{ color: T.accent }}>{player.score} {t("points_unit")}</b>
          {player.team_name && <> &middot; <b style={{ color: T.navy }}>{player.team_name}</b></>}
        </p>

        {game.team_mode && (
          <div style={{ textAlign: "left", marginBottom: 14 }}>
            <p style={{ fontSize: 11.5, fontWeight: 800, color: T.warm, margin: "0 0 8px" }}>{t("team_result_header")}</p>
            {Object.entries(game.team_scores || {}).sort((a, b) => b[1] - a[1]).map(([tn, sc], i) => (
              <div key={tn} style={{
                display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 10px",
                borderRadius: 8, marginBottom: 4,
                background: i === 0 ? "rgba(212,175,55,0.12)" : "transparent",
                fontWeight: tn === player.team_name ? 800 : 500,
              }}>
                <span>{i === 0 ? "\u{1F3C6} " : ""}{tn}</span>
                <span style={{ color: T.accent, fontWeight: 700 }}>{sc} {t("round_unit")}</span>
              </div>
            ))}
          </div>
        )}

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
          {t("greeting_hi")}, {player.nickname}!
        </p>
        <p style={{ fontSize: 13.5, color: T.textSoft, margin: 0 }}>{t("waiting_teacher")}</p>
      </div>
    );
  }

  const q = (game.questions || [])[game.current_index];
  if (!q) return null;
  const nOpts = (q.options || []).length;

  // ---------- Cavab ekrani: YALNIZ FIQURLAR ----------
  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0 2px 10px", fontSize: 12.5, color: T.textSoft,
      }}>
        <span>{t("question_word")} {game.current_index + 1}/{(game.questions || []).length}</span>
        <span style={{ fontWeight: 800, color: T.accent, fontSize: 14 }}>{player.score} {t("points_unit")}</span>
      </div>

      <p style={{
        textAlign: "center", fontSize: 13.5, color: T.textSoft,
        margin: "0 0 12px", lineHeight: 1.5,
      }}>
        {game.revealed ? t("answer_revealed") : t("watch_teacher_screen")}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {Array.from({ length: nOpts }).map((_, i) => {
          const sh = SHAPES[i];
          const isRight = i === q.correct;
          let opacity = 1, ring = "none";
          if (picked !== null || game.revealed) {
            if (game.revealed) {
              opacity = isRight ? 1 : 0.28;
              if (isRight) ring = "0 0 0 3px #D4AF37";
            } else {
              opacity = i === picked ? 1 : 0.35;
            }
          }
          const wide = nOpts === 3 && i === 2;
          return (
            <button key={i} onClick={() => answer(i)}
              disabled={picked !== null || game.revealed}
              style={{
                gridColumn: wide ? "span 2" : "span 1",
                minHeight: 108, borderRadius: 14, border: "none",
                background: sh.color, opacity, boxShadow: ring,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: picked !== null || game.revealed ? "default" : "pointer",
                transition: "opacity .25s, transform .1s",
              }}>
              <ShapeIcon kind={sh.key} size={46} />
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
            {result.correct ? `+${result.gain} ${t("points_unit")}` : t("not_correct")}
          </span>
          {result.correct && result.place === 1 && (
            <span style={{ display: "block", fontSize: 12.5, color: T.warm, fontWeight: 700, marginTop: 4 }}>
              &#9889; {t("first_correct")}
            </span>
          )}
          {result.correct && result.place > 1 && (
            <span style={{ display: "block", fontSize: 12, color: T.textSoft, marginTop: 4 }}>
              {result.place}. {t("nth_correct_suffix")}
            </span>
          )}
          {!result.correct && (
            <span style={{ display: "block", fontSize: 12, color: T.textSoft, marginTop: 4 }}>
              {t("prepare_next")}
            </span>
          )}
        </div>
      )}

      {picked === null && !game.revealed && (
        <p style={{ textAlign: "center", fontSize: 11.5, color: T.textSoft, marginTop: 12 }}>
          {t("quick_answer_prefix")} {BASE + FIRST_BONUS} {t("quick_answer_suffix")}
        </p>
      )}
    </div>
  );
}
