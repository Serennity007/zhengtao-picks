# 正涛精选订阅源

共 23 个源，全部为文本类智能体方向：多智能体系统与编排、Agent 记忆与上下文工程、工具调用与计算机操作、Agent 评测与研究动态。不收视觉、图像/视频生成与多模态演示类内容。

清单于 2026-10-08 用 `npm run feeds:check` 逐个真实抓取验证：全部返回可解析的 RSS/Atom 且有近期条目。脚本复用插件的解码与解析代码，并发送与 Obsidian `requestUrl` 相同的 Electron UA，所以这里的结论最接近插件里的实际表现。

由 `node scripts/build-feeds.mjs` 从 `src/feeds.js` 生成，请勿手改本文件与 `feeds.opml`。

## 已纳入

| 名称 | 类别 | 订阅地址 | 方向 |
| --- | --- | --- | --- |
| Simon Willison | article | [simonwillison.net/atom/everything/](https://simonwillison.net/atom/everything/) | Agent 工程、工具调用与模型实操 |
| Lilian Weng | article | [lilianweng.github.io/index.xml](https://lilianweng.github.io/index.xml) | Agent、记忆与自我改进长文 |
| Eugene Yan | article | [eugeneyan.com/rss/](https://eugeneyan.com/rss/) | LLM 评测与 Agent 落地经验 |
| Hamel Husain | article | [hamel.dev/index.xml](https://hamel.dev/index.xml) | 评测数据集与 Agent 质量工程 |
| Ahead of AI | article | [magazine.sebastianraschka.com/feed](https://magazine.sebastianraschka.com/feed) | 模型与训练研究解读 |
| Interconnects | article | [www.interconnects.ai/feed](https://www.interconnects.ai/feed) | 开源模型、RL 与 Agent 生态 |
| Latent Space | article | [www.latent.space/feed](https://www.latent.space/feed) | AI 工程访谈与 Agent 实践 |
| Zep Blog | article | [www.getzep.com/blog/rss.xml](https://www.getzep.com/blog/rss.xml) | Agent 记忆层：写入、检索与投毒防御 |
| One Useful Thing | article | [www.oneusefulthing.org/feed](https://www.oneusefulthing.org/feed) | Ethan Mollick，智能体在工作中的用法 |
| 宝玉的分享 | article | [s.baoyu.io/feed.xml](https://s.baoyu.io/feed.xml) | 中文，AI 与 Agent 实践和译文 |
| 阮一峰的网络日志 | article | [www.ruanyifeng.com/blog/atom.xml](https://www.ruanyifeng.com/blog/atom.xml) | 中文技术周刊，含智能体与工具生态条目 |
| OpenAI News | news | [openai.com/news/rss.xml](https://openai.com/news/rss.xml) | 官方发布，含 Agent 产品线 |
| Google AI Blog | news | [blog.google/innovation-and-ai/technology/ai/rss/](https://blog.google/innovation-and-ai/technology/ai/rss/) | 官方产品与研究，偶尔含多模态条目 |
| GitHub Blog | news | [github.blog/feed/](https://github.blog/feed/) | 编码 Agent、Copilot 与代码评审基准 |
| Microsoft Research | news | [www.microsoft.com/en-us/research/feed/](https://www.microsoft.com/en-us/research/feed/) | Agent Lightning 等智能体框架研究 |
| BAIR Blog | news | [bair.berkeley.edu/blog/feed.xml](https://bair.berkeley.edu/blog/feed.xml) | 伯克利 AI 研究院 |
| arXiv cs.MA | news | [export.arxiv.org/rss/cs.MA](https://export.arxiv.org/rss/cs.MA) | 多智能体系统每日新论文 |
| arXiv: LLM Agents | news | [export.arxiv.org/api/query?search_query=all:%22LLM%20agents%22&sortBy=submittedDate&sortOrder=descending&max_results=40](https://export.arxiv.org/api/query?search_query=all:%22LLM%20agents%22&sortBy=submittedDate&sortOrder=descending&max_results=40) | 按提交时间倒序的 LLM Agent 论文 |
| arXiv: Agent Memory | news | [export.arxiv.org/api/query?search_query=all:%22agent%20memory%22&sortBy=submittedDate&sortOrder=descending&max_results=40](https://export.arxiv.org/api/query?search_query=all:%22agent%20memory%22&sortBy=submittedDate&sortOrder=descending&max_results=40) | Agent 记忆方向新论文 |
| InfoQ 中文 | news | [www.infoq.cn/feed](https://www.infoq.cn/feed) | 中文工程实践，多 Agent 产品与架构报道 |
| 量子位 | news | [www.qbitai.com/feed](https://www.qbitai.com/feed) | 中文 AI 媒体，Agent 产品动态 |
| LessWrong | community | [www.lesswrong.com/feed.xml](https://www.lesswrong.com/feed.xml) | 智能体安全与长文讨论 |
| Lobsters AI | community | [lobste.rs/t/ai.rss](https://lobste.rs/t/ai.rss) | 技术社区的 AI 话题链接 |

## 考察过但没有纳入

| 名称 | 地址 | 结论 |
| --- | --- | --- |
| Hugging Face Blog | [huggingface.co/blog/feed.xml](https://huggingface.co/blog/feed.xml) | 本机网络不可达（连接层失败），无法验证；有代理时可自行加入「我的订阅」 |
| Hugging Face Daily Papers | [huggingface.co/papers/feed](https://huggingface.co/papers/feed) | 本机网络不可达，同上 |
| Google DeepMind Blog | [deepmind.google/blog/rss.xml](https://deepmind.google/blog/rss.xml) | 本机网络不可达，无法验证 |
| LangChain Blog | [blog.langchain.dev/rss/](https://blog.langchain.dev/rss/) | 本机网络不可达，无法验证；多智能体编排本来很对口 |
| LlamaIndex Blog | [www.llamaindex.ai/blog/feed](https://www.llamaindex.ai/blog/feed) | 404，/rss.xml 与 /blog/rss.xml 同样 404，源站无公开订阅 |
| Letta (MemGPT) | [www.letta.com/blog/rss.xml](https://www.letta.com/blog/rss.xml) | 404，/blog/feed 与 /rss.xml 也 404；Agent 记忆方向对口但没有公开 RSS |
| Anthropic Newsroom / Engineering | — | 没有公开 RSS，只能读网页 |
| Amazon Science | [www.amazon.science/blog/feed](https://www.amazon.science/blog/feed) | 404 |
| AI Engineer (ai.engineer) | [www.ai.engineer/rss](https://www.ai.engineer/rss) | 404 |
| Mem0 Blog | [mem0.ai/blog/rss](https://mem0.ai/blog/rss) | 404 |
| CrewAI Blog | [www.crewai.com/blog/rss.xml](https://www.crewai.com/blog/rss.xml) | 404（跳转到 crewai.com 后仍 404） |
| Model Context Protocol | [modelcontextprotocol.io/rss.xml](https://modelcontextprotocol.io/rss.xml) | 404 |
| 机器之心 | [www.jiqizhixin.com/rss](https://www.jiqizhixin.com/rss) | /rss 跳转到 /data-service，/feed 返回的不是 XML，没有可用订阅 |
| Hacker News agent 关键字订阅 | [hnrss.org/newest?q=agent&points=50](https://hnrss.org/newest?q=agent&points=50) | 502；hnrss.org/frontpage 可用但不聚焦智能体，故不纳入 |
| AI News (smol.ai) | [news.smol.ai/rss.xml](https://news.smol.ai/rss.xml) | 可解析但大量条目为「not much happened today」，噪声高于信息量 |
| Chip Huyen | [huyenchip.com/feed.xml](https://huyenchip.com/feed.xml) | 最新条目停在 2025-01-16，长期未更新 |
| Mario Zechner | [mariozechner.at/rss.xml](https://mariozechner.at/rss.xml) | 最新 2026-05-30，内容转向机器人与生活随笔，超出智能体文本范围 |
| 少数派 | [sspai.com/feed](https://sspai.com/feed) | 可解析但以效率工具与 App Store 资讯为主，跑题 |

「本机网络不可达」是连接层失败，不等于源站没有 RSS；在可直连的环境里可以自己加进「我的订阅」。
