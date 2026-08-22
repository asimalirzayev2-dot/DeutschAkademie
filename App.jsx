import React, { useState, useEffect, useRef, useMemo } from "react";
import { Clock, ChevronRight, ChevronLeft, RotateCcw, Home, BookOpen, Crown, Bird, Headphones, Library, GraduationCap, Layers, Puzzle, Grid3x3, Trophy, Mail } from "lucide-react";
import emailjs from "@emailjs/browser";
import { sb, sbInsert, adminLogin, sbAuth, sbAuthPatch, sbAuthInsert, signUp, verifyGumroadLicense, pdfUrl, resetPasswordRequest, updatePasswordWithToken, fetchOAuthUser, getGoogleLoginUrl, refreshSession } from "./supabase";
import AdminPanel from "./AdminPanel";
import DictionaryView from "./DictionaryView";
import { speakGerman, exportAnki, shuffle, shuffleOptions, notifyTeacher } from "./utils";
import { useReveal } from "./hooks";
import { LOGO_URL, BOOK_COVERS } from "./assets";
import { LEVELS, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY } from "./constants";
import AuthModal from "./AuthModal";
import PremiumView from "./PremiumView";
import ProfileView from "./ProfileView";
import LessonPathView from "./LessonPathView";
import CoursesView from "./CoursesView";
import BilirdinizMi from "./BilirdinizMi";
import SozTapmacasi from "./SozTapmacasi";
import Krossvord from "./Krossvord";
import Nailiyyetlerim from "./Nailiyyetlerim";
import Hoerverstehen from "./Hoerverstehen";
import OxuAnlama from "./OxuAnlama";
import Flashcards from "./Flashcards";
import AdlerCup from "./AdlerCup";
import Avatar from "./Avatar";
import { LanguageProvider, useLanguage } from "./i18n/LanguageContext";
import LanguageSwitcher from "./i18n/LanguageSwitcher";





const OPEN_QUESTIONS = [
  { id: "o-a1", level: "A1", topic: "Vorstellung", q: "Stell dich in 1-2 Sätzen auf Deutsch vor (Name, Herkunft).", keywords: ["ich heiße", "ich komme", "ich bin"] },
  { id: "o-a2", level: "A2", topic: "Perfekt", q: "Schreibe einen Satz im Perfekt über dein Wochenende.", keywords: ["habe", "bin", "gemacht", "gegangen", "gespielt", "gefahren"] },
  { id: "o-b1", level: "B1", topic: "Nebensatz", q: "Bilde einen Satz mit 'weil' oder 'obwohl'.", keywords: ["weil", "obwohl"] },
  { id: "o-b2", level: "B2", topic: "Konjunktiv II", q: "Was würdest du tun, wenn du reich wärst? (ein Satz)", keywords: ["würde", "wäre"] },
];


const FAQ_ITEMS = [
  { q: "Necə qeydiyyatdan keçim?", a: "Yuxarı sağ küncdəki \"Daxil ol\" düyməsinə bas → açılan pəncərədə \"Qeydiyyatdan keç\"ə keç. Adını, email-ini və şifrəni yaz, \"Qeydiyyatdan keç\" düyməsinə bas. Email ünvanına bir təsdiq linki gələcək — ora bax (spam qovluğunu da yoxla), linkə bas. Sonra eyni email+şifrə ilə \"Daxil ol\" edə bilərsən." },
  { q: "Test limitlərim nədir?", a: "Qeydiyyatsız (qonaq): cəmi 1 dəfə, 20 suallıq bir test. Qeydiyyatlı (pulsuz hesab): gündə 3 test və 3 gündə 1 dəfə \"Səviyyəni Yoxla\". Premium: hər ikisi limitsizdir." },
  { q: "Premium nə verir?", a: "Limitsiz test və limitsiz \"Səviyyəni Yoxla\", dərs izahlarının genişləndirilmiş PDF-ini endirmək imkanı, tədrisdən kənar mövzularda fərdi Danışıq Sessiyası təşkil etmək və yalnız Premium üzvlərə xüsusi bonus təkrar testləri. Ətraflı və qiymət üçün yuxarı naviqasiyada \"Premium\" bölməsinə bax." },
  { q: "PDF-ləri necə əldə edirəm?", a: "Dərslər bölməsində istədiyin səviyyəni seç, bir mövzunu aç — mövzunun altında \"PDF olaraq endir\" düyməsi görünəcək. Bu, yalnız Premium üzvlər üçün açıqdır; Premium deyilsənsə, düymə səni Premium səhifəsinə yönləndirəcək." },
  { q: "Şifrəmi unutmuşam, nə edim?", a: "\"Daxil ol\" pəncərəsini aç, aşağıda \"Şifrəni unutmusan?\" yazısına bas. Email-ini yaz, \"Bərpa linkini göndər\"ə bas. Email-inə gələn linkə basdıqda birbaşa yeni şifrə təyin etmək üçün pəncərə açılacaq." },
  { q: "Müəllimlə necə əlaqə saxlayıram?", a: "Kurslar bölməsində istədiyin müəllimin kartına bas — profili açılacaq, orada email, telefon (WhatsApp) və Instagram keçidləri var, birbaşa yaza bilərsən." },
  { q: "Kurs qeydiyyatı necə işləyir?", a: "Kurslar bölməsində əvvəlcə bir müəllim seç (kartına bas, \"Bu müəllimlə qeydiyyatdan keç\" düyməsinə bas), sonra aşağıdakı formada adını, telefonunu və səviyyəni yaz, \"Qeydiyyatdan keç\" bas. Seçdiyin müəllimə avtomatik email bildirişi gedir." },
  { q: "Lüğətdən necə istifadə edirəm?", a: "Lüğət bölməsində yuxarıdakı axtarış qutusuna alman və ya Azərbaycan sözünü yaz — nəticələr yazdıqca avtomatik görünür, hər iki istiqamətdə (alman→azərbaycan və əksi) axtarış edə bilərsən." },
];



const PASS_THRESHOLD = 60; // % — TELC-tərzi keçid həddi

/* ---------- helpers ---------- */


const LEVEL_ACCENT = {
  A1: { accent: "#FF8C00", soft: "rgba(255,140,0,0.14)", tier: 1 },
  A2: { accent: "#F4B84D", soft: "rgba(244,184,77,0.16)", tier: 2 },
  B1: { accent: "#B36B00", soft: "rgba(179,107,0,0.14)", tier: 3 },
  B2: { accent: "#8A4B00", soft: "rgba(138,75,0,0.14)", tier: 4 },
};
function accentFor(level) {
  return LEVEL_ACCENT[level] || LEVEL_ACCENT.A1;
}
function accentForTier(tier) {
  const order = ["A1", "A2", "B1", "B2"];
  return LEVEL_ACCENT[order[Math.min(3, Math.max(0, tier - 1))]].accent;
}
function scoreTier(pct) {
  if (pct >= 90) return 4;
  if (pct >= 75) return 3;
  if (pct >= 60) return 2;
  return 1;
}
function gradeFor(pct) {
  if (pct >= 90) return { de: "Sehr gut", color: "#6FA787" };
  if (pct >= 75) return { de: "Gut", color: "#8FBF9F" };
  if (pct >= 60) return { de: "Befriedigend", color: "#003366" };
  if (pct >= 50) return { de: "Ausreichend", color: "#D9A75A" };
  return { de: "Nicht bestanden", color: "#C0392B" };
}
function fmtTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

/* ========================================================================= */

