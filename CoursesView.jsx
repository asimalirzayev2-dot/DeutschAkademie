import React, { useState, useEffect } from "react";
import { sb, sbInsert, sbAuthPatch } from "./supabase";
import { LEVELS } from "./constants";
import { notifyTeacher } from "./utils";

function CoursesView({ portalStyles, SectionHeader, LevelIcon,  regForm, setRegForm, regSent, setRegSent, onStartPlacementTest, session, refreshProfile }) {
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
        <p style={{ ...portalStyles.body, color: "#00A896" }}>Təşəkkürlər, {regForm.name}! Qeydiyyatın qeydə alındı, tezliklə əlaqə saxlanılacaq.</p>
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

export default CoursesView;
