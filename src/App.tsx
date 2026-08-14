import { useEffect, useRef, useState } from 'react';
import { DealsPanel, StatsPanel, DetailPanel, DataSourcePanel } from './components/panels';
import { DATA_ASOF, type Deal } from './lib/universe';

export default function App() {
  const [selDeal, setSelDeal] = useState<Deal | null>(null);
  const [dealFilter, setDealFilter] = useState('全部');
  const [clock, setClock] = useState(new Date());
  // 移动端手势返回：弹窗入栈历史，滑动返回/系统返回键只关弹窗不退出站点
  const pushedRef = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const openDeal = (d: Deal) => {
    setSelDeal(d);
    if (!pushedRef.current) {
      window.history.pushState({ pmb: 'deal' }, '');
      pushedRef.current = true;
    }
  };
  const closeDeal = (viaPop = false) => {
    setSelDeal(null);
    if (pushedRef.current) {
      pushedRef.current = false;
      if (!viaPop) window.history.back();
    }
  };

  // 系统返回（含 iOS 边缘滑动手势）→ 关闭弹窗
  useEffect(() => {
    const onPop = () => {
      if (pushedRef.current) {
        pushedRef.current = false;
        setSelDeal(null);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Esc 关闭详情弹窗
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDeal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            美/中 · <span className="brand-date">更新 {DATA_ASOF}</span> · 每周六 09:00 自动更新
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
        <DealsPanel selected={selDeal?.id ?? null} filter={dealFilter} setFilter={setDealFilter} onSelect={openDeal} />
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
        <span>更新 {DATA_ASOF} · 每周全网汇总</span>
        <span className="status-right">
          {clock.toLocaleTimeString('zh-CN', { hour12: false })} · 非投资建议
        </span>
      </footer>

      {/* ── 交易详情弹窗 ── */}
      {selDeal && (
        <div className="modal-mask" onClick={() => closeDeal()}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title">交易详情</span>
              <button className="modal-close" onClick={() => closeDeal()}>✕</button>
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
