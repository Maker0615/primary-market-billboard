// ── 黑白金 SVG 图表库：季度双轴图 / 横向条形 / 环形图 ───────────────────────
import { useMemo, useState } from 'react';
import type { Bucket, QuarterPoint } from '../lib/stats';

export const GOLD = '#C9A86A';
export const GOLD_DIM = 'rgba(201,168,106,0.45)';
export const IVORY = '#EFEBE0';
export const GRAY = '#7A7568';
export const HAIRLINE = 'rgba(201,168,106,0.22)';

// 题材配色：同一题材在环形图与轮次堆叠条中同色
export const DONUT_COLORS = ['#C9A86A', '#F4F0E6', '#8A8272', '#E4D5B7', '#6B6353', '#A68B5B', '#3E392F'];

function fmtUSDm(usdM: number): string {
  return usdM >= 1000 ? `$${(usdM / 1000).toFixed(1)}B` : `$${Math.round(usdM)}M`;
}

// ═══ ① 季度：柱（笔数）× 线（金额）双轴 ═══════════════════════════════════
export function QuarterlyChart({ data }: { data: QuarterPoint[] }) {
  const W = 560, H = 240, PL = 34, PR = 46, PT = 18, PB = 30;
  const iw = W - PL - PR, ih = H - PT - PB;
  const maxC = Math.max(1, ...data.map((d) => d.count));
  const maxA = Math.max(1, ...data.map((d) => d.usdM));
  const bw = Math.min(34, (iw / data.length) * 0.55);
  const x = (i: number) => PL + (iw / data.length) * (i + 0.5);
  const yC = (c: number) => PT + ih - (c / maxC) * ih;
  const yA = (a: number) => PT + ih - (a / maxA) * ih;
  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${yA(d.usdM)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart">
      {/* 网格 */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={PL} x2={W - PR} y1={PT + ih * (1 - f)} y2={PT + ih * (1 - f)} stroke={HAIRLINE} strokeWidth="0.6" />
      ))}
      {data.map((d, i) => {
        const bh = PT + ih - yC(d.count);
        return (
          <g key={d.q}>
            <rect x={x(i) - bw / 2} y={yC(d.count)} width={bw} height={bh}
              fill={d.count ? GOLD : 'transparent'} opacity={0.9} />
            {d.count > 0 && bh > 20 && (
              <text x={x(i)} y={yC(d.count) + bh / 2 + 4} textAnchor="middle" fontSize="12" fontWeight="300" fill="#FFFFFF">{d.count}</text>
            )}
            {d.count > 0 && bh <= 20 && (
              <text x={x(i)} y={yC(d.count) - 5} textAnchor="middle" fontSize="10" fill={IVORY}>{d.count}</text>
            )}
            <text x={x(i)} y={H - 10} textAnchor="middle" fontSize="9.5" fill={GRAY}>{d.q}</text>
          </g>
        );
      })}
      <path d={line} fill="none" stroke={IVORY} strokeWidth="1.4" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={yA(d.usdM)} r={2.6} fill="#0B0B09" stroke={IVORY} strokeWidth="1.2" />
          {d.usdM > 0 && <text x={x(i)} y={yA(d.usdM) - 7} textAnchor="middle" fontSize="9.5" fill={GOLD}>{fmtUSDm(d.usdM)}</text>}
        </g>
      ))}
      {/* 轴注 */}
      <text x={PL} y={12} fontSize="9" fill={GRAY}>笔</text>
      <text x={W - PR + 6} y={12} fontSize="9" fill={GRAY}>金额</text>
    </svg>
  );
}

// ═══ 横向条形（机构，官网可点击） ═══════════════════════════════════════════
export function HBars({ data, labelW = 132, showUSD = true }: { data: Array<Bucket & { url?: string }>; labelW?: number; showUSD?: boolean }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="hbars">
      {data.map((d) => (
        <div key={d.key} className="hbar-row">
          {d.url ? (
            <a className="hbar-label hbar-link" style={{ width: labelW }} href={d.url} target="_blank" rel="noreferrer">
              {d.key}<span className="hbar-ext">↗</span>
            </a>
          ) : (
            <span className="hbar-label" style={{ width: labelW }}>{d.key}</span>
          )}
          <span className="hbar-track">
            <span className="hbar-fill" style={{ width: `${(d.count / max) * 100}%` }} />
          </span>
          <span className="hbar-val">{d.count} 笔</span>
          {showUSD && <span className="hbar-usd">{fmtUSDm(d.usdM)}</span>}
        </div>
      ))}
    </div>
  );
}

