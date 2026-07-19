const SUPABASE_URL = "https://krtfwdhdxspljykdglzp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtydGZ3ZGhkeHNwbGp5a2RnbHpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMTY5MDAsImV4cCI6MjA5OTg5MjkwMH0.iNwM5TLqXeuo5NCupYvo_vEO1uioY6CwPiVWGUbpBYE";

export async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
  return res.json();
}

export async function sbInsert(table, row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Supabase insert error: ${res.status}`);
}

// ---- Admin auth ----
export async function adminLogin(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Giriş uğursuz oldu");
  return res.json();
}

export async function sbAuth(path, accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
  return res.json();
}

export async function sbAuthPatch(path, accessToken, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase update error: ${res.status}`);
}

export async function sbAuthInsert(path, accessToken, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase insert error: ${res.status}`);
}

export async function signUp(email, password, name) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, data: { name } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || data.error_description || "Qeydiyyat uğursuz oldu");
  return data;
}

export async function verifyGumroadLicense(licenseKey, productId) {
  const body = new URLSearchParams();
  body.append("product_id", productId);
  body.append("license_key", licenseKey);
  body.append("increment_uses_count", "false");
  const res = await fetch("https://api.gumroad.com/v2/licenses/verify", { method: "POST", body });
  return res.json();
}

// ---- Lesson PDF public URL (Storage bucket: lesson-pdfs) ----
export function pdfUrl(level, num) {
  const padded = String(num).padStart(2, "0");
  return `${SUPABASE_URL}/storage/v1/object/public/lesson-pdfs/${level}_${padded}.pdf`;
}
