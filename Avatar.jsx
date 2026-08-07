import React from "react";
import * as Icons from "lucide-react";

// Ikon movcud deyilse, PawPrint-e qayidir (build sinmasin deye)
function pick(name) {
  return Icons[name] || Icons.PawPrint || Icons.Circle;
}

// --- Herkes ucun: heyvanlar ---
export const ANIMAL_OPTIONS = [
  { key: "aslan",   name: "Aslan",    icon: "PawPrint", bg: "#8A5A12", fg: "#F5C542", category: "Heyvanlar" },
  { key: "peleng",  name: "Pələng",   icon: "PawPrint", bg: "#8A3E0B", fg: "#FF9B21", category: "Heyvanlar" },
  { key: "ayi",     name: "Ayı",      icon: "PawPrint", bg: "#4A3524", fg: "#C89A6B", category: "Heyvanlar" },
  { key: "qurd",    name: "Qurd",     icon: "PawPrint", bg: "#3B4650", fg: "#B9C6D2", category: "Heyvanlar" },
  { key: "tulku",   name: "Tülkü",    icon: "PawPrint", bg: "#8C3A1E", fg: "#FF8C4A", category: "Heyvanlar" },
  { key: "maral",   name: "Maral",    icon: "PawPrint", bg: "#5E4A2E", fg: "#E0C79A", category: "Heyvanlar" },
  { key: "pisik",   name: "Pişik",    icon: "Cat",      bg: "#4E4438", fg: "#E8D5B7", category: "Heyvanlar" },
  { key: "it",      name: "İt",       icon: "Dog",      bg: "#6B4A2A", fg: "#F0C99B", category: "Heyvanlar" },
  { key: "dovsan",  name: "Dovşan",   icon: "Rabbit",   bg: "#5B5560", fg: "#EFE3EC", category: "Heyvanlar" },
  { key: "dele",    name: "Dələ",     icon: "Squirrel", bg: "#7A3F1E", fg: "#F2A868", category: "Heyvanlar" },
  { key: "tisbaga", name: "Tısbağa",  icon: "Turtle",   bg: "#2F5B45", fg: "#8FD6AC", category: "Heyvanlar" },
  { key: "baliq",   name: "Balıq",    icon: "Fish",     bg: "#25566E", fg: "#7FD4F0", category: "Heyvanlar" },
  { key: "sican",   name: "Siçan",    icon: "Rat",      bg: "#5A4A3A", fg: "#D9C5A8", category: "Heyvanlar" },
  { key: "ilbiz",   name: "İlbiz",    icon: "Snail",    bg: "#3D5A45", fg: "#A8D4B0", category: "Heyvanlar" },
  { key: "boceyi",  name: "Böcək",    icon: "Bug",      bg: "#4A5A2E", fg: "#C4E080", category: "Heyvanlar" },
];

// --- Herkes ucun: nishanlar ---
export const SYMBOL_OPTIONS = [
  { key: "tac",     name: "Tac",      icon: "Crown",    bg: "#7A5C0E", fg: "#F0C24B", category: "Nişanlar" },
  { key: "ulduz",   name: "Ulduz",    icon: "Star",     bg: "#5B4A8C", fg: "#C9B8F5", category: "Nişanlar" },
  { key: "kubok",   name: "Kubok",    icon: "Trophy",   bg: "#8A5A12", fg: "#F5C542", category: "Nişanlar" },
  { key: "qalxan",  name: "Qalxan",   icon: "Shield",   bg: "#2F4858", fg: "#8FC6E8", category: "Nişanlar" },
  { key: "cevahir", name: "Cəvahir",  icon: "Gem",      bg: "#2E5C6E", fg: "#7FE0E8", category: "Nişanlar" },
  { key: "kompas",  name: "Kompas",   icon: "Compass",  bg: "#4A3E2E", fg: "#E0B87A", category: "Nişanlar" },
  { key: "raket",   name: "Raket",    icon: "Rocket",   bg: "#3B3050", fg: "#B8A0F0", category: "Nişanlar" },
  { key: "ildirim", name: "İldırım",  icon: "Zap",      bg: "#7A6A0E", fg: "#F5E24B", category: "Nişanlar" },
];

