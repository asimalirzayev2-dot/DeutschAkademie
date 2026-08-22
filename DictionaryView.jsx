import React, { useState, useEffect, useRef } from "react";
import { sb } from "./supabase";
import { speakGerman, exportAnki } from "./utils";
import { useLanguage } from "./i18n/LanguageContext";

const GUEST_SEARCH_KEY = "da_guest_dict_searches";

function readGuestSearchCount() {
  try {
    const saved = JSON.parse(localStorage.getItem(GUEST_SEARCH_KEY) || "null");
    const today = new Date().toISOString().slice(0, 10);
    if (!saved || saved.date !== today) return 0;
    return saved.count || 0;
  } catch { return 0; }
}
function bumpGuestSearchCount() {
  const today = new Date().toISOString().slice(0, 10);
  const next = readGuestSearchCount() + 1;
  try { localStorage.setItem(GUEST_SEARCH_KEY, JSON.stringify({ date: today, count: next })); } catch {}
  return next;
}

function DictionaryView({ portalStyles, SectionHeader, guestMode, guestDailyLimit = 10 }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState("de-az"); // de-az | az-de
  const [results, setResults] = useState([]);
  const [guestSearchesUsed, setGuestSearchesUsed] = useState(() => (guestMode ? readGuestSearchCount() : 0));
  const guestLimitReached = guestMode && guestSearchesUsed >= guestDailyLimit;

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    if (guestLimitReached) { setResults([]); return; }
    let alive = true;
    const timer = setTimeout(() => {
      sb(`dictionary?direction=eq.${direction}&or=(term.ilike.*${encodeURIComponent(q)}*,translation.ilike.*${encodeURIComponent(q)}*)&select=term,translation&limit=60`)
        .then((rows) => {
          if (!alive) return;
          setResults(rows);
          if (guestMode) setGuestSearchesUsed(bumpGuestSearchCount());
        })
        .catch(() => { if (alive) setResults([]); });
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, direction]);

  return (
    <section style={portalStyles.section}>
      <SectionHeader type="dictionary" desc={t("dict_desc")} />
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button onClick={() => setDirection("de-az")} style={{ ...portalStyles.pill, ...(direction === "de-az" ? portalStyles.pillActive : {}) }}>{t("de_to_az")}</button>
        <button onClick={() => setDirection("az-de")} style={{ ...portalStyles.pill, ...(direction === "az-de" ? portalStyles.pillActive : {}) }}>{t("az_to_de")}</button>
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={direction === "de-az" ? t("search_placeholder_de") : t("search_placeholder_az")}
        style={portalStyles.input}
        disabled={guestLimitReached}
      />
      {guestMode && !guestLimitReached && (
        <p style={{ fontSize: 12.5, opacity: 0.55, marginTop: 8 }}>
          {t("guest_searches_left_prefix")} {guestDailyLimit - guestSearchesUsed} {t("guest_searches_left_suffix")}
        </p>
      )}
      {!guestMode && (
        <p style={{ fontSize: 12.5, opacity: 0.55, marginTop: 8 }}>
          {t("dict_hint_normal")}
        </p>
      )}
      {guestLimitReached && (
        <div style={{
          background: "rgba(255,140,0,0.08)", border: "1px solid rgba(255,140,0,0.25)",
          borderRadius: 10, padding: "14px 16px", marginTop: 10, textAlign: "center",
        }}>
          <div style={{ fontSize: 26, marginBottom: 6 }}>🔒</div>
          <p style={{ fontSize: 13.5, margin: 0, opacity: 0.85 }}>
            {t("guest_limit_prefix")} {guestDailyLimit} {t("guest_limit_suffix")}
          </p>
        </div>
      )}
      {results.length > 0 && (
        <button onClick={() => exportAnki(results, direction)} style={{ ...portalStyles.pill, marginTop: 10 }}>
          📇 {t("export_anki_btn")}
        </button>
      )}
      <div style={{ display: "grid", gap: 8, marginTop: 16, maxHeight: 420, overflowY: "auto" }}>
        {results.map((r, i) => (
          <div key={i} style={{ ...portalStyles.dictRow, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={portalStyles.dictTerm}>{r.term}</div>
              <div style={portalStyles.dictTrans}>{r.translation}</div>
            </div>
            <button onClick={() => speakGerman(direction === "de-az" ? r.term : r.translation)} style={portalStyles.speakBtn} title={t("listen_pronunciation")}>🔊</button>
          </div>
        ))}
        {query.trim().length >= 2 && results.length === 0 && !guestLimitReached && (
          <p style={{ opacity: 0.6, fontSize: 14 }}>{t("no_results")}</p>
        )}
      </div>
    </section>
  );
}

export default DictionaryView;
