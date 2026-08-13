import React, { useState, useEffect } from "react";
import { sbAuth } from "./supabase";

const T = {
  navy: "#003366", text: "#2A3D3C", textSoft: "rgba(42,61,60,0.66)",
  accent: "#00A896", warm: "#FF8C00", surface: "#FFFFFF",
  border: "rgba(42,61,60,0.14)", gold: "#D4AF37",
};

const RANKS = [
  { min: 0,    label: "Başlanğıc Qartal", icon: "🥉" },
  { min: 200,  label: "Uçan Qartal",      icon: "🥈" },
  { min: 600,  label: "Qızıl Qartal",     icon: "🥇" },
  { min: 1500, label: "Qartal Ustası",    icon: "💎" },
];

const SOURCE_LABELS = {
  oxu_anlama: { label: "Oxu Anlama", icon: "📖" },
  krossvord: { label: "Krossvord", icon: "🔠" },
  soz_tapmacasi: { label: "Söz Tapmacası", icon: "🐝" },
  flashcards: { label: "Flashcards", icon: "🃏" },
  match: { label: "Match", icon: "🎯" },
  sentence_game: { label: "Cümlə qur", icon: "🌀" },
};

function getRank(xp) {
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) if (xp >= RANKS[i].min) idx = i;
  return { ...RANKS[idx], idx };
}

export default function Nailiyyetlerim({ session }) {
  const [loading, setLoading] = useState(true);
  const [totalXp, setTotalXp] = useState(0);
  const [bySource, setBySource] = useState({});

  useEffect(() => {
    if (!session?.user?.id) { setLoading(false); return; }
    sbAuth(`xp_log?user_id=eq.${session.user.id}&select=source,amount`, session.access_token)
      .then((rows) => {
        let total = 0;
        const grouped = {};
        (rows || []).forEach((r) => {
          total += r.amount;
          grouped[r.source] = (grouped[r.source] || 0) + r.amount;
        });
        setTotalXp(total);
        setBySource(grouped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  const box = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 16px" };

  if (!session?.user?.id) {
    return (
      <section style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ ...box, textAlign: "center" }}>
          <p style={{ fontSize: 14, color: T.textSoft }}>Nailiyyətlərini görmək üçün daxil ol.</p>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", padding: "60px 0" }}>
        <p style={{ color: T.textSoft }}>Yüklənir...</p>
      </section>
    );
  }

  const rank = getRank(totalXp);
  const next = RANKS[rank.idx + 1];
  const prevMin = rank.min;
  const progressPct = next
    ? Math.min(100, Math.round(((totalXp - prevMin) / (next.min - prevMin)) * 100))
    : 100;

  const sources = Object.entries(bySource).sort((a, b) => b[1] - a[1]);

  return (
    <section style={{ maxWidth: 560, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 9, padding: "7px 18px",
          borderRadius: 22, background: "rgba(212,175,55,0.14)", border: `1px solid ${T.gold}`,
        }}>
          <span style={{ fontSize: 17 }}>🏆</span>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: T.navy }}>
            Nailiyyətlərim
          </span>
        </div>
      </div>

      {/* Rütbə kartı */}
      <div style={{ ...box, textAlign: "center", padding: "28px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 44, marginBottom: 6 }}>{rank.icon}</div>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: T.navy, margin: "0 0 4px" }}>
          {rank.label}
        </p>
        <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 18px" }}>
          <b style={{ color: T.accent }}>{totalXp}</b> ümumi xal
        </p>

        {next ? (
          <>
            <div style={{ height: 8, borderRadius: 4, background: "rgba(42,61,60,0.10)", overflow: "hidden", marginBottom: 6 }}>
              <div style={{ height: "100%", width: `${progressPct}%`, background: T.accent, transition: "width .4s" }} />
            </div>
            <p style={{ fontSize: 12, color: T.textSoft, margin: 0 }}>
              {next.label}-a çatmaq üçün <b style={{ color: T.warm }}>{next.min - totalXp} xal</b> qalıb
            </p>
          </>
        ) : (
          <p style={{ fontSize: 12.5, color: T.gold, fontWeight: 700, margin: 0 }}>
            🎉 Ən yüksək dərəcədəsən!
          </p>
        )}
      </div>

      {/* Bölmə üzrə bölgü */}
      <div style={box}>
        <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: T.textSoft, margin: "0 0 14px", textTransform: "uppercase" }}>
          Bölmə üzrə xal
        </p>
        {sources.length === 0 ? (
          <p style={{ fontSize: 13.5, color: T.textSoft, margin: 0 }}>
            Hələ xal qazanmamısan — Oxu Anlama, Krossvord, Flashcards və ya Söz Tapmacasında məşq et.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {sources.map(([src, amount]) => {
              const meta = SOURCE_LABELS[src] || { label: src, icon: "•" };
              const pct = totalXp > 0 ? Math.round((amount / totalXp) * 100) : 0;
              return (
                <div key={src}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: T.text, fontWeight: 600 }}>{meta.icon} {meta.label}</span>
                    <span style={{ color: T.accent, fontWeight: 700 }}>{amount} xal</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: "rgba(42,61,60,0.08)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: T.warm }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
