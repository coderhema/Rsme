
import React, { useMemo } from 'react';

interface DitheringAvatarProps {
  seed: string;
  size?: number;
  className?: string;
}

const DitheringAvatar: React.FC<DitheringAvatarProps> = ({ seed, size = 40, className = "" }) => {
  const pixels = useMemo(() => {
    // Deterministic random based on seed
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }

    const pseudoRandom = () => {
      hash = (hash * 16807) % 2147483647;
      return (hash - 1) / 2147483646;
    };

    const resolution = 8;
    const grid = [];
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        // Higher probability of center pixels being filled
        const distFromCenter = Math.sqrt(Math.pow(x - (resolution-1)/2, 2) + Math.pow(y - (resolution-1)/2, 2));
        const threshold = 0.3 + (distFromCenter / resolution) * 0.7;
        if (pseudoRandom() > threshold) {
          grid.push({ x, y });
        }
      }
    }
    return grid;
  }, [seed]);

  const color = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 60%)`;
  }, [seed]);

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 8 8" 
      className={`${className} rounded-lg overflow-hidden`}
      shapeRendering="crispEdges"
    >
      <rect width="8" height="8" fill="#111" />
      {pixels.map((p, i) => (
        <rect 
          key={i} 
          x={p.x} 
          y={p.y} 
          width="1" 
          height="1" 
          fill={color} 
          fillOpacity={0.9}
        />
      ))}
      {/* Subtle dithering pattern overlay */}
      <pattern id="dither" width="2" height="2" patternUnits="userSpaceOnUse">
        <rect width="1" height="1" fill="white" fillOpacity="0.05" />
        <rect x="1" y="1" width="1" height="1" fill="white" fillOpacity="0.05" />
      </pattern>
      <rect width="8" height="8" fill="url(#dither)" />
    </svg>
  );
};

export default DitheringAvatar;
