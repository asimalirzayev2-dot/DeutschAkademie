import React, { useState, useEffect, useRef } from "react";
import { Flame } from "lucide-react";
import { sb, sbAuthInsert, sbInsert } from "./supabase";
import { speakGerman } from "./utils";
import { useLanguage } from "./i18n/LanguageContext";

const T = {
  navy: "#003366", text: "#2A3D3C", textSoft: "rgba(42,61,60,0.66)",
  accent: "#00A896", warm: "#FF8C00", surface: "#FFFFFF",
  border: "rgba(42,61,60,0.14)", gold: "#D4AF37", danger: "#C0392B",
  bronze: "#B8860B", card: "#C97B63", cardDark: "#8B4A38",
};
const LEVELS = ["A1", "A2", "B1", "B2"];
const LEVEL_TIER = { A1: 0, A2: 1, B1: 2, B2: 3 };
// Səviyyələr kart rütbəsi kimi düşünülür: 10 → Valet → Dama → Karol (eyni dəst — milçək/xaç)
const LEVEL_RANK = { A1: "10", A2: "V", B1: "D", B2: "K" };

function DiamondWatermark() {
  // B2 kartının küncündə, tədricən bəzək sistemindəki bürünc romb naxışının təkrarı
  return (
    <svg
      style={{ position: "absolute", right: -10, top: -10, pointerEvents: "none", opacity: 0.08 }}
      width="64" height="64" viewBox="0 0 72 72" fill="none"
    >
      <rect x="18" y="0" width="36" height="36" rx="4" transform="rotate(45 36 18)" stroke="#B8860B" strokeWidth="2" />
      <rect x="4" y="20" width="20" height="20" rx="3" transform="rotate(45 14 30)" stroke="#B8860B" strokeWidth="1.5" />
    </svg>
  );
}

const MICRO_CSS = `
  @keyframes fcShake { 10%,90% { transform: translateX(-2px); } 20%,80% { transform: translateX(3px); } 30%,50%,70% { transform: translateX(-5px); } 40%,60% { transform: translateX(5px); } }
  @keyframes fcPulse { 0% { box-shadow: 0 0 0 0 rgba(0,168,150,0.45); } 70% { box-shadow: 0 0 0 9px rgba(0,168,150,0); } 100% { box-shadow: 0 0 0 0 rgba(0,168,150,0); } }
  @keyframes fcPop { from { transform: scale(0.94); opacity: 0.4; } to { transform: scale(1); opacity: 1; } }
  @keyframes fcFlip { from { transform: rotateY(0deg); } to { transform: rotateY(180deg); } }
  .fc-card { transition: transform .18s ease, box-shadow .18s ease; }
  .fc-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(42,61,60,0.10); }
  .fc-opt { transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease, background .15s ease; }
  .fc-opt:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(42,61,60,0.12); }
  .fc-right { animation: fcPulse .7s ease-out; }
  .fc-wrong { animation: fcShake .45s ease-in-out; }
  .fc-pop { animation: fcPop .35s cubic-bezier(.34,1.56,.64,1); }
  .fc-flipwrap { perspective: 1200px; touch-action: pan-y; user-select: none; }
  .fc-flipinner { position: relative; width: 100%; height: 100%; transition: transform .5s cubic-bezier(.2,.7,.3,1); transform-style: preserve-3d; }
  .fc-flipinner.flipped { transform: rotateY(180deg); }
  .fc-flipinner.dragging { transition: none; }
  .fc-face { position: absolute; inset: 0; backface-visibility: hidden; display: flex; align-items: center; justify-content: center; flex-direction: column; }
  .fc-face-back { transform: rotateY(180deg); }
  .fc-speak-btn { position: absolute; top: 10px; right: 10px; width: 34px; height: 34px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; font-size: 15px; cursor: pointer; }
`;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function tierAccentColor(tier) {
  if (tier === 1) return T.accent;
  if (tier === 2) return T.warm;
  if (tier === 3) return T.bronze;
  return T.textSoft;
}
function tierBoxStyle(tier) {
  if (tier === 0) return {};
  if (tier === 1) return { borderBottom: `2px solid rgba(0,168,150,0.35)` };
  if (tier === 2) return { borderLeft: `4px solid ${T.warm}`, paddingLeft: 13 };
  return { border: `2px solid rgba(184,134,11,0.4)` };
}

