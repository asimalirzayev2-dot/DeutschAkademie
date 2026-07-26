import React, { useState, useEffect, useRef } from "react";
import { sb } from "./supabase";
import { speakGerman, exportAnki } from "./utils";

function DictionaryView({ portalStyles, SectionHeader }) {
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState("de-az"); // de-az | az-de
  const [results, setResults] = useState([]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    let alive = true;
    const timer = setTimeout(() => {
      sb(`dictionary?direction=eq.${direction}&or=(term.ilike.*${encodeURIComponent(q)}*,translation.ilike.*${encodeURIComponent(q)}*)&select=term,translation&limit=60`)
        .then((rows) => { if (alive) setResults(rows); })
        .catch(() => { if (alive) setResults([]); });
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [query, direction]);

  return (
    <section style={portalStyles.section}>
      <SectionHeader type="dictionary" desc="İki istiqamətli söz axtarışı" />
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button onClick={() => setDirection("de-az")} style={{ ...portalStyles.pill, ...(direction === "de-az" ? portalStyles.pillActive : {}) }}>Alman → Azərbaycan</button>
        <button onClick={() => setDirection("az-de")} style={{ ...portalStyles.pill, ...(direction === "az-de" ? portalStyles.pillActive : {}) }}>Azərbaycan → Alman</button>
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={direction === "de-az" ? "Söz axtar... (məs. Arbeit)" : "Söz axtar... (məs. iş)"}
        style={portalStyles.input}
      />
      <p style={{ fontSize: 12.5, opacity: 0.55, marginTop: 8 }}>
        Minlərlə söz bu lüğətdə mövcuddur — axtarmaq üçün ən azı 2 hərf yaz
      </p>
      {results.length > 0 && (
        <button onClick={() => exportAnki(results, direction)} style={{ ...portalStyles.pill, marginTop: 10 }}>
          📇 Bu nəticələri Anki üçün endir
        </button>
      )}
      <div style={{ display: "grid", gap: 8, marginTop: 16, maxHeight: 420, overflowY: "auto" }}>
        {results.map((r, i) => (
          <div key={i} style={{ ...portalStyles.dictRow, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={portalStyles.dictTerm}>{r.term}</div>
              <div style={portalStyles.dictTrans}>{r.translation}</div>
            </div>
            <button onClick={() => speakGerman(direction === "de-az" ? r.term : r.translation)} style={portalStyles.speakBtn} title="Tələffüzü dinlə">🔊</button>
          </div>
        ))}
        {query.trim().length >= 2 && results.length === 0 && (
          <p style={{ opacity: 0.6, fontSize: 14 }}>Nəticə tapılmadı.</p>
        )}
      </div>
    </section>
  );
}

export default DictionaryView;
