import { useEffect, useState } from 'react';
import { DealsPanel, StatsPanel, DetailPanel, DataSourcePanel } from './components/panels';
import { DEALS, DATA_ASOF, type Deal } from './lib/universe';

export default function App() {
  const [selDeal, setSelDeal] = useState<Deal | null>(null);
  const [dealFilter, setDealFilter] = useState('全部');
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Esc 关闭详情弹窗
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelDeal(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 弹窗打开时锁定背景滚动
  useEffect(() => {
    document.body.style.overflow = selDeal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selDeal]);

  return (
    <div className="term">
      {/* ── 品牌栏 ── */}
      <header className="brandbar">
        <div className="brand-text">
          <div className="brand-title">Primary Market Billboard</div>
          <div className="brand-sub">
            美/中 · <span className="brand-date">更新 {DATA_ASOF}</span> · 每日 10:00 自动更新
          </div>
        </div>
        <nav className="fnkeys">
          <a href="#stats" className="fnkey">01 统计</a>
          <a href="#deals" className="fnkey">02 交易</a>
          <a href="#source" className="fnkey">03 数据源</a>
        </nav>
      </header>

      {/* ── 01 交易统计 ── */}
      <section className="section" id="stats">
        <header className="section-head">
          <span className="section-title">ANALYTICS · 交易统计</span>
        </header>
        <StatsPanel />
      </section>

      {/* ── 02 一级市场交易 ── */}
      <section className="section" id="deals">
        <header className="section-head">
          <span className="section-title">DEAL FLOW · 一级市场交易</span>
          <span className="section-sub">{dealFilter}</span>
        </header>
        <DealsPanel selected={selDeal?.id ?? null} filter={dealFilter} setFilter={setDealFilter} onSelect={setSelDeal} />
      </section>

      {/* ── 03 数据源 ── */}
      <section className="section" id="source">
        <header className="section-head">
          <span className="section-title">DATA SOURCE · 数据源</span>
        </header>
        <DataSourcePanel />
      </section>

      {/* ── 状态栏 ── */}
      <footer className="statusbar">
        <span className="status-dot">●</span>
        <span>样本 {DEALS.length} 笔</span>
        <span>更新 {DATA_ASOF} · 每日全网汇总</span>
        <span className="status-right">
          {clock.toLocaleTimeString('zh-CN', { hour12: false })} · 非投资建议
        </span>
      </footer>

      {/* ── 交易详情弹窗 ── */}
      {selDeal && (
        <div className="modal-mask" onClick={() => setSelDeal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title">交易详情</span>
              <button className="modal-close" onClick={() => setSelDeal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <DetailPanel deal={selDeal} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
