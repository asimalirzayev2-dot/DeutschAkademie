import React, { useState } from "react";

const T = {
  navy: "#1B2430",
  text: "#2A3D3C",
  textSoft: "rgba(42,61,60,0.65)",
  border: "rgba(42,61,60,0.14)",
  accent: "#00A896",
  warm: "#FF8C00",
  card: "#FFFFFF",
};

export default function ReferralInvite({ session, whatsappGroupUrl }) {
  const [copied, setCopied] = useState(false);

  // Domeni əl ilə yazmaq əvəzinə, saytın öz ünvanından götürürük —
  // beləliklə köhnə/səhv domenə yönləndirmə bir daha baş verə bilməz.
  const referralUrl = session?.user?.id
    ? `${window.location.origin}/?ref=${session.user.id}`
    : window.location.origin;

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(referralUrl)}`;

  function copyLink() {
    navigator.clipboard.writeText(referralUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const card = {
    background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
    padding: "20px 18px", marginBottom: 16,
  };
  const heading = {
    fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 700, color: T.navy,
    margin: "0 0 10px", display: "flex", alignItems: "center", gap: 8,
  };

  return (
    <>
      {/* ---------- Dostunu Dəvət Et ---------- */}
      <div style={card}>
        <h3 style={heading}><span>🎁</span> Dostunu Dəvət Et</h3>
        <p style={{ fontSize: 14, color: T.textSoft, lineHeight: 1.55, margin: "0 0 16px" }}>
          Bu linki dostlarına göndər — <b style={{ color: T.text }}>3 nəfər</b> qeydiyyatdan keçəndə{" "}
          <b style={{ color: T.text }}>10 gün</b>, <b style={{ color: T.text }}>5 nəfər</b> qeydiyyatdan keçəndə{" "}
          <b style={{ color: T.text }}>15 gün</b> pulsuz Premium qazanırsan!
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            readOnly
            value={referralUrl}
            onClick={(e) => e.target.select()}
            style={{
              flex: 1, minWidth: 220, padding: "12px 14px", borderRadius: 10,
              border: `1px solid ${T.border}`, fontSize: 13.5, color: T.text, background: "#FAFAF6",
            }}
          />
          <button onClick={copyLink} style={{
            padding: "12px 22px", borderRadius: 10, border: "none", cursor: "pointer",
            background: copied ? T.accent : T.warm, color: "#fff", fontWeight: 700, fontSize: 14,
            transition: "background .2s",
          }}>
            {copied ? "✓ Kopyalandı" : "Kopyala"}
          </button>
        </div>
      </div>

      {/* ---------- Müəllimin WhatsApp Qrupu (varsa) ---------- */}
      {whatsappGroupUrl && (
        <div style={card}>
          <h3 style={heading}><span>💬</span> Müəlliminin WhatsApp Qrupu</h3>
          <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 16px" }}>
            Müəllimin sənin üçün bir WhatsApp qrupu paylaşıb — istəsən qoşula bilərsən.
          </p>
          <a href={whatsappGroupUrl} target="_blank" rel="noopener noreferrer" style={{
            display: "inline-block", padding: "12px 22px", borderRadius: 10,
            background: T.warm, color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none",
          }}>Qrupa Qoşul →</a>
        </div>
      )}

      {/* ---------- Portalı Paylaş (eyni referral linki ilə) ---------- */}
      <div style={{ ...card, textAlign: "center" }}>
        <h3 style={{ ...heading, justifyContent: "center" }}><span>📱</span> Portalı Paylaş</h3>
        <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 18px" }}>
          Bu QR kodu skan edərək dostların sənin dəvət linkinlə birbaşa saytımıza keçid ala bilər.
        </p>
        <img src={qrSrc} alt="Dəvət QR kodu" width={200} height={200}
          style={{ borderRadius: 10, border: `1px solid ${T.border}` }} />
      </div>
    </>
  );
}
