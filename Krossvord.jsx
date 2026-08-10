import React, { useState, useEffect, useRef, useCallback } from "react";
import { sb } from "./supabase";

/* ============ Söz yerləşdirmə mühərriki (DOM-dan asılı deyil) ============ */

function canPlace(grid, word, r, c, dir) {
  for (let i = 0; i < word.length; i++) {
    const rr = dir === "H" ? r : r + i;
    const cc = dir === "H" ? c + i : c;
    const key = rr + "," + cc;
    const existing = grid.get(key);
    if (existing !== undefined) {
      if (existing !== word[i]) return false;
    } else {
      if (dir === "H") {
        if (grid.get(rr - 1 + "," + cc) !== undefined) return false;
        if (grid.get(rr + 1 + "," + cc) !== undefined) return false;
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
    if (grid.get(r - 1 + "," + c) !== undefined) return false;
    if (grid.get(r + word.length + "," + c) !== undefined) return false;
  }
  return true;
}

function place(grid, word, r, c, dir) {
  for (let i = 0; i < word.length; i++) {
    const rr = dir === "H" ? r : r + i;
    const cc = dir === "H" ? c + i : c;
    grid.set(rr + "," + cc, word[i]);
  }
}

function generateLayout(wordPairs) {
  const words = wordPairs.map(([w, clue]) => [w.toUpperCase(), clue]);
  words.sort((a, b) => b[0].length - a[0].length);

  const grid = new Map();
  const placedLocal = [];

  const [firstWord, firstClue] = words[0];
  place(grid, firstWord, 0, 0, "H");
  placedLocal.push({ word: firstWord, clue: firstClue, row: 0, col: 0, dir: "H" });

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
            if (canPlace(grid, word, r, c, dir)) candidates.push({ r, c, dir });
          }
        }
      }
      if (candidates.length > 0) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        place(grid, word, pick.r, pick.c, pick.dir);
        placedLocal.push({ word, clue, row: pick.r, col: pick.c, dir: pick.dir });
      } else {
        stillRemaining.push([word, clue]);
      }
    }
    remaining = stillRemaining;
  }
  return { grid, placed: placedLocal };
}

