import React, { useState, useEffect } from "react";
import { sb } from "./supabase";
import AdlerCupHost from "./AdlerCupHost";
import AdlerCupPlayer from "./AdlerCupPlayer";

const T = {
  navy: "#003366", text: "#2A3D3C", textSoft: "rgba(42,61,60,0.68)",
  accent: "#00A896", warm: "#FF8C00", surface: "#FFFFFF",
  border: "rgba(42,61,60,0.14)", gold: "#D4AF37",
};

export default function AdlerCup({ session, profile, isAdmin }) {
  const [role, setRole] = useState(null);      // null | 'host' | 'player'
  const [canHost, setCanHost] = useState(false);

  useEffect(() => {
    if (isAdmin) { setCanHost(true); return; }
    const email = profile?.email || session?.user?.email;
    if (!email) return;
    sb(`teachers?email=eq.${encodeURIComponent(email)}&select=id`)
      .then((rows) => setCanHost(!!(rows && rows.length)))
      .catch(() => setCanHost(false));
  }, [isAdmin, profile, session]);

  const card = {
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: 14, padding: "18px 16px", cursor: "pointer",
    display: "flex", alignItems: "center", gap: 13, textAlign: "left", width: "100%",
  };

  return (
    <section style={{ maxWidth: 620, margin: "0 auto" }}>
      {/* Basliq */}
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 9, padding: "7px 18px",
          borderRadius: 22, background: "rgba(212,175,55,0.14)",
          border: `1px solid ${T.gold}`,
        }}>
          <span style={{ fontSize: 17 }}>&#127942;</span>
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: T.navy }}>
            Adler Cup
          </span>
        </div>
        <p style={{ fontSize: 13.5, color: T.textSoft, margin: "10px 0 0", lineHeight: 1.55 }}>
          Canli yaris — muellim oyun yaradir, telebeler kodla qosulur.
        </p>
      </div>

      {role === null && (
        <div style={{ display: "grid", gap: 10 }}>
          <button onClick={() => setRole("player")} style={card}>
            <span style={{ fontSize: 26 }}>&#127918;</span>
            <span>
              <span style={{ display: "block", fontWeight: 800, fontSize: 15, color: T.navy }}>Oyuna qosul</span>
              <span style={{ display: "block", fontSize: 12.5, color: T.textSoft }}>
                Muellimin verdiyi 6 reqemli kodla
              </span>
            </span>
          </button>

          {canHost && (
            <button onClick={() => setRole("host")} style={{ ...card, borderColor: T.gold }}>
              <span style={{ fontSize: 26 }}>&#127919;</span>
              <span>
                <span style={{ display: "block", fontWeight: 800, fontSize: 15, color: T.navy }}>Oyun yarat</span>
                <span style={{ display: "block", fontSize: 12.5, color: T.textSoft }}>
                  Muellim rejimi — rejim sec, kodu paylas
                </span>
              </span>
            </button>
          )}
        </div>
      )}

      {role === "host" && <AdlerCupHost session={session} profile={profile} onExit={() => setRole(null)} />}
      {role === "player" && <AdlerCupPlayer onExit={() => setRole(null)} />}
    </section>
  );
}
