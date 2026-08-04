export const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x.getTime(); };

export const dayKey = (ts) => {
  const d = new Date(ts || 0);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

export const groupByDay = (files) => {
  const m = {};
  files.forEach(f => { const k = dayKey(f.ts); m[k] = (m[k]||0) + 1; });
  return m;
};

// ============ 成长阶段（Growth Stage）============
// 第一性原理：用户的终态是「敢于面对镜头、敢于输出、敢于表达的人」。
// 这不是一蹴而就 · 是一条曲线。Stage 系统给这条曲线一个可见的形状 ——
// 让用户每次打开都知道「我在哪、下一步去哪、还差什么」。
//
// 口径刻意「最鼓励」：
//   - count 用全部录像数（不卡时长）· 录了 10 秒也是「开口了」· 不打击刚起步的人
//   - maxStreak 用「任何录像天」的最长连续（不要求达成每日 goal）· 成长不是考核
// 这跟首页打卡的 streak（要求达标）是两套口径 · 各司其职。

export const GROWTH_STAGES = [
  { name:'未启程',   emoji:'·',  gate:{count:0,   streak:0},  desc:'录下第一条 · 旅程就开始了' },
  { name:'破冰者',   emoji:'🎬', gate:{count:1,   streak:0},  desc:'你已经敢开口了 · 这一步最难' },
  { name:'开口者',   emoji:'💬', gate:{count:5,   streak:0},  desc:'开口正在变得不需要勇气' },
  { name:'习惯萌芽', emoji:'🌱', gate:{count:7,   streak:3},  desc:'训练正在变成你的本能' },
  { name:'稳定训练', emoji:'💪', gate:{count:20,  streak:7},  desc:'你有了自己的节奏' },
  { name:'表达者',   emoji:'⭐', gate:{count:50,  streak:14}, desc:'镜头前的你 · 松弛下来了' },
  { name:'创作者',   emoji:'👑', gate:{count:100, streak:14}, desc:'表达已经是你的一部分' },
];

// 历史最长连续天数（任何录像天 · 不要求达标）

export const computeMaxStreak = (files) => {
  const days = [...new Set((files || []).map(f => Math.floor(startOfDay(f.ts || 0) / 86400000)))]
    .filter(d => d > 0)  // 过滤缺失 ts 的脏数据（聚到 day 0）
    .sort((a, b) => a - b);
  if (days.length === 0) return 0;
  let max = 1, cur = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i] === days[i - 1] + 1) { cur++; if (cur > max) max = cur; }
    else cur = 1;
  }
  return max;
};

// 纯函数：(总录像数, 最长连续天) → { level, current, next, progress, need }

export const computeGrowthStage = (totalCount, maxStreak) => {
  let level = 0;
  for (let i = 0; i < GROWTH_STAGES.length; i++) {
    const g = GROWTH_STAGES[i].gate;
    if (totalCount >= g.count && maxStreak >= g.streak) level = i;
    else break;
  }
  const current = GROWTH_STAGES[level];
  const next = GROWTH_STAGES[level + 1] || null;
  if (!next) return { level, current, next: null, progress: 1, need: null };
  const g = next.gate;
  const countProg  = g.count  > 0 ? Math.min(1, totalCount / g.count)  : 1;
  const streakProg = g.streak > 0 ? Math.min(1, maxStreak / g.streak) : 1;
  const progress = Math.min(countProg, streakProg);
  // 「还差什么」选完成度最低的那个维度（更接近的先不催）
  const need = countProg <= streakProg
    ? { type: 'count',  remaining: Math.max(0, g.count  - totalCount) }
    : { type: 'streak', remaining: Math.max(0, g.streak - maxStreak) };
  return { level, current, next, progress, need };
};
// 前 7 天每天都有一句具体的话 · 不是空泛鸡汤 · 引用习惯科学的具体说法
// 设计原则：每个 day 的措辞针对当天最容易死的心理（无聊 / 自我怀疑 / 失去新鲜感）
// 触发条件：streak 在 1-7 范围 + 今天第一条达标录像

export const STREAK_DAY_MESSAGES = {
  1: { emoji:'🎬', color:'#A30236', title:'破冰了 · 这是今年最重要的 30 秒',
       body:'很多想做 IP 的人卡在 Day 1 · 你已经迈过去了。明天再来一条，习惯回路才算真开始。' },
  2: { emoji:'🌱', color:'#F1A23F', title:'Day 2 · 比 90% 想做 IP 的人多走了一天',
       body:'第二天最难。不是因为累，是因为「新鲜感」消失了。挺过去就是你的护城河。' },
  3: { emoji:'🔥', color:'#A30236', title:'Day 3 · streak 的第一个拐点',
       body:'行为科学：连续 3 天才算「开始」。从今天起你不是「试一试的人」，是「在做的人」。' },
  4: { emoji:'🧠', color:'#F1A23F', title:'Day 4 · 神经习惯回路开始成型',
       body:'大脑已经开始把「打开 app」编码进自动反应。今天不是凭意志力来的，是身体记住了。' },
  5: { emoji:'⚡', color:'#F1A23F', title:'Day 5 · 再 2 天解锁 streak 7',
       body:'走到 Day 5 的人已经在前 5%。能解锁 streak 7 的人更少 —— 那是「真习惯」的门槛。' },
  6: { emoji:'🎯', color:'#A30236', title:'Day 6 · 明天就是 streak 7',
       body:'一周连续训练 · 这是习惯学公认的拐点。明天解锁后你不再是新手。' },
  7: { emoji:'👑', color:'#10b981', title:'streak 7 · 你已经不是新手了',
       body:'从 Day 8 开始，「打开 app」会比「不打开」更舒服。这就是你建立的护城河。' },
};

