import React, { useState, useEffect } from "react";
import { sb, sbAuth, sbAuthPatch } from "./supabase";
import Avatar, { avatarOptionsFor } from "./Avatar";

function ProfileChart({ points }) {
  if (!points || points.length < 2) return null;
  const W = 320, H = 100, pad = 10;
  const maxY = 100, minY = 0;
  const stepX = (W - pad * 2) / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = H - pad - ((p - minY) / (maxY - minY)) * (H - pad * 2);
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ marginTop: 10 }}>
      <polyline points={coords.join(" ")} fill="none" stroke="#00A896" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, i) => {
        const [x, y] = c.split(",");
        return <circle key={i} cx={x} cy={y} r="3.5" fill="#00A896" />;
      })}
    </svg>
  );
}

function ProfileView({ portalStyles, SectionHeader, AuthRequired,  session, profile, isAdmin, isPremium }) {
  const [results, setResults] = useState(null);
  const [streak, setStreak] = useState(0);
  const [teacherWhatsapp, setTeacherWhatsapp] = useState(null);
  const [bird, setBird] = useState(profile?.avatar_bird || null);
  const [savingBird, setSavingBird] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!session) return;
    sbAuth(`test_results?user_id=eq.${session.user.id}&mode=eq.level&select=score,created_at&order=created_at.asc&limit=30`, session.access_token)
      .then(setResults).catch(() => setResults([]));
    try {
      const v = JSON.parse(localStorage.getItem("visitStreak") || "null");
      if (v?.count) setStreak(v.count);
    } catch {}
    if (profile?.assigned_teacher_email) {
      sb(`teachers?email=eq.${encodeURIComponent(profile.assigned_teacher_email)}&select=whatsapp_group_link&limit=1`)
        .then((rows) => setTeacherWhatsapp(rows[0]?.whatsapp_group_link || null))
        .catch(() => setTeacherWhatsapp(null));
    }
  }, [session, profile]);

  const scores = (results || []).map((r) => r.score).filter((s) => s != null);
  const testCount = results ? results.length : 0;
  const bestScore = scores.length ? Math.max(...scores) : 0;

  const badges = [
    { id: "first", label: "İlk Addım", icon: "🎯", earned: testCount >= 1, desc: "İlk testini tamamladın" },
    { id: "streak7", label: "7 Gün Ardıcıl", icon: "🔥", earned: streak >= 7, desc: "7 gün ardıcıl sayta girdin" },
    { id: "five", label: "5 Test", icon: "📝", earned: testCount >= 5, desc: "5 test tamamladın" },
    { id: "high", label: "Yüksək Bal", icon: "⭐", earned: bestScore >= 80, desc: "Bir testdə 80%+ topladın" },
    { id: "perfect", label: "Mükəmməl", icon: "🏆", earned: bestScore >= 95, desc: "Bir testdə 95%+ topladın" },
  ];

  const referralLink = session ? `${window.location.origin}/?ref=${session.user.id}` : "";
  const [copied, setCopied] = useState(false);
  function copyReferral() {
    navigator.clipboard?.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!session) return <AuthRequired setAuthModal={() => {}} />;

  async function chooseBird(key) {
    if (savingBird) return;
    setSavingBird(true);
    const prev = bird;
    setBird(key);
    try {
      await sbAuthPatch(`profiles?id=eq.${session.user.id}`, session.access_token, { avatar_bird: key });
    } catch {
      setBird(prev);
    }
    setSavingBird(false);
    setPickerOpen(false);
  }

  return (
    <section style={portalStyles.section}>
      {/* --- Basliq: avatar + ad --- */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
        <button onClick={() => setPickerOpen((v) => !v)}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", position: "relative", lineHeight: 0 }}
          title="Avatarı dəyiş">
          <Avatar avatarKey={bird} size={68}
            fallbackLetter={(profile?.name || "?").trim().charAt(0).toUpperCase()}
            ring={isPremium || isAdmin} />
          <span style={{
            position: "absolute", right: -2, bottom: -2, width: 22, height: 22, borderRadius: "50%",
            background: "#00A896", color: "#fff", fontSize: 12, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #F5F5DC",
          }}>✎</span>
        </button>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ ...portalStyles.h2, margin: 0, fontSize: 24 }}>
            {profile?.name || "Hesab"}
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "rgba(42,61,60,0.62)" }}>
            {isAdmin ? "Admin" : isPremium ? "Premium üzv ✦" : "Tələbə"}
            {streak > 0 && <> · {streak} gün ardıcıl</>}
          </p>
        </div>
      </div>

      {/* --- Avatar secimi (acilir) --- */}
      {pickerOpen && (
        <div style={{ ...portalStyles.premiumPerkBox, marginBottom: 16 }}>
          <p style={{ fontSize: 12.5, color: "rgba(42,61,60,0.62)", margin: "0 0 12px" }}>
            Avatarını seç — bütün saytda görünəcək.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 9 }}>
            {avatarOptionsFor(isAdmin).map((b) => (
              <button key={b.key} onClick={() => chooseBird(b.key)} disabled={savingBird}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                  padding: "9px 4px", borderRadius: 12, cursor: "pointer",
                  background: bird === b.key ? "rgba(0,168,150,0.10)" : "transparent",
                  border: `1px solid ${bird === b.key ? "#00A896" : "rgba(42,61,60,0.12)"}`,
                }}>
                <Avatar avatarKey={b.key} size={40} />
                <span style={{ fontSize: 9.5, fontWeight: 700, color: "#2A3D3C", textAlign: "center", lineHeight: 1.2 }}>
                  {b.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ height: 10 }} />

      <div style={portalStyles.premiumPerkBox}>
        <h3 style={portalStyles.premiumPerkTitle}>📈 İrəliləyiş Qrafiki</h3>
        {scores.length >= 2 ? (
          <>
            <ProfileChart points={scores} />
            <p style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>Son {scores.length} imtahan nəticən (%)</p>
          </>
        ) : (
          <p style={{ ...portalStyles.body, fontSize: 13.5 }}>Qrafik üçün ən azı 2 imtahan lazımdır — davam et!</p>
        )}
      </div>

      <div style={{ ...portalStyles.premiumPerkBox, marginTop: 16 }}>
        <h3 style={portalStyles.premiumPerkTitle}>🏅 Nailiyyətlər</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
          {badges.map((b) => (
            <div key={b.id} style={{ ...portalStyles.badgeCard, opacity: b.earned ? 1 : 0.3 }} title={b.desc}>
              <div style={{ fontSize: 22 }}>{b.icon}</div>
              <div style={portalStyles.badgeLabel}>{b.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...portalStyles.premiumPerkBox, marginTop: 16 }}>
        <h3 style={portalStyles.premiumPerkTitle}>🎁 Dostunu Dəvət Et</h3>
        <p style={{ ...portalStyles.body, fontSize: 13.5, marginBottom: 12 }}>
          Bu linki dostlarına göndər — <b>3 nəfər</b> qeydiyyatdan keçəndə <b>10 gün</b>, <b>5 nəfər</b> qeydiyyatdan keçəndə <b>15 gün pulsuz Premium</b> qazanırsan!
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <input readOnly value={referralLink} style={{ ...portalStyles.input, marginBottom: 0, fontSize: 12 }} />
          <button onClick={copyReferral} style={{ ...portalStyles.primaryBtn, flexShrink: 0 }}>{copied ? "✓" : "Kopyala"}</button>
        </div>
        {isPremium && profile?.premium_until && (
          <p style={{ fontSize: 12, opacity: 0.6, marginTop: 10 }}>
            Dəvətlə qazanılan Premium bitmə tarixi: {new Date(profile.premium_until).toLocaleDateString("az-AZ")}
          </p>
        )}
      </div>

      {teacherWhatsapp && (
        <div style={{ ...portalStyles.premiumPerkBox, marginTop: 16 }}>
          <h3 style={portalStyles.premiumPerkTitle}>💬 Müəlliminin WhatsApp Qrupu</h3>
          <p style={{ ...portalStyles.body, fontSize: 13.5, marginBottom: 12 }}>
            Müəllimin sənin üçün bir WhatsApp qrupu paylaşıb — istəsən qoşula bilərsən.
          </p>
          <a href={teacherWhatsapp} target="_blank" rel="noopener noreferrer" style={{ ...portalStyles.primaryBtn, display: "inline-block", textDecoration: "none" }}>
            Qrupa Qoşul →
          </a>
        </div>
      )}

      <div style={{ ...portalStyles.premiumPerkBox, marginTop: 16, textAlign: "center" }}>
        <h3 style={portalStyles.premiumPerkTitle}>📱 Portalı Paylaş</h3>
        <p style={{ ...portalStyles.body, fontSize: 13.5, marginBottom: 12 }}>
          Bu QR kodu skan edərək dostların birbaşa saytımıza keçid ala bilər.
        </p>
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent("https://deutschakademie.online")}`}
          alt="QR kod"
          style={{ width: 160, height: 160, borderRadius: 8, background: "#fff", padding: 8 }}
        />
      </div>
    </section>
  );
}

export default ProfileView;
