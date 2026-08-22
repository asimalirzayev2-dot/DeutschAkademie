import React, { useState, useEffect, useRef } from "react";
import Avatar from "./Avatar";
import { shuffle } from "./utils";
import { sb, sbAuthInsert } from "./supabase";
import { useLanguage } from "./i18n/LanguageContext";

const T = {
  navy: "#003366", text: "#2A3D3C", textSoft: "rgba(42,61,60,0.66)",
  accent: "#00A896", warm: "#FF8C00", surface: "#FFFFFF",
  border: "rgba(42,61,60,0.14)", gold: "#D4AF37", danger: "#C0392B",
  bgSoft: "rgba(0,51,102,0.04)",
};

const SESSION_TIME = 240;      // Ardıcıl rejim: 14 söz üçün ümumi 4 dəqiqə
const WORDS_PER_SESSION = 14;
const POINTS_PER_LETTER = 100;
const HINT_PENALTY = 100;

// Hər səviyyənin öz "medalyon heyvanı" — hamıya açıq heyvanlardan (Avatar.jsx)
const LEVELS = {
  A1: { tierKey: "tier_beginner", medal: "dovsan" },
  A2: { tierKey: "tier_elementary", medal: "tulku" },
  B1: { tierKey: "tier_intermediate", medal: "qurd" },
  B2: { tierKey: "tier_upper_intermediate", medal: "aslan" },
};
const LEVEL_ORDER = ["A1", "A2", "B1", "B2"];

// Yalnız hərflərə icazə (ß qəsdən çıxarılıb: toUpperCase() onu "SS"-ə çevirir,
// bu da tək qutuya iki hərf yazılmasına səbəb olur), boşluqsuz, tire olmadan tək söz.
const LETTER_RE = /^[a-zA-ZäöüÄÖÜ]$/;
const WORD_RE = /^[a-zA-ZäöüÄÖÜ]{4,14}$/;

// ---- Sözlərin heç vaxt təkrara düşməməsi üçün — buildLevelTest-dəki (App.jsx) eyni məntiq ----
async function getUsedIds(key) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : [];
  } catch { return []; }
}
async function saveUsedIds(key, ids) {
  try { localStorage.setItem(key, JSON.stringify(ids.slice(-3000))); } catch {}
}

async function fetchLevelWords(userId, levelKey, n) {
  const key = `stw_used:${userId || "guest"}:${levelKey}`;
  const used = await getUsedIds(key);
  const rows = await sb(`dictionary?level=eq.${levelKey}&direction=eq.de-az&select=id,term,translation&limit=3000`);
  const valid = (rows || []).filter((r) => WORD_RE.test(r.term));
  const unseen = valid.filter((r) => !used.includes(r.id));
  // Səviyyənin bütün sözləri artıq görülübsə, hovuz sıfırlanır (təkrar yalnız bu halda başlayır)
  const pool = unseen.length >= n ? unseen : valid;
  const poolUsed = unseen.length >= n ? used : [];
  const picked = shuffle(pool).slice(0, n).map((r) => ({
    word: r.term.toUpperCase(), clue: r.translation, length: r.term.length, id: r.id, level: levelKey,
  }));
  await saveUsedIds(key, [...poolUsed, ...picked.map((r) => r.id)]);
  return picked;
}

async function fetchMixedWords(userId, n) {
  const key = `stw_used:${userId || "guest"}:MIXED`;
  const used = await getUsedIds(key);
  const rows = await sb(`dictionary?level=in.(A1,A2,B1,B2)&direction=eq.de-az&select=id,term,translation,level&limit=6000`);
  const valid = (rows || []).filter((r) => WORD_RE.test(r.term));
  const unseen = valid.filter((r) => !used.includes(r.id));
  const pool = unseen.length >= n ? unseen : valid;
  const poolUsed = unseen.length >= n ? used : [];
  const picked = shuffle(pool).slice(0, n).map((r) => ({
    word: r.term.toUpperCase(), clue: r.translation, length: r.term.length, id: r.id, level: r.level,
  }));
  await saveUsedIds(key, [...poolUsed, ...picked.map((r) => r.id)]);
  return picked;
}

