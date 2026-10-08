# 正涛精选 · Zhengtao Picks

只在 Obsidian 里读**智能体方向**的精选订阅：多智能体系统与编排、Agent 记忆与上下文工程、工具调用与计算机操作、Agent 评测与研究动态。纯文本，不收视觉、图像/视频生成与多模态演示类内容。

Read a curated set of **AI-agent, text-only** RSS/Atom feeds inside Obsidian: multi-agent systems, agent memory & context engineering, tool use, and agent evaluation.

## 功能

- **内置精选源**：源清单见 [docs/FEEDS.md](docs/FEEDS.md)，全部在本机直接抓取，不经过任何中间服务器，也不需要账号。
- **列表阅读**：按时间倒序合并所有源，支持按单个源筛选、关键词搜索、只看未读。
- **记入今日日记**：一键把「标题 + 原文链接 + 来源」追加到今日日记，重复点击不会写两遍。默认沿用 Obsidian 核心「日记」插件的文件夹与文件名格式，也可以在设置里覆盖。
- **自动刷新**：启动刷新 + 可选定时间隔（默认 120 分钟，填 0 关闭）。
- **自己的订阅**：设置里可增删自定义 RSS / Atom 地址，和精选源一起显示。
- **解析兼容**：RSS 2.0、RSS 1.0 (RDF)、Atom；按 HTTP 头或 XML 声明自动解码 UTF-8 / GBK；相对链接按订阅地址补全；条目按 guid/链接去重。
- **移动端可用**：`isDesktopOnly: false`。

## 安装

### Release 手动安装

1. 从 [Releases](https://github.com/Serennity007/zhengtao-picks/releases) 下载 `main.js`、`manifest.json`、`styles.css`。
2. 放到 `<你的库>/.obsidian/plugins/zhengtao-picks/`。
3. 在 Obsidian 设置 → 第三方插件中启用 **正涛精选**。
4. 点击左侧栏的 RSS 图标，或运行命令 **正涛精选：打开正涛精选阅读器**。

### BRAT

安装 BRAT 后添加仓库 `Serennity007/zhengtao-picks`，再启用 **正涛精选**。

## 命令

| 命令 | 作用 |
| --- | --- |
| 正涛精选：打开正涛精选阅读器 | 打开阅读面板 |
| 正涛精选：刷新精选订阅 | 立即拉取所有启用的源，并提示成功/失败数量 |

某个源抓取失败不会影响其他源：状态栏会显示「N 个源失败」，刷新时的提示里会列出失败源名称。

## 与 Qiaomu AI RSS 搭配

`feeds.opml` 就是这份精选清单的 OPML 版本。在 [Qiaomu AI RSS](https://github.com/joeseesun/qiaomu-ai-rss) 里：

1. 打开阅读器 → 列表顶部 **+ → 我的订阅 → 导入 OPML**；
2. 选择本仓库的 `feeds.opml`；
3. 导入后这些源会和你的其他个人订阅一起，出现在与「乔木精选」同级的分组里。

本插件是独立实现，代码不派生自 Qiaomu AI RSS；两者只是共享同一份订阅清单（`src/feeds.js` → `feeds.opml`）。

## 隐私

插件只向 `src/feeds.js` 与你自己在设置里添加的订阅地址发起请求，不采集、不上传任何笔记内容，也没有统计代码。

## 开发

```bash
npm install
npm test              # node --test，解析器与离线冒烟测试
npm run check:api     # 把 src 里从 'obsidian' 导入的符号对着官方 obsidian.d.ts 校验
npm run gen:feeds     # 由 src/feeds.js 生成 feeds.opml 与 docs/FEEDS.md
npm run feeds:check   # 用插件同一条解码/解析路径真实抓取每个源，报告条目数与最新日期
npm run build         # esbuild 打包出 main.js
npm run check         # test + check:api + gen:feeds + build
```

`check:api` 不是装饰：开发过程中曾经 `import { open } from 'obsidian'`，而这个符号在当前版本的 `obsidian.d.ts` 里并不存在，运行时会是 `undefined`，只有真点一下条目才暴露。外链改用 `window.open`，脚本把这类问题挡在构建前。

订阅源的唯一数据源是 `src/feeds.js`；`feeds.opml` 和 `docs/FEEDS.md` 都是生成产物，改源清单后重新 `npm run gen:feeds`。

`docs/release-workflow.yml` 是打 tag 自动发 Release 的 GitHub Actions 工作流。因为推送用的 token 没有 `workflow` 权限，它暂时放在 `docs/` 下；想启用，先 `gh auth refresh -s workflow`，再把它复制到 `.github/workflows/release.yml`。在此之前，Release 用 `gh release create` 从本地发布。

## License

[MIT](LICENSE) © 2026 正涛 (Serennity007)
