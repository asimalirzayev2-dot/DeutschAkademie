import React, { useState, useEffect, useRef, useMemo } from "react";
import { Clock, ChevronRight, ChevronLeft, RotateCcw, Home, BookOpen, Crown, Bird } from "lucide-react";
import emailjs from "@emailjs/browser";
import { sb, sbInsert, adminLogin, sbAuth, sbAuthPatch, sbAuthInsert, signUp, verifyGumroadLicense, pdfUrl, resetPasswordRequest, updatePasswordWithToken, fetchOAuthUser, getGoogleLoginUrl } from "./supabase";
import AdminPanel from "./AdminPanel";
import DictionaryView from "./DictionaryView";
import { speakGerman, exportAnki } from "./utils";
import { useReveal } from "./hooks";
import { LOGO_URL, BOOK_COVERS } from "./assets";





const OPEN_QUESTIONS = [
  { id: "o-a1", level: "A1", topic: "Vorstellung", q: "Stell dich in 1-2 Sätzen auf Deutsch vor (Name, Herkunft).", keywords: ["ich heiße", "ich komme", "ich bin"] },
  { id: "o-a2", level: "A2", topic: "Perfekt", q: "Schreibe einen Satz im Perfekt über dein Wochenende.", keywords: ["habe", "bin", "gemacht", "gegangen", "gespielt", "gefahren"] },
  { id: "o-b1", level: "B1", topic: "Nebensatz", q: "Bilde einen Satz mit 'weil' oder 'obwohl'.", keywords: ["weil", "obwohl"] },
  { id: "o-b2", level: "B2", topic: "Konjunktiv II", q: "Was würdest du tun, wenn du reich wärst? (ein Satz)", keywords: ["würde", "wäre"] },
];

const LEVELS = ["A1", "A2", "B1", "B2"];

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

const EMAILJS_SERVICE_ID = "service_of1yxem";
const EMAILJS_TEMPLATE_ID = "template_v9dlqkr";
const EMAILJS_PUBLIC_KEY = "b6SjySURlpnS4qK7g";

function notifyTeacher({ teacherEmail, teacherName, studentName, studentPhone, studentLevel }) {
  if (!teacherEmail) return;
  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    to_email: teacherEmail,
    to_name: teacherName,
    student_name: studentName,
    student_phone: studentPhone,
    student_level: studentLevel,
  }, { publicKey: EMAILJS_PUBLIC_KEY }).catch(() => {});
}
const PASS_THRESHOLD = 60; // % — TELC-tərzi keçid həddi

