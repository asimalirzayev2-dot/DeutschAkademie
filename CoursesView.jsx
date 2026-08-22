import React, { useState, useEffect } from "react";
import { sb, sbInsert, sbAuthPatch } from "./supabase";
import { LEVELS } from "./constants";
import { notifyTeacher } from "./utils";
import { useLanguage } from "./i18n/LanguageContext";

function CoursesView({ portalStyles, SectionHeader, LevelIcon,  regForm, setRegForm, regSent, setRegSent, onStartPlacementTest, session, refreshProfile }) {
  const { t } = useLanguage();
  const [teachers, setTeachers] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  useEffect(() => {
    sb("teachers?select=*&order=name").then(setTeachers).catch(() => setTeachers([]));
  }, []);

  return (
    <section style={portalStyles.section}>
      <SectionHeader type="courses" desc={t("courses_desc")} />

      <div style={portalStyles.teacherGrid}>
        {(teachers || []).map((t2) => (
          <button key={t2.id} onClick={() => setSelectedTeacher(t2)} style={portalStyles.teacherTile}>
            <div style={{ ...portalStyles.teacherAvatarWrap, margin: "0 auto 14px" }}>
              <div style={portalStyles.teacherAvatarDiamond} />
              <div style={portalStyles.teacherAvatar}>{t2.name?.[0] || "👤"}</div>
            </div>
            <div style={portalStyles.teacherEliteName}>{t2.name}</div>
            <div style={portalStyles.teacherHint}>{t("view_profile")}</div>
          </button>
        ))}
        {teachers && teachers.length === 0 && <p style={{ ...portalStyles.body, opacity: 0.6 }}>{t("no_teachers_yet")}</p>}
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
                <div style={portalStyles.teacherAboutLabel}>{t("about_label")}</div>
                <p style={portalStyles.teacherAboutText}>{selectedTeacher.bio}</p>
              </div>
            )}

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, marginBottom: 6 }}>
              <tbody>
                <tr>
                  <td style={portalStyles.teacherTableLabel}>{t("levels_label")}</td>
                  <td style={portalStyles.teacherTableVal}>{selectedTeacher.levels || "—"}</td>
                </tr>
                <tr>
                  <td style={portalStyles.teacherTableLabel}>{t("lesson_format_label")}</td>
                  <td style={portalStyles.teacherTableVal}>{selectedTeacher.format || "—"}</td>
                </tr>
                {selectedTeacher.schedule && (
                  <tr>
                    <td style={portalStyles.teacherTableLabel}>{t("schedule_label")}</td>
                    <td style={portalStyles.teacherTableVal}>{selectedTeacher.schedule}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <button
              onClick={() => { setSelectedTeacher(null); setRegForm({ ...regForm, teacher: selectedTeacher.name, teacherEmail: selectedTeacher.email }); }}
              style={{ ...portalStyles.primaryBtn, width: "100%", marginTop: 20 }}
            >
              {t("register_with_teacher")}
            </button>
          </div>
        </div>
      )}

      <h2 style={{ ...portalStyles.h2, marginTop: 32 }}>{t("registration_title")}</h2>
      {regSent ? (
        <p style={{ ...portalStyles.body, color: "#00A896" }}>{t("registration_thanks_prefix")} {regForm.name}! {t("registration_thanks_suffix")}</p>
      ) : (
        <div style={{ display: "grid", gap: 12, maxWidth: 400 }}>
          <input placeholder={t("name_placeholder")} value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} style={portalStyles.input} />
          <input placeholder={t("phone_placeholder")} value={regForm.phone} onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })} style={portalStyles.input} />
          <select value={regForm.teacher || ""} onChange={(e) => {
            const t2 = (teachers || []).find((x) => x.name === e.target.value);
            setRegForm({ ...regForm, teacher: e.target.value, teacherEmail: t2?.email || "" });
          }} style={portalStyles.input}>
            <option value="">{t("choose_teacher_option")}</option>
            {(teachers || []).map((t2) => <option key={t2.id} value={t2.name}>{t2.name}</option>)}
          </select>
          <div>
            <p style={{ fontSize: 13, opacity: 0.65, marginBottom: 8 }}>{t("level_label")}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setRegForm({ ...regForm, course: l })}
                  style={{ ...portalStyles.levelPill, ...(regForm.course === l ? portalStyles.levelPillActive : {}) }}
                >
                  <LevelIcon level={l} color={regForm.course === l ? "#F5F5DC" : "#FF8C00"} /> {l}
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
          }} style={portalStyles.primaryBtn}>{t("sign_up")}</button>
        </div>
      )}
      {regForm.course !== "A1" && !regSent && (
        <p style={{ fontSize: 12.5, opacity: 0.6, marginTop: 10, maxWidth: 400 }}>
          {t("placement_test_note")}
        </p>
      )}
    </section>
  );
}

export default CoursesView;
