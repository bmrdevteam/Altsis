export interface CustomThemeColors {
  primaryColor: string;
  backgroundColor: string;
  componentColor: string;
  textColor: string;
  accentColor: string;
  successColor: string;
  errorColor: string;
}

// --- Color utility functions ---

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgb(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${clamp(r)}, ${clamp(g)}, ${clamp(b)})`;
}

function rgba(r: number, g: number, b: number, a: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `rgba(${clamp(r)}, ${clamp(g)}, ${clamp(b)}, ${a})`;
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function isLightColor(hex: string): boolean {
  return luminance(hex) > 0.5;
}

/** Mix two colors by ratio (0 = color1, 1 = color2) */
function mix(
  hex1: string,
  hex2: string,
  ratio: number
): [number, number, number] {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  return [
    r1 + (r2 - r1) * ratio,
    g1 + (g2 - g1) * ratio,
    b1 + (b2 - b1) * ratio,
  ];
}

/** Lighten a color by amount (0-1) */
function lighten(hex: string, amount: number): [number, number, number] {
  return mix(hex, "#ffffff", amount);
}

/** Darken a color by amount (0-1) */
function darken(hex: string, amount: number): [number, number, number] {
  return mix(hex, "#000000", amount);
}

function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generate all 7 theme colors from a single primary color.
 *
 * Color harmony strategy:
 * - Background/Component: primary hue tint (warm/cool feel)
 * - Text: near-neutral with a slight primary hue lean
 * - Accent: split-complementary (+150°) for strong yet harmonious contrast
 * - Success: standard green (hue 145) shifted 10% toward primary hue
 * - Error: standard red (hue 5) shifted 10% toward primary hue
 */
export function generateColorsFromPrimary(
  primaryHex: string
): CustomThemeColors {
  const [h, s, l] = hexToHsl(primaryHex);
  const isDark = l < 0.4;

  // Strong tint — like sepia, the primary hue should be clearly felt
  // across the entire page (backgrounds, components, even text).
  const tint = Math.min(s, 0.6);

  // Shift a target hue toward the primary for cohesion
  const toward = (target: number, ratio: number) =>
    target + ((((h - target + 540) % 360) - 180) * ratio);

  return {
    primaryColor: primaryHex,

    // Background: noticeable tint of the primary hue (sepia-like)
    backgroundColor: isDark
      ? hslToHex(h, tint * 0.5, 0.1)
      : hslToHex(h, tint * 0.55, 0.93),

    // Component: slightly stronger tint than background
    componentColor: isDark
      ? hslToHex(h, tint * 0.45, 0.15)
      : hslToHex(h, tint * 0.5, 0.89),

    // Text: tinted but still highly readable
    textColor: isDark
      ? hslToHex(h, tint * 0.15, 0.88)
      : hslToHex(h, tint * 0.2, 0.15),

    // Accent: split-complementary (+150°) – distinct but harmonious
    accentColor: hslToHex(
      (h + 150) % 360,
      Math.max(s * 0.85, 0.45),
      isDark ? 0.55 : 0.48
    ),

    // Success: green shifted slightly toward primary
    successColor: hslToHex(
      toward(145, 0.1),
      Math.max(Math.min(s, 0.65), 0.45),
      isDark ? 0.48 : 0.42
    ),

    // Error: red shifted slightly toward primary
    errorColor: hslToHex(
      toward(5, 0.1),
      Math.max(Math.min(s, 0.75), 0.55),
      isDark ? 0.52 : 0.47
    ),
  };
}

// --- Main generator ---

export function generateCSSVariables(
  colors: CustomThemeColors
): Record<string, string> {
  const bgIsLight = isLightColor(colors.backgroundColor);
  const [pr, pg, pb] = hexToRgb(colors.primaryColor);
  const [br, bg_, bb] = hexToRgb(colors.backgroundColor);
  const [cr, cg, cb] = hexToRgb(colors.componentColor);
  const [tr, tg, tb] = hexToRgb(colors.textColor);
  const [ar, ag, ab] = hexToRgb(colors.accentColor);
  const [sr, ssg, sb] = hexToRgb(colors.successColor);
  const [er, eg, eb] = hexToRgb(colors.errorColor);

  const canvasHex = bgIsLight ? "#ffffff" : "#000000";

  // Generate accent gradient (text to background, 6 steps)
  const accent1 = rgb(tr, tg, tb);
  const [a2r, a2g, a2b] = mix(colors.textColor, colors.backgroundColor, 0.2);
  const accent2 = rgb(a2r, a2g, a2b);
  const [a3r, a3g, a3b] = mix(colors.textColor, colors.backgroundColor, 0.4);
  const accent3 = rgb(a3r, a3g, a3b);
  const [a4r, a4g, a4b] = mix(colors.textColor, colors.backgroundColor, 0.6);
  const accent4 = rgb(a4r, a4g, a4b);
  const [a5r, a5g, a5b] = mix(colors.textColor, colors.backgroundColor, 0.8);
  const accent5 = rgb(a5r, a5g, a5b);
  const [a6r, a6g, a6b] = hexToRgb(canvasHex);
  const accent6 = rgb(a6r, a6g, a6b);

  // Background hover (slightly darker/lighter than background)
  const hoverDir = bgIsLight ? darken : lighten;
  const [hr, hg, hb] = hoverDir(colors.backgroundColor, 0.04);

  // Component hover
  const [chr, chg, chb] = bgIsLight
    ? darken(colors.componentColor, 0.08)
    : lighten(colors.componentColor, 0.08);

  // Border color
  const [bdr, bdg, bdb] = mix(
    colors.componentColor,
    colors.textColor,
    bgIsLight ? 0.05 : 0.1
  );

  // Primary background (lighter version of primary)
  const [pbr, pbg, pbb] = bgIsLight
    ? lighten(colors.primaryColor, 0.8)
    : darken(colors.primaryColor, 0.6);

  // Warning colors (derived from midpoint of success/error + warm shift)
  const warningColor = "#faad14";
  const [wr, wg, wb] = hexToRgb(warningColor);

  // Status bg/border (transparent overlays)
  const statusAlpha = bgIsLight ? 1 : 0.12;
  const statusBorderAlpha = bgIsLight ? 1 : 0.3;

  const vars: Record<string, string> = {
    // Primary
    "--primary-color": rgb(pr, pg, pb),
    "--primary-text-color": rgb(pr, pg, pb),
    "--primary-background-color": rgb(pbr, pbg, pbb),

    // Background
    "--background-color": rgb(br, bg_, bb),
    "--background-hover-color": rgb(hr, hg, hb),
    "--canvas-color": canvasHex,

    // Component
    "--component-color": rgb(cr, cg, cb),
    "--component-hover-color": rgb(chr, chg, chb),
    "--component-box-shadow": bgIsLight
      ? "rgba(162, 162, 162, 0.15) 0px 8px 12px"
      : "none",

    // Accent gradient
    "--accent-1": accent1,
    "--accent-2": accent2,
    "--accent-3": accent3,
    "--accent-4": accent4,
    "--accent-5": accent5,
    "--accent-6": accent6,

    // Alert
    "--alert-c1": rgb(er, eg, eb),

    // Color palettes (derived from primary/accent)
    "--color-r1": rgb(er, eg, eb),
    "--color-r2": rgb(...lighten(colors.errorColor, 0.15)),
    "--color-r3": rgb(...mix(colors.errorColor, colors.backgroundColor, 0.3)),
    "--color-r4": rgb(...mix(colors.errorColor, colors.backgroundColor, 0.5)),
    "--color-r5": rgb(...mix(colors.errorColor, colors.backgroundColor, 0.7)),
    "--color-r6": rgb(...mix(colors.errorColor, colors.backgroundColor, 0.85)),

    "--color-g1": rgb(sr, ssg, sb),
    "--color-g2": rgb(...lighten(colors.successColor, 0.15)),
    "--color-g3": rgb(
      ...mix(colors.successColor, colors.backgroundColor, 0.3)
    ),
    "--color-g4": rgb(
      ...mix(colors.successColor, colors.backgroundColor, 0.5)
    ),
    "--color-g5": rgb(
      ...mix(colors.successColor, colors.backgroundColor, 0.7)
    ),
    "--color-g6": rgb(
      ...mix(colors.successColor, colors.backgroundColor, 0.85)
    ),

    "--color-b1": rgb(ar, ag, ab),
    "--color-b2": rgb(...lighten(colors.accentColor, 0.15)),
    "--color-b3": rgb(...mix(colors.accentColor, colors.backgroundColor, 0.3)),
    "--color-b4": rgb(...mix(colors.accentColor, colors.backgroundColor, 0.5)),
    "--color-b5": rgb(...mix(colors.accentColor, colors.backgroundColor, 0.7)),
    "--color-b6": rgb(
      ...mix(colors.accentColor, colors.backgroundColor, 0.85)
    ),

    // Border
    "--border-default": `1px solid ${rgb(bdr, bdg, bdb)}`,
    "--border-default-color": rgb(bdr, bdg, bdb),

    // Button
    "--btn-color-1": rgb(tr, tg, tb),
    "--btn-text-color-1": canvasHex,

    // Status colors
    "--status-success": rgb(sr, ssg, sb),
    "--status-success-bg": bgIsLight
      ? rgb(...lighten(colors.successColor, 0.9))
      : rgba(sr, ssg, sb, statusAlpha),
    "--status-success-border": bgIsLight
      ? rgb(...lighten(colors.successColor, 0.6))
      : rgba(sr, ssg, sb, statusBorderAlpha),

    "--status-info": rgb(ar, ag, ab),
    "--status-info-bg": bgIsLight
      ? rgb(...lighten(colors.accentColor, 0.9))
      : rgba(ar, ag, ab, statusAlpha),
    "--status-info-border": bgIsLight
      ? rgb(...lighten(colors.accentColor, 0.6))
      : rgba(ar, ag, ab, statusBorderAlpha),

    "--status-warning": warningColor,
    "--status-warning-bg": bgIsLight
      ? rgb(...lighten(warningColor, 0.9))
      : rgba(wr, wg, wb, statusAlpha),
    "--status-warning-border": bgIsLight
      ? rgb(...lighten(warningColor, 0.6))
      : rgba(wr, wg, wb, statusBorderAlpha),

    "--status-error": rgb(er, eg, eb),
    "--status-error-bg": bgIsLight
      ? rgb(...lighten(colors.errorColor, 0.9))
      : rgba(er, eg, eb, statusAlpha),
    "--status-error-border": bgIsLight
      ? rgb(...lighten(colors.errorColor, 0.6))
      : rgba(er, eg, eb, statusBorderAlpha),

    // UI element colors
    "--highlight-color": rgb(ar, ag, ab),
    "--highlight-text": "#ffffff",
    "--current-time-color": rgb(er, eg, eb),
    "--current-time-hover": rgba(ar, ag, ab, bgIsLight ? 0.04 : 0.08),
    "--checkbox-checked": rgb(ar, ag, ab),
    "--schedule-indicator": rgb(ar, ag, ab),
    "--scrollbar-thumb": rgb(...mix(colors.textColor, colors.backgroundColor, 0.6)),
    "--toggle-inactive": rgb(...mix(colors.textColor, colors.backgroundColor, 0.7)),
    "--calendar-control-color": rgb(pr, pg, pb),

    // Chat
    "--chat-own-bg": bgIsLight
      ? rgba(sr, ssg, sb, 0.12)
      : rgba(sr, ssg, sb, 0.2),
    "--chat-active-bg": bgIsLight
      ? rgba(ar, ag, ab, 0.1)
      : rgba(ar, ag, ab, 0.15),
    "--chat-send-color": rgb(ar, ag, ab),

    // Progress
    "--progress-default": rgb(ar, ag, ab),
    "--progress-track": rgba(tr, tg, tb, bgIsLight ? 0.06 : 0.08),

    // Overlay
    "--overlay-bg": rgba(0, 0, 0, bgIsLight ? 0.3 : 0.5),

    // Event
    "--event-default-bg": rgb(
      ...mix(colors.accentColor, colors.backgroundColor, 0.7)
    ),

    // Placeholder
    "--placeholder-color": rgb(...mix(colors.textColor, colors.backgroundColor, 0.6)),
  };

  return vars;
}

/** Apply custom theme CSS variables to document root */
export function applyCustomTheme(colors: CustomThemeColors) {
  const vars = generateCSSVariables(colors);
  const root = document.documentElement;

  // Remove data-theme to avoid conflicts with preset themes
  delete root.dataset.theme;

  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

/** Clear custom theme CSS variables from document root */
export function clearCustomTheme() {
  const root = document.documentElement;
  // Remove all inline style properties (custom theme vars)
  root.removeAttribute("style");
}