/* ---------- helpers ---------- */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function shuffleOptions(mc) {
  const idx = shuffle(mc.options.map((_, i) => i));
  return {
    ...mc,
    options: idx.map((i) => mc.options[i]),
    correct: idx.indexOf(mc.correct),
  };
}
const LEVEL_ACCENT = {
  A1: { accent: "#FF9F1C", soft: "rgba(255,159,28,0.14)", tier: 1 },
  A2: { accent: "#F4B84D", soft: "rgba(244,184,77,0.16)", tier: 2 },
  B1: { accent: "#EFCE86", soft: "rgba(239,206,134,0.18)", tier: 3 },
  B2: { accent: "#F3E4B8", soft: "rgba(243,228,184,0.22)", tier: 4 },
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
  if (pct >= 60) return { de: "Befriedigend", color: "#C9A15A" };
  if (pct >= 50) return { de: "Ausreichend", color: "#D9A75A" };
  return { de: "Nicht bestanden", color: "#C97B6E" };
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

  async function refreshProfile(sess) {
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
              style={{ ...styles.card, ...styles.cardGold, gridColumn: "span 2", border: "1px solid rgba(232,199,102,0.6)", background: "linear-gradient(135deg, rgba(232,199,102,0.12), rgba(232,199,102,0.04))" }}
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

        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0", color: "#C9A15A" }}>
          <Clock size={18} /> <span>Vaxt həddi: 45 dəqiqə</span>
        </div>

        {limitMsg && <p style={{ color: "#E8C766", fontSize: 13.5, marginBottom: 14 }}>{limitMsg}</p>}
        <button onClick={startTest} style={styles.primaryBtn}>Başla</button>
      </Shell>
    );
  }

  if (screen === "test" && !finished) {
    const q = questions[current];
    if (!q) return <Shell><p>Sual tapılmadı.</p></Shell>;
    const theme = mode === "bonus"
      ? { accent: "#E8C766", soft: "rgba(232,199,102,0.16)", tier: 4 }
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
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: timeLeft < 300 ? "#C97B6E" : theme.accent, transition: "color .4s" }}>
            <Clock size={16} /> {fmtTime(timeLeft)}
          </span>
        </div>
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${((current + 1) / questions.length) * 100}%`, background: `linear-gradient(90deg, ${theme.accent}, #FFF6E0)` }} />
        </div>

        <div key={q.id} className="q-card" style={{ ...styles.questionCard, margin: "20px 0", borderColor: theme.soft, position: "relative", overflow: "hidden" }}>
          <EleganceOrnament tier={theme.tier} color={theme.accent} />
          <div style={{ fontSize: 12, color: theme.accent, marginBottom: 10, fontWeight: 600, letterSpacing: 0.3, transition: "color .4s" }}>
            {mode === "bonus" ? `✦ Premium Bonus · ${CATEGORY_LABEL[q.topic] || q.topic}` : `${q.level} · ${q.topic}`}
          </div>
          {q.passage && (
            <div style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(247,241,230,0.1)", borderRadius: 8,
              padding: "14px 16px", marginBottom: 16, fontSize: 14, lineHeight: 1.7, opacity: 0.9,
            }}>
              {q.topic === "listening" && (
                <button
                  onClick={() => speakGerman(q.passage)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 10, padding: "6px 14px",
                    borderRadius: 20, background: "rgba(232,199,102,0.15)", border: "1px solid rgba(232,199,102,0.4)",
                    color: "#E8C766", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
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
                <button key={i} onClick={() => setAnswers({ ...answers, [q.id]: i })}
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
            <p style={{ marginTop: 16, color: "#C9A15A" }}>Nəticə hesablanır...</p>
            <style>{`@keyframes spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }`}</style>
          </div>
        ) : (
          <div>
            <div style={{ textAlign: "center", padding: "20px 0 30px", position: "relative" }}>
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
                {results.reviewList.map((r) => (
                  <div key={r.i} style={{ ...styles.reviewRow, borderLeft: `3px solid ${r.ok ? "#6FA787" : "#C97B6E"}` }}>
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, color: "#C9A15A" }}>
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
        <g fill="#2FBFA0">
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
            background: m.role === "user" ? "rgba(255,159,28,0.1)" : "rgba(232,199,102,0.08)",
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

function GrowingTree({ progress, completedDays, totalDays, T }) {
  const trunkH = 40 + progress * 90;
  const branches = Math.max(2, Math.round(progress * 9) + 2);
  const baseX = 140, baseY = 190;
  const leaves = [];
  for (let i = 0; i < branches; i++) {
    const t = i / Math.max(1, branches - 1);
    const branchY = baseY - trunkH * (0.25 + 0.7 * t);
    const side = i % 2 === 0 ? 1 : -1;
    const length = 28 + t * 34;
    const endX = baseX + side * length;
    const endY = branchY - length * 0.4;
    const color = i % 3 === 0 ? "#FF9F1C" : "#2FBFA0";
    const r = 9 + t * 7;
    leaves.push({ branchY, endX, endY, color, r });
  }
  return (
    <div style={{ textAlign: "center", marginBottom: 18 }}>
      <svg viewBox="0 0 280 210" width="100%" height="150" style={{ maxWidth: 260 }}>
        <line x1="20" y1={baseY} x2="260" y2={baseY} stroke="rgba(247,241,230,0.15)" strokeWidth="2" />
        <line x1={baseX} y1={baseY} x2={baseX} y2={baseY - trunkH} stroke="#8A6A4A" strokeWidth="8" strokeLinecap="round" />
        {leaves.map((l, i) => (
          <g key={i}>
            <line x1={baseX} y1={l.branchY} x2={l.endX} y2={l.endY} stroke="#8A6A4A" strokeWidth="4" strokeLinecap="round" />
            <circle cx={l.endX} cy={l.endY} r={l.r} fill={l.color} />
          </g>
        ))}
      </svg>
      <p style={{ fontSize: 12.5, color: T.textSoft, margin: "4px 0 0" }}>{completedDays} / {totalDays} gün tamamlandı</p>
    </div>
  );
}

function LessonPathView({ session, profile }) {
  const [level, setLevel] = useState("A1");
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState({});
  const [dailyAdvances, setDailyAdvances] = useState(0);
  const [openLesson, setOpenLesson] = useState(null);
  const [quizQs, setQuizQs] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizResult, setQuizResult] = useState(null);
  const [shared, setShared] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const T = {
    bg: "#191510", card: "rgba(255,255,255,0.035)", border: "rgba(47,191,160,0.28)",
    accent: "#2FBFA0", accentSoft: "rgba(47,191,160,0.14)",
    warm: "#FF9F1C", warmSoft: "rgba(255,159,28,0.14)",
    text: "#F7F1E6", textSoft: "rgba(247,241,230,0.65)",
  };

  useEffect(() => {
    if (!session) return;
    sb(`lessons?level=eq.${level}&select=level,num,title,content,day_number`)
      .then((rows) => setLessons(rows.sort((a, b) => parseInt(a.num) - parseInt(b.num))))
      .catch(() => setLessons([]));
    sbAuth(`user_lesson_progress?user_id=eq.${session.user.id}&level=eq.${level}&select=lesson_num,passed,best_score`, session.access_token)
      .then((rows) => {
        const map = {};
        rows.forEach((r) => { map[r.lesson_num] = r; });
        setProgress(map);
      }).catch(() => setProgress({}));
    sbAuth(`user_daily_lessons?user_id=eq.${session.user.id}&lesson_date=eq.${today}&select=lessons_completed`, session.access_token)
      .then((rows) => setDailyAdvances(rows[0]?.lessons_completed || 0))
      .catch(() => setDailyAdvances(0));
  }, [level, session]);

  if (!session) return <AuthRequired setAuthModal={() => {}} />;

  const days = (() => {
    const map = {};
    lessons.forEach((l) => {
      const d = l.day_number || 0;
      if (!map[d]) map[d] = [];
      map[d].push(l);
    });
    return Object.keys(map).map(Number).sort((a, b) => a - b).map((d) => ({ day: d, lessons: map[d] }));
  })();

  function isDayFullyPassed(dayLessons) {
    return dayLessons.every((l) => progress[l.num]?.passed);
  }
  function isDayUnlocked(dayIdx) {
    if (dayIdx === 0) return true;
    return isDayFullyPassed(days[dayIdx - 1].lessons);
  }

  async function startQuiz(lessonNum) {
    const rows = await sb(`lesson_questions?level=eq.${level}&lesson_num=eq.${lessonNum}&select=id,category,question,option_a,option_b,option_c,correct&limit=100`);
    const letterToIdx = { A: 0, B: 1, C: 2 };
    const pool = rows.map((r) => ({
      id: r.id, q: r.question, options: [r.option_a, r.option_b, r.option_c],
      correct: letterToIdx[r.correct] ?? 0,
    }));
    const picked = shuffle(pool).slice(0, 20).map((q) => shuffleOptions(q));
    setQuizQs({ lessonNum, questions: picked });
    setQuizAnswers({});
    setQuizIdx(0);
    setQuizResult(null);
    setShared(false);
  }

  async function finishQuiz() {
    const { lessonNum, questions } = quizQs;
    let correctCount = 0;
    questions.forEach((q, i) => { if (quizAnswers[i] === q.correct) correctCount++; });
    const pct = Math.round((correctCount / questions.length) * 100);
    const passed = pct >= 75;
    const wasAlreadyPassed = !!progress[lessonNum]?.passed;

    await sbAuthInsert("user_lesson_progress", session.access_token, {
      user_id: session.user.id, level, lesson_num: lessonNum,
      passed: passed || wasAlreadyPassed, best_score: Math.max(pct, progress[lessonNum]?.best_score || 0),
      attempts: (progress[lessonNum]?.attempts || 0) + 1,
    }).catch(() => {
      sbAuthPatch(`user_lesson_progress?user_id=eq.${session.user.id}&level=eq.${level}&lesson_num=eq.${lessonNum}`, session.access_token, {
        passed: passed || wasAlreadyPassed, best_score: Math.max(pct, progress[lessonNum]?.best_score || 0),
        attempts: (progress[lessonNum]?.attempts || 0) + 1,
      }).catch(() => {});
    });

    const newProgress = { ...progress, [lessonNum]: { passed: passed || wasAlreadyPassed, best_score: Math.max(pct, progress[lessonNum]?.best_score || 0) } };
    setProgress(newProgress);

    // Check if this pass just completed a whole day-block for the first time
    if (passed && !wasAlreadyPassed) {
      const dayOfThisLesson = lessons.find((l) => l.num === lessonNum)?.day_number;
      const dayLessons = lessons.filter((l) => l.day_number === dayOfThisLesson);
      const dayNowComplete = dayLessons.every((l) => newProgress[l.num]?.passed);
      if (dayNowComplete) {
        const newCount = dailyAdvances + 1;
        setDailyAdvances(newCount);
        sbAuthInsert("user_daily_lessons", session.access_token, { user_id: session.user.id, lesson_date: today, lessons_completed: newCount })
          .catch(() => {
            sbAuthPatch(`user_daily_lessons?user_id=eq.${session.user.id}&lesson_date=eq.${today}`, session.access_token, { lessons_completed: newCount }).catch(() => {});
          });
      }
    }

    setQuizResult({ pct, passed, lessonNum });
  }

  function shareWithTeacher() {
    if (!profile?.assigned_teacher_email || !quizResult) return;
    notifyTeacher({
      teacherEmail: profile.assigned_teacher_email, teacherName: profile.assigned_teacher_name || "Müəllim",
      studentName: profile?.name || "Tələbə", studentPhone: "—",
      studentLevel: `Dərs ${quizResult.lessonNum} nəticəsi: ${quizResult.pct}%`,
    });
    setShared(true);
  }

  const wrapStyle = {
    background: `
      radial-gradient(ellipse 220px 100px at 15% 10%, rgba(47,191,160,0.16), transparent 70%),
      radial-gradient(ellipse 200px 90px at 85% 25%, rgba(255,159,28,0.14), transparent 70%),
      radial-gradient(ellipse 180px 80px at 20% 70%, rgba(255,159,28,0.10), transparent 70%),
      radial-gradient(ellipse 240px 110px at 80% 85%, rgba(47,191,160,0.13), transparent 70%),
      ${T.bg}
    `,
    borderRadius: 14, padding: "18px 16px", border: `1px solid ${T.border}`,
  };
  const btnPrimary = { background: T.accent, color: "#fff", border: "none", borderRadius: 8, padding: "12px 22px", fontWeight: 700, fontSize: 14, cursor: "pointer" };
  const btnSecondary = { background: "#fff", color: T.accent, border: `1px solid ${T.accent}`, borderRadius: 8, padding: "10px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" };

  // Quiz-taking screen
  if (quizQs && !quizResult) {
    const q = quizQs.questions[quizIdx];
    return (
      <div style={wrapStyle}>
        <p style={{ fontSize: 12.5, color: T.textSoft, marginBottom: 8 }}>Sual {quizIdx + 1}/{quizQs.questions.length}</p>
        <p style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 16 }}>{q.q}</p>
        <div style={{ display: "grid", gap: 8 }}>
          {q.options.map((opt, i) => (
            <button key={i} onClick={() => setQuizAnswers({ ...quizAnswers, [quizIdx]: i })}
              style={{
                textAlign: "left", padding: "12px 14px", borderRadius: 8, cursor: "pointer", fontSize: 14,
                background: quizAnswers[quizIdx] === i ? T.accent : "#fff",
                color: quizAnswers[quizIdx] === i ? "#fff" : T.warm,
                border: `1px solid ${quizAnswers[quizIdx] === i ? T.accent : T.border}`,
              }}>
              {opt}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
          <button onClick={() => setQuizIdx(Math.max(0, quizIdx - 1))} disabled={quizIdx === 0} style={btnSecondary}>← Geri</button>
          {quizIdx < quizQs.questions.length - 1 ? (
            <button onClick={() => setQuizIdx(quizIdx + 1)} style={btnPrimary}>İrəli →</button>
          ) : (
            <button onClick={finishQuiz} style={btnPrimary}>Bitir</button>
          )}
        </div>
      </div>
    );
  }

  // Quiz result screen
  if (quizResult) {
    return (
      <div style={wrapStyle}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: T.text, marginTop: 0 }}>{quizResult.passed ? "✓ Keçdin!" : "Təkrar Lazımdır"}</h3>
        <p style={{ fontSize: 30, fontWeight: 800, color: quizResult.passed ? T.accent : "#C97B6E" }}>{quizResult.pct}%</p>
        <p style={{ fontSize: 13.5, color: T.textSoft, marginBottom: 14 }}>
          {quizResult.passed ? "Növbəti dərsə keçə bilərsən." : "75% və yuxarı lazımdır — dərsi bir daha nəzərdən keçirib yenidən sına."}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => { setQuizQs(null); setQuizResult(null); }} style={btnPrimary}>Davam Et</button>
          {profile?.assigned_teacher_email && !shared && (
            <button onClick={shareWithTeacher} style={btnSecondary}>Müəlliminlə Paylaş</button>
          )}
          {shared && <span style={{ fontSize: 12.5, color: T.accent, alignSelf: "center" }}>✓ Paylaşıldı</span>}
        </div>
      </div>
    );
  }

  // Day-grouped lesson list screen
  const completedDays = days.filter((d) => isDayFullyPassed(d.lessons)).length;
  const totalDays = days.length || 1;
  const treeProgress = Math.min(1, completedDays / totalDays);

  return (
    <div style={wrapStyle}>
      <GrowingTree progress={treeProgress} completedDays={completedDays} totalDays={totalDays} T={T} />

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {LEVELS.map((lvl) => (
          <button key={lvl} onClick={() => setLevel(lvl)}
            style={{
              padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: level === lvl ? T.accent : "#fff", color: level === lvl ? "#fff" : T.text,
              border: `1px solid ${level === lvl ? T.accent : T.border}`,
            }}>{lvl}</button>
        ))}
      </div>

      {days.map((dayGroup, dayIdx) => {
        const unlocked = isDayUnlocked(dayIdx);
        const fullyPassed = isDayFullyPassed(dayGroup.lessons);
        const blockedByDailyCap = unlocked && !fullyPassed === false ? false : false;
        return (
          <div key={dayGroup.day} style={{ marginBottom: 18 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10, marginBottom: 10, opacity: unlocked ? 1 : 0.4,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                background: fullyPassed ? T.accent : T.warmSoft, color: fullyPassed ? "#fff" : T.warm, fontSize: 13, fontWeight: 700,
              }}>{fullyPassed ? "✓" : dayGroup.day}</div>
              <h4 style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 15, color: T.text }}>Gün {dayGroup.day}</h4>
              {!unlocked && <span style={{ fontSize: 12, color: T.textSoft }}>🔒 əvvəlki günü bitir</span>}
            </div>

            {unlocked && !fullyPassed && dayIdx > 0 && dailyAdvances >= 1 && !isDayFullyPassed(days[dayIdx - 1]?.lessons || []) === false && dailyAdvances >= 1 && dayGroup.lessons.every((l) => !progress[l.num]) && (
              <div style={{ ...wrapStyle, background: T.warmSoft, marginBottom: 10, padding: "12px 16px" }}>
                <p style={{ margin: 0, fontSize: 13.5, color: T.text }}>🌙 Bugünkü günlük məqsədin bitib, sabah davam et 🙂</p>
              </div>
            )}

            <div style={{ display: "grid", gap: 8, marginLeft: 40 }}>
              {dayGroup.lessons.map((l) => {
                const lessonProgress = progress[l.num];
                const isOpen = openLesson === l.num;
                return (
                  <div key={l.num} style={{
                    background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, opacity: unlocked ? 1 : 0.4,
                  }}>
                    <button
                      onClick={() => unlocked && setOpenLesson(isOpen ? null : l.num)}
                      style={{
                        width: "100%", textAlign: "left", background: "none", border: "none", padding: "12px 16px",
                        display: "flex", justifyContent: "space-between", alignItems: "center", cursor: unlocked ? "pointer" : "default",
                        color: T.text, fontSize: 13.5, fontWeight: 600,
                      }}
                      disabled={!unlocked}
                    >
                      <span>{lessonProgress?.passed ? "✓ " : ""}{l.title}</span>
                      {unlocked && <ChevronRight size={15} color={T.accent} style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .2s" }} />}
                    </button>
                    {isOpen && unlocked && (
                      <div style={{ padding: "0 16px 16px" }}>
                        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13, color: T.textSoft, lineHeight: 1.6 }}>{l.content}</pre>
                        {lessonProgress?.best_score != null && (
                          <p style={{ fontSize: 12, color: T.textSoft, margin: "0 0 10px" }}>Ən yaxşı nəticən: {lessonProgress.best_score}%</p>
                        )}
                        <button onClick={() => startQuiz(l.num)} style={btnPrimary}>
                          {lessonProgress?.passed ? "Yenidən Sına" : "Hazıram, Test Et"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
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
            <span style={{ color: "#FF9F1C", fontWeight: 700, minWidth: 110 }}>{v.term}</span>
            <span style={{ opacity: 0.75 }}>{v.translation}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LessonsView({ topicsByLevel, isPremium, isAdmin, setAuthModal, setView, session, profile }) {
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

      {subTab === "path" && <LessonPathView session={session} profile={profile} />}

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
        <p style={{ color: "#00D9A3", fontSize: 13.5 }}>✓ Mesajın göndərildi, tezliklə cavab veriləcək!</p>
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

function CoursesView({ regForm, setRegForm, regSent, setRegSent, onStartPlacementTest, session, refreshProfile }) {
  const [teachers, setTeachers] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  useEffect(() => {
    sb("teachers?select=*&order=name").then(setTeachers).catch(() => setTeachers([]));
  }, []);

  return (
    <section style={portalStyles.section}>
      <SectionHeader type="courses" desc="Müəllim rəhbərliyi ilə qrup dərsləri" />

      <div style={portalStyles.teacherGrid}>
        {(teachers || []).map((t) => (
          <button key={t.id} onClick={() => setSelectedTeacher(t)} style={portalStyles.teacherTile}>
            <div style={{ ...portalStyles.teacherAvatarWrap, margin: "0 auto 14px" }}>
              <div style={portalStyles.teacherAvatarDiamond} />
              <div style={portalStyles.teacherAvatar}>{t.name?.[0] || "👤"}</div>
            </div>
            <div style={portalStyles.teacherEliteName}>{t.name}</div>
            <div style={portalStyles.teacherHint}>Profilə bax</div>
          </button>
        ))}
        {teachers && teachers.length === 0 && <p style={{ ...portalStyles.body, opacity: 0.6 }}>Hələ müəllim əlavə olunmayıb.</p>}
      </div>

      {selectedTeacher && (
        <div style={portalStyles.modalOverlay} onClick={() => setSelectedTeacher(null)}>
          <div style={{ ...portalStyles.modalBox, maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedTeacher(null)} style={portalStyles.modalClose}>✕</button>

            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div style={{ ...portalStyles.teacherAvatarWrap, width: 66, height: 66, margin: "0 auto 14px" }}>
                <div style={{ ...portalStyles.teacherAvatarDiamond, inset: 8 }} />
                <div style={{ ...portalStyles.teacherAvatar, fontSize: 22 }}>{selectedTeacher.name?.[0] || "👤"}</div>
              </div>
              <h2 style={{ ...portalStyles.h2, marginBottom: 2 }}>{selectedTeacher.name}</h2>
              {selectedTeacher.address && <p style={{ fontSize: 12.5, opacity: 0.55, margin: 0 }}>📍 {selectedTeacher.address}</p>}
            </div>

            <div style={{ display: "grid", gap: 10, marginBottom: 22 }}>
              {selectedTeacher.email && (
                <a href={`mailto:${selectedTeacher.email}`} style={portalStyles.contactLine}>📧 {selectedTeacher.email}</a>
              )}
              {selectedTeacher.phone && (
                <a href={`tel:${selectedTeacher.phone}`} style={portalStyles.contactLine}>📱 {selectedTeacher.phone}</a>
              )}
              {selectedTeacher.instagram && (
                <a href={`https://instagram.com/${String(selectedTeacher.instagram).replace("@", "")}`} target="_blank" rel="noopener noreferrer" style={portalStyles.contactLine}>
                  📷 {selectedTeacher.instagram}
                </a>
              )}
            </div>

            {selectedTeacher.bio && (
              <div style={portalStyles.teacherAboutBox}>
                <div style={portalStyles.teacherAboutLabel}>Haqqında</div>
                <p style={portalStyles.teacherAboutText}>{selectedTeacher.bio}</p>
              </div>
            )}

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, marginBottom: 6 }}>
              <tbody>
                <tr>
                  <td style={portalStyles.teacherTableLabel}>Səviyyələr</td>
                  <td style={portalStyles.teacherTableVal}>{selectedTeacher.levels || "—"}</td>
                </tr>
                <tr>
                  <td style={portalStyles.teacherTableLabel}>Dərs Forması</td>
                  <td style={portalStyles.teacherTableVal}>{selectedTeacher.format || "—"}</td>
                </tr>
                {selectedTeacher.schedule && (
                  <tr>
                    <td style={portalStyles.teacherTableLabel}>Cədvəl</td>
                    <td style={portalStyles.teacherTableVal}>{selectedTeacher.schedule}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <button
              onClick={() => { setSelectedTeacher(null); setRegForm({ ...regForm, teacher: selectedTeacher.name, teacherEmail: selectedTeacher.email }); }}
              style={{ ...portalStyles.primaryBtn, width: "100%", marginTop: 20 }}
            >
              Bu müəllimlə qeydiyyatdan keç
            </button>
          </div>
        </div>
      )}

      <h2 style={{ ...portalStyles.h2, marginTop: 32 }}>Qeydiyyat</h2>
      {regSent ? (
        <p style={{ ...portalStyles.body, color: "#00D9A3" }}>Təşəkkürlər, {regForm.name}! Qeydiyyatın qeydə alındı, tezliklə əlaqə saxlanılacaq.</p>
      ) : (
        <div style={{ display: "grid", gap: 12, maxWidth: 400 }}>
          <input placeholder="Adın" value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} style={portalStyles.input} />
          <input placeholder="Telefon" value={regForm.phone} onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })} style={portalStyles.input} />
          <select value={regForm.teacher || ""} onChange={(e) => {
            const t = (teachers || []).find((x) => x.name === e.target.value);
            setRegForm({ ...regForm, teacher: e.target.value, teacherEmail: t?.email || "" });
          }} style={portalStyles.input}>
            <option value="">Müəllim seç...</option>
            {(teachers || []).map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
          <div>
            <p style={{ fontSize: 13, opacity: 0.65, marginBottom: 8 }}>Səviyyə</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setRegForm({ ...regForm, course: l })}
                  style={{ ...portalStyles.levelPill, ...(regForm.course === l ? portalStyles.levelPillActive : {}) }}
                >
                  <LevelIcon level={l} color={regForm.course === l ? "#0A0A0C" : "#FF9F1C"} /> {l}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => {
            if (!regForm.name || !regForm.teacher) return;
            sbInsert("course_registrations", {
              name: regForm.name, phone: regForm.phone, course: regForm.course,
            }).catch(() => {});
            notifyTeacher({
              teacherEmail: regForm.teacherEmail, teacherName: regForm.teacher,
              studentName: regForm.name, studentPhone: regForm.phone, studentLevel: regForm.course,
            });
            if (session) {
              sbAuthPatch(`profiles?id=eq.${session.user.id}`, session.access_token, {
                assigned_teacher_email: regForm.teacherEmail, assigned_teacher_name: regForm.teacher,
              }).then(() => refreshProfile && refreshProfile(session)).catch(() => {});
            }
            if (regForm.course !== "A1" && onStartPlacementTest) {
              onStartPlacementTest(regForm.teacherEmail, regForm.teacher);
            } else {
              setRegSent(true);
            }
          }} style={portalStyles.primaryBtn}>Qeydiyyatdan keç</button>
        </div>
      )}
      {regForm.course !== "A1" && !regSent && (
        <p style={{ fontSize: 12.5, opacity: 0.6, marginTop: 10, maxWidth: 400 }}>
          Qeyd: A1-dən yuxarı səviyyələr üçün qeydiyyatdan sonra hansı mövzuları bildiyini yoxlamaq üçün qısa bir testə yönləndiriləcəksən — nəticə birbaşa müəllimə göndəriləcək.
        </p>
      )}
    </section>
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

function AuthModal({ mode, onClose, onSwitch, saveSession, refreshProfile, recoveryToken }) {
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

function PremiumPerks({ session, profile, onStart }) {
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
      <polyline points={coords.join(" ")} fill="none" stroke="#2FBFA0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, i) => {
        const [x, y] = c.split(",");
        return <circle key={i} cx={x} cy={y} r="3.5" fill="#2FBFA0" />;
      })}
    </svg>
  );
}

function ProfileView({ session, profile, isAdmin, isPremium }) {
  const [results, setResults] = useState(null);
  const [streak, setStreak] = useState(0);
  const [teacherWhatsapp, setTeacherWhatsapp] = useState(null);

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

  return (
    <section style={portalStyles.section}>
      <SectionHeader type="premium" desc="Sənin irəliləyişin və nailiyyətlərin" />
      <h2 style={portalStyles.h2}>Profilim</h2>

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

function PremiumView({ session, profile, isAdmin, isPremium, refreshProfile, setAuthModal, onStart }) {
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
          <PremiumPerks session={session} profile={profile} onStart={onStart} />
        </>
      ) : isPremium ? (
        <PremiumPerks session={session} profile={profile} onStart={onStart} />
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

function Portal({ onStart, session, profile, isAdmin, isPremium, authModal, setAuthModal, saveSession, logout, refreshProfile, onStartPlacementTest, recoveryToken }) {
  const [view, setView] = useState("home"); // home | lessons | dictionary | courses | contact
  const [regForm, setRegForm] = useState({ name: "", phone: "", course: "A1" });
  const [regSent, setRegSent] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [botOpen, setBotOpen] = useState(false);
  const [botQuestion, setBotQuestion] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const glowRef = useRef(null);
  const [streak, setStreak] = useState(null);

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
        glowRef.current.style.background = `radial-gradient(600px circle at ${e.clientX}px ${e.clientY}px, rgba(255,159,28,0.10), transparent 60%)`;
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

  const navItems = [
    { key: "home", label: "Ana səhifə" },
    { key: "lessons", label: "Dərslər" },
    { key: "dictionary", label: "Lüğət" },
    { key: "books", label: "Kitablar" },
    { key: "courses", label: "Kurslar" },
    { key: "contact", label: "Əlaqə" },
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
        .desktop-nav-groups { display: flex; }
        .mobile-hamburger-btn { display: none; }
        @media (max-width: 860px) {
          .desktop-nav-groups { display: none !important; }
          .mobile-hamburger-btn { display: flex !important; }
        }
      `}</style>

      <div ref={glowRef} style={portalStyles.cursorGlow} />
      {(() => {
        const PAGE_THEME = {
          home: { primary: "#FF9F1C", secondary: "#2FBFA0" },
          lessons: { primary: "#FF9F1C", secondary: "#2FBFA0" },
          dictionary: { primary: "#2FBFA0", secondary: "#4FC3E8" },
          books: { primary: "#B98CE8", secondary: "#2FBFA0" },
          courses: { primary: "#6FD19A", secondary: "#2FBFA0" },
          premium: { primary: "#E8C766", secondary: "#2FBFA0" },
          contact: { primary: "#E86C8C", secondary: "#2FBFA0" },
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

      {/* Nav bar */}
      <nav style={portalStyles.nav}>
        <div style={portalStyles.navBrand} onClick={() => setView("home")}>
          <img src={LOGO_URL} alt="Deutsch Akademie" style={portalStyles.navEmblem} />
          <span style={portalStyles.navBrandText}>Deutsch Akademie</span>
        </div>
        <div className="desktop-nav-groups" style={portalStyles.navGroupsWrap}>
          <div style={portalStyles.navGroup}>
            <span style={portalStyles.navGroupIcon} title="Bölmələr">♜</span>
            {navItems.map((n) => (
              <button key={n.key} onClick={() => setView(n.key)}
                style={{ ...portalStyles.navLink, ...(view === n.key ? portalStyles.navLinkActive : {}) }}>
                {n.label}
              </button>
            ))}
          </div>
          <div style={portalStyles.navGroup}>
            <span style={portalStyles.navGroupIcon} title="Hesab">🛡️</span>
            <button onClick={() => setView("premium")}
              style={{ ...portalStyles.navLink, ...(view === "premium" ? portalStyles.navLinkActive : {}) }}>
              Premium
            </button>
            {session ? (
              <>
                <button onClick={() => setView("profile")}
                  style={{ ...portalStyles.navLink, ...(view === "profile" ? portalStyles.navLinkActive : {}) }}>
                  {profile?.name || "Hesab"}{isAdmin ? " (Admin)" : isPremium ? " ✦" : ""}
                </button>
                <button onClick={() => setShowLogoutConfirm(true)} style={portalStyles.navLink}>Çıxış</button>
              </>
            ) : (
              <button onClick={() => setAuthModal("login")} style={{ ...portalStyles.navLink, color: "#FF9F1C", fontWeight: 700 }}>
                Daxil ol
              </button>
            )}
          </div>
        </div>

        <button className="mobile-hamburger-btn" onClick={() => setMobileMenuOpen((v) => !v)} style={portalStyles.hamburgerBtn}>
          {mobileMenuOpen ? "✕" : "☰"}
        </button>
      </nav>

      {mobileMenuOpen && (
        <div style={portalStyles.mobileMenuPanel}>
          {navItems.map((n) => (
            <button key={n.key} onClick={() => { setView(n.key); setMobileMenuOpen(false); }}
              style={{ ...portalStyles.mobileMenuItem, ...(view === n.key ? portalStyles.mobileMenuItemActive : {}) }}>
              {n.label}
            </button>
          ))}
          <div style={portalStyles.mobileMenuDivider} />
          <button onClick={() => { setView("premium"); setMobileMenuOpen(false); }}
            style={{ ...portalStyles.mobileMenuItem, ...(view === "premium" ? portalStyles.mobileMenuItemActive : {}) }}>
            ✦ Premium
          </button>
          {session ? (
            <>
              <button onClick={() => { setMobileMenuOpen(false); setView("profile"); }} style={portalStyles.mobileMenuItem}>
                {profile?.name || "Hesab"}{isAdmin ? " (Admin)" : isPremium ? " ✦" : ""}
              </button>
              <button onClick={() => { setMobileMenuOpen(false); setShowLogoutConfirm(true); }} style={portalStyles.mobileMenuItem}>
                Çıxış
              </button>
            </>
          ) : (
            <button onClick={() => { setMobileMenuOpen(false); setAuthModal("login"); }} style={{ ...portalStyles.mobileMenuItem, color: "#FF9F1C", fontWeight: 700 }}>
              Daxil ol
            </button>
          )}
        </div>
      )}

      {authModal && (
        <AuthModal
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
            <Crown size={22} color="#E8C766" fill="#E8C766" style={{ filter: "drop-shadow(0 0 4px rgba(232,199,102,0.8))" }} />
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
              <Bird size={18} color="#FF9F1C" /> {(isPremium || isAdmin) ? "Adler" : "Dəstək"}
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
                  Deutsch <span style={{ color: "#FF9F1C" }}>Akademie</span>
                </h1>
                <div style={portalStyles.titleRule} />
                <p style={portalStyles.tagline}>Alman dilini Azərbaycan dilində öyrənənlər üçün</p>
                {streak > 0 && <div style={portalStyles.streakBadge}>🔥 {streak} gündür ardıcıl buradasan</div>}
                <div style={{ marginTop: 22 }}><WordOfDay /></div>
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <section style={portalStyles.section}>
                <h2 style={portalStyles.h2}>Haqqımızda</h2>
                <p style={portalStyles.body}>
                  Deutsch Akademie — Azərbaycanlı öyrənənlər üçün Goethe, TestDaF və telc kimi
                  beynəlxalq imtahanların strukturuna uyğun hazırlanmış alman dili tədris materialları
                  və test kitabları yaradır. Məqsədimiz alman dilini aydın izahlarla, praktik
                  məşqlərlə hər kəsə əlçatan etməkdir.
                </p>
              </section>
            </Reveal>

            <Reveal delay={0.1}>
              <section style={portalStyles.section}>
                <h2 style={portalStyles.h2}>Fəaliyyətimiz</h2>
                <div style={portalStyles.grid}>
                  <TiltCard onClick={() => setView("lessons")} style={{ ...portalStyles.card, cursor: "pointer", textAlign: "left" }}>
                    <IconBadge type="lessons" />
                    <h3 style={{ ...portalStyles.cardTitle, marginTop: 12 }}>Dərslər</h3>
                    <p style={portalStyles.cardText}>A1-dən B2-yə qədər səviyyələr üzrə qrammatika izahları.</p>
                  </TiltCard>
                  <TiltCard onClick={() => setView("dictionary")} style={{ ...portalStyles.card, cursor: "pointer", textAlign: "left" }}>
                    <IconBadge type="dictionary" />
                    <h3 style={{ ...portalStyles.cardTitle, marginTop: 12 }}>Lüğət</h3>
                    <p style={portalStyles.cardText}>Mövzulara görə qruplaşdırılmış alman-azərbaycan lüğəti.</p>
                  </TiltCard>
                  <TiltCard onClick={onStart} style={{ ...portalStyles.card, ...portalStyles.cardCta, cursor: "pointer", textAlign: "left" }}>
                    <div style={portalStyles.cardIcon}>🥨</div>
                    <h3 style={portalStyles.cardTitle}>Özünü Yoxla</h3>
                    <p style={portalStyles.cardText}>Onlayn testlə biliyini ölç, səviyyəni müəyyənləşdir.</p>
                    <div style={portalStyles.ctaLink}>Testə başla <ChevronRight size={16} /></div>
                  </TiltCard>
                  <TiltCard onClick={() => setView("courses")} style={{ ...portalStyles.card, cursor: "pointer", textAlign: "left" }}>
                    <IconBadge type="courses" />
                    <h3 style={{ ...portalStyles.cardTitle, marginTop: 12 }}>Kurslar</h3>
                    <p style={portalStyles.cardText}>Müəllim rəhbərliyi ilə qruplarda alman dili kursları.</p>
                  </TiltCard>
                  <TiltCard onClick={() => setView("books")} style={{ ...portalStyles.card, cursor: "pointer", textAlign: "left" }}>
                    <IconBadge type="books" />
                    <h3 style={{ ...portalStyles.cardTitle, marginTop: 12 }}>Kitablarımız</h3>
                    <p style={portalStyles.cardText}>Çap materiallarımızı Gumroad üzərindən əldə et.</p>
                  </TiltCard>
                  <div style={{ ...portalStyles.card, opacity: 0.45, cursor: "default" }}>
                    <div style={portalStyles.cardIcon}>🧩</div>
                    <h3 style={portalStyles.cardTitle}>Digər Fənlər</h3>
                    <p style={portalStyles.cardText}>Riyaziyyat, İngilis dili və s. — tezliklə əlavə olunacaq.</p>
                  </div>
                </div>
              </section>
            </Reveal>
          </>
        )}

        {view === "lessons" && (session ? <Reveal><LessonsView topicsByLevel={topicsByLevel} isPremium={isPremium} isAdmin={isAdmin} setAuthModal={setAuthModal} setView={setView} session={session} profile={profile} /></Reveal> : <AuthRequired setAuthModal={setAuthModal} />)}

        {view === "dictionary" && (session ? <Reveal><DictionaryView portalStyles={portalStyles} SectionHeader={SectionHeader} /></Reveal> : <AuthRequired setAuthModal={setAuthModal} />)}

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
          <CoursesView regForm={regForm} setRegForm={setRegForm} regSent={regSent} setRegSent={setRegSent} onStartPlacementTest={onStartPlacementTest} session={session} refreshProfile={refreshProfile} />
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
          <PremiumView session={session} profile={profile} isAdmin={isAdmin} isPremium={isPremium} refreshProfile={refreshProfile} setAuthModal={setAuthModal} onStart={onStart} />
          </Reveal>
        )}

        {view === "profile" && (
          <Reveal>
          <ProfileView session={session} profile={profile} isAdmin={isAdmin} isPremium={isPremium} />
          </Reveal>
        )}

        <footer style={portalStyles.footer}>© 2026 Asim Alirzayev — Deutsch Akademie</footer>
      </div>
    </div>
  );
}

const portalStyles = {
  page: {
    minHeight: "100vh", position: "relative", overflow: "hidden",
    background: "linear-gradient(160deg, #0A0A0C 0%, #141416 100%)",
    fontFamily: "'Inter', -apple-system, sans-serif", color: "#F7F1E6",
  },
  cursorGlow: { position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" },
  watermark: { position: "absolute", top: 0, left: 0, width: "100%", height: 240, opacity: 0.06, pointerEvents: "none" },
  cornerShapeBig: { position: "absolute", bottom: 0, left: 0, width: "48%", height: "50%", opacity: 0.16, pointerEvents: "none" },
  cornerShapeSmall: { position: "absolute", top: 0, right: 0, width: "40%", height: "38%", opacity: 0.14, pointerEvents: "none" },
  thinDiamond: {
    position: "absolute", top: "22%", right: "8%", width: 70, height: 70,
    border: "1.5px solid rgba(255,159,28,0.35)", transform: "rotate(45deg)", pointerEvents: "none",
  },
  thinSquare: {
    position: "absolute", bottom: "12%", right: "20%", width: 46, height: 46,
    border: "1.5px solid rgba(47,191,160,0.4)", transform: "rotate(12deg)", pointerEvents: "none",
  },
  blob: { position: "absolute", width: 380, height: 380, borderRadius: "50%", filter: "blur(85px)", opacity: 0.45, pointerEvents: "none" },
  angular: { position: "absolute", width: 130, height: 130, opacity: 0.28, filter: "blur(1px)", pointerEvents: "none", clipPath: "polygon(20% 0%, 100% 0%, 80% 100%, 0% 100%)" },
  angularOutline: { position: "absolute", width: 80, height: 80, border: "2px solid rgba(0,217,163,0.4)", opacity: 0.6, pointerEvents: "none" },
  content: { position: "relative", zIndex: 1, maxWidth: 780, margin: "0 auto", padding: "8px 20px 40px" },
  hero: { textAlign: "center", padding: "48px 0 44px" },
  emblem: { display: "flex", justifyContent: "center", marginBottom: 18 },
  emblemRing: {
    width: 72, height: 72, borderRadius: "50%", objectFit: "cover",
    boxShadow: "0 0 0 4px rgba(255,159,28,0.2)",
  },
  title: { fontFamily: "'Fraunces', serif", fontSize: 52, margin: 0, fontWeight: 700, letterSpacing: -1.5, lineHeight: 1.05 },
  titleRule: { width: 64, height: 3, background: "#FF9F1C", margin: "20px auto 0" },
  tagline: { opacity: 0.65, fontSize: 15, marginTop: 18, letterSpacing: 0.3 },
  streakBadge: { display: "inline-block", marginTop: 16, padding: "6px 14px", borderRadius: 999, background: "rgba(255,159,28,0.12)", border: "1px solid rgba(255,159,28,0.3)", fontSize: 12.5 },
  wordOfDayCard: {
    position: "relative", overflow: "hidden", display: "inline-block", marginTop: 18, padding: "18px 28px",
    borderRadius: 12, background: "rgba(47,191,160,0.06)", border: "1px solid rgba(47,191,160,0.3)", textAlign: "left",
    minWidth: 260,
  },
  cloverBg: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 140, height: 140, opacity: 0.08, pointerEvents: "none" },
  wordOfDayLabel: { fontSize: 11, opacity: 0.6, letterSpacing: 0.5 },
  wordOfDayTerm: { fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: "#2FBFA0" },
  wordOfDayTrans: { display: "block", fontSize: 13, opacity: 0.75, marginTop: 2 },
  section: { marginBottom: 40 },
  h2: { fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 700, color: "#F7F1E6", marginBottom: 14, letterSpacing: -0.5 },
  body: { lineHeight: 1.7, fontSize: 15.5, opacity: 0.75 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 },
  card: {
    position: "relative", overflow: "hidden", background: "rgba(255,255,255,0.035)", border: "1px solid rgba(247,241,230,0.12)",
    borderRadius: 4, padding: 24,
  },
  tiltGlow: {
    position: "absolute", inset: 0, opacity: 0, pointerEvents: "none",
    background: "radial-gradient(180px circle at var(--gx,50%) var(--gy,50%), rgba(255,159,28,0.15), transparent 70%)",
    transition: "opacity .2s",
  },
  cardCta: { border: "1px solid rgba(255,159,28,0.6)", background: "rgba(255,159,28,0.07)" },
  premiumHero: { textAlign: "center", padding: "10px 0 36px" },
  premiumCrown: {
    fontSize: 30, color: "#E8C766", width: 64, height: 64, borderRadius: "50%", margin: "0 auto 16px",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "radial-gradient(circle, rgba(232,199,102,0.18), transparent 70%)",
    border: "1.5px solid rgba(232,199,102,0.4)",
  },
  premiumTitle: { fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, margin: 0, color: "#F3E8CE" },
  premiumTagline: { opacity: 0.65, fontSize: 14.5, marginTop: 10 },
  premiumCard: {
    position: "relative", overflow: "hidden", borderRadius: 4, padding: 24,
    background: "linear-gradient(160deg, rgba(232,199,102,0.12), rgba(232,199,102,0.03))",
    border: "1px solid rgba(232,199,102,0.5)",
  },
  premiumSteps: { marginTop: 32, display: "grid", gap: 18 },
  premiumTable: { width: "100%", borderCollapse: "collapse", maxWidth: 460 },
  premiumTableHeadEmpty: { width: "45%" },
  premiumTableHead: { textAlign: "center", fontSize: 13, fontWeight: 700, padding: "10px 6px", borderBottom: "1px solid rgba(247,241,230,0.15)" },
  premiumTableLabel: { padding: "10px 6px", fontSize: 12.5, opacity: 0.75, borderBottom: "1px solid rgba(247,241,230,0.08)" },
  premiumTableVal: { padding: "10px 6px", fontSize: 12.5, textAlign: "center", borderBottom: "1px solid rgba(247,241,230,0.08)" },
  stepRow: { display: "flex", gap: 14, alignItems: "flex-start" },
  stepNum: {
    width: 28, height: 28, borderRadius: "50%", flexShrink: 0, fontSize: 13, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(232,199,102,0.15)", color: "#E8C766", border: "1px solid rgba(232,199,102,0.4)",
  },
  premiumCta: {
    display: "inline-block", textDecoration: "none", padding: "16px 40px", borderRadius: 8,
    background: "linear-gradient(135deg, #E8C766, #C9A15A)", color: "#0A0A0C", fontWeight: 700, fontSize: 16,
    boxShadow: "0 0 24px rgba(232,199,102,0.3)", letterSpacing: 0.3,
  },
  premiumPerkBox: {
    borderRadius: 4, padding: "20px 22px",
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(247,241,230,0.1)",
  },
  premiumPerkTitle: { fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700, marginBottom: 8, marginTop: 0 },
  badgeCard: {
    width: 90, textAlign: "center", padding: "12px 8px", borderRadius: 8,
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(247,241,230,0.1)",
  },
  badgeLabel: { fontSize: 10.5, marginTop: 6, opacity: 0.85 },
  cardIcon: { fontSize: 24, marginBottom: 12 },
  bookCover: { width: "100%", display: "block", aspectRatio: "2/3", objectFit: "cover" },
  cardTitle: { fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 700, margin: "0 0 8px", position: "relative" },
  cardText: { fontSize: 13.5, opacity: 0.7, lineHeight: 1.5, margin: 0, position: "relative" },
  ctaLink: { display: "flex", alignItems: "center", gap: 4, marginTop: 12, color: "#FF9F1C", fontSize: 13.5, fontWeight: 700, position: "relative" },
  teacherTableLabel: { padding: "8px 0", opacity: 0.6, width: "35%", borderBottom: "1px solid rgba(247,241,230,0.1)" },
  teacherTableVal: { padding: "8px 0", fontWeight: 600, borderBottom: "1px solid rgba(247,241,230,0.1)" },
  teacherAboutBox: {
    borderTop: "1px solid rgba(232,199,102,0.25)", borderBottom: "1px solid rgba(232,199,102,0.25)",
    padding: "16px 2px", marginBottom: 18,
  },
  teacherAboutLabel: { fontFamily: "'Fraunces', serif", fontSize: 13, color: "#E8C766", letterSpacing: 0.5, marginBottom: 8, fontWeight: 700 },
  teacherAboutText: { fontSize: 14, lineHeight: 1.7, opacity: 0.85, fontStyle: "italic", margin: 0 },
  contactLine: {
    display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8,
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(247,241,230,0.1)",
    color: "#F7F1E6", textDecoration: "none", fontSize: 13.5,
  },
  teacherRow: {
    display: "flex", alignItems: "center", gap: 16, width: "100%", textAlign: "left",
    padding: "12px 16px", borderRadius: 8, background: "rgba(255,255,255,0.035)",
    border: "1px solid rgba(247,241,230,0.1)", cursor: "pointer", fontFamily: "inherit",
  },
  teacherGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 16, maxWidth: 520 },
  teacherTile: {
    display: "block", textAlign: "center", padding: "26px 16px", borderRadius: 4, cursor: "pointer",
    background: "linear-gradient(160deg, rgba(232,199,102,0.08), rgba(232,199,102,0.02))",
    border: "1px solid rgba(232,199,102,0.3)", fontFamily: "inherit",
  },
  teacherEliteName: { fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 700, color: "#F3E8CE", letterSpacing: 0.2 },
  teacherHint: { fontSize: 11.5, color: "#E8C766", opacity: 0.65, marginTop: 6, letterSpacing: 0.3 },
  teacherEliteBio: {
    fontSize: 12.5, opacity: 0.7, marginTop: 6, fontStyle: "normal", lineHeight: 1.4,
    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
  },
  teacherAvatarWrap: { width: 46, height: 46, position: "relative", flexShrink: 0 },
  teacherAvatarDiamond: {
    position: "absolute", inset: 6, transform: "rotate(45deg)",
    background: "linear-gradient(135deg,#FF9F1C,#E8C766)",
  },
  teacherAvatar: {
    position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
    color: "#0A0A0C", fontWeight: 700, fontSize: 15,
  },
  teacherName: { fontWeight: 700, fontSize: 15, fontFamily: "'Fraunces', serif" },
  teacherBioLine: { fontSize: 12.5, opacity: 0.6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  levelPill: {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 999,
    border: "1px solid rgba(247,241,230,0.2)", background: "transparent", color: "#F7F1E6", cursor: "pointer",
    fontSize: 13.5, fontFamily: "inherit",
  },
  levelPillActive: { background: "#FF9F1C", color: "#0A0A0C", fontWeight: 700, borderColor: "#FF9F1C" },
  footer: { textAlign: "center", opacity: 0.4, fontSize: 12.5, marginTop: 20 },
  nav: {
    position: "relative", zIndex: 2, display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "18px 24px", flexWrap: "wrap", gap: 12, borderBottom: "1px solid rgba(247,241,230,0.08)",
  },
  navBrand: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer" },
  navEmblem: { width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 },
  navBrandText: { fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700, letterSpacing: -0.3 },
  navLinks: { display: "flex", gap: 2, flexWrap: "wrap" },
  navGroupsWrap: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 },
  navGroup: {
    display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap",
    padding: "4px 10px 4px 6px", borderRadius: 999, background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(247,241,230,0.08)",
  },
  navGroupIcon: { fontSize: 13, opacity: 0.55, marginRight: 4 },
  hamburgerBtn: {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(247,241,230,0.15)", borderRadius: 8,
    color: "#F7F1E6", width: 42, height: 38, fontSize: 18, cursor: "pointer", alignItems: "center", justifyContent: "center",
  },
  mobileMenuPanel: {
    position: "relative", zIndex: 5, display: "flex", flexDirection: "column", gap: 4,
    padding: "10px 20px 18px", borderBottom: "1px solid rgba(247,241,230,0.1)",
    background: "rgba(10,10,12,0.6)",
  },
  mobileMenuItem: {
    display: "block", width: "100%", textAlign: "left", padding: "12px 14px", borderRadius: 8,
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(247,241,230,0.08)", color: "#F7F1E6",
    fontSize: 14.5, cursor: "pointer", fontFamily: "inherit",
  },
  mobileMenuItemActive: { background: "rgba(255,159,28,0.15)", borderColor: "rgba(255,159,28,0.4)", color: "#FF9F1C", fontWeight: 700 },
  mobileMenuDivider: { height: 1, background: "rgba(247,241,230,0.1)", margin: "6px 0" },
  navLink: { background: "none", border: "none", color: "rgba(247,241,230,0.6)", fontSize: 13.5, padding: "8px 12px", borderRadius: 4, cursor: "pointer" },
  navLinkActive: { background: "rgba(255,159,28,0.14)", color: "#FF9F1C", fontWeight: 700 },
  pill: { padding: "8px 18px", borderRadius: 4, border: "1px solid rgba(247,241,230,0.2)", background: "transparent", color: "#F7F1E6", cursor: "pointer", fontSize: 14 },
  pillActive: { background: "#FF9F1C", color: "#0A0A0C", fontWeight: 700, borderColor: "#FF9F1C" },
  input: { width: "100%", padding: "12px 14px", borderRadius: 4, border: "1px solid rgba(247,241,230,0.2)", background: "#1A1611", color: "#F7F1E6", fontSize: 14.5, boxSizing: "border-box", caretColor: "#F7F1E6" },
  primaryBtn: { background: "#FF9F1C", color: "#0A0A0C", border: "none", borderRadius: 4, padding: "12px 22px", fontWeight: 700, fontSize: 14.5, cursor: "pointer" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 },
  modalBox: { background: "#141416", border: "1px solid rgba(255,159,28,0.25)", borderRadius: 12, padding: 28, width: "100%", maxWidth: 360, position: "relative" },
  modalClose: { position: "absolute", top: 14, right: 14, background: "none", border: "none", color: "rgba(247,241,230,0.6)", fontSize: 16, cursor: "pointer" },
  linkBtn: { background: "none", border: "none", color: "#FF9F1C", fontWeight: 700, cursor: "pointer", padding: 0, fontSize: 13 },
  googleBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%",
    padding: "11px 14px", borderRadius: 8, background: "#fff", color: "#3c4043",
    border: "1px solid rgba(0,0,0,0.1)", fontSize: 14, fontWeight: 600, textDecoration: "none",
    boxSizing: "border-box",
  },
  orDivider: {
    display: "flex", alignItems: "center", textAlign: "center", margin: "14px 0",
    color: "rgba(247,241,230,0.4)", fontSize: 12,
  },
  premiumDot: { color: "#E8C766", marginLeft: 4 },
  gatePrompt: { textAlign: "center", padding: "60px 20px", opacity: 0.9 },
  botFab: {
    position: "relative", width: 54, height: 54, borderRadius: "50%",
    background: "#2FBFA0", color: "#0A0A0C", border: "none", fontSize: 22, cursor: "pointer",
    boxShadow: "0 4px 18px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center",
  },
  botFabWrap: { position: "fixed", bottom: 22, right: 22, zIndex: 40, width: 54, height: 54 },
  crownBadge: {
    position: "absolute", top: -14, left: "50%", transform: "translateX(-50%) rotate(0deg)",
    pointerEvents: "none", zIndex: 1,
  },
  botPanel: {
    position: "fixed", bottom: 86, right: 22, zIndex: 40, width: 300, maxHeight: "60vh", overflowY: "auto",
    background: "#141416", border: "1px solid rgba(255,159,28,0.3)", borderRadius: 12,
    boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
  },
  botHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px",
    borderBottom: "1px solid rgba(247,241,230,0.1)", fontWeight: 700, fontSize: 14,
  },
  botClose: { background: "none", border: "none", color: "rgba(247,241,230,0.6)", cursor: "pointer", fontSize: 14 },
  botBody: { padding: 14 },
  botFaqBtn: {
    display: "block", width: "100%", textAlign: "left", padding: "9px 10px", marginBottom: 6, borderRadius: 6,
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(247,241,230,0.08)", color: "#F7F1E6",
    fontSize: 12.8, cursor: "pointer", fontFamily: "inherit",
  },
  botBack: { background: "none", border: "none", color: "#FF9F1C", fontSize: 12.5, cursor: "pointer", padding: 0, marginBottom: 10 },
  botAnswerQ: { fontWeight: 700, fontSize: 13.5, marginBottom: 8 },
  botAnswerA: { fontSize: 13, lineHeight: 1.6, opacity: 0.85 },
  lessonCard: { background: "rgba(255,255,255,0.035)", border: "1px solid rgba(247,241,230,0.12)", borderRadius: 4, overflow: "hidden" },
  lessonHeader: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", color: "#F7F1E6", padding: "14px 16px", fontSize: 14.5, cursor: "pointer", textAlign: "left" },
  lessonBody: {
    whiteSpace: "pre-wrap", fontFamily: "'Inter', sans-serif", fontSize: 13.5, lineHeight: 1.7,
    padding: "0 16px 18px", margin: 0, opacity: 0.85, borderTop: "1px solid rgba(247,241,230,0.08)", paddingTop: 14,
  },
  lessonBodyWrap: {},
  vocabBox: { margin: "0 16px 18px", padding: 16, background: "rgba(255,159,28,0.06)", border: "1px solid rgba(255,159,28,0.25)", borderRadius: 4 },
  vocabTitle: { fontSize: 13, fontWeight: 700, color: "#FF9F1C" },
  pdfLink: {
    display: "inline-flex", alignItems: "center", gap: 8, margin: "0 16px 18px", padding: "11px 18px",
    background: "linear-gradient(135deg, rgba(212,175,55,0.14), rgba(212,175,55,0.05))",
    border: "1px solid rgba(212,175,55,0.55)", borderRadius: 8,
    color: "#E8C766", fontSize: 13.5, fontWeight: 700, textDecoration: "none",
    letterSpacing: 0.2, boxShadow: "0 0 14px rgba(212,175,55,0.12)",
  },
  pdfLinkLocked: {
    display: "inline-flex", alignItems: "center", gap: 8, margin: "0 16px 18px", padding: "11px 18px",
    background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(247,241,230,0.25)", borderRadius: 8,
    color: "rgba(247,241,230,0.55)", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  },
  authRequiredBox: {
    textAlign: "center", padding: "50px 20px", background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,159,28,0.2)", borderRadius: 14,
  },
  secondaryBtnLight: {
    background: "transparent", color: "#F7F1E6", border: "1px solid rgba(247,241,230,0.3)",
    borderRadius: 8, padding: "12px 22px", fontSize: 14.5, cursor: "pointer",
  },
  dictRow: { background: "rgba(255,255,255,0.035)", borderRadius: 4, padding: "10px 14px", borderLeft: "3px solid #FF9F1C" },
  dictTerm: { fontWeight: 700, fontSize: 14.5 },
  dictTrans: { fontSize: 13, opacity: 0.7, marginTop: 2 },
  speakBtn: {
    background: "rgba(255,159,28,0.1)", border: "1px solid rgba(255,159,28,0.3)", borderRadius: "50%",
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
        <circle cx="70" cy="70" r={r + 8} fill="none" stroke="#FFF6E0" strokeWidth="1" strokeDasharray="2 6" opacity="0.5">
          <animateTransform attributeName="transform" type="rotate" from="0 70 70" to="360 70 70" dur="12s" repeatCount="indefinite" />
        </circle>
      )}
      <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
      <circle
        cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        transform="rotate(-90 70 70)" style={{ transition: "stroke-dashoffset .1s linear" }}
      />
      <text x="70" y="78" textAnchor="middle" fontSize="30" fontWeight="700" fill="#F5EFE0" fontFamily="'Fraunces', serif">
        {display}%
      </text>
    </svg>
  );
}

const SECTION_THEME = {
  lessons: { color: "#FF9F1C", soft: "rgba(255,159,28,0.14)", label: "Dərslər" },
  dictionary: { color: "#4FC3E8", soft: "rgba(79,195,232,0.14)", label: "Lüğət" },
  books: { color: "#B98CE8", soft: "rgba(185,140,232,0.14)", label: "Kitablar" },
  courses: { color: "#6FD19A", soft: "rgba(111,209,154,0.14)", label: "Kurslar" },
  contact: { color: "#E86C8C", soft: "rgba(232,108,140,0.14)", label: "Əlaqə" },
  quiz: { color: "#FFD580", soft: "rgba(255,213,128,0.14)", label: "Özünü Yoxla" },
  premium: { color: "#E8C766", soft: "rgba(232,199,102,0.14)", label: "Profilim" },
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
      {tier >= 4 && <circle cx="50" cy="45" r="2" fill="#FFF6E0" />}
      {tier >= 4 && <path d="M90 30 Q70 30 65 55" stroke="#FFF6E0" strokeWidth="0.75" fill="none" opacity="0.7" />}
    </svg>
  );
}

function ReportIssue({ questionId }) {
  const [state, setState] = useState("idle"); // idle | sent
  if (state === "sent") {
    return <div style={{ ...styles.reportLink, color: "#00D9A3" }}>✓ Təşəkkürlər, qeyd olundu</div>;
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
      `}</style>
      <div style={{ ...styles.container, maxWidth: wide ? 640 : 460 }}>{children}</div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #0A0A0C 0%, #141416 100%)",
    color: "#F5EFE0",
    fontFamily: "'Inter', -apple-system, sans-serif",
    display: "flex",
    justifyContent: "center",
    padding: "32px 16px",
  },
  container: { width: "100%" },
  h1: { fontFamily: "'Fraunces', serif", fontSize: 34, margin: 0, fontWeight: 700, letterSpacing: -1 },
  h2: { fontFamily: "'Fraunces', serif", fontSize: 24, marginBottom: 4, fontWeight: 700 },
  h3: { fontFamily: "'Fraunces', serif", fontSize: 17, color: "#FF9F1C", marginBottom: 10 },
  sub: { opacity: 0.7, fontSize: 14, marginTop: 4 },
  label: { fontSize: 13, opacity: 0.75, marginBottom: 6, display: "block" },
  input: {
    width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid rgba(255,159,28,0.25)",
    background: "#1A1611", color: "#F5EFE0", fontSize: 15, outline: "none", boxSizing: "border-box", caretColor: "#F5EFE0",
  },
  card: {
    background: "rgba(255,255,255,0.035)", border: "1px solid rgba(245,239,224,0.12)", borderRadius: 10,
    padding: "16px 14px", color: "#F5EFE0", cursor: "pointer", textAlign: "left", transition: "border-color .2s, background .2s",
  },
  cardActive: { borderColor: "#FF9F1C", background: "rgba(255,159,28,0.1)" },
  cardGold: { background: "rgba(255,159,28,0.1)", borderColor: "#FF9F1C" },
  pill: {
    padding: "8px 18px", borderRadius: 999, border: "1px solid rgba(245,239,224,0.2)",
    background: "transparent", color: "#F5EFE0", cursor: "pointer",
  },
  pillActive: { background: "#FF9F1C", color: "#0A0A0C", fontWeight: 700, borderColor: "#FF9F1C" },
  primaryBtn: {
    background: "#FF9F1C", color: "#0A0A0C", border: "none", borderRadius: 8, padding: "12px 22px",
    fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, justifyContent: "center",
  },
  secondaryBtn: {
    background: "transparent", color: "#F5EFE0", border: "1px solid rgba(245,239,224,0.25)", borderRadius: 8,
    padding: "12px 22px", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
  },
  backBtn: { background: "none", border: "none", color: "#FF9F1C", display: "flex", alignItems: "center", gap: 4, cursor: "pointer", marginBottom: 14, fontSize: 14, padding: 0 },
  testHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 },
  exitBtn: { background: "none", border: "none", color: "rgba(245,239,224,0.5)", display: "flex", alignItems: "center", gap: 2, cursor: "pointer", fontSize: 13, padding: 0 },
  progressTrack: { height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 4, marginTop: 10 },
  progressFill: { height: 3, background: "linear-gradient(90deg, #FF9F1C, #FFD580)", borderRadius: 4, transition: "width .4s cubic-bezier(.2,.7,.3,1)" },
  questionCard: {
    background: "rgba(255,255,255,0.035)", border: "1px solid rgba(245,239,224,0.1)", borderRadius: 14,
    padding: "26px 22px", marginTop: 4,
  },
  question: { fontSize: 19, marginBottom: 20, lineHeight: 1.55, fontWeight: 500, color: "#F5EFE0" },
  option: {
    padding: "14px 16px", borderRadius: 9, border: "1px solid rgba(245,239,224,0.14)", background: "rgba(255,255,255,0.02)",
    color: "#F5EFE0", textAlign: "left", cursor: "pointer", fontSize: 15, transition: "border-color .15s, background .15s, transform .1s",
  },
  optionActive: { borderColor: "#FF9F1C", background: "rgba(255,159,28,0.12)" },
  reportLink: { background: "none", border: "none", color: "rgba(245,239,224,0.35)", fontSize: 12, cursor: "pointer", padding: 0, marginTop: 18 },
  textarea: {
    width: "100%", minHeight: 90, padding: 12, borderRadius: 8, border: "1px solid rgba(255,159,28,0.25)",
    background: "#1A1611", color: "#F5EFE0", fontSize: 15, boxSizing: "border-box", fontFamily: "inherit", caretColor: "#F5EFE0",
  },
  statRow: { display: "flex", alignItems: "center", gap: 10 },
  statTrack: { flex: 1, height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 8, overflow: "hidden" },
  statFill: { height: 8, borderRadius: 8, transition: "width 1s cubic-bezier(.2,.7,.3,1)" },
  reviewRow: { background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: "8px 12px" },
  adBox: { background: "rgba(255,159,28,0.06)", border: "1px solid rgba(255,159,28,0.2)", borderRadius: 12, padding: 18 },
};

/* ========================= ADMIN PANEL ========================= */

function NotFoundPage() {
  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(160deg, #0A0A0C 0%, #141416 100%)",
      color: "#F7F1E6", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center",
    }}>
      <img src={LOGO_URL} alt="Deutsch Akademie" style={{ width: 64, height: 64, borderRadius: "50%", marginBottom: 20 }} />
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 40, margin: "0 0 8px", color: "#FF9F1C" }}>404</h1>
      <p style={{ fontSize: 16, opacity: 0.75, marginBottom: 24 }}>Bu səhifə tapılmadı.</p>
      <a href="/" style={{
        background: "#FF9F1C", color: "#0A0A0C", textDecoration: "none", fontWeight: 700,
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
  return <InnerApp />;
}