export default function Flashcards({ session, guestMode, setAuthModal }) {
  const { t } = useLanguage();
  const [screen, setScreen] = useState("level"); // level | mode | flashcards | match | summary
  const [level, setLevel] = useState("A1");
  const [count, setCount] = useState(15);
  const [words, setWords] = useState(null);

  const box = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 16px" };
  const btnPrimary = { background: T.card, color: "#fff", border: "none", borderRadius: 10, padding: "13px 20px", fontWeight: 800, fontSize: 14.5, cursor: "pointer" };
  const btnGhost = { background: "transparent", color: T.textSoft, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" };

  async function getUsedIds(key) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : [];
    } catch { return []; }
  }
  async function saveUsedIds(key, ids) {
    try { localStorage.setItem(key, JSON.stringify(ids.slice(-3000))); } catch {}
  }

  async function loadWords(lvl, n) {
    setWords(null);
    const key = `fc_used:${session?.user?.id || "guest"}:${lvl}`;
    try {
      const used = await getUsedIds(key);
      const rows = await sb(`dictionary?level=eq.${lvl}&direction=eq.de-az&select=id,term,translation&limit=1000`);
      const unseen = (rows || []).filter((r) => !used.includes(r.id));
      // Səviyyənin bütün sözləri artıq görülübsə, pool sıfırlanır (təkrar yalnız bu halda başlayır)
      const pool = unseen.length >= n ? unseen : (rows || []);
      const poolUsed = unseen.length >= n ? used : [];
      const picked = shuffle(pool).slice(0, n);
      await saveUsedIds(key, [...poolUsed, ...picked.map((w) => w.id)]);
      setWords(picked);
    } catch {
      setWords([]);
    }
  }

  async function logProgress(wordId, status) {
    if (!session?.user?.id) return;
    try {
      await sbAuthInsert("flashcard_progress", session.access_token, {
        user_id: session.user.id, word_id: wordId, status, level,
      });
    } catch {}
  }

  // ---------- 1. Səviyyə seçimi ----------
  if (screen === "level") {
    return (
      <section style={{ maxWidth: 560, margin: "0 auto" }}>
        <style>{MICRO_CSS}</style>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 9, padding: "7px 16px",
            borderRadius: 22, background: "rgba(201,123,99,0.12)", border: `1px solid ${T.border}`,
          }}>
            <span style={{ fontSize: 17 }}>🃏</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 700, color: T.navy }}>
              Flashcards
            </span>
          </div>
          <p style={{ fontSize: 13.5, color: T.textSoft, margin: "10px 0 0" }}>
            {t("fc_subtitle")}
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {LEVELS.map((l) => {
            const tier = LEVEL_TIER[l];
            const ink = tier === 1 ? T.accent : tier === 2 ? T.warm : tier === 3 ? T.bronze : T.text;
            const rank = LEVEL_RANK[l];
            // Ağırlıq tier-ə görə tədricən dolğunlaşan fon — A1 sadə, B2 ən dolğun
            const bg =
              tier === 0 ? "#FFFDF7" :
              tier === 1 ? "linear-gradient(160deg, #FFFDF7, rgba(0,168,150,0.10))" :
              tier === 2 ? "linear-gradient(160deg, #FFFDF7, rgba(255,140,0,0.16))" :
              "linear-gradient(160deg, #FFFDF7, rgba(184,134,11,0.24))";
            const borderStyle =
              tier === 0 ? `1px solid ${T.border}` :
              tier === 1 ? `1.5px solid rgba(0,168,150,0.35)` :
              tier === 2 ? `1.5px solid rgba(255,140,0,0.45)` :
              `2px solid rgba(184,134,11,0.55)`;
            return (
              <button key={l} className="fc-card" onClick={() => { setLevel(l); setScreen("mode"); }} style={{
                position: "relative", padding: 0, borderRadius: 13, cursor: "pointer",
                background: "transparent", border: "none", overflow: "hidden",
              }}>
                <div style={{
                  position: "relative", width: "100%", aspectRatio: "5 / 7",
                  background: bg, borderRadius: 12, border: borderStyle,
                  boxShadow: tier === 3 ? "0 6px 18px rgba(184,134,11,0.20)" : tier === 2 ? "0 5px 16px rgba(255,140,0,0.14)" : "0 4px 14px rgba(42,61,60,0.10)",
                }}>
                  {tier === 3 && <DiamondWatermark />}
                  {tier === 2 && <span style={{ position: "absolute", top: 8, right: 10 }}><Flame size={13} color={T.warm} strokeWidth={2.5} /></span>}

                  <div style={{ position: "absolute", top: 8, left: 10, fontFamily: "'Fraunces', serif", fontWeight: 800, fontSize: 13, color: ink, opacity: 0.7 }}>{rank}</div>
                  <div style={{ position: "absolute", bottom: 8, right: 10, fontFamily: "'Fraunces', serif", fontWeight: 800, fontSize: 13, color: ink, opacity: 0.7, transform: "rotate(180deg)" }}>{rank}</div>

                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 800, fontSize: 32, color: tier === 0 ? T.navy : ink, letterSpacing: 0.5 }}>{l}</span>
                    <span style={{ fontSize: 10.5, color: T.textSoft, marginTop: 6, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
                      {tier === 0 ? t("tier_beginner") : tier === 1 ? t("tier_elementary") : tier === 2 ? t("tier_intermediate") : t("tier_upper_intermediate")}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  // ---------- 2. Rejim seçimi ----------
  if (screen === "mode") {
    return (
      <section style={{ maxWidth: 560, margin: "0 auto" }}>
        <style>{MICRO_CSS}</style>
        <button onClick={() => setScreen("level")} style={{ ...btnGhost, marginBottom: 14 }}>← {t("levels_back")}</button>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 700, color: T.navy, margin: "0 0 14px" }}>
          {level} · Flashcards
        </p>

        {!guestMode && (
          <>
            <p style={{ fontSize: 13, color: T.textSoft, marginBottom: 8 }}>{t("how_many_words")}</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {[10, 15, 20, 30].map((n) => (
                <button key={n} onClick={() => setCount(n)} className="fc-opt" style={{
                  padding: "8px 16px", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  background: count === n ? T.card : "transparent",
                  color: count === n ? "#fff" : T.text,
                  border: `1px solid ${count === n ? T.card : T.border}`,
                }}>{n} {t("word_unit")}</button>
              ))}
            </div>
          </>
        )}
        {guestMode && (
          <p style={{ fontSize: 12.5, color: T.textSoft, marginBottom: 16 }}>
            {t("guest_flashcard_notice")}
          </p>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          <button className="fc-card" onClick={async () => { await loadWords(level, guestMode ? 1 : count); setScreen("flashcards"); }} style={{
            ...box, textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
          }}>
            <span style={{ fontSize: 26 }}>🔄</span>
            <span>
              <span style={{ display: "block", fontWeight: 800, color: T.navy, fontSize: 15 }}>Flashcards</span>
              <span style={{ display: "block", fontSize: 12.5, color: T.textSoft, marginTop: 2 }}>{t("flip_learn")}</span>
            </span>
          </button>
          <button className="fc-card" onClick={async () => {
            if (guestMode) { setAuthModal && setAuthModal("signup"); return; }
            await loadWords(level, Math.min(count, 10)); setScreen("match");
          }} style={{
            ...box, textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
            ...(guestMode ? { opacity: 0.55 } : {}),
          }}>
            <span style={{ fontSize: 26 }}>{guestMode ? "🔒" : "🎯"}</span>
            <span>
              <span style={{ display: "block", fontWeight: 800, color: T.navy, fontSize: 15 }}>Match</span>
              <span style={{ display: "block", fontSize: 12.5, color: T.textSoft, marginTop: 2 }}>{guestMode ? t("registration_required") : t("match_desc")}</span>
            </span>
          </button>
          <button className="fc-card" onClick={async () => {
            if (guestMode) { setAuthModal && setAuthModal("signup"); return; }
            await loadWords(level, Math.min(count, 10)); setScreen("sentences");
          }} style={{
            ...box, textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
            ...(guestMode ? { opacity: 0.55 } : {}),
          }}>
            <span style={{ fontSize: 26 }}>{guestMode ? "🔒" : "🌀"}</span>
            <span>
              <span style={{ display: "block", fontWeight: 800, color: T.navy, fontSize: 15 }}>{t("sentence_builder")}</span>
              <span style={{ display: "block", fontSize: 12.5, color: T.textSoft, marginTop: 2 }}>{guestMode ? t("registration_required") : t("sentence_desc")}</span>
            </span>
          </button>
        </div>
      </section>
    );
  }

  async function logXp(amount, source, meta) {
    if (!session?.user?.id) return;
    try {
      await sbAuthInsert("xp_log", session.access_token, {
        user_id: session.user.id, source, amount, meta,
      });
    } catch {}
  }

  // ---------- 3a. Flashcards rejimi ----------
  if (screen === "flashcards") {
    return <FlashcardSession words={words} level={level} onExit={() => setScreen("mode")} onLog={logProgress} onXp={logXp} T={T} box={box} btnPrimary={btnPrimary} btnGhost={btnGhost} guestMode={guestMode} setAuthModal={setAuthModal} />;
  }

  // ---------- 3b. Match rejimi ----------
  if (screen === "match") {
    return <MatchSession words={words} level={level} onExit={() => setScreen("mode")} onXp={logXp} T={T} box={box} btnPrimary={btnPrimary} btnGhost={btnGhost} />;
  }

  // ---------- 3c. Cümlə qurma rejimi ----------
  if (screen === "sentences") {
    return <SentenceGame words={words} level={level} onExit={() => setScreen("mode")} onXp={logXp} T={T} box={box} btnPrimary={btnPrimary} btnGhost={btnGhost} />;
  }

  return null;
}

function FlashcardSession({ words, level, onExit, onLog, onXp, T, box, btnPrimary, btnGhost, guestMode, setAuthModal }) {
  const { t } = useLanguage();
  const [queue, setQueue] = useState([]);
  const [learnedIds, setLearnedIds] = useState(new Set());
  const [missedIds, setMissedIds] = useState(new Set());
  const [flipped, setFlipped] = useState(false);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState("play"); // play | quiz
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const SWIPE_THRESHOLD = 90;

  useEffect(() => {
    if (words && words.length > 0) {
      setQueue(shuffle(words));
      setLearnedIds(new Set());
      setMissedIds(new Set());
      setFlipped(false);
      setReady(true);
    }
  }, [words]);

  if (words === null || !ready) {
    return (
      <section style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", padding: "60px 0" }}>
        <p style={{ color: T.textSoft }}>{t("loading")}</p>
      </section>
    );
  }
  if (words.length === 0) {
    return (
      <section style={{ maxWidth: 560, margin: "0 auto" }}>
        <button onClick={onExit} style={{ ...btnGhost, marginBottom: 14 }}>← {t("back")}</button>
        <p style={{ color: T.textSoft, textAlign: "center" }}>{t("no_words_level")}</p>
      </section>
    );
  }

  const done = queue.length === 0;

  if (phase === "quiz") {
    return <QuizSession words={words} level={level} onExit={onExit} onXp={onXp} T={T} box={box} btnPrimary={btnPrimary} btnGhost={btnGhost} />;
  }

  if (done) {
    const firstTry = words.length - missedIds.size;
    return (
      <section style={{ maxWidth: 560, margin: "0 auto" }}>
        <style>{MICRO_CSS}</style>
        <div className="fc-pop" style={{ ...box, textAlign: "center", padding: "32px 20px" }}>
          <p style={{ fontSize: 30, margin: "0 0 6px" }}>🎉</p>
          <p style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: T.navy, margin: "0 0 4px" }}>
            {t("learned_all")}
          </p>
          <p style={{ fontSize: 13, color: T.textSoft, margin: 0 }}>
            <span style={{ color: T.accent, fontWeight: 700 }}>{firstTry} {t("first_try_words")}</span>
            {missedIds.size > 0 && <> · <span style={{ color: T.warm, fontWeight: 700 }}>{missedIds.size} {t("repeat_words")}</span></>} {t("learned_suffix")}
          </p>
        </div>
        {guestMode ? (
          <div style={{
            background: "rgba(255,140,0,0.08)", border: "1px solid rgba(255,140,0,0.25)",
            borderRadius: 10, padding: "14px 16px", marginTop: 16, textAlign: "center",
          }}>
            <p style={{ fontSize: 13.5, margin: "0 0 10px", color: T.text }}>
              {t("guest_summary_notice")}
            </p>
            <button onClick={() => setAuthModal && setAuthModal("signup")} style={{ ...btnPrimary, width: "100%" }}>{t("sign_up")}</button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={onExit} style={{ ...btnGhost, flex: 1 }}>{t("back_to_modes")}</button>
            <button onClick={() => setPhase("quiz")} style={{ ...btnPrimary, flex: 1.4 }}>{t("try_learned")} →</button>
          </div>
        )}
      </section>
    );
  }

  const w = queue[0];

  function mark(status) {
    onLog(w.id, status);
    if (status === "known") {
      setLearnedIds((s) => new Set(s).add(w.id));
      setQueue((q) => q.slice(1));
    } else {
      setMissedIds((s) => new Set(s).add(w.id));
      setQueue((q) => {
        const rest = q.slice(1);
        // bu söz bir neçə kart sonra yenidən qarşıya çıxacaq, dərhal yox
        const insertAt = Math.min(rest.length, 2 + Math.floor(Math.random() * 3));
        const copy = [...rest];
        copy.splice(insertAt, 0, w);
        return copy;
      });
    }
    setFlipped(false);
    setDragX(0);
  }

  function onPointerDown(e) {
    dragStart.current = { x: e.clientX, moved: false };
    setDragging(true);
  }
  function onPointerMove(e) {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    if (Math.abs(dx) > 4) dragStart.current.moved = true;
    setDragX(dx);
  }
  function onPointerUp() {
    if (!dragStart.current) return;
    setDragging(false);
    if (Math.abs(dragX) > SWIPE_THRESHOLD) {
      mark(dragX > 0 ? "known" : "unknown");
    } else if (!dragStart.current.moved) {
      setFlipped((f) => !f);
      setDragX(0);
    } else {
      setDragX(0);
    }
    dragStart.current = null;
  }

  function speak(e) {
    e.stopPropagation();
    speakGerman(w.term);
  }

  return (
    <section style={{ maxWidth: 560, margin: "0 auto" }}>
      <style>{MICRO_CSS}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button onClick={onExit} style={btnGhost}>← {t("exit")}</button>
        <span style={{ fontSize: 12.5, color: T.textSoft, fontWeight: 700 }}>{level} · {learnedIds.size}/{words.length} {t("learned_suffix")}</span>
      </div>
      <div style={{ height: 3, background: T.border, borderRadius: 4, marginBottom: 20 }}>
        <div style={{ height: 3, width: `${(learnedIds.size / words.length) * 100}%`, background: T.card, borderRadius: 4, transition: "width .3s" }} />
      </div>
      {missedIds.has(w.id) && (
        <p style={{ fontSize: 11.5, color: T.warm, fontWeight: 700, margin: "0 0 8px", textAlign: "center" }}>↻ {t("repeat_hint")}</p>
      )}

      <div
        className="fc-flipwrap"
        style={{ height: 220, marginBottom: 20, position: "relative" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => { if (dragging) onPointerUp(); }}
      >
        {dragX > 20 && (
          <div style={{
            position: "absolute", top: 14, left: 14, zIndex: 2, padding: "5px 12px", borderRadius: 8,
            background: T.accent, color: "#fff", fontWeight: 800, fontSize: 12.5,
            opacity: Math.min(1, dragX / SWIPE_THRESHOLD), transform: `rotate(-8deg)`,
          }}>{t("i_know")}</div>
        )}
        {dragX < -20 && (
          <div style={{
            position: "absolute", top: 14, right: 14, zIndex: 2, padding: "5px 12px", borderRadius: 8,
            background: T.danger, color: "#fff", fontWeight: 800, fontSize: 12.5,
            opacity: Math.min(1, -dragX / SWIPE_THRESHOLD), transform: `rotate(8deg)`,
          }}>{t("i_dont_know")}</div>
        )}
        <div className={`fc-flipinner${flipped ? " flipped" : ""}${dragging ? " dragging" : ""}`} style={{
          cursor: "grab",
          transform: `${flipped ? "rotateY(180deg) " : ""}translateX(${dragX}px) rotate(${dragX / 22}deg)`,
        }}>
          <div className="fc-face" style={{
            background: `linear-gradient(135deg, ${T.card}, ${T.cardDark})`, borderRadius: 16,
            boxShadow: "0 10px 26px rgba(201,123,99,0.30)", padding: 24,
          }}>
            <button className="fc-speak-btn" onClick={speak} style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}>🔊</button>
            <p style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, color: "#fff", textAlign: "center", margin: 0 }}>{w.term}</p>
            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.75)", marginTop: 10 }}>{t("tap_flip_or_swipe")}</p>
          </div>
          <div className="fc-face fc-face-back" style={{
            background: T.surface, border: `2px solid ${T.card}`, borderRadius: 16, padding: 24,
          }}>
            <button className="fc-speak-btn" onClick={speak} style={{ background: "rgba(201,123,99,0.12)", color: T.card }}>🔊</button>
            <p style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: T.navy, textAlign: "center", margin: 0 }}>{w.translation}</p>
          </div>
        </div>
      </div>

      <p style={{ textAlign: "center", fontSize: 11, color: T.textSoft, margin: "-12px 0 14px" }}>
        ← {t("swipe_hint_left")} &nbsp;·&nbsp; {t("swipe_hint_right")} →
      </p>

      <div style={{ display: "flex", gap: 10 }}>
        <button className="fc-opt" onClick={() => mark("unknown")} style={{
          flex: 1, padding: "13px 0", borderRadius: 10, fontWeight: 700, fontSize: 14,
          background: "rgba(192,57,43,0.08)", border: `1px solid ${T.danger}`, color: T.danger, cursor: "pointer",
        }}>{t("didnt_know_btn")}</button>
        <button className="fc-opt" onClick={() => mark("known")} style={{
          flex: 1, padding: "13px 0", borderRadius: 10, fontWeight: 700, fontSize: 14,
          background: "rgba(0,168,150,0.10)", border: `1px solid ${T.accent}`, color: T.accent, cursor: "pointer",
        }}>{t("knew_btn")}</button>
      </div>
    </section>
  );
}

