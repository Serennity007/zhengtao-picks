import { JSDOM } from 'jsdom';
import { CURATED_FEEDS } from '../src/feeds.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.DOMParser = dom.window.DOMParser;

const { parseFeedXml, decodeXmlBytes } = await import('../src/parser.js');

// 尽量贴近插件实际发出的请求：Obsidian 的 requestUrl 不允许自定义 UA，这里复用其 Electron 内核的 UA。
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Obsidian/1.13.0 Electron/39.2.7 Safari/537.36';
const CONCURRENCY = 6;
const STALE_BEFORE = '2026-06-01';

async function check(feed) {
  try {
    const response = await fetch(feed.feedUrl, {
      headers: {
        Accept: 'application/atom+xml, application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*',
        'User-Agent': UA,
      },
      signal: AbortSignal.timeout(25000),
      redirect: 'follow',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    const xml = decodeXmlBytes(buffer, response.headers.get('content-type') || '');
    const parsed = parseFeedXml(xml, response.url);
    if (!parsed.items.length) throw new Error('解析成功但没有条目');
    const newest = parsed.items.reduce((max, item) => Math.max(max, item.publishedTs), 0);
    return {
      feed,
      ok: true,
      count: parsed.items.length,
      format: parsed.format,
      newest: newest ? new Date(newest).toISOString().slice(0, 10) : '无日期',
      redirected: response.url !== feed.feedUrl ? response.url : '',
      titles: parsed.items.slice(0, 3).map((item) => item.title.slice(0, 44)),
    };
  } catch (error) {
    return { feed, ok: false, error: String(error?.message || error).slice(0, 120) };
  }
}

const results = [];
const queue = [...CURATED_FEEDS];
while (queue.length) {
  const batch = queue.splice(0, CONCURRENCY);
  results.push(...(await Promise.all(batch.map(check))));
}

results.sort((a, b) => Number(b.ok) - Number(a.ok) || a.feed.name.localeCompare(b.feed.name));
for (const row of results) {
  if (!row.ok) {
    console.log(`✖ ${row.feed.name} · ${row.error}`);
    continue;
  }
  const stale = row.newest !== '无日期' && row.newest < STALE_BEFORE;
  console.log(
    `${stale ? '⚠' : '✔'} ${row.feed.name} · ${row.count} 条 · ${row.format} · 最新 ${row.newest}` +
      (row.redirected ? ` · 跳转到 ${row.redirected}` : '') +
      `\n     最新：${row.titles.join(' ｜ ')}`
  );
}

const okCount = results.filter((row) => row.ok).length;
console.log(`\n${okCount}/${results.length} 个源可解析，${results.length - okCount} 个失败`);
if (okCount < results.length) process.exitCode = 1;
