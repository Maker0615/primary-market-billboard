// ─────────────────────────────────────────────────────────────────────────────
// 每日全量更新脚本（GitHub Actions 每日 10:00 北京时间触发）
// 流程：调用 Kimi API（内置 $web_search）全网检索 → 严格 JSON 校验 → 合并去重
//       → 更新 asOf → 写回 src/lib/deals.json（构建在 CI 中把关，失败不提交）
// Secrets：MOONSHOT_API_KEY（必需；可填开放平台 key 或 Kimi Code key）
// Variables：MOONSHOT_BASE_URL / MOONSHOT_MODEL（可选覆盖，见下）
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync } from 'node:fs';

const DATA_PATH = 'src/lib/deals.json';
// 端点可通过仓库 Variables 覆盖：
//   MOONSHOT_BASE_URL（默认开放平台 https://api.moonshot.cn/v1；
//     若用 Kimi Code 订阅 key，设为 https://api.kimi.com/coding/v1，模型会被强制为 kimi-for-coding）
//   MOONSHOT_MODEL（默认 kimi-k2-0905-preview）
// 注意：Kimi Code key 的使用范围官方限定为编码工具，用于本脚本存在权益受限风险，请自行权衡；
//       且 coding 端点若不提供内置 $web_search，脚本会直接失败（宁可断更，不产出无源数据）。
const BASE_URL = process.env.MOONSHOT_BASE_URL || 'https://api.moonshot.cn/v1';
const API_URL = `${BASE_URL}/chat/completions`;
const MODEL = BASE_URL.includes('coding')
  ? 'kimi-for-coding'
  : (process.env.MOONSHOT_MODEL || 'kimi-k2-0905-preview');
const ALLOWED_THEMES = ['AI4S', 'AI4AI', 'AI制药', '生物科技', '大健康', '脑机接口'];
const ALLOWED_MKT = ['CN', 'US', 'CN/US'];

const todayCN = () =>
  new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });

function readData() {
  return JSON.parse(readFileSync(DATA_PATH, 'utf8'));
}

const SYSTEM_PROMPT = `你是一级市场融资交易的数据采集员。今天是 ${todayCN()}。

任务：全网检索过去 7 天美国、中国新披露的融资交易，并复核既有样本的重大进展（新轮次、IPO、并购、临床里程碑）。

收录范围（全部条件必须满足）：
- 题材仅限：AI4S（AI for Science）、AI4AI（Agent 为主的 AI 应用，非基础设施）、AI制药、生物科技、大健康、脑机接口。不收 AI+/具身智能/AI基础设施，不收港股（HK）市场，不收 2025 年之前的交易
- 轮次不限，但重点关注种子轮/天使轮/A轮早期交易
- 每笔必须有可验证的公开报道/公告链接（中文交易优先 36氪/腾讯/新浪/网易/亿欧/微信公众号原文 mp.weixin.qq.com；海外交易用英文原始源；财新标注付费墙）
- 信源渠道：网页公开报道、微信公众号（elsewhere别处发生、DeepTech深科技、BioTender 观测日志、36氪/投中/动脉网/医药魔方等，经搜狗微信检索）、Y Combinator 各批次名录、YZi Labs、Fierce Biotech 融资追踪、BioBucks、PR Newswire、Business Wire
- 宁缺毋滥：找不到可靠链接的交易一律不收

输出：仅输出一个 JSON 对象，不要任何额外文字：
{
  "newDeals": [
    {
      "co": "公司名", "mkt": "CN|US|CN/US", "date": "YYYY-MM-DD", "round": "轮次",
      "theme": "六类题材之一", "amt": "披露口径金额（如 ¥3.3亿 / $4,000万）",
      "amtUSDm": 折算美元百万数字, "val": "本轮估值（公开口径，无则省略此字段）",
      "inv": ["机构名"], "investors": "机构描述", "progress": "项目方发展情况一句话",
      "links": [{ "label": "来源名+日期", "url": "https://..." }]
    }
  ],
  "progressUpdates": [{ "co": "既有公司名", "progress": "更新后的进展全文" }],
  "corrections": [{ "co": "既有公司名", "field": "字段名", "value": "修正值", "reason": "依据" }]
}
没有新内容就返回空数组。`;

