import React, { useMemo } from "react";

/**
 * SupportFabButton — sağ-alt küncdə üzən dəstək düyməsi.
 *
 * İstifadə (App.jsx içində):
 *   import SupportFabButton from "./SupportFabButton";
 *   ...
 *   <SupportFabButton isPremium={profile?.is_premium || profile?.is_admin} onClick={openSupportBot} />
 *
 * Props:
 *   isPremium  — true olduqda qızılı dəfnə çələngi düymənin ətrafına "taxılır" və işıldayır.
 *   onClick    — düyməyə basanda çağırılan funksiya (dəstək botunu açmaq üçün).
 *
 * Heç bir xarici asılılıq tələb etmir (öz CSS-i faylın sonunda <style> ilə daxildir,
 * istəsən bunu ayrı bir SupportFabButton.css faylına da çıxara bilərsən).
 */

// Qartal silueti — künclü/itiq tük tacı, proqramla generasiya olunur ki, həndəsi cəhətdən
// dəqiq və eyni zamanda asanlıqla tənzimlənə bilsin (spikes/radius dəyişməklə).
function buildEaglePath() {
  const cx = 58,
    cy = 48;
  const outerR = 34,
    innerR = 24.5;
  const startAngle = -166,
    endAngle = 16;
  const spikes = 12;
  let pts = [];
  for (let i = 0; i <= spikes; i++) {
    const t = i / spikes;
    const angle = ((startAngle + t * (endAngle - startAngle)) * Math.PI) / 180;
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  let d = `M12,52 C14,44 18,40 ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)} `;
  for (let i = 1; i < pts.length; i++) {
    d += `L${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)} `;
  }
  const last = pts[pts.length - 1];
  d += `
    C ${(last[0] + 6).toFixed(1)},${(last[1] + 13).toFixed(1)} ${(last[0] - 8).toFixed(1)},${(last[1] + 26).toFixed(1)} 74,88
    C 66,93 55,93 48,88
    C 40,84 33,78 30,68
    C 27,60 22,60 18,58
    C 20,60 14,56 12,52 Z`;
  return d;
}

// Dəfnə çələngi yarpaqları — dairə ətrafında qütb koordinatları ilə generasiya olunur.
function buildWreathLeaves(cx, cy) {
  const leaves = [];
  const leavesPerSide = 8;

  const makeLeaf = (angleDeg, dist, size, curl, key) => {
    const a = (angleDeg * Math.PI) / 180;
    const x = cx + dist * Math.cos(a);
    const y = cy + dist * Math.sin(a);
    const tangent = angleDeg + 90 + curl;
    const w = size,
      h = size * 2.1;
    const d = `M0,0 C ${w * 0.55},${h * 0.18} ${w * 0.55},${h * 0.62} 0,${h}
               C ${-w * 0.55},${h * 0.62} ${-w * 0.55},${h * 0.18} 0,0 Z
               M0,${h * 0.06} L0,${h * 0.94}`;
    leaves.push(
      <path
        key={key}
        d={d}
        className="fab-leaf"
        stroke="#6e551c"
        strokeWidth="0.6"
        transform={`translate(${x},${y}) rotate(${tangent})`}
      />
    );
  };

  for (let i = 0; i < leavesPerSide; i++) {
    const t = i / (leavesPerSide - 1);
    const angle = 70 - t * 150;
    const dist = 46 + Math.sin(t * Math.PI) * 4;
    const size = 8 - t * 2.5;
    makeLeaf(angle, dist, size, 20 + t * 10, `r${i}`);
  }
  for (let i = 0; i < leavesPerSide; i++) {
    const t = i / (leavesPerSide - 1);
    const angle = 110 + t * 150;
    const dist = 46 + Math.sin(t * Math.PI) * 4;
    const size = 8 - t * 2.5;
    makeLeaf(angle, dist, size, -(20 + t * 10), `l${i}`);
  }
  return leaves;
}

export default function SupportFabButton({ isPremium = false, onClick }) {
  const eagleD = useMemo(() => buildEaglePath(), []);
  const wreathLeaves = useMemo(() => buildWreathLeaves(75, 78), []);

  return (
    <>
      <button
        type="button"
        aria-label="Dəstək botunu aç"
        className={`support-fab-wrap${isPremium ? " is-premium" : ""}`}
        onClick={onClick}
      >
        <svg className="fab-wreath-svg" viewBox="0 0 150 150" aria-hidden="true">
          <defs>
            <linearGradient id="fabGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff3cf" />
              <stop offset="45%" stopColor="#E8C766" />
              <stop offset="100%" stopColor="#9c7a2c" />
            </linearGradient>
            <filter id="fabLeafShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="1.4" floodColor="#E8C766" floodOpacity="0.55" />
            </filter>
            <clipPath id="fabWreathClip">
              <circle cx="75" cy="75" r="70" />
            </clipPath>
          </defs>
          <g>{wreathLeaves}</g>
          <g clipPath="url(#fabWreathClip)">
            <rect
              className="fab-shimmer-sweep"
              x="0"
              y="0"
              width="30"
              height="150"
              fill="rgba(255,255,255,0.35)"
              transform="skewX(-20)"
            />
          </g>
        </svg>

        <span className="fab-circle">
          <svg className="fab-eagle" viewBox="0 0 100 100" aria-hidden="true">
            <defs>
              <linearGradient id="fabEagleGrad" x1="10%" y1="0%" x2="90%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="35%" stopColor="#f1f2f4" />
                <stop offset="62%" stopColor="#aab0b8" />
                <stop offset="100%" stopColor="#5b616a" />
              </linearGradient>
            </defs>
            <path d={eagleD} fill="url(#fabEagleGrad)" />
            <ellipse cx="33" cy="45.5" rx="3.2" ry="2.6" fill="#12141a" />
            <circle cx="34.1" cy="44.6" r="0.9" fill="#fff" opacity="0.9" />
            <path d="M22,42 C26,39.5 30,39 33.5,40" stroke="#5b616a" strokeWidth="0.8" fill="none" opacity="0.6" />
          </svg>
        </span>
      </button>

      <style>{`
        .support-fab-wrap{
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 84px;
          height: 84px;
          border: none;
          background: transparent;
          padding: 0;
          cursor: pointer;
          z-index: 9999;
        }
        .fab-circle{
          position: absolute;
          left: 50%; top: 50%;
          transform: translate(-50%, -50%);
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, #3fd8b8, #1f8f76 70%);
          box-shadow: 0 4px 18px rgba(47,191,160,0.45), inset 0 0 0 1px rgba(255,255,255,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: box-shadow .4s ease, transform .2s ease;
        }
        .support-fab-wrap:hover .fab-circle{
          transform: translate(-50%, -50%) scale(1.05);
        }
        .support-fab-wrap.is-premium .fab-circle{
          box-shadow: 0 4px 18px rgba(47,191,160,0.45), inset 0 0 0 1px rgba(255,255,255,0.15), 0 0 24px rgba(232,199,102,0.25);
        }
        .fab-eagle{ width: 32px; height: 32px; }

        .fab-wreath-svg{
          position: absolute;
          inset: 0;
          width: 84px;
          height: 84px;
          pointer-events: none;
          opacity: 0;
          transform: scale(0.85);
          transition: opacity .5s ease, transform .5s cubic-bezier(.34,1.56,.64,1);
        }
        .support-fab-wrap.is-premium .fab-wreath-svg{
          opacity: 1;
          transform: scale(1);
        }
        .fab-leaf{
          fill: url(#fabGoldGrad);
          filter: url(#fabLeafShadow);
        }
        .fab-shimmer-sweep{
          mix-blend-mode: screen;
          animation: fabSweep 2.8s ease-in-out infinite;
        }
        @keyframes fabSweep{
          0%{ transform: translateX(-40px); opacity: 0; }
          15%{ opacity: .9; }
          50%{ transform: translateX(40px); opacity: .9; }
          65%{ opacity: 0; }
          100%{ transform: translateX(40px); opacity: 0; }
        }
        @media (max-width: 860px){
          .support-fab-wrap{ bottom: 16px; right: 16px; width: 72px; height: 72px; }
          .fab-circle{ width: 52px; height: 52px; }
          .fab-eagle{ width: 28px; height: 28px; }
          .fab-wreath-svg{ width: 72px; height: 72px; }
        }
      `}</style>
    </>
  );
}
