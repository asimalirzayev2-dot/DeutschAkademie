import React, { useState, useEffect, useRef } from "react";
import Avatar from "./Avatar";
import { shuffle } from "./utils";

const T = {
  navy: "#003366", text: "#2A3D3C", textSoft: "rgba(42,61,60,0.66)",
  accent: "#00A896", warm: "#FF8C00", surface: "#FFFFFF",
  border: "rgba(42,61,60,0.14)", gold: "#D4AF37", danger: "#C0392B",
  bgSoft: "rgba(0,51,102,0.04)",
};

const SESSION_TIME = 240;      // Ardıcıl rejim: 14 söz üçün ümumi 4 dəqiqə
const POINTS_PER_LETTER = 100;
const HINT_PENALTY = 100;

// Hər səviyyənin öz "medalyon heyvanı" — hamıya açıq heyvanlardan (Avatar.jsx)
const LEVELS = {
  A1: {
    label: "A1 · Başlanğıc", medal: "dovsan",
    words: [
      { word: "HAUS", clue: "İnsanların yaşadığı tikili." },
      { word: "BUCH", clue: "Səhifələrdən ibarət, oxumaq üçün olan əşya." },
      { word: "APFEL", clue: "Ağacda bitən, adətən qırmızı və ya yaşıl meyvə." },
      { word: "STUHL", clue: "Üstündə oturmaq üçün olan mebel." },
      { word: "GARTEN", clue: "Evin yanında bitkilərin əkildiyi sahə." },
      { word: "SCHULE", clue: "Uşaqların təhsil aldığı yer." },
      { word: "FENSTER", clue: "Otağa işıq düşməsi üçün divardakı şüşəli açıqlıq." },
      { word: "FAMILIE", clue: "Ana, ata və uşaqlardan ibarət qohumluq topluluğu." },
      { word: "ARBEITEN", clue: "Pul qazanmaq üçün gördüyün fəaliyyət — işləmək feli." },
      { word: "BÄCKEREI", clue: "Çörək və şirniyyat satılan dükan." },
      { word: "FRÜHSTÜCK", clue: "Günün ilk yeməyi." },
      { word: "KRANKHEIT", clue: "Bədənin normal fəaliyyətini pozan vəziyyət." },
      { word: "GEBURTSTAG", clue: "Doğulduğun günün ildönümü." },
      { word: "VERSPÄTUNG", clue: "Planlaşdırılan vaxtdan gec qalma." },
    ],
  },
  A2: {
    label: "A2 · Elementar", medal: "tulku",
    words: [
      { word: "MOND", clue: "Gecə göydə görünən, Yerin təbii peyki." },
      { word: "ROCK", clue: "Qadınların bel aşağı geydiyi, ətək formalı geyim." },
      { word: "ONKEL", clue: "Atanın və ya ananın qardaşı." },
      { word: "ENKEL", clue: "Övladının oğlu, nəvə." },
      { word: "WOHNEN", clue: "Bir yerdə yaşamaq mənasını verən feil." },
      { word: "KOFFER", clue: "Səyahətdə əşya daşımaq üçün istifadə olunan çanta." },
      { word: "FRISEUR", clue: "Saç kəsən və düzəldən peşə sahibi." },
      { word: "ZEITUNG", clue: "Gündəlik xəbərləri özündə əks etdirən mətbu nəşr." },
      { word: "GESCHENK", clue: "Kiməsə sevgi əlaməti olaraq verilən əşya." },
      { word: "HANDTUCH", clue: "Yuyunduqdan sonra bədəni qurulamaq üçün parça." },
      { word: "SCHWESTER", clue: "Eyni valideynlərin qız övladı, bacı." },
      { word: "FLUGHAFEN", clue: "Təyyarələrin enib-qalxdığı yer." },
      { word: "ARBEITSTAG", clue: "İş görülən gün, iş günü." },
      { word: "SUPERMARKT", clue: "Ərzaq və məişət mallarının satıldığı böyük mağaza." },
    ],
  },
  B1: {
    label: "B1 · Orta", medal: "qurd",
    words: [
      { word: "ZIEL", clue: "Nail olmaq istədiyin nəticə." },
      { word: "PLAN", clue: "Əvvəlcədən düşünülmüş hərəkət ardıcıllığı." },
      { word: "KRAFT", clue: "Fiziki və ya mənəvi güc." },
      { word: "TREUE", clue: "Sözünə və öhdəliyinə sadiq qalma." },
      { word: "URLAUB", clue: "İşdən uzaqlaşıb istirahət etdiyin dövr." },
      { word: "GEDULD", clue: "Gözləmək bacarığı, hövsələ." },
      { word: "MEINUNG", clue: "Bir mövzu haqqında şəxsi düşüncə." },
      { word: "ANTWORT", clue: "Suala verilən reaksiya." },
      { word: "GEDANKEN", clue: "Beyində yaranan düşüncələr." },
      { word: "ERGEBNIS", clue: "Bir prosesin sonunda əldə edilən son vəziyyət." },
      { word: "ERFAHRUNG", clue: "Yaşanmış hadisələrdən qazanılan bilik." },
      { word: "VERTRAUEN", clue: "Kiməsə inanma hissi." },
      { word: "GESUNDHEIT", clue: "Bədənin xəstəliksiz, sağlam vəziyyəti." },
      { word: "SICHERHEIT", clue: "Təhlükədən uzaq olma vəziyyəti." },
    ],
  },
  B2: {
    label: "B2 · Yuxarı-orta", medal: "aslan",
    words: [
      { word: "SINN", clue: "Bir şeyin mənası, məzmunu." },
      { word: "WERT", clue: "Bir şeyin dəyəri, əhəmiyyəti." },
      { word: "MACHT", clue: "Hakimiyyət, gücün təzahürü." },
      { word: "REGEL", clue: "Əməl olunmalı qayda, norma." },
      { word: "URTEIL", clue: "Bir məsələ haqqında verilən qərar, hökm." },
      { word: "KRITIK", clue: "Bir şeyin nöqsanlarını göstərən tənqidi rəy." },
      { word: "ZWEIFEL", clue: "Bir şeyə tam əmin olmama hissi, şübhə." },
      { word: "BEGRIFF", clue: "Bir anlayışı ifadə edən söz və ya ifadə." },
      { word: "ANSPRUCH", clue: "Bir şeyi haqq kimi tələb etmə, iddia." },
      { word: "NACHTEIL", clue: "Mənfi cəhət, itki gətirən tərəf." },
      { word: "BEDEUTUNG", clue: "Bir sözün daşıdığı məna, əhəmiyyət." },
      { word: "BEZIEHUNG", clue: "İki tərəf arasında olan əlaqə, münasibət." },
      { word: "GRUNDLAGEN", clue: "Bir şeyin əsasını təşkil edən prinsiplər." },
      { word: "ENTSCHLUSS", clue: "Qəti şəkildə qərara gəlmə, qətiyyət." },
    ],
  },
};
const LEVEL_ORDER = ["A1", "A2", "B1", "B2"];

