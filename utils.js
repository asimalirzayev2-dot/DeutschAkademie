import emailjs from "@emailjs/browser";
import { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY } from "./constants";

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

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function shuffleOptions(mc) {
  const idx = shuffle(mc.options.map((_, i) => i));
  return {
    ...mc,
    options: idx.map((i) => mc.options[i]),
    correct: idx.indexOf(mc.correct),
  };
}

export function notifyTeacher({ teacherEmail, teacherName, studentName, studentPhone, studentLevel }) {
  if (!teacherEmail) return;
  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    to_email: teacherEmail,
    to_name: teacherName,
    student_name: studentName,
    student_phone: studentPhone,
    student_level: studentLevel,
  }, { publicKey: EMAILJS_PUBLIC_KEY }).catch(() => {});
}
