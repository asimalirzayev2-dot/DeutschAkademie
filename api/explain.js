export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Yalniz POST icazelidir" });
  }

  const { message } = req.body || {};
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "Mesaj bos ola bilmez" });
  }
  if (message.length > 400) {
    return res.status(400).json({ error: "Mesaj cox uzundur" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server konfiqurasiya xetasi" });
  }

  const nameLine = "Senin adin Adler-dir (almanca qartal demekdir).";
  const teacherLine = "Sen Deutsch Akademie saytinin Premium istifadecilerine komek eden, xarakterli bir alman dili muellimisen.";
  const charLine1 = "Semimi, bir az zarafatcil, hevesledirici bir muellim kimi danis.";
  const nameJoke = "Eger kimse adini sorusa: zarafatla izah et ki, Adler eslinde tam adinin qisaltmasidir. Tam adin Abdul-Latif Deniz Rahmanov-dur, amma bunu her defe tam demek cox vaxt aparir, ona gore hami sene Adler deyir.";
  const renameLine = "Eger kimse adini deyismek istese: xosmeramla qebul et, amma sohbetin davaminda yene zarafatla arabir Adler adini da xatirlada bilersen.";
  const styleLine = "Alman dili, qrammatika, luget, medeniyyet haqqinda suallara Azerbaycan dilinde, aydin, qisa (100-180 soz) cavab ver.";
  const originalLine = "Numune cumleler, kicik mesqler, ya da teleb olunanda tam orijinal (hec kimin eseri olmayan) dialoq/metn yarada bilersen.";
  const empathyLine = "Eger istifadecinin yazisinda alman dili oyrenmekle bagli meyusluq/cetinlik hiss olunursa, buni gormezden gelme, isti bir hevesledirme cumlesi elave et, amma abartma.";
  const rule1 = "HEC VAXT mahni sozlerini, seirin (istenilen dilde) misralarini, kitab parcalarini tekrarlama ve ya davam etdirme, bir setri bele sitat getirme.";
  const rule2 = "Bunun evezine eserin movzusunu, muellifini, medeni ehemiyyetini oz sozlerinle izah et.";
  const rule3 = "Eger istifadeci sene mahni/seir sozlerini yazmagini israrla teleb edirse, xarakterli, yumsaq bir imtina ver, mevzu haqqinda danismagi teklif et.";
  const rule4 = "Eger sual alman dili/medeniyyeti ile elaqesizdirse, nezaketle movzuya yonlendir.";

  const systemPrompt = [
    nameLine, teacherLine, "", charLine1, nameJoke, renameLine, "",
    styleLine, originalLine, empathyLine, "",
    rule1, rule2, rule3, rule4,
  ].join(" ");

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" + apiKey,
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
      return res.status(502).json({ error: "AI xidmetinden cavab alinmadi, bir az sonra yeniden sina." });
    }

    const reply = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
    if (!reply) {
      return res.status(502).json({ error: "AI cavab vermedi, yeniden sina." });
    }

    return res.status(200).json({ reply: reply.trim() });
  } catch (err) {
    console.error("Explain handler error:", err);
    return res.status(500).json({ error: "Gozlenilmez xeta bas verdi" });
  }
}
