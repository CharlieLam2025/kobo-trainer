import { cx } from '../components/ui.jsx';

export const POSTER_FONT = '"PingFang SC", "Microsoft YaHei", "Source Han Sans CN", "Noto Sans CJK SC", system-ui, sans-serif';

// 文字按宽度自动换行 · 返回每行 text

export function wrapText(ctx, text, maxWidth) {
  if (!text) return [];
  const lines = [];
  let cur = '';
  for (const ch of String(text)) {
    const test = cur + ch;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = ch;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function drawRoundedRect(ctx, x, y, w, h, r, fillStyle) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fillStyle) { ctx.fillStyle = fillStyle; ctx.fill(); }
}

// 渲染月度战报海报 · 把当月统计画成可分享图

export async function renderMonthlyReportPoster({ files = [], achievements = [], restDays = [], dailyGoal, month }) {
  const W = 1080, H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 计算当月统计
  const targetDate = month || new Date();
  const year = targetDate.getFullYear();
  const mo = targetDate.getMonth();
  const monthStart = new Date(year, mo, 1).getTime();
  const monthEnd = new Date(year, mo + 1, 1).getTime();
  const monthFiles = files.filter(f => (f.ts || 0) >= monthStart && (f.ts || 0) < monthEnd);

  const minDur = (dailyGoal?.durationSec || 0) * 0.8;
  const qualifyingByDay = {};
  for (const f of monthFiles) {
    const d = new Date(f.ts);
    const dk = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
    if (!qualifyingByDay[dk]) qualifyingByDay[dk] = 0;
    if ((f.duration || 0) >= minDur) qualifyingByDay[dk]++;
  }
  const goalCount = dailyGoal?.count || 3;
  const restSet = new Set(restDays || []);
  const activeDays = Object.keys(qualifyingByDay).length;
  const metDays = Object.values(qualifyingByDay).filter(c => c >= goalCount).length;
  const stars = monthFiles.filter(f => f.tag === 'star').length;
  const totalDur = monthFiles.reduce((s, f) => s + (f.duration || 0), 0);
  // streak 计算（当月最长连续 streak）
  let maxStreak = 0, curStreak = 0;
  const daysInMonth = new Date(year, mo + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dk = `${year}-${mo+1}-${d}`;
    const isMet = (qualifyingByDay[dk] || 0) >= goalCount;
    const isRest = restSet.has(dk) || restSet.has(`${year}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
    if (isMet || isRest) {
      curStreak++;
      maxStreak = Math.max(maxStreak, curStreak);
    } else if (new Date(year, mo, d).getTime() > Date.now()) {
      // 未来日期不算
    } else {
      curStreak = 0;
    }
  }

  // ===== Background gradient =====
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#A30236');
  grad.addColorStop(1, '#6E001E');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 280);
  ctx.fillStyle = '#FAFAF9';
  ctx.fillRect(0, 280, W, H - 280);

  // ===== Header =====
  ctx.textAlign = 'left';
  ctx.font = `bold 42px ${POSTER_FONT}`;
  ctx.fillStyle = '#fff';
  ctx.fillText('🎙️ 我的口播月报', 60, 110);
  ctx.font = `28px ${POSTER_FONT}`;
  ctx.fillStyle = '#ffffffcc';
  ctx.fillText(`${year} 年 ${mo + 1} 月 · ${activeDays} 天活跃 / ${metDays} 天达标`, 60, 160);

  // ===== Hero numbers (3 cards) =====
  const heroY = 220;
  const cardW = (W - 180) / 3;
  const stats = [
    { num: monthFiles.length, lbl: '条预演',   color: '#A30236' },
    { num: maxStreak,         lbl: '天连续',   color: '#F1A23F' },
    { num: stars,             lbl: '⭐ 高光', color: '#10b981' },
  ];
  stats.forEach((s, i) => {
    const x = 60 + (cardW + 30) * i;
    drawRoundedRect(ctx, x, heroY, cardW, 220, 16, '#fff');
    ctx.strokeStyle = '#e7e5e4';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = `bold 96px ${POSTER_FONT}`;
    ctx.fillStyle = s.color;
    ctx.fillText(String(s.num), x + cardW / 2, heroY + 130);
    ctx.font = `26px ${POSTER_FONT}`;
    ctx.fillStyle = '#78716c';
    ctx.fillText(s.lbl, x + cardW / 2, heroY + 180);
  });

  // ===== Heatmap =====
  let y = 510;
  ctx.textAlign = 'left';
  ctx.font = `bold 30px ${POSTER_FONT}`;
  ctx.fillStyle = '#1c1917';
  ctx.fillText('📅 本月活跃热力图', 60, y);
  y += 30;

  // 月份方格（7 列 · 行数 = ceil(daysInMonth / 7) + 起始偏移）
  const firstDow = new Date(year, mo, 1).getDay();
  const totalCells = firstDow + daysInMonth;
  const rows = Math.ceil(totalCells / 7);
  const cellSize = (W - 180) / 7;
  const heatY = y + 20;

  // 星期标签
  ['日','一','二','三','四','五','六'].forEach((d, i) => {
    ctx.font = `20px ${POSTER_FONT}`;
    ctx.fillStyle = '#a8a29e';
    ctx.textAlign = 'center';
    ctx.fillText(d, 60 + cellSize * i + cellSize / 2, heatY - 8);
  });

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 7; c++) {
      const cellIdx = r * 7 + c;
      const dayNum = cellIdx - firstDow + 1;
      const cx = 60 + c * cellSize;
      const cy = heatY + r * cellSize;
      if (dayNum < 1 || dayNum > daysInMonth) continue;
      const dk = `${year}-${mo+1}-${dayNum}`;
      const count = qualifyingByDay[dk] || 0;
      const isRest = restSet.has(dk) || restSet.has(`${year}-${String(mo+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`);
      let bg, txtColor;
      if (isRest) { bg = '#7dd3fc'; txtColor = '#0c4a6e'; }
      else if (count === 0) { bg = '#f5f5f4'; txtColor = '#a8a29e'; }
      else if (count <= 2) { bg = '#FBEFF2'; txtColor = '#A30236'; }
      else if (count <= 5) { bg = '#EEA5B4'; txtColor = '#fff'; }
      else { bg = '#A30236'; txtColor = '#fff'; }
      drawRoundedRect(ctx, cx + 4, cy + 4, cellSize - 8, cellSize - 8, 8, bg);
      ctx.font = `bold 28px ${POSTER_FONT}`;
      ctx.fillStyle = txtColor;
      ctx.textAlign = 'center';
      ctx.fillText(String(dayNum), cx + cellSize / 2, cy + cellSize / 2 + 8);
      if (count > 0 && !isRest) {
        ctx.font = `16px ${POSTER_FONT}`;
        ctx.fillText(`×${count}`, cx + cellSize / 2, cy + cellSize / 2 + 30);
      }
      if (isRest) {
        ctx.font = `18px ${POSTER_FONT}`;
        ctx.fillText('💤', cx + cellSize / 2, cy + cellSize / 2 + 30);
      }
    }
  }
  y = heatY + rows * cellSize + 30;

  // ===== Badges =====
  if (achievements.length > 0) {
    ctx.textAlign = 'left';
    ctx.font = `bold 30px ${POSTER_FONT}`;
    ctx.fillStyle = '#1c1917';
    ctx.fillText(`🎉 解锁徽章 · ${achievements.length} 个`, 60, y);
    y += 40;
    const topBadges = achievements.slice(0, 6);
    const bw = (W - 180) / 6;
    topBadges.forEach((a, i) => {
      const x = 60 + (bw + 4) * i;
      drawRoundedRect(ctx, x, y, bw, 130, 10, '#FBEFF2');
      ctx.strokeStyle = '#A30236';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.font = `52px ${POSTER_FONT}`;
      ctx.fillStyle = '#000';
      ctx.fillText(a.emoji || '🏆', x + bw / 2, y + 70);
      ctx.font = `18px ${POSTER_FONT}`;
      ctx.fillStyle = '#A30236';
      // 名称如果太长截断
      let name = a.name || '';
      if (ctx.measureText(name).width > bw - 10) {
        while (ctx.measureText(name + '...').width > bw - 10 && name.length > 1) name = name.slice(0, -1);
        name = name + '...';
      }
      ctx.fillText(name, x + bw / 2, y + 110);
    });
    y += 150;
  }

  // ===== 总时长 + 平均 =====
  const totalMin = Math.round(totalDur / 60);
  const avgPerSession = monthFiles.length > 0 ? Math.round(totalDur / monthFiles.length) : 0;
  ctx.textAlign = 'left';
  ctx.font = `bold 26px ${POSTER_FONT}`;
  ctx.fillStyle = '#78716c';
  ctx.fillText(`总练习时长 ${totalMin} 分钟 · 平均每条 ${avgPerSession} 秒`, 60, y + 20);

  // ===== Footer =====
  const footerY = H - 100;
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(0, footerY, W, 100);
  ctx.textAlign = 'center';
  ctx.font = `bold 28px ${POSTER_FONT}`;
  ctx.fillStyle = '#fff';
  ctx.fillText('🎙️ 口播练习器 · 我的成长印记', W / 2, footerY + 42);
  ctx.font = `22px ${POSTER_FONT}`;
  ctx.fillStyle = '#a8a29e';
  ctx.fillText('github.com/CharlieLam2025/kobo-trainer', W / 2, footerY + 78);

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/png', 0.92);
  });
}

// 海报分享 Modal
