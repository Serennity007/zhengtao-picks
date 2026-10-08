import { JSDOM } from 'jsdom';
import { CURATED_FEEDS } from '../src/feeds.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.DOMParser = dom.DOMParser ?? dom.window.DOMParser;

const { parseFeedXml, decodeXmlBytes } = await import('../src/parser.js');

const CONCURRENCY = 6;
const results = [];
const queue = [...CURATED_FEEDS];

async function check(feed) {
  try {
    const response = await fetch(feed.feedUrl, {
      headers: { Accept: 'application/atom+xml, application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*', 'User-Agent': 'zhengtao-picks-feedcheck/1.0' },
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    const xml = decodeXmlBytes(buffer, response.headers.get('content-type') || '');
    const parsed = parseFeedXml(xml, feed.feedUrl);
    const newest = parsed.items.reduce((max, item) => Math.max(max, item.publishedTs), 0);
    if (!parsed.items.length) throw new Error('没有条目');
    return { feed, ok: true, count: parsed.items.length, format: parsed.format, newest: new Date(newest).toISOString().slice(0, 10) };
  } catch (error) {
    return { feed, ok: false, error: String(error.message || error) };
  }
}

while (queue.length) {
  const batch = queue.splice(0, CONCURRENCY);
  results.push(...(await Promise.all(batch.map(check))));
}

const failed = results.filter((entry) => !entry.ok);
const stale = results.filter((entry) => entry.ok && entry.newest < '2026-06-01');

for (const entry of results.sort((a, b) => a.feed.name.localeCompare(b.feed.name))) {
  console.log(
    entry.ok
      ? `✔ ${entry.feed.name} · ${entry.count} 条 · ${entry.format} · 最新 ${entry.newest}`
      : `✖ ${entry.feed.name} · ${entry.error}`
  );
}
console.log(`\n${results.length - failed.length}/${results.length} 个源可解析`);
if (stale.length) console.log(`长期未更新：${stale.map((entry) => entry.feed.name).join('、')}`);
if (failed.length) process.exitCode = 1;