function InnerApp() {
  const [screen, setScreen] = useState("portal"); // portal | home | setup | test | result
  const [name, setName] = useState("");
  const [mode, setMode] = useState(null); // 'level' | 'check'
  const [selectedLevel, setSelectedLevel] = useState("A1");
  const [numQuestions, setNumQuestions] = useState(20);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [openAnswers, setOpenAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [finished, setFinished] = useState(false);
  const [revealPhase, setRevealPhase] = useState("spin"); // spin | revealed
  const timerRef = useRef(null);
  const resultRef = useRef(null);

  // ---- Auth ----
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem("session") || "null"); } catch { return null; }
  });
  const [profile, setProfile] = useState(null);
  const [authModal, setAuthModal] = useState(null); // null | 'login' | 'signup' | 'forgot' | 'reset'
  const [recoveryToken, setRecoveryToken] = useState(null);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem("visitLogged")) {
        sessionStorage.setItem("visitLogged", "1");
        sbInsert("page_visits", {}).catch(() => {});
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) localStorage.setItem("pendingRef", ref);
    } catch {}
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      const params = new URLSearchParams(hash.replace("#", ""));
      const token = params.get("access_token");
      if (token) {
        setRecoveryToken(token);
        setAuthModal("reset");
        // Clear the hash so a stale recovery link doesn't force reset mode on every load
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    } else if (hash.includes("access_token")) {
      // Google (or other OAuth) login callback
      const params = new URLSearchParams(hash.replace("#", ""));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (access_token) {
        fetchOAuthUser(access_token).then((user) => {
          if (user) {
            const sess = { access_token, refresh_token, user };
            saveSession(sess);
            refreshProfile(sess);
          }
          window.location.hash = "";
        });
      }
    }
  }, []);

  async function refreshProfile(sess, _retried) {
    if (!sess) { setProfile(null); return; }
    try {
      const rows = await sbAuth(`profiles?id=eq.${sess.user.id}&select=*`, sess.access_token);
      if (rows[0]) {
        setProfile(rows[0]);
        if (rows[0].name) setName(rows[0].name);
      } else {
        // First login after email confirmation — profile wasn't created yet at signup time.
        const metaName = sess.user.user_metadata?.name || "";
        let referredBy = null;
        try { referredBy = localStorage.getItem("pendingRef") || null; } catch {}
        try {
          await sbAuthInsert("profiles", sess.access_token, { id: sess.user.id, email: sess.user.email, name: metaName, referred_by: referredBy });
          try { localStorage.removeItem("pendingRef"); } catch {}
        } catch {}
        const rows2 = await sbAuth(`profiles?id=eq.${sess.user.id}&select=*`, sess.access_token);
        setProfile(rows2[0] || null);
        if (rows2[0]?.name) setName(rows2[0].name);
      }
    } catch {
      // Stored access token has most likely expired — try to renew it once
      // using the refresh token, so the user stays logged in across visits.
      if (!_retried && sess.refresh_token) {
        try {
          const fresh = await refreshSession(sess.refresh_token);
          if (fresh?.access_token) {
            const merged = { ...sess, ...fresh };
            setSession(merged);
            try { localStorage.setItem("session", JSON.stringify(merged)); } catch {}
            return refreshProfile(merged, true);
          }
        } catch {}
        // refresh token itself is invalid/expired -> genuine logout
        setSession(null);
        try { localStorage.removeItem("session"); } catch {}
      }
      setProfile(null);
    }
  }

  useEffect(() => {
    refreshProfile(session);
  }, [session]);

  function saveSession(sess) {
    setSession(sess);
    try { localStorage.setItem("session", JSON.stringify(sess)); } catch {}
  }
  function logout() {
    setSession(null);
    setProfile(null);
    try { localStorage.removeItem("session"); } catch {}
  }

  const isAdmin = !!profile?.is_admin;
  const isPremium = isAdmin || (!!profile?.is_premium && (!profile?.premium_until || new Date(profile.premium_until) > new Date()));

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function canStartLevelTest() {
    if (isPremium) return { ok: true };
    if (!session) {
      const used = localStorage.getItem("guestTestDone");
      return used ? { ok: false, reason: "guest_used" } : { ok: true, guestLimited: true };
    }
    if (!profile) return { ok: false, reason: "loading" };
    const usedToday = profile.tests_date === todayStr() ? (profile.tests_count || 0) : 0;
    return usedToday < 3 ? { ok: true } : { ok: false, reason: "daily_limit" };
  }

  function canStartLevelCheck() {
    if (isPremium) return { ok: true };
    if (!session) return { ok: false, reason: "guest_blocked" };
    if (!profile) return { ok: false, reason: "loading" };
    if (!profile.level_check_date) return { ok: true };
    const last = new Date(profile.level_check_date);
    const diffDays = (Date.now() - last.getTime()) / 86400000;
    return diffDays >= 3 ? { ok: true } : { ok: false, reason: "check_cooldown", daysLeft: Math.ceil(3 - diffDays) };
  }

  async function recordTestUsage() {
    if (isPremium) return;
    if (!session) {
      try { localStorage.setItem("guestTestDone", "1"); } catch {}
      return;
    }
    const today = todayStr();
    const newCount = profile?.tests_date === today ? (profile.tests_count || 0) + 1 : 1;
    try {
      await sbAuthPatch(`profiles?id=eq.${session.user.id}`, session.access_token, {
        tests_date: today, tests_count: newCount,
      });
      setProfile((p) => (p ? { ...p, tests_date: today, tests_count: newCount } : p));
    } catch {}
  }

  async function recordLevelCheckUsage() {
    if (isPremium || !session) return;
    const today = todayStr();
    try {
      await sbAuthPatch(`profiles?id=eq.${session.user.id}`, session.access_token, { level_check_date: today });
      setProfile((p) => (p ? { ...p, level_check_date: today } : p));
    } catch {}
  }

  useEffect(() => {
    if (screen === "test" && timeLeft > 0 && !finished) {
      timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft <= 0 && screen === "test" && !finished) {
      handleFinish();
    }
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, screen, finished]);

  useEffect(() => {
    if (finished) {
      setRevealPhase("spin");
      const t = setTimeout(() => {
        setRevealPhase("revealed");
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 400);
      }, 1700);
      return () => clearTimeout(t);
    }
  }, [finished]);

  async function getUsedIds(key) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : [];
    } catch {
      return [];
    }
  }
  async function saveUsedIds(key, ids) {
    try {
      localStorage.setItem(key, JSON.stringify(ids.slice(-500)));
    } catch {}
  }

  async function buildLevelTest(level, count) {
    const key = `used:${name || "guest"}:${level}`;
    const used = await getUsedIds(key);
    const rows = await sb(`questions?level=eq.${level}&select=id,level,topic,question,option_a,option_b,option_c,correct&limit=4000`);
    const pool = rows.map((r) => ({
      id: r.id, level: r.level, topic: r.topic, q: r.question,
      options: [r.option_a, r.option_b, r.option_c].filter((o) => o !== null && o !== ""),
      correct: r.correct,
    }));
    const unseen = pool.filter((q) => !used.includes(q.id));
    const ordered = [...unseen, ...pool.filter((q) => used.includes(q.id))];
    const picked = shuffle(ordered).slice(0, Math.min(count, pool.length)).map((q) => ({ ...shuffleOptions(q), level }));
    await saveUsedIds(key, [...used, ...picked.map((q) => q.id)]);
    return picked;
  }

  async function buildCheckTest() {
    const perLevel = Math.floor(45 / LEVELS.length / 1); // ~11 mc per level within 45 total incl. open
    const mcPerLevel = 10; // 4 x 10 = 40 mc
    let all = [];
    for (const lvl of LEVELS) {
      const test = await buildLevelTest(lvl, mcPerLevel);
      all = [...all, ...test];
      const openQ = OPEN_QUESTIONS.find((o) => o.level === lvl);
      if (openQ) all.push({ ...openQ, isOpen: true, level: lvl });
    }
    return all; // 40 mc + 4 open = 44, close enough to 45 with this sample pool
  }

  const [limitMsg, setLimitMsg] = useState("");
  const [placementTeacher, setPlacementTeacher] = useState(null); // { email, name } | null

  function startPlacementTest(teacherEmail, teacherName) {
    setPlacementTeacher({ email: teacherEmail, name: teacherName });
    setMode("check");
    setScreen("setup");
  }

  async function buildBonusTest() {
    const rows = await sb(`bonus_questions?level=eq.A1&select=id,category,passage,question,option_a,option_b,option_c,correct&limit=200`);
    const letterToIdx = { A: 0, B: 1, C: 2 };
    const pool = rows.map((r) => ({
      id: r.id, level: "A1", topic: r.category, passage: r.passage || null, q: r.question,
      options: [r.option_a, r.option_b, r.option_c],
      correct: letterToIdx[r.correct] ?? 0,
    }));
    const picked = shuffle(pool).slice(0, 25);
    return picked.map((q) => shuffleOptions(q));
  }

  async function startTest() {
    if (mode === "bonus") {
      if (!isPremium) { setScreen("portal"); return; }
      setLimitMsg("");
      setAnswers({});
      setOpenAnswers({});
      setCurrent(0);
      setTimeLeft(25 * 60);
      setFinished(false);
      const qs = await buildBonusTest();
      setQuestions(qs);
      setScreen("test");
      return;
    }
    const gate = mode === "level" ? canStartLevelTest() : canStartLevelCheck();
    if (!gate.ok) {
      if (gate.reason === "guest_used") setLimitMsg("Qonaq kimi yalnız 1 pulsuz test həll edə bilərsən. Davam etmək üçün qeydiyyatdan keç.");
      else if (gate.reason === "guest_blocked") setLimitMsg("\"Səviyyəni Yoxla\" üçün qeydiyyat lazımdır.");
      else if (gate.reason === "daily_limit") setLimitMsg("Bugünkü 3 pulsuz test limitini istifadə etmisən. Sabah təzələnəcək, ya da Premium al.");
      else if (gate.reason === "check_cooldown") setLimitMsg(`"Səviyyəni Yoxla" 3 gündə 1 dəfə mövcuddur. ${gate.daysLeft} gün sonra yenidən sına, ya da Premium al.`);
      else setLimitMsg("Bir az gözlə, yoxlanılır...");
      setAuthModal(!session ? "signup" : null);
      return;
    }
    setLimitMsg("");
    setAnswers({});
    setOpenAnswers({});
    setCurrent(0);
    setTimeLeft(45 * 60);
    setFinished(false);
    if (mode === "level" && gate.guestLimited) setNumQuestions(20);
    const qs = mode === "level" ? await buildLevelTest(selectedLevel, mode === "level" && gate.guestLimited ? 20 : numQuestions) : await buildCheckTest();
    setQuestions(qs);
    setScreen("test");
  }

  function handleFinish() {
    clearTimeout(timerRef.current);
    setFinished(true);
    if (mode === "level") recordTestUsage();
    else if (mode === "check") recordLevelCheckUsage();
  }

  const results = useMemo(() => {
    if (!finished) return null;
    const byLevel = {};
    for (const lvl of LEVELS) byLevel[lvl] = { correct: 0, wrong: 0, total: 0, wrongTopics: {} };
    const reviewList = [];

    questions.forEach((q, i) => {
      const lvl = q.level;
      if (!byLevel[lvl]) byLevel[lvl] = { correct: 0, wrong: 0, total: 0, wrongTopics: {} };
      byLevel[lvl].total += 1;
      if (q.isOpen) {
        const ans = (openAnswers[q.id] || "").toLowerCase();
        const ok = q.keywords.some((k) => ans.includes(k.toLowerCase()));
        if (ok) byLevel[lvl].correct += 1;
        else {
          byLevel[lvl].wrong += 1;
          byLevel[lvl].wrongTopics[q.topic] = (byLevel[lvl].wrongTopics[q.topic] || 0) + 1;
        }
        reviewList.push({ i, q: q.q, isOpen: true, userAnswer: openAnswers[q.id] || "(boş)", correctAnswer: "—", ok });
      } else {
        const userIdx = answers[q.id];
        const ok = userIdx === q.correct;
        if (ok) byLevel[lvl].correct += 1;
        else {
          byLevel[lvl].wrong += 1;
          byLevel[lvl].wrongTopics[q.topic] = (byLevel[lvl].wrongTopics[q.topic] || 0) + 1;
        }
        reviewList.push({
          i, q: q.q, isOpen: false,
          userAnswer: userIdx !== undefined ? q.options[userIdx] : "(cavabsız)",
          correctAnswer: q.options[q.correct], ok,
        });
      }
    });

    const levelStats = {};
    for (const lvl of LEVELS) {
      const s = byLevel[lvl];
      if (s.total === 0) continue;
      const corrected = Math.max(0, ((s.correct - s.wrong / 3) / s.total) * 100);
      levelStats[lvl] = { ...s, pct: Math.round(corrected) };
    }

    let finalLevel = null;
    if (mode === "check") {
      for (const lvl of LEVELS) {
        if (!levelStats[lvl]) continue;
        if (levelStats[lvl].pct >= PASS_THRESHOLD) finalLevel = lvl;
        else break;
      }
      if (!finalLevel) finalLevel = "A1 altı";
    } else {
      finalLevel = selectedLevel;
    }

    // time bonus only for single-level exam mode, and only if passed
    let bonus = 0;
    const overallStats = mode === "level" ? levelStats[selectedLevel] : null;
    if (mode === "level" && overallStats && overallStats.pct >= PASS_THRESHOLD) {
      const savedMin = Math.floor(timeLeft / 60);
      bonus = Math.min(5, Math.floor(savedMin / 5));
    }
    const finalPct = mode === "level" ? Math.min(100, (overallStats?.pct || 0) + bonus) : null;

    const weakTopics = {};
    for (const lvl of LEVELS) {
      const wt = byLevel[lvl]?.wrongTopics || {};
      for (const t in wt) weakTopics[t] = (weakTopics[t] || 0) + wt[t];
    }
    const weakList = Object.entries(weakTopics).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return { levelStats, finalLevel, finalPct, bonus, reviewList, weakList };
  }, [finished]);

  const savedResultRef = useRef(false);
  useEffect(() => {
    if (finished && results && !savedResultRef.current) {
      savedResultRef.current = true;
      sbInsert("test_results", {
        user_name: name || "Qonaq",
        user_id: session?.user?.id || null,
        mode,
        level: mode === "level" ? selectedLevel : results.finalLevel,
        score: mode === "level" ? results.finalPct : null,
        details: results,
      }).catch(() => {});
      if (mode === "check" && placementTeacher) {
        notifyTeacher({
          teacherEmail: placementTeacher.email,
          teacherName: placementTeacher.name,
          studentName: name || "Tələbə",
          studentPhone: "—",
          studentLevel: `Səviyyəni Yoxla nəticəsi: ${results.finalLevel}`,
        });
        setPlacementTeacher(null);
      } else if (profile?.assigned_teacher_email) {
        const modeLabel = mode === "level" ? `${selectedLevel} səviyyə imtahanı` : mode === "check" ? "Səviyyəni Yoxla" : "Bonus Test";
        const scoreLabel = mode === "level" ? `${results.finalPct}%` : mode === "check" ? results.finalLevel : `${results.levelStats?.A1?.pct ?? "—"}%`;
        notifyTeacher({
          teacherEmail: profile.assigned_teacher_email,
          teacherName: profile.assigned_teacher_name || "Müəllim",
          studentName: profile?.name || name || "Tələbə",
          studentPhone: "—",
          studentLevel: `${modeLabel} nəticəsi: ${scoreLabel}`,
        });
      }
    }
    if (!finished) savedResultRef.current = false;
  }, [finished, results, profile]);

  /* ---------------- SCREENS ---------------- */

  if (screen === "portal") {
    return (
      <Portal
        onStart={() => setScreen("home")}
        session={session}
        profile={profile}
        isAdmin={isAdmin}
        isPremium={isPremium}
        authModal={authModal}
        setAuthModal={setAuthModal}
        saveSession={saveSession}
        logout={logout}
        refreshProfile={refreshProfile}
        onStartPlacementTest={startPlacementTest}
        recoveryToken={recoveryToken}
      />
    );
  }

  if (screen === "home") {
    return (
      <Shell>
        <button onClick={() => setScreen("portal")} style={styles.backBtn}><ChevronLeft size={16} /> Ana səhifə</button>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 46, marginBottom: 8 }}>🥨</div>
          <h1 style={styles.h1}>Deutsch Akademie</h1>
          <p style={styles.sub}>Online Test Platforması</p>
        </div>

        <label style={styles.label}>Adın</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Adını yaz..."
          style={styles.input}
        />

        <div style={{ marginTop: 28 }}>
          <div style={styles.label}>Nə etmək istəyirsən?</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginTop: 10 }}>
            {LEVELS.map((lvl) => (
              <button key={lvl} onClick={() => { setMode("level"); setSelectedLevel(lvl); setScreen("setup"); }}
                style={{ ...styles.card, ...(selectedLevel === lvl && mode === "level" ? styles.cardActive : {}) }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{lvl}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Səviyyə imtahanı</div>
              </button>
            ))}
            <button onClick={() => { setMode("check"); setScreen("setup"); }}
              style={{ ...styles.card, ...styles.cardGold, gridColumn: "span 2" }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>🔍 Səviyyəni yoxla</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>A1→B2 qarışıq, 45 sual</div>
            </button>
            <button
              onClick={() => {
                if (isPremium) { setMode("bonus"); setScreen("setup"); }
                else { setScreen("portal"); }
              }}
              style={{ ...styles.card, ...styles.cardGold, gridColumn: "span 2", border: "1px solid rgba(0,51,102,0.6)", background: "linear-gradient(135deg, rgba(0,51,102,0.12), rgba(0,51,102,0.04))" }}
            >
              <div style={{ fontSize: 20, fontWeight: 700 }}>✦ Premium Bonus Test</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                {isPremium ? "A1 · 100 sual · Oxu, Dinləmə, Qrammatika, Lüğət" : "🔒 Premium üzvlərə xüsusi — bas, Premium səhifəsinə keç"}
              </div>
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  if (screen === "setup") {
    return (
      <Shell>
        <button onClick={() => setScreen("home")} style={styles.backBtn}><ChevronLeft size={16} /> Geri</button>
        <h2 style={styles.h2}>{mode === "check" ? "Səviyyəni yoxla" : `${selectedLevel} İmtahanı`}</h2>

        {mode === "level" && (
          <>
            <p style={styles.sub}>Neçə sual istəyirsən?</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
              {(session ? [20, 35, 50, 100] : [20]).map((n) => (
                <button key={n} onClick={() => setNumQuestions(n)}
                  style={{ ...styles.pill, ...(numQuestions === n ? styles.pillActive : {}) }}>{n} sual</button>
              ))}
            </div>
            {!session && <p style={{ fontSize: 12.5, opacity: 0.6, marginTop: -12, marginBottom: 16 }}>Qonaq kimi yalnız 20 suallıq test mövcuddur (1 dəfəlik). Daha çox üçün qeydiyyatdan keç.</p>}
          </>
        )}
        {mode === "check" && (
          <p style={styles.sub}>45 sual (A1→B2 qarışıq + açıq suallar), 45 dəqiqə. Nəticədə hansı səviyyəyə çatdığın müəyyənləşəcək.</p>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0", color: "#003366" }}>
          <Clock size={18} /> <span>Vaxt həddi: 45 dəqiqə</span>
        </div>

        {limitMsg && <p style={{ color: "#003366", fontSize: 13.5, marginBottom: 14 }}>{limitMsg}</p>}
        <button onClick={startTest} style={styles.primaryBtn}>Başla</button>
      </Shell>
    );
  }

  if (screen === "test" && !finished) {
    const q = questions[current];
    if (!q) return <Shell><p>Sual tapılmadı.</p></Shell>;
    const theme = mode === "bonus"
      ? { accent: "#003366", soft: "rgba(0,51,102,0.16)", tier: 4 }
      : accentFor(q.level);
    const CATEGORY_LABEL = { reading: "📖 Oxu Anlama", listening: "🎧 Dinləmə", grammar: "📐 Qrammatika", vocab: "📚 Lüğət" };
    return (
      <Shell wide>
        <style>{`
          @keyframes qFadeSlide { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .q-card { animation: qFadeSlide .35s cubic-bezier(.2,.7,.3,1); }
        `}</style>
        <div style={styles.testHeader}>
          <button onClick={() => setScreen("home")} style={styles.exitBtn}><ChevronLeft size={15} /> Çıx</button>
          <span style={{ opacity: 0.8 }}>Sual {current + 1}/{questions.length}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: timeLeft < 300 ? "#C0392B" : theme.accent, transition: "color .4s" }}>
            <Clock size={16} /> {fmtTime(timeLeft)}
          </span>
        </div>
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${((current + 1) / questions.length) * 100}%`, background: `linear-gradient(90deg, ${theme.accent}, #2A3D3C)` }} />
        </div>

        <div key={q.id} className="q-card" style={{ ...styles.questionCard, margin: "20px 0", borderColor: theme.soft, position: "relative", overflow: "hidden" }}>
          <EleganceOrnament tier={theme.tier} color={theme.accent} />
          <div style={{ fontSize: 12, color: theme.accent, marginBottom: 10, fontWeight: 600, letterSpacing: 0.3, transition: "color .4s" }}>
            {mode === "bonus" ? `✦ Premium Bonus · ${CATEGORY_LABEL[q.topic] || q.topic}` : `${q.level} · ${q.topic}`}
          </div>
          {q.passage && (
            <div style={{
              background: "rgba(255,255,255,0.85)", border: "1px solid rgba(42,61,60,0.1)", borderRadius: 8,
              padding: "14px 16px", marginBottom: 16, fontSize: 14, lineHeight: 1.7, opacity: 0.9,
            }}>
              {q.topic === "listening" && (
                <button
                  onClick={() => speakGerman(q.passage)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 10, padding: "6px 14px",
                    borderRadius: 20, background: "rgba(0,51,102,0.15)", border: "1px solid rgba(0,51,102,0.4)",
                    color: "#003366", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  ▶️ Dinlə
                </button>
              )}
              <div>{q.passage}</div>
            </div>
          )}
          <p style={styles.question}>{q.q}</p>

          {q.isOpen ? (
            <textarea
              value={openAnswers[q.id] || ""}
              onChange={(e) => setOpenAnswers({ ...openAnswers, [q.id]: e.target.value })}
              placeholder="Cavabını buraya yaz..."
              style={styles.textarea}
            />
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {q.options.map((opt, i) => (
                <button key={i} className="da-option" onClick={() => setAnswers({ ...answers, [q.id]: i })}
                  style={{
                    ...styles.option,
                    ...(answers[q.id] === i ? { borderColor: theme.accent, background: theme.soft } : {}),
                  }}>
                  {opt}
                </button>
              ))}
            </div>
          )}

          <ReportIssue questionId={q.id} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}
            style={{ ...styles.secondaryBtn, opacity: current === 0 ? 0.4 : 1 }}>
            <ChevronLeft size={16} /> Geri
          </button>
          {current < questions.length - 1 ? (
            <button onClick={() => setCurrent((c) => c + 1)} style={styles.primaryBtn}>Növbəti <ChevronRight size={16} /></button>
          ) : (
            <button onClick={handleFinish} style={styles.primaryBtn}>Bitir</button>
          )}
        </div>
      </Shell>
    );
  }

  if (finished) {
    return (
      <Shell wide>
        {revealPhase === "spin" ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 320 }}>
            <div style={{ fontSize: 64, animation: "spin 1.2s linear infinite" }}>🥨</div>
            <p style={{ marginTop: 16, color: "#003366" }}>Nəticə hesablanır...</p>
            <style>{`@keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }`}</style>
          </div>
        ) : (
          <div>
            <div className="da-review-row" style={{ textAlign: "center", padding: "20px 0 30px", position: "relative" }}>
              {(() => {
                const resultTier = mode === "level" ? scoreTier(results.finalPct) : Math.max(1, LEVELS.indexOf(results.finalLevel) + 1);
                const tierAccent = accentForTier(resultTier);
                return (
                  <>
                    <EleganceOrnament tier={resultTier} color={tierAccent} />
                    <div style={{
                      position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)",
                      width: 220, height: 220, borderRadius: "50%", pointerEvents: "none",
                      background: `radial-gradient(circle, ${tierAccent}33, transparent 70%)`,
                    }} />
                    {mode === "level" ? (
                      <>
                        <CircularScore value={results.finalPct} color={gradeFor(results.finalPct).color} tier={resultTier} />
                        <h2 style={{ ...styles.h1, fontSize: 26, marginTop: 18 }}>
                          Sənin səviyyən: <span style={{ color: tierAccent }}>{results.finalLevel}</span>
                        </h2>
                        <p style={{ fontSize: 16, marginTop: 4, opacity: 0.85 }}>
                          <span style={{ color: gradeFor(results.finalPct).color }}>{gradeFor(results.finalPct).de}</span>
                          {results.bonus > 0 && <span style={{ fontSize: 13, opacity: 0.7 }}> (+{results.bonus}% sürət bonusu)</span>}
                        </p>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 40, position: "relative" }}>🥨</div>
                        <h2 style={{ ...styles.h1, fontSize: 30, position: "relative" }}>
                          Sənin səviyyən: <span style={{ color: tierAccent }}>{results.finalLevel}</span>
                        </h2>
                      </>
                    )}
                  </>
                );
              })()}
            </div>

            <div ref={resultRef}>
              <h3 style={styles.h3}>Səviyyə üzrə göstərici</h3>
              <div style={{ display: "grid", gap: 10, marginBottom: 28 }}>
                {LEVELS.filter((l) => results.levelStats[l]).map((lvl) => {
                  const s = results.levelStats[lvl];
                  const g = gradeFor(s.pct);
                  return (
                    <div key={lvl} style={styles.statRow}>
                      <span style={{ width: 32, fontWeight: 700 }}>{lvl}</span>
                      <div style={styles.statTrack}>
                        <div style={{ ...styles.statFill, width: `${s.pct}%`, background: g.color }} />
                      </div>
                      <span style={{ width: 100, textAlign: "right", fontSize: 13 }}>{s.pct}% · {g.de}</span>
                    </div>
                  );
                })}
              </div>

              <h3 style={styles.h3}>Sualların təhlili</h3>
              <div style={{ display: "grid", gap: 8, marginBottom: 28, maxHeight: 300, overflowY: "auto" }}>
                {results.reviewList.map((r, idx) => (
                  <div key={r.i} className={r.ok ? "da-review-right" : "da-review-wrong"}
                    style={{ ...styles.reviewRow, borderLeft: `3px solid ${r.ok ? "#6FA787" : "#C0392B"}`, animationDelay: `${Math.min(idx * 0.03, 0.6)}s` }}>
                    <div style={{ fontSize: 13, opacity: 0.9 }}>{r.i + 1}. {r.q}</div>
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                      Sənin cavabın: {r.userAnswer} {!r.ok && r.correctAnswer !== "—" && <>· Düzgün: {r.correctAnswer}</>}
                    </div>
                  </div>
                ))}
              </div>

              {results.weakList.length > 0 && (
                <div style={styles.adBox}>
                  <h3 style={{ ...styles.h3, marginTop: 0 }}>Zəif olduğun mövzular</h3>
                  <ul style={{ margin: "8px 0", paddingLeft: 18 }}>
                    {results.weakList.map(([topic, count]) => (
                      <li key={topic} style={{ marginBottom: 4 }}>{topic} <span style={{ opacity: 0.6 }}>({count} səhv)</span></li>
                    ))}
                  </ul>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, color: "#003366" }}>
                    <BookOpen size={18} />
                    <span style={{ fontSize: 13 }}>Bu mövzuları Deutsch Akademie kitablarımızda daha ətraflı tapa bilərsən.</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
              <button onClick={() => setScreen("portal")} style={styles.secondaryBtn}><Home size={16} /> Əsas ekran</button>
              <button onClick={() => { setScreen("setup"); setFinished(false); }} style={styles.primaryBtn}><RotateCcw size={16} /> Yenidən cəhd et</button>
              <button onClick={async () => {
                const text = mode === "level"
                  ? `Deutsch Akademie testində ${selectedLevel} səviyyəsindən ${results.finalPct}% topladım! 🥨`
                  : `Deutsch Akademie-də alman dili səviyyəmi yoxladım: ${results.finalLevel} 🥨`;
                if (navigator.share) {
                  try { await navigator.share({ text }); } catch {}
                } else {
                  try { await navigator.clipboard.writeText(text); alert("Nəticə kopyalandı!"); } catch {}
                }
              }} style={styles.secondaryBtn}>Paylaş</button>
            </div>
          </div>
        )}
      </Shell>
    );
  }

  return null;
}