async function callKimi(apiKey) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: '开始检索并输出 JSON。' },
  ];
  for (let i = 0; i < 14; i++) {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages,
        tools: [{ type: 'builtin_function', function: { name: '$web_search' } }],
      }),
    });
    if (!resp.ok) throw new Error(`Kimi API ${resp.status}: ${await resp.text()}`);
    const data = await resp.json();
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error('empty response');
    messages.push(msg);
    const calls = msg.tool_calls ?? [];
    if (!calls.length) {
      const content = msg.content ?? '';
      // 第一轮就无工具调用 = 端点未提供联网检索，拒绝继续（宁可断更，不产出无源数据）
      if (i === 0) throw new Error('端点未触发 $web_search 联网检索，中止本次更新');
      return content;
    }
    // builtin $web_search 由平台执行，回显 arguments 作为 tool 结果即可
    for (const c of calls) {
      messages.push({
        role: 'tool',
        tool_call_id: c.id,
        name: c.function.name,
        content: c.function.arguments || '{}',
      });
    }
  }
  throw new Error('tool loop exceeded');
}

function extractJson(text) {
  const cleaned = text.replace(/```(?:json)?/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('no json object found');
  return JSON.parse(cleaned.slice(start, end + 1));
}

function validUrl(u) {
  return typeof u === 'string' && /^https?:\/\//.test(u) && u.length < 500;
}

function validateDeal(d) {
  if (!d || typeof d.co !== 'string' || !d.co.trim()) return false;
  if (!ALLOWED_MKT.includes(d.mkt)) return false;
  if (!ALLOWED_THEMES.includes(d.theme)) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) return false;
  if (d.date < '2025-01-01' || d.date > todayCN()) return false;
  if (typeof d.amt !== 'string' || !d.amt) return false;
  if (typeof d.amtUSDm !== 'number' || !(d.amtUSDm > 0)) return false;
  if (!Array.isArray(d.inv)) d.inv = [];
  if (typeof d.investors !== 'string') return false;
  if (typeof d.progress !== 'string') return false;
  if (!Array.isArray(d.links) || !d.links.length) return false;
  if (!d.links.every((l) => l && typeof l.label === 'string' && validUrl(l.url))) return false;
  if (typeof d.round !== 'string' || !d.round) return false;
  return true;
}

async function main() {
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) {
    console.log('MOONSHOT_API_KEY 未配置，跳过本次更新。');
    return;
  }
  console.log(`endpoint: ${BASE_URL} · model: ${MODEL}`);
  const data = readData();
  const raw = await callKimi(apiKey);
  const result = extractJson(raw);

  const existing = new Set(
    data.deals.map((d) => `${d.co.toLowerCase()}|${d.round}|${d.date}`)
  );
  let nextId = Math.max(...data.deals.map((d) => d.id)) + 1;
  let added = 0, progressed = 0, corrected = 0;

  for (const d of result.newDeals ?? []) {
    if (!validateDeal(d)) { console.log('× 校验失败，跳过:', d?.co); continue; }
    const key = `${d.co.toLowerCase()}|${d.round}|${d.date}`;
    if (existing.has(key)) { console.log('× 重复，跳过:', d.co); continue; }
    existing.add(key);
    data.deals.push({ id: nextId++, ...d });
    added++;
    console.log('✓ 新增:', d.co, d.round, d.amt);
  }

  for (const u of result.progressUpdates ?? []) {
    const hit = data.deals.find((d) => d.co.toLowerCase().includes(String(u.co).toLowerCase()));
    if (hit && typeof u.progress === 'string' && u.progress.length > 10) {
      hit.progress = u.progress;
      progressed++;
      console.log('↻ 进展更新:', hit.co);
    }
  }

  for (const c of result.corrections ?? []) {
    const hit = data.deals.find((d) => d.co.toLowerCase().includes(String(c.co).toLowerCase()));
    if (hit && ['amt', 'round', 'date', 'investors'].includes(c.field)) {
      console.log(`⚠ 修正 ${hit.co}.${c.field}: ${hit[c.field]} → ${c.value}（${c.reason}）`);
      hit[c.field] = c.value;
      corrected++;
    }
  }

  if (added + progressed + corrected > 0) {
    data.asOf = todayCN();
    writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');
    console.log(`完成：新增 ${added}，进展 ${progressed}，修正 ${corrected}，asOf=${data.asOf}`);
  } else {
    console.log('无变更。');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
