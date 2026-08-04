export const DEEPSEEK_PROXY_URL = 'https://kobo-trainer-proxy.charlielam2025.workers.dev';

export async function chatComplete({ apiKey, messages, temperature = 0.7, max_tokens, signal, timeoutMs = 60000 }) {
  const useProxy = !apiKey || !apiKey.trim();
  const url = useProxy
    ? `${DEEPSEEK_PROXY_URL}/v1/chat/completions`
    : 'https://api.deepseek.com/chat/completions';
  const headers = { 'Content-Type': 'application/json' };
  if (!useProxy) headers['Authorization'] = `Bearer ${apiKey}`;

  const body = { model: 'deepseek-chat', messages, temperature };
  if (max_tokens) body.max_tokens = max_tokens;

  // 超时保护：代理/网络卡死时不要让 UI 永远转圈 · 也允许调用方传 signal 主动取消
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('AI 请求超时', 'TimeoutError')), timeoutMs);
  const onOuterAbort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) { clearTimeout(timer); throw signal.reason || new DOMException('已取消', 'AbortError'); }
    signal.addEventListener('abort', onOuterAbort, { once: true });
  }

  let res;
  try {
    res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
  } catch (e) {
    if (e?.name === 'TimeoutError' || controller.signal.reason?.name === 'TimeoutError') {
      throw new Error('AI 响应超时 · 请稍后重试');
    }
    if (e?.name === 'AbortError') throw e;
    if (useProxy) {
      throw new Error('AI 服务暂时连不上 · 可在"设置"里填自己的 DeepSeek 密钥直连');
    }
    throw e;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onOuterAbort);
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    let parsed = null;
    try { parsed = JSON.parse(txt); } catch {}
    const msg = parsed?.error?.message || txt.slice(0, 200) || res.statusText;
    if (res.status === 429) {
      throw new Error(msg || '今日 AI 额度已用完 · 明天再来 · 想无限请在"设置"里填自己的 DeepSeek 密钥');
    }
    throw new Error(`AI ${res.status}: ${msg}`);
  }
  return res.json();
}

// DeepSeek API 调用：根据主题生成 N 个口播选题

export async function deepseekGenerateTopics({ apiKey, theme, count = 6, style = '' }) {
  const sys = '你是一位资深小红书短视频选题策划。你给出的选题：(1) 能在 60 秒内讲清楚 (2) 自带钩子、反差或痛点 (3) 有清晰立场和观点 (4) 极度口语化、像人在说话 (5) 优先使用认知冲突、避坑、身份代入、数字锚定结构 (6) 每条 8-20 字。';
  const usr = `围绕主题《${theme}》，给我 ${count} 个口播短视频选题。${style ? '风格倾向：' + style + '。' : ''}\n仅返回一个 JSON 数组，例：["选题1","选题2"]。不要返回任何解释、代码块标记或前缀文字。`;
  const data = await chatComplete({
    apiKey,
    messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }],
    temperature: 0.95,
  });
  const text = data.choices?.[0]?.message?.content || '';
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) throw new Error('AI 输出非数组格式：' + text.slice(0, 200));
  const arr = JSON.parse(m[0]);
  return arr.filter(x => typeof x === 'string').map(s => s.trim()).filter(Boolean);
}

// DeepSeek 关键词提取：把一段口播稿提炼成 8-12 个串联关键词

export async function deepseekExtractKeywords({ apiKey, text, count = 10 }) {
  if (!text?.trim()) throw new Error('请先填入要提取的文本');
  const sys = '你是口播稿关键词提炼专家。把用户给的稿子提炼成串联关键词，让人看到关键词就能回忆起接下来要说什么、freestyle 串成完整内容。';
  const usr = `把下面这段口播稿提炼成 ${count} 个关键词/短语：

要求：
1. 每个 2-6 字，不要长句
2. 按口播叙述顺序排列
3. 必须能串起整段（看到就能想起接下来该说什么）
4. 仅返回 JSON 数组：["关键词1","关键词2","..."]
5. 不要返回任何解释 / 代码块标记 / 前缀

口播稿：
${text}`;
  const data = await chatComplete({
    apiKey,
    messages: [{ role:'system', content:sys }, { role:'user', content:usr }],
    temperature: 0.6,
  });
  const out = data.choices?.[0]?.message?.content || '';
  const m = out.match(/\[[\s\S]*\]/);
  if (!m) throw new Error('AI 输出非数组：' + out.slice(0,200));
  const arr = JSON.parse(m[0]);
  return arr.filter(x => typeof x === 'string').map(s => s.trim()).filter(Boolean);
}

