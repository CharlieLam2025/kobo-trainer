import { KOBO_NATIVE } from '../native.jsx';

export const NOTIFICATION_ID = 7777;

export const NOTIFICATION_BODIES = [
  '60 秒预演一条 · 今天就完成',
  '镜头前再讲一遍 · 别让今天空着',
  '一条预演 · 给今天的你一个交代',
  '今天没开口吗？1 分钟搞定',
  '🔥 别断 streak · 今天来一条',
];

// 5 个 routine anchor · BJ Fogg 的「After I [既有动作], I will [新习惯]」recipe
// 绑了 anchor 的习惯存活率是没绑的 4 倍（Lally 2010 习惯形成研究）
// hour/minute = 这个 anchor 默认的通知时间建议 · 用户能在设置里覆盖
// bodies = 这个 anchor 专属的通知文案 · 跟「刚做完那件事」对话 · 比泛泛的「该开口了」强 10 倍

export const ROUTINE_ANCHORS = [
  { id:'morning_coffee', emoji:'☕', label:'喝完早咖啡', hour:9,  minute:0,  bodies:[
    '咖啡喝完了吗？30 秒讲一条 · 接住今天的清醒',
    '早咖啡 ✓ · 顺手 30 秒预演 · 一气呵成',
    '今天的第一口下肚了 · 第一条预演也安排上',
  ]},
  { id:'after_brush', emoji:'🪥', label:'刷完牙之后', hour:8,  minute:0,  bodies:[
    '刚刷完牙吧？30 秒预演 · 起床即开口',
    '牙刷完了 · 嗓子也该唤醒了 · 来 30 秒',
  ]},
  { id:'commute', emoji:'🚇', label:'通勤路上', hour:8,  minute:30, bodies:[
    '通勤路上有空？纯语音 30 秒 · 不开摄像头',
    '坐稳了？30 秒预演 · 比刷短视频值得',
    '通勤这 30 分钟 · 抽 30 秒给自己',
  ]},
  { id:'lunch_break', emoji:'🍱', label:'午饭后', hour:13, minute:30, bodies:[
    '吃饱了想躺？给自己 30 秒 · 再躺',
    '午饭 ✓ · 顺道把今天的预演了结了',
  ]},
  { id:'before_bed', emoji:'🌙', label:'睡前', hour:22, minute:0,  bodies:[
    '今天还差一条预演 · 30 秒 · 然后睡',
    '睡前最后一件事 · 30 秒讲一条 · 今天就完整了',
  ]},
];

export const getRoutineAnchor = (id) => ROUTINE_ANCHORS.find(a => a.id === id) || null;

export async function scheduleDailyReminder({ hour = 19, minute = 0, enabled = true, anchorId = null }) {
  const LN = KOBO_NATIVE?.isNative ? KOBO_NATIVE.LocalNotifications : null;
  // Web fallback：用浏览器 Notification API（限制大 · 仅页面打开时有效）
  if (!LN) {
    if (!enabled) return { ok:true, reason:'disabled' };  // 关闭提醒不需要弹权限
    if (typeof Notification === 'undefined') return { ok:false, reason:'no_support' };
    if (Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch {}
    }
    // 用户拒绝授权时如实返回失败 · 避免设置页显示「已开启」但永远收不到
    if (Notification.permission !== 'granted') return { ok:false, reason:'permission_denied' };
    return { ok:true, reason: 'web_limited' };
  }
  try {
    // 取消之前的（7 天轮换文案占用 NOTIFICATION_ID ~ NOTIFICATION_ID+6）
    await LN.cancel({ notifications: Array.from({ length: 7 }, (_, i) => ({ id: NOTIFICATION_ID + i })) });
    if (!enabled) return { ok:true, reason:'disabled' };
    // 请求权限
    const perm = await LN.requestPermissions();
    if (perm.display !== 'granted') return { ok:false, reason:'permission_denied' };
    // 调度每日重复 · 如果绑了 anchor 用 anchor 专属文案 · 否则用泛用文案
    // 文案轮换：repeating 通知的 body 在调度时就冻结了 → 改为按天轮换文案，
    // 一次排未来 7 天（App 每次启动都会重新调度，所以 7 天窗口足够滚动下去）
    const anchor = anchorId ? getRoutineAnchor(anchorId) : null;
    const pool = (anchor && anchor.bodies && anchor.bodies.length) ? anchor.bodies : NOTIFICATION_BODIES;
    const now = new Date();
    const startOffset = Math.floor(Math.random() * pool.length);
    const notifications = [];
    for (let day = 0; day < 7; day++) {
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, hour, minute, 0, 0);
      if (at <= now) continue; // 今天的时间点已过 → 从明天开始
      notifications.push({
        id: NOTIFICATION_ID + day,
        title: '🎙️ 口播练习器',
        body: pool[(startOffset + day) % pool.length],
        schedule: { at, allowWhileIdle: true },
        smallIcon: 'ic_stat_icon_config_sample',
        sound: null,
      });
    }
    await LN.schedule({ notifications });
    return { ok:true, reason:'scheduled' };
  } catch (e) {
    return { ok:false, reason: 'error', error: e?.message || String(e) };
  }
}

export async function cancelDailyReminder() {
  const LN = KOBO_NATIVE?.isNative ? KOBO_NATIVE.LocalNotifications : null;
  if (!LN) return;
  try { await LN.cancel({ notifications: Array.from({ length: 7 }, (_, i) => ({ id: NOTIFICATION_ID + i })) }); } catch {}
}

// ============ 口播分析（本地，零成本）============
// 中文口头禅词表（按字符数从长到短，避免 "就是" 被算两次而 "就" 又算）
