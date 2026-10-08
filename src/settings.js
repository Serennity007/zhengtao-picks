import { PluginSettingTab, Setting } from 'obsidian';

export const DEFAULT_SETTINGS = {
  refreshOnStartup: true,
  refreshIntervalMinutes: 120,
  maxItems: 200,
  perFeedLimit: 25,
  disabledFeedIds: [],
  customFeeds: [],
  dailyNoteFolder: '',
  dailyNoteFormat: 'YYYY-MM-DD',
};

export class PicksSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: '正涛精选' });
    containerEl.createEl('p', {
      text: '精选方向：多智能体、Agent 记忆与上下文工程、工具调用与评测。只收文本类订阅，不放视觉与多模态源。',
      cls: 'zp-setting-note',
    });

    new Setting(containerEl)
      .setName('启动时刷新')
      .setDesc('打开 Obsidian 后自动拉取一次订阅。')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.refreshOnStartup).onChange(async (value) => {
          this.plugin.settings.refreshOnStartup = value;
          await this.plugin.saveState();
        })
      );

    new Setting(containerEl)
      .setName('自动刷新间隔（分钟）')
      .setDesc('填 0 关闭定时刷新。')
      .addText((text) =>
        text.setValue(String(this.plugin.settings.refreshIntervalMinutes)).onChange(async (value) => {
          const parsed = Number.parseInt(value, 10);
          this.plugin.settings.refreshIntervalMinutes = Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
          await this.plugin.saveState();
          this.plugin.registerRefreshInterval();
        })
      );

    new Setting(containerEl)
      .setName('列表最多保留文章数')
      .setDesc('所有源合并、按时间倒序后截断。')
      .addText((text) =>
        text.setValue(String(this.plugin.settings.maxItems)).onChange(async (value) => {
          const parsed = Number.parseInt(value, 10);
          this.plugin.settings.maxItems = Number.isNaN(parsed) || parsed < 20 ? 200 : parsed;
          await this.plugin.saveState();
        })
      );

    new Setting(containerEl)
      .setName('每日日记文件夹')
      .setDesc('留空则使用 Obsidian 核心「日记」插件的设置；找不到时写入库根目录。')
      .addText((text) =>
        text.setPlaceholder('例如 00-日记').setValue(this.plugin.settings.dailyNoteFolder).onChange(async (value) => {
          this.plugin.settings.dailyNoteFolder = value.trim();
          await this.plugin.saveState();
        })
      );

    new Setting(containerEl)
      .setName('每日日记文件名格式')
      .setDesc('moment 格式，默认 YYYY-MM-DD。')
      .addText((text) =>
        text.setValue(this.plugin.settings.dailyNoteFormat).onChange(async (value) => {
          this.plugin.settings.dailyNoteFormat = value.trim() || 'YYYY-MM-DD';
          await this.plugin.saveState();
        })
      );

    containerEl.createEl('h3', { text: '精选订阅源' });
    for (const feed of this.plugin.curatedFeeds()) {
      new Setting(containerEl)
        .setName(feed.name)
        .setDesc(`${feed.category} · ${feed.note || feed.siteUrl}`)
        .addToggle((toggle) =>
          toggle.setValue(!this.plugin.settings.disabledFeedIds.includes(feed.id)).onChange(async (value) => {
            const disabled = new Set(this.plugin.settings.disabledFeedIds);
            if (value) disabled.delete(feed.id);
            else disabled.add(feed.id);
            this.plugin.settings.disabledFeedIds = [...disabled];
            await this.plugin.saveState();
          })
        );
    }

    containerEl.createEl('h3', { text: '我的订阅' });
    for (const feed of this.plugin.settings.customFeeds) {
      new Setting(containerEl)
        .setName(feed.name)
        .setDesc(feed.feedUrl)
        .addButton((button) =>
          button.setTooltip('移除').setIcon('trash').onClick(async () => {
            this.plugin.settings.customFeeds = this.plugin.settings.customFeeds.filter(
              (candidate) => candidate.id !== feed.id
            );
            await this.plugin.saveState();
            this.display();
          })
        );
    }

    new Setting(containerEl)
      .setName('添加自定义 RSS / Atom')
      .setDesc('名称与订阅地址都填写后点「添加」。')
      .addText((text) => {
        text.setPlaceholder('名称');
        this.customNameEl = text.inputEl;
      })
      .addText((text) => {
        text.setPlaceholder('https://example.com/feed.xml');
        this.customUrlEl = text.inputEl;
      })
      .addButton((button) =>
        button.setButtonText('添加').onClick(async () => {
          const name = this.customNameEl.value.trim();
          const url = this.customUrlEl.value.trim();
          if (!name || !/^https?:\/\//.test(url)) return;
          this.plugin.settings.customFeeds.push({
            id: `custom-${Date.now().toString(36)}`,
            name,
            feedUrl: url,
            category: 'custom',
          });
          await this.plugin.saveState();
          this.display();
        })
      );
  }
}