function MatchSession({ words, level, onExit, onXp, T, box, btnGhost }) {
  const { t } = useLanguage();
  const [pairs, setPairs] = useState(null);
  const [selTerm, setSelTerm] = useState(null);
  const [selDef, setSelDef] = useState(null);
  const [solved, setSolved] = useState([]);
  const [wrongFlash, setWrongFlash] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [finished, setFinished] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!words) return;
    const terms = words.map((w) => ({ key: `t${w.id}`, wordId: w.id, text: w.term }));
    const defs = shuffle(words.map((w) => ({ key: `d${w.id}`, wordId: w.id, text: w.translation })));
    setPairs({ terms: shuffle(terms), defs });
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [words]);

  useEffect(() => {
    if (pairs && solved.length === pairs.terms.length && pairs.terms.length > 0) {
      clearInterval(timerRef.current);
      setFinished(true);
      if (onXp) onXp(pairs.terms.length * 5, "flashcards_match", { level, seconds, wordCount: pairs.terms.length });
    }
  }, [solved, pairs]);

  if (words === null || pairs === null) {
    return (
      <section style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", padding: "60px 0" }}>
        <p style={{ color: T.textSoft }}>{t("loading")}</p>
      </section>
    );
  }
  if (words.length === 0) {
    return (
      <section style={{ maxWidth: 560, margin: "0 auto" }}>
        <button onClick={onExit} style={{ ...btnGhost, marginBottom: 14 }}>← {t("back")}</button>
        <p style={{ color: T.textSoft, textAlign: "center" }}>{t("no_words_level")}</p>
      </section>
    );
  }

  function fmtTime(s) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  function pickTerm(t) {
    if (solved.includes(t.wordId)) return;
    setSelTerm(t);
    if (selDef) checkPair(t, selDef);
  }
  function pickDef(d) {
    if (solved.includes(d.wordId)) return;
    setSelDef(d);
    if (selTerm) checkPair(selTerm, d);
  }
  function checkPair(t, d) {
    if (t.wordId === d.wordId) {
      setSolved((s) => [...s, t.wordId]);
      setSelTerm(null); setSelDef(null);
    } else {
      setWrongFlash({ term: t.key, def: d.key });
      setTimeout(() => { setWrongFlash(null); setSelTerm(null); setSelDef(null); }, 450);
    }
  }

  if (finished) {
    return (
      <section style={{ maxWidth: 560, margin: "0 auto" }}>
        <style>{MICRO_CSS}</style>
        <div className="fc-pop" style={{ ...box, textAlign: "center", padding: "32px 20px" }}>
          <p style={{ fontSize: 30, margin: "0 0 6px" }}>🏆</p>
          <p style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: T.navy, margin: "0 0 4px" }}>
            {t("completed")}
          </p>
          <p style={{ fontSize: 13, color: T.textSoft, margin: 0 }}>{t("time_label")}: <span style={{ color: T.card, fontWeight: 700 }}>{fmtTime(seconds)}</span></p>
          <p style={{ fontSize: 12, color: T.warm, fontWeight: 700, margin: "6px 0 0" }}>+{pairs.terms.length * 5} XP</p>
        </div>
        <button onClick={onExit} style={{ ...btnGhost, width: "100%", marginTop: 16 }}>{t("back_to_modes")}</button>
      </section>
    );
  }

  return (
    <section style={{ maxWidth: 560, margin: "0 auto" }}>
      <style>{MICRO_CSS}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button onClick={onExit} style={btnGhost}>← {t("exit")}</button>
        <span style={{ fontSize: 12.5, color: T.textSoft, fontWeight: 700 }}>{level} · {fmtTime(seconds)}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ display: "grid", gap: 8 }}>
          {pairs.terms.map((t) => {
            const isSolved = solved.includes(t.wordId);
            const isSel = selTerm?.key === t.key;
            const isWrong = wrongFlash?.term === t.key;
            return (
              <button key={t.key} disabled={isSolved} onClick={() => pickTerm(t)} className={`fc-opt${isWrong ? " fc-wrong" : ""}${isSolved ? " fc-right" : ""}`} style={{
                padding: "10px 12px", borderRadius: 9, fontSize: 12.8, fontWeight: 700, textAlign: "left", cursor: isSolved ? "default" : "pointer",
                background: isSolved ? "rgba(0,168,150,0.12)" : isSel ? "rgba(201,123,99,0.12)" : T.surface,
                border: `1px solid ${isSolved ? T.accent : isSel ? T.card : T.border}`,
                color: isSolved ? T.navy : T.text, opacity: isSolved ? 0.6 : 1,
              }}>{t.text}</button>
            );
          })}
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {pairs.defs.map((d) => {
            const isSolved = solved.includes(d.wordId);
            const isSel = selDef?.key === d.key;
            const isWrong = wrongFlash?.def === d.key;
            return (
              <button key={d.key} disabled={isSolved} onClick={() => pickDef(d)} className={`fc-opt${isWrong ? " fc-wrong" : ""}${isSolved ? " fc-right" : ""}`} style={{
                padding: "10px 12px", borderRadius: 9, fontSize: 12.8, fontWeight: 700, textAlign: "left", cursor: isSolved ? "default" : "pointer",
                background: isSolved ? "rgba(0,168,150,0.12)" : isSel ? "rgba(201,123,99,0.12)" : T.surface,
                border: `1px solid ${isSolved ? T.accent : isSel ? T.card : T.border}`,
                color: isSolved ? T.navy : T.text, opacity: isSolved ? 0.6 : 1,
              }}>{d.text}</button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function QuizSession({ words, level, onExit, onXp, T, box, btnPrimary, btnGhost }) {
  const { t } = useLanguage();
  const [questions, setQuestions] = useState(null);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(false);
  const [reviewList, setReviewList] = useState([]); // { term, translation, userAnswer, isRight }

  useEffect(() => {
    let alive = true;
    (async () => {
      let extra = [];
      try {
        const wordIds = words.map((w) => w.id);
        const rows = await sb(`dictionary?level=eq.${level}&direction=eq.de-az&select=id,translation&limit=200`);
        extra = (rows || []).filter((r) => !wordIds.includes(r.id));
      } catch {}
      const qs = shuffle(words).map((w) => {
        const distractors = shuffle(extra.filter((r) => r.translation !== w.translation)).slice(0, 3).map((r) => r.translation);
        const options = shuffle([w.translation, ...distractors]);
        return { term: w.term, correct: w.translation, options };
      });
      if (alive) setQuestions(qs);
    })();
    return () => { alive = false; };
  }, [words, level]);

  useEffect(() => {
    if (finished && !xpAwarded && questions) {
      setXpAwarded(true);
      const xp = correctCount * 10;
      if (onXp) onXp(xp, "flashcards_quiz", { level, total: questions.length, correct: correctCount });
    }
  }, [finished]);

  if (questions === null) {
    return (
      <section style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", padding: "60px 0" }}>
        <p style={{ color: T.textSoft }}>{t("quiz_preparing")}</p>
      </section>
    );
  }

  if (finished) {
    const pct = Math.round((correctCount / questions.length) * 100);
    const xp = correctCount * 10;
    return (
      <section style={{ maxWidth: 480, margin: "0 auto" }}>
        <style>{MICRO_CSS}</style>
        <div className="fc-pop" style={{ ...box, textAlign: "center", padding: "32px 20px", marginBottom: 16 }}>
          <p style={{ fontSize: 30, margin: "0 0 6px" }}>{pct >= 80 ? "🏅" : pct >= 50 ? "👍" : "💪"}</p>
          <p style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: T.navy, margin: "0 0 4px" }}>
            {correctCount} / {questions.length} {t("correct_word")}
          </p>
          <p style={{ fontSize: 13, color: T.warm, fontWeight: 700, margin: "6px 0 0" }}>+{xp} XP</p>
        </div>

        <p style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1, color: T.textSoft, margin: "0 0 10px" }}>
          {t("what_learned_now")}
        </p>
        <div style={{ display: "grid", gap: 7, marginBottom: 18 }}>
          {reviewList.map((r, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 14px", borderRadius: 10, background: T.surface,
              borderLeft: `3px solid ${r.isRight ? T.accent : T.danger}`,
            }}>
              <span>
                <span style={{ fontWeight: 700, color: T.navy, fontSize: 13.5 }}>{r.term}</span>
                <span style={{ color: T.textSoft, fontSize: 12.5 }}> — {r.translation}</span>
              </span>
              <span style={{ fontSize: 15 }}>{r.isRight ? "✓" : "✗"}</span>
            </div>
          ))}
        </div>

        <button onClick={onExit} style={{ ...btnPrimary, width: "100%" }}>{t("back_to_modes")}</button>
      </section>
    );
  }

  const q = questions[idx];

  function choose(opt) {
    if (picked) return;
    setPicked(opt);
    const isRight = opt === q.correct;
    if (isRight) setCorrectCount((c) => c + 1);
    setReviewList((r) => [...r, { term: q.term, translation: q.correct, userAnswer: opt, isRight }]);
    setTimeout(() => {
      if (idx + 1 >= questions.length) setFinished(true);
      else { setIdx((i) => i + 1); setPicked(null); }
    }, 650);
  }

  return (
    <section style={{ maxWidth: 560, margin: "0 auto" }}>
      <style>{MICRO_CSS}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button onClick={onExit} style={btnGhost}>← {t("exit")}</button>
        <span style={{ fontSize: 12.5, color: T.textSoft, fontWeight: 700 }}>{t("quiz_label")} · {idx + 1}/{questions.length}</span>
      </div>
      <div style={{ height: 3, background: T.border, borderRadius: 4, marginBottom: 20 }}>
        <div style={{ height: 3, width: `${(idx / questions.length) * 100}%`, background: T.card, borderRadius: 4, transition: "width .3s" }} />
      </div>

      <div style={{ ...box, marginBottom: 18, textAlign: "center" }}>
        <p style={{ fontSize: 11.5, color: T.textSoft, margin: "0 0 8px", fontWeight: 700 }}>{t("what_does_word_mean")}</p>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, color: T.navy, margin: 0 }}>{q.term}</p>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {q.options.map((opt) => {
          let cls = "fc-opt", bg = T.surface, bd = T.border, col = T.text;
          if (picked) {
            if (opt === q.correct) { bg = "rgba(0,168,150,0.14)"; bd = T.accent; col = T.navy; cls += " fc-right"; }
            else if (opt === picked) { bg = "rgba(192,57,43,0.10)"; bd = T.danger; col = T.danger; cls += " fc-wrong"; }
          }
          return (
            <button key={opt} className={cls} disabled={!!picked} onClick={() => choose(opt)} style={{
              padding: "13px 16px", borderRadius: 10, fontSize: 14, fontWeight: 600, textAlign: "left",
              background: bg, border: `1px solid ${bd}`, color: col, cursor: picked ? "default" : "pointer",
            }}>{opt}</button>
          );
        })}
      </div>
    </section>
  );
}

