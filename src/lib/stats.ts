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
const ROUND_OVERRIDE: Record<number, string> = { 21: '成长/战略轮', 32: '种子/天使轮', 46: '成长/战略轮', 60: '成长/战略轮', 62: '成长/战略轮' };

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

// ④ 活跃投资机构（按参与交易笔数，附官网链接）
const INVESTOR_URLS: Record<string, string> = {
  'a16z': 'https://a16z.com', 'Thrive Capital': 'https://thrivecap.com',
  'Kleiner Perkins': 'https://www.kleinerperkins.com', 'GV': 'https://www.gv.com',
  'RA Capital': 'https://www.racap.com', 'Founders Fund': 'https://foundersfund.com',
  'General Catalyst': 'https://www.generalcatalyst.com', 'Greenoaks': 'https://www.greenoakscap.com',
  'Lightspeed': 'https://lsvp.com', 'Index Ventures': 'https://www.indexventures.com',
  'Bessemer Venture Partners': 'https://www.bvp.com', 'Accel': 'https://www.accel.com',
  'ARCH Venture Partners': 'https://www.archventure.com', 'Spark Capital': 'https://www.sparkcapital.com',
  'Triatomic Capital': 'https://www.triatomic.vc', 'Forerunner Ventures': 'https://www.forerunnerventures.com',
  'Forbion': 'https://www.forbion.com', 'General Atlantic': 'https://www.generalatlantic.com',
  'Oak HC/FT': 'https://www.oakhcft.com', 'OrbiMed': 'https://www.orbimed.com',
  'QIA': 'https://www.qia.qa', 'ARK Invest': 'https://www.ark-invest.com',
  'DFJ Growth': 'https://dfjgrowth.com', 'Playground Global': 'https://www.playground.vc',
  'Regeneron Ventures': 'https://www.regeneron.com', 'Amplify Partners': 'https://www.amplifypartners.com',
  'Zetta Venture Partners': 'https://www.zetta.vc', 'Boldstart': 'https://www.boldstart.vc',
  'Threshold': 'https://www.threshold.vc', 'redalpine': 'https://www.redalpine.com',
  'Cambium Capital': 'https://www.cambiumcapital.com', 'Walden Catalyst': 'https://www.waldencatalyst.com',
  'Dimension': 'https://www.dimensioncap.com', 'Bain Capital Ventures': 'https://www.baincapitalventures.com',
  'Battery Ventures': 'https://www.battery.com', 'Baillie Gifford': 'https://www.bailliegifford.com',
  'Sapphire Ventures': 'https://www.sapphireventures.com', 'Menlo Ventures Anthology Fund': 'https://www.menlovc.com',
  'Anthropic': 'https://www.anthropic.com', 'OpenAI': 'https://openai.com',
  'Y Combinator': 'https://www.ycombinator.com', 'NVentures': 'https://www.nvidia.com/en-us/startups/',
  'Coatue': 'https://www.coatue.com', 'Quiet Capital': 'https://www.quietcapital.com',
  'Valor Equity Partners': 'https://www.valorep.com', 'Vista Equity Partners': 'https://www.vistaequitypartners.com',
  'Flying Fish Partners': 'https://www.flyingfish.vc', 'Omega Funds': 'https://www.omegafunds.net',
  'EQT Life Sciences': 'https://eqtgroup.com', 'Medicxi': 'https://www.medicxi.com',
  'Janus Henderson': 'https://www.janushenderson.com', 'Fidelity': 'https://www.fidelity.com',
  'VitaDAO': 'https://www.vitadao.com', 'Pillar VC': 'https://www.pillar.vc',
  'Susa Ventures': 'https://www.susaventures.com', 'Hawktail VC': 'https://www.hawktail.vc',
  'Day One Ventures': 'https://www.dayoneventures.com', 'Winklevoss Capital': 'https://www.winklevosscapital.com',
  'Long Journey Ventures': 'https://www.longjourney.vc', 'BoxGroup': 'https://www.boxgroup.com',
  'Gradient': 'https://www.gradient.com', 'Frst': 'https://www.frst.vc',
  'Air Street Capital': 'https://www.airstreet.com', 'Neo': 'https://www.neo.com',
  'G42': 'https://www.g42.ai', 'StepStone': 'https://www.stepstonegroup.com',
  'Square Peg': 'https://www.squarepeg.vc', 'Pear VC': 'https://www.pear.vc',
  'Bristol-Myers Squibb': 'https://www.bms.com', 'Parker Institute for Cancer Immunotherapy': 'https://www.parkerici.org',
  'Stanford University': 'https://www.stanford.edu', 'University of Pennsylvania': 'https://www.upenn.edu',
  'Eli Lilly Ventures': 'https://www.lilly.com', 'Sanofi Ventures': 'https://www.sanofi.com',
  'Takeda': 'https://www.takeda.com', 'GSK': 'https://www.gsk.com', 'Merck GHIF': 'https://www.merck.com',
  'Goldman Sachs Alternatives': 'https://www.goldmansachs.com', 'Granite Asia': 'https://www.graniteasia.com',
  'TLV Partners': 'https://www.tlv.partners', 'Vintage Investment Partners': 'https://www.vintage-ip.com',
  'Bezos Expeditions': 'https://www.bezosexpeditions.com', 'Gates Frontier': 'https://www.gatesfrontier.com',
  'Bulba Ventures': 'https://bulba.vc', 'Conviction': 'https://www.conviction.com', 'SV Angel': 'https://www.svangel.com',
  '腾讯': 'https://www.tencent.com', '红杉': 'https://www.hongshan.com',
  '中科创星': 'https://www.casstar.com.cn', '启明创投': 'https://www.qimingvc.com',
  '五源资本': 'https://www.5ycapital.com', '真格基金': 'https://www.zhenfund.com',
  '达晨财智': 'https://www.fortunevc.com', '联想创投': 'https://www.lenovocapital.com',
  '联想之星': 'https://www.legendstar.cn', '中金资本': 'https://www.cicc.com',
  '中国移动': 'https://www.chinamobile.com', '阿里巴巴': 'https://www.alibabagroup.com',
  '顺为资本': 'https://www.shunwei.com', '蚂蚁集团': 'https://www.antgroup.com',
  '经纬创投': 'https://www.matrixpartners.com.cn', '奇绩创坛': 'https://www.miracleplus.com',
  '惠理集团': 'https://www.valuepartners-group.com', '济峰资本': 'https://www.jifengventures.com',
  '携程': 'https://www.trip.com', '金蝶': 'https://www.kingdee.com',
  '晶科能源': 'https://www.jinkosolar.com', '壁仞科技': 'https://www.birentech.com',
  '中国石化': 'https://www.sinopec.com',
};

