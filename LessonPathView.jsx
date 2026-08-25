import React, { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { sb, sbAuth, sbAuthPatch, sbAuthInsert } from "./supabase";
import { LEVELS } from "./constants";
import { shuffle, shuffleOptions, notifyTeacher } from "./utils";
import { useLanguage } from "./i18n/LanguageContext";

// Seçilmiş dilə görə dərsin başlığını/mətnini qaytarır; həmin dildə tərcümə
// yoxdursa (və ya dil Azərbaycancadırsa) Azərbaycan mətninə geri qayıdır.
function localizeLesson(l, lang) {
  if (!l) return { title: "", content: "" };
  if (!lang || lang === "az") return { title: l.title, content: l.content };
  return {
    title: l[`title_${lang}`] || l.title,
    content: l[`content_${lang}`] || l.content,
  };
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
    const color = i % 3 === 0 ? "#FF8C00" : "#00A896";
    const r = 9 + t * 7;
    leaves.push({ branchY, endX, endY, color, r });
  }
  return (
    <div style={{ textAlign: "center", marginBottom: 18 }}>
      <svg viewBox="0 0 280 210" width="100%" height="150" style={{ maxWidth: 260 }}>
        <line x1="20" y1={baseY} x2="260" y2={baseY} stroke="rgba(42,61,60,0.15)" strokeWidth="2" />
        <line x1={baseX} y1={baseY} x2={baseX} y2={baseY - trunkH} stroke="#7A6A55" strokeWidth="8" strokeLinecap="round" />
        {leaves.map((l, i) => (
          <g key={i}>
            <line x1={baseX} y1={l.branchY} x2={l.endX} y2={l.endY} stroke="#7A6A55" strokeWidth="4" strokeLinecap="round" />
            <circle cx={l.endX} cy={l.endY} r={l.r} fill={l.color} />
          </g>
        ))}
      </svg>
      <p style={{ fontSize: 12.5, color: T.textSoft, margin: "4px 0 0" }}>{completedDays} / {totalDays} gün tamamlandı</p>
    </div>
  );
}

function LessonPathView({ portalStyles, AuthRequired, session, profile, guestMode, setAuthModal }) {
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
  const { lang } = useLanguage();

  const today = new Date().toISOString().slice(0, 10);
  const T = {
    bg: "#F5F5DC", card: "rgba(255,255,255,0.85)", border: "rgba(0,168,150,0.28)",
    accent: "#00A896", accentSoft: "rgba(0,168,150,0.14)",
    warm: "#FF8C00", warmSoft: "rgba(255,140,0,0.14)",
    text: "#2A3D3C", textSoft: "rgba(42,61,60,0.65)",
  };

  useEffect(() => {
    sb(`lessons?level=eq.${level}&select=level,num,title,content,title_ru,content_ru,title_en,content_en,title_tr,content_tr,title_ky,content_ky,day_number`)
      .then((rows) => setLessons(rows.sort((a, b) => parseInt(a.num) - parseInt(b.num))))
      .catch(() => setLessons([]));
    if (!session) { setProgress({}); setDailyAdvances(0); return; }
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
    if (guestMode) return dayIdx === 0;
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

    if (!session) {
      setQuizResult({ pct, passed, lessonNum });
      return;
    }

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
      radial-gradient(ellipse 220px 100px at 15% 10%, rgba(0,168,150,0.16), transparent 70%),
      radial-gradient(ellipse 200px 90px at 85% 25%, rgba(255,140,0,0.14), transparent 70%),
      radial-gradient(ellipse 180px 80px at 20% 70%, rgba(255,140,0,0.10), transparent 70%),
      radial-gradient(ellipse 240px 110px at 80% 85%, rgba(0,168,150,0.13), transparent 70%),
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
        <p style={{ fontSize: 30, fontWeight: 800, color: quizResult.passed ? T.accent : "#C0392B" }}>{quizResult.pct}%</p>
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
        {(guestMode ? ["A1"] : LEVELS).map((lvl) => (
          <button key={lvl} onClick={() => setLevel(lvl)}
            style={{
              padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer",
              background: level === lvl ? T.accent : "#FFFFFF", color: level === lvl ? "#fff" : T.warm,
              border: `1px solid ${level === lvl ? T.accent : T.border}`,
            }}>{lvl}</button>
        ))}
        {guestMode && (
          <button onClick={() => setAuthModal && setAuthModal("signup")} style={{
            padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer",
            background: "#FFFFFF", color: T.textSoft, border: `1px dashed ${T.border}`,
          }}>🔒 A2 / B1 / B2</button>
        )}
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
              {!unlocked && guestMode && (
                <button onClick={() => setAuthModal && setAuthModal("signup")} style={{ fontSize: 12, color: T.warm, fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  🔒 Qeydiyyat lazımdır
                </button>
              )}
              {!unlocked && !guestMode && <span style={{ fontSize: 12, color: T.textSoft }}>🔒 əvvəlki günü bitir</span>}
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
                const loc = localizeLesson(l, lang);
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
                      <span>{lessonProgress?.passed ? "✓ " : ""}{loc.title}</span>
                      {unlocked && <ChevronRight size={15} color={T.accent} style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .2s" }} />}
                    </button>
                    {isOpen && unlocked && (
                      <div style={{ padding: "0 16px 16px" }}>
                        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13, color: T.textSoft, lineHeight: 1.6 }}>{loc.content}</pre>
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

export default LessonPathView;
