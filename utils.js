export function speakGerman(text) {
  try {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "de-DE";
    utter.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  } catch {}
}

export function exportAnki(rows, direction) {
  const lines = rows.map((r) =>
    direction === "de-az" ? `${r.term}\t${r.translation}` : `${r.translation}\t${r.term}`
  );
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "deutsch-akademie-lugat.txt";
  a.click();
  URL.revokeObjectURL(url);
}