// Yalnız hərflərə icazə (ß qəsdən çıxarılıb: toUpperCase() onu "SS"-ə çevirir,
// bu da tək qutuya iki hərf yazılmasına səbəb olur — söz banklarında SS işlədilir).
const LETTER_RE = /^[a-zA-ZäöüÄÖÜ]$/;

function normalize(rows) {
  return rows.map((r) => ({ ...r, length: r.word.length }));
}

export default function SozTapmacasi() {
  const [screen, setScreen] = useState("select"); // select | game | result
  const [pickedLevel, setPickedLevel] = useState(null);
  const [session, setSession] = useState(null);
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => () => clearInterval(timerRef.current), []);

  function start(levelKey, label, mode, wordsRaw) {
    const words = normalize(wordsRaw);
    const queue = mode === "mixed" ? shuffle(words) : words;
    clearInterval(timerRef.current);
    const s = {
      levelKey, label, mode, queue, idx: 0,
      score: 0, timeLeft: SESSION_TIME,
      solvedCount: 0, hintsTotal: 0,
      answer: new Array(queue[0].word.length).fill(null),
      hintedIdx: new Set(), cursor: 0, solved: false,
      feedback: "", feedbackKind: "",
    };
    setSession(s);
    setScreen("game");
    if (mode === "sequential") {
      timerRef.current = setInterval(() => {
        setSession((prev) => {
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
    setSession((prev) => {
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
    setSession((prev) => {
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
    setSession((prev) => {
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
        feedback: "Hərf alındı — bu hərf üçün xal verilmir.", feedbackKind: "",
      };
    });
  }

  function clearGuess() {
    setSession((prev) => {
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
    setSession((prev) => {
      if (!prev || prev.solved) return prev;
      const w = currentWord(prev);
      if (prev.answer.some((v) => v === null)) {
        return { ...prev, feedback: "Əvvəlcə bütün qutuları doldur.", feedbackKind: "err" };
      }
      const guess = prev.answer.join("");
      if (guess === w.word) {
        const earned = (w.word.length - prev.hintedIdx.size) * POINTS_PER_LETTER;
        const solvedState = {
          ...prev, solved: true, solvedCount: prev.solvedCount + 1,
          score: prev.score + earned,
          feedback: `Doğru! "${w.word}"`, feedbackKind: "ok",
        };
        setTimeout(() => advance(), 850);
        return solvedState;
      }
      return { ...prev, feedback: "Səhv — yenidən cəhd et.", feedbackKind: "err" };
    });
  }

  function advance() {
    setSession((prev) => {
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
    setSession({ ...finalSession, _completedAll: completedAll });
    setScreen("result");
  }

  function restart() {
    if (!session) return;
    const lv = LEVELS[session.levelKey];
    if (session.levelKey === "MIXED") {
      const all = LEVEL_ORDER.flatMap((k) => LEVELS[k].words.map((w) => ({ ...w, level: k })));
      start("MIXED", "Bütün səviyyələr", "mixed", all);
    } else {
      start(session.levelKey, lv.label, session.mode, lv.words);
    }
  }

  function backToSelect() {
    clearInterval(timerRef.current);
    setSession(null);
    setScreen("select");
  }

  // ============ RENDER ============
  const box = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 16px" };
  const btnPrimary = { background: T.accent, color: "#fff", border: "none", borderRadius: 10, padding: "12px 20px", fontWeight: 800, fontSize: 14, cursor: "pointer" };
  const btnGhost = { background: "transparent", color: T.textSoft, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" };

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
              Söz Tapmacası
            </span>
          </div>
          <p style={{ fontSize: 13.5, color: T.textSoft, margin: "10px 0 0", lineHeight: 1.55 }}>
            Heç bir hərf əvvəlcədən görünmür — tərifə görə sözü özün tap və klaviaturadan yaz.
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
                <p style={{ margin: 0, fontSize: 11.5, color: T.textSoft }}>{lv.label.split("·")[1].trim()}</p>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => {
            const all = LEVEL_ORDER.flatMap((k) => LEVELS[k].words.map((w) => ({ ...w, level: k })));
            start("MIXED", "Bütün səviyyələr", "mixed", all);
          }}
          style={{
            width: "100%", textAlign: "left", padding: "13px 16px", borderRadius: 12, cursor: "pointer",
            background: "transparent", border: `1px dashed ${T.border}`, color: T.text,
            fontSize: 13.5, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
          <span>🎲 Bütün səviyyələr — Qarışıq (Karma) rejim</span>
          <span style={{ color: T.textSoft }}>→</span>
        </button>

        {pickedLevel && (
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 18 }}>
            <p style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1, color: T.textSoft, margin: "0 0 12px" }}>
              REJİM SEÇ
            </p>
            <div style={{ display: "grid", gap: 9 }}>
              <button onClick={() => start(pickedLevel, LEVELS[pickedLevel].label, "sequential", LEVELS[pickedLevel].words)}
                style={{ ...box, textAlign: "left", cursor: "pointer", border: `1px solid ${T.navy}` }}>
                <p style={{ margin: "0 0 3px", fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 700, color: T.navy }}>
                  Ardıcıl (4→10 hərf)
                </p>
                <p style={{ margin: 0, fontSize: 12, color: T.textSoft }}>
                  Ümumi 4 dəqiqə, hamısını tamamlasan medalyon qazanırsan
                </p>
              </button>
              <button onClick={() => start(pickedLevel, LEVELS[pickedLevel].label, "mixed", LEVELS[pickedLevel].words)}
                style={{ ...box, textAlign: "left", cursor: "pointer" }}>
                <p style={{ margin: "0 0 3px", fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 700, color: T.navy }}>
                  Karma / Sərbəst təkrar
                </p>
                <p style={{ margin: 0, fontSize: 12, color: T.textSoft }}>
                  Qarışıq sıra, vaxt sərhədi yox — sadəcə məşq
                </p>
              </button>
            </div>
          </div>
        )}
      </section>
    );
  }

  if (screen === "game" && session) {
    const w = currentWord(session);
    const mm = String(Math.floor(session.timeLeft / 60)).padStart(2, "0");
    const ss = String(session.timeLeft % 60).padStart(2, "0");
    return (
      <section style={{ maxWidth: 560, margin: "0 auto" }} onClick={() => inputRef.current && inputRef.current.focus()}>
        <input ref={inputRef} onChange={onHiddenChange} onKeyDown={onHiddenKeyDown}
          style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 1, height: 1 }}
          autoCapitalize="none" autoCorrect="off" autoComplete="off" />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: T.textSoft, marginBottom: 14 }}>
          <span>{session.label} · {session.mode === "sequential" ? "Ardıcıl" : "Karma"}</span>
          <span>{session.idx + 1} / {session.queue.length}</span>
        </div>

        <div style={box}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${T.border}` }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 5px", fontSize: 10.5, fontWeight: 800, letterSpacing: 1, color: T.textSoft }}>TƏRİF</p>
              <p style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 600, color: T.navy, lineHeight: 1.45 }}>
                {w.clue}
              </p>
            </div>
            <div style={{ display: "flex", gap: 18, flexShrink: 0 }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: session.mode === "sequential" ? (session.timeLeft <= 30 ? T.danger : T.warm) : T.textSoft }}>
                  {session.mode === "sequential" ? `${mm}:${ss}` : "∞"}
                </p>
                <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: T.textSoft, textTransform: "uppercase" }}>Vaxt</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: T.accent }}>{session.score}</p>
                <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, color: T.textSoft, textTransform: "uppercase" }}>Xal</p>
              </div>
            </div>
          </div>

          <p style={{ textAlign: "center", fontSize: 12, color: T.textSoft, margin: "0 0 14px" }}>
            {w.word.length} hərfli söz
          </p>

          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
            {session.answer.map((ch, i) => {
              const isHinted = session.hintedIdx.has(i);
              const isCurrent = i === session.cursor && !session.solved;
              return (
                <span key={i} style={{
                  width: 32, height: 42, borderRadius: 7,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: ch ? "rgba(0,51,102,0.05)" : "transparent",
                  borderBottom: `2px solid ${isCurrent ? T.warm : T.border}`,
                  fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 18,
                  color: session.solved ? T.accent : isHinted ? T.warm : T.navy,
                }}>{ch || ""}</span>
              );
            })}
          </div>

          <p style={{
            textAlign: "center", minHeight: 20, fontSize: 12.5, fontWeight: 700, margin: "0 0 12px",
            color: session.feedbackKind === "ok" ? T.accent : session.feedbackKind === "err" ? T.danger : T.textSoft,
          }}>
            {session.feedback}
          </p>

          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={(e) => { e.stopPropagation(); hint(); }} style={btnGhost}>Hərf al (−100)</button>
            <button onClick={(e) => { e.stopPropagation(); clearGuess(); }} style={btnGhost}>Təmizlə</button>
            <button onClick={(e) => { e.stopPropagation(); check(); }} style={btnPrimary}>Yoxla</button>
          </div>
        </div>
      </section>
    );
  }

  if (screen === "result" && session) {
    const lv = session.levelKey !== "MIXED" ? LEVELS[session.levelKey] : null;
    const earnsMedal = session.mode === "sequential" && session._completedAll && lv;
    return (
      <section style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ ...box, textAlign: "center", padding: "34px 26px" }}>
          {earnsMedal ? (
            <>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                <Avatar avatarKey={lv.medal} size={72} ring />
              </div>
              <p style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: T.navy, margin: "0 0 8px" }}>
                {session.levelKey} Söz Oyunu tamamlandı!
              </p>
              <p style={{ fontSize: 13, color: T.textSoft, margin: "0 0 22px" }}>
                Təbriklər — vaxt bitmədən bütün sözləri tapdın.
              </p>
            </>
          ) : session.mode === "mixed" ? (
            <>
              <div style={{ fontSize: 40, marginBottom: 10 }}>✓</div>
              <p style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 700, color: T.navy, margin: "0 0 8px" }}>
                Məşq tamamlandı
              </p>
              <p style={{ fontSize: 13, color: T.textSoft, margin: "0 0 22px" }}>
                Karma rejimdə medalyon verilmir — bu, sərbəst təkrar üçündür.
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: 40, marginBottom: 10 }}>⏱</div>
              <p style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 700, color: T.navy, margin: "0 0 8px" }}>
                Vaxt bitdi
              </p>
              <p style={{ fontSize: 13, color: T.textSoft, margin: "0 0 22px" }}>
                Medalyon üçün bütün sözləri vaxt bitmədən tapmalısan.
              </p>
            </>
          )}

          <div style={{ display: "flex", justifyContent: "center", gap: 28, marginBottom: 24 }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: T.accent }}>{session.score}</p>
              <p style={{ margin: 0, fontSize: 10, color: T.textSoft, fontWeight: 700, textTransform: "uppercase" }}>Xal</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: T.navy }}>{session.solvedCount}/{session.queue.length}</p>
              <p style={{ margin: 0, fontSize: 10, color: T.textSoft, fontWeight: 700, textTransform: "uppercase" }}>Tapılan</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: T.warm }}>{session.hintsTotal}</p>
              <p style={{ margin: 0, fontSize: 10, color: T.textSoft, fontWeight: 700, textTransform: "uppercase" }}>Alınan hərf</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button onClick={restart} style={btnPrimary}>Yenidən başla</button>
            <button onClick={backToSelect} style={btnGhost}>Səviyyə seçiminə qayıt</button>
          </div>
        </div>
      </section>
    );
  }

  return null;
}
