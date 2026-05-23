
import React, { useMemo } from 'react';

interface DitheringAvatarProps {
  seed: string;
  size?: number;
  className?: string;
}

const BAYER8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash | 0;
  }
  return Math.abs(hash);
}

function hslToHex(h: number, s: number, l: number): string {
  h /= 360;
  s /= 100;
  l /= 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hue2rgb(p, q, h + 1 / 3);
  const g = hue2rgb(p, q, h);
  const b = hue2rgb(p, q, h - 1 / 3);
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const DitheringAvatar: React.FC<DitheringAvatarProps> = ({ seed, size = 40, className = "" }) => {
  const { pixels, primaryColor, secondaryColor, bgColor } = useMemo(() => {
    const hash = hashString(seed);
    const hue = hash % 360;
    const primaryColor = hslToHex(hue, 85, 55);
    const secondaryColor = hslToHex((hue + 120) % 360, 85, 55);
    const bgColor = '#111';

    const resolution = 20;
    const angle = (hash / 360) * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const falloff = 0.55 + ((hash >> 8) % 100) / 400;

    const grid: { x: number; y: number }[] = [];

    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const nx = (x + 0.5) / resolution - 0.5;
        const ny = (y + 0.5) / resolution - 0.5;
        const proj = nx * cosA + ny * sinA;
        const value = (proj + falloff) / (falloff * 2);
        const threshold = BAYER8[y % 8][x % 8] / 64;
        if (value > threshold) {
          grid.push({ x, y });
        }
      }
    }
    return { pixels: grid, primaryColor, secondaryColor, bgColor };
  }, [seed]);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      className={`${className} rounded-full`}
      shapeRendering="crispEdges"
    >
      <rect width="20" height="20" fill={bgColor} />
      {pixels.map((p, i) => {
        const isEdge = (() => {
          const hasLeft = pixels.some(pp => pp.x === p.x - 1 && pp.y === p.y);
          const hasRight = pixels.some(pp => pp.x === p.x + 1 && pp.y === p.y);
          const hasUp = pixels.some(pp => pp.x === p.x && pp.y === p.y - 1);
          const hasDown = pixels.some(pp => pp.x === p.x && pp.y === p.y + 1);
          return !hasLeft || !hasRight || !hasUp || !hasDown;
        })();
        return (
          <rect
            key={i}
            x={p.x}
            y={p.y}
            width="1"
            height="1"
            fill={isEdge ? secondaryColor : primaryColor}
          />
        );
      })}
    </svg>
  );
};

export default DitheringAvatar;
