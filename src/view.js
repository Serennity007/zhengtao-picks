import { ItemView, setIcon, moment, open } from 'obsidian';

export const VIEW_TYPE_PICKS = 'zhengtao-picks-view';
const ALL = '__all';

function formatTime(ts) {
  if (!ts) return '时间未知';
  const now = Date.now();
  if (Math.abs(now - ts) < 7 * 24 * 3600 * 1000) return moment(ts).fromNow();
  return moment(ts).format('YYYY-MM-DD');
}

export class PicksView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.filter = ALL;
    this.query = '';
    this.unreadOnly = false;
  }

  getViewType() {
    return VIEW_TYPE_PICKS;
  }

  getDisplayText() {
    return '正涛精选';
  }

  getIcon() {
    return 'rss';
  }

  async onOpen() {
    this.plugin.attachView(this);
    this.build();
  }

  async onClose() {
    this.plugin.detachView(this);
    this.contentEl.empty();
  }

  build() {
    const root = this.contentEl.createDiv({ cls: 'zp-root' });
    this.toolbarEl = root.createDiv({ cls: 'zp-toolbar' });
    this.statusEl = root.createDiv({ cls: 'zp-status' });
    this.listEl = root.createDiv({ cls: 'zp-list' });
    this.buildToolbar();
    this.renderList();
  }

  buildToolbar() {
    this.toolbarEl.empty();

    const refresh = this.toolbarEl.createEl('button', { cls: 'zp-btn zp-btn-icon' });
    setIcon(refresh, 'refresh-cw');
    refresh.setAttr('aria-label', '刷新订阅');
    refresh.addEventListener('click', () => {
      void this.plugin.refresh({ silent: false });
    });

    const select = this.toolbarEl.createEl('select', { cls: 'zp-select' });
    const feeds = this.plugin.activeFeeds();
    select.createEl('option', { value: ALL, text: `全部（${feeds.length} 个源）` });
    for (const feed of feeds) {
      select.createEl('option', { value: feed.id, text: feed.name });
    }
    select.value = this.filter;
    select.addEventListener('change', () => {
      this.filter = select.value;
      this.renderList();
    });

    const search = this.toolbarEl.createEl('input', {
      cls: 'zp-search',
      attr: { type: 'search', placeholder: '搜索标题、摘要、来源' },
    });
    search.value = this.query;
    search.addEventListener('input', () => {
      this.query = search.value.trim().toLowerCase();
      this.renderList();
    });

    const unread = this.toolbarEl.createEl('button', { cls: 'zp-btn', text: '只看未读' });
    unread.toggleClass('is-active', this.unreadOnly);
    unread.addEventListener('click', () => {
      this.unreadOnly = !this.unreadOnly;
      unread.toggleClass('is-active', this.unreadOnly);
      this.renderList();
    });
  }

  visibleItems() {
    const items = this.plugin.items;
    return items.filter((item) => {
      if (this.filter !== ALL && item.feedId !== this.filter) return false;
      if (this.unreadOnly && this.plugin.isRead(item.id)) return false;
      if (!this.query) return true;
      return [item.title, item.summary, item.feedName, item.author]
        .join(' ')
        .toLowerCase()
        .includes(this.query);
    });
  }

  renderList() {
    if (!this.listEl) return;
    this.listEl.empty();

    if (this.plugin.loading) {
      this.statusEl.setText('正在读取订阅…');
      return;
    }

    const items = this.visibleItems();
    const failed = this.plugin.failedFeeds();
    const parts = [`共 ${items.length} 篇`, `插件自读订阅 ${this.plugin.activeFeeds().length} 个源`];
    if (this.plugin.lastRefresh) parts.push(`更新于 ${moment(this.plugin.lastRefresh).format('MM-DD HH:mm')}`);
    if (failed.length) parts.push(`${failed.length} 个源失败`);
    this.statusEl.setText(parts.join(' · '));

    if (!items.length) {
      this.listEl.createDiv({ cls: 'zp-empty', text: '没有匹配的文章，点左上角刷新拉取最新内容。' });
      return;
    }

    for (const item of items) {
      this.renderItem(item);
    }
  }

  renderItem(item) {
    const row = this.listEl.createDiv({ cls: 'zp-item' });
    row.toggleClass('is-read', this.plugin.isRead(item.id));

    const main = row.createDiv({ cls: 'zp-item-main' });
    main.createDiv({ cls: 'zp-item-title', text: item.title });
    main.createDiv({
      cls: 'zp-item-meta',
      text: [item.feedName, formatTime(item.publishedTs), item.author].filter(Boolean).join(' · '),
    });
    if (item.summary) main.createDiv({ cls: 'zp-item-summary', text: item.summary });

    const actions = row.createDiv({ cls: 'zp-item-actions' });
    const noteBtn = actions.createEl('button', { cls: 'zp-btn zp-btn-small', text: '记日记' });
    noteBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      void this.plugin.appendToDailyNote(item);
    });
    const openBtn = actions.createEl('button', { cls: 'zp-btn zp-btn-small', text: '原文' });
    openBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      this.plugin.markRead(item.id);
      if (item.link) open(item.link);
    });

    main.addEventListener('click', () => {
      this.plugin.markRead(item.id);
      row.toggleClass('is-read', true);
      if (item.link) open(item.link);
    });
  }

  refresh() {
    this.buildToolbar();
    this.renderList();
  }
}
