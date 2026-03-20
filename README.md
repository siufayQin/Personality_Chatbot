# Personality Chatbot

[English](#english) · [中文](#中文)

---

<a id="english"></a>

## English

An AI chatbot with distinct **MBTI personality traits**, built on the **[Dify](https://dify.ai)** platform. This repository includes a small **Node.js** web app (chat UI + API proxy) so you can chat in the browser **without exposing Dify API keys** in the frontend.

### Introduction

The project implements conversational agents with specific MBTI-style personalities. Each persona keeps a consistent tone, behavior, and dialogue style during multi-turn chat. **Brains (prompts, RAG, models)** live on Dify; **this repo** hosts the optional custom web client and secure proxy.

### Live demo (personal hobby)

Out of personal interest, this project is also deployed on **Render** for easy trial (availability / cold start may vary on free tier):

**https://personality-chatbot-g0q5.onrender.com**

### Features

- **MBTI-style personality** settings maintained via Dify apps and prompt engineering  
- **Natural multi-turn** dialogue with per-persona conversation memory  
- **Multi-agent switch** in the UI (e.g. ESFP / ISFJ)—each maps to its own Dify app & API key on the server  
- **Chinese-first** knowledge base and recommended chat language  
- **Low-code** setup on Dify + deployable web stack (local / Render / similar)

### Usage notes

- Please chat in **Chinese** when possible for best alignment with the knowledge base and prompts.  
- The bundled knowledge material is **Chinese**; configure your Dify apps accordingly.

### Tech stack

| Layer | Stack |
|-------|--------|
| Platform | Dify |
| Model | Your chosen LLM on Dify |
| Engineering | Prompt engineering, optional RAG / knowledge base |
| This repo | Node.js (Express), static chat UI, `chat-messages` API proxy |

### Quick start (this repo)

**Dify (once per persona)**  
Create a *Chat assistant* (or any app that exposes `POST /chat-messages`). Add prompts / knowledge base. In **API access**, copy the base URL (e.g. `https://api.dify.ai/v1`) and create an API key per app.

**Local run**

```bash
cd personality-chatbot-dify-starter   # or your repo root if this folder is the project root
npm install
cp .env.example .env                  # Windows: copy .env.example .env
# Edit .env: DIFY_API_URL, DIFY_API_KEY_ESFP or DIFY_API_KEY, DIFY_API_KEY_ISFJ, ...
npm start
```

Open <http://localhost:3000>.

- **Never commit `.env`**; only commit `.env.example`.  
- Add personas in `server.js` → `AGENT_REGISTRY`, then set `DIFY_API_KEY_<UPPERCASE_ID>` in `.env` or your host’s environment.

**Deploy (example: Render)**  
Push this repo to GitHub → New **Web Service** → connect the repo → **Build** `npm install` → **Start** `node server.js` → add the same variables as in `.env.example` under **Environment** → deploy.

### Acknowledgements

Special thanks to the open-source project **[CharacterChat](https://github.com/morecry/CharacterChat)** for valuable data and resources. Personality / knowledge materials in this project are derived from that ecosystem.

### License

MIT

---

<a id="中文"></a>

## 中文

基于 **Dify 平台**搭建的、具有鲜明 **MBTI 人格特质** 的 AI 聊天机器人。本仓库不仅包含 Dify 侧的配置思路，还提供 **Node.js 网页 + API 代理**：浏览器里不暴露 Dify **API 密钥**，适合本地试用或部署到 Render 等平台。

### 项目介绍

在 Dify 上为不同人格分别创建应用（提示词、知识库、模型等），对话时保持统一的语气、行为风格与多轮上下文。本仓库的 **`server.js`** 负责按当前选中的人格把请求转发到对应 Dify 应用；**`public/index.html`** 提供聊天界面，并支持在 **ESFP / ISFJ** 等智能体之间切换（可扩展更多类型）。

### 在线演示（个人爱好）

出于个人爱好，在 **Render** 上部署了一个可直接试用的站点（免费实例可能有冷启动，首次打开多等片刻）：

**https://personality-chatbot-g0q5.onrender.com**

### 功能特点

- **MBTI 人格设定**：在 Dify 内通过提示词与知识库维护角色一致性  
- **自然多轮对话**：与 Dify 会话 ID 联动；切换人格时各自记忆独立  
- **侧栏切换智能体**：一人一密钥（如 `DIFY_API_KEY_ESFP`、`DIFY_API_KEY_ISFJ`），仅保存在服务端环境变量  
- **建议中文对话**；知识库以中文配置为主  
- **Dify 低代码** + 本仓库的轻量前后端，可本地运行或云端部署  

### 使用说明

- 对话请**尽量使用中文**，与当前知识库与提示词设计更匹配。  
- 知识库与角色档案文档以**中文**为主（可参考仓库同级的提示词工程与知识库文件）。

### 技术栈

- Dify 平台、大语言模型（由你在 Dify 中选择）  
- 提示词工程、可选 RAG / 知识库  
- 本仓库：**Express** 代理、`chat-messages` 接口、默认 **streaming** 聚合（兼容仅支持流式的模型）  

### 使用方式

**Dify（每个人格各一个应用）**  
在 Dify 为每个人格创建可与 `chat-messages` 对接的应用（如「聊天助手」），配置提示词与知识库。在 **访问 API** 中复制 API 地址（如 `https://api.dify.ai/v1`），并为每个应用各创建一把 **API 密钥**。

**本机运行**

```bash
cd personality-chatbot-dify-starter
npm install
copy .env.example .env    # Mac/Linux: cp .env.example .env
# 编辑 .env：DIFY_API_URL、DIFY_API_KEY_ESFP 或 DIFY_API_KEY、DIFY_API_KEY_ISFJ 等
npm start
```

浏览器打开 **http://localhost:3000**（默认端口见 `.env` 的 `PORT`）。

- **切勿**将 **`.env`** 提交到 Git，只提交 **`.env.example`**。  
- **扩展新人格**：修改 `server.js` 的 `AGENT_REGISTRY`，并在环境变量中增加 `DIFY_API_KEY_<大写ID>`。

**部署示例（Render）**  
把仓库推到 GitHub → Render **New Web Service** 绑定仓库 → **Build**：`npm install` → **Start**：`node server.js` → 在 **Environment** 中配置与 `.env.example` 相同的变量 → 保存部署。若项目在子目录，填写对应的 **Root Directory**。

### 致谢

特别感谢开源项目 **[CharacterChat](https://github.com/morecry/CharacterChat)** 提供的数据与资源支持；本项目知识库与角色相关内容来源于该方向的开源生态。

### 开源协议

MIT
