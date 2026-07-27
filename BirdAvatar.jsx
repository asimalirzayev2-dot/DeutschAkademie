import React from "react";
import { Bird } from "lucide-react";

// Lucide "Bird" ikonu + her qus ucun ferqli reng temasi
export const BIRD_OPTIONS = [
  { key: "qartal",    name: "Qartal",          bg: "#7A4B12", icon: "#F0C24B" },
  { key: "sahin",     name: "Şahin",           bg: "#2F4858", icon: "#8FC6E8" },
  { key: "qaratoyuq", name: "Qaratoyuq",       bg: "#1F1F22", icon: "#FF9B21" },
  { key: "qagayi",    name: "Xəzər qağayısı",  bg: "#3D6E8F", icon: "#F5F5EC" },
  { key: "bulbul",    name: "Bülbül",          bg: "#6B5334", icon: "#E8D2A6" },
  { key: "turac",     name: "Turac",           bg: "#2A2118", icon: "#C98A4B" },
  { key: "leylek",    name: "Leylək",          bg: "#4B6B5A", icon: "#F5F5EC" },
  { key: "bayqus",    name: "Bayquş",          bg: "#5A4632", icon: "#E0A93B" },
  { key: "quqususu",  name: "Qu quşu",         bg: "#3E5C74", icon: "#FFFFFF" },
  { key: "flaminqo",  name: "Flaminqo",        bg: "#8C4A5E", icon: "#F2A0B5" },
  { key: "turkuaz",   name: "Firuzə",          bg: "#00A896", icon: "#F5F5DC" },
  { key: "narinci",   name: "Günəş",           bg: "#FF8C00", icon: "#FFFFFF" },
];

export function birdByKey(key) {
  return BIRD_OPTIONS.find((b) => b.key === key) || null;
}

export default function BirdAvatar({ birdKey, size = 40, fallbackLetter = "?", ring = false }) {
  const b = birdByKey(birdKey);
  const s = size;

  if (!b) {
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

  return (
    <span style={{
      width: s, height: s, borderRadius: "50%", flexShrink: 0, background: b.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      border: ring ? "2px solid #D4AF37" : "1px solid rgba(42,61,60,0.14)",
    }}>
      <Bird size={s * 0.56} color={b.icon} strokeWidth={2.1} />
    </span>
  );
}
