import React from "react";

// Adler Cup — cavab fiqurlari (Kahoot uslubu)
export const SHAPES = [
  { key: "tri",  color: "#E21B3C", name: "ucbucaq" },
  { key: "dia",  color: "#1368CE", name: "romb" },
  { key: "cir",  color: "#D89E00", name: "daire" },
  { key: "sq",   color: "#26890C", name: "kvadrat" },
];

export function ShapeIcon({ kind, size = 28, color = "#fff" }) {
  const s = size;
  if (kind === "tri") {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24"><polygon points="12,3 22,21 2,21" fill={color} /></svg>
    );
  }
  if (kind === "dia") {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24"><polygon points="12,2 22,12 12,22 2,12" fill={color} /></svg>
    );
  }
  if (kind === "cir") {
    return (
      <svg width={s} height={s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill={color} /></svg>
    );
  }
  return (
    <svg width={s} height={s} viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" fill={color} /></svg>
  );
}
