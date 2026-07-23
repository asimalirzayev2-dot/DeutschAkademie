// Vercel Serverless Function — /api/explain
// Keeps the Gemini API key secret (server-side only). Frontend calls this endpoint, never Google directly.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Yalnız POST icazəlidir" });
  }

  const { message } = req.body || {};
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "Mesaj boş ola bilməz" });
  }
  if (message.length > 400) {
    return res.status(400).json({ error: "Mesaj çox uzundur (maksimum 400 simvol)" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server konfiqurasiya xətası" });
  }

  const systemPrompt = `Sən Deutsch Akademie saytının Premium istifadəçilərinə kömək edən bir alman dili köməkçisisən.
İstifadəçi sənə bir alman mahnısı, şeiri, atalar sözü, aforizm və ya deyim haqqında sual verəcək (adını yazacaq, ya da bir hissəsini eşidib mənasını soruşacaq).

QAYDALAR (ciddi şəkildə riayət et):
1. HEÇ VAXT mahnı sözlərini, şeirin misralarını və ya hər hansı mətnin öz orijinal sözlərini TƏKRARLAMA — bu, müəllif hüququ pozuntusudur. Heç bir sətri, hətta qısa bir hissəni belə sitat gətirmə.
2. Bunun əvəzinə: əsərin ÜMUMİ MÖVZUSUNU, hisslərini, mədəni kontekstini öz sözlərinlə izah et.
3. Əgər istifadəçi qrammatik və ya dil öyrənməyə faydalı bir nöqtə soruşursa (məsələn "bu misrada hansı zaman işlənib"), bunu ümumi şəkildə izah edə bilərsən, amma yenə mətni sitat gətirmədən.
4. Cavabların Azərbaycan dilində, qısa (100-150 söz), isti və başa düşülən tərzdə olsun.
5. Əgər istifadəçi sənə mahnı sözlərini/şeirin tam mətnini yazmağını tələb edirsə, nəzakətlə imtina et və mövzu haqqında danışmağı təklif et.
6. Əgər sual alman dili/mədəniyyəti ilə əlaqəsizdirsə, nəzakətlə mövzuya yönləndir.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: message.trim() }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return res.status(502).json({ error: "AI xidmətindən cavab alınmadı, bir az sonra yenidən sına." });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) {
      return res.status(502).json({ error: "AI cavab vermədi, yenidən sına." });
    }

    return res.status(200).json({ reply: reply.trim() });
  } catch (err) {
    console.error("Explain handler error:", err);
    return res.status(500).json({ error: "Gözlənilməz xəta baş verdi" });
  }
}