export default function SozTapmacasi({ session }) {
  const { t } = useLanguage();
  const levelLabel = (key) => `${key} · ${t(LEVELS[key].tierKey)}`;
  const [screen, setScreen] = useState("select"); // select | loading | game | result
  const [pickedLevel, setPickedLevel] = useState(null);
  const [gameSession, setGameSession] = useState(null);
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => () => clearInterval(timerRef.current), []);

  async function start(levelKey, label, mode) {
    clearInterval(timerRef.current);
    setScreen("loading");
    const raw = levelKey === "MIXED"
      ? await fetchMixedWords(session?.user?.id, WORDS_PER_SESSION)
      : await fetchLevelWords(session?.user?.id, levelKey, WORDS_PER_SESSION);
    if (!raw || raw.length === 0) {
      setScreen("select");
      return;
    }
    const queue = mode === "mixed" ? shuffle(raw) : raw;
    const s = {
      levelKey, label, mode, queue, idx: 0,
      score: 0, timeLeft: SESSION_TIME,
      solvedCount: 0, hintsTotal: 0,
      answer: new Array(queue[0].word.length).fill(null),
      hintedIdx: new Set(), cursor: 0, solved: false,
      feedback: "", feedbackKind: "",
    };
    setGameSession(s);
    setScreen("game");
    if (mode === "sequential") {
      timerRef.current = setInterval(() => {
        setGameSession((prev) => {
          if (!prev) return prev;
          const t = prev.timeLeft - 1;
          if (t <= 0) {
            clearInterval(timerRef.current);
            finishSession(prev, false);
            return prev;
          }
          return { ...prev, timeLeft: t };
        });
      }, 1000);
    }
    setTimeout(() => inputRef.current && inputRef.current.focus(), 60);
  }

  function loadWord(prev, nextIdx) {
    const w = prev.queue[nextIdx];
    return {
      ...prev, idx: nextIdx,
      answer: new Array(w.word.length).fill(null),
      hintedIdx: new Set(), cursor: 0, solved: false,
      feedback: "", feedbackKind: "",
    };
  }

  function currentWord(s) { return s.queue[s.idx]; }

  function handleChar(ch) {
    setGameSession((prev) => {
      if (!prev || prev.solved) return prev;
      const w = currentWord(prev);
      let cursor = prev.cursor;
      while (cursor < w.word.length && prev.hintedIdx.has(cursor)) cursor++;
      if (cursor >= w.word.length) return prev;
      const answer = prev.answer.slice();
      answer[cursor] = ch.toUpperCase();
      cursor++;
      while (cursor < w.word.length && prev.hintedIdx.has(cursor)) cursor++;
      return { ...prev, answer, cursor, feedback: "", feedbackKind: "" };
    });
  }

  function handleBackspace() {
    setGameSession((prev) => {
      if (!prev || prev.solved) return prev;
      let i = prev.cursor - 1;
      while (i >= 0 && prev.hintedIdx.has(i)) i--;
      if (i < 0) return prev;
      const answer = prev.answer.slice();
      answer[i] = null;
      return { ...prev, answer, cursor: i };
    });
  }

  function onHiddenChange(e) {
    const v = e.target.value;
    if (v) {
      const ch = v[v.length - 1];
      if (LETTER_RE.test(ch)) handleChar(ch);
    }
    e.target.value = "";
  }

  function onHiddenKeyDown(e) {
    if (e.key === "Backspace") { e.preventDefault(); handleBackspace(); }
    else if (e.key === "Enter") { e.preventDefault(); check(); }
  }

  function hint() {
    setGameSession((prev) => {
      if (!prev || prev.solved) return prev;
      const w = currentWord(prev);
      const emptyIdx = prev.answer.findIndex((v) => v === null);
      if (emptyIdx === -1) return prev;
      const answer = prev.answer.slice();
      answer[emptyIdx] = w.word[emptyIdx];
      const hintedIdx = new Set(prev.hintedIdx); hintedIdx.add(emptyIdx);
      let cursor = emptyIdx + 1;
      while (cursor < w.word.length && hintedIdx.has(cursor)) cursor++;
      return {
        ...prev, answer, hintedIdx, cursor,
        hintsTotal: prev.hintsTotal + 1,
        score: Math.max(0, prev.score - HINT_PENALTY),
        feedback: t("hint_feedback"), feedbackKind: "",
      };
    });
  }

  function clearGuess() {
    setGameSession((prev) => {
      if (!prev || prev.solved) return prev;
      const w = currentWord(prev);
      const answer = new Array(w.word.length).fill(null);
      prev.hintedIdx.forEach((i) => { answer[i] = w.word[i]; });
      let cursor = 0;
      while (cursor < w.word.length && prev.hintedIdx.has(cursor)) cursor++;
      return { ...prev, answer, cursor, feedback: "", feedbackKind: "" };
    });
  }

  function check() {
    setGameSession((prev) => {
      if (!prev || prev.solved) return prev;
      const w = currentWord(prev);
      if (prev.answer.some((v) => v === null)) {
        return { ...prev, feedback: t("fill_all_boxes"), feedbackKind: "err" };
      }
      const guess = prev.answer.join("");
      if (guess === w.word) {
        const earned = (w.word.length - prev.hintedIdx.size) * POINTS_PER_LETTER;
        const solvedState = {
          ...prev, solved: true, solvedCount: prev.solvedCount + 1,
          score: prev.score + earned,
          feedback: `${t("correct_feedback")} "${w.word}"`, feedbackKind: "ok",
        };
        setTimeout(() => advance(), 850);
        return solvedState;
      }
      return { ...prev, feedback: t("wrong_feedback"), feedbackKind: "err" };
    });
  }

  function advance() {
    setGameSession((prev) => {
      if (!prev) return prev;
      const nextIdx = prev.idx + 1;
      if (nextIdx >= prev.queue.length) {
        clearInterval(timerRef.current);
        finishSession(prev, true);
        return prev;
      }
      const next = loadWord(prev, nextIdx);
      setTimeout(() => inputRef.current && inputRef.current.focus(), 30);
      return next;
    });
  }

  function finishSession(finalSession, completedAll) {
    clearInterval(timerRef.current);
    setGameSession({ ...finalSession, _completedAll: completedAll });
    setScreen("result");
    if (session?.user?.id && finalSession.solvedCount > 0) {
      sbAuthInsert("xp_log", session.access_token, {
        user_id: session.user.id, source: "soz_tapmacasi", amount: finalSession.solvedCount * 5,
        meta: { level: finalSession.levelKey, mode: finalSession.mode, solvedCount: finalSession.solvedCount },
      }).catch(() => {});
    }
  }

  function restart() {
    if (!gameSession) return;
    if (gameSession.levelKey === "MIXED") {
      start("MIXED", t("all_levels"), "mixed");
    } else {
      start(gameSession.levelKey, levelLabel(gameSession.levelKey), gameSession.mode);
    }
  }

  function backToSelect() {
    clearInterval(timerRef.current);
    setGameSession(null);
    setScreen("select");
  }

  // ============ RENDER ============
  const box = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 16px" };
  const btnPrimary = { background: T.accent, color: "#fff", border: "none", borderRadius: 10, padding: "12px 20px", fontWeight: 800, fontSize: 14, cursor: "pointer" };
  const btnGhost = { background: "transparent", color: T.textSoft, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" };

  if (screen === "loading") {
    return (
      <section style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", padding: "60px 0" }}>
        <p style={{ color: T.textSoft }}>{t("words_loading")}</p>
      </section>
    );
  }

  if (screen === "select") {
    return (
      <section style={{ maxWidth: 620, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 9, padding: "7px 16px",
            borderRadius: 22, background: "rgba(0,168,150,0.12)", border: `1px solid ${T.border}`,
          }}>
            <span style={{ fontSize: 17 }}>🐝</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 700, color: T.navy }}>
              {t("word_puzzle")}
            </span>
          </div>
          <p style={{ fontSize: 13.5, color: T.textSoft, margin: "10px 0 0", lineHeight: 1.55 }}>
            {t("stw_subtitle")}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          {LEVEL_ORDER.map((key) => {
            const lv = LEVELS[key];
            const active = pickedLevel === key;
            return (
              <button key={key} onClick={() => setPickedLevel(key)} style={{
                textAlign: "left", padding: "14px 14px", borderRadius: 13, cursor: "pointer",
                background: active ? "rgba(0,168,150,0.10)" : T.surface,
                border: `1px solid ${active ? T.accent : T.border}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Avatar avatarKey={lv.medal} size={30} />
                  <span style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 700, color: T.navy }}>{key}</span>
                </div>
                <p style={{ margin: 0, fontSize: 11.5, color: T.textSoft }}>{t(lv.tierKey)}</p>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => start("MIXED", t("all_levels"), "mixed")}
          style={{
            width: "100%", textAlign: "left", padding: "13px 16px", borderRadius: 12, cursor: "pointer",
            background: "transparent", border: `1px dashed ${T.border}`, color: T.text,
            fontSize: 13.5, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
          <span>🎲 {t("mixed_mode_label")}</span>
          <span style={{ color: T.textSoft }}>→</span>
        </button>

        {pickedLevel && (
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 18 }}>
            <p style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1, color: T.textSoft, margin: "0 0 12px" }}>
              {t("mode_select_header")}
            </p>
            <div style={{ display: "grid", gap: 9 }}>
              <button onClick={() => start(pickedLevel, levelLabel(pickedLevel), "sequential")}
                style={{ ...box, textAlign: "left", cursor: "pointer", border: `1px solid ${T.navy}` }}>
                <p style={{ margin: "0 0 3px", fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 700, color: T.navy }}>
                  {t("sequential_mode_title")} ({WORDS_PER_SESSION} {t("word_unit")})
                </p>
                <p style={{ margin: 0, fontSize: 12, color: T.textSoft }}>
                  {t("sequential_mode_desc")}
                </p>
              </button>
              <button onClick={() => start(pickedLevel, levelLabel(pickedLevel), "mixed")}
                style={{ ...box, textAlign: "left", cursor: "pointer" }}>
                <p style={{ margin: "0 0 3px", fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 700, color: T.navy }}>
                  {t("mixed_mode_title")}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: T.textSoft }}>
                  {t("mixed_mode_desc")}
                </p>
              </button>
            </div>
          </div>
        )}
      </section>
    );
  }

  if (screen === "game" && gameSession) {
    const w = currentWord(gameSession);
    const mm = String(Math.floor(gameSession.timeLeft / 60)).padStart(2, "0");
    const ss = String(gameSession.timeLeft % 60).padStart(2, "0");
    return (
      <section style={{ maxWidth: 560, margin: "0 auto" }} onClick={() => inputRef.current && inputRef.current.focus()}>
        <input ref={inputRef} onChange={onHiddenChange} onKeyDown={onHiddenKeyDown}
          style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 1, height: 1 }}
          autoCapitalize="none" autoCorrect="off" autoComplete="off" />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: T.textSoft, marginBottom: 14 }}>
          <span>{gameSession.label} · {gameSession.mode === "sequential" ? t("mode_sequential_short") : t("mode_mixed_short")}</span>
          <span>{gameSession.idx + 1} / {gameSession.queue.length}</span>
        </div>

        <div style={box}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${T.border}` }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 5px", fontSize: 10.5, fontWeight: 800, letterSpacing: 1, color: T.textSoft }}>{t("translation_label")}</p>
              <p style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 600, color: T.navy, lineHeight: 1.45 }}>
                {w.clue}
              </p>
            </div>
            <div style={{ display: "flex", gap: 18, flexShrink: 0 }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: gameSession.mode === "sequential" ? (gameSession.timeLeft <= 30 ? T.danger : T.warm) : T.textSoft }}>
                  {gameSession.mode === "sequential" ? `${mm}:${ss}` : "∞"}
                </p>
                <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: T.textSoft, textTransform: "uppercase" }}>{t("time_label")}</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: T.accent }}>{gameSession.score}</p>
                <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: T.textSoft, textTransform: "uppercase" }}>{t("score_label")}</p>
              </div>
            </div>
          </div>

          <p style={{ textAlign: "center", fontSize: 12, color: T.textSoft, margin: "0 0 14px" }}>
            {w.word.length} {t("letter_word_count")}
          </p>

          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
            {gameSession.answer.map((ch, i) => {
              const isHinted = gameSession.hintedIdx.has(i);
              const isCurrent = i === gameSession.cursor && !gameSession.solved;
              return (
                <span key={i} style={{
                  width: 32, height: 42, borderRadius: 7,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: ch ? "rgba(0,51,102,0.05)" : "transparent",
                  borderBottom: `2px solid ${isCurrent ? T.warm : T.border}`,
                  fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 18,
                  color: gameSession.solved ? T.accent : isHinted ? T.warm : T.navy,
                }}>{ch || ""}</span>
              );
            })}
          </div>

          <p style={{
            textAlign: "center", minHeight: 20, fontSize: 12.5, fontWeight: 700, margin: "0 0 12px",
            color: gameSession.feedbackKind === "ok" ? T.accent : gameSession.feedbackKind === "err" ? T.danger : T.textSoft,
          }}>
            {gameSession.feedback}
          </p>

          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={(e) => { e.stopPropagation(); hint(); }} style={btnGhost}>{t("get_letter_btn")}</button>
            <button onClick={(e) => { e.stopPropagation(); clearGuess(); }} style={btnGhost}>{t("clear")}</button>
            <button onClick={(e) => { e.stopPropagation(); check(); }} style={btnPrimary}>{t("check")}</button>
          </div>
        </div>
      </section>
    );
  }

  if (screen === "result" && gameSession) {
    const lv = gameSession.levelKey !== "MIXED" ? LEVELS[gameSession.levelKey] : null;
    const earnsMedal = gameSession.mode === "sequential" && gameSession._completedAll && lv;
    return (
      <section style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ ...box, textAlign: "center", padding: "34px 26px" }}>
          {earnsMedal ? (
            <>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                <Avatar avatarKey={lv.medal} size={72} ring />
              </div>
              <p style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: T.navy, margin: "0 0 8px" }}>
                {gameSession.levelKey} {t("game_completed_title")}
              </p>
              <p style={{ fontSize: 13, color: T.textSoft, margin: "0 0 22px" }}>
                {t("medal_congrats")}
              </p>
            </>
          ) : gameSession.mode === "mixed" ? (
            <>
              <div style={{ fontSize: 40, marginBottom: 10 }}>✓</div>
              <p style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 700, color: T.navy, margin: "0 0 8px" }}>
                {t("practice_completed")}
              </p>
              <p style={{ fontSize: 13, color: T.textSoft, margin: "0 0 22px" }}>
                {t("mixed_no_medal")}
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: 40, marginBottom: 10 }}>⏱</div>
              <p style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 700, color: T.navy, margin: "0 0 8px" }}>
                {t("time_up_title")}
              </p>
              <p style={{ fontSize: 13, color: T.textSoft, margin: "0 0 22px" }}>
                {t("time_up_desc")}
              </p>
            </>
          )}

          <div style={{ display: "flex", justifyContent: "center", gap: 28, marginBottom: 24 }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: T.accent }}>{gameSession.score}</p>
              <p style={{ margin: 0, fontSize: 10, color: T.textSoft, fontWeight: 700, textTransform: "uppercase" }}>{t("score_label")}</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: T.navy }}>{gameSession.solvedCount}/{gameSession.queue.length}</p>
              <p style={{ margin: 0, fontSize: 10, color: T.textSoft, fontWeight: 700, textTransform: "uppercase" }}>{t("found_label")}</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: T.warm }}>{gameSession.hintsTotal}</p>
              <p style={{ margin: 0, fontSize: 10, color: T.textSoft, fontWeight: 700, textTransform: "uppercase" }}>{t("hints_used_label")}</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button onClick={restart} style={btnPrimary}>{t("restart_btn")}</button>
            <button onClick={backToSelect} style={btnGhost}>{t("back_to_level_select")}</button>
          </div>
        </div>
      </section>
    );
  }

  return null;
}
