import React, { useState } from "react";
import { signUp, adminLogin, resetPasswordRequest, updatePasswordWithToken, getGoogleLoginUrl } from "./supabase";
import { LOGO_URL } from "./assets";

function AuthModal({ portalStyles,  mode, onClose, onSwitch, saveSession, refreshProfile, recoveryToken }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setConfirmMsg("");

    if (mode === "forgot") {
      setLoading(true);
      try {
        await resetPasswordRequest(email);
        setConfirmMsg("Bərpa linki email-inə göndərildi! Poçt qutunu (və spam qovluğunu) yoxla.");
      } catch (err) {
        setError(err.message || "Sorğu göndərilmədi, yenidən cəhd et.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === "reset") {
      if (password !== password2) { setError("Şifrələr üst-üstə düşmür."); return; }
      if (password.length < 6) { setError("Şifrə ən azı 6 simvol olmalıdır."); return; }
      setLoading(true);
      try {
        await updatePasswordWithToken(recoveryToken, password);
        setConfirmMsg("Şifrən yeniləndi! İndi yeni şifrənlə daxil ola bilərsən.");
        window.location.hash = "";
        setTimeout(() => onSwitch("login"), 1800);
      } catch (err) {
        setError(err.message || "Şifrə yenilənmədi, linki yenidən tələb et.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === "signup" && password !== password2) {
      setError("Şifrələr üst-üstə düşmür.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Adını yaz.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const data = await signUp(email, password, name.trim());
        if (data.access_token) {
          saveSession(data);
          await refreshProfile(data);
          onClose();
        } else {
          setConfirmMsg("Qeydiyyat qəbul olundu! Email ünvanına göndərdiyimiz təsdiq linkinə bas, sonra bu pəncərədən \"Daxil ol\"a keç.");
        }
      } else {
        const data = await adminLogin(email, password);
        if (!data.access_token) {
          setError("Email və ya şifrə yanlışdır, ya da hələ email təsdiqlənməyib.");
          setLoading(false);
          return;
        }
        saveSession(data);
        await refreshProfile(data);
        onClose();
      }
    } catch (err) {
      setError(mode === "signup" ? "Qeydiyyat uğursuz oldu (bəlkə bu email artıq istifadə olunub)." : "Email və ya şifrə yanlışdır, ya da hələ email təsdiqlənməyib.");
    } finally {
      setLoading(false);
    }
  }

  const titles = { signup: "Qeydiyyatdan keç", login: "Daxil ol", forgot: "Şifrəni Bərpa Et", reset: "Yeni Şifrə Təyin Et" };

  return (
    <div style={portalStyles.modalOverlay} onClick={onClose}>
      <div style={portalStyles.modalBox} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={portalStyles.modalClose}>✕</button>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <img src={LOGO_URL} alt="" style={{ width: 52, height: 52, borderRadius: "50%", margin: "0 auto 10px" }} />
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, margin: 0 }}>{titles[mode]}</h2>
          {mode === "forgot" && <p style={{ fontSize: 12.5, opacity: 0.65, marginTop: 8 }}>Email-ini yaz, sənə bərpa linki göndərək.</p>}
        </div>
        {(mode === "login" || mode === "signup") && (
          <>
            <a href={getGoogleLoginUrl()} style={portalStyles.googleBtn}>
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.3 0-9.6-3.4-11.3-8.1l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C40.9 36 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z"/></svg>
              Google ilə davam et
            </a>
            <div style={portalStyles.orDivider}><span>və ya</span></div>
          </>
        )}
        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <input placeholder="Adın" value={name} onChange={(e) => setName(e.target.value)} style={portalStyles.input} />
          )}
          {(mode === "signup" || mode === "login" || mode === "forgot") && (
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={portalStyles.input} required />
          )}
          {(mode === "signup" || mode === "login" || mode === "reset") && (
            <input type="password" placeholder={mode === "reset" ? "Yeni şifrə" : "Şifrə"} value={password} onChange={(e) => setPassword(e.target.value)} style={portalStyles.input} required minLength={6} />
          )}
          {(mode === "signup" || mode === "reset") && (
            <input type="password" placeholder="Şifrəni təkrarla" value={password2} onChange={(e) => setPassword2(e.target.value)} style={portalStyles.input} required />
          )}
          {error && <p style={{ color: "#C97B6E", fontSize: 13, marginBottom: 10 }}>{error}</p>}
          {confirmMsg && <p style={{ color: "#E8C766", fontSize: 13, marginBottom: 10 }}>{confirmMsg}</p>}
          <button type="submit" style={portalStyles.primaryBtn} disabled={loading}>
            {loading ? "..." : mode === "forgot" ? "Bərpa linkini göndər" : mode === "reset" ? "Şifrəni Yenilə" : mode === "signup" ? "Qeydiyyatdan keç" : "Daxil ol"}
          </button>
        </form>
        {mode === "login" && (
          <p style={{ textAlign: "center", fontSize: 12.5, marginTop: 12 }}>
            <button onClick={() => onSwitch("forgot")} style={portalStyles.linkBtn}>Şifrəni unutmusan?</button>
          </p>
        )}
        {(mode === "signup" || mode === "login") && (
          <p style={{ textAlign: "center", fontSize: 13, marginTop: 8, opacity: 0.7 }}>
            {mode === "signup" ? (
              <>Artıq hesabın var? <button onClick={() => onSwitch("login")} style={portalStyles.linkBtn}>Daxil ol</button></>
            ) : (
              <>Hesabın yoxdur? <button onClick={() => onSwitch("signup")} style={portalStyles.linkBtn}>Qeydiyyatdan keç</button></>
            )}
          </p>
        )}
        {mode === "forgot" && (
          <p style={{ textAlign: "center", fontSize: 13, marginTop: 12, opacity: 0.7 }}>
            <button onClick={() => onSwitch("login")} style={portalStyles.linkBtn}>← Daxil ol səhifəsinə qayıt</button>
          </p>
        )}
      </div>
    </div>
  );
}

const GUMROAD_PREMIUM_PRODUCT_ID = "fz5uY92otxwP0OwN0g04bQ==";

const TALK_TOPICS = [
  "Gündəlik həyat", "Səyahət və turizm", "İş və karyera", "Ailə və dostlar",
  "Hobbilər və maraqlar", "Almaniyada yaşam", "Sərbəst mövzu",
];

export default AuthModal;
