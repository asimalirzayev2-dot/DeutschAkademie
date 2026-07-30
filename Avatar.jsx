import React from "react";
import * as Icons from "lucide-react";

// Ikon movcud deyilse, PawPrint-e qayidir (build sinmasin deye)
function pick(name) {
  return Icons[name] || Icons.PawPrint || Icons.Circle;
}

// --- Herkes ucun: heyvanlar ---
export const ANIMAL_OPTIONS = [
  { key: "aslan",   name: "Aslan",    icon: "PawPrint", bg: "#8A5A12", fg: "#F5C542" },
  { key: "peleng",  name: "Pələng",   icon: "PawPrint", bg: "#8A3E0B", fg: "#FF9B21" },
  { key: "ayi",     name: "Ayı",      icon: "PawPrint", bg: "#4A3524", fg: "#C89A6B" },
  { key: "qurd",    name: "Qurd",     icon: "PawPrint", bg: "#3B4650", fg: "#B9C6D2" },
  { key: "tulku",   name: "Tülkü",    icon: "PawPrint", bg: "#8C3A1E", fg: "#FF8C4A" },
  { key: "maral",   name: "Maral",    icon: "PawPrint", bg: "#5E4A2E", fg: "#E0C79A" },
  { key: "pisik",   name: "Pişik",    icon: "Cat",      bg: "#4E4438", fg: "#E8D5B7" },
  { key: "it",      name: "İt",       icon: "Dog",      bg: "#6B4A2A", fg: "#F0C99B" },
  { key: "dovsan",  name: "Dovşan",   icon: "Rabbit",   bg: "#5B5560", fg: "#EFE3EC" },
  { key: "dele",    name: "Dələ",     icon: "Squirrel", bg: "#7A3F1E", fg: "#F2A868" },
  { key: "tisbaga", name: "Tısbağa",  icon: "Turtle",   bg: "#2F5B45", fg: "#8FD6AC" },
  { key: "baliq",   name: "Balıq",    icon: "Fish",     bg: "#25566E", fg: "#7FD4F0" },
];

// --- Yalniz admin ucun: quslar ---
export const BIRD_OPTIONS = [
  { key: "qartal",    name: "Qartal",         icon: "Bird", bg: "#7A4B12", fg: "#F0C24B" },
  { key: "sahin",     name: "Şahin",          icon: "Bird", bg: "#2F4858", fg: "#8FC6E8" },
  { key: "qaratoyuq", name: "Qaratoyuq",      icon: "Bird", bg: "#1F1F22", fg: "#FF9B21" },
  { key: "qagayi",    name: "Xəzər qağayısı", icon: "Bird", bg: "#3D6E8F", fg: "#F5F5EC" },
  { key: "leylek",    name: "Leylək",         icon: "Bird", bg: "#4B6B5A", fg: "#F5F5EC" },
  { key: "flaminqo",  name: "Flaminqo",       icon: "Bird", bg: "#8C4A5E", fg: "#F2A0B5" },
];

export const ALL_AVATARS = [...ANIMAL_OPTIONS, ...BIRD_OPTIONS];

// Admin quslari da gorur, digerleri yalniz heyvanlari
export function avatarOptionsFor(isAdmin) {
  return isAdmin ? [...BIRD_OPTIONS, ...ANIMAL_OPTIONS] : ANIMAL_OPTIONS;
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
