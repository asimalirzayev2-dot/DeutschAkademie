import React, { useState } from "react";
import { sbAuthPatch, verifyGumroadLicense } from "./supabase";
import { GUMROAD_PREMIUM_PRODUCT_ID, TALK_TOPICS } from "./constants";

function PremiumPerks({ portalStyles,  session, profile, onStart }) {
  const [topic, setTopic] = useState(null);
  const [sent, setSent] = useState(false);

  function requestSession() {
    if (!topic) return;
    notifyTeacher({
      teacherEmail: "asimalirzayev2@gmail.com",
      teacherName: "Asim",
      studentName: `[Danışıq Sessiyası] ${profile?.name || "Tələbə"}`,
      studentPhone: session?.user?.email || "—",
      studentLevel: topic,
    });
    setSent(true);
  }

  return (
    <>
      <p style={{ ...portalStyles.body, textAlign: "center", color: "#00D9A3", marginBottom: 28 }}>
        ✓ Premium aktivdir — istədiyin qədər test və "Səviyyəni Yoxla" istifadə edə bilərsən.
      </p>

      <div style={portalStyles.premiumPerkBox}>
        <h3 style={portalStyles.premiumPerkTitle}>🗣️ Fərdi Danışıq Sessiyası</h3>
        <p style={{ ...portalStyles.body, fontSize: 13.5, marginBottom: 14 }}>
          Tədrisdən kənar mövzularda əlavə danışıq təcrübəsi — mövzu seç, sorğun akademiyanın rəhbərliyinə göndərilsin, əlaqə saxlanılsın.
        </p>
        {sent ? (
          <p style={{ color: "#00D9A3", fontSize: 13.5 }}>✓ Sorğun göndərildi, tezliklə əlaqə saxlanılacaq!</p>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {TALK_TOPICS.map((t) => (
                <button key={t} onClick={() => setTopic(t)}
                  style={{ ...portalStyles.levelPill, ...(topic === t ? portalStyles.levelPillActive : {}) }}>
                  {t}
                </button>
              ))}
            </div>
            <button onClick={requestSession} style={portalStyles.primaryBtn} disabled={!topic}>Sorğu Göndər</button>
          </>
        )}
      </div>

      <div style={{ ...portalStyles.premiumPerkBox, marginTop: 16 }}>
        <h3 style={portalStyles.premiumPerkTitle}>📘 Bonus Təkrar Testləri</h3>
        <p style={{ ...portalStyles.body, fontSize: 13.5, marginBottom: 14 }}>
          Yalnız Premium üzvlərə xüsusi — 100 sualdan ibarət bank, hər cəhddə 25 fərqli sual (25 dəqiqə).
        </p>
        <button onClick={() => onStart && onStart()} style={{ ...portalStyles.primaryBtn, display: "inline-block" }}>
          Bonus Testinə Başla →
        </button>
        <p style={{ fontSize: 11.5, opacity: 0.55, marginTop: 8 }}>Açılan səhifədə "✦ Premium Bonus Test" kartına bas.</p>
      </div>
    </>
  );
}

