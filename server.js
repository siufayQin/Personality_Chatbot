/**
 * 多智能体：通过请求体 agent 选择 Dify 应用密钥（密钥仅在此文件 / 环境变量）。
 * 兼容：未配置分体密钥时，ESFP 可回落到 DIFY_API_KEY。
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const DIFY_BASE = (process.env.DIFY_API_URL || 'https://api.dify.ai/v1').replace(/\/$/, '');
const USE_BLOCKING = String(process.env.DIFY_RESPONSE_MODE || '').toLowerCase() === 'blocking';

/** 在些注册新性格：增加一项并配置对应 DIFY_API_KEY_XXX 环境变量 */
const AGENT_REGISTRY = [
  {
    id: 'esfp',
    name: 'ESFP',
    subtitle: '表演者 · 聊天助手',
    envKeys: ['DIFY_API_KEY_ESFP', 'DIFY_API_KEY'],
  },
  {
    id: 'isfj',
    name: 'ISFJ',
    subtitle: '守护者 · 聊天助手',
    envKeys: ['DIFY_API_KEY_ISFJ'],
  },
];

function firstDefinedEnv(keys) {
  for (const k of keys) {
    const v = process.env[k];
    if (v && String(v).trim()) return String(v).trim();
  }
  return '';
}

function resolveAgentKey(agentId) {
  const id = String(agentId || '')
    .toLowerCase()
    .trim();
  const entry = AGENT_REGISTRY.find((a) => a.id === id);
  if (!entry) return { key: '', entry: null };
  const key = firstDefinedEnv(entry.envKeys);
  return { key, entry };
}

function publicAgentsList() {
  return AGENT_REGISTRY.map((a) => {
    const { key } = resolveAgentKey(a.id);
    return {
      id: a.id,
      name: a.name,
      subtitle: a.subtitle,
      configured: Boolean(key),
    };
  });
}

/**
 * 解析 Dify SSE 流，拼接 message 事件的增量 answer，读取 message_end 的 conversation_id
 */
async function aggregateStreamingResponse(upstream) {
  let fullAnswer = '';
  let conversationId = '';
  let messageId = '';
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let carry = '';

  const processBlock = (block) => {
    for (const line of block.split('\n')) {
      const m = line.match(/^data:\s*(.*)$/);
      if (!m) continue;
      const raw = m[1].trim();
      if (!raw || raw === '[DONE]') continue;
      let obj;
      try {
        obj = JSON.parse(raw);
      } catch {
        continue;
      }
      if (obj.event === 'error' || obj.status === 400) {
        const msg =
          obj.message ||
          obj.msg ||
          (obj.data && obj.data.message) ||
          JSON.stringify(obj);
        throw new Error(msg);
      }
      if (obj.event === 'message' && typeof obj.answer === 'string') {
        fullAnswer += obj.answer;
      }
      if (obj.event === 'agent_message' && typeof obj.answer === 'string') {
        fullAnswer += obj.answer;
      }
      if (obj.event === 'message_end') {
        if (obj.conversation_id) conversationId = obj.conversation_id;
        if (obj.id) messageId = obj.id;
        if (obj.message_id) messageId = obj.message_id;
      }
      if (obj.conversation_id && !conversationId) {
        conversationId = obj.conversation_id;
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    carry += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = carry.indexOf('\n\n')) !== -1) {
      const block = carry.slice(0, idx);
      carry = carry.slice(idx + 2);
      processBlock(block);
    }
  }
  if (carry.trim()) processBlock(carry);

  return { answer: fullAnswer, conversation_id: conversationId, message_id: messageId };
}

/** 可选智能体列表（不含密钥） */
app.get('/api/agents', (req, res) => {
  res.json({
    defaultAgent: AGENT_REGISTRY[0].id,
    agents: publicAgentsList(),
  });
});

app.get('/api/health', (req, res) => {
  const agents = publicAgentsList();
  res.json({
    ok: true,
    mode: USE_BLOCKING ? 'blocking' : 'streaming',
    agents,
    defaultAgent: AGENT_REGISTRY[0].id,
    hasAnyKey: agents.some((a) => a.configured),
  });
});

const staticMaxAge = process.env.NODE_ENV === 'production' ? 86400000 : 0;
app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: staticMaxAge,
    etag: true,
    lastModified: true,
  }),
);

app.post('/api/chat', async (req, res) => {
  const rawAgent = req.body && req.body.agent != null ? String(req.body.agent) : AGENT_REGISTRY[0].id;
  const { key: API_KEY, entry } = resolveAgentKey(rawAgent);

  if (!entry) {
    return res.status(400).json({
      error: `未知智能体 "${rawAgent}"。可选：${AGENT_REGISTRY.map((a) => a.id).join(', ')}`,
    });
  }
  if (!API_KEY) {
    const hint = entry.envKeys[0];
    return res.status(500).json({
      error: `智能体「${entry.name}」未配置 API 密钥。请在环境变量中设置 ${hint}（参考 .env.example）。`,
    });
  }

  const { query, conversation_id, user } = req.body || {};
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: '请求体需要字段 query（字符串）' });
  }

  const body = {
    inputs: req.body.inputs && typeof req.body.inputs === 'object' ? req.body.inputs : {},
    query: query.trim(),
    response_mode: USE_BLOCKING ? 'blocking' : 'streaming',
    conversation_id: conversation_id || '',
    user: user && String(user).trim() ? String(user).trim() : 'web-user',
  };

  try {
    const r = await fetch(`${DIFY_BASE}/chat-messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const text = await r.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
      return res.status(r.status).json({
        error: data.message || data.code || r.statusText,
        detail: data,
      });
    }

    if (USE_BLOCKING) {
      const data = await r.json().catch(() => ({}));
      return res.json({
        answer: data.answer ?? '',
        conversation_id: data.conversation_id ?? '',
        message_id: data.message_id ?? '',
        agent: entry.id,
      });
    }

    const agg = await aggregateStreamingResponse(r);
    return res.json({
      answer: agg.answer,
      conversation_id: agg.conversation_id,
      message_id: agg.message_id,
      agent: entry.id,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`打开浏览器访问 http://localhost:${PORT}`);
  console.log(
    USE_BLOCKING
      ? 'Dify 请求模式: blocking'
      : 'Dify 请求模式: streaming',
  );
  publicAgentsList().forEach((a) => {
    console.log(`  智能体 ${a.id}: ${a.configured ? '已配置密钥' : '未配置密钥'}`);
  });
});
