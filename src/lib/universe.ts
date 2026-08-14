// ─────────────────────────────────────────────────────────────────────────────
// 新质生产力一级市场交易样本（美/中）
// 数据来源：每笔交易附公开报道/官方公告链接；金额与估值以链接披露口径为准
// 更新机制：每日 10:00（北京时间）GitHub Actions 全网检索汇总刷新，asOf 为数据截止日期
// ─────────────────────────────────────────────────────────────────────────────

import data from './deals.json';

export const DATA_ASOF: string = data.asOf;

export type Theme = '生物科技' | 'AI制药' | 'AI4S' | 'AI4AI' | '大健康' | '脑机接口';

export interface NewsLink { label: string; url: string }

export interface Deal {
  id: number;
  co: string;
  mkt: 'CN' | 'US' | 'CN/US';
  date: string;
  round: string;
  theme: Theme;
  amt: string;        // 披露口径金额
  amtUSDm: number;    // 折算美元（百万），用于统计
  val?: string;       // 本轮估值（公开披露口径）；缺失时按股比稀释10%推算投后
  inv: string[];    // 结构化机构名单（活跃机构统计用；空=未披露）
  investors: string;
  progress: string;
  links: NewsLink[];  // 数据来源的具体报道链接
}

export const CNY_PER_USD = 7.2;

export const DEALS: Deal[] = data.deals as Deal[];

// 本轮估值：公开披露优先，否则按 融资额 ÷ 10% 股比稀释 推算投后
export function dealValuation(d: Deal): { text: string; short: string; estimated: boolean } {
  if (d.val) {
    const m = d.val.match(/[¥$][\d,\.]+[亿万BM]?/);
    return { text: d.val, short: m ? m[0] : d.val, estimated: false };
  }
  const postUSDm = d.amtUSDm * 10;
  const usd = postUSDm >= 1000 ? `$${(postUSDm / 1000).toFixed(1)}B` : `$${postUSDm.toFixed(0)}M`;
  const cny = `¥${(postUSDm * CNY_PER_USD * 0.01).toFixed(0)}亿`;
  return { text: `≈ ${cny} / ${usd} 投后（按股比稀释10%推算）`, short: `≈${usd}`, estimated: true };
}
