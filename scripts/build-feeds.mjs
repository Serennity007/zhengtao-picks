import { mkdirSync, writeFileSync } from 'node:fs';
import { CURATED_FEEDS, EXCLUDED_FEEDS, VERIFIED_ON } from '../src/feeds.js';

const esc = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const feeds = CURATED_FEEDS.map(
  (feed) =>
    `      <outline type="rss" text="${esc(feed.name)}" title="${esc(feed.name)}" xmlUrl="${esc(feed.feedUrl)}" htmlUrl="${esc(feed.siteUrl)}"/>`
).join('\n');

// 单个顶层分组，导入后与「乔木精选」同级；类别信息留在文档里，不在 OPML 再嵌套一层。
const opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>正涛精选</title>
  </head>
  <body>
    <outline text="正涛精选" title="正涛精选">
${feeds}
    </outline>
  </body>
</opml>
`;
writeFileSync(new URL('../feeds.opml', import.meta.url), opml, 'utf8');

const rows = CURATED_FEEDS.map(
  (feed) =>
    `| ${feed.name} | ${feed.category} | [${feed.feedUrl.replace(/^https?:\/\//, '')}](${feed.feedUrl}) | ${feed.note || ''} |`
).join('\n');

const excludedRows = EXCLUDED_FEEDS.map(
  (feed) => `| ${feed.name} | ${feed.feedUrl ? `[${feed.feedUrl.replace(/^https?:\/\//, '')}](${feed.feedUrl})` : '—'} | ${feed.reason} |`
).join('\n');

const doc = `# 正涛精选订阅源

共 ${CURATED_FEEDS.length} 个源，全部为文本类智能体方向：多智能体系统与编排、Agent 记忆与上下文工程、工具调用与计算机操作、Agent 评测与研究动态。不收视觉、图像/视频生成与多模态演示类内容。

清单于 ${VERIFIED_ON} 用 \`npm run feeds:check\` 逐个真实抓取验证：全部返回可解析的 RSS/Atom 且有近期条目。脚本复用插件的解码与解析代码，并发送与 Obsidian \`requestUrl\` 相同的 Electron UA，所以这里的结论最接近插件里的实际表现。

由 \`node scripts/build-feeds.mjs\` 从 \`src/feeds.js\` 生成，请勿手改本文件与 \`feeds.opml\`。

## 已纳入

| 名称 | 类别 | 订阅地址 | 方向 |
| --- | --- | --- | --- |
${rows}

## 考察过但没有纳入

| 名称 | 地址 | 结论 |
| --- | --- | --- |
${excludedRows}

「本机网络不可达」是连接层失败，不等于源站没有 RSS；在可直连的环境里可以自己加进「我的订阅」。
`;

mkdirSync(new URL('../docs/', import.meta.url), { recursive: true });
writeFileSync(new URL('../docs/FEEDS.md', import.meta.url), doc, 'utf8');

console.log(`生成 feeds.opml 与 docs/FEEDS.md：纳入 ${CURATED_FEEDS.length} 个源，未纳入记录 ${EXCLUDED_FEEDS.length} 条`);