// ============ Cümlə qur — sərbəst mətn ilə tam cümlə qurma ============
// Cümlələr word_sentences cədvəlində keşlənir (sentence + translation).
// İstifadəçiyə Azərbaycanca mənası göstərilir, o, bütün cümləni özü yazır.
// Səhv olarsa yenidən cəhd edə bilər (avtomatik keçid yoxdur).
// Doğru olduqda dərhal növbəti cümləyə keçmirik — əvvəlcə eyni mənanı verən
// alternativ nümunə cümlələr (izah+tərcümə ilə) göstərilir, "Növbəti" ilə davam edilir.

function normalizeSentence(s) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[„"“”.,!?;:()]/g, "")
    .replace(/\s+/g, " ");
}

async function fetchWordSentences(word, level) {
  try {
    const cached = await sb(`word_sentences?word_id=eq.${word.id}&select=sentence,translation`);
    if (cached && cached.length > 0) return cached;
  } catch {}
  // Ehtiyat yol: keşdə heç nə yoxdursa köhnə generasiya marşrutunu sına
  // (diqqət: bu marşrut tərcümə qaytarmır, ona görə bu cümlələr "translation"sız gələcək
  // və aşağıdakı hazırlama mərhələsində avtomatik keçiriləcək)
  try {
    const res = await fetch("/api/generate-sentences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term: word.term, translation: word.translation, level }),
    });
    const data = await res.json();
    if (!res.ok || !data.sentences) return [];
    try {
      await sbInsert("word_sentences", data.sentences.map((s) => ({ word_id: word.id, level, sentence: s })));
    } catch {}
    return data.sentences.map((s) => ({ sentence: s, translation: null }));
  } catch {
    return [];
  }
}

