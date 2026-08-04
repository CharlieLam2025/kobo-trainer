export const FILLER_WORDS = ['我觉得吧', '我觉得', '所以说', '怎么说呢', '然后呢', '反正', '其实', '那个', '这个', '就是', '然后', '所以', '呃', '嗯', '啊'];

// 中文按字算 wpm（去掉空格 + 标点）

export function calculateWPM(text, durationSec) {
  if (!text || !durationSec || durationSec < 1) return 0;
  const chars = String(text).replace(/[\s\p{P}]/gu, '').length;
  return Math.round((chars / durationSec) * 60);
}

// 口头禅出现次数（带去重保护：长词先匹配，匹配过的字符替换掉）

export function analyzeFillerWords(text) {
  if (!text) return [];
  let t = String(text);
  const out = [];
  for (const w of FILLER_WORDS) {
    const re = new RegExp(w, 'g');
    const m = t.match(re) || [];
    if (m.length > 0) {
      out.push({ word: w, count: m.length });
      // 把已匹配的位置替换为占位（避免 "就是" 被 "就" 二次匹配）
      t = t.replace(re, '·'.repeat(w.length));
    }
  }
  return out.sort((a, b) => b.count - a.count);
}

export function wpmBand(wpm) {
  if (wpm < 180) return { label:'偏慢', color:'#A0775B' };
  if (wpm > 320) return { label:'偏快', color:'#A30236' };
  if (wpm > 260) return { label:'紧凑', color:'#F1A23F' };
  return { label:'舒适', color:'#10b981' };
}

export function buildNextTakeFocus(transcript, durationSec = 0) {
  const text = String(transcript || '').trim();
  if (durationSec > 0 && durationSec < 20) {
    return '下一遍先讲满 30 秒：一句观点、一个例子、一句结论。';
  }
  if (text.length < 15) {
    return '下一遍只守住三句话：先给结论，再讲原因，最后留一句收尾。';
  }

  const fillers = analyzeFillerWords(text);
  const filler = fillers[0];
  const fillerTotal = fillers.reduce((sum, item) => sum + item.count, 0);
  if (filler && fillerTotal >= 3) {
    return `下一遍只盯住少说“${filler.word}”，想接话时停半秒。`;
  }

  const wpm = calculateWPM(text, durationSec);
  if (wpm > 320) return '下一遍整体放慢 10%，每讲完一个观点停半秒。';
  if (wpm > 0 && wpm < 180) return '下一遍把语速提一点，第一句直接说结论，不做铺垫。';

  const firstSentence = text.split(/[。！？!?\n]/)[0].trim();
  if (firstSentence.length > 24) {
    return '下一遍把第一句压到 15 个字左右，先抛冲突或明确结论。';
  }
  return '下一遍保留主体，只把开头换成一个更明确的冲突或结论。';
}

// DeepSeek 教练复盘：基于转录稿给 5 维评分 + 改进建议
