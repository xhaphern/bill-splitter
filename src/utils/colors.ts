export interface ColorTokens {
  dot: string;
  text: string;
  bg: string;
  border: string;
}

export function colorFromName(name = ""): ColorTokens {
  const norm = String(name).trim().toLowerCase();
  // FNV-1a 32-bit hash
  let hash = 0x811c9dc5;
  for (let i = 0; i < norm.length; i++) {
    hash ^= norm.charCodeAt(i);
    hash = Math.imul(hash >>> 0, 0x01000193);
  }
  hash >>>= 0;
  const hue = hash % 360; // 0..359 unique hue per name (very low collision)
  const sat = 65 + ((hash >>> 8) % 20); // 65..84
  const dotSat = 90;
  const textLight = 80; // readable on dark bg
  const bgLight = 16; // dark chip background
  const borderLight = 45;

  return {
    dot: `hsl(${hue}, ${dotSat}%, 55%)`,
    text: `hsl(${hue}, ${sat}%, ${textLight}%)`,
    bg: `hsla(${hue}, ${sat}%, ${bgLight}%, 1)`,
    border: `hsla(${hue}, ${sat}%, ${borderLight}%, 0.4)`,
  };
}

export function hueFromName(name = ""): number {
  const norm = String(name).trim().toLowerCase();
  let hash = 0x811c9dc5;
  for (let i = 0; i < norm.length; i++) {
    hash ^= norm.charCodeAt(i);
    hash = Math.imul(hash >>> 0, 0x01000193);
  }
  return (hash >>> 0) % 360;
}

export function colorFromHue(hue: number, sat = 72): ColorTokens {
  const dotSat = 90;
  const textLight = 80;
  const bgLight = 16;
  const borderLight = 45;
  return {
    dot: `hsl(${hue}, ${dotSat}%, 55%)`,
    text: `hsl(${hue}, ${sat}%, ${textLight}%)`,
    bg: `hsla(${hue}, ${sat}%, ${bgLight}%, 1)`,
    border: `hsla(${hue}, ${sat}%, ${borderLight}%, 0.4)`,
  };
}

// Fixed emerald neon for the current user
export const meColor: ColorTokens = {
  dot: "hsl(160, 90%, 55%)",
  text: "hsl(160, 70%, 80%)",
  bg: "hsla(160, 70%, 16%, 1)",
  border: "hsla(160, 70%, 45%, 0.4)",
};