function pickWords(dictWords, n) {
  const pool = dictWords.filter(([w]) => w.length >= 3 && w.length <= 12);
  const shuffled = pool.slice().sort(() => Math.random() - 0.5);
  shuffled.sort((a, b) => b[0].length - a[0].length);
  const top = shuffled.slice(0, Math.min(shuffled.length, n * 3)).sort(() => Math.random() - 0.5);
  return top.slice(0, n);
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

/* ============ Panel rəngi — platforma ilə uyğun (dəyişməz) ============ */
const T = {
  card: "rgba(255,255,255,0.85)",
  border: "rgba(0,168,150,0.28)",
  accent: "#00A896",
  accentSoft: "rgba(0,168,150,0.14)",
  warm: "#FF8C00",
  warmSoft: "rgba(255,140,0,0.14)",
  navy: "#1B2430",
  text: "#2A3D3C",
  textSoft: "rgba(42,61,60,0.62)",
};

/* ============ Krossvordun DAXİLİ görünüşü — köhnə kitab üslubu ============ */
const P = {
  paper: "#F2EBDD",
  paperLine: "#E1D6BE",
  ink: "#1B2430",
  ink2: "#232F40",
  gold: "#C9A227",
  numColor: "#8A7F63",
  active: "#FDEBC8",
  goodBg: "#DCEDE6", goodText: "#3F6E5A",
  badBg: "#F6DEDC", badText: "#8A3A34",
};

const LEVELS = ["A1", "A2", "B1", "B2"];
const COUNT_OPTIONS = [8, 12, 16, 20];

export default function Krossvord({ portalStyles, SectionHeader }) {
  const [level, setLevel] = useState("A1");
  const [count, setCount] = useState(12);
  const [dictWords, setDictWords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const [solutionGrid, setSolutionGrid] = useState(new Map());
  const [placedWords, setPlacedWords] = useState([]);
  const [dims, setDims] = useState({ rows: 0, cols: 0, minR: 0, minC: 0 });
  const [cellValues, setCellValues] = useState({});
  const [cellStatus, setCellStatus] = useState({});
  const [selected, setSelected] = useState(null); // {cells:[[r,c]...], dir, number}

  const inputRefs = useRef({});

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
      setStatusMsg("Bu səviyyədə kifayət qədər söz yoxdur.");
      return;
    }
    const used = getUsed(level);
    let available = dictWords.filter(([w]) => !used.has(w));
    if (available.length < count) { resetUsed(level); available = dictWords; }

    const chosen = pickWords(available, count);
    if (chosen.length < 4) { setStatusMsg("Kifayət qədər uyğun söz yoxdur."); return; }

    let best = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      const res = generateLayout(chosen);
      if (!best || res.placed.length > best.placed.length) best = res;
      if (best.placed.length === chosen.length) break;
    }

    let rMin = Infinity, rMax = -Infinity, cMin = Infinity, cMax = -Infinity;
    for (const key of best.grid.keys()) {
      const [r, c] = key.split(",").map(Number);
      rMin = Math.min(rMin, r); rMax = Math.max(rMax, r);
      cMin = Math.min(cMin, c); cMax = Math.max(cMax, c);
    }
    const minR = rMin, minC = cMin, rows = rMax - rMin + 1, cols = cMax - cMin + 1;
    const placed = best.placed.map((p) => ({ ...p, row: p.row - minR, col: p.col - minC }));

    const has = (r, c) => best.grid.has((r + minR) + "," + (c + minC));
    const numberOf = new Map();
    let counter = 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!has(r, c)) continue;
        const startsH = !has(r, c - 1) && has(r, c + 1);
        const startsV = !has(r - 1, c) && has(r + 1, c);
        if (startsH || startsV) numberOf.set(r + "," + c, counter++);
      }
    }
    placed.forEach((p) => { p.number = numberOf.get(p.row + "," + p.col); });

    addUsed(level, placed.map((p) => p.word));
    setSolutionGrid(best.grid);
    setPlacedWords(placed);
    setDims({ rows, cols, minR, minC });
    setCellValues({});
    setCellStatus({});
    setSelected(null);
    inputRefs.current = {};
    setStatusMsg(`${placed.length} söz yerləşdirildi`);
  }, [dictWords, level, count]);

  useEffect(() => { if (dictWords.length > 0) buildPuzzle(); }, [dictWords]); // eslint-disable-line react-hooks/exhaustive-deps

  function has(r, c) { return solutionGrid.has((r + dims.minR) + "," + (c + dims.minC)); }

  function wordAt(r, c, dir) {
    return placedWords.find((p) => {
      if (p.dir !== dir) return false;
      if (dir === "H") return p.row === r && c >= p.col && c < p.col + p.word.length;
      return p.col === c && r >= p.row && r < p.row + p.word.length;
    });
  }

  function selectAt(r, c, toggle) {
    const h = wordAt(r, c, "H");
    const v = wordAt(r, c, "V");
    let target;
    if (selected && toggle && selected.dir === "H" && h && v) target = v;
    else if (selected && toggle && selected.dir === "V" && h && v) target = h;
    else target = h || v;
    if (!target) return;
    const cells = [];
    for (let i = 0; i < target.word.length; i++) {
      cells.push(target.dir === "H" ? [target.row, target.col + i] : [target.row + i, target.col]);
    }
    setSelected({ cells, dir: target.dir, number: target.number });
  }

  function isCellActive(r, c) {
    if (!selected) return false;
    return selected.cells.some(([rr, cc]) => rr === r && cc === c);
  }

  function focusCell(r, c) {
    const el = inputRefs.current[r + "," + c];
    if (el) { el.focus(); el.select && el.select(); }
  }

  function onCellChange(r, c, val) {
    const letter = val.slice(-1).toUpperCase();
    setCellValues((prev) => ({ ...prev, [r + "," + c]: letter }));
    setCellStatus((prev) => { const n = { ...prev }; delete n[r + "," + c]; return n; });
    if (!letter || !selected) return;
    const idx = selected.cells.findIndex(([rr, cc]) => rr === r && cc === c);
    if (idx >= 0 && idx < selected.cells.length - 1) {
      const [nr, nc] = selected.cells[idx + 1];
      focusCell(nr, nc);
    }
  }

  function onCellKeyDown(e, r, c) {
    const dirs = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] };
    if (dirs[e.key]) {
      e.preventDefault();
      const [dr, dc] = dirs[e.key];
      if (has(r + dr, c + dc)) focusCell(r + dr, c + dc);
    } else if (e.key === "Backspace" && !cellValues[r + "," + c] && selected) {
      const idx = selected.cells.findIndex(([rr, cc]) => rr === r && cc === c);
      if (idx > 0) { const [pr, pc] = selected.cells[idx - 1]; focusCell(pr, pc); }
    }
  }

  function checkAnswers() {
    const next = {};
    placedWords.forEach((p) => {
      for (let i = 0; i < p.word.length; i++) {
        const r = p.dir === "H" ? p.row : p.row + i;
        const c = p.dir === "H" ? p.col + i : p.col;
        const key = r + "," + c;
        const typed = cellValues[key];
        if (!typed) continue;
        const correct = solutionGrid.get((r + dims.minR) + "," + (c + dims.minC));
        next[key] = typed === correct ? "correct" : "incorrect";
      }
    });
    setCellStatus(next);
  }

  function revealAnswers() {
    const nextVals = { ...cellValues };
    const nextStatus = { ...cellStatus };
    placedWords.forEach((p) => {
      for (let i = 0; i < p.word.length; i++) {
        const r = p.dir === "H" ? p.row : p.row + i;
        const c = p.dir === "H" ? p.col + i : p.col;
        const key = r + "," + c;
        nextVals[key] = solutionGrid.get((r + dims.minR) + "," + (c + dims.minC));
        nextStatus[key] = "correct";
      }
    });
    setCellValues(nextVals);
    setCellStatus(nextStatus);
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

  const allClues = placedWords
    .slice()
    .sort((a, b) => a.number - b.number || (a.dir === "H" ? -1 : 1));

  const ClueList = ({ items }) => (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 2 }}>
      {items.map((p) => (
        <li key={p.dir + p.number}
          onClick={() => { selectAt(p.row, p.col); focusCell(p.row, p.col); }}
          style={{
            fontSize: 12.5, lineHeight: 1.35, cursor: "pointer", padding: "3px 5px", borderRadius: 4,
            background: selected && selected.number === p.number && selected.dir === p.dir ? P.active : "transparent",
            color: P.ink,
          }}>
          <b style={{ color: P.gold, marginRight: 4, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>
            {p.number}{p.dir === "H" ? "\u2192" : "\u2193"}
          </b>
          {p.clue} <span style={{ opacity: 0.45 }}>({p.word.length})</span>
        </li>
      ))}
    </ul>
  );

  return (
    <section style={portalStyles ? portalStyles.section : { maxWidth: 900, margin: "0 auto" }}>
      {SectionHeader
        ? <SectionHeader type="krossvord" desc="Alman dili krossvordu — sözləri kəsişmə üzrə tap" />
        : <h2 style={{ fontFamily: "'Fraunces', serif", color: T.navy, marginBottom: 4 }}>Krossvord</h2>}

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {LEVELS.map((lvl) => (
          <button key={lvl} onClick={() => setLevel(lvl)} style={pillBtn(level === lvl)}>{lvl}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {COUNT_OPTIONS.map((n) => (
          <button key={n} onClick={() => setCount(n)} style={pillBtn(count === n)}>{n} söz</button>
        ))}
        <button onClick={buildPuzzle} style={actionBtn(true)}>🔄 Yeni krossvord</button>
        <button onClick={checkAnswers} style={actionBtn(false)}>Yoxla</button>
        <button onClick={revealAnswers} style={actionBtn(false)}>Cavabları göstər</button>
        {statusMsg && <span style={{ fontSize: 12, color: T.textSoft, marginLeft: "auto" }}>{statusMsg}</span>}
      </div>

      {loading ? (
        <p style={{ color: T.textSoft, fontSize: 14 }}>Yüklənir...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(240px,1fr) 260px", gap: 22, alignItems: "start" }}
             className="krossvord-board">
          <div style={{
            background: P.paper, borderRadius: 8, padding: 14,
            boxShadow: "0 14px 30px -18px rgba(27,36,48,0.45)", overflow: "auto",
          }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${dims.cols || 1}, 28px)`,
              gap: 0, width: "max-content", margin: "0 auto",
              border: `2px solid ${P.ink}`,
            }}>
              {Array.from({ length: dims.rows }).map((_, r) =>
                Array.from({ length: dims.cols }).map((_, c) => {
                  if (!has(r, c)) {
                    return <div key={r + "-" + c} style={{ width: 28, height: 28, background: P.ink }} />;
                  }
                  const key = r + "," + c;
                  const status = cellStatus[key];
                  const active = isCellActive(r, c);
                  const startWords = placedWords.filter((p) => p.row === r && p.col === c && p.number);
                  const numAt = startWords[0]?.number;
                  const startsH = startWords.some((p) => p.dir === "H");
                  const startsV = startWords.some((p) => p.dir === "V");
                  return (
                    <div key={key} style={{
                      width: 28, height: 28, position: "relative",
                      background: status === "correct" ? P.goodBg : status === "incorrect" ? P.badBg : (active ? P.active : "#fff"),
                      border: `1px solid ${P.paperLine}`, boxSizing: "border-box",
                    }}>
                      {numAt && (
                        <span style={{ position: "absolute", top: 0, left: 1.5, fontSize: 7, color: P.numColor, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1 }}>
                          {numAt}{startsH ? "\u2192" : ""}{startsV ? "\u2193" : ""}
                        </span>
                      )}
                      <input
                        ref={(el) => { if (el) inputRefs.current[key] = el; }}
                        maxLength={1}
                        value={cellValues[key] || ""}
                        onChange={(e) => onCellChange(r, c, e.target.value)}
                        onFocus={() => selectAt(r, c)}
                        onClick={() => selectAt(r, c, true)}
                        onKeyDown={(e) => onCellKeyDown(e, r, c)}
                        style={{
                          width: "100%", height: "100%", border: "none", background: "transparent",
                          textAlign: "center", textTransform: "uppercase", outline: "none",
                          fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 13.5,
                          color: status === "correct" ? P.goodText : status === "incorrect" ? P.badText : P.ink,
                        }}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{
            background: P.paper, borderRadius: 8, padding: "14px 16px",
            boxShadow: "0 14px 30px -18px rgba(27,36,48,0.45)",
          }}>
            <h4 style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
              color: P.gold, margin: "0 0 8px", borderBottom: `1px solid ${P.paperLine}`, paddingBottom: 5,
            }}>İzahlar</h4>
            <ClueList items={allClues} />
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 760px) {
          .krossvord-board { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