// ═══ 轮次 × 题材 堆叠条形（分段宽度=题材占比，配色与环形图一致） ═══════════
export function RoundStackedBars({ data, colorOf, labelW = 132 }: {
  data: Array<Bucket & { segs: Array<{ theme: string; count: number }> }>;
  colorOf: (theme: string) => string;
  labelW?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="hbars">
      {data.map((d) => (
        <div key={d.key} className="hbar-row">
          <span className="hbar-label" style={{ width: labelW }}>{d.key}</span>
          <span className="hbar-track hbar-track-stack">
            {d.segs.map((s) => (
              <span
                key={s.theme}
                className="hbar-seg"
                title={`${s.theme} ${s.count}笔`}
                style={{ width: `${(s.count / max) * 100}%`, background: colorOf(s.theme) }}
              />
            ))}
          </span>
          <span className="hbar-val">{d.count} 笔</span>
          <span className="hbar-usd">{fmtUSDm(d.usdM)}</span>
        </div>
      ))}
    </div>
  );
}

// ═══ ③ 题材环形图（悬停放大 + 图例同步联动） ════════════════════════════════
export function ThemeDonut({ data, colorOf }: { data: Bucket[]; colorOf: (theme: string) => string }) {
  const [active, setActive] = useState<number | null>(null);
  const R = 62, CX = 86, CY = 86, TH = 20;
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  const segs = useMemo(() => {
    let a0 = -Math.PI / 2;
    return data.map((d) => {
      const a1 = a0 + (d.count / total) * Math.PI * 2;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const p = (a: number, r: number) => `${CX + r * Math.cos(a)},${CY + r * Math.sin(a)}`;
      const path = `M${p(a0, R)} A${R},${R} 0 ${large} 1 ${p(a1, R)} L${p(a1, R - TH)} A${R - TH},${R - TH} 0 ${large} 0 ${p(a0, R - TH)} Z`;
      const mid = (a0 + a1) / 2;
      const s = { path, mid, d };
      a0 = a1;
      return s;
    });
  }, [data, total]);
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 172 172" className="donut">
        {segs.map((s, i) => {
          const on = active === i;
          const dx = on ? Math.cos(s.mid) * 7 : 0;
          const dy = on ? Math.sin(s.mid) * 7 : 0;
          return (
            <path
              key={i}
              d={s.path}
              fill={colorOf(s.d.key)}
              opacity={active === null || on ? 0.95 : 0.35}
              transform={`translate(${dx},${dy})${on ? ` scale(1.04)` : ''}`}
              style={{ transformOrigin: '86px 86px', transition: 'transform 0.18s, opacity 0.18s', cursor: 'pointer' }}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            />
          );
        })}
        <text x={CX} y={CY - 6} textAnchor="middle" fontSize="24" fill={IVORY} className="donut-num">
          {active === null ? total : segs[active].d.count}
        </text>
        <text x={CX} y={CY + 14} textAnchor="middle" fontSize="9" fill={GRAY} letterSpacing="2">
          {active === null ? '笔交易' : segs[active].d.key}
        </text>
      </svg>
      <div className="donut-legend">
        {segs.map((s, i) => (
          <div
            key={i}
            className={`donut-li ${active === i ? 'donut-li-on' : ''}`}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            <span className="donut-dot" style={{ background: colorOf(s.d.key) }} />
            <span className="donut-key">{s.d.key}</span>
            <span className="donut-val">{s.d.count} 笔</span>
            <span className="donut-usd">{fmtUSDm(s.d.usdM)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══ 图表卡片容器 ════════════════════════════════════════════════════════════
export function ChartCard({ no, title, sub, children }: { no: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="chart-card">
      <header className="chart-head">
        <span className="chart-no">{no}</span>
        <span className="chart-title">{title}</span>
        {sub ? <span className="chart-sub">{sub}</span> : null}
      </header>
      {children}
    </section>
  );
}
