// ── 面板组件：四维统计 / 一级市场交易 / 详情 / 数据源 ───────────────────────
import { useMemo, useState } from 'react';
import { DEALS, DATA_ASOF, dealValuation, type Deal, type Theme } from '../lib/universe';
import { quarterly, byTheme, topInvestors, totalUSDm, roundThemeMix } from '../lib/stats';
import { QuarterlyChart, HBars, RoundStackedBars, ThemeDonut, ChartCard, GOLD, IVORY, GRAY, DONUT_COLORS } from './charts';

// ═══ 四维统计 ═══════════════════════════════════════════════════════════════
export function StatsPanel() {
  const q = useMemo(quarterly, []);
  const themes = useMemo(byTheme, []);
  const themeOrder = useMemo(() => themes.map((t) => t.key), [themes]);
  const colorOf = useMemo(() => {
    return (t: string) => DONUT_COLORS[Math.max(0, themeOrder.indexOf(t)) % DONUT_COLORS.length];
  }, [themeOrder]);
  const roundMix = useMemo(() => roundThemeMix(themeOrder), [themeOrder]);
  const [invAll, setInvAll] = useState(false);
  const investors = useMemo(() => topInvestors(invAll ? 200 : 10), [invAll]);
  const total = totalUSDm();
  return (
    <div className="stats-grid">
      <ChartCard no="01" title="季度交易节奏" sub="笔数（柱）× 披露金额（线）">
        <QuarterlyChart data={q} />
        <div className="chart-foot">
          样本 {DEALS.length} 笔 · 披露金额合计 ≈ ${(total / 1000).toFixed(1)}B · 未披露按样本估计
        </div>
      </ChartCard>
      <ChartCard no="02" title="轮次分布" sub="分段配色 = 该轮次的题材构成">
        <RoundStackedBars data={roundMix} colorOf={colorOf} />
      </ChartCard>
      <ChartCard no="03" title="题材分布" sub="悬停放大 · 与图例联动">
        <ThemeDonut data={themes} colorOf={colorOf} />
      </ChartCard>
      <ChartCard no="04" title="活跃投资机构" sub={`按参与样本交易笔数排名${invAll ? '（全部）' : ' TOP10'} · 点击进官网`}>
        <HBars data={investors} labelW={150} />
        <div className="chart-foot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>仅统计已披露机构 · 同一机构跨多笔重复计数</span>
          <button className="more-btn" onClick={() => setInvAll(!invAll)}>
            {invAll ? '缩小 −' : '更多 +'}
          </button>
        </div>
      </ChartCard>
    </div>
  );
}

// ═══ 一级市场交易 ════════════════════════════════════════════════════════════
const THEMES: Array<Theme | '全部'> = ['全部', 'AI4S', 'AI4AI', 'AI制药', '生物科技', '大健康', '脑机接口'];

export function DealsPanel({ onSelect, selected, filter, setFilter }: {
  onSelect: (d: Deal) => void; selected: number | null;
  filter: string; setFilter: (f: string) => void;
}) {
  const [mkt, setMkt] = useState<'全部' | 'CN' | 'US'>('全部');
  const [showAll, setShowAll] = useState(false);
  // 默认只显示近一年（按当前日期滚动）
  const cutoff = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
  }, []);
  const rows = useMemo(() => {
    let r = [...DEALS].sort((a, b) => b.date.localeCompare(a.date));
    if (filter !== '全部') r = r.filter((d) => d.theme === filter);
    if (mkt !== '全部') r = r.filter((d) => d.mkt === mkt || d.mkt.includes(mkt));
    if (!showAll) r = r.filter((d) => d.date >= cutoff);
    return r;
  }, [filter, mkt, showAll, cutoff]);
  const hiddenCount = useMemo(() => DEALS.filter((d) => d.date < cutoff).length, [cutoff]);
  const totalUSDmRows = rows.reduce((s, d) => s + d.amtUSDm, 0);
  return (
    <div className="panel">
      <div className="tabs" style={{ flexWrap: 'wrap' }}>
        {THEMES.map((t) => (
          <button key={t} className={`tab ${filter === t ? 'tab-on' : ''}`} onClick={() => setFilter(t)}>{t}</button>
        ))}
      </div>
      <div className="tabs">
        {(['全部', 'CN', 'US'] as const).map((t) => (
          <button key={t} className={`tab ${mkt === t ? 'tab-on' : ''}`} onClick={() => setMkt(t)}>{t}</button>
        ))}
        <span className="tabs-note">{rows.length} 笔 · 合计 ≈ ${(totalUSDmRows / 1000).toFixed(1)}B</span>
      </div>
      <div className="thead">
        <span className="c-date">日期</span><span className="c-co">公司</span>
        <span className="c-mkt hide-sm">市场</span><span className="c-round">轮次</span>
        <span className="c-theme hide-sm">方向</span><span className="c-amt">金额</span>
        <span className="c-val hide-sm">本轮估值</span>
      </div>
      <div className="tbody">
        {rows.map((d) => {
          const v = dealValuation(d);
          return (
            <div key={d.id} className={`trow ${selected === d.id ? 'trow-on' : ''}`} onClick={() => onSelect(d)}>
              <span className="c-date d-full" style={{ color: GRAY }}>{d.date}</span>
              <span className="c-date d-ym" style={{ color: GRAY }}>{d.date.slice(0, 7)}</span>
              <span className="c-co ellipsis" style={{ color: IVORY }}>{d.co}</span>
              <span className="c-mkt hide-sm" style={{ color: GRAY }}>{d.mkt}</span>
              <span className="c-round ellipsis" style={{ color: GOLD }}>{d.round}</span>
              <span className="c-theme hide-sm ellipsis">{d.theme}</span>
              <span className="c-amt num" style={{ color: IVORY }}>{d.amt}</span>
              <span className="c-val hide-sm num ellipsis" style={{ color: v.estimated ? GRAY : GOLD }}>
                {v.short}{v.estimated ? '*' : ''}
              </span>
            </div>
          );
        })}
      </div>
      <div className="panel-foot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>* 估值为推算值（融资额÷10%股比稀释）· 点击查看机构 / 进展 / 来源链接</span>
        {hiddenCount > 0 && (
          <button className="more-btn" onClick={() => setShowAll(!showAll)}>
            {showAll ? '缩小 −' : `更多（含 ${hiddenCount} 笔一年前）+`}
          </button>
        )}
      </div>
    </div>
  );
}

