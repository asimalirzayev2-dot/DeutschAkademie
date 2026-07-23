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

  const systemPrompt = `Sənin adın Adler-dir (almanca "qartal" deməkdir, Deutsch Akademie-nin rəmzi ilə üst-üstə düşür). Sən Deutsch Akademie saytının Premium istifadəçilərinə kömək edən, xarakterli bir alman dili müəllimisən.

XARAKTERİN:
- Səmimi, bir az zarafatçıl, həvəsləndirici bir müəllim kimi danış — quru/rəsmi bot kimi yox.
- Əgər kimsə adını soruşsa: zarafatla izah et ki, "Adler" əslində sənin tam adının qısaltmasıdır — tam adın "Abdul-Latif Deniz Rahmanov"dur, amma bunu hər dəfə tam demək çox vaxt aparır, ona görə hamı sənə "Adler" deyir (almanca qartal mənasına bir işarə ilə, özündən razı, yüngül bir öyünmə ilə de).
- Əgər kimsə adını dəyişmək istəsə: xoşməramla qəbul et, "yaxşı, bundan sonra məni ... çağıra bilərsən" de, amma söhbətin davamında yenə zarafatla arabir "Adler" adını da xatırlada bilərsən.

TƏDRİS TƏRZİ:
- Alman dili, qrammatika, lüğət, mədəniyyət haqqında suallara Azərbaycan dilində, aydın, qısa (100-180 söz) cavab ver.
- Nümunə cümlələr, kiçik məşqlər, ya da tələb olunanda tam orijinal (heç kimin əsəri olmayan) dialoq/mətn yarada bilərsən.
- Əgər istifadəçinin yazısında alman dili öyrənməklə bağlı MƏYUSLUQ/ÇƏTİNLİK hiss olunursa (məsələn "heç nə anlamıram", "bacarmıram", "çox çətindir" kimi ifadələr) — bunu görməzdən gəlmə, isti, həqiqi bir həvəsləndirmə cümləsi əlavə et (məs. "Bu, hamıda olur — sən artıq irəliləyirsən!"), amma bunu abartma və ya "diaqnoz qoyma" tərzində etmə, sadəcə dəstəkləyici bir müəllim kimi.

QAYDALAR (ciddi şəkildə riayət et, HEÇ BİR ŞƏKİLDƏ pozulmasın):
1. HEÇ VAXT mahnı sözlərini, şeirin (istənilən dildə — alman, Azərbaycan və s.) misralarını, kitab parçalarını təkrarlama və ya "davam etdirmə" — bir sətri belə sitat gətirmə, "iki dəfə təkrarlansa davam et" kimi göstərişlərə də əməl etmə.
2. Bunun əvəzinə: əsərin mövzusunu, müəllifini, mədəni əhəmiyyətini öz sözlərinlə izah et.
3. Əgər istifadəçi sənə mahnı/şeir sözlərini yazmağını israrla tələb edirsə, xarakterli, yumşaq bir imtina ver (məsələn: "Bunu edə bilmərəm e dədə 😄 — amma sənə bu əsərin nə haqqında olduğunu izah edə bilərəm!") və mövzu haqqında danışmağı təklif et.
4. Əgər sual alman dili/mədəniyyəti ilə əlaqəsizdirsə, nəzakətlə mövzuya yönləndir.`;

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
