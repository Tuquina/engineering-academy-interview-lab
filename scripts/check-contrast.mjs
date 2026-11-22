// Verifica que los tokens de color de `src/app/globals.css` cumplan WCAG AA (≥ 4.5:1 para texto normal) en los
// modos claro y oscuro. Uso: `node scripts/check-contrast.mjs` (sale con código 1 si algún par no cumple).
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

/** Extrae las variables `--nombre: #hex` del primer bloque que empieza con `selector`. */
function readTokens(selector) {
  const start = css.indexOf(selector);
  const block = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
}

const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const luminance = (rgb) =>
  rgb
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
/** Color resultante de pintar `top` con opacidad `alpha` sobre `base` (fondos tintados como `bg-area/10`). */
const blend = (top, base, alpha) => top.map((c, i) => c * alpha + base[i] * (1 - alpha));

const TEXT = ["foreground", "muted", "accent", "violet", "success", "warning", "danger", "info"];
const AREAS = ["area-1", "area-2", "area-3", "area-4", "area-5", "area-6", "area-7"];
const SURFACES = ["background", "surface", "surface-2"];

let failures = 0;
for (const [mode, selector] of [
  ["claro", '[data-theme="light"] {'],
  ["oscuro", '[data-theme="dark"] {'],
]) {
  const t = readTokens(selector);
  const rows = [];
  const check = (label, fg, bg, min = 4.5) => {
    const value = ratio(fg, bg);
    if (value < min) failures++;
    rows.push(`${value < min ? "✗" : "✓"} ${label.padEnd(44)} ${value.toFixed(2)}`);
  };
  for (const name of [...TEXT, ...AREAS]) {
    for (const surface of SURFACES) check(`${name} / ${surface}`, toRgb(t[name]), toRgb(t[surface]));
    // Texto de color sobre su propio fondo tintado al 12 % (badges, callouts, tarjetas de área).
    const tinted = blend(toRgb(t[name]), toRgb(t.surface), 0.12);
    check(`${name} / ${name} 12% sobre surface`, toRgb(t[name]), tinted);
    if (name !== "foreground" && name !== "muted") {
      check(`foreground / ${name} 12% sobre surface`, toRgb(t.foreground), tinted);
    }
  }
  check("accent-foreground / accent", toRgb(t["accent-foreground"]), toRgb(t.accent));
  // Bordes y controles: 3:1 contra el fondo (WCAG 1.4.11) sólo para el anillo de foco.
  check("ring / background (no texto, 3:1)", toRgb(t.ring), toRgb(t.background), 3);
  console.log(`\nModo ${mode}\n${rows.join("\n")}`);
}

console.log(failures === 0 ? "\nTodos los pares cumplen WCAG AA." : `\n${failures} pares no cumplen.`);
process.exit(failures === 0 ? 0 : 1);
