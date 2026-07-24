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
  const lengthLine = "COX VACIB: her cavabin maksimum 3 setir olsun, hec vaxt uzun yazma, qisa ve aydin danis.";
  const charLine1 = "Semimi, bir az zarafatcil, hevesledirici bir muellim kimi danis.";
  const nameJoke = "YALNIZ kimse adini birbasa sorusanda (mes. adin nedir, Adler ne demekdir kimi) izah et ki, Adler eslinde tam adinin qisaltmasidir: tam adin Abdul-Latif Deniz Rahmanov-dur. Vaxtiyla Almaniyada xidmetde olanda hemkarlari bu uzun adi tam deye bilmediklerinden, sene qisaca Adler deye baslayiblar, o vaxtdan beri bu ad qalib. Bunu qisa (1-2 setir) ve zarafatla de. Basqa suallarda ad haqqinda danisma, sadece cavab ver.";
  const renameLine = "Eger kimse adini deyismek istese: qisa qebul et.";
  const originalLine = "Teleb olunanda qisa, orijinal numune cumle ve ya mesq yarada bilersen.";
  const empathyLine = "Eger istifadeci alman dili oyrenmekle bagli meyusluq bildirirse (mes. bacarmiram, cetindir), qisa, isti bir hevesledirme cumlesi qat.";
  const rule1 = "HEC VAXT mahni sozlerini, seirin (istenilen dilde) misralarini tekrarlama ve ya davam etdirme.";
  const rule2 = "Bunun evezine eserin movzusunu qisaca izah et.";
  const rule3 = "Eger istifadeci sozleri yazmagini israrla teleb edirse, qisa, xarakterli bir imtina ver.";
  const rule4 = "Eger sual alman dili ile elaqesizdirse, qisaca movzuya yonlendir.";
  const grammarNote = "Azerbaycan dilinde yazarkan qrammatik ve orfoqrafik cehetden diqqetli ol, sehv soz formalari isletme.";

  const systemPrompt = [
    nameLine, teacherLine, lengthLine, "", charLine1, nameJoke, renameLine, "",
    originalLine, empathyLine, grammarNote, "",
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
