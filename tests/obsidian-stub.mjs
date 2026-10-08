import './dom.mjs';

export const __state = {
  notices: [],
  saved: [],
  responses: {},
  settings: [],
};

export function setResponses(responses) {
  __state.responses = responses;
}

export function toBuffer(text) {
  return new TextEncoder().encode(text).buffer;
}

export class Notice {
  constructor(message) {
    __state.notices.push(String(message));
  }
}

export function setIcon() {}

export function normalizePath(path) {
  return String(path).replace(/\\/g, '/').replace(/\/{2,}/g, '/').replace(/\/+$/, '');
}

export class TFile {
  constructor(path, content = '') {
    this.path = path;
    this.basename = path.split('/').pop().replace(/\.md$/, '');
    this._content = content;
  }
}

export function moment(input) {
  const date = input === undefined ? new Date('2026-10-08T12:00:00Z') : new Date(input);
  return {
    format(pattern) {
      if (pattern === 'YYYY-MM-DD') return date.toISOString().slice(0, 10);
      if (pattern === 'MM-DD HH:mm') return date.toISOString().slice(5, 16).replace('T', ' ');
      return `formatted:${pattern}`;
    },
    fromNow: () => '2 天前',
  };
}

export async function requestUrl({ url }) {
  const entry = __state.responses[url];
  if (!entry) throw new Error(`fetch failed for ${url}`);
  if (entry.error) throw new Error(entry.error);
  return {
    arrayBuffer: entry.arrayBuffer,
    headers: { 'content-type': entry.contentType || 'application/rss+xml; charset=UTF-8' },
  };
}

class Control {
  constructor(record, kind) {
    this.record = record;
    this.kind = kind;
    this.inputEl = document.createElement('input');
    record.controls.push(this);
  }

  setName(value) {
    this.record.name = value;
    return this;
  }

  setDesc(value) {
    this.record.desc = value;
    return this;
  }

  setPlaceholder(value) {
    this.placeholder = value;
    return this;
  }

  setTooltip(value) {
    this.tooltip = value;
    return this;
  }

  setButtonText(value) {
    this.buttonText = value;
    return this;
  }

  setIcon(value) {
    this.icon = value;
    return this;
  }

  setValue(value) {
    this.value = value;
    this.inputEl.value = value;
    return this;
  }

  onChange(handler) {
    this.changeHandler = handler;
    return this;
  }

  onClick(handler) {
    this.clickHandler = handler;
    return this;
  }
}

// 每个 Setting 实例对应一条记录，设置页测试据此检查渲染出的名称与控件。
export class Setting {
  constructor(containerEl) {
    this.containerEl = containerEl;
    this.record = { name: '', desc: '', controls: [] };
    __state.settings.push(this.record);
  }

  setName(value) {
    this.record.name = value;
    return this;
  }

  setDesc(value) {
    this.record.desc = value;
    return this;
  }

  addToggle(builder) {
    builder?.(new Control(this.record, 'toggle'));
    return this;
  }

  addText(builder) {
    builder?.(new Control(this.record, 'text'));
    return this;
  }

  addButton(builder) {
    builder?.(new Control(this.record, 'button'));
    return this;
  }
}

export class Component {
  load() {}
  unload() {}
  register() {}
}

export class Plugin {
  constructor(app = makeFakeApp(), manifest = { id: 'zhengtao-picks', version: '1.0.0' }) {
    this.app = app;
    this.manifest = manifest;
    this._data = null;
  }

  async loadData() {
    return this._data;
  }

  async saveData(data) {
    this._data = data;
    __state.saved.push(JSON.parse(JSON.stringify(data)));
  }

  registerView(type, factory) {
    this._views = this._views || {};
    this._views[type] = factory;
  }

  addRibbonIcon() {
    return document.createElement('div');
  }

  addCommand(command) {
    this._commands = this._commands || [];
    this._commands.push(command);
  }

  addSettingTab(tab) {
    this._settingTab = tab;
  }

  registerInterval() {}
}

export class ItemView {
  constructor(leaf) {
    this.leaf = leaf;
    this.contentEl = document.createElement('div');
    this.containerEl = document.createElement('div');
  }
}

export class PluginSettingTab {
  constructor(app, plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement('div');
  }

  display() {}
}

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

export function makeFakeApp(initialFiles = {}) {
  const files = new Map();
  for (const [path, content] of Object.entries(initialFiles)) {
    files.set(path, new TFile(path, content));
  }
  const opened = [];
  const vault = {
    getAbstractFileByPath: (path) => files.get(path) || null,
    cachedRead: async (file) => file._content,
    modify: async (file, content) => {
      file._content = content;
      files.set(file.path, file);
    },
    create: async (path, content) => {
      const file = new TFile(path, content);
      files.set(path, file);
      return file;
    },
    createFolder: async () => ({}),
  };
  const leaf = {
    openFile: async (file) => opened.push(file.path),
    setViewState: async () => {},
  };
  return {
    vault,
    workspace: {
      onLayoutReady: (callback) => callback(),
      getLeavesOfType: () => [],
      getLeaf: () => leaf,
      revealLeaf: () => {},
    },
    internalPlugins: {
      getEnabledPluginById: (id) =>
        id === 'daily-notes' ? { instance: { settings: { folder: 'Journal', format: 'YYYY-MM-DD' } } } : null,
    },
    __files: files,
    __opened: opened,
  };
}
