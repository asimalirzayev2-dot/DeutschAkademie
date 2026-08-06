// /api/generate-sentences.js
// Bir söz üçün TƏK bir API çağırışında 3 nümunə cümlə generasiya edir.
// Bu cümlələr word_sentences cədvəlində əbədi saxlanılır və bütün istifadəçilər
// arasında fırlanaraq təkrar istifadə olunur — söz başına yalnız BİR DƏFƏ AI çağırışı.
//
// /api/explain.js ilə eyni env dəyişənini (ANTHROPIC_API_KEY) istifadə edir.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Yalnız POST icazəlidir" });
  }

  const { term, translation, level } = req.body || {};
  if (!term || !translation || !level) {
    return res.status(400).json({ error: "term, translation və level tələb olunur" });
  }

  const prompt = `Du bist ein Deutschlehrer für Azerbaidschani-sprachige Lernende auf Niveau ${level}.

Bilde genau 3 kurze, natürliche deutsche Beispielsätze (6-10 Wörter) für das Wort "${term}" (Übersetzung: "${translation}").

Wichtige Regeln:
- Verwende das Wort "${term}" in JEDEM Satz GENAU SO, wie es geschrieben ist (keine Konjugation, keine Deklination, keine Großschreibungsänderung).
- Die Sätze müssen sich inhaltlich klar voneinander unterscheiden (unterschiedlicher Kontext).
- Niveau ${level}-angemessene Grammatik und Wortschatz.
- Antworte NUR mit einem JSON-Array aus genau 3 Strings, ohne Markdown, ohne Erklärung. Beispiel-Format:
["Satz eins.", "Satz zwei.", "Satz drei."]`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: "AI xidmətindən xəta", detail: errText });
    }

    const data = await response.json();
    const raw = (data.content || []).map((b) => b.text || "").join("").trim();
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

    let sentences;
    try {
      sentences = JSON.parse(cleaned);
    } catch {
      return res.status(502).json({ error: "AI cavabı parse edilə bilmədi", raw });
    }

    if (!Array.isArray(sentences) || sentences.length === 0) {
      return res.status(502).json({ error: "Gözlənilməyən format", raw });
    }

    // Sözün doğrudan cümlədə keçdiyini yoxla (əks halda boşluq/sıralama oyunu işləməz)
    const valid = sentences.filter((s) => typeof s === "string" && s.includes(term));
    if (valid.length === 0) {
      return res.status(502).json({ error: "Heç bir cümlə sözü ehtiva etmir", raw });
    }

    return res.status(200).json({ sentences: valid });
  } catch (err) {
    return res.status(500).json({ error: "Server xətası", detail: String(err) });
  }
}
