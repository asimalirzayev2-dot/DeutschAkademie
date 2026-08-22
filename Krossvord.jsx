import React, { useState, useEffect, useCallback, useMemo } from "react";
import { sb, sbAuthInsert } from "./supabase";
import { useLanguage } from "./i18n/LanguageContext";

/* ============ Söz yerləşdirmə mühərriki — skandinav üslubu (izah-xanaları şəbəkə daxilində) ============ */

function canPlaceClued(grid, reserved, word, r, c, dir) {
  for (let i = 0; i < word.length; i++) {
    const rr = dir === "H" ? r : r + i;
    const cc = dir === "H" ? c + i : c;
    const key = rr + "," + cc;
    if (reserved.has(key)) return false; // izah-xanasının üstünə hərf qoyula bilməz
    const existing = grid.get(key);
    if (existing !== undefined) {
      if (existing !== word[i]) return false;
    } else {
      if (dir === "H") {
        if (grid.get((rr - 1) + "," + cc) !== undefined) return false;
        if (grid.get((rr + 1) + "," + cc) !== undefined) return false;
      } else {
        if (grid.get(rr + "," + (cc - 1)) !== undefined) return false;
        if (grid.get(rr + "," + (cc + 1)) !== undefined) return false;
      }
    }
  }
  if (dir === "H") {
    if (grid.get(r + "," + (c - 1)) !== undefined) return false;
    if (grid.get(r + "," + (c + word.length)) !== undefined) return false;
  } else {
    if (grid.get((r - 1) + "," + c) !== undefined) return false;
    if (grid.get((r + word.length) + "," + c) !== undefined) return false;
  }
  // Bu sözün izah-xanası mövcud hərfin üstünə düşməməlidir (paylaşılan izah-xanası OK-dir)
  const clueR = dir === "H" ? r : r - 1;
  const clueC = dir === "H" ? c - 1 : c;
  if (grid.get(clueR + "," + clueC) !== undefined) return false;
  return true;
}

function placeClued(grid, reserved, wordObj) {
  const { word, row, col, dir } = wordObj;
  for (let i = 0; i < word.length; i++) {
    const rr = dir === "H" ? row : row + i;
    const cc = dir === "H" ? col + i : col;
    grid.set(rr + "," + cc, word[i]);
  }
  const clueR = dir === "H" ? row : row - 1;
  const clueC = dir === "H" ? col - 1 : col;
  wordObj.clueRow = clueR;
  wordObj.clueCol = clueC;
  reserved.add(clueR + "," + clueC);
}

function generateLayout(wordPairs) {
  const words = wordPairs.map(([w, clue]) => [w.toUpperCase(), clue]);
  words.sort((a, b) => b[0].length - a[0].length);

  const grid = new Map();
  const reserved = new Set();
  const placedLocal = [];

  const [firstWord, firstClue] = words[0];
  // Lövbər söz sütun 1-dən başlayır ki, sütun 0 onun öz izah-xanası olsun
  const first = { word: firstWord, clue: firstClue, row: 0, col: 1, dir: "H" };
  placeClued(grid, reserved, first);
  placedLocal.push(first);

  let remaining = words.slice(1);

  for (let pass = 0; pass < 3 && remaining.length > 0; pass++) {
    const stillRemaining = [];
    remaining.sort(() => Math.random() - 0.5);
    for (const [word, clue] of remaining) {
      let candidates = [];
      for (const pw of placedLocal) {
        for (let i = 0; i < pw.word.length; i++) {
          for (let j = 0; j < word.length; j++) {
            if (pw.word[i] !== word[j]) continue;
            const dir = pw.dir === "H" ? "V" : "H";
            let r, c;
            if (dir === "V") { r = pw.row - j; c = pw.col + i; }
            else { r = pw.row + i; c = pw.col - j; }
            if (canPlaceClued(grid, reserved, word, r, c, dir)) candidates.push({ r, c, dir });
          }
        }
      }
      if (candidates.length > 0) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        const wordObj = { word, clue, row: pick.r, col: pick.c, dir: pick.dir };
        placeClued(grid, reserved, wordObj);
        placedLocal.push(wordObj);
      } else {
        stillRemaining.push([word, clue]);
      }
    }
    remaining = stillRemaining;
  }
  return { grid, reserved, placed: placedLocal };
}

function pickWords(dictWords, n) {
  const pool = dictWords.filter(([w]) => w.length >= 3 && w.length <= 12);
  const shuffled = pool.slice().sort(() => Math.random() - 0.5);
  shuffled.sort((a, b) => b[0].length - a[0].length);
  const top = shuffled.slice(0, Math.min(shuffled.length, n * 3)).sort(() => Math.random() - 0.5);
  return top.slice(0, n);
}

