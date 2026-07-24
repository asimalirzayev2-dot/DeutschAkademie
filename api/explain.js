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
- Nümunə cümlələr, kiçik məşqlər, ya da tələb olunanda tam orijinal (he
