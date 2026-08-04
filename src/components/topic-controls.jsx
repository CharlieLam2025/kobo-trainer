import { Icon } from './icons.jsx';
import { useSettings } from '../settings-context.jsx';
import { findTopicSourceKey } from '../lib/topic-pools.jsx';
import { useMemo } from '../react-hooks.jsx';
import { normalizeTopicPreferences } from '../topic-preferences.mjs';

export const TopicPreferenceControls = ({ topic, sourceKey, onHide, compact = false }) => {
  const settings = useSettings();
  const preferences = useMemo(
    () => normalizeTopicPreferences(settings.topicPreferences),
    [settings.topicPreferences]
  );
  if (!topic) return null;
  const interested = preferences.interestedTopics.includes(topic);
  const favorite = preferences.favoriteTopics.includes(topic);
  const update = (action) => settings.changeTopicPreference?.({
    topic,
    sourceKey: sourceKey || findTopicSourceKey(topic),
    action,
  });

  const base = compact
    ? 'min-h-9 px-2 text-[11px]'
    : 'min-h-10 px-3 text-[12px]';

  return (
    <div className={`grid grid-cols-3 gap-1.5 ${compact ? 'mt-3' : 'mt-4'}`} aria-label="选题偏好">
      <button
        type="button"
        aria-pressed={interested}
        onClick={() => update('interested')}
        className={`${base} border flex items-center justify-center gap-1.5 font-bold transition-colors ${
          interested ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-stone-200 bg-white text-stone-600 hover:border-emerald-400'
        }`}
        style={{borderRadius:'3px'}}
      >
        <Icon name="check" size={13} strokeWidth={2}/>{interested ? '已想聊' : '想聊'}
      </button>
      <button
        type="button"
        onClick={() => { update('hide'); onHide?.(); }}
        className={`${base} border border-stone-200 bg-white text-stone-500 hover:border-[#A30236] hover:text-[#A30236] flex items-center justify-center gap-1.5 font-bold transition-colors`}
        style={{borderRadius:'3px'}}
      >
        <Icon name="close" size={12} strokeWidth={2}/>不感兴趣
      </button>
      <button
        type="button"
        aria-pressed={favorite}
        onClick={() => update('favorite')}
        className={`${base} border flex items-center justify-center gap-1.5 font-bold transition-colors ${
          favorite ? 'border-[#A30236] bg-[#FBEFF2] text-[#A30236]' : 'border-stone-200 bg-white text-stone-600 hover:border-[#A30236]'
        }`}
        style={{borderRadius:'3px'}}
      >
        <Icon name="heart" size={13} strokeWidth={favorite ? 2.2 : 1.7}/>{favorite ? '已收藏' : '收藏'}
      </button>
    </div>
  );
};