function cellsOf(p) {
  const cells = [];
  for (let i = 0; i < p.word.length; i++) {
    cells.push(p.dir === "H" ? [p.row, p.col + i] : [p.row + i, p.col]);
  }
  return cells;
}

/* ============ Təkrarsızlıq — səviyyə üzrə yadda saxlanılır ============ */
function usedKey(level) { return "krossvord_istifade_" + level; }
function getUsed(level) {
  try { return new Set(JSON.parse(localStorage.getItem(usedKey(level)) || "[]")); }
  catch { return new Set(); }
}
function addUsed(level, words) {
  const set = getUsed(level);
  words.forEach((w) => set.add(w));
  try { localStorage.setItem(usedKey(level), JSON.stringify([...set])); } catch {}
}
function resetUsed(level) {
  try { localStorage.removeItem(usedKey(level)); } catch {}
}

/* ============ Rənglər ============ */
const T = {
  accent: "#00A896",
  warm: "#FF8C00",
  warmSoft: "rgba(255,140,0,0.16)",
  navy: "#1B2430",
  text: "#2A3D3C",
  textSoft: "rgba(42,61,60,0.62)",
  border: "rgba(0,168,150,0.28)",
};

/* ============ Krossvordun DAXİLİ görünüşü — köhnə kitab üslubu ============ */
const P = {
  paper: "#F2EBDD",
  paperLine: "#E1D6BE",
  wall: "#E7DCC2",
  ink: "#1B2430",
  gold: "#C9A227",
  active: "#FDEBC8",
  goodBg: "#DCEDE6", goodText: "#3F6E5A",
  badBg: "#F6DEDC", badText: "#8A3A34",
};

const LEVELS = ["A1", "A2", "B1", "B2"];
const COUNT_OPTIONS = [8, 12, 16, 20];
const CELL = 32;

