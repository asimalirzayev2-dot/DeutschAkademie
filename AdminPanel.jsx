import React, { useState, useEffect, useRef } from "react";
import { adminLogin, sbAuth, sbAuthRpc, sbAuthCount, SUPABASE_URL, SUPABASE_KEY } from "./supabase";


function AdminPanel() {
  const [token, setToken] = useState(() => localStorage.getItem("adminToken") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("results"); // results | registrations | users | analytics
  const [results, setResults] = useState(null);
  const [registrations, setRegistrations] = useState(null);
  const [users, setUsers] = useState(null);
  const [xpMap, setXpMap] = useState({});
  const [visits, setVisits] = useState(null);
  const [totalVisits, setTotalVisits] = useState(null);
  const [funcName, setFuncName] = useState("rapid-responder");
  const [missingUnits, setMissingUnits] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genLog, setGenLog] = useState([]);
  const [genDone, setGenDone] = useState(0);
  const stopRef = useRef(false);

  function loadMissingUnits() {
    setMissingUnits(null);
    sbAuth(`listening_units?part1_audio_url=is.null&select=level,unit_number&order=level.asc,unit_number.asc`, token)
      .then(setMissingUnits)
      .catch(() => setMissingUnits([]));
  }

  async function generateAllAudio() {
    if (!missingUnits || missingUnits.length === 0) return;
    setGenerating(true); setGenLog([]); setGenDone(0);
    stopRef.current = false;
    for (const u of missingUnits) {
      if (stopRef.current) { setGenLog((l) => [...l, `⏹ Dayandırıldı (${u.level} Fəsil ${u.unit_number}-də)`]); break; }
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/${funcName}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ level: u.level, unit_number: u.unit_number }),
        });
        const data = await res.json();
        if (data.success) {
          setGenLog((l) => [...l, `✓ ${u.level} Fəsil ${u.unit_number}`]);
        } else {
          setGenLog((l) => [...l, `✗ ${u.level} Fəsil ${u.unit_number} — ${data.error || "naməlum xəta"}`]);
        }
      } catch (e) {
        setGenLog((l) => [...l, `✗ ${u.level} Fəsil ${u.unit_number} — ${e.message}`]);
      }
      setGenDone((d) => d + 1);
    }
    setGenerating(false);
    loadMissingUnits();
  }

  function stopGeneration() { stopRef.current = true; }
  const [search, setSearch] = useState("");
  const [premiumBusy, setPremiumBusy] = useState(null); // id currently being toggled

  async function togglePremium(u) {
    setPremiumBusy(u.id);
    const nextVal = !u.is_premium;
    try {
      await sbAuthRpc("admin_set_premium", token, { target_id: u.id, new_val: nextVal, until: null });
      setUsers((prev) => prev.map((row) => (row.id === u.id ? { ...row, is_premium: nextVal } : row)));
    } catch (err) {
      alert(err.message || "Yenilənmə uğursuz oldu — bir daha sına.");
    } finally {
      setPremiumBusy(null);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await adminLogin(email, password);
      localStorage.setItem("adminToken", data.access_token);
      setToken(data.access_token);
    } catch {
      setError("Email və ya şifrə yanlışdır.");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("adminToken");
    setToken("");
    setResults(null);
    setRegistrations(null);
  }

  useEffect(() => {
    if (!token) return;
    if (tab === "audio" && missingUnits === null) loadMissingUnits();
  }, [token, tab]);

  useEffect(() => {
    if (!token) return;
    sbAuth("test_results?select=*&order=created_at.desc&limit=500", token)
      .then(setResults)
      .catch(() => setResults([]));
    sbAuth("course_registrations?select=*&order=created_at.desc&limit=500", token)
      .then(setRegistrations)
      .catch(() => setRegistrations([]));
    sbAuth("profiles?select=*&order=created_at.desc&limit=500", token)
      .then(setUsers)
      .catch(() => setUsers([]));
    sbAuth("user_total_xp?select=*", token)
      .then((rows) => {
        const map = {};
        (rows || []).forEach((r) => { map[r.user_id] = r.total_xp; });
        setXpMap(map);
      })
      .catch(() => setXpMap({}));
    sbAuth("page_visits?select=created_at&order=created_at.desc&limit=2000", token)
      .then(setVisits)
      .catch(() => setVisits([]));
    sbAuthCount("page_visits", token)
      .then(setTotalVisits)
      .catch(() => setTotalVisits(null));
  }, [token]);

  const styleA = {
    page: { minHeight: "100vh", background: "linear-gradient(160deg, #F5F5DC 0%, #EDEDD4 100%)", color: "#2A3D3C", fontFamily: "'Inter', -apple-system, sans-serif", padding: "32px 16px" },
    box: { maxWidth: 900, margin: "0 auto" },
    input: { width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid rgba(255,140,0,0.25)", background: "#FFFFFF", color: "#2A3D3C", fontSize: 15, boxSizing: "border-box", marginBottom: 12, caretColor: "#2A3D3C" },
    btn: { background: "#FF8C00", color: "#F5F5DC", border: "none", borderRadius: 8, padding: "12px 22px", fontWeight: 700, fontSize: 15, cursor: "pointer" },
    tabBtn: (active) => ({ padding: "8px 18px", borderRadius: 999, border: "1px solid rgba(42,61,60,0.2)", background: active ? "#FF8C00" : "transparent", color: active ? "#F5F5DC" : "#2A3D3C", fontWeight: active ? 700 : 400, cursor: "pointer", marginRight: 8 }),
    table: { width: "100%", borderCollapse: "collapse", fontSize: 13.5 },
    th: { textAlign: "left", padding: "8px 10px", borderBottom: "1px solid rgba(42,61,60,0.2)", opacity: 0.7, fontWeight: 600 },
    td: { padding: "8px 10px", borderBottom: "1px solid rgba(42,61,60,0.08)" },
  };

  if (!token) {
    return (
      <div style={styleA.page}>
        <div style={{ ...styleA.box, maxWidth: 360, paddingTop: 80 }}>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, marginBottom: 20 }}>Admin Girişi</h1>
          <form onSubmit={handleLogin}>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={styleA.input} required />
            <input type="password" placeholder="Şifrə" value={password} onChange={(e) => setPassword(e.target.value)} style={styleA.input} required />
            {error && <p style={{ color: "#C0392B", fontSize: 13, marginBottom: 10 }}>{error}</p>}
            <button type="submit" style={styleA.btn} disabled={loading}>{loading ? "..." : "Daxil ol"}</button>
          </form>
        </div>
      </div>
    );
  }

  const regFiltered = (registrations || []).filter((r) => !search || (r.name || "").toLowerCase().includes(search.toLowerCase()));
  const resFiltered = (results || []).filter((r) => !search || (r.user_name || "").toLowerCase().includes(search.toLowerCase()));
  const usersFiltered = (users || []).filter((u) => !search || (u.name || "").toLowerCase().includes(search.toLowerCase()) || (u.email || "").toLowerCase().includes(search.toLowerCase()));

  const RANKS = [
    { min: 0,    label: "Başlanğıc Qartal", icon: "🥉" },
    { min: 200,  label: "Uçan Qartal",      icon: "🥈" },
    { min: 600,  label: "Qızıl Qartal",     icon: "🥇" },
    { min: 1500, label: "Qartal Ustası",    icon: "💎" },
  ];
  function getRank(xp) {
    let r = RANKS[0];
    for (const item of RANKS) if (xp >= item.min) r = item;
    return r;
  }

  return (
    <div style={styleA.page}>
      <div style={styleA.box}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26 }}>Admin Panel</h1>
          <button onClick={logout} style={{ ...styleA.btn, background: "transparent", border: "1px solid rgba(42,61,60,0.3)", color: "#2A3D3C" }}>Çıxış</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <button style={styleA.tabBtn(tab === "results")} onClick={() => setTab("results")}>Test Nəticələri ({results ? results.length : "..."})</button>
          <button style={styleA.tabBtn(tab === "registrations")} onClick={() => setTab("registrations")}>Kurs Qeydiyyatları ({registrations ? registrations.length : "..."})</button>
          <button style={styleA.tabBtn(tab === "users")} onClick={() => setTab("users")}>İstifadəçilər ({users ? users.length : "..."})</button>
          <button style={styleA.tabBtn(tab === "analytics")} onClick={() => setTab("analytics")}>Analitika</button>
          <button style={styleA.tabBtn(tab === "audio")} onClick={() => setTab("audio")}>Dinləmə Səsi</button>
        </div>

        <input placeholder="Ad üzrə axtar..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...styleA.input, maxWidth: 300 }} />

        <div style={{ overflowX: "auto" }}>
          {tab === "results" ? (
            <table style={styleA.table}>
              <thead>
                <tr>
                  <th style={styleA.th}>Ad</th>
                  <th style={styleA.th}>Rejim</th>
                  <th style={styleA.th}>Səviyyə</th>
                  <th style={styleA.th}>Bal</th>
                  <th style={styleA.th}>Tarix</th>
                </tr>
              </thead>
              <tbody>
                {resFiltered.map((r) => (
                  <tr key={r.id}>
                    <td style={styleA.td}>{r.user_name}</td>
                    <td style={styleA.td}>{r.mode === "level" ? "Səviyyə imtahanı" : "Səviyyəni yoxla"}</td>
                    <td style={styleA.td}>{r.level}</td>
                    <td style={styleA.td}>{r.score != null ? `${r.score}%` : "—"}</td>
                    <td style={styleA.td}>{new Date(r.created_at).toLocaleString("az-AZ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === "registrations" ? (
            <table style={styleA.table}>
              <thead>
                <tr>
                  <th style={styleA.th}>Ad</th>
                  <th style={styleA.th}>Telefon</th>
                  <th style={styleA.th}>Kurs</th>
                  <th style={styleA.th}>Tarix</th>
                </tr>
              </thead>
              <tbody>
                {regFiltered.map((r) => (
                  <tr key={r.id}>
                    <td style={styleA.td}>{r.name}</td>
                    <td style={styleA.td}>{r.phone}</td>
                    <td style={styleA.td}>{r.course}</td>
                    <td style={styleA.td}>{new Date(r.created_at).toLocaleString("az-AZ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === "users" ? (
            <table style={styleA.table}>
              <thead>
                <tr>
                  <th style={styleA.th}>Ad</th>
                  <th style={styleA.th}>Email</th>
                  <th style={styleA.th}>Xal / Dərəcə</th>
                  <th style={styleA.th}>Premium</th>
                  <th style={styleA.th}>Bugünkü testlər</th>
                  <th style={styleA.th}>Qeydiyyat tarixi</th>
                  <th style={styleA.th}></th>
                </tr>
              </thead>
              <tbody>
                {usersFiltered.map((u) => {
                  const xp = xpMap[u.id] || 0;
                  const rank = getRank(xp);
                  const isTopRank = rank.label === "Qartal Ustası";
                  return (
                  <tr key={u.id}>
                    <td style={styleA.td}>{u.name || "—"}{u.is_admin ? " (Admin)" : ""}</td>
                    <td style={styleA.td}>{u.email}</td>
                    <td style={styleA.td}>
                      {!u.is_admin && (
                        <>
                          <span>{rank.icon} {rank.label} · {xp} xal</span>
                          {isTopRank && !u.is_premium && (
                            <span style={{
                              display: "inline-block", marginLeft: 8, fontSize: 11, fontWeight: 700,
                              padding: "2px 8px", borderRadius: 999,
                              background: "rgba(212,175,55,0.18)", color: "#8A6D1A",
                            }}>🎖️ Premium-a layiqdir</span>
                          )}
                        </>
                      )}
                    </td>
                    <td style={styleA.td}>{u.is_admin ? "—" : u.is_premium ? "✦ Bəli" : "Xeyr"}</td>
                    <td style={styleA.td}>{u.tests_count || 0}</td>
                    <td style={styleA.td}>{new Date(u.created_at).toLocaleString("az-AZ")}</td>
                    <td style={styleA.td}>
                      {!u.is_admin && (
                        <button
                          onClick={() => togglePremium(u)}
                          disabled={premiumBusy === u.id}
                          style={{
                            ...styleA.btn, padding: "6px 14px", fontSize: 12.5,
                            background: u.is_premium ? "transparent" : "#FF8C00",
                            color: u.is_premium ? "#C0392B" : "#F5F5DC",
                            border: u.is_premium ? "1px solid #C0392B" : "none",
                            opacity: premiumBusy === u.id ? 0.6 : 1,
                          }}
                        >
                          {premiumBusy === u.id ? "..." : u.is_premium ? "Premiumu ləğv et" : "Premium et"}
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          ) : tab === "analytics" ? (
            (() => {
              const todayStr = new Date().toISOString().slice(0, 10);
              const visitsToday = (visits || []).filter((v) => v.created_at?.slice(0, 10) === todayStr).length;
              const usersToday = (users || []).filter((u) => u.created_at?.slice(0, 10) === todayStr).length;
              const last7 = Array.from({ length: 7 }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                const key = d.toISOString().slice(0, 10);
                return {
                  day: d.toLocaleDateString("az-AZ", { weekday: "short" }),
                  visits: (visits || []).filter((v) => v.created_at?.slice(0, 10) === key).length,
                  signups: (users || []).filter((u) => u.created_at?.slice(0, 10) === key).length,
                };
              });
              return (
                <div>
                  <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
                    <div style={{ background: "rgba(255,140,0,0.08)", border: "1px solid rgba(255,140,0,0.3)", borderRadius: 10, padding: "16px 24px", minWidth: 140 }}>
                      <div style={{ fontSize: 26, fontWeight: 700 }}>{visitsToday}</div>
                      <div style={{ fontSize: 12.5, opacity: 0.7 }}>Bugünkü ziyarət</div>
                    </div>
                    <div style={{ background: "rgba(0,168,150,0.08)", border: "1px solid rgba(0,168,150,0.3)", borderRadius: 10, padding: "16px 24px", minWidth: 140 }}>
                      <div style={{ fontSize: 26, fontWeight: 700 }}>{usersToday}</div>
                      <div style={{ fontSize: 12.5, opacity: 0.7 }}>Bugünkü qeydiyyat</div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(42,61,60,0.15)", borderRadius: 10, padding: "16px 24px", minWidth: 140 }}>
                      <div style={{ fontSize: 26, fontWeight: 700 }}>{totalVisits !== null ? totalVisits : "..."}</div>
                      <div style={{ fontSize: 12.5, opacity: 0.7 }}>Ümumi ziyarət</div>
                    </div>
                  </div>
                  <h3 style={{ fontSize: 15, marginBottom: 12, opacity: 0.85 }}>Son 7 gün</h3>
                  <table style={styleA.table}>
                    <thead><tr><th style={styleA.th}>Gün</th><th style={styleA.th}>Ziyarət</th><th style={styleA.th}>Qeydiyyat</th></tr></thead>
                    <tbody>
                      {last7.map((d, i) => (
                        <tr key={i}>
                          <td style={styleA.td}>{d.day}</td>
                          <td style={styleA.td}>{d.visits}</td>
                          <td style={styleA.td}>{d.signups}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()
          ) : (
            <div>
              <div style={{ marginBottom: 18, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ fontSize: 13 }}>Edge Function adı:</label>
                <input value={funcName} onChange={(e) => setFuncName(e.target.value)} style={{ ...styleA.input, maxWidth: 220 }} />
                <button onClick={loadMissingUnits} style={{ ...styleA.btn, background: "transparent", border: "1px solid rgba(42,61,60,0.3)", color: "#2A3D3C" }}>
                  Siyahını yenilə
                </button>
              </div>

              <p style={{ fontSize: 14, marginBottom: 14 }}>
                Səsi olmayan fəsillər: <b>{missingUnits === null ? "yüklənir..." : missingUnits.length}</b>
              </p>

              {missingUnits && missingUnits.length > 0 && !generating && (
                <button onClick={generateAllAudio} style={{ ...styleA.btn, background: "#FF8C00", marginBottom: 16 }}>
                  🎧 Hamısının səsini yarat ({missingUnits.length} fəsil)
                </button>
              )}

              {generating && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 13.5, marginBottom: 8 }}>
                    Yaradılır: {genDone} / {missingUnits.length}
                  </p>
                  <div style={{ height: 8, borderRadius: 4, background: "rgba(42,61,60,0.10)", overflow: "hidden", marginBottom: 10, maxWidth: 400 }}>
                    <div style={{ height: "100%", width: `${(genDone / missingUnits.length) * 100}%`, background: "#00A896", transition: "width .3s" }} />
                  </div>
                  <button onClick={stopGeneration} style={{ ...styleA.btn, background: "transparent", border: "1px solid #C0392B", color: "#C0392B" }}>
                    Dayandır
                  </button>
                </div>
              )}

              {genLog.length > 0 && (
                <div style={{
                  background: "rgba(255,255,255,0.85)", border: "1px solid rgba(42,61,60,0.15)", borderRadius: 10,
                  padding: "12px 14px", maxHeight: 320, overflowY: "auto", fontSize: 13, fontFamily: "monospace",
                }}>
                  {genLog.map((line, i) => (
                    <div key={i} style={{ padding: "2px 0", color: line.startsWith("✗") ? "#C0392B" : "#2A3D3C" }}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


export default AdminPanel;
