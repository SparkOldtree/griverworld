---
title: "每日AI资讯 2026-08-17"
date: "2026-08-17"
summary: "你最该关注的最新AI动态、skill、工具、新闻及创新论文"
tags:
  - AI技巧
  - AI论文
  - 行业动态
  - AI工具
---

## AI 行业动态：一周大事速览（8 月 12-13 日密集发布）

**DeepSeek V4-Pro 正式版转正**（8月12日深夜）：MoE 架构总参数 1.6 万亿，每 token 激活 490 亿，编程智能体 DeepSWE 评分从预览版 12.8 跃升至 62.7；价格仅为 Claude Fable 5 的约 2%，8 月 17 日起引入"峰谷定价"（闲时半价）。

**DeepSeek Harness v0.1 开源**（8月13日）：对标 OpenAI Codex 与 Claude Code 的开源 Agent 框架（Agent = Model + Harness），**MIT 协议**，核心是"一切皆插件"——模型、工具、技能、沙箱、UI 均可自由替换，由前 Jane Street 量化交易员崔添翼带队。

**Google DeepMind Gemini 3.7 Flash**（8月13日）：距上代仅三周的精炼版，编码能力大幅跃升（FrontierCode 34.4%→43.6%），输入价格砍半至 $0.75/百万 token。

**阿里 Qwen3.8-2.4T-A95B 开源**（8月13日）：**首次开源 Max 级旗舰**，2.4 万亿参数 MoE，每 token 激活 950 亿；PaperBench 93.0 分居参评模型首位；经 Unsloth 1-bit 量化后 4.9TB 可压缩到 397GB，410GB 显存即可本地运行。

**人物动态**：Google DeepMind CEO **Demis Hassabis 卸任**，转任 DeepMind 董事长兼 Google 首席科学家（8月6日）。

**趋势总结**：所有厂商都在抢"**Agent 能把活干完**"这条赛道，同时价格战白热化——对开发者来说是"最幸福的烦恼"。

> 注释：**MoE（Mixture of Experts，专家混合）** 一种大模型架构，每次只激活部分参数，兼顾性能与效率；**Agent（智能体）** 指能自主规划、调用工具、多步执行完成任务的 AI。

## AI 论文速览：MatrAIx —— 用 83 亿模拟用户重构 AI 产品评估

本周刷屏的一篇 arXiv 论文：**[MatrAIx: Simulating the World with 8.3 Billion Persona Agents](https://arxiv.org/abs/2608.04205)**（2026-08-04 发布，代码已开源）。

**它讲的是什么？** 传统的 AI 产品评测，是把用户当成行为统一的"抽象平均分"，忽略了新手/专家、耐心/易放弃等真实差异。MatrAIx 提出用**人口规模的数字模拟用户**来测试 AI 产品：

- **Persona 8B**：83 亿条角色记录、1290 维人物属性，基于有向无环图（DAG）关联属性避免自相矛盾，生成逼真的"数字人物"
- **Playground**：四类仿真环境（问卷、AI 对话、网页浏览、多系统应用），完整记录交互轨迹，区分"任务未完成""产品故障""用户主动放弃"
- **Applications**：1010 项覆盖 20+ 行业的任务库，已开展 18189 次评估试验

**有什么用？** 在真人测试之前，先用可复现、可控的模拟用户群做**发布前压力测试**，提前发现特定人群（不同语言、经验、风险偏好）的使用障碍；也能固定同一批模拟用户对比产品不同版本。

**要注意**：作者强调，91.5% 的行为遵循率只说明模型能"演好"角色，**不能替代真人**，尤其医疗、金融等高风险场景仍需真人证据。它定位是"先模拟、再面对现实"的筛查工具。

> 注释：**Persona**（人格/人物画像）这里指为模拟用户设定的性格、背景、行为倾向等属性集合。

## AI 工具技巧：结构化提示词五要素

想让 AI 一次就产出你要的东西，与其啰嗦半天，不如用一套**结构化提示词模板**（Structured Prompt）。五个要素按顺序组织：

1. **背景（Context）**：一句话说明"我是什么场景/给谁用"
2. **角色（Role）**：明确让 AI 扮演谁，如"你是一位资深前端工程师"
3. **任务（Task）**：动词开头的明确指令，如"帮我审查这段代码的安全性"
4. **约束（Constraints）**：硬性要求，如"不要引入新依赖""控制在 200 字内"
5. **输出格式（Format）**：指定格式，如"用表格输出""每段配一个例子"

一个可直接复制的模板：

```text
【背景】我要给技术公众号写一篇 800 字的 AI 工具科普。
【角色】你是一位擅长写浅显易懂科普文的科技编辑。
【任务】用大白话解释"提示词工程"是什么。
【约束】不用行话；每处专业词汇必须附注释；控制在 800 字左右。
【格式】分三段输出，第一段用生活化类比开场。
```

要点：**约束和格式写清楚，比多写几段任务描述更有效**——AI 输出的"形状"完全由这两项决定。

> 注释：**提示词（Prompt）** 就是你发给 AI 的指令文本；**提示词工程（Prompt Engineering）** 就是设计这些指令让 AI 稳定输出你想要的结果。

## GitHub AI Skill：Karpathy 的 AI 编程四原则

近期 GitHub 上有个现象级仓库 **`forrestchang/andrej-karpathy-skills`**（[GitHub 链接](https://github.com/forrestchang/andrej-karpathy-skills)），总星数已超 **67K**。它里面没有任何代码，只有一个 `CLAUDE.md` 配置文件——把它放进项目里，就能约束 Claude Code 等 AI 编程助手的行为。

它做什么？作者 Andrej Karpathy（前 Tesla AI 总监、OpenAI 创始成员）观察到 LLM 编程的四大通病：**不确认假设就埋头写码、过度设计、顺手改无关代码、只执行不校验**。仓库把这套洞察提炼成四条原则：

1. **Think Before Coding（编码前思考）**：不确定就停下来提问，别猜着写
2. **Simplicity First（简洁第一）**：不写超出需求的功能，能 50 行写完就不写 200 行
3. **Surgical Changes（手术式修改）**：只改该改的，每行改动都能追溯到你的请求
4. **Goal-Driven Execution（目标驱动）**：给它验收标准（"完成后 X、Y、Z 应成立"），而不是操作步骤

为什么有趣？一个 Markdown 文件引爆 6 万星，说明当前 AI 编程的最大瓶颈不是"模型不够聪明"，而是**缺少行为约束**。安装只需两条命令：

```bash
/plugin marketplace add forrestchang/andrej-karpathy-skills
/plugin install andrej-karpathy-skills@karpathy-skills
```

> 注释：**CLAUDE.md** 是 Claude Code 的项目规则文件，放在项目根目录，AI 每次运行都会自动读取并遵循。

## AI Agent 动态

**DeepSeek Harness** 刚以 MIT 协议开源，"一切皆插件"，可自由组合模型、工具与技能，对标 OpenAI Codex 与 Claude Code，本周社区热度最高。