export default function Krossvord({ portalStyles, SectionHeader, session }) {
  const { t } = useLanguage();
  const [level, setLevel] = useState("A1");
  const [count, setCount] = useState(12);
  const [dictWords, setDictWords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const [solutionGrid, setSolutionGrid] = useState(new Map());
  const [placedWords, setPlacedWords] = useState([]);
  const [dims, setDims] = useState({ rows: 0, cols: 0 });
  const [cellValues, setCellValues] = useState({});
  const [cellStatus, setCellStatus] = useState({});
  const [activeWord, setActiveWord] = useState(null);   // hazırda açıq panelin sözü
  const [chooserCell, setChooserCell] = useState(null);  // 2 sahibli izah-xanası basılanda seçim paneli
  const [xpAwarded, setXpAwarded] = useState(false);

  useEffect(() => {
    setLoading(true);
    sb(`dictionary?direction=eq.de-az&level=eq.${level}&select=term,translation&limit=400`)
      .then((rows) => {
        const cleaned = (rows || [])
          .map((r) => [String(r.term).trim(), String(r.translation).trim()])
          .filter((r) => /^[A-Za-zÄÖÜäöüß]{3,12}$/.test(r[0]));
        setDictWords(cleaned);
      })
      .catch(() => setDictWords([]))
      .finally(() => setLoading(false));
  }, [level]);

  const buildPuzzle = useCallback(() => {
    if (dictWords.length < 4) {
      setStatusMsg(t("no_enough_words_level"));
      return;
    }
    const used = getUsed(level);
    let available = dictWords.filter(([w]) => !used.has(w));
    if (available.length < count) { resetUsed(level); available = dictWords; }

    const chosen = pickWords(available, count);
    if (chosen.length < 4) { setStatusMsg(t("no_enough_matching_words")); return; }

    let best = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      const res = generateLayout(chosen);
      if (!best || res.placed.length > best.placed.length) best = res;
      if (best.placed.length === chosen.length) break;
    }

    let rMin = Infinity, rMax = -Infinity, cMin = Infinity, cMax = -Infinity;
    const allKeys = [...best.grid.keys(), ...best.reserved];
    for (const key of allKeys) {
      const [r, c] = key.split(",").map(Number);
      rMin = Math.min(rMin, r); rMax = Math.max(rMax, r);
      cMin = Math.min(cMin, c); cMax = Math.max(cMax, c);
    }
    const minR = rMin, minC = cMin;
    const shifted = best.placed.map((p) => ({
      ...p,
      row: p.row - minR, col: p.col - minC,
      clueRow: p.clueRow - minR, clueCol: p.clueCol - minC,
    }));

    // Tamamilə boş sətir/sütunları at — hər sözün özü toxunduğu sətir/sütunu "dolu" edir,
    // ona görə heç bir sözün ortasından kəsmir, sadəcə əhatəli boşluqları sıxır
    const occRows = new Set(), occCols = new Set();
    shifted.forEach((p) => {
      cellsOf(p).forEach(([r, c]) => { occRows.add(r); occCols.add(c); });
      occRows.add(p.clueRow); occCols.add(p.clueCol);
    });
    const sortedRows = [...occRows].sort((a, b) => a - b);
    const sortedCols = [...occCols].sort((a, b) => a - b);
    const rowMap = new Map(sortedRows.map((old, i) => [old, i]));
    const colMap = new Map(sortedCols.map((old, i) => [old, i]));

    const placed = shifted.map((p) => ({
      ...p,
      row: rowMap.get(p.row), col: colMap.get(p.col),
      clueRow: rowMap.get(p.clueRow), clueCol: colMap.get(p.clueCol),
    }));
    const rows = sortedRows.length, cols = sortedCols.length;

    const compactSolution = new Map();
    placed.forEach((p) => {
      cellsOf(p).forEach(([r, c], i) => { compactSolution.set(r + "," + c, p.word[i]); });
    });

    addUsed(level, placed.map((p) => p.word));
    setSolutionGrid(compactSolution);
    setPlacedWords(placed);
    setDims({ rows, cols });
    setCellValues({});
    setCellStatus({});
    setActiveWord(null);
    setChooserCell(null);
    setXpAwarded(false);
    setStatusMsg(`${placed.length} ${t("words_placed")}`);
  }, [dictWords, level, count, t]);

  useEffect(() => { if (dictWords.length > 0) buildPuzzle(); }, [dictWords]); // eslint-disable-line react-hooks/exhaustive-deps

  function has(r, c) { return solutionGrid.has(r + "," + c); }

  const clueOwnersMap = useMemo(() => {
    const m = new Map();
    placedWords.forEach((p) => {
      const key = p.clueRow + "," + p.clueCol;
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(p);
    });
    return m;
  }, [placedWords]);

  function wordAt(r, c, dir) {
    return placedWords.find((p) => {
      if (p.dir !== dir) return false;
      if (dir === "H") return p.row === r && c >= p.col && c < p.col + p.word.length;
      return p.col === c && r >= p.row && r < p.row + p.word.length;
    });
  }

  function openWord(w) {
    if (!w) return;
    setChooserCell(null);
    setActiveWord(w);
  }

  function closePanel() {
    // Diqqət: cellValues-a toxunmuruq — yazılmış hərflər olduğu kimi qalır
    setActiveWord(null);
    setChooserCell(null);
  }

  function onLetterClick(r, c) {
    const h = wordAt(r, c, "H");
    const v = wordAt(r, c, "V");
    if (h && v) {
      if (activeWord && activeWord === h) { openWord(v); return; }
      if (activeWord && activeWord === v) { openWord(h); return; }
      openWord(h);
      return;
    }
    openWord(h || v || null);
  }

  function onClueClick(r, c) {
    const owners = clueOwnersMap.get(r + "," + c);
    if (!owners || owners.length === 0) return;
    if (owners.length === 1) { openWord(owners[0]); return; }
    setActiveWord(null);
    setChooserCell({ key: r + "," + c, owners });
  }

  function currentWordValue(w) {
    return cellsOf(w).map(([r, c]) => cellValues[r + "," + c] || "").join("");
  }

  function handlePanelInputChange(e) {
    if (!activeWord) return;
    const raw = e.target.value.toUpperCase().replace(/[^A-ZÄÖÜß]/g, "").slice(0, activeWord.word.length);
    const cells = cellsOf(activeWord);
    setCellValues((prev) => {
      const next = { ...prev };
      cells.forEach(([r, c], i) => {
        const key = r + "," + c;
        const ch = raw[i];
        if (ch) next[key] = ch; else delete next[key];
      });
      return next;
    });
    setCellStatus((prev) => {
      const next = { ...prev };
      cells.forEach(([r, c]) => delete next[r + "," + c]);
      return next;
    });
  }

  function checkAnswers() {
    const next = {};
    let allCells = 0, correctCells = 0;
    placedWords.forEach((p) => {
      cellsOf(p).forEach(([r, c]) => {
        const key = r + "," + c;
        allCells++;
        const typed = cellValues[key];
        if (!typed) return;
        const correct = solutionGrid.get(r + "," + c);
        const ok = typed === correct;
        next[key] = ok ? "correct" : "incorrect";
        if (ok) correctCells++;
      });
    });
    setCellStatus(next);

    if (!xpAwarded && allCells > 0 && correctCells === allCells && session?.user?.id) {
      setXpAwarded(true);
      sbAuthInsert("xp_log", session.access_token, {
        user_id: session.user.id, source: "krossvord", amount: 15,
        meta: { level, count },
      }).catch(() => {});
    }
  }

  function clearAnswers() {
    setCellValues({});
    setCellStatus({});
    setActiveWord(null);
    setChooserCell(null);
  }

  function revealAnswers() {
    const nextVals = { ...cellValues };
    const nextStatus = { ...cellStatus };
    placedWords.forEach((p) => {
      cellsOf(p).forEach(([r, c]) => {
        const key = r + "," + c;
        nextVals[key] = solutionGrid.get(r + "," + c);
        nextStatus[key] = "correct";
      });
    });
    setCellValues(nextVals);
    setCellStatus(nextStatus);
    setActiveWord(null);
    setChooserCell(null);
  }

  const pillBtn = (active) => ({
    padding: "8px 16px", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer",
    background: active ? T.accent : "transparent", color: active ? "#fff" : T.text,
    border: `1px solid ${active ? T.accent : T.border}`,
  });
  const actionBtn = (primary) => ({
    padding: "9px 16px", borderRadius: 10, fontSize: 13.5, fontWeight: 700, cursor: "pointer",
    background: primary ? T.warm : "transparent", color: primary ? "#fff" : T.text,
    border: `1px solid ${primary ? T.warm : T.border}`,
  });

  const totalWords = placedWords.length;
  const filledWords = placedWords.filter((p) => cellsOf(p).every(([r, c]) => !!cellValues[r + "," + c])).length;

  return (
    <section style={portalStyles ? portalStyles.section : { maxWidth: 900, margin: "0 auto" }}>
      {SectionHeader
        ? <SectionHeader type="krossvord" desc={t("kw_desc")} />
        : <h2 style={{ fontFamily: "'Fraunces', serif", color: T.navy, marginBottom: 4 }}>{t("crossword")}</h2>}

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {LEVELS.map((lvl) => (
          <button key={lvl} onClick={() => setLevel(lvl)} style={pillBtn(level === lvl)}>{lvl}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {COUNT_OPTIONS.map((n) => (
          <button key={n} onClick={() => setCount(n)} style={pillBtn(count === n)}>{n} {t("word_unit")}</button>
        ))}
        <button onClick={buildPuzzle} style={actionBtn(true)}>🔄 {t("new_crossword")}</button>
        <button onClick={checkAnswers} style={actionBtn(false)}>{t("check")}</button>
        <button onClick={clearAnswers} style={actionBtn(false)}>{t("clear")}</button>
        <button onClick={revealAnswers} style={actionBtn(false)}>{t("show_answers")}</button>
      </div>

      {totalWords > 0 && (
        <p style={{ fontSize: 12.5, color: T.textSoft, margin: "0 0 10px", fontWeight: 600 }}>
          {filledWords}/{totalWords} {t("words_found")}{statusMsg ? ` · ${statusMsg}` : ""}
        </p>
      )}

      {loading ? (
        <p style={{ color: T.textSoft, fontSize: 14 }}>{t("loading")}</p>
      ) : (
        <div style={{
          background: P.paper, borderRadius: 8, padding: 10,
          boxShadow: "0 14px 30px -18px rgba(27,36,48,0.45)", overflow: "auto",
          paddingBottom: activeWord || chooserCell ? 190 : 10,
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${dims.cols || 1}, ${CELL}px)`,
            gap: 0, width: "max-content", margin: "0 auto",
            border: `2px solid ${P.ink}`,
          }}>
            {Array.from({ length: dims.rows }).map((_, r) =>
              Array.from({ length: dims.cols }).map((_, c) => {
                const key = r + "," + c;

                if (has(r, c)) {
                  const status = cellStatus[key];
                  const isActive = activeWord && cellsOf(activeWord).some(([rr, cc]) => rr === r && cc === c);
                  return (
                    <button key={key} onClick={() => onLetterClick(r, c)}
                      style={{
                        width: CELL, height: CELL, border: `1px solid ${P.paperLine}`, boxSizing: "border-box",
                        background: status === "correct" ? P.goodBg : status === "incorrect" ? P.badBg : (isActive ? P.active : "#fff"),
                        fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 14, padding: 0,
                        color: status === "correct" ? P.goodText : status === "incorrect" ? P.badText : P.ink,
                        cursor: "pointer",
                      }}>
                      {cellValues[key] || ""}
                    </button>
                  );
                }

                const owners = clueOwnersMap.get(key);
                if (owners && owners.length) {
                  const hasH = owners.some((w) => w.dir === "H");
                  const hasV = owners.some((w) => w.dir === "V");
                  const isActiveClue = activeWord && (activeWord.clueRow === r && activeWord.clueCol === c);
                  const clueText = owners.length === 1 ? owners[0].clue : owners.map((w) => w.clue).join(" / ");
                  return (
                    <button key={key} onClick={() => onClueClick(r, c)}
                      style={{
                        width: CELL, height: CELL, border: `1px solid ${P.paperLine}`, boxSizing: "border-box",
                        background: isActiveClue ? T.warm : T.warmSoft,
                        display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-start",
                        padding: "1px 2px", cursor: "pointer", overflow: "hidden", textAlign: "left",
                      }}>
                      <span style={{ fontSize: 6, color: isActiveClue ? "#fff" : T.warm, fontWeight: 800, lineHeight: 1 }}>
                        {hasH ? "\u2192" : ""}{hasV ? "\u2193" : ""}
                      </span>
                      <span style={{
                        fontSize: 5.2, lineHeight: 1.05, color: isActiveClue ? "#fff" : P.ink,
                        display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical",
                        overflow: "hidden", wordBreak: "break-word", fontFamily: "'IBM Plex Mono', monospace",
                      }}>{clueText}</span>
                    </button>
                  );
                }

                return <div key={key} style={{
                  width: CELL, height: CELL, background: P.wall,
                  boxShadow: "inset 0 0 3px rgba(27,36,48,0.18)",
                }} />;
              })
            )}
          </div>
        </div>
      )}

      {/* ---------- Aşağıda sabit panel: aktiv sözün izahı + giriş sahəsi ---------- */}
      {activeWord && (
        <div style={panelWrapStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: T.warm, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {activeWord.dir === "H" ? `→ ${t("horizontal")}` : `↓ ${t("vertical")}`} · {activeWord.word.length} {t("letters_count")}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 14.5, color: P.ink, lineHeight: 1.35 }}>{activeWord.clue}</p>
            </div>
            <button onClick={closePanel} style={closeBtnStyle} aria-label={t("close")}>×</button>
          </div>
          <input
            key={activeWord.dir + activeWord.row + activeWord.col}
            autoFocus
            value={currentWordValue(activeWord)}
            onChange={handlePanelInputChange}
            maxLength={activeWord.word.length}
            style={panelInputStyle}
          />
        </div>
      )}

      {/* ---------- Aşağıda sabit panel: 2 sahibli izah-xanası üçün seçim ---------- */}
      {chooserCell && (
        <div style={panelWrapStyle}>
          <p style={{ margin: "0 0 10px", fontSize: 12.5, fontWeight: 700, color: T.textSoft }}>{t("which_word_open")}</p>
          <div style={{ display: "flex", gap: 8 }}>
            {chooserCell.owners.map((w) => (
              <button key={w.dir} onClick={() => openWord(w)} style={chooserOptionStyle}>
                <span style={{ fontWeight: 800, color: T.warm, marginRight: 6 }}>{w.dir === "H" ? "→" : "↓"}</span>
                {w.clue.length > 34 ? w.clue.slice(0, 34) + "…" : w.clue}
              </button>
            ))}
          </div>
          <button onClick={closePanel} style={{ ...actionBtn(false), marginTop: 10, width: "100%" }}>{t("close")}</button>
        </div>
      )}
    </section>
  );
}

const panelWrapStyle = {
  position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50,
  background: "linear-gradient(180deg, #FFFFFF 0%, #FBF7ED 100%)",
  borderTop: `3px solid ${T.accent}`,
  boxShadow: "0 -10px 28px rgba(27,36,48,0.18)",
  padding: "14px 16px calc(14px + env(safe-area-inset-bottom))",
};

const closeBtnStyle = {
  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
  border: "none", background: "rgba(42,61,60,0.08)", color: T.text,
  fontSize: 17, lineHeight: 1, cursor: "pointer",
};

const panelInputStyle = {
  width: "100%", padding: "12px 14px", borderRadius: 10,
  border: `2px solid ${T.accent}`, outline: "none",
  fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 18,
  textTransform: "uppercase", letterSpacing: "0.14em", color: P.ink,
  boxSizing: "border-box",
};

const chooserOptionStyle = {
  flex: 1, textAlign: "left", padding: "10px 12px", borderRadius: 10, cursor: "pointer",
  background: "rgba(255,140,0,0.08)", border: `1px solid ${T.warm}`,
  fontSize: 12.5, color: T.text, lineHeight: 1.3,
};
