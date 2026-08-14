// ── ASCII 绘图与格式化工具 ──────────────────────────────────────────────────
export const SPARK = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

export function sparkline(data: number[], width = 14): string {
  if (!data.length) return ''.padEnd(width, '·');
  const slice = data.slice(-width);
  const min = Math.min(...slice), max = Math.max(...slice);
  const span = max - min || 1;
  const s = slice.map((v) => SPARK[Math.min(7, Math.floor(((v - min) / span) * 7.999))]).join('');
  return s.padStart(width, ' ');
}

export function hbar(value: number, max: number, width = 26): string {
  const n = Math.round((value / (max || 1)) * width);
  return '█'.repeat(Math.max(1, n)).padEnd(width, '░');
}

export function fmt(n: number, d = 2): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function fmtPrice(n: number): string {
  if (n >= 10000) return fmt(n, 0);
  if (n >= 1000) return fmt(n, 1);
  if (n >= 100) return fmt(n, 2);
  if (n >= 10) return fmt(n, 2);
  return fmt(n, 3);
}

export function fmtPct(p: number): string {
  return (p >= 0 ? '+' : '') + p.toFixed(2) + '%';
}

export function fmtSign(n: number, d = 2): string {
  return (n >= 0 ? '+' : '') + n.toFixed(d);
}

export function pad(s: string, n: number, right = false): string {
  const w = displayWidth(s);
  const padLen = Math.max(0, n - w);
  return right ? s + ' '.repeat(padLen) : ' '.repeat(padLen) + s;
}

// 中文按 2 宽度计算
export function displayWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += ch.charCodeAt(0) > 0xff ? 2 : 1;
  return w;
}

export function trendArrow(pct: number): string {
  if (pct > 0.05) return '▲';
  if (pct < -0.05) return '▼';
  return '─';
}
