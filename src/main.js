import { Notice, Plugin, TFile, moment, normalizePath, requestUrl } from 'obsidian';
import { CURATED_FEEDS } from './feeds.js';
import { PicksView, VIEW_TYPE_PICKS } from './view.js';
import { PicksSettingTab, DEFAULT_SETTINGS } from './settings.js';
import { decodeXmlBytes, parseFeedXml, dedupeItems } from './parser.js';

const CONCURRENCY = 6;
const READ_LIMIT = 2000;

function contentTypeOf(headers) {
  const entry = Object.entries(headers || {}).find(([key]) => key.toLowerCase() === 'content-type');
  return entry ? String(entry[1]) : '';
}

function escapeTitle(value) {
  return String(value || '').replace(/[[\]]/g, '');
}

export default class ZhengtaoPicksPlugin extends Plugin {
  items = [];
  readMap = {};
  feedStatus = {};
  loading = false;
  lastRefresh = 0;
  view = null;
  refreshHandle = null;

  async onload() {
    await this.loadState();

    this.registerView(VIEW_TYPE_PICKS, (leaf) => new PicksView(leaf, this));
    this.addRibbonIcon('telescope', '正涛精选：打开阅读器', () => {
      void this.activateView();
    });
    this.addCommand({
      id: 'open-reader',
      name: '打开正涛精选阅读器',
      callback: () => {
        void this.activateView();
      },
    });
    this.addCommand({
      id: 'refresh-feeds',
      name: '刷新精选订阅',
      callback: () => {
        void this.refresh({ silent: false });
      },
    });

    this.addSettingTab(new PicksSettingTab(this.app, this));
    this.registerRefreshInterval();

    this.app.workspace.onLayoutReady(() => {
      if (this.settings.refreshOnStartup) void this.refresh({ silent: true });
    });
  }

