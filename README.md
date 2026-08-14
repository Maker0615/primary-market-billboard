# Primary Market Billboard · 一级市场交易看板

黑底 · 白字 · 金线的新质生产力一级市场交易监控看板，覆盖美国 / 中国两个市场。

## 收录范围

- 题材：AI4S（AI for Science）/ AI4AI（Agent 为主的 AI 应用）/ AI制药 / 生物科技 / 大健康 / 脑机接口
- 轮次：全轮次，重点关注种子轮 / 天使轮 / A 轮
- 市场：US / CN（含 CN/US 双重总部），不收港股，不收 2025 年之前交易
- 每笔交易附具体公开报道/公告链接；估值缺失时按融资额 ÷10% 股比稀释推算投后（带 * 标注）

## 数据与自动更新

- 数据文件：`src/lib/deals/`（每笔交易一个文件 d{id}.json，`meta.json` 记录数据截止日期）
- 每周六 09:00（北京时间）由 Kimi 侧全量更新：全网检索捕捉新交易并复核既有样本 → 构建把关 → 推送 main → 触发 Cloudflare Pages 重建部署
- 备用链路：GitHub Actions（根目录 `daily-update.yml.example`，复制为 `.github/workflows/daily-update.yml` 启用；Secrets：`MOONSHOT_API_KEY`，Variables：`MOONSHOT_BASE_URL`/`MOONSHOT_MODEL`；`CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` 用于部署）
- 注意：Kimi Code key 官方使用范围限定为编码工具；coding 端点若无内置联网检索，脚本会直接失败（宁可断更不产出无源数据）

## 技术栈

React 19 + TypeScript + Vite + Tailwind CSS，SVG 手绘图表，移动端响应式。

## 本地开发

```bash
npm install
npm run dev
npm run build
```

数据为公开披露整理，非投资建议。
