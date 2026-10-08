import './register.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { default: ZhengtaoPicksPlugin } = await import('../src/main.js');
const { PicksView } = await import('../src/view.js');
const { PicksSettingTab } = await import('../src/settings.js');
const { CURATED_FEEDS } = await import('../src/feeds.js');
const stub = await import('./obsidian-stub.mjs');

function rssFeed(title, links, dates) {
  const items = links
    .map(
      (link, index) => `<item><title>${title} ${index}</title><link>${link}</link><guid>${link}</guid>
      <pubDate>${dates[index]}</pubDate><description>条目 ${index} 摘要</description></item>`
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${title}</title>${items}</channel></rss>`;
}

function makePlugin(files = {}) {
  const app = stub.makeFakeApp(files);
  const plugin = new ZhengtaoPicksPlugin(app, { id: 'zhengtao-picks', version: '1.0.0' });
  plugin.items = [];
  plugin.readMap = {};
  plugin.feedStatus = {};
  plugin.lastRefresh = 0;
  plugin.view = null;
  plugin.loading = false;
  plugin.settings = { ...stub.DEFAULT_SETTINGS };
  return plugin;
}

test.beforeEach(() => {
  stub.__state.notices.length = 0;
  stub.__state.opened.length = 0;
  stub.__state.saved.length = 0;
  stub.__state.settings.length = 0;
});

test('刷新会合并所有源、按时间倒序并标记失败源', async () => {
  stub.setResponses({
    'https://a.test/feed.xml': { arrayBuffer: stub.toBuffer(rssFeed('源A', ['https://a.test/1'], ['Wed, 07 Oct 2026 08:00:00 GMT'])) },
    'https://b.test/feed.xml': { arrayBuffer: stub.toBuffer(rssFeed('源B', ['https://b.test/1', 'https://b.test/2'], ['Mon, 05 Oct 2026 08:00:00 GMT', 'Tue, 06 Oct 2026 08:00:00 GMT'])) },
    'https://dead.test/feed.xml': { error: 'HTTP 503' },
  });
  const plugin = makePlugin();
  plugin.settings.customFeeds = [
    { id: 'a', name: '源A', feedUrl: 'https://a.test/feed.xml', category: 'article' },
    { id: 'b', name: '源B', feedUrl: 'https://b.test/feed.xml', category: 'article' },
    { id: 'dead', name: '挂掉的源', feedUrl: 'https://dead.test/feed.xml', category: 'article' },
  ];
  plugin.settings.disabledFeedIds = CURATED_FEEDS.map((feed) => feed.id);

  await plugin.refresh({ silent: false });

  assert.equal(plugin.items.length, 3);
  assert.deepEqual(plugin.items.map((item) => item.link), ['https://a.test/1', 'https://b.test/2', 'https://b.test/1']);
  assert.equal(plugin.items[0].feedName, '源A');
  assert.equal(plugin.failedFeeds().length, 1);
  assert.equal(plugin.failedFeeds()[0].name, '挂掉的源');
  assert.match(stub.__state.notices.at(-1), /读到 3 篇，来自 2\/3 个源/);
});

test('列表支持搜索、按源筛选与只看未读', async () => {
  stub.setResponses({
    'https://a.test/feed.xml': { arrayBuffer: stub.toBuffer(rssFeed('源A', ['https://a.test/1', 'https://a.test/2'], ['Wed, 07 Oct 2026 08:00:00 GMT', 'Tue, 06 Oct 2026 08:00:00 GMT'])) },
    'https://b.test/feed.xml': { arrayBuffer: stub.toBuffer(rssFeed('源B', ['https://b.test/1'], ['Mon, 05 Oct 2026 08:00:00 GMT'])) },
  });
  const plugin = makePlugin();
  plugin.settings.customFeeds = [
    { id: 'a', name: '源A', feedUrl: 'https://a.test/feed.xml', category: 'article' },
    { id: 'b', name: '源B', feedUrl: 'https://b.test/feed.xml', category: 'article' },
  ];
  plugin.settings.disabledFeedIds = CURATED_FEEDS.map((feed) => feed.id);
  await plugin.refresh({ silent: true });

  const view = new PicksView({}, plugin);
  await view.onOpen();
  assert.equal(view.contentEl.querySelectorAll('.zp-item').length, 3);

  view.query = '源b';
  view.renderList();
  assert.equal(view.contentEl.querySelectorAll('.zp-item').length, 1);

  view.query = '';
  view.filter = 'a';
  view.renderList();
  assert.equal(view.contentEl.querySelectorAll('.zp-item').length, 2);

  view.filter = '__all';
  view.unreadOnly = true;
  view.renderList();
  assert.equal(view.contentEl.querySelectorAll('.zp-item').length, 3);

  plugin.markRead(plugin.items[0].id);
  view.renderList();
  assert.equal(view.contentEl.querySelectorAll('.zp-item').length, 2);
  assert.equal(view.contentEl.querySelectorAll('.zp-item.is-read').length, 0);

  view.unreadOnly = false;
  view.renderList();
  assert.equal(view.contentEl.querySelectorAll('.zp-item.is-read').length, 1);
});

test('记日记会沿用核心日记设置、去除重复并避免二次写入', async () => {
  const plugin = makePlugin();
  plugin.settings.customFeeds = [{ id: 'a', name: '源A', feedUrl: 'https://a.test/feed.xml', category: 'article' }];
  plugin.settings.disabledFeedIds = CURATED_FEEDS.map((feed) => feed.id);
  stub.setResponses({
    'https://a.test/feed.xml': { arrayBuffer: stub.toBuffer(rssFeed('源A', ['https://a.test/only'], ['Wed, 07 Oct 2026 08:00:00 GMT'])) },
  });
  await plugin.refresh({ silent: true });
  const item = plugin.items[0];

  assert.equal(plugin.dailyNotePath(), 'Journal/2026-10-08.md');

  await plugin.appendToDailyNote(item);
  const file = plugin.app.vault.getAbstractFileByPath('Journal/2026-10-08.md');
  assert.ok(file);
  const content = await plugin.app.vault.cachedRead(file);
  assert.match(content, /^# 2026-10-08\n\n- \[源A 0\]\(https:\/\/a\.test\/only\) — 正涛精选 · 源A\n$/);
  assert.deepEqual(plugin.app.__opened, ['Journal/2026-10-08.md']);
  assert.equal(plugin.isRead(item.id), true);

  await plugin.appendToDailyNote(item);
  const again = await plugin.app.vault.cachedRead(file);
  assert.equal(again, content);
  assert.equal(stub.__state.notices.at(-1), '今日日记里已经有这篇文章了');
});

test('标题里的方括号被转义，避免破坏 Markdown 链接', async () => {
  const plugin = makePlugin();
  plugin.settings.disabledFeedIds = CURATED_FEEDS.map((feed) => feed.id);
  await plugin.appendToDailyNote({ id: 'x1', title: '多 [智能体] 记忆', link: 'https://x.test/1', feedName: '源X' });
  const file = plugin.app.vault.getAbstractFileByPath('Journal/2026-10-08.md');
  assert.match(await plugin.app.vault.cachedRead(file), /- \[多 智能体 记忆\]\(https:\/\/x\.test\/1\)/);
});

test('设置页渲染每个精选源的开关与自定义源输入', () => {
  const plugin = makePlugin();
  new PicksSettingTab(plugin.app, plugin).display();
  const names = stub.__state.settings.map((record) => record.name);
  for (const feed of CURATED_FEEDS) assert.ok(names.includes(feed.name), `缺少 ${feed.name} 的开关`);
  assert.ok(names.includes('添加自定义 RSS / Atom'));
});

test('已读记录只保留最近 2000 条', () => {
  const plugin = makePlugin();
  for (let index = 0; index < 2600; index += 1) plugin.readMap[`id-${index}`] = index;
  plugin.markRead('newest');
  assert.equal(Object.keys(plugin.readMap).length, 2000);
  assert.equal(plugin.isRead('newest'), true);
  assert.equal(plugin.isRead('id-2599'), true);
  assert.equal(plugin.isRead('id-0'), false);
});
