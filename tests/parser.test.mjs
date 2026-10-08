import './dom.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { parseFeedXml, decodeXmlBytes, htmlToText, dedupeItems } = await import('../src/parser.js');

const RSS_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel>
  <title>Agent Weekly</title>
  <link>https://example.com</link>
  <item>
    <title>Multi-agent memory 实践</title>
    <link>https://example.com/posts/memory</link>
    <guid>https://example.com/posts/memory</guid>
    <pubDate>Wed, 07 Oct 2026 08:00:00 GMT</pubDate>
    <dc:creator>正涛</dc:creator>
    <description>&lt;p&gt;共享记忆 &lt;a href="x"&gt;链接&lt;/a&gt;&lt;/p&gt;</description>
  </item>
  <item>
    <title>相对链接条目</title>
    <link>/posts/tool-use</link>
    <pubDate>Tue, 06 Oct 2026 08:00:00 GMT</pubDate>
    <content:encoded><![CDATA[<div>工具调用评测</div>]]></content:encoded>
  </item>
</channel></rss>`;

const ATOM_FIXTURE = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Agent Research</title>
  <entry>
    <title>Context engineering</title>
    <link rel="alternate" href="https://example.org/ctx"/>
    <id>urn:uuid:ctx</id>
    <published>2026-10-05T10:00:00Z</published>
    <summary>长文本摘要</summary>
    <author><name>正涛</name></author>
  </entry>
</feed>`;

test('RSS 2.0：标题、链接、时间与摘要', () => {
  const { feedTitle, items } = parseFeedXml(RSS_FIXTURE, 'https://example.com/feed.xml');
  assert.equal(feedTitle, 'Agent Weekly');
  assert.equal(items.length, 2);
  assert.equal(items[0].link, 'https://example.com/posts/memory');
  assert.equal(items[0].summary, '共享记忆 链接');
  assert.equal(items[0].author, '正涛');
  assert.ok(items[0].publishedTs > 0);
});

test('相对链接按订阅地址解析', () => {
  const { items } = parseFeedXml(RSS_FIXTURE, 'https://example.com/feed.xml');
  assert.equal(items[1].link, 'https://example.com/posts/tool-use');
});

test('Atom：entry、href 与作者', () => {
  const { format, items } = parseFeedXml(ATOM_FIXTURE, 'https://example.org/atom.xml');
  assert.equal(format, 'feed');
  assert.equal(items.length, 1);
  assert.equal(items[0].link, 'https://example.org/ctx');
  assert.equal(items[0].author, '正涛');
});

test('RSS 1.0 (RDF)：item 挂在根节点下', () => {
  const rdf = `<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel rdf:about="https://example.net"><title>Agent Papers</title><link>https://example.net</link></channel>
  <item rdf:about="https://example.net/a1"><title>记忆写入策略</title><link>https://example.net/a1</link><dc:date>2026-10-04T09:00:00Z</dc:date><description>摘要</description></item>
</rdf:RDF>`;
  const { format, feedTitle, items } = parseFeedXml(rdf, 'https://example.net/rss');
  assert.equal(format, 'rdf');
  assert.equal(feedTitle, 'Agent Papers');
  assert.equal(items.length, 1);
  assert.equal(items[0].link, 'https://example.net/a1');
  assert.ok(items[0].publishedTs > 0);
});

test('非法 XML 与未知格式抛出错误', () => {
  assert.throws(() => parseFeedXml('<rss><channel>', 'https://x.com'));
  assert.throws(() => parseFeedXml('<opml><outline/></opml>', 'https://x.com'));
  assert.throws(() => parseFeedXml('', 'https://x.com'));
});

test('去重优先 guid 与链接', () => {
  const { items } = parseFeedXml(RSS_FIXTURE, 'https://example.com/feed.xml');
  assert.equal(dedupeItems([...items, ...items]).length, 2);
});

test('decodeXmlBytes 读取 prolog 声明的编码', () => {
  const bytes = new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><rss></rss>').buffer;
  assert.match(decodeXmlBytes(bytes, 'application/rss+xml'), /<rss>/);
});

test('htmlToText 去掉标签与空白', () => {
  assert.equal(htmlToText('<p>多智能体   编排</p>'), '多智能体 编排');
});
