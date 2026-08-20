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