// ═══ 交易详情 ═══════════════════════════════════════════════════════════════
export function DetailPanel({ deal }: { deal: Deal | null }) {
  if (!deal) {
    return (
      <div className="panel detail">
        <div className="dsec-label">交易详情</div>
        <div style={{ color: GRAY, marginTop: 10 }}>点击「一级市场交易」中任意一笔查看详情</div>
      </div>
    );
  }
  const v = dealValuation(deal);
  return (
    <div className="panel detail">
      <div className="detail-co">{deal.co}</div>
      <div className="detail-meta">
        <span>{deal.mkt}</span><i>·</i><span>{deal.theme}</span><i>·</i><span>{deal.date}</span><i>·</i><span>{deal.round}</span>
      </div>
      <div className="detail-figures">
        <div className="dfig">
          <div className="dfig-label">披露金额</div>
          <div className="dfig-val">{deal.amt}</div>
          <div className="dfig-sub">≈${deal.amtUSDm}M</div>
        </div>
        <div className="dfig">
          <div className="dfig-label">本轮估值</div>
          <div className="dfig-val" style={{ color: v.estimated ? GRAY : GOLD }}>{v.short}</div>
          <div className="dfig-sub">{v.estimated ? '推算 · 融资额÷10%股比' : '公开披露口径'}</div>
        </div>
      </div>
      <div className="dsec">
        <div className="dsec-label">本轮参与机构</div>
        <div className="dsec-body">{deal.investors}</div>
      </div>
      <div className="dsec">
        <div className="dsec-label">项目方发展情况</div>
        <div className="dsec-body">{deal.progress}</div>
        {deal.site && (
          <div className="dsec-body" style={{ marginTop: 6 }}>
            <span style={{ color: GOLD }}>▸ </span>
            <a href={deal.site} target="_blank" rel="noreferrer" className="newslink">公司官网 ↗</a>
          </div>
        )}
      </div>
      <div className="dsec">
        <div className="dsec-label">数据来源链接</div>
        {deal.links.length === 0 && <div className="dsec-body" style={{ color: GRAY }}>暂无公开链接（统计口径样本）</div>}
        {deal.links.map((l) => (
          <div key={l.url} className="dsec-body">
            <span style={{ color: GOLD }}>▸ </span>
            <a href={l.url} target="_blank" rel="noreferrer" className="newslink">{l.label}</a>
          </div>
        ))}
      </div>
      <div className="panel-foot">公开披露整理 · 数据截止 {DATA_ASOF} · 非投资建议</div>
    </div>
  );
}

// ═══ 数据源说明 ══════════════════════════════════════════════════════════════
export function DataSourcePanel() {
  const themes = new Set(DEALS.map((d) => d.theme)).size;
  return (
    <div className="panel detail">
      <div className="dsec">
        <div className="dsec-label">数据集</div>
        <div className="dsec-body">
          样本 <b style={{ color: GOLD }}>{DEALS.length}</b> 笔 · 覆盖 美国 / 中国 · {themes} 类题材
        </div>
      </div>
      <div className="dsec">
        <div className="dsec-label">更新机制</div>
        <div className="dsec-body">
          数据截止 <b style={{ color: GOLD }}>{DATA_ASOF}</b> · 每周六 09:00 全网检索汇总刷新：捕捉新披露融资交易并复核既有样本进展，仅收录有可验证公开报道链接的交易。
        </div>
      </div>
      <div className="dsec">
        <div className="dsec-label">来源口径</div>
        <div className="dsec-body">
          公开融资披露、公司及投资方公告、公开媒体报道与微信公众号融资新闻（经搜狗微信检索）；每笔交易详情附具体报道/公告链接。估值缺失时按融资额÷10%股比稀释推算投后，仅供量级参考。
        </div>
      </div>
      <div className="dsec">
        <div className="dsec-label">微信公众号信息源</div>
        <div className="dsec-body">
          <span style={{ color: GOLD }}>▸ </span>elsewhere别处发生<br />
          <span style={{ color: GOLD }}>▸ </span>DeepTech深科技<br />
          <span style={{ color: GOLD }}>▸ </span>BioTender 观测日志<br />
          <span style={{ color: GOLD }}>▸ </span>36氪 / 投中 / 动脉网 / 医药魔方 等
        </div>
      </div>
      <div className="dsec">
        <div className="dsec-label">网页信息源</div>
        <div className="dsec-body">
          <span style={{ color: GOLD }}>▸ </span>Y Combinator（ycombinator.com · 各批次生物/医疗/AI4S项目）<br />
          <span style={{ color: GOLD }}>▸ </span>YZi Labs（yzilabs.com · AI/生物科技早期投资）<br />
          <span style={{ color: GOLD }}>▸ </span>Fierce Biotech / BioBucks 融资追踪 / PR Newswire / Business Wire<br />
          <span style={{ color: GOLD }}>▸ </span>36氪 / 亿欧 / 新浪财经 / 新华报业 等
        </div>
      </div>
    </div>
  );
}