  async loadState() {
    const raw = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...(raw?.settings || {}) };
    this.settings.customFeeds = Array.isArray(this.settings.customFeeds) ? this.settings.customFeeds : [];
    this.settings.disabledFeedIds = Array.isArray(this.settings.disabledFeedIds) ? this.settings.disabledFeedIds : [];
    this.readMap = raw?.read && typeof raw.read === 'object' ? raw.read : {};
    this.lastRefresh = typeof raw?.lastRefresh === 'number' ? raw.lastRefresh : 0;
  }

  async saveState() {
    await this.saveData({
      settings: this.settings,
      read: this.readMap,
      lastRefresh: this.lastRefresh,
    });
  }

  curatedFeeds() {
    return CURATED_FEEDS;
  }

  activeFeeds() {
    const disabled = new Set(this.settings.disabledFeedIds);
    return [
      ...CURATED_FEEDS.filter((feed) => !disabled.has(feed.id)),
      ...this.settings.customFeeds.filter((feed) => /^https?:\/\//.test(feed.feedUrl || '')),
    ];
  }

  attachView(view) {
    this.view = view;
    view.renderList();
  }

  detachView(view) {
    if (this.view === view) this.view = null;
  }

  notifyView() {
    this.view?.refresh();
  }

  async activateView() {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_PICKS);
    if (existing.length) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: VIEW_TYPE_PICKS, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  registerRefreshInterval() {
    if (this.refreshHandle !== null) window.clearInterval(this.refreshHandle);
    this.refreshHandle = null;
    const minutes = Number(this.settings.refreshIntervalMinutes);
    if (!minutes || minutes < 1) return;
    this.refreshHandle = window.setInterval(() => {
      void this.refresh({ silent: true });
    }, minutes * 60 * 1000);
    this.registerInterval(this.refreshHandle);
  }

  async refresh({ silent = true } = {}) {
    if (this.loading) return;
    this.loading = true;
    this.notifyView();

    const feeds = this.activeFeeds();
    const collected = [];
    this.feedStatus = {};

    for (let index = 0; index < feeds.length; index += CONCURRENCY) {
      const batch = feeds.slice(index, index + CONCURRENCY);
      const results = await Promise.allSettled(batch.map((feed) => this.fetchWithTimeout(feed)));
      results.forEach((result, offset) => {
        const feed = batch[offset];
        if (result.status === 'fulfilled') {
          this.feedStatus[feed.id] = { ok: true, count: result.value.length };
          collected.push(...result.value);
        } else {
          this.feedStatus[feed.id] = { ok: false, error: String(result.reason?.message || result.reason) };
        }
      });
    }

    this.items = dedupeItems(collected)
      .sort((a, b) => (b.publishedTs || 0) - (a.publishedTs || 0))
      .slice(0, this.settings.maxItems);
    this.lastRefresh = Date.now();
    this.loading = false;
    this.notifyView();
    await this.saveState();

    if (!silent) {
      const failed = this.failedFeeds();
      new Notice(
        `正涛精选：读到 ${this.items.length} 篇，来自 ${feeds.length - failed.length}/${feeds.length} 个源` +
          (failed.length ? `；失败：${failed.map((entry) => entry.name).join('、')}` : '')
      );
    }
  }

  // requestUrl 既没有 signal 也没有 timeout，连接被挂起时 Promise 永不落地；
  // 一个源卡住会让整批 allSettled 不返回，loading 永远为 true，之后所有刷新空转。
  fetchWithTimeout(feed) {
    let timer = null;
    const timeout = new Promise((_, reject) => {
      timer = window.setTimeout(() => {
        reject(new Error(`超过 ${this.settings.feedTimeoutMs}ms 没有响应`));
      }, this.settings.feedTimeoutMs);
    });
    return Promise.race([this.fetchFeed(feed), timeout]).finally(() => {
      if (timer !== null) window.clearTimeout(timer);
    });
  }

  async fetchFeed(feed) {
    const response = await requestUrl({
      url: feed.feedUrl,
      method: 'GET',
      headers: {
        Accept: 'application/atom+xml, application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*',
      },
    });
    const xml = decodeXmlBytes(response.arrayBuffer, contentTypeOf(response.headers));
    const parsed = parseFeedXml(xml, feed.feedUrl);
    return parsed.items.slice(0, this.settings.perFeedLimit).map((item) => ({
      ...item,
      feedId: feed.id,
      feedName: feed.name,
      category: feed.category,
    }));
  }

  failedFeeds() {
    return Object.entries(this.feedStatus)
      .filter(([, status]) => !status.ok)
      .map(([id, status]) => ({
        id,
        name: this.activeFeeds().find((feed) => feed.id === id)?.name || id,
        error: status.error,
      }));
  }

  isRead(id) {
    return Boolean(this.readMap[id]);
  }

  markRead(id) {
    if (!id || this.readMap[id]) return;
    this.readMap[id] = Date.now();
    const keys = Object.keys(this.readMap);
    if (keys.length > READ_LIMIT) {
      const keep = keys.sort((a, b) => this.readMap[b] - this.readMap[a]).slice(0, READ_LIMIT);
      this.readMap = Object.fromEntries(keep.map((key) => [key, this.readMap[key]]));
    }
    void this.saveState();
  }

  dailyNotePath() {
    const format = this.settings.dailyNoteFormat || 'YYYY-MM-DD';
    const fileName = moment().format(format);
    let folder = String(this.settings.dailyNoteFolder || '').trim();
    if (!folder) {
      const dailyNotes = this.app.internalPlugins?.getEnabledPluginById?.('daily-notes');
      const configured = String(dailyNotes?.instance?.settings?.folder || '').trim();
      if (configured && configured !== '/') folder = configured.replace(/\/+$/, '');
    }
    return normalizePath(folder ? `${folder}/${fileName}.md` : `${fileName}.md`);
  }

  async appendToDailyNote(item) {
    const path = this.dailyNotePath();
    const entry = `- [${escapeTitle(item.title)}](${item.link}) — 正涛精选 · ${item.feedName}`;
    const existing = this.app.vault.getAbstractFileByPath(path);
    let file = null;

    if (existing instanceof TFile) {
      const content = await this.app.vault.cachedRead(existing);
      if (item.link && content.includes(item.link)) {
        new Notice('今日日记里已经有这篇文章了');
        return;
      }
      const prefix = content && !content.endsWith('\n') ? '\n' : '';
      await this.app.vault.modify(existing, `${content}${prefix}${entry}\n`);
      file = existing;
    } else {
      const folder = path.split('/').slice(0, -1).join('/');
      if (folder && !this.app.vault.getAbstractFileByPath(folder)) {
        await this.app.vault.createFolder(folder);
      }
      const title = path.split('/').pop().replace(/\.md$/, '');
      file = await this.app.vault.create(path, `# ${title}\n\n${entry}\n`);
    }

    this.markRead(item.id);
    this.notifyView();
    new Notice(`已记入 ${path}`);
    if (file) await this.app.workspace.getLeaf(false).openFile(file);
  }
}