function PremiumView({ portalStyles,  session, profile, isAdmin, isPremium, refreshProfile, setAuthModal, onStart }) {
  const [licenseKey, setLicenseKey] = useState("");
  const [status, setStatus] = useState(""); // "", "checking", "ok", "fail"

  async function handleVerify() {
    if (!licenseKey.trim()) return;
    setStatus("checking");
    try {
      const data = await verifyGumroadLicense(licenseKey.trim(), GUMROAD_PREMIUM_PRODUCT_ID);
      if (data.success) {
        await sbAuthPatch(`profiles?id=eq.${session.user.id}`, session.access_token, {
          is_premium: true, gumroad_license_key: licenseKey.trim(),
        });
        await refreshProfile(session);
        setStatus("ok");
      } else {
        setStatus("fail");
      }
    } catch {
      setStatus("fail");
    }
  }

  return (
    <section style={portalStyles.section}>
      <div style={portalStyles.premiumHero}>
        <div style={portalStyles.premiumCrown}>✦</div>
        <h2 style={portalStyles.premiumTitle}>Deutsch Akademie Premium</h2>
        <p style={portalStyles.premiumTagline}>Alman dilini öyrənmək bir yarışdır — Premium səni önə keçirir: sərhədsiz məşq, şəxsi diqqət və əl çatmaz materiallar.</p>
      </div>

      {isAdmin ? (
        <>
          <p style={{ ...portalStyles.body, textAlign: "center", marginBottom: 24 }}>Admin hesabı olaraq bütün funksiyalara limitsiz girişin var. 🎉</p>
          <PremiumPerks portalStyles={portalStyles} session={session} profile={profile} onStart={onStart} />
        </>
      ) : isPremium ? (
        <PremiumPerks portalStyles={portalStyles} session={session} profile={profile} onStart={onStart} />
      ) : (
        <>
          <table style={portalStyles.premiumTable}>
            <thead>
              <tr>
                <th style={portalStyles.premiumTableHeadEmpty}></th>
                <th style={portalStyles.premiumTableHead}>Pulsuz</th>
                <th style={{ ...portalStyles.premiumTableHead, color: "#E8C766" }}>✦ Premium</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Gündəlik test sayı", "3 test / gün", "Limitsiz"],
                ["\"Səviyyəni Yoxla\"", "3 gündə 1 dəfə", "İstədiyin qədər"],
                ["Dərs izahları", "✓", "✓"],
                ["Genişləndirilmiş PDF kitabxanası", "✗", "✓ Bütün mövzular"],
                ["Fərdi Danışıq Sessiyası", "✗", "✓ Mövzu seç, birbaşa əlaqə"],
                ["Bonus təkrar testləri", "✗", "✓ Yalnız Premium-a xüsusi"],
              ].map((row, i) => (
                <tr key={i}>
                  <td style={portalStyles.premiumTableLabel}>{row[0]}</td>
                  <td style={portalStyles.premiumTableVal}>{row[1]}</td>
                  <td style={{ ...portalStyles.premiumTableVal, color: "#E8C766", fontWeight: 700 }}>{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ ...portalStyles.body, textAlign: "center", fontSize: 13, opacity: 0.6, marginTop: 14 }}>
            Aylıq cəmi 4.99 € — bir fincan qəhvədən ucuz, məqsədinə çatmaq üçün sərhədsiz imkan.
          </p>

          <div style={portalStyles.premiumSteps}>
            <h3 style={{ ...portalStyles.h2, fontSize: 18, color: "#E8C766", marginBottom: 16 }}>Necə Premium əldə edim?</h3>
            <div style={portalStyles.stepRow}>
              <div style={{ ...portalStyles.stepNum, opacity: session ? 0.4 : 1 }}>1</div>
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>Qeydiyyatdan keç</p>
                <p style={{ margin: "2px 0 0", fontSize: 13, opacity: 0.65 }}>{session ? "✓ Artıq qeydiyyatdan keçmisən" : "Pulsuzdur, 1 dəqiqə çəkir"}</p>
              </div>
            </div>
            <div style={portalStyles.stepRow}>
              <div style={portalStyles.stepNum}>2</div>
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>Aşağıdakı düymə ilə Gumroad-da abunə ol</p>
                <p style={{ margin: "2px 0 0", fontSize: 13, opacity: 0.65 }}>Kartla ödəniş, aylıq abunəlik</p>
              </div>
            </div>
            <div style={portalStyles.stepRow}>
              <div style={portalStyles.stepNum}>3</div>
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>Email-inə gələn lisenziya kodunu bura yaz</p>
                <p style={{ margin: "2px 0 0", fontSize: 13, opacity: 0.65 }}>Premium dərhal aktivləşir</p>
              </div>
            </div>
          </div>

          {!session ? (
            <div style={{ marginTop: 24, textAlign: "center" }}>
              <button onClick={() => setAuthModal("signup")} style={portalStyles.primaryBtn}>Əvvəlcə Qeydiyyatdan Keç</button>
            </div>
          ) : (
            <div style={{ marginTop: 28, maxWidth: 420, marginLeft: "auto", marginRight: "auto", textAlign: "center" }}>
              <a href="https://asimalirzayev.gumroad.com/l/zbihob" target="_blank" rel="noopener noreferrer" style={portalStyles.premiumCta}>
                ✦ Premium Al
              </a>
              <p style={{ fontSize: 13, opacity: 0.65, margin: "20px 0 8px" }}>Abunə olduqdan sonra email ilə aldığın lisenziya kodunu bura yaz:</p>
              <input placeholder="Lisenziya kodu" value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)} style={portalStyles.input} />
              <button onClick={handleVerify} style={{ ...portalStyles.primaryBtn, marginTop: 10, width: "100%" }} disabled={status === "checking"}>
                {status === "checking" ? "Yoxlanılır..." : "Kodu təsdiqlə"}
              </button>
              {status === "fail" && <p style={{ color: "#C97B6E", fontSize: 13, marginTop: 8 }}>Kod tapılmadı, yenidən yoxla.</p>}
              {status === "ok" && <p style={{ color: "#00D9A3", fontSize: 13, marginTop: 8 }}>✓ Premium aktiv edildi!</p>}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default PremiumView;
