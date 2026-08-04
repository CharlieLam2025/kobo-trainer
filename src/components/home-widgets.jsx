import { Btn, Card } from './ui.jsx';
import { startOfDay, dayKey } from '../lib/home-data.jsx';
import { useState, useMemo } from '../react-hooks.jsx';

export const GoalEditor = ({ goal, onSave, onClose }) => {
  const [count, setCount] = useState(goal.count);
  const [dur, setDur] = useState(goal.durationSec);
  return (
    <div className="absolute inset-0 z-[60] bg-stone-950/70 flex items-center justify-center px-5" onClick={onClose}>
      <Card className="w-full max-w-sm p-5 fade-in" onClick={e => e.stopPropagation()}>
        <h3 className="font-display font-bold text-stone-900 text-[16px] mb-3 flex items-center gap-2">
          <span>🎯</span>设置每日打卡目标
        </h3>
        <p className="text-xs text-stone-500 leading-relaxed mb-4">
          每天录满 <span className="font-bold text-[#A30236]">{count}</span> 条 ≥ <span className="font-bold text-[#A30236]">{dur}s</span> 的口播，就算今日完成。<br/>
          连续达成会累加"连续天数"打卡。
        </p>
        <div className="space-y-3">
          <div>
            <div className="text-xs text-stone-700 mb-1.5">每天几条</div>
            <div className="flex gap-1">
              {[1, 2, 3, 5, 8].map(n => (
                <button key={n} onClick={() => setCount(n)}
                  className={`flex-1 py-2 text-sm font-semibold transition-colors ${count === n ? 'bg-[#A30236] text-white' : 'bg-stone-100 text-stone-700'}`}
                  style={{borderRadius:'2px'}}>{n}</button>
              ))}
              <input type="number" min="1" max="20" value={count} onChange={e => setCount(Math.max(1, Math.min(20, +e.target.value || 1)))}
                className="w-14 px-2 py-2 border border-stone-300 text-center text-sm" style={{borderRadius:'2px'}} />
            </div>
          </div>
          <div>
            <div className="text-xs text-stone-700 mb-1.5">每条至少多少秒</div>
            <div className="flex gap-1 mb-2">
              {[30, 60, 90, 180].map(n => (
                <button key={n} onClick={() => setDur(n)}
                  className={`flex-1 py-2 text-sm font-semibold transition-colors ${dur === n ? 'bg-[#A30236] text-white' : 'bg-stone-100 text-stone-700'}`}
                  style={{borderRadius:'2px'}}>{n}s</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="number" min="5" max="600" value={dur} onChange={e => setDur(Math.max(5, Math.min(600, +e.target.value || 5)))}
                className="flex-1 px-3 py-2 border border-stone-300 text-sm" style={{borderRadius:'2px'}} />
              <span className="text-sm text-stone-500">秒</span>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Btn variant="ghost" onClick={onClose}>取消</Btn>
          <Btn variant="primary" onClick={() => onSave({ count, durationSec: dur })}>保存</Btn>
        </div>
      </Card>
    </div>
  );
};

// 每周复盘

export const WeeklyRecapModal = ({ onClose, files }) => {
  const stats = useMemo(() => {
    const today0 = startOfDay(new Date());
    const thisWeekStart = today0 - 6 * 86400000; // 包含今天往前 7 天
    const lastWeekStart = thisWeekStart - 7 * 86400000;
    const thisWeek = files.filter(f => (f.ts||0) >= thisWeekStart && (f.ts||0) < thisWeekStart + 7*86400000).length;
    const lastWeek = files.filter(f => (f.ts||0) >= lastWeekStart && (f.ts||0) < lastWeekStart + 7*86400000).length;
    const activeDays = new Set(files.filter(f => (f.ts||0) >= thisWeekStart).map(f => dayKey(f.ts))).size;
    const r1 = new Date(thisWeekStart), r2 = new Date(today0);
    const weekRange = `${r1.getMonth()+1}/${r1.getDate()} — ${r2.getMonth()+1}/${r2.getDate()}`;
    return {
      thisWeek, lastWeek, diff: thisWeek - lastWeek,
      activeDaysThisWeek: activeDays, allTime: files.length,
      weekRange,
    };
  }, [files]);

  return (
    <div className="absolute inset-0 z-[80] bg-stone-950/70 flex items-center justify-center px-5" onClick={onClose}>
      <Card className="w-full max-w-sm p-5 fade-in" onClick={e => e.stopPropagation()}>
        <h3 className="font-display font-bold text-stone-900 text-[18px] mb-1 flex items-center gap-2">
          <span>📅</span>本周复盘
        </h3>
        <p className="text-[11px] text-stone-500 mb-4">{stats.weekRange}</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="border border-stone-200 p-3" style={{borderRadius:'3px'}}>
            <div className="font-display font-bold text-[#A30236] text-3xl tabular-nums leading-none">{stats.thisWeek}</div>
            <div className="text-[10px] tracking-[0.16em] uppercase text-stone-500 mt-1.5 font-semibold">本周预演</div>
          </div>
          <div className="border border-stone-200 p-3" style={{borderRadius:'3px'}}>
            <div className={`font-display font-bold text-3xl tabular-nums leading-none ${stats.diff > 0 ? 'text-emerald-600' : stats.diff < 0 ? 'text-amber-600' : 'text-stone-900'}`}>
              {stats.diff > 0 ? '+' : ''}{stats.diff}
            </div>
            <div className="text-[10px] tracking-[0.16em] uppercase text-stone-500 mt-1.5 font-semibold">相比上周</div>
          </div>
        </div>
        <div className="bg-stone-50 px-3 py-3 text-[12px] text-stone-700 leading-relaxed mb-3" style={{borderRadius:'2px'}}>
          {stats.diff > 0
            ? <>💪 这周你比上周多录了 <span className="font-bold text-emerald-700">{stats.diff}</span> 条 · 节奏在加快</>
            : stats.diff === 0
              ? <>✓ 跟上周一样的节奏 · 稳</>
              : <>🙂 比上周少了 {Math.abs(stats.diff)} 条 · 下周一起再追回来</>}
        </div>
        <div className="text-[11px] text-stone-600 leading-relaxed mb-4 space-y-0.5">
          <div>· 本周 <span className="font-bold">{stats.activeDaysThisWeek}</span> 天有预演</div>
          <div>· 累计 <span className="font-bold">{stats.allTime}</span> 条 · 第一性原理：每开口一次，离镜头自然就近一步</div>
        </div>
        <Btn variant="primary" className="w-full" onClick={onClose}>继续加油 →</Btn>
      </Card>
    </div>
  );
};

// 「明天的话题」localStorage helper · 形态 { topic: string, forDate: 'YYYY-MM-DD' }