export interface InvestorBucket extends Bucket { url?: string }

export function topInvestors(n = 10): InvestorBucket[] {
  const m = new Map<string, InvestorBucket>();
  for (const d of DEALS) {
    for (const name of d.inv) {
      const b = m.get(name) ?? { key: name, count: 0, usdM: 0 };
      b.count++; b.usdM += d.amtUSDm; m.set(name, b);
    }
  }
  return [...m.values()]
    .sort((a, b) => b.count - a.count || b.usdM - a.usdM)
    .slice(0, n)
    .map((b) => ({ ...b, url: INVESTOR_URLS[b.key] }));
}

// ⑤ 轮次 × 题材矩阵（轮次条按题材占比分段着色）
export interface RoundMix extends Bucket { segs: Array<{ theme: string; count: number }> }

export function roundThemeMix(themeOrder: string[]): RoundMix[] {
  return byRound().map((r) => {
    const m = new Map<string, number>();
    for (const d of DEALS) {
      if (roundBucket(d) === r.key) m.set(d.theme, (m.get(d.theme) ?? 0) + 1);
    }
    const segs = themeOrder
      .filter((t) => m.has(t))
      .map((t) => ({ theme: t, count: m.get(t)! }));
    return { ...r, segs };
  });
}

export function totalUSDm(): number {
  return DEALS.reduce((s, d) => s + d.amtUSDm, 0);
}
