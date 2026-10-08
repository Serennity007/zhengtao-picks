const ENCODING_ATTR = /encoding\s*=\s*["']([^"']+)["']/i;
const CHARSET_PARAM = /charset\s*=\s*([A-Za-z0-9_:.+-]+)/i;
const SUMMARY_LIMIT = 320;

function normalizeLabel(label) {
  if (!label) return 'utf-8';
  const clean = label.replace(/^["']|["']$/g, '').trim().toLowerCase();
  if (!clean || clean === 'utf8' || clean === 'utf-8') return 'utf-8';
  if (clean === 'gb2312' || clean === 'gb-2312' || clean === 'windows-936') return 'gbk';
  if (clean === 'x-sjis' || clean === 'shift_jis') return 'shift_jis';
  return clean;
}

export function decodeXmlBytes(arrayBuffer, contentType = '') {
  const bytes = new Uint8Array(arrayBuffer);
  const fromHeader = contentType.match(CHARSET_PARAM)?.[1];
  const prolog = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 400));
  const label = normalizeLabel(fromHeader || prolog.match(ENCODING_ATTR)?.[1]);
  try {
    return new TextDecoder(label, { fatal: false }).decode(bytes);
  } catch {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  }
}

function localName(node) {
  return String(node.localName || node.nodeName || '').split(':').pop().toLowerCase();
}

function childrenOf(el) {
  return el ? Array.from(el.children || []) : [];
}

function firstChild(el, name) {
  const target = name.toLowerCase();
  return childrenOf(el).find((child) => localName(child) === target) || null;
}

function textOf(el, name) {
  const child = firstChild(el, name);
  return child ? (child.textContent || '').trim() : '';
}

function collapse(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function htmlToText(html) {
  const trimmed = String(html || '').trim();
  if (!trimmed) return '';
  if (!/[<&]/.test(trimmed)) return collapse(trimmed);
  const doc = new DOMParser().parseFromString(trimmed, 'text/html');
  const text = collapse(doc.body?.textContent || '');
  return text || collapse(trimmed);
}

function truncate(value) {
  if (value.length <= SUMMARY_LIMIT) return value;
  return `${value.slice(0, SUMMARY_LIMIT).trimEnd()}…`;
}

function resolveLink(raw, baseUrl) {
  const value = String(raw || '').trim();
  if (!value) return '';
  try {
    return new URL(value, baseUrl || undefined).href;
  } catch {
    return value;
  }
}

function toTimestamp(value) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function atomLink(entry) {
  const links = childrenOf(entry).filter((child) => localName(child) === 'link');
  const preferred =
    links.find((link) => (link.getAttribute('rel') || 'alternate') === 'alternate') || links[0];
  return preferred?.getAttribute('href') || preferred?.textContent?.trim() || '';
}

function parseItem(item, baseUrl, fallbackId) {
  const title = collapse(textOf(item, 'title')) || '（无标题）';
  const rawLink = textOf(item, 'link') || atomLink(item);
  const link = resolveLink(rawLink, baseUrl);
  const guid = textOf(item, 'guid') || textOf(item, 'id');
  const published = textOf(item, 'pubDate') || textOf(item, 'published') || textOf(item, 'updated') || textOf(item, 'date');
  const rawSummary = textOf(item, 'encoded') || textOf(item, 'content') || textOf(item, 'description') || textOf(item, 'summary');
  const author = collapse(textOf(item, 'author') || textOf(item, 'creator') || textOf(item, 'name'));

  return {
    id: guid || link || `${fallbackId}-${title}`,
    title,
    link,
    author,
    published,
    publishedTs: toTimestamp(published),
    summary: truncate(htmlToText(rawSummary)),
  };
}

export function parseFeedXml(xml, baseUrl = '') {
  if (!String(xml || '').trim()) throw new Error('订阅源内容为空');
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.querySelector('parsererror') || doc.getElementsByTagName('parsererror').length) {
    throw new Error('订阅源不是合法的 XML');
  }
  const root = doc.documentElement;
  if (!root) throw new Error('订阅源缺少根节点');

  const format = localName(root);
  if (format === 'rss' || format === 'rdf' || format === 'feed') {
    const channel = format === 'feed' ? root : (firstChild(root, 'channel') || root);
    const feedTitle = collapse(textOf(channel, 'title')) || baseUrl;
    // RSS 1.0 (RDF) 把 item 直接挂在根节点下，RSS 2.0 挂在 channel 下。
    const container = format === 'rdf' ? root : channel;
    const source = childrenOf(container).filter((c) => localName(c) === (format === 'feed' ? 'entry' : 'item'));
    const items = source.map((entry) => parseItem(entry, baseUrl, feedTitle)).filter((entry) => entry.link || entry.title);
    return { feedTitle, format, items };
  }
  throw new Error(`未识别的订阅格式：${format}`);
}

export function dedupeItems(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const keys = [item.id, item.link].filter(Boolean);
    if (keys.some((key) => seen.has(key))) continue;
    keys.forEach((key) => seen.add(key));
    result.push(item);
  }
  return result;
}
