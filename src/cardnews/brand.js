// Brand tokens for InstaCardNews (모두급식). Derives the full color system from
// a single primary color, per the standard 6-token palette approach:
// PRIMARY / LIGHT / DARK accents, plus LIGHT_BG / LIGHT_BORDER / DARK_BG surfaces.

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex({ r, g, b }) {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'))
      .join('')
  );
}

function rgbToHsl({ r, g, b }) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb({ h, s, l }) {
  h /= 360;
  s /= 100;
  l /= 100;
  if (s === 0) {
    const v = l * 255;
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hue2rgb(p, q, h + 1 / 3) * 255,
    g: hue2rgb(p, q, h) * 255,
    b: hue2rgb(p, q, h - 1 / 3) * 255,
  };
}

function hsl(hex) {
  return rgbToHsl(hexToRgb(hex));
}

function toHex(hslColor) {
  return rgbToHex(hslToRgb(hslColor));
}

function lighten(hexColor, amount) {
  const c = hsl(hexColor);
  return toHex({ ...c, l: Math.min(100, c.l + amount) });
}

function darken(hexColor, amount) {
  const c = hsl(hexColor);
  return toHex({ ...c, l: Math.max(0, c.l - amount) });
}

const PRIMARY = '#448AFF';
const primaryHsl = hsl(PRIMARY);

export const BRAND = {
  // NOTE: placeholder — swap in the account's real handle.
  name: '모두급식',
  handle: '@modugeupsik',

  primary: PRIMARY,
  light: lighten(PRIMARY, 18),
  dark: darken(PRIMARY, 28),

  // Cool off-white (primary is a cool blue) — never pure #fff.
  lightBg: toHex({ h: primaryHsl.h, s: 45, l: 97.5 }),
  lightBorder: toHex({ h: primaryHsl.h, s: 30, l: 91 }),
  // Near-black with a matching cool tint.
  darkBg: toHex({ h: primaryHsl.h, s: 38, l: 9 }),
};

BRAND.gradient = `linear-gradient(165deg, ${BRAND.dark} 0%, ${BRAND.primary} 50%, ${BRAND.light} 100%)`;