const BOOKS = [
  { key: "dict", cover: "dict", title: "Lüğət", desc: "Alman-Azərbaycan / Azərbaycan-Alman lüğət kitabı.", url: "https://asimalirzayev.gumroad.com/l/pyako" },
  { key: "a1", cover: "a1", title: "A1 Test Kitabı", desc: "Başlanğıc səviyyə — qrammatika izahı + test sualları.", url: "https://asimalirzayev.gumroad.com/l/dtwnie" },
  { key: "a2", cover: "a2", title: "A2 Test Kitabı", desc: "Orta-başlanğıc səviyyə — qrammatika izahı + test sualları.", url: "https://asimalirzayev.gumroad.com/l/jlftu" },
  { key: "b1", cover: "b1", title: "B1 Test Kitabı", desc: "Orta səviyyə — qrammatika izahı + test sualları.", url: "https://asimalirzayev.gumroad.com/l/rpilx" },
  { key: "b2", cover: "b2", title: "B2 Test Kitabı", desc: "Yuxarı-orta səviyyə — qrammatika izahı + test sualları.", url: "https://asimalirzayev.gumroad.com/l/tizlnl" },
  { key: "a1a2", cover: "a1a2", title: "A1 + A2 Paketi", desc: "Hər iki başlanğıc səviyyə bir paketdə, endirimli qiymətə.", url: "https://asimalirzayev.gumroad.com/l/qopvbl" },
];