// 测试函数：参数 (files, streak)
// 6 个核心徽章：1 个破冰 + 3 个连续 streak（早期/月/年）+ 2 个累计里程碑
// 设计原则：每个徽章对应一个真正能改变用户行为的拐点 · 多了反而稀释成就感

export const ACHIEVEMENTS = [
  { id:'first',     emoji:'🎬', name:'破冰',         desc:'录下第一条预演',     test:(f)=>f.length>=1 },
  { id:'streak3',   emoji:'🔥', name:'连续 3 天',    desc:'连续 3 天达成目标',  test:(_,s)=>s>=3 },
  { id:'streak7',   emoji:'⭐', name:'连续 7 天',    desc:'坚持一周 · 习惯萌芽', test:(_,s)=>s>=7 },
  { id:'streak30',  emoji:'👑', name:'连续 30 天',   desc:'坚持一个月 · 习惯成型', test:(_,s)=>s>=30 },
  { id:'total100',  emoji:'🏆', name:'录满 100 条',  desc:'已经是高频自媒体人', test:(f)=>f.length>=100 },
  { id:'total500',  emoji:'🥇', name:'录满 500 条',  desc:'你已是创作机器',     test:(f)=>f.length>=500 },
];

// 检测从 prev → next 新解锁的 ID

export const detectNewlyUnlocked = (prevUnlocked, currentUnlocked) => {
  const prevSet = new Set(prevUnlocked || []);
  return currentUnlocked.filter(id => !prevSet.has(id));
};

// 月历热力图：返回 4 周 × 7 天的格子 · 列对齐「日一二三四五六」表头

export const getHeatmapGrid = (files) => {
  const today = new Date();
  today.setHours(0,0,0,0);
  const dow = today.getDay(); // 0=Sun
  // 起点取「今天所在周的周日」再往前推 3 整周 → 每列真正对应表头的星期几
  // （原实现固定回退 27 天 · 只有今天恰好是周六时列才对得上）
  const start = new Date(today);
  start.setDate(start.getDate() - dow - 21);
  const totalCells = 28;
  const byDay = groupByDay(files);
  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = dayKey(d.getTime());
    cells.push({
      date: d,
      count: byDay[key] || 0,
      isToday: d.getTime() === today.getTime(),
      isFuture: d.getTime() > today.getTime(),
    });
  }
  return cells;
};

// 打卡目标编辑器

export const dateKeyToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

export const dateKeyTomorrow = () => {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

export const readTomorrowTopic = () => {
  try {
    const raw = localStorage.getItem('kobo.tomorrowTopic');
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj.topic !== 'string') return null;
    // 自动过期：forDate < today → 当作没设过
    if (obj.forDate < dateKeyToday()) {
      try { localStorage.removeItem('kobo.tomorrowTopic'); } catch {}
      return null;
    }
    return obj;
  } catch { return null; }
};

export const writeTomorrowTopic = (topic) => {
  try {
    localStorage.setItem('kobo.tomorrowTopic', JSON.stringify({
      topic: String(topic).trim().slice(0, 200),
      forDate: dateKeyTomorrow(),
    }));
  } catch {}
};

export const clearTomorrowTopic = () => {
  try { localStorage.removeItem('kobo.tomorrowTopic'); } catch {}
};

export const pickRecommendedPractice = (files = [], fallbackTopic = '') => {
  const recent = files.slice(0, 8);
  const hasFewSessions = files.length < 3;
  const weakByTag = recent.find(f => f.tag === 'redo');
  if (hasFewSessions) {
    return {
      mode: 'improv',
      label: '自由口播',
      topic: fallbackTopic || '只讲一个观点，把它讲清楚',
      reason: '先把开口习惯建起来；结构可以在嘴巴打开之后再补。',
      focus: '开场句',
    };
  }
  if (weakByTag) {
    return {
      mode: 'teleprompter',
      label: '稿件复刻',
      topic: weakByTag.label || weakByTag.topic || fallbackTopic || '把一段成熟稿子讲得更自然',
      reason: '最近有标记为重练的录像，适合回炉再打一遍。',
      focus: '自然表达',
    };
  }
  return {
    mode: 'host',
    label: '主持追问',
    topic: fallbackTopic || '被追问时不丢掉主线',
    reason: '你已经有练习记录了，可以加一点即时追问压力。',
    focus: '稳住结构',
  };
};

export const getRecentPracticeItems = (files = []) => files.slice(0, 5).map(file => {
  const tagLabel = file.tag === 'star' ? '高光'
    : file.tag === 'redo' ? '待重录'
    : file.tag === 'published' ? '已发布'
    : '本地';
  return {
    filename: file.filename,
    title: file.label || file.topic || file.filename || '未命名练习',
    detail: `${Math.round(file.duration || 0)}s · ${tagLabel}`,
    date: file.ts ? new Date(file.ts).toLocaleDateString('zh-CN') : '本地',
    tag: file.tag || null,
  };
});