// DeepSeek 每日激励语：根据用户当前状态生成一句话开场

export async function deepseekDailyGreeting({ apiKey, streak, totalCount, weekCount, dayOfWeek, isRestDay, todayCount, goalCount }) {
  const sys = '你是一个温暖、有创作经验的内容创作者朋友。给用户写一句开场打招呼，口语化、不要鸡汤、不要"加油"这种空话。把用户当「同行的创作者」对话，不是「需要被鼓励的学员」。';
  const usr = `用户状态（你的同行）：
- 连续 ${streak} 天达成目标
- 累计 ${totalCount} 条预演
- 本周已录 ${weekCount} 条
- 今天是${dayOfWeek}
- 今天目标 ${goalCount} 条 · 已录 ${todayCount} 条
- 今天${isRestDay ? '已声明为休息日' : '正常练习日'}

要求：
- 1 句话，30-50 字
- 口语化，像朋友说话
- 用「身份」语言，不用「鼓励」语言：
  · 不说「你真棒、加油坚持、你做得到」这类
  · 说「这就是创作者的日常 / 你的训练节奏 / 你已经是 X 了」这类
- 根据连续天数调整：
  · 0 天：温柔欢迎，把「想做内容」的他正名为「创作者」
  · 1-3 天：肯定他已经在做创作者会做的事
  · 4-7 天：肯定养成习惯，提个小升级
  · 8-30 天：当老朋友聊
  · 30+ 天：彼此认可，聊创作本身
- 如果是休息日：肯定他的节奏感（不是「休息也是为了更好出发」这种空话）
- 如果今天目标已达成：肯定 + 给点延伸思考
- 如果还差几条：自然 nudge，不催

仅返回这一句话，不要前缀 / 引号 / 解释。`;
  const data = await chatComplete({
    apiKey,
    messages: [{ role:'system', content:sys }, { role:'user', content:usr }],
    temperature: 0.95,
    max_tokens: 100,
  });
  return (data.choices?.[0]?.message?.content || '').trim().replace(/^["']|["']$/g, '');
}

// ============ 本地推送通知（仅 Capacitor 端可用，Web 走 Notification API 降级）============

export async function deepseekCoachReview({ apiKey, topic, transcript, durationSec, wpm, fillerTop, signal }) {
  const sys = '你是一位资深口播教练，帮自媒体创作者复盘短视频口播稿。冷静、具体、动作化反馈，不要客套、不要鸡汤。';
  const fillerLine = (fillerTop && fillerTop.length)
    ? fillerTop.slice(0, 5).map(f => `${f.word}×${f.count}`).join('、')
    : '基本没有明显口头禅';
  const usr = `话题：《${topic || '自由口播'}》
时长：${Math.round(durationSec)} 秒
语速：${wpm} 字/分（中文 200-260 为舒适区）
高频口头禅：${fillerLine}

【转录稿】
"""
${String(transcript).slice(0, 2400)}
"""

请严格按 JSON 返回（不要 markdown 代码块、不要解释）：
{
  "scores": { "hook": 整数 0-10, "logic": 整数 0-10, "filler": 整数 0-10, "ending": 整数 0-10, "pacing": 整数 0-10 },
  "summary": "30-50 字总评",
  "highlights": ["1-2 条最亮的具体细节（如可，引用一句原话）"],
  "suggestions": ["3-4 条立刻可改进的动作（≤20 字 / 条）"]
}

评分口径：
- hook：前 5 秒是否抓住人
- logic：观点是否清楚、有逻辑骨架（钩子/观点/论证/收尾）
- filler：口头禅越少分越高（已给统计）
- ending：收尾是否有 take-away 或 call-to-action
- pacing：语速是否合适（已给 wpm）

要求：
- suggestions 要具体到动作：「开头加一句钩子」/「少说'然后'」/「语速放慢 10%」
- 不要"加油 / 继续努力"这种空话
- 转录稿过短 / 无意义时，scores 全给 5，suggestions 提醒"先说够 60 秒再复盘"`;

  const data = await chatComplete({
    apiKey,
    messages: [{ role:'system', content:sys }, { role:'user', content:usr }],
    temperature: 0.4,
    max_tokens: 700,
    signal,
  });
  let out = (data.choices?.[0]?.message?.content || '').trim();
  out = out.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  const m = out.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('AI 输出非 JSON：' + out.slice(0, 200));
  return JSON.parse(m[0]);
}

// DeepSeek 60 秒剧本生成：给话题 → 钩子 + 论点 + 收尾完整稿

export async function deepseekGenerateScript({ apiKey, topic, durationSec = 60, style = '' }) {
  if (!topic?.trim()) throw new Error('请先填话题');
  const sys = '你是一位经验丰富的口播脚本撰稿人 · 给短视频博主写直接可读的稿子。冷静、有钩子、有真观点 · 不要鸡汤 · 不要客套 · 不要"大家好我是XXX"开头 · 不要"感谢观看"结尾。';
  const wordTarget = Math.round(durationSec * 4); // 中文口播约 200-260 字/分钟 · 用 240 估算
  const usr = `话题：《${topic}》
目标时长：${durationSec} 秒（约 ${wordTarget} 个汉字）
${style ? `风格：${style}` : ''}

请按"钩子 + 观点 + 论证 + 收尾"结构写一篇完整口播稿。

要求：
1. 直接给可逐字念的稿子 · 不要分段标题（不要写"钩子:"、"观点:"这种标签）
2. 钩子前 5 秒抓人：用反问 / 反常识 / 冲突 / 具体数字 · 不要寒暄
3. 观点鲜明 · 不和稀泥
4. 论证至少 1 个具体例子或细节
5. 收尾给一个 take-away 或 call-to-action · 不要"好了今天就分享到这里"
6. 极度口语化 · 写出来像真人说话 · 短句多 · 没"然后/就是/那个"
7. 总字数控制在 ${Math.round(wordTarget * 0.85)}-${Math.round(wordTarget * 1.1)} 之间

严格按 JSON 返回（不要 markdown 代码块）：
{
  "script": "完整稿子（可逐字读 · 段落之间用 \\n 转义换行 · JSON 字符串里不要出现真实换行）",
  "structure": ["4-5 个标签描述结构 · 如 '反常识开场' '观点' '案例' 'take-away'"]
}`;

  const data = await chatComplete({
    apiKey,
    messages: [{ role:'system', content:sys }, { role:'user', content:usr }],
    temperature: 0.85,
    max_tokens: 1000,
  });
  let out = (data.choices?.[0]?.message?.content || '').trim();
  out = out.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  const m = out.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('AI 输出非 JSON：' + out.slice(0, 200));
  try {
    return JSON.parse(m[0]);
  } catch {
    // 容错：模型有时在 JSON 字符串里放真实换行（JSON 里是非法控制字符）→ 转义后重试
    const escaped = m[0].replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
    return JSON.parse(escaped);
  }
}

// DeepSeek 主持人追问：根据对话历史 + 你刚说的话，生成下一个针对性问题

export async function deepseekHostFollowup({ apiKey, topic, history, lastUserSaid, kind = 'followup' }) {
  const sys = '你是一位资深播客主持人，正在跟嘉宾就某个话题做深度访谈。你的提问规则：(1) 紧扣嘉宾上一句话的具体内容，不要泛泛而谈。(2) 把嘉宾观点往深处推一层 —— 挖反例、挑动机、问感受、追溯源、问代价。(3) 一次只问一个问题，长度 10-25 字，要口语化、像真人主持。(4) 绝不客套和铺垫，直接开问。(5) 仅输出问题本身，不要解释、不要加引号。';
  const messages = [{ role: 'system', content: sys }];
  messages.push({ role: 'user', content: `本次访谈话题：《${topic}》` });
  // 历史对话（最近 10 轮）
  const trimmed = history.slice(-10);
  for (const t of trimmed) {
    messages.push({
      role: t.role === 'host' ? 'assistant' : 'user',
      content: t.text,
    });
  }
  if (lastUserSaid) {
    messages.push({ role: 'user', content: lastUserSaid });
  }
  const hint = kind === 'closing' ? '\n\n现在请你说一句收尾问题（让嘉宾用一句话总结今天的核心 take-away）。' : '\n\n现在请你提下一个追问。';
  messages.push({ role: 'user', content: '【内部提示，不要在问题中复读】' + hint });

  const data = await chatComplete({
    apiKey,
    messages,
    temperature: 0.85,
    max_tokens: 100,
  });
  let q = (data.choices?.[0]?.message?.content || '').trim();
  // 去掉常见噪音
  q = q.replace(/^["“'']+|["”'']+$/g, '').trim();
  q = q.replace(/^\d+\.\s*/, '');
  return q;
}

// ============ Settings Context ============