function PromoCard({ eyebrow, icon, title, body, cta, gradient, onClick }) {
  return (
    <button className="da-promo" onClick={onClick} style={{
      display: "block", width: "100%", textAlign: "left", cursor: "pointer",
      background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
      border: "none", borderRadius: 18, padding: "20px 20px 15px",
      boxShadow: `0 10px 26px ${gradient[2]}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0, fontSize: 18,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(255,255,255,0.20)",
        }}>{icon}</span>
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.4, color: "rgba(245,245,220,0.88)" }}>
          {eyebrow}
        </span>
      </div>

      <p style={{ margin: "0 0 7px", fontSize: 17.5, fontWeight: 800, lineHeight: 1.32, color: "#F5F5DC" }}>
        {title}
      </p>

      <p style={{ margin: "0 0 14px", fontSize: 13, lineHeight: 1.58, color: "rgba(245,245,220,0.85)" }}>
        {body}
      </p>

      <div style={{
        display: "flex", alignItems: "center", gap: 6, paddingTop: 12,
        borderTop: "1px solid rgba(255,255,255,0.20)",
      }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#F5F5DC" }}>{cta}</span>
        <ChevronRight size={16} color="#F5F5DC" />
      </div>
    </button>
  );
}

function WordOfDay() {
  const [word, setWord] = useState(null);

  useEffect(() => {
    let alive = true;
    sb("dictionary?direction=eq.de-az&select=term,translation&limit=1")
      .then((countRows) => {
        // Get total count via a cheap trick: fetch a small window, then pick offset by day-of-year
        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
        const offset = (dayOfYear * 37) % 5000; // spread across dictionary, wraps safely
        sb(`dictionary?direction=eq.de-az&select=term,translation&limit=1&offset=${offset}`)
          .then((rows) => { if (alive && rows[0]) setWord(rows[0]); })
          .catch(() => {});
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!word) return null;
  return (
    <div style={portalStyles.wordOfDayCard}>
      <svg viewBox="0 0 100 100" style={portalStyles.cloverBg}>
        <g fill="#00A896">
          <circle cx="50" cy="30" r="18" />
          <circle cx="50" cy="70" r="18" />
          <circle cx="30" cy="50" r="18" />
          <circle cx="70" cy="50" r="18" />
        </g>
      </svg>
      <div style={{ position: "relative" }}>
        <span style={portalStyles.wordOfDayLabel}>🍀 Günün Sözü</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
          <span style={portalStyles.wordOfDayTerm}>{word.term}</span>
          <button onClick={() => speakGerman(word.term)} style={portalStyles.speakBtn}>🔊</button>
        </div>
        <span style={portalStyles.wordOfDayTrans}>{word.translation}</span>
      </div>
    </div>
  );
}

function AdlerChat({ chatInput, setChatInput, chatMessages, setChatMessages, chatLoading, setChatLoading }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatMessages]);

  async function handleSend() {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const newMessages = [...chatMessages, { role: "user", text }];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xəta baş verdi");
      setChatMessages([...newMessages, { role: "adler", text: data.reply }]);
    } catch (err) {
      setChatMessages([...newMessages, { role: "adler", text: "Üzr istəyirəm, cavab verə bilmədim — bir az sonra yenidən sına." }]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: 360 }}>
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", marginBottom: 10 }}>
        {chatMessages.length === 0 && (
          <p style={{ fontSize: 12.5, opacity: 0.6, margin: 0 }}>
            Salam! Mən Adler-əm 🦅 — alman dili haqqında nə soruşsan, kömək etməyə çalışaram. Nədən danışaq?
          </p>
        )}
        {chatMessages.map((m, i) => (
          <div key={i} style={{
            marginBottom: 10, padding: "8px 12px", borderRadius: 8, fontSize: 13, lineHeight: 1.5,
            background: m.role === "user" ? "rgba(255,140,0,0.1)" : "rgba(0,51,102,0.08)",
            marginLeft: m.role === "user" ? 20 : 0, marginRight: m.role === "user" ? 0 : 20,
          }}>
            {m.text}
          </div>
        ))}
        {chatLoading && <p style={{ fontSize: 12.5, opacity: 0.5 }}>Adler yazır...</p>}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
          placeholder="Sualını yaz..."
          style={{ ...portalStyles.input, marginBottom: 0, flex: 1 }}
        />
        <button onClick={handleSend} disabled={chatLoading || !chatInput.trim()} style={{ ...portalStyles.primaryBtn, flexShrink: 0, padding: "10px 16px" }}>→</button>
      </div>
    </div>
  );
}





function LessonVocab({ level, num }) {
  const [vocab, setVocab] = useState(null);
  useEffect(() => {
    let alive = true;
    sb(`lesson_vocab?level=eq.${level}&lesson_num=eq.${num}&select=term,translation`)
      .then((rows) => { if (alive) setVocab(rows); })
      .catch(() => { if (alive) setVocab([]); });
    return () => { alive = false; };
  }, [level, num]);
  if (!vocab || vocab.length === 0) return null;
  return (
    <div style={portalStyles.vocabBox}>
      <div style={portalStyles.vocabTitle}>📎 Bu mövzu ilə paralel öyrən</div>
      <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
        {vocab.map((v, i) => (
          <div key={i} style={{ display: "flex", gap: 8, fontSize: 13.5 }}>
            <span style={{ color: "#FF8C00", fontWeight: 700, minWidth: 110 }}>{v.term}</span>
            <span style={{ opacity: 0.75 }}>{v.translation}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LessonsView({ topicsByLevel, isPremium, isAdmin, setAuthModal, setView, session, profile, initialLevel, guestMode }) {
  const [subTab, setSubTab] = useState("path"); // path | browse
  const [level, setLevel] = useState("A1");
  const [openTopic, setOpenTopic] = useState(null);
  const [lessons, setLessons] = useState([]);
  useEffect(() => {
    let alive = true;
    sb(`lessons?level=eq.${level}&select=level,num,title,content`)
      .then((rows) => { if (alive) setLessons(rows.sort((a, b) => parseInt(a.num) - parseInt(b.num))); })
      .catch(() => { if (alive) setLessons([]); });
    return () => { alive = false; };
  }, [level]);
  const hasContent = lessons.length > 0;

  return (
    <section style={portalStyles.section}>
      <SectionHeader type="lessons" desc="Səviyyəyə görə qrammatika izahları" />
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button onClick={() => setSubTab("path")} style={{ ...portalStyles.pill, ...(subTab === "path" ? portalStyles.pillActive : {}) }}>📚 Dərs Yolu</button>
        <button onClick={() => setSubTab("browse")} style={{ ...portalStyles.pill, ...(subTab === "browse" ? portalStyles.pillActive : {}) }}>📖 Sərbəst Baxış</button>
      </div>

      {subTab === "path" && <LessonPathView portalStyles={portalStyles} AuthRequired={AuthRequired} session={session} profile={profile} initialLevel={initialLevel} guestMode={guestMode} setAuthModal={setAuthModal} />}

      {subTab === "browse" && (
      <>
      <p style={{ ...portalStyles.body, marginBottom: 20 }}>Səviyyə seç, mövzuya klikləyib izahı aç.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {LEVELS.map((lvl) => (
          <button key={lvl} onClick={() => { setLevel(lvl); setOpenTopic(null); }}
            style={{ ...portalStyles.pill, ...(level === lvl ? portalStyles.pillActive : {}) }}>{lvl}</button>
        ))}
      </div>

      {hasContent ? (
        <div style={{ display: "grid", gap: 10 }}>
          {lessons.map((l) => {
            const isOpen = openTopic === l.num;
            return (
              <div key={l.num} style={portalStyles.lessonCard}>
                <button onClick={() => setOpenTopic(isOpen ? null : l.num)} style={portalStyles.lessonHeader}>
                  <span>{l.num}. {l.title}</span>
                  <ChevronRight size={16} style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
                </button>
                {isOpen && (
                  <div style={portalStyles.lessonBodyWrap}>
                    <pre style={portalStyles.lessonBody}>{l.content}</pre>
                    {(isPremium || isAdmin) ? (
                      <a href={pdfUrl(level, l.num)} target="_blank" rel="noopener noreferrer" style={portalStyles.pdfLink}>
                        ✦ Genişləndirilmiş izahı PDF olaraq endir
                      </a>
                    ) : (
                      <button onClick={() => setView("premium")} style={portalStyles.pdfLinkLocked}>
                        🔒 PDF endirmək üçün Premium lazımdır
                      </button>
                    )}
                    <LessonVocab level={level} num={l.num} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={portalStyles.grid}>
          {(topicsByLevel[level] || []).map((topic) => (
            <div key={topic} style={portalStyles.card}>
              <h3 style={{ ...portalStyles.cardTitle, fontSize: 15 }}>{topic}</h3>
              <p style={portalStyles.cardText}>Tezliklə: ətraflı izah, cədvəllər və nümunə cümlələr.</p>
            </div>
          ))}
        </div>
      )}
      </>
      )}
    </section>
  );
}

function LevelIcon({ level, size = 15, color = "currentColor" }) {
  const s = { width: size, height: size, display: "inline-block", verticalAlign: "-2px" };
  const common = { fill: "none", stroke: color, strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round" };
  switch (level) {
    case "A1": // blossom — beginning
      return (
        <svg viewBox="0 0 24 24" style={s} {...common}>
          <circle cx="12" cy="12" r="2.4" />
          <path d="M12 9.6c0-2.4-1.5-4-3-4.6M12 9.6c0-2.4 1.5-4 3-4.6M12 14.4c0 2.4-1.5 4-3 4.6M12 14.4c0 2.4 1.5 4 3 4.6M9.6 12c-2.4 0-4-1.5-4.6-3M9.6 12c-2.4 0-4 1.5-4.6 3M14.4 12c2.4 0 4-1.5 4.6-3M14.4 12c2.4 0 4 1.5 4.6 3" />
        </svg>
      );
    case "A2": // sprouting leaf — growth
      return (
        <svg viewBox="0 0 24 24" style={s} {...common}>
          <path d="M5 19c0-7 4-12 14-13-1 9-6 13-14 13Z" />
          <path d="M5 19c2-3 5-6 10-9" />
        </svg>
      );
    case "B1": // shield — strength
      return (
        <svg viewBox="0 0 24 24" style={s} {...common}>
          <path d="M12 3.5 5 6v6c0 4.5 3 7.5 7 8.5 4-1 7-4 7-8.5V6l-7-2.5Z" />
        </svg>
      );
    case "B2": // crown — mastery
      return (
        <svg viewBox="0 0 24 24" style={s} {...common}>
          <path d="M4 17h16l-1.4-7-3.6 3-3-5-3 5-3.6-3L4 17Z" />
          <path d="M4 19.5h16" />
        </svg>
      );
    default:
      return null;
  }
}

function ContactForm() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  function handleSend() {
    if (!name.trim() || !message.trim()) return;
    setSending(true);
    notifyTeacher({
      teacherEmail: "asimalirzayev2@gmail.com",
      teacherName: "Asim",
      studentName: `[Bizə Yazın] ${name.trim()}`,
      studentPhone: "—",
      studentLevel: message.trim(),
    });
    setSending(false);
    setSent(true);
  }

  return (
    <div style={portalStyles.premiumPerkBox}>
      <h3 style={portalStyles.premiumPerkTitle}>✉️ Bizə Yazın</h3>
      {sent ? (
        <p style={{ color: "#00A896", fontSize: 13.5 }}>✓ Mesajın göndərildi, tezliklə cavab veriləcək!</p>
      ) : (
        <>
          <p style={{ ...portalStyles.body, fontSize: 13.5, marginBottom: 12 }}>
            Sualın, təklifin, ya da sadəcə demək istədiyin bir şey var? Aşağıya yaz, birbaşa bizə çatacaq.
          </p>
          <input placeholder="Adın" value={name} onChange={(e) => setName(e.target.value)} style={portalStyles.input} />
          <textarea
            placeholder="Mesajın..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            style={{ ...portalStyles.input, resize: "vertical", fontFamily: "inherit" }}
          />
          <button onClick={handleSend} style={portalStyles.primaryBtn} disabled={sending}>
            {sending ? "Göndərilir..." : "Göndər"}
          </button>
        </>
      )}
    </div>
  );
}




function Reveal({ children, delay = 0 }) {
  const [ref, visible] = useReveal();
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(24px)",
      transition: `opacity .7s ease ${delay}s, transform .7s cubic-bezier(.2,.7,.3,1) ${delay}s`,
    }}>
      {children}
    </div>
  );
}

function TiltCard({ children, style, onClick, as: As = "div" }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(false);
  const reduced = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function onMove(e) {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.transform = `perspective(700px) rotateX(${(-py * 8).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg) translateZ(0)`;
    ref.current.style.setProperty("--gx", `${(px + 0.5) * 100}%`);
    ref.current.style.setProperty("--gy", `${(py + 0.5) * 100}%`);
  }
  function onLeave() {
    setHover(false);
    if (!ref.current) return;
    ref.current.style.transform = "perspective(700px) rotateX(0deg) rotateY(0deg)";
  }

  return (
    <As ref={ref} onMouseMove={onMove} onMouseEnter={() => setHover(true)} onMouseLeave={onLeave} onClick={onClick}
      style={{ ...style, transition: "transform .15s ease-out", willChange: "transform" }}>
      <div style={{ ...portalStyles.tiltGlow, opacity: hover ? 1 : 0 }} />
      {children}
    </As>
  );
}

function AuthRequired({ setAuthModal }) {
  return (
    <div style={portalStyles.authRequiredBox}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>🔒</div>
      <h3 style={{ ...portalStyles.cardTitle, marginBottom: 8 }}>Bu bölmə üçün qeydiyyat lazımdır</h3>
      <p style={{ ...portalStyles.cardText, marginBottom: 16 }}>Pulsuzdur — sadəcə email və şifrənlə qeydiyyatdan keç, dərhal tam giriş qazanırsan.</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button onClick={() => setAuthModal("signup")} style={portalStyles.primaryBtn}>Qeydiyyatdan keç</button>
        <button onClick={() => setAuthModal("login")} style={portalStyles.secondaryBtnLight}>Daxil ol</button>
      </div>
    </div>
  );
}

// Qonaq (giriş etməmiş) istifadəçilər üçün — bölməni bağlamır, sadəcə yuxarıda incə xatırlatma göstərir.
function GuestBanner({ setAuthModal, text }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      background: "rgba(255,140,0,0.08)", border: "1px solid rgba(255,140,0,0.25)",
      borderRadius: 10, padding: "10px 14px", marginBottom: 16, flexWrap: "wrap",
    }}>
      <span style={{ fontSize: 13, color: "#2A3D3C", opacity: 0.85 }}>
        {text || "Qonaq kimi baxırsan — tam giriş üçün qeydiyyatdan keç."}
      </span>
      <button onClick={() => setAuthModal("signup")} style={{ ...portalStyles.primaryBtn, padding: "7px 14px", fontSize: 13 }}>
        Qeydiyyatdan keç
      </button>
    </div>
  );
}






function Portal({ onStart, session, profile, isAdmin, isPremium, authModal, setAuthModal, saveSession, logout, refreshProfile, onStartPlacementTest, recoveryToken }) {
  const [view, setView] = useState("home"); // home | lessons | dictionary | courses | contact
  const [regForm, setRegForm] = useState({ name: "", phone: "", course: "A1" });
  const [regSent, setRegSent] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [botOpen, setBotOpen] = useState(false);
  const [botQuestion, setBotQuestion] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const glowRef = useRef(null);
  const [streak, setStreak] = useState(null);
  const [continueLevel, setContinueLevel] = useState(null);
  const [jumpLevel, setJumpLevel] = useState(null); // null=hesablanmayıb, ""=proqres yoxdur, "A1".. =mövcud

  useEffect(() => {
    if (!session) { setContinueLevel(""); return; }
    sbAuth(`user_lesson_progress?user_id=eq.${session.user.id}&passed=eq.true&select=level&order=level.desc&limit=1`, session.access_token)
      .then((rows) => setContinueLevel(rows && rows[0] ? rows[0].level : ""))
      .catch(() => setContinueLevel(""));
  }, [session]);

  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      let data = { lastDate: null, count: 0 };
      const v = localStorage.getItem("visitStreak");
      if (v) data = JSON.parse(v);
      if (data.lastDate === today) {
        setStreak(data.count || 1);
        return;
      }
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const newCount = data.lastDate === yesterday ? (data.count || 0) + 1 : 1;
      localStorage.setItem("visitStreak", JSON.stringify({ lastDate: today, count: newCount }));
      setStreak(newCount);
    } catch {}
  }, []);

  useEffect(() => {
    function onMove(e) {
      if (glowRef.current) {
        glowRef.current.style.background = `radial-gradient(600px circle at ${e.clientX}px ${e.clientY}px, rgba(255,140,0,0.10), transparent 60%)`;
      }
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const [topicsByLevel, setTopicsByLevel] = useState({ A1: [], A2: [], B1: [], B2: [] });
  useEffect(() => {
    let alive = true;
    Promise.all(LEVELS.map((lvl) =>
      sb(`questions?level=eq.${lvl}&select=topic&limit=2000`).catch(() => [])
    )).then((results) => {
      if (!alive) return;
      const out = {};
      LEVELS.forEach((lvl, i) => { out[lvl] = [...new Set(results[i].map((r) => r.topic))]; });
      setTopicsByLevel(out);
    });
    return () => { alive = false; };
  }, []);

  const { t } = useLanguage();

  const TABS = [
    { key: "home",       label: t("nav_home"),       icon: "⌂" },
    { key: "lessons",    label: t("nav_lessons"),    icon: "▤" },
    { key: "dictionary", label: t("nav_dictionary"), icon: "⌕" },
    { key: "adlercup",   label: t("nav_cup"),        icon: "♛" },
    { key: "more",       label: t("nav_more"),       icon: "⋯" },
  ];

  const MORE_GROUPS = [
    {
      title: t("section_exam"),
      items: [
        { key: "oxuanlama", label: t("reading"),  sub: "TELC/Goethe hazırlıq",  Icon: BookOpen },
        { key: "hoerverstehen", label: t("listening"), sub: "TELC/Goethe hazırlıq",  Icon: Headphones },
        { key: "books",     label: t("books"),    sub: "PDF dərsliklər",       Icon: Library },
        { key: "courses",   label: t("courses"),     sub: "müəllimlər",           Icon: GraduationCap },
      ],
    },
    {
      title: t("section_practice"),
      items: [
        { key: "flashcards", label: t("flashcards"),   sub: "kartlarla təkrar et", Icon: Layers },
        { key: "sozoyunu",  label: t("word_puzzle"), sub: "lüğət oyunu",        Icon: Puzzle },
        { key: "krossvord", label: t("crossword"),     sub: "kəsişən sözlər",     Icon: Grid3x3 },
      ],
    },
  ];
  const MORE_ITEMS_TAIL = [
    { key: "nailiyyetler", label: t("my_achievements"), sub: "xal və dərəcən", Icon: Trophy },
    { key: "premium",   label: t("premium"),        sub: "əlavə imkanlar",  Icon: Crown, premium: true },
    { key: "contact",   label: t("contact"),          sub: "bizə yaz",        Icon: Mail },
  ];

  return (
    <div style={portalStyles.page}>
      <style>{`
        @keyframes drift1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,-30px) scale(1.1); } }
        @keyframes drift2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-50px,40px) scale(1.15); } }
        @keyframes drift3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,30px) scale(0.95); } }
        @media (prefers-reduced-motion: reduce) { .blob { animation: none !important; } }
        button, input, select { -webkit-tap-highlight-color: transparent; appearance: none; outline: none; font-family: inherit; }
        button:focus-visible { box-shadow: 0 0 0 2px rgba(255,255,255,0.6); }
        @media (min-width: 861px) {
          .da-sheet { max-width: 560px; margin: 0 auto; border-radius: 20px 20px 0 0; }
        }
        @keyframes daShake { 10%,90% { transform: translateX(-2px); } 20%,80% { transform: translateX(3px); } 30%,50%,70% { transform: translateX(-5px); } 40%,60% { transform: translateX(5px); } }
        @keyframes daPulse { 0% { box-shadow: 0 0 0 0 rgba(0,168,150,0.45); } 70% { box-shadow: 0 0 0 9px rgba(0,168,150,0); } 100% { box-shadow: 0 0 0 0 rgba(0,168,150,0); } }
        @keyframes daCountPop { from { transform: scale(0.94); opacity: 0.4; } to { transform: scale(1); opacity: 1; } }
        .da-promo { transition: transform .18s ease, box-shadow .18s ease; }
        .da-promo:hover { transform: translateY(-4px); }
        .da-right { animation: daPulse .7s ease-out; }
        .da-wrong { animation: daShake .45s ease-in-out; }
      `}</style>

      <div ref={glowRef} style={portalStyles.cursorGlow} />
      {(() => {
        const PAGE_THEME = {
          home: { primary: "#FF8C00", secondary: "#00A896" },
          lessons: { primary: "#FF8C00", secondary: "#00A896" },
          dictionary: { primary: "#00A896", secondary: "#4FC3E8" },
          books: { primary: "#B98CE8", secondary: "#00A896" },
          courses: { primary: "#6FD19A", secondary: "#00A896" },
          premium: { primary: "#003366", secondary: "#00A896" },
          contact: { primary: "#E86C8C", secondary: "#00A896" },
        };
        const t = PAGE_THEME[view] || PAGE_THEME.home;
        return (
          <>
            <svg style={portalStyles.watermark} viewBox="0 0 800 240" preserveAspectRatio="xMidYMid slice">
              <defs>
                <pattern id="diamondLattice" width="70" height="70" patternUnits="userSpaceOnUse">
                  <rect x="20" y="20" width="30" height="30" fill="none" stroke={t.secondary} strokeWidth="1.4" transform="rotate(45 35 35)" />
                </pattern>
              </defs>
              <rect x="0" y="0" width="800" height="240" fill="url(#diamondLattice)" />
            </svg>
            <svg style={portalStyles.cornerShapeBig} viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon points="0,100 0,25 75,100" fill={t.secondary} />
            </svg>
            <svg style={portalStyles.cornerShapeSmall} viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon points="100,0 100,50 50,0" fill={t.primary} />
            </svg>
            <div style={{ ...portalStyles.thinDiamond, borderColor: `${t.primary}66` }} />
            <div style={{ ...portalStyles.thinSquare, borderColor: `${t.secondary}90` }} />
          </>
        );
      })()}

      {/* ---------- Üst zolaq: loqo + hesab ---------- */}
      <nav style={portalStyles.nav}>
        <div style={portalStyles.navBrand} onClick={() => setView("home")}>
          <img src={LOGO_URL} alt="Deutsch Akademie" style={portalStyles.navEmblem} />
          <span style={portalStyles.navBrandText}>Deutsch Akademie</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LanguageSwitcher />
          {session ? (
            <button onClick={() => setView("profile")}
              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", position: "relative", lineHeight: 0 }}
              title={profile?.name || "Hesab"}>
              <Avatar avatarKey={profile?.avatar_bird} size={38}
                fallbackLetter={(profile?.name || "?").trim().charAt(0).toUpperCase()}
                ring={isPremium || isAdmin} />
            </button>
          ) : (
            <button onClick={() => setAuthModal("login")} style={portalStyles.loginPill}>{t("log_in")}</button>
          )}
        </div>
      </nav>

      {/* ---------- Alt tab paneli ---------- */}
      <div style={portalStyles.tabBar}>
        {TABS.map((t) => {
          const active = t.key === "more" ? moreOpen : (view === t.key && !moreOpen);
          return (
            <button key={t.key}
              onClick={() => { if (t.key === "more") { setMoreOpen((v) => !v); } else { setMoreOpen(false); setView(t.key); } }}
              style={portalStyles.tabBtn}>
              <span style={{ ...portalStyles.tabIconWrap, ...(active ? portalStyles.tabIconWrapActive : {}) }}>
                <span style={{ ...portalStyles.tabIcon, ...(active ? portalStyles.tabIconActive : {}) }}>{t.icon}</span>
              </span>
              <span style={{ ...portalStyles.tabLabel, ...(active ? portalStyles.tabLabelActive : {}) }}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ---------- "Daha" vərəqi ---------- */}
      {moreOpen && (
        <>
          <div style={portalStyles.sheetBackdrop} onClick={() => setMoreOpen(false)} />
          <div className="da-sheet" style={portalStyles.sheet}>
            <div style={portalStyles.sheetHandle} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 14px" }}>
              <p style={{ ...portalStyles.sheetTitle, margin: 0 }}>{t("sections")}</p>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 999,
                background: "rgba(0,168,150,0.1)", color: "#00A896",
              }}>{MORE_GROUPS.reduce((n, g) => n + g.items.length, 0) + MORE_ITEMS_TAIL.length} Alət</span>
            </div>

            {MORE_GROUPS.map((group) => (
              <div key={group.title} style={{ marginBottom: 14 }}>
                <p style={{
                  fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                  color: "rgba(42,61,60,0.45)", margin: "0 0 8px 2px",
                }}>{group.title}</p>
                <div style={portalStyles.sheetGrid}>
                  {group.items.map((m) => (
                    <button key={m.key} onClick={() => { setMoreOpen(false); setView(m.key); }}
                      style={{ ...portalStyles.sheetCard, ...(view === m.key ? portalStyles.sheetCardActive : {}) }}>
                      <span style={portalStyles.sheetCardIcon}><m.Icon size={18} strokeWidth={2} /></span>
                      <span style={portalStyles.sheetCardText}>
                        <span style={portalStyles.sheetCardTitle}>{m.label}</span>
                        <span style={portalStyles.sheetCardSub}>{m.sub}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <p style={{
              fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
              color: "rgba(42,61,60,0.45)", margin: "0 0 8px 2px",
            }}>Profil və İmkanlar</p>
            <div style={portalStyles.sheetGrid}>
              {MORE_ITEMS_TAIL.map((m) => (
                <button key={m.key} onClick={() => { setMoreOpen(false); setView(m.key); }}
                  style={{
                    ...portalStyles.sheetCard,
                    ...(view === m.key ? portalStyles.sheetCardActive : {}),
                    ...(m.premium ? portalStyles.sheetCardPremium : {}),
                  }}>
                  <span style={portalStyles.sheetCardIcon}><m.Icon size={18} strokeWidth={2} /></span>
                  <span style={portalStyles.sheetCardText}>
                    <span style={portalStyles.sheetCardTitle}>
                      {m.label}{m.premium && <span style={portalStyles.sheetCardProTag}> PRO</span>}
                    </span>
                    <span style={portalStyles.sheetCardSub}>{m.sub}</span>
                  </span>
                </button>
              ))}
            </div>

            <div style={portalStyles.sheetDivider} />
            {session ? (
              <>
                <button onClick={() => { setMoreOpen(false); setView("profile"); }} style={portalStyles.sheetRow}>
                  <span>{profile?.name || "Hesab"}{isAdmin ? " (Admin)" : isPremium ? " ✦" : ""}</span>
                  <span style={{ color: "rgba(42,61,60,0.4)" }}>›</span>
                </button>
                <button onClick={() => { setMoreOpen(false); setShowLogoutConfirm(true); }}
                  style={{ ...portalStyles.sheetRow, color: "#C0392B" }}>Çıxış</button>
              </>
            ) : (
              <button onClick={() => { setMoreOpen(false); setAuthModal("login"); }}
                style={{ ...portalStyles.sheetRow, color: "#FF8C00", fontWeight: 700 }}>Daxil ol</button>
            )}
          </div>
        </>
      )}
      {authModal && (
        <AuthModal
          portalStyles={portalStyles}
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onSwitch={(m) => setAuthModal(m)}
          saveSession={saveSession}
          refreshProfile={refreshProfile}
          recoveryToken={recoveryToken}
        />
      )}

      {showLogoutConfirm && (
        <div style={portalStyles.modalOverlay} onClick={() => setShowLogoutConfirm(false)}>
          <div style={{ ...portalStyles.modalBox, maxWidth: 320, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <img src={LOGO_URL} alt="" style={{ width: 44, height: 44, borderRadius: "50%", margin: "0 auto 14px" }} />
            <p style={{ fontSize: 15.5, marginBottom: 22 }}>Deutsch Akademie-dən çıxış etmək istəyirsən?</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setShowLogoutConfirm(false)} style={portalStyles.secondaryBtnLight}>Xeyr</button>
              <button onClick={() => { setShowLogoutConfirm(false); logout(); }} style={portalStyles.primaryBtn}>Bəli, çıx</button>
            </div>
          </div>
        </div>
      )}

      {/* Support bot */}
      <div style={portalStyles.botFabWrap}>
        {(isPremium || isAdmin) && (
          <div style={portalStyles.crownBadge}>
            <Crown size={22} color="#D4AF37" fill="#D4AF37" style={{ filter: "drop-shadow(0 0 4px rgba(212,175,55,0.85))" }} />
          </div>
        )}
        <button onClick={() => setBotOpen((v) => !v)} style={portalStyles.botFab}>
          {botOpen ? "✕" : <Bird size={26} color="#fff" strokeWidth={2.2} />}
        </button>
      </div>
      {botOpen && (
        <div style={portalStyles.botPanel}>
          <div style={portalStyles.botHeader}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Bird size={18} color="#FF8C00" /> {(isPremium || isAdmin) ? "Adler" : "Dəstək"}
            </span>
            <button onClick={() => { setBotOpen(false); setBotQuestion(null); }} style={portalStyles.botClose}>✕</button>
          </div>
          <div style={portalStyles.botBody}>
            {(isPremium || isAdmin) ? (
              <AdlerChat
                chatInput={chatInput} setChatInput={setChatInput}
                chatMessages={chatMessages} setChatMessages={setChatMessages}
                chatLoading={chatLoading} setChatLoading={setChatLoading}
              />
            ) : botQuestion ? (
              <>
                <button onClick={() => setBotQuestion(null)} style={portalStyles.botBack}>← Geri</button>
                <p style={portalStyles.botAnswerQ}>{botQuestion.q}</p>
                <p style={portalStyles.botAnswerA}>{botQuestion.a}</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 12.5, opacity: 0.6, margin: "0 0 10px" }}>Sualını seç:</p>
                {FAQ_ITEMS.map((item, i) => (
                  <button key={i} onClick={() => setBotQuestion(item)} style={portalStyles.botFaqBtn}>{item.q}</button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      <div style={portalStyles.content}>
        {view === "home" && (
          <>
            <Reveal>
              <div style={portalStyles.hero}>
                <div style={portalStyles.emblem}>
                  <img src={LOGO_URL} alt="Deutsch Akademie" style={portalStyles.emblemRing} />
                </div>
                <h1 style={portalStyles.title}>
                  Deutsch <span style={{ color: "#FF8C00" }}>Akademie</span>
                </h1>
                <div style={portalStyles.titleRule} />
                <p style={portalStyles.tagline}>
                  {profile?.name ? `Xoş gəldin, ${profile.name}!` : "Alman dilini Azərbaycan dilində öyrənənlər üçün"}
                </p>
                {streak > 0 && <div style={portalStyles.streakBadge}>🔥 {streak} gündür ardıcıl buradasan</div>}
                <div style={{ marginTop: 22 }}><WordOfDay /></div>
              </div>
            </Reveal>

            <Reveal delay={0.04}>
              <BilirdinizMi />
            </Reveal>

            {/* ---------- Davam Et: seçilmiş banner ---------- */}
            {continueLevel !== null && (
              <Reveal delay={0.05}>
                <PromoCard
                  gradient={["#00A896", "#00695C", "rgba(0,168,150,0.30)"]}
                  eyebrow="DƏRS YOLU"
                  icon="🦅"
                  title={continueLevel ? `Qanadların ${continueLevel}-də açılıb!` : "İlk addımı at — A1 səni gözləyir!"}
                  body={continueLevel
                    ? "Azərbaycan dilində izahlı, addım-addım qurulmuş dərsliklərimizlə Alman qrammatikası artıq bu qədər asan olmayıb. Qaldığın yerdən davam et, zirvə yaxındır."
                    : "Sıfırdan başlayanlar üçün düşünülüb: hər dərs sadə izahla, canlı nümunələrlə və tapşırıqlarla qurulub. Bizimlə öyrənməyə başla."}
                  cta={continueLevel ? "Davam et" : "Başla"}
                  onClick={() => { setJumpLevel(continueLevel || "A1"); setView("lessons"); }}
                />
              </Reveal>
            )}

            {/* ---------- Bölmə kartları ---------- */}
            <Reveal delay={0.08}>
              <section style={{ display: "grid", gap: 12, marginTop: 14 }}>
                <PromoCard
                  gradient={["#003366", "#001B33", "rgba(0,51,102,0.32)"]}
                  eyebrow="SƏVİYYƏ TESTİ" icon="🥨"
                  title="Bilirsən, yoxsa bilirsən sanırsan?"
                  body="Bir neçə dəqiqəlik onlayn testlə hansı səviyyədə olduğunu dəqiq öyrən — nəticəyə görə sənə uyğun dərs yolunu bizimlə birlikdə qurarıq."
                  cta="Testi sına"
                  onClick={onStart}
                />
                <PromoCard
                  gradient={["#D4AF37", "#9C7A1E", "rgba(212,175,55,0.32)"]}
                  eyebrow="ADLER CUP" icon="🏆"
                  title="Dostların hazırdır — sən hazırsanmı?"
                  body="Canlı sual-cavab yarışında dostlarınla üz-üzə gəl. Sürətli və düzgün cavab daha çox xal qazandırır — kim qartal, kim ötəri quş, ekranda görünür."
                  cta="Yarışa qoşul"
                  onClick={() => setView("adlercup")}
                />
                <PromoCard
                  gradient={["#00A896", "#FF8C00", "rgba(255,140,0,0.28)"]}
                  eyebrow="SÖZ TAPMACASI" icon="🐝"
                  title="Bir söz gizlənib hərflərin arasında"
                  body="Azərbaycanca izaha bax, hərf sayını gör, alman sözünü tap. Oyunla öyrəndiyin hər söz yadında daha möhkəm qalır."
                  cta="Oyna"
                  onClick={() => setView("sozoyunu")}
                />
                <PromoCard
                  gradient={["#C97B63", "#8B4A38", "rgba(201,123,99,0.30)"]}
                  eyebrow="FLASHCARDS" icon="🃏"
                  title="Kartı çevir, sözü yadında saxla"
                  body="Lüğətimizdəki minlərlə sözdən səviyyənə uyğun kartlarla təkrar et — çevir, öyrən, yenidən sına. Bazamız daim yeni sözlərlə böyüyür."
                  cta="Kartlara başla"
                  onClick={() => setView("flashcards")}
                />
                <PromoCard
                  gradient={["#8C6239", "#5C3F22", "rgba(92,63,34,0.32)"]}
                  eyebrow="KİTABLARIMIZ" icon="📚"
                  title="Səhifədən səhifəyə, sözdən cümləyə"
                  body="A1-dən B2-yə qədər özümüz hazırladığımız test kitabları və qrammatika bələdçiləri ilə istədiyin yerdə, istədiyin zaman oxu."
                  cta="Kitablara bax"
                  onClick={() => setView("books")}
                />
                <PromoCard
                  gradient={["#12B6C9", "#0C7F8C", "rgba(12,127,140,0.30)"]}
                  eyebrow="LÜĞƏT" icon="📖"
                  title="Axtardığın söz bir toxunuşda"
                  body="Axtardığın hər sözün Azərbaycanca qarşılığını tap, səsləndir, Anki formatında ixrac et — lüğət həmişə əlinin altındadır."
                  cta="Lüğətə keç"
                  onClick={() => setView("dictionary")}
                />
                <PromoCard
                  gradient={["#FF8C00", "#C96800", "rgba(255,140,0,0.30)"]}
                  eyebrow="KURSLAR" icon="🎓"
                  title="Tək uçma, müəllimlə yüksəl"
                  body="Öz müəllimini seç — sualların həmişə vaxtında cavablansın, irəliləyişin izlənsin, motivasiyanı itirmə."
                  cta="Müəllimləri gör"
                  onClick={() => setView("courses")}
                />
              </section>
            </Reveal>
            {/* ---------- Haqqımızda: qısa ---------- */}
            <Reveal delay={0.16}>
              <section style={{ ...portalStyles.section, marginTop: 26 }}>
                <h2 style={portalStyles.h2}>Haqqımızda</h2>
                <p style={portalStyles.body}>
                  Deutsch Akademie — Azərbaycanlı öyrənənlər üçün Goethe, TestDaF və telc
                  standartlarına uyğun hazırlanmış alman dili materialları yaradır.
                </p>
              </section>
            </Reveal>
          </>
        )}

        {view === "lessons" && (
          <Reveal>
            {!session && <GuestBanner setAuthModal={setAuthModal} text="Qonaq kimi A1-in ilk dərslərinə baxa bilərsən — davam etmək üçün qeydiyyatdan keç." />}
            <LessonsView topicsByLevel={topicsByLevel} isPremium={isPremium} isAdmin={isAdmin} setAuthModal={setAuthModal} setView={setView} session={session} profile={profile} initialLevel={jumpLevel} guestMode={!session} />
          </Reveal>
        )}

        {view === "adlercup" && (session ? <Reveal><AdlerCup session={session} profile={profile} isAdmin={isAdmin} /></Reveal> : <AuthRequired setAuthModal={setAuthModal} />)}
        {view === "dictionary" && (
          <Reveal>
            {!session && <GuestBanner setAuthModal={setAuthModal} text="Qonaq kimi gündə 10 axtarış edə bilərsən — limitsiz üçün qeydiyyatdan keç." />}
            <DictionaryView portalStyles={portalStyles} SectionHeader={SectionHeader} guestMode={!session} guestDailyLimit={10} />
          </Reveal>
        )}
        {view === "sozoyunu" && <Reveal><SozTapmacasi session={session} /></Reveal>}
        {view === "krossvord" && <Reveal><Krossvord portalStyles={portalStyles} SectionHeader={SectionHeader} session={session} /></Reveal>}
        {view === "nailiyyetler" && <Reveal><Nailiyyetlerim session={session} /></Reveal>}
        {view === "hoerverstehen" && (
          <Reveal>
            {!session && <GuestBanner setAuthModal={setAuthModal} text="Qonaq kimi 1 fəsli dinləyə bilərsən — tam kitabxana üçün qeydiyyatdan keç." />}
            <Hoerverstehen session={session} guestMode={!session} setAuthModal={setAuthModal} />
          </Reveal>
        )}
        {view === "oxuanlama" && (
          <Reveal>
            {!session && <GuestBanner setAuthModal={setAuthModal} text="Qonaq kimi 1-2 nümunə vahidə baxa bilərsən — tam kitabxana üçün qeydiyyatdan keç." />}
            <OxuAnlama session={session} guestMode={!session} setAuthModal={setAuthModal} />
          </Reveal>
        )}
        {view === "flashcards" && (
          <Reveal>
            {!session && <GuestBanner setAuthModal={setAuthModal} text="Qonaq kimi bir nümunə kartla tanış ola bilərsən — tam təcrübə üçün qeydiyyatdan keç." />}
            <Flashcards session={session} guestMode={!session} setAuthModal={setAuthModal} />
          </Reveal>
        )}

        {view === "books" && (session ? (
          <Reveal>
          <section style={portalStyles.section}>
            <SectionHeader type="books" desc="Çap materiallarımız, Gumroad üzərindən" />
            <p style={{ ...portalStyles.body, marginBottom: 20 }}>
              Hər səviyyə üçün ayrıca hazırlanmış qrammatika izahı və test toplusu. Gumroad üzərindən əldə edə bilərsən.
            </p>
            <div style={portalStyles.grid}>
              {BOOKS.map((b) => (
                <div key={b.key} style={{ ...portalStyles.card, padding: 0, overflow: "hidden" }}>
                  <img src={BOOK_COVERS[b.cover]} alt={b.title} style={portalStyles.bookCover} />
                  <div style={{ padding: 20 }}>
                    <h3 style={portalStyles.cardTitle}>{b.title}</h3>
                    <p style={portalStyles.cardText}>{b.desc}</p>
                    <a href={b.url} target="_blank" rel="noopener noreferrer" style={{ ...portalStyles.ctaLink, textDecoration: "none" }}>
                      Gumroad-da al <ChevronRight size={16} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
          </Reveal>
        ) : <AuthRequired setAuthModal={setAuthModal} />)}

        {view === "courses" && (session ? (
          <Reveal>
          <CoursesView portalStyles={portalStyles} SectionHeader={SectionHeader} LevelIcon={LevelIcon} regForm={regForm} setRegForm={setRegForm} regSent={regSent} setRegSent={setRegSent} onStartPlacementTest={onStartPlacementTest} session={session} refreshProfile={refreshProfile} />
          </Reveal>
        ) : <AuthRequired setAuthModal={setAuthModal} />)}

        {view === "contact" && (
          <Reveal>
          <section style={portalStyles.section}>
            <SectionHeader type="contact" desc="Suallarınız üçün bizimlə əlaqə saxlayın" />
            <p style={{ ...portalStyles.body, marginBottom: 20 }}>Suallarınız üçün bizimlə əlaqə saxlaya bilərsiniz.</p>
            <div style={{ display: "grid", gap: 10, maxWidth: 380, marginBottom: 28 }}>
              <a href="https://wa.me/994605114975" target="_blank" rel="noopener noreferrer" style={portalStyles.contactLine}>💬 WhatsApp: +994 60 511 49 75</a>
              <a href="mailto:asimalirzayev2@gmail.com" style={portalStyles.contactLine}>📧 asimalirzayev2@gmail.com</a>
              <a href="https://instagram.com/alirza.asim" target="_blank" rel="noopener noreferrer" style={portalStyles.contactLine}>📷 @alirza.asim</a>
              <div style={portalStyles.contactLine}>📍 Trier, Deutschland</div>
            </div>
            <ContactForm />
          </section>
          </Reveal>
        )}

        {view === "premium" && (
          <Reveal>
          <PremiumView portalStyles={portalStyles} session={session} profile={profile} isAdmin={isAdmin} isPremium={isPremium} refreshProfile={refreshProfile} setAuthModal={setAuthModal} onStart={onStart} />
          </Reveal>
        )}

        {view === "profile" && (
          <Reveal>
          <ProfileView portalStyles={portalStyles} SectionHeader={SectionHeader} AuthRequired={AuthRequired} session={session} profile={profile} isAdmin={isAdmin} isPremium={isPremium} />
          </Reveal>
        )}

        <footer style={portalStyles.footer}>© 2026 Asim Alirzayev — Deutsch Akademie</footer>
      </div>
    </div>
  );
}

const portalStyles = {
  promoHero: {
    width: "100%", display: "flex", alignItems: "center", gap: 14,
    padding: "18px 18px", borderRadius: 16, border: "none", cursor: "pointer",
    background: "linear-gradient(120deg, #00A896, #007A6C)",
    boxShadow: "0 8px 26px rgba(0,168,150,0.28)", textAlign: "left",
  },
  promoHeroIcon: { fontSize: 30, flexShrink: 0 },
  promoHeroTitle: {
    display: "block", fontFamily: "'Fraunces', serif", fontSize: 17.5, fontWeight: 700,
    color: "#F5F5DC", lineHeight: 1.3,
  },
  promoHeroSub: { display: "block", fontSize: 12.5, color: "rgba(245,245,220,0.82)", marginTop: 3 },
  promoBanner: {
    width: "100%", display: "flex", alignItems: "center", gap: 13,
    padding: "15px 16px", borderRadius: 14, border: "none", cursor: "pointer", textAlign: "left",
    boxShadow: "0 4px 16px rgba(0,51,102,0.14)",
  },
  promoIcon: { fontSize: 24, flexShrink: 0 },
  promoTitle: { display: "block", fontSize: 14.5, fontWeight: 800, color: "#F5F5DC", lineHeight: 1.35 },
  promoSub: { display: "block", fontSize: 11.5, color: "rgba(245,245,220,0.72)", marginTop: 2 },
  promoSmall: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center",
    padding: "16px 10px", borderRadius: 13, cursor: "pointer",
    background: "#FFFFFF", border: "1px solid rgba(42,61,60,0.12)",
  },
  promoSmallTitle: { fontSize: 12, fontWeight: 700, color: "#003366", lineHeight: 1.35 },
  avatarBtn: {
    position: "relative", width: 36, height: 36, borderRadius: "50%",
    background: "#EAEAD2", border: "1px solid rgba(42,61,60,0.14)",
    color: "#003366", fontWeight: 800, fontSize: 15, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  avatarDot: {
    position: "absolute", top: -2, right: -2, width: 11, height: 11,
    borderRadius: "50%", background: "#D4AF37", border: "2px solid #FFFFFF",
  },
  loginPill: {
    padding: "8px 16px", borderRadius: 20, border: "none",
    background: "#FF8C00", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer",
  },
  tabBar: {
    position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 40,
    display: "flex", background: "#FFFFFF",
    borderTop: "1px solid rgba(42,61,60,0.12)",
    padding: "6px 0 calc(6px + env(safe-area-inset-bottom))",
  },
  tabBtn: {
    flex: 1, background: "none", border: "none", cursor: "pointer",
    display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "2px 0",
  },
  tabIconWrap: {
    width: 46, height: 28, borderRadius: 14, display: "flex",
    alignItems: "center", justifyContent: "center", transition: "background .2s",
  },
  tabIconWrapActive: { background: "rgba(0,168,150,0.14)" },
  tabIcon: { fontSize: 17, lineHeight: 1, color: "rgba(42,61,60,0.5)", transition: "color .2s" },
  tabIconActive: { color: "#00A896" },
  tabLabel: { fontSize: 10, fontWeight: 700, color: "rgba(42,61,60,0.5)", transition: "color .2s" },
  tabLabelActive: { color: "#00A896" },
  sheetBackdrop: {
    position: "fixed", inset: 0, background: "rgba(0,51,102,0.28)", zIndex: 45,
  },
  sheet: {
    position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50,
    background: "#F5F5DC", borderRadius: "20px 20px 0 0",
    padding: "10px 16px calc(84px + env(safe-area-inset-bottom))",
    boxShadow: "0 -8px 34px rgba(0,51,102,0.18)",
    maxHeight: "78vh", overflowY: "auto",
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 3, background: "rgba(42,61,60,0.22)",
    margin: "0 auto 12px",
  },
  sheetTitle: {
    fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 700,
    color: "#003366", margin: "0 0 12px",
  },
  sheetGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 },
  sheetCard: {
    display: "flex", alignItems: "center", gap: 10, textAlign: "left",
    padding: "12px 12px", borderRadius: 13, cursor: "pointer",
    background: "#FFFFFF", border: "1px solid rgba(42,61,60,0.12)",
  },
  sheetCardActive: { borderColor: "#00A896", background: "rgba(0,168,150,0.07)" },
  sheetCardPremium: { border: "2px solid rgba(212,175,55,0.5)" },
  sheetCardProTag: { fontSize: 9.5, fontWeight: 800, color: "#D4AF37", letterSpacing: "0.03em" },
  sheetCardIcon: {
    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(0,168,150,0.1)", color: "#00A896",
  },
  sheetCardText: { display: "flex", flexDirection: "column", minWidth: 0 },
  sheetCardTitle: { fontSize: 13.5, fontWeight: 800, color: "#003366" },
  sheetCardSub: { fontSize: 10.5, color: "rgba(42,61,60,0.6)" },
  sheetDivider: { height: 1, background: "rgba(42,61,60,0.12)", margin: "16px 0 6px" },
  sheetRow: {
    width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
    background: "none", border: "none", cursor: "pointer",
    padding: "13px 4px", fontSize: 14.5, fontWeight: 600, color: "#2A3D3C", textAlign: "left",
  },
  page: {
    minHeight: "100vh", position: "relative", overflow: "hidden",
    background: "linear-gradient(160deg, #F5F5DC 0%, #EDEDD4 100%)",
    fontFamily: "'Inter', -apple-system, sans-serif", color: "#2A3D3C",
  },
  cursorGlow: { position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" },
  watermark: { position: "absolute", top: 0, left: 0, width: "100%", height: 240, opacity: 0.06, pointerEvents: "none" },
  cornerShapeBig: { position: "absolute", bottom: 0, left: 0, width: "48%", height: "50%", opacity: 0.16, pointerEvents: "none" },
  cornerShapeSmall: { position: "absolute", top: 0, right: 0, width: "40%", height: "38%", opacity: 0.14, pointerEvents: "none" },
  thinDiamond: {
    position: "absolute", top: "22%", right: "8%", width: 70, height: 70,
    border: "1.5px solid rgba(255,140,0,0.35)", transform: "rotate(45deg)", pointerEvents: "none",
  },
  thinSquare: {
    position: "absolute", bottom: "12%", right: "20%", width: 46, height: 46,
    border: "1.5px solid rgba(0,168,150,0.4)", transform: "rotate(12deg)", pointerEvents: "none",
  },
  blob: { position: "absolute", width: 380, height: 380, borderRadius: "50%", filter: "blur(85px)", opacity: 0.45, pointerEvents: "none" },
  angular: { position: "absolute", width: 130, height: 130, opacity: 0.28, filter: "blur(1px)", pointerEvents: "none", clipPath: "polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%)" },
  angularOutline: { position: "absolute", width: 80, height: 80, border: "2px solid rgba(0,168,150,0.4)", opacity: 0.6, pointerEvents: "none" },
  content: { position: "relative", zIndex: 1, maxWidth: 780, margin: "0 auto", padding: "calc(74px + env(safe-area-inset-top)) 20px calc(96px + env(safe-area-inset-bottom))" },
  hero: { textAlign: "center", padding: "48px 0 44px" },
  emblem: { display: "flex", justifyContent: "center", marginBottom: 18 },
  emblemRing: {
    width: 72, height: 72, borderRadius: "50%", objectFit: "cover",
    boxShadow: "0 0 0 4px rgba(255,140,0,0.2)",
  },
  title: { fontFamily: "'Fraunces', serif", fontSize: 52, margin: 0, fontWeight: 700, letterSpacing: -1.5, lineHeight: 1.05 },
  titleRule: { width: 64, height: 3, background: "#FF8C00", margin: "20px auto 0" },
  tagline: { opacity: 0.65, fontSize: 15, marginTop: 18, letterSpacing: 0.3 },
  streakBadge: { display: "inline-block", marginTop: 16, padding: "6px 14px", borderRadius: 999, background: "rgba(255,140,0,0.12)", border: "1px solid rgba(255,140,0,0.3)", fontSize: 12.5 },
  wordOfDayCard: {
    position: "relative", overflow: "hidden", display: "inline-block", marginTop: 18, padding: "18px 28px",
    borderRadius: 12, background: "rgba(0,168,150,0.06)", border: "1px solid rgba(0,168,150,0.3)", textAlign: "left",
    minWidth: 260,
  },
  cloverBg: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 140, height: 140, opacity: 0.08, pointerEvents: "none" },
  wordOfDayLabel: { fontSize: 11, opacity: 0.6, letterSpacing: 0.5 },
  wordOfDayTerm: { fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: "#00A896" },
  wordOfDayTrans: { display: "block", fontSize: 13, opacity: 0.75, marginTop: 2 },
  section: { marginBottom: 40 },
  h2: { fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700, color: "#003366", marginBottom: 14, letterSpacing: -0.5 },
  body: { lineHeight: 1.7, fontSize: 15.5, opacity: 0.75 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 },
  card: {
    position: "relative", overflow: "hidden", background: "rgba(255,255,255,0.85)", border: "1px solid rgba(42,61,60,0.12)",
    borderRadius: 4, padding: 24,
  },
  tiltGlow: {
    position: "absolute", inset: 0, opacity: 0, pointerEvents: "none",
    background: "radial-gradient(180px circle at var(--gx,50%) var(--gy,50%), rgba(255,140,0,0.15), transparent 70%)",
    transition: "opacity .2s",
  },
  cardCta: { border: "1px solid rgba(255,140,0,0.6)", background: "rgba(255,140,0,0.07)" },
  premiumHero: { textAlign: "center", padding: "10px 0 36px" },
  premiumCrown: {
    fontSize: 30, color: "#003366", width: 64, height: 64, borderRadius: "50%", margin: "0 auto 16px",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "radial-gradient(circle, rgba(0,51,102,0.18), transparent 70%)",
    border: "1.5px solid rgba(0,51,102,0.4)",
  },
  premiumTitle: { fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, margin: 0, color: "#003366" },
  premiumTagline: { opacity: 0.65, fontSize: 14.5, marginTop: 10 },
  premiumCard: {
    position: "relative", overflow: "hidden", borderRadius: 4, padding: 24,
    background: "linear-gradient(160deg, rgba(0,51,102,0.12), rgba(0,51,102,0.03))",
    border: "1px solid rgba(0,51,102,0.5)",
  },
  premiumSteps: { marginTop: 32, display: "grid", gap: 18 },
  premiumTable: { width: "100%", borderCollapse: "collapse", maxWidth: 460 },
  premiumTableHeadEmpty: { width: "45%" },
  premiumTableHead: { textAlign: "center", fontSize: 13, fontWeight: 700, padding: "10px 6px", borderBottom: "1px solid rgba(42,61,60,0.15)" },
  premiumTableLabel: { padding: "10px 6px", fontSize: 12.5, opacity: 0.75, borderBottom: "1px solid rgba(42,61,60,0.08)" },
  premiumTableVal: { padding: "10px 6px", fontSize: 12.5, textAlign: "center", borderBottom: "1px solid rgba(42,61,60,0.08)" },
  stepRow: { display: "flex", gap: 14, alignItems: "flex-start" },
  stepNum: {
    width: 28, height: 28, borderRadius: "50%", flexShrink: 0, fontSize: 13, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(0,51,102,0.15)", color: "#003366", border: "1px solid rgba(0,51,102,0.4)",
  },
  premiumCta: {
    display: "inline-block", textDecoration: "none", padding: "16px 40px", borderRadius: 8,
    background: "linear-gradient(135deg, #003366, #003366)", color: "#F5F5DC", fontWeight: 700, fontSize: 16,
    boxShadow: "0 0 24px rgba(0,51,102,0.3)", letterSpacing: 0.3,
  },
  premiumPerkBox: {
    borderRadius: 4, padding: "20px 22px",
    background: "rgba(255,255,255,0.85)", border: "1px solid rgba(42,61,60,0.1)",
  },
  premiumPerkTitle: { fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700, marginBottom: 8, marginTop: 0 },
  badgeCard: {
    width: 90, textAlign: "center", padding: "12px 8px", borderRadius: 8,
    background: "rgba(255,255,255,0.85)", border: "1px solid rgba(42,61,60,0.1)",
  },
  badgeLabel: { fontSize: 10.5, marginTop: 6, opacity: 0.85 },
  cardIcon: { fontSize: 24, marginBottom: 12 },
  bookCover: { width: "100%", display: "block", aspectRatio: "2/3", objectFit: "cover" },
  cardTitle: { fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 700, margin: "0 0 8px", position: "relative" },
  cardText: { fontSize: 13.5, opacity: 0.7, lineHeight: 1.5, margin: 0, position: "relative" },
  ctaLink: { display: "flex", alignItems: "center", gap: 4, marginTop: 12, color: "#FF8C00", fontSize: 13.5, fontWeight: 700, position: "relative" },
  teacherTableLabel: { padding: "8px 0", opacity: 0.6, width: "35%", borderBottom: "1px solid rgba(42,61,60,0.1)" },
  teacherTableVal: { padding: "8px 0", fontWeight: 600, borderBottom: "1px solid rgba(42,61,60,0.1)" },
  teacherAboutBox: {
    borderTop: "1px solid rgba(0,51,102,0.25)", borderBottom: "1px solid rgba(0,51,102,0.25)",
    padding: "16px 2px", marginBottom: 18,
  },
  teacherAboutLabel: { fontFamily: "'Fraunces', serif", fontSize: 13, color: "#003366", letterSpacing: 0.5, marginBottom: 8, fontWeight: 700 },
  teacherAboutText: { fontSize: 14, lineHeight: 1.7, opacity: 0.85, fontStyle: "italic", margin: 0 },
  contactLine: {
    display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8,
    background: "rgba(255,255,255,0.85)", border: "1px solid rgba(42,61,60,0.1)",
    color: "#2A3D3C", textDecoration: "none", fontSize: 13.5,
  },
  teacherRow: {
    display: "flex", alignItems: "center", gap: 16, width: "100%", textAlign: "left",
    padding: "12px 16px", borderRadius: 8, background: "rgba(255,255,255,0.85)",
    border: "1px solid rgba(42,61,60,0.1)", cursor: "pointer", fontFamily: "inherit",
  },
  teacherGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 16, maxWidth: 520 },
  teacherTile: {
    display: "block", textAlign: "center", padding: "26px 16px", borderRadius: 4, cursor: "pointer",
    background: "linear-gradient(160deg, rgba(0,51,102,0.08), rgba(0,51,102,0.02))",
    border: "1px solid rgba(0,51,102,0.3)", fontFamily: "inherit",
  },
  teacherEliteName: { fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 700, color: "#003366", letterSpacing: 0.2 },
  teacherHint: { fontSize: 11.5, color: "#003366", opacity: 0.65, marginTop: 6, letterSpacing: 0.3 },
  teacherEliteBio: {
    fontSize: 12.5, opacity: 0.7, marginTop: 6, fontStyle: "normal", lineHeight: 1.4,
    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
  },
  teacherAvatarWrap: { width: 46, height: 46, position: "relative", flexShrink: 0 },
  teacherAvatarDiamond: {
    position: "absolute", inset: 6, transform: "rotate(45deg)",
    background: "linear-gradient(135deg,#FF8C00,#003366)",
  },
  teacherAvatar: {
    position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
    color: "#F5F5DC", fontWeight: 700, fontSize: 15,
  },
  teacherName: { fontWeight: 700, fontSize: 15, fontFamily: "'Fraunces', serif" },
  teacherBioLine: { fontSize: 12.5, opacity: 0.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  levelPill: {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 999,
    border: "1px solid rgba(42,61,60,0.2)", background: "transparent", color: "#2A3D3C", cursor: "pointer",
    fontSize: 13.5, fontFamily: "inherit",
  },
  levelPillActive: { background: "#FF8C00", color: "#F5F5DC", fontWeight: 700, borderColor: "#FF8C00" },
  footer: { textAlign: "center", opacity: 0.4, fontSize: 12.5, marginTop: 20 },
  nav: {
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 39, display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "calc(10px + env(safe-area-inset-top)) 20px 10px", gap: 12, borderBottom: "1px solid rgba(42,61,60,0.10)", background: "#FFFFFF",
    boxShadow: "0 2px 10px rgba(0,51,102,0.05)",
  },
  navBrand: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" },
  navEmblem: { width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 },
  navBrandText: { fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700, letterSpacing: -0.3 },
  navLinks: { display: "flex", gap: 2, flexWrap: "wrap" },
  navGroupsWrap: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 },
  navGroup: {
    display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap",
    padding: "4px 10px 4px 6px", borderRadius: 999, background: "rgba(255,255,255,0.85)",
    border: "1px solid rgba(42,61,60,0.08)",
  },
  navGroupIcon: { fontSize: 13, opacity: 0.55, marginRight: 4 },
  hamburgerBtn: {
    background: "rgba(255,255,255,0.85)", border: "1px solid rgba(42,61,60,0.15)", borderRadius: 8,
    color: "#2A3D3C", width: 42, height: 38, fontSize: 18, cursor: "pointer", alignItems: "center", justifyContent: "center",
  },
  mobileMenuPanel: {
    position: "relative", zIndex: 5, display: "flex", flexDirection: "column", gap: 4,
    padding: "10px 20px 18px", borderBottom: "1px solid rgba(42,61,60,0.1)",
    background: "rgba(10,10,12,0.6)",
  },
  mobileMenuItem: {
    display: "block", width: "100%", textAlign: "left", padding: "12px 14px", borderRadius: 8,
    background: "rgba(255,255,255,0.85)", border: "1px solid rgba(42,61,60,0.08)", color: "#2A3D3C",
    fontSize: 14.5, cursor: "pointer", fontFamily: "inherit",
  },
  mobileMenuItemActive: { background: "rgba(255,140,0,0.15)", borderColor: "rgba(255,140,0,0.4)", color: "#FF8C00", fontWeight: 700 },
  mobileMenuDivider: { height: 1, background: "rgba(42,61,60,0.1)", margin: "6px 0" },
  navLink: { background: "none", border: "none", color: "rgba(42,61,60,0.6)", fontSize: 13.5, padding: "8px 12px", borderRadius: 4, cursor: "pointer" },
  navLinkActive: { background: "rgba(255,140,0,0.14)", color: "#FF8C00", fontWeight: 700 },
  pill: { padding: "8px 18px", borderRadius: 4, border: "1px solid rgba(42,61,60,0.2)", background: "transparent", color: "#2A3D3C", cursor: "pointer", fontSize: 14 },
  pillActive: { background: "#FF8C00", color: "#F5F5DC", fontWeight: 700, borderColor: "#FF8C00" },
  input: { width: "100%", padding: "12px 14px", borderRadius: 4, border: "1px solid rgba(42,61,60,0.2)", background: "#FFFFFF", color: "#2A3D3C", fontSize: 14.5, boxSizing: "border-box", caretColor: "#2A3D3C" },
  primaryBtn: { background: "#FF8C00", color: "#F5F5DC", border: "none", borderRadius: 4, padding: "12px 22px", fontWeight: 700, fontSize: 14.5, cursor: "pointer" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 },
  modalBox: { background: "#EDEDD4", border: "1px solid rgba(255,140,0,0.25)", borderRadius: 12, padding: 28, width: "100%", maxWidth: 360, position: "relative" },
  modalClose: { position: "absolute", top: 14, right: 14, background: "none", border: "none", color: "rgba(42,61,60,0.6)", fontSize: 16, cursor: "pointer" },
  linkBtn: { background: "none", border: "none", color: "#FF8C00", fontWeight: 700, cursor: "pointer", padding: 0, fontSize: 13 },
  googleBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%",
    padding: "11px 14px", borderRadius: 8, background: "#fff", color: "#3c4043",
    border: "1px solid rgba(0,0,0,0.1)", fontSize: 14, fontWeight: 600, textDecoration: "none",
    boxSizing: "border-box",
  },
  orDivider: {
    display: "flex", alignItems: "center", textAlign: "center", margin: "14px 0",
    color: "rgba(42,61,60,0.4)", fontSize: 12,
  },
  premiumDot: { color: "#D4AF37", marginLeft: 4 },
  gatePrompt: { textAlign: "center", padding: "60px 20px", opacity: 0.9 },
  botFab: {
    position: "relative", width: 54, height: 54, borderRadius: "50%",
    background: "#00A896", color: "#F5F5DC", border: "none", fontSize: 22, cursor: "pointer",
    boxShadow: "0 4px 18px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center",
  },
  botFabWrap: {
    position: "fixed", right: 18, zIndex: 35, width: 54, height: 54,
    bottom: "calc(84px + env(safe-area-inset-bottom))",
  },
  crownBadge: {
    position: "absolute", top: -14, left: "50%", transform: "translateX(-50%) rotate(0deg)",
    pointerEvents: "none", zIndex: 1,
  },
  botPanel: {
    position: "fixed", bottom: 86, right: 22, zIndex: 40, width: 300, maxHeight: "60vh", overflowY: "auto",
    background: "#EDEDD4", border: "1px solid rgba(255,140,0,0.3)", borderRadius: 12,
    boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
  },
  botHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px",
    borderBottom: "1px solid rgba(42,61,60,0.1)", fontWeight: 700, fontSize: 14,
  },
  botClose: { background: "none", border: "none", color: "rgba(42,61,60,0.6)", cursor: "pointer", fontSize: 14 },
  botBody: { padding: 14 },
  botFaqBtn: {
    display: "block", width: "100%", textAlign: "left", padding: "9px 10px", marginBottom: 6, borderRadius: 6,
    background: "rgba(255,255,255,0.85)", border: "1px solid rgba(42,61,60,0.08)", color: "#2A3D3C",
    fontSize: 12.8, cursor: "pointer", fontFamily: "inherit",
  },
  botBack: { background: "none", border: "none", color: "#FF8C00", fontSize: 12.5, cursor: "pointer", padding: 0, marginBottom: 10 },
  botAnswerQ: { fontWeight: 700, fontSize: 13.5, marginBottom: 8 },
  botAnswerA: { fontSize: 13, lineHeight: 1.6, opacity: 0.85 },
  lessonCard: { background: "rgba(255,255,255,0.85)", border: "1px solid rgba(42,61,60,0.12)", borderRadius: 4, overflow: "hidden" },
  lessonHeader: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", color: "#2A3D3C", padding: "14px 16px", fontSize: 14.5, cursor: "pointer", textAlign: "left" },
  lessonBody: {
    whiteSpace: "pre-wrap", fontFamily: "'Inter', sans-serif", fontSize: 13.5, lineHeight: 1.7,
    padding: "0 16px 18px", margin: 0, opacity: 0.85, borderTop: "1px solid rgba(42,61,60,0.08)", paddingTop: 14,
  },
  lessonBodyWrap: {},
  vocabBox: { margin: "0 16px 18px", padding: 16, background: "rgba(255,140,0,0.06)", border: "1px solid rgba(255,140,0,0.25)", borderRadius: 4 },
  vocabTitle: { fontSize: 13, fontWeight: 700, color: "#FF8C00" },
  pdfLink: {
    display: "inline-flex", alignItems: "center", gap: 8, margin: "0 16px 18px", padding: "11px 18px",
    background: "linear-gradient(135deg, rgba(212,175,55,0.14), rgba(212,175,55,0.05))",
    border: "1px solid rgba(212,175,55,0.55)", borderRadius: 8,
    color: "#003366", fontSize: 13.5, fontWeight: 700, textDecoration: "none",
    letterSpacing: 0.2, boxShadow: "0 0 14px rgba(212,175,55,0.12)",
  },
  pdfLinkLocked: {
    display: "inline-flex", alignItems: "center", gap: 8, margin: "0 16px 18px", padding: "11px 18px",
    background: "rgba(255,255,255,0.85)", border: "1px dashed rgba(42,61,60,0.25)", borderRadius: 8,
    color: "rgba(42,61,60,0.55)", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  },
  authRequiredBox: {
    textAlign: "center", padding: "50px 20px", background: "rgba(255,255,255,0.85)",
    border: "1px solid rgba(255,140,0,0.2)", borderRadius: 14,
  },
  secondaryBtnLight: {
    background: "transparent", color: "#2A3D3C", border: "1px solid rgba(42,61,60,0.3)",
    borderRadius: 8, padding: "12px 22px", fontSize: 14.5, cursor: "pointer",
  },
  dictRow: { background: "rgba(255,255,255,0.85)", borderRadius: 4, padding: "10px 14px", borderLeft: "3px solid #FF8C00" },
  dictTerm: { fontWeight: 700, fontSize: 14.5 },
  dictTrans: { fontSize: 13, opacity: 0.7, marginTop: 2 },
  speakBtn: {
    background: "rgba(255,140,0,0.1)", border: "1px solid rgba(255,140,0,0.3)", borderRadius: "50%",
    width: 34, height: 34, fontSize: 15, cursor: "pointer", flexShrink: 0,
  },
};

function CircularScore({ value, color, tier = 1 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const duration = 1000;
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * value));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const r = 54, c = 2 * Math.PI * r;
  const offset = c - (display / 100) * c;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" style={{ margin: "0 auto", display: "block", position: "relative" }}>
      {tier >= 4 && (
        <circle cx="70" cy="70" r={r + 8} fill="none" stroke="#2A3D3C" strokeWidth="1" strokeDasharray="2 6" opacity="0.5">
          <animateTransform attributeName="transform" type="rotate" from="0 70 70" to="360 70 70" dur="12s" repeatCount="indefinite" />
        </circle>
      )}
      <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="10" />
      <circle
        cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        transform="rotate(-90 70 70)" style={{ transition: "stroke-dashoffset .1s linear" }}
      />
      <text x="70" y="78" textAnchor="middle" fontSize="30" fontWeight="700" fill="#2A3D3C" fontFamily="'Fraunces', serif">
        {display}%
      </text>
    </svg>
  );
}

const SECTION_THEME = {
  lessons: { color: "#FF8C00", soft: "rgba(255,140,0,0.14)", label: "Dərslər" },
  dictionary: { color: "#4FC3E8", soft: "rgba(79,195,232,0.14)", label: "Lüğət" },
  books: { color: "#B98CE8", soft: "rgba(185,140,232,0.14)", label: "Kitablar" },
  courses: { color: "#6FD19A", soft: "rgba(111,209,154,0.14)", label: "Kurslar" },
  contact: { color: "#E86C8C", soft: "rgba(232,108,140,0.14)", label: "Əlaqə" },
  quiz: { color: "#FF8C00", soft: "rgba(255,140,0,0.14)", label: "Özünü Yoxla" },
  premium: { color: "#003366", soft: "rgba(0,51,102,0.14)", label: "Profilim" },
  krossvord: { color: "#00A896", soft: "rgba(0,168,150,0.14)", label: "Krossvord" },
};

function SectionIcon({ type, size = 24, color = "currentColor" }) {
  const s = { width: size, height: size, display: "block" };
  switch (type) {
    case "lessons":
      return (
        <svg viewBox="0 0 24 24" style={s} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5.5c2.2-1 5-1 8 0v13c-3-1-5.8-1-8 0v-13Z" />
          <path d="M20 5.5c-2.2-1-5-1-8 0v13c3-1 5.8-1 8 0v-13Z" />
        </svg>
      );
    case "dictionary":
      return (
        <svg viewBox="0 0 24 24" style={s} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="12" height="16" rx="1.5" />
          <path d="M7.5 8.5h5M7.5 12h5" />
          <circle cx="17" cy="17" r="3" />
          <path d="M19.3 19.3 21 21" />
        </svg>
      );
    case "books":
      return (
        <svg viewBox="0 0 24 24" style={s} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3.5" y="8" width="4.5" height="12" rx="0.8" />
          <rect x="9.5" y="5" width="4.5" height="15" rx="0.8" />
          <rect x="15.5" y="9" width="4.5" height="11" rx="0.8" />
        </svg>
      );
    case "courses":
      return (
        <svg viewBox="0 0 24 24" style={s} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3 2 8l10 5 10-5-10-5Z" />
          <path d="M6 10.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-5.5" />
        </svg>
      );
    case "contact":
      return (
        <svg viewBox="0 0 24 24" style={s} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5.5" width="18" height="13" rx="1.8" />
          <path d="M3.5 6.5 12 13l8.5-6.5" />
        </svg>
      );
    case "quiz":
      return (
        <svg viewBox="0 0 24 24" style={s} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.2 9.5a2.8 2.8 0 1 1 3.9 2.6c-.9.4-1.1.9-1.1 1.7" />
          <circle cx="12" cy="17" r="0.15" fill={color} stroke="none" />
        </svg>
      );
    case "krossvord":
      return (
        <svg viewBox="0 0 24 24" style={s} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />
          <path d="M9 3.5v17M15 3.5v17M3.5 9h17M3.5 15h17" />
        </svg>
      );
    default:
      return null;
  }
}

function IconBadge({ type, size = 44 }) {
  const t = SECTION_THEME[type];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: t.soft,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <SectionIcon type={type} size={Math.round(size * 0.5)} color={t.color} />
    </div>
  );
}

function SectionHeader({ type, desc }) {
  const t = SECTION_THEME[type];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
      <IconBadge type={type} size={48} />
      <div>
        <h2 style={{ ...portalStyles.h2, marginBottom: desc ? 2 : 0, color: t.color }}>{t.label}</h2>
        {desc && <p style={{ margin: 0, fontSize: 13, opacity: 0.6 }}>{desc}</p>}
      </div>
    </div>
  );
}

function EleganceOrnament({ tier, color }) {
  if (tier <= 1) return null;
  const opacity = 0.25 + tier * 0.1;
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" style={{ position: "absolute", top: 0, right: 0, pointerEvents: "none", opacity }}>
      <path d="M90 0 L90 40 Q90 10 60 10 L90 10 Z" fill={color} opacity="0.5" />
      {tier >= 3 && <circle cx="72" cy="18" r="2.5" fill={color} />}
      {tier >= 3 && <path d="M90 22 Q60 22 50 45" stroke={color} strokeWidth="1" fill="none" opacity="0.6" />}
      {tier >= 4 && <circle cx="50" cy="45" r="2" fill="#2A3D3C" />}
      {tier >= 4 && <path d="M90 30 Q70 30 65 55" stroke="#2A3D3C" strokeWidth="0.75" fill="none" opacity="0.7" />}
    </svg>
  );
}

function ReportIssue({ questionId }) {
  const [state, setState] = useState("idle"); // idle | sent
  if (state === "sent") {
    return <div style={{ ...styles.reportLink, color: "#00A896" }}>✓ Təşəkkürlər, qeyd olundu</div>;
  }
  return (
    <button onClick={() => setState("sent")} style={styles.reportLink}>
      ⚑ Bu sualda səhv var kimi görünür?
    </button>
  );
}

function Shell({ children, wide }) {
  return (
    <div style={{ ...styles.page }}>
      <style>{`
        button {
          -webkit-tap-highlight-color: transparent;
          -webkit-appearance: none;
          appearance: none;
          outline: none;
        }
        button:focus, button:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px rgba(201,161,90,0.45);
        }
        textarea, input {
          -webkit-tap-highlight-color: transparent;
        }
        @keyframes daShake { 10%,90% { transform: translateX(-2px); } 20%,80% { transform: translateX(3px); } 30%,50%,70% { transform: translateX(-5px); } 40%,60% { transform: translateX(5px); } }
        @keyframes daPulse { 0% { box-shadow: 0 0 0 0 rgba(0,168,150,0.45); } 70% { box-shadow: 0 0 0 9px rgba(0,168,150,0); } 100% { box-shadow: 0 0 0 0 rgba(0,168,150,0); } }
        @keyframes daPop { from { transform: scale(0.94); opacity: 0.4; } to { transform: scale(1); opacity: 1; } }
        .da-option { transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease, background .15s ease; }
        .da-option:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(42,61,60,0.12); }
        .da-option:active { transform: translateY(0) scale(0.98); }
        .da-review-row { animation: daPop .35s cubic-bezier(.34,1.56,.64,1) backwards; }
        .da-review-right { animation: daPop .35s cubic-bezier(.34,1.56,.64,1) backwards, daPulse .7s ease-out .35s; }
        .da-review-wrong { animation: daPop .35s cubic-bezier(.34,1.56,.64,1) backwards, daShake .45s ease-in-out .35s; }
      `}</style>
      <div style={{ ...styles.container, maxWidth: wide ? 640 : 460 }}>{children}</div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #F5F5DC 0%, #EDEDD4 100%)",
    color: "#2A3D3C",
    fontFamily: "'Inter', -apple-system, sans-serif",
    display: "flex",
    justifyContent: "center",
    padding: "32px 16px",
  },
  container: { width: "100%" },
  h1: { fontFamily: "'Fraunces', serif", fontSize: 34, margin: 0, fontWeight: 700, letterSpacing: -1 },
  h2: { fontFamily: "'Fraunces', serif", fontSize: 24, marginBottom: 4, fontWeight: 700 },
  h3: { fontFamily: "'Fraunces', serif", fontSize: 17, color: "#FF8C00", marginBottom: 10 },
  sub: { opacity: 0.7, fontSize: 14, marginTop: 4 },
  label: { fontSize: 13, opacity: 0.75, marginBottom: 6, display: "block" },
  input: {
    width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid rgba(255,140,0,0.25)",
    background: "#FFFFFF", color: "#2A3D3C", fontSize: 15, outline: "none", boxSizing: "border-box", caretColor: "#2A3D3C",
  },
  card: {
    background: "rgba(255,255,255,0.85)", border: "1px solid rgba(42,61,60,0.12)", borderRadius: 10,
    padding: "16px 14px", color: "#2A3D3C", cursor: "pointer", textAlign: "left", transition: "border-color .2s, background .2s",
  },
  cardActive: { borderColor: "#FF8C00", background: "rgba(255,140,0,0.1)" },
  cardGold: { background: "rgba(255,140,0,0.1)", borderColor: "#FF8C00" },
  pill: {
    padding: "8px 18px", borderRadius: 999, border: "1px solid rgba(42,61,60,0.2)",
    background: "transparent", color: "#2A3D3C", cursor: "pointer",
  },
  pillActive: { background: "#FF8C00", color: "#F5F5DC", fontWeight: 700, borderColor: "#FF8C00" },
  primaryBtn: {
    background: "#FF8C00", color: "#F5F5DC", border: "none", borderRadius: 8, padding: "12px 22px",
    fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, justifyContent: "center",
  },
  secondaryBtn: {
    background: "transparent", color: "#2A3D3C", border: "1px solid rgba(42,61,60,0.25)", borderRadius: 8,
    padding: "12px 22px", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
  },
  backBtn: { background: "none", border: "none", color: "#FF8C00", display: "flex", alignItems: "center", gap: 4, cursor: "pointer", marginBottom: 14, fontSize: 14, padding: 0 },
  testHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 },
  exitBtn: { background: "none", border: "none", color: "rgba(42,61,60,0.5)", display: "flex", alignItems: "center", gap: 2, cursor: "pointer", fontSize: 13, padding: 0 },
  progressTrack: { height: 3, background: "rgba(255,255,255,0.85)", borderRadius: 4, marginTop: 10 },
  progressFill: { height: 3, background: "linear-gradient(90deg, #FF8C00, #FFD580)", borderRadius: 4, transition: "width .4s cubic-bezier(.2,.7,.3,1)" },
  questionCard: {
    background: "rgba(255,255,255,0.85)", border: "1px solid rgba(42,61,60,0.1)", borderRadius: 14,
    padding: "26px 22px", marginTop: 4,
  },
  question: { fontSize: 19, marginBottom: 20, lineHeight: 1.55, fontWeight: 500, color: "#2A3D3C" },
  option: {
    padding: "14px 16px", borderRadius: 9, border: "1px solid rgba(42,61,60,0.14)", background: "rgba(255,255,255,0.85)",
    color: "#2A3D3C", textAlign: "left", cursor: "pointer", fontSize: 15, transition: "border-color .15s, background .15s, transform .1s",
  },
  optionActive: { borderColor: "#FF8C00", background: "rgba(255,140,0,0.12)" },
  reportLink: { background: "none", border: "none", color: "rgba(42,61,60,0.35)", fontSize: 12, cursor: "pointer", padding: 0, marginTop: 18 },
  textarea: {
    width: "100%", minHeight: 90, padding: 12, borderRadius: 8, border: "1px solid rgba(255,140,0,0.25)",
    background: "#FFFFFF", color: "#2A3D3C", fontSize: 15, boxSizing: "border-box", fontFamily: "inherit", caretColor: "#2A3D3C",
  },
  statRow: { display: "flex", alignItems: "center", gap: 10 },
  statTrack: { flex: 1, height: 8, background: "rgba(255,255,255,0.85)", borderRadius: 8, overflow: "hidden" },
  statFill: { height: 8, borderRadius: 8, transition: "width 1s cubic-bezier(.2,.7,.3,1)" },
  reviewRow: { background: "rgba(255,255,255,0.85)", borderRadius: 6, padding: "8px 12px" },
  adBox: { background: "rgba(255,140,0,0.06)", border: "1px solid rgba(255,140,0,0.2)", borderRadius: 12, padding: 18 },
};

/* ========================= ADMIN PANEL ========================= */

function NotFoundPage() {
  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(160deg, #F5F5DC 0%, #EDEDD4 100%)",
      color: "#2A3D3C", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center",
    }}>
      <img src={LOGO_URL} alt="Deutsch Akademie" style={{ width: 64, height: 64, borderRadius: "50%", marginBottom: 20 }} />
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 40, margin: "0 0 8px", color: "#FF8C00" }}>404</h1>
      <p style={{ fontSize: 16, opacity: 0.75, marginBottom: 24 }}>Bu səhifə tapılmadı.</p>
      <a href="/" style={{
        background: "#FF8C00", color: "#F5F5DC", textDecoration: "none", fontWeight: 700,
        padding: "12px 28px", borderRadius: 8, fontSize: 14.5,
      }}>Ana səhifəyə qayıt</a>
    </div>
  );
}

export default function App() {
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  const isAdmin = path.startsWith("/admin");
  const isKnownPath = path === "/" || path === "" || isAdmin;
  if (isAdmin) return <AdminPanel />;
  if (!isKnownPath) return <NotFoundPage />;
  return (
    <LanguageProvider>
      <InnerApp />
    </LanguageProvider>
  );
}