function SentenceGame({ words, level, onExit, onXp, T, box, btnPrimary, btnGhost }) {
  const { t } = useLanguage();
  const [rounds, setRounds] = useState(null); // [{ word, target:{sentence,translation}, alternates:[...] }]
  const [idx, setIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(false);

  const [typed, setTyped] = useState("");
  const [result, setResult] = useState(null); // 'ok' | 'err' | null
  const [attempts, setAttempts] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showAlternates, setShowAlternates] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const built = [];
      for (const w of words) {
        const all = await fetchWordSentences(w, level);
        const withTranslation = all.filter((s) => s.translation && s.translation.trim());
        if (withTranslation.length === 0) continue; // tərcüməsi olmayan sözü bu rejimdə keçirik
        const target = withTranslation[Math.floor(Math.random() * withTranslation.length)];
        const alternates = all.filter((s) => s.sentence !== target.sentence).slice(0, 2);
        built.push({ word: w, target, alternates });
      }
      if (alive) setRounds(built);
    })();
    return () => { alive = false; };
  }, [words, level]);

  useEffect(() => {
    setTyped("");
    setResult(null);
    setAttempts(0);
    setRevealed(false);
    setShowAlternates(false);
  }, [idx, rounds]);

  useEffect(() => {
    if (finished && !xpAwarded && rounds) {
      setXpAwarded(true);
      const xp = correctCount * 15;
      if (onXp) onXp(xp, "sentence_game", { level, total: rounds.length, correct: correctCount });
    }
  }, [finished]);

  if (rounds === null) {
    return (
      <section style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", padding: "60px 0" }}>
        <p style={{ color: T.textSoft }}>{t("sentences_preparing")}</p>
      </section>
    );
  }
  if (rounds.length === 0) {
    return (
      <section style={{ maxWidth: 560, margin: "0 auto" }}>
        <button onClick={onExit} style={{ ...btnGhost, marginBottom: 14 }}>← {t("back")}</button>
        <p style={{ color: T.textSoft, textAlign: "center" }}>
          {t("no_translated_sentences")}
        </p>
      </section>
    );
  }

  if (finished) {
    const xp = correctCount * 15;
    return (
      <section style={{ maxWidth: 480, margin: "0 auto" }}>
        <style>{MICRO_CSS}</style>
        <div className="fc-pop" style={{ ...box, textAlign: "center", padding: "32px 20px" }}>
          <p style={{ fontSize: 30, margin: "0 0 6px" }}>✍️</p>
          <p style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: T.navy, margin: "0 0 4px" }}>
            {correctCount} / {rounds.length} {t("correct_word")}
          </p>
          <p style={{ fontSize: 13, color: T.warm, fontWeight: 700, margin: "6px 0 0" }}>+{xp} XP</p>
        </div>
        <button onClick={onExit} style={{ ...btnPrimary, width: "100%", marginTop: 16 }}>{t("back_to_modes")}</button>
      </section>
    );
  }

  const r = rounds[idx];

  function checkAnswer() {
    if (!typed.trim() || result === "ok") return;
    const ok = normalizeSentence(typed) === normalizeSentence(r.target.sentence);
    if (ok) {
      setResult("ok");
      setCorrectCount((c) => c + 1);
      setShowAlternates(true);
    } else {
      setResult("err");
      setAttempts((a) => a + 1);
    }
  }

  function goNext() {
    if (idx + 1 >= rounds.length) setFinished(true);
    else setIdx((i) => i + 1);
  }

  function revealAndContinue() {
    setRevealed(true);
  }

  return (
    <section style={{ maxWidth: 560, margin: "0 auto" }}>
      <style>{MICRO_CSS}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button onClick={onExit} style={btnGhost}>← {t("exit")}</button>
        <span style={{ fontSize: 12.5, color: T.textSoft, fontWeight: 700 }}>{t("sentence_builder")} · {idx + 1}/{rounds.length}</span>
      </div>
      <div style={{ height: 3, background: T.border, borderRadius: 4, marginBottom: 20 }}>
        <div style={{ height: 3, width: `${(idx / rounds.length) * 100}%`, background: T.card, borderRadius: 4, transition: "width .3s" }} />
      </div>

      {!showAlternates ? (
        <>
          <div style={{ ...box, marginBottom: 16 }}>
            <p style={{ fontSize: 11.5, color: T.textSoft, margin: "0 0 8px", fontWeight: 700 }}>{t("write_this_sentence")}</p>
            <p style={{ fontSize: 17, lineHeight: 1.5, color: T.navy, margin: 0, fontWeight: 600 }}>{r.target.translation}</p>
          </div>

          <textarea
            value={typed}
            onChange={(e) => { setTyped(e.target.value); if (result === "err") setResult(null); }}
            disabled={result === "ok"}
            rows={2}
            placeholder={t("sentence_placeholder")}
            className={result === "err" ? "fc-wrong" : result === "ok" ? "fc-right" : ""}
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 10, resize: "none", boxSizing: "border-box",
              fontSize: 15.5, fontFamily: "inherit", color: T.text, marginBottom: 10,
              border: `2px solid ${result === "ok" ? T.accent : result === "err" ? T.danger : T.border}`,
              outline: "none", background: T.surface,
            }}
          />

          {result === "err" && (
            <p style={{ fontSize: 12.5, color: T.danger, fontWeight: 700, margin: "0 0 10px" }}>
              {t("wrong_try_again")}
            </p>
          )}

          {!revealed ? (
            <>
              <button onClick={checkAnswer} disabled={!typed.trim()} style={{ ...btnPrimary, width: "100%", opacity: typed.trim() ? 1 : 0.5 }}>
                {t("check")}
              </button>
              {attempts >= 3 && (
                <button onClick={revealAndContinue} style={{ ...btnGhost, width: "100%", marginTop: 10, fontSize: 12.5 }}>
                  {t("show_answers")}
                </button>
              )}
            </>
          ) : (
            <>
              <div style={{ ...box, marginBottom: 12, background: "rgba(0,168,150,0.06)" }}>
                <p style={{ fontSize: 11.5, color: T.textSoft, margin: "0 0 6px", fontWeight: 700 }}>{t("correct_answer_label")}</p>
                <p style={{ fontSize: 15.5, color: T.navy, margin: 0, fontWeight: 600 }}>{r.target.sentence}</p>
              </div>
              <button onClick={goNext} style={{ ...btnPrimary, width: "100%" }}>{t("continue")} →</button>
            </>
          )}
        </>
      ) : (
        <>
          <div className="fc-pop" style={{ ...box, marginBottom: 14, borderColor: T.accent, background: "rgba(0,168,150,0.08)" }}>
            <p style={{ fontSize: 12.5, color: T.accent, fontWeight: 800, margin: "0 0 8px" }}>✓ {t("correct_exclaim")}</p>
            <p style={{ fontSize: 16, color: T.navy, margin: 0, fontWeight: 600 }}>{r.target.sentence}</p>
          </div>

          {r.alternates.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11.5, color: T.textSoft, margin: "0 0 8px", fontWeight: 700 }}>{t("other_examples")}</p>
              <div style={{ display: "grid", gap: 8 }}>
                {r.alternates.map((alt, i) => (
                  <div key={i} style={{ ...box, padding: "10px 12px" }}>
                    <p style={{ fontSize: 14, color: T.navy, margin: "0 0 3px", fontWeight: 600 }}>{alt.sentence}</p>
                    {alt.translation && <p style={{ fontSize: 12.5, color: T.textSoft, margin: 0 }}>{alt.translation}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={goNext} style={{ ...btnPrimary, width: "100%" }}>{t("next")} →</button>
        </>
      )}
    </section>
  );
}
