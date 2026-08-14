// ── 一级市场交易四维统计聚合 ────────────────────────────────────────────────
import { DEALS, type Deal } from './universe';

export interface Bucket { key: string; count: number; usdM: number }
export interface QuarterPoint { q: string; count: number; usdM: number }

function quarterOf(date: string): string {
  const [y, m] = date.split('-').map(Number);
  return `${y}Q${Math.ceil(m / 3)}`;
}

// ① 季度交易事件数量 + 融资金额（$M）
export function quarterly(): QuarterPoint[] {
  const map = new Map<string, QuarterPoint>();
  for (const d of DEALS) {
    const q = quarterOf(d.date);
    const p = map.get(q) ?? { q, count: 0, usdM: 0 };
    p.count++; p.usdM += d.amtUSDm; map.set(q, p);
  }
  const keys = [...map.keys()].sort();
  if (!keys.length) return [];
  // 补齐断档季度，保证时间轴连续
  const out: QuarterPoint[] = [];
  let [y, q] = [Number(keys[0].slice(0, 4)), Number(keys[0].slice(-1))];
  const [ey, eq] = [Number(keys[keys.length - 1].slice(0, 4)), Number(keys[keys.length - 1].slice(-1))];
  while (y < ey || (y === ey && q <= eq)) {
    const k = `${y}Q${q}`;
    out.push(map.get(k) ?? { q: k, count: 0, usdM: 0 });
    q++; if (q > 4) { q = 1; y++; }
  }
  return out;
}

// 轮次归一化：种子·天使 / A / B / C / D+ / 成长·战略 / IPO·Pre-IPO
const ROUND_ORDER = ['种子/天使轮', 'A轮', 'B轮', 'C轮', 'D轮及以后', '成长/战略轮', 'IPO·Pre-IPO'];
const ROUND_OVERRIDE: Record<number, string> = { 21: '成长/战略轮', 32: '种子/天使轮', 46: '成长/战略轮' };

export function roundBucket(d: Deal): string {
  if (ROUND_OVERRIDE[d.id]) return ROUND_OVERRIDE[d.id];
  const r = d.round;
  if (r.includes('IPO')) return 'IPO·Pre-IPO';
  if (r.includes('成长') || r.includes('战略')) return '成长/战略轮';
  if (/^[DEF]/.test(r)) return 'D轮及以后';
  if (r.startsWith('C')) return 'C轮';
  if (r.startsWith('B')) return 'B轮';
  if (r.includes('种子') || r.includes('天使')) return '种子/天使轮';
  return 'A轮';
}

// ② 轮次数量统计
export function byRound(): Bucket[] {
  const m = new Map<string, Bucket>();
  for (const d of DEALS) {
    const k = roundBucket(d);
    const b = m.get(k) ?? { key: k, count: 0, usdM: 0 };
    b.count++; b.usdM += d.amtUSDm; m.set(k, b);
  }
  // 保留全部档位（含 0 笔），让早期轮次结构可见
  return ROUND_ORDER.map((k) => m.get(k) ?? { key: k, count: 0, usdM: 0 });
}

// ③ 题材数量统计
export function byTheme(): Bucket[] {
  const m = new Map<string, Bucket>();
  for (const d of DEALS) {
    const b = m.get(d.theme) ?? { key: d.theme, count: 0, usdM: 0 };
    b.count++; b.usdM += d.amtUSDm; m.set(d.theme, b);
  }
  return [...m.values()].sort((a, b) => b.count - a.count || b.usdM - a.usdM);
}

// ④ 活跃投资机构（按参与交易笔数）
export function topInvestors(n = 10): Bucket[] {
  const m = new Map<string, Bucket>();
  for (const d of DEALS) {
    for (const name of d.inv) {
      const b = m.get(name) ?? { key: name, count: 0, usdM: 0 };
      b.count++; b.usdM += d.amtUSDm; m.set(name, b);
    }
  }
  return [...m.values()].sort((a, b) => b.count - a.count || b.usdM - a.usdM).slice(0, n);
}

export function totalUSDm(): number {
  return DEALS.reduce((s, d) => s + d.amtUSDm, 0);
}
