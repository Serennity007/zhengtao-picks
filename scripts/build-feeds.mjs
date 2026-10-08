import { mkdirSync, writeFileSync } from 'node:fs';
import { CURATED_FEEDS } from '../src/feeds.js';

const esc = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const CATEGORY_LABEL = {
  article: '文章与 Newsletter',
  news: '公司与研究动态',
  community: '社区与讨论',
};

const groups = new Map();
for (const feed of CURATED_FEEDS) {
  const label = CATEGORY_LABEL[feed.category] || feed.category;
  if (!groups.has(label)) groups.set(label, []);
  groups.get(label).push(feed);
}

const outlines = [...groups.entries()]
  .map(
    ([label, feeds]) =>
      `    <outline text="${esc(label)}" title="${esc(label)}">\n` +
      feeds
        .map(
          (feed) =>
            `      <outline type="rss" text="${esc(feed.name)}" title="${esc(feed.name)}" xmlUrl="${esc(feed.feedUrl)}" htmlUrl="${esc(feed.siteUrl)}"/>\n`
        )
        .join('') +
      '    </outline>\n'
  )
  .join('');

const opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>正涛精选</title>
  </head>
  <body>
${outlines}  </body>
</opml>
`;
writeFileSync(new URL('../feeds.opml', import.meta.url), opml, 'utf8');

const rows = CURATED_FEEDS.map(
  (feed) =>
    `| ${feed.name} | ${feed.category} | [${feed.feedUrl.replace(/^https?:\/\//, '')}](${feed.feedUrl}) | ${feed.note || ''} |`
).join('\n');

const doc = `# 正涛精选订阅源

共 ${CURATED_FEEDS.length} 个源，全部为文本类智能体方向：多智能体系统与编排、Agent 记忆与上下文工程、工具调用与计算机操作、Agent 评测与研究动态。不收视觉、图像/视频生成与多模态演示类内容。

由 \`node scripts/build-feeds.mjs\` 从 \`src/feeds.js\` 生成，请勿手改本文件与 \`feeds.opml\`。

| 名称 | 类别 | 订阅地址 | 方向 |
| --- | --- | --- | --- |
${rows}
`;

mkdirSync(new URL('../docs/', import.meta.url), { recursive: true });
writeFileSync(new URL('../docs/FEEDS.md', import.meta.url), doc, 'utf8');

console.log(`生成 feeds.opml 与 docs/FEEDS.md：${CURATED_FEEDS.length} 个源，${groups.size} 个分组`);