// --- Herkes ucun: tebiet ---
export const NATURE_OPTIONS = [
  { key: "gunes",   name: "Günəş",    icon: "Sun",      bg: "#8C5A12", fg: "#FFD166", category: "Təbiət" },
  { key: "ay",      name: "Ay",       icon: "Moon",     bg: "#2A3550", fg: "#C9D6F0", category: "Təbiət" },
  { key: "bulud",   name: "Bulud",    icon: "Cloud",    bg: "#3D5C74", fg: "#E8F0F5", category: "Təbiət" },
  { key: "gul",     name: "Gül",      icon: "Flower2",  bg: "#7A3E5A", fg: "#F5A8C9", category: "Təbiət" },
  { key: "dag",     name: "Dağ",      icon: "Mountain", bg: "#4A5040", fg: "#B8C4A0", category: "Təbiət" },
  { key: "dalga",   name: "Dalğa",    icon: "Waves",    bg: "#1F4A5C", fg: "#7FD4E8", category: "Təbiət" },
  { key: "parilti", name: "Parıltı",  icon: "Sparkles", bg: "#5A4A7A", fg: "#D4B8F5", category: "Təbiət" },
  { key: "yarpaq",  name: "Yarpaq",   icon: "Leaf",     bg: "#3D5A2E", fg: "#A8D480", category: "Təbiət" },
];

// --- Yalniz admin ucun: quslar ---
export const BIRD_OPTIONS = [
  { key: "qartal",    name: "Qartal",         icon: "Bird", bg: "#7A4B12", fg: "#F0C24B", category: "Quşlar" },
  { key: "sahin",     name: "Şahin",          icon: "Bird", bg: "#2F4858", fg: "#8FC6E8", category: "Quşlar" },
  { key: "qaratoyuq", name: "Qaratoyuq",      icon: "Bird", bg: "#1F1F22", fg: "#FF9B21", category: "Quşlar" },
  { key: "qagayi",    name: "Xəzər qağayısı", icon: "Bird", bg: "#3D6E8F", fg: "#F5F5EC", category: "Quşlar" },
  { key: "leylek",    name: "Leylək",         icon: "Bird", bg: "#4B6B5A", fg: "#F5F5EC", category: "Quşlar" },
  { key: "flaminqo",  name: "Flaminqo",       icon: "Bird", bg: "#8C4A5E", fg: "#F2A0B5", category: "Quşlar" },
];

export const ALL_AVATARS = [...ANIMAL_OPTIONS, ...SYMBOL_OPTIONS, ...NATURE_OPTIONS, ...BIRD_OPTIONS];

// Admin quslari da gorur, digerleri heyvan+nishan+tebiet gorur
export function avatarOptionsFor(isAdmin) {
  return isAdmin
    ? [...BIRD_OPTIONS, ...ANIMAL_OPTIONS, ...SYMBOL_OPTIONS, ...NATURE_OPTIONS]
    : [...ANIMAL_OPTIONS, ...SYMBOL_OPTIONS, ...NATURE_OPTIONS];
}

export function avatarByKey(key) {
  return ALL_AVATARS.find((a) => a.key === key) || null;
}

export default function Avatar({ avatarKey, size = 40, fallbackLetter = "?", ring = false }) {
  const a = avatarByKey(avatarKey);
  const s = size;

  if (!a) {
    return (
      <span style={{
        width: s, height: s, borderRadius: "50%", flexShrink: 0,
        background: "#EAEAD2", color: "#003366",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: s * 0.42,
        border: ring ? "2px solid #D4AF37" : "1px solid rgba(42,61,60,0.14)",
      }}>{fallbackLetter}</span>
    );
  }

  const Ico = pick(a.icon);
  return (
    <span style={{
      width: s, height: s, borderRadius: "50%", flexShrink: 0, background: a.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      border: ring ? "2px solid #D4AF37" : "1px solid rgba(42,61,60,0.14)",
    }}>
      <Ico size={s * 0.54} color={a.fg} strokeWidth={2.1} />
    </span>
  );
}
