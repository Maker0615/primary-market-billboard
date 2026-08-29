import { useEffect, useRef, useState } from 'react';
import { DealsPanel, StatsPanel, DetailPanel, DataSourcePanel } from './components/panels';
import { DATA_ASOF, type Deal } from './lib/universe';

export default function App() {
  const [selDeal, setSelDeal] = useState<Deal | null>(null);
  const [dealFilter, setDealFilter] = useState('全部');
  const [dealList, setDealList] = useState<Deal[]>([]);
  const [clock, setClock] = useState(new Date());
  // 移动端手势返回：弹窗入栈历史，滑动返回/系统返回键只关弹窗不退出站点
  const pushedRef = useRef(false);
  const touchX = useRef<number | null>(null);

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
  // 详情弹窗内左右切换（按当前列表顺序循环）
  const navDeal = (dir: 1 | -1) => {
    setSelDeal((cur) => {
      if (!cur || dealList.length < 2) return cur;
      const i = dealList.findIndex((d) => d.id === cur.id);
      if (i < 0) return cur;
      return dealList[(i + dir + dealList.length) % dealList.length];
    });
  };
  const selIdx = selDeal ? dealList.findIndex((d) => d.id === selDeal.id) : -1;

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

  // Esc 关闭详情弹窗；← / → 切换上/下一笔
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeDeal(); return; }
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      setSelDeal((cur) => {
        if (!cur || dealList.length < 2) return cur;
        const i = dealList.findIndex((d) => d.id === cur.id);
        if (i < 0) return cur;
        return dealList[(i + dir + dealList.length) % dealList.length];
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealList]);

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
            <span className="brand-date">更新于 {DATA_ASOF}</span>
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
          <span className="section-title">ANALYTICS</span>
        </header>
        <StatsPanel />
      </section>

      {/* ── 02 一级市场交易 ── */}
      <section className="section" id="deals">
        <header className="section-head">
          <span className="section-title">DEAL FLOW</span>
        </header>
        <DealsPanel selected={selDeal?.id ?? null} filter={dealFilter} setFilter={setDealFilter} onSelect={openDeal} onList={setDealList} />
      </section>

      {/* ── 03 数据源 ── */}
      <section className="section" id="source">
        <header className="section-head">
          <span className="section-title">DATA SOURCE</span>
        </header>
        <DataSourcePanel />
      </section>

      {/* ── 状态栏 ── */}
      <footer className="statusbar">
        <span className="status-dot">●</span>
        <span>更新于 {DATA_ASOF} · 每周全网汇总</span>
        <span className="status-right">
          {clock.toLocaleTimeString('zh-CN', { hour12: false })} · 非投资建议
        </span>
      </footer>

      {/* ── 交易详情弹窗 ── */}
      {selDeal && (
        <div className="modal-mask" onClick={() => closeDeal()}>
          {dealList.length > 1 && (
            <button className="modal-nav modal-nav-l" aria-label="上一笔"
              onClick={(e) => { e.stopPropagation(); navDeal(-1); }}>‹</button>
          )}
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              if (touchX.current === null) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              touchX.current = null;
              if (Math.abs(dx) > 60) navDeal(dx < 0 ? 1 : -1);
            }}
          >
            <div className="modal-head">
              <span className="modal-title">交易详情</span>
              {selIdx >= 0 && dealList.length > 1 && (
                <span className="modal-idx">{selIdx + 1} / {dealList.length}</span>
              )}
              <button className="modal-close" onClick={() => closeDeal()}>✕</button>
            </div>
            <div className="modal-body">
              <DetailPanel deal={selDeal} />
            </div>
          </div>
          {dealList.length > 1 && (
            <button className="modal-nav modal-nav-r" aria-label="下一笔"
              onClick={(e) => { e.stopPropagation(); navDeal(1); }}>›</button>
          )}
        </div>
      )}
    </div>
  );
}
