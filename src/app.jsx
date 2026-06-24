import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { LocalNotifications } from '@capacitor/local-notifications';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

// 启动信号：bundle.js 一旦被浏览器执行就立刻置 true
// （boot 诊断用这个区分「bundle 没下载到」vs「下载了但渲染挂掉」）
window.__KOBO_BOOTED = true;

const KOBO_NATIVE = (() => {
  const cap = window.Capacitor || Capacitor;
  const isNative = !!cap?.isNativePlatform?.();
  if (isNative) {
    const target = window.Capacitor || cap;
    target.Plugins = {
      ...(target.Plugins || {}),
      Filesystem,
      LocalNotifications,
      SpeechRecognition,
    };
    window.Capacitor = target;
  }
  window.KOBO_NATIVE = { Capacitor: cap, Filesystem, Directory, LocalNotifications, SpeechRecognition, isNative };
  return window.KOBO_NATIVE;
})();

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ============ ICON SET (RANEPA outline style) ============
// 24×24 viewBox, 1.75 stroke, rounded caps — institutional outline look.
const ICON_PATHS = {
  home:     <><path d="M3 11l9-8 9 8"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/></>,
  dice:     <><rect x="4" y="4" width="16" height="16" rx="2.5"/><circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r="1.3" fill="currentColor" stroke="none"/></>,
  document: <><path d="M6.5 3h8l4 4v14h-12z"/><path d="M14.5 3v4h4"/><path d="M9 12h7M9 15.5h7M9 19h4"/></>,
  mic:      <><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0"/><path d="M12 18v3M9 21h6"/></>,
  book:     <><path d="M3 5h7a3 3 0 013 3v12a2 2 0 00-2-2H3z"/><path d="M21 5h-7a3 3 0 00-3 3v12a2 2 0 012-2h8z"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 01-3 3l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 01-3-3l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 013-3l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 013 3l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"/></>,
  arrow:    <><path d="M5 12h14M13 6l6 6-6 6"/></>,
  chevron:  <path d="M9 6l6 6-6 6"/>,
  clock:    <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  sparkle:  <><path d="M12 3l1.6 4.6L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.4z"/><path d="M19 14l.7 2 2 .7-2 .8L19 19l-.8-2-2-.7 2-.8z"/></>,
  play:     <><circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l5.5-3.5z" fill="currentColor" stroke="none"/></>,
  rec:      <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/></>,
  refresh:  <><path d="M3.5 12a8.5 8.5 0 0114.5-6L20.5 8"/><path d="M20.5 3.5V8h-4.5"/><path d="M20.5 12a8.5 8.5 0 01-14.5 6L3.5 16"/><path d="M3.5 20.5V16H8"/></>,
  check:    <path d="M5 12.5l4.5 4.5L19 7"/>,
  close:    <path d="M6 6l12 12M6 18L18 6"/>,
  shield:   <><path d="M12 3l8 3v6c0 4.5-3.4 8.4-8 9-4.6-.6-8-4.5-8-9V6z"/><path d="M9 12.5l2 2 4-4"/></>,
  target:   <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/></>,
  list:     <><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.3" fill="currentColor" stroke="none"/></>,
  edit:     <><path d="M16 3.5l4.5 4.5L8.5 20H4v-4.5z"/><path d="M14 5.5l4.5 4.5"/></>,
  flame:    <><path d="M12 21c-4 0-7-2.7-7-7 0-3 2-5 3-6 0 2 2 3 2 3 0-4 2-6 3-8 0 5 6 6 6 11 0 4-3 7-7 7z"/><path d="M12 21c-2 0-3.5-1.5-3.5-3.5 0-1.5 1-2.5 2-3 0 1 1 1.5 1 1.5 0-2 1-3 2-4 0 2.5 2 3 2 5.5 0 2-1.5 3.5-3.5 3.5z"/></>,
  bolt:     <path d="M13 3L4 14h7l-1 7 9-11h-7z"/>,
  folder:   <><path d="M3 6.5A1.5 1.5 0 014.5 5h4.7L11 7h8.5A1.5 1.5 0 0121 8.5V18a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 18z"/></>,
  download: <><path d="M12 3v13M6 11l6 6 6-6M4 21h16"/></>,
  trash:    <><path d="M4 7h16M9 7V4h6v3M6 7v13a1 1 0 001 1h10a1 1 0 001-1V7M10 11v7M14 11v7"/></>,
  live:     <><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/><path d="M8.5 8.5a5 5 0 010 7"/><path d="M15.5 8.5a5 5 0 010 7"/><path d="M5.5 5.5a9 9 0 010 13"/><path d="M18.5 5.5a9 9 0 010 13"/></>,
  heart:    <path d="M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z"/>,
  gift:     <><path d="M20 12v9H4v-9"/><path d="M2 7h20v5H2z"/><path d="M12 21V7M12 7s-1-4-3.5-4S5 4.5 5 6s2.5 1 7 1M12 7s1-4 3.5-4S19 4.5 19 6s-2.5 1-7 1"/></>,
};

const Icon = ({ name, size = 20, strokeWidth = 1.75, className = '', style = {} }) => {
  const paths = ICON_PATHS[name];
  if (!paths) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style} aria-hidden="true">
      {paths}
    </svg>
  );
};

// ===== iOS Device Frame (inlined) =====

// iOS.jsx — Simplified iOS 26 (Liquid Glass) device frame
// Based on the iOS 26 UI Kit + Figma status bar spec. No assets, no deps.
// Exports: IOSDevice, IOSStatusBar, IOSNavBar, IOSGlassPill, IOSList, IOSListRow, IOSKeyboard

// ─────────────────────────────────────────────────────────────
// Status bar
// ─────────────────────────────────────────────────────────────
function IOSStatusBar({ dark = false, time = '9:41' }) {
  const c = dark ? '#fff' : '#000';
  return (
    <div style={{
      display: 'flex', gap: 154, alignItems: 'center', justifyContent: 'center',
      padding: '21px 24px 19px', boxSizing: 'border-box',
      position: 'relative', zIndex: 20, width: '100%',
    }}>
      <div style={{ flex: 1, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 1.5 }}>
        <span style={{
          fontFamily: '-apple-system, "SF Pro", system-ui', fontWeight: 590,
          fontSize: 17, lineHeight: '22px', color: c,
        }}>{time}</span>
      </div>
      <div style={{ flex: 1, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, paddingTop: 1, paddingRight: 1 }}>
        <svg width="19" height="12" viewBox="0 0 19 12">
          <rect x="0" y="7.5" width="3.2" height="4.5" rx="0.7" fill={c}/>
          <rect x="4.8" y="5" width="3.2" height="7" rx="0.7" fill={c}/>
          <rect x="9.6" y="2.5" width="3.2" height="9.5" rx="0.7" fill={c}/>
          <rect x="14.4" y="0" width="3.2" height="12" rx="0.7" fill={c}/>
        </svg>
        <svg width="17" height="12" viewBox="0 0 17 12">
          <path d="M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z" fill={c}/>
          <path d="M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z" fill={c}/>
          <circle cx="8.5" cy="10.5" r="1.5" fill={c}/>
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke={c} strokeOpacity="0.35" fill="none"/>
          <rect x="2" y="2" width="20" height="9" rx="2" fill={c}/>
          <path d="M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z" fill={c} fillOpacity="0.4"/>
        </svg>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Liquid glass pill — blur + tint + shine
// ─────────────────────────────────────────────────────────────
function IOSGlassPill({ children, dark = false, style = {} }) {
  return (
    <div style={{
      height: 44, minWidth: 44, borderRadius: 9999,
      position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: dark
        ? '0 2px 6px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.2)'
        : '0 1px 3px rgba(0,0,0,0.07), 0 3px 10px rgba(0,0,0,0.06)',
      ...style,
    }}>
      {/* blur + tint */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 9999,
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        background: dark ? 'rgba(120,120,128,0.28)' : 'rgba(255,255,255,0.5)',
      }} />
      {/* shine */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 9999,
        boxShadow: dark
          ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15), inset -1px -1px 1px rgba(255,255,255,0.08)'
          : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
        border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)',
      }} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', padding: '0 4px' }}>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Navigation bar — glass pills + large title
// ─────────────────────────────────────────────────────────────
function IOSNavBar({ title = 'Title', dark = false, trailingIcon = true }) {
  const muted = dark ? 'rgba(255,255,255,0.6)' : '#404040';
  const text = dark ? '#fff' : '#000';
  const pillIcon = (content) => (
    <IOSGlassPill dark={dark}>
      <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {content}
      </div>
    </IOSGlassPill>
  );
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 10,
      paddingTop: 62, paddingBottom: 10, position: 'relative', zIndex: 5,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
      }}>
        {/* back chevron */}
        {pillIcon(
          <svg width="12" height="20" viewBox="0 0 12 20" fill="none" style={{ marginLeft: -1 }}>
            <path d="M10 2L2 10l8 8" stroke={muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        {/* trailing ellipsis */}
        {trailingIcon && pillIcon(
          <svg width="22" height="6" viewBox="0 0 22 6">
            <circle cx="3" cy="3" r="2.5" fill={muted}/>
            <circle cx="11" cy="3" r="2.5" fill={muted}/>
            <circle cx="19" cy="3" r="2.5" fill={muted}/>
          </svg>
        )}
      </div>
      {/* large title */}
      <div style={{
        padding: '0 16px',
        fontFamily: '-apple-system, system-ui',
        fontSize: 34, fontWeight: 700, lineHeight: '41px',
        color: text, letterSpacing: 0.4,
      }}>{title}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Grouped list (inset card, r:26) + row (52px)
// ─────────────────────────────────────────────────────────────
function IOSListRow({ title, detail, icon, chevron = true, isLast = false, dark = false }) {
  const text = dark ? '#fff' : '#000';
  const sec = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const ter = dark ? 'rgba(235,235,245,0.3)' : 'rgba(60,60,67,0.3)';
  const sep = dark ? 'rgba(84,84,88,0.65)' : 'rgba(60,60,67,0.12)';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', minHeight: 52,
      padding: '0 16px', position: 'relative',
      fontFamily: '-apple-system, system-ui', fontSize: 17,
      letterSpacing: -0.43,
    }}>
      {icon && (
        <div style={{
          width: 30, height: 30, borderRadius: 7, background: icon,
          marginRight: 12, flexShrink: 0,
        }} />
      )}
      <div style={{ flex: 1, color: text }}>{title}</div>
      {detail && <span style={{ color: sec, marginRight: 6 }}>{detail}</span>}
      {chevron && (
        <svg width="8" height="14" viewBox="0 0 8 14" style={{ flexShrink: 0 }}>
          <path d="M1 1l6 6-6 6" stroke={ter} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {!isLast && (
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          left: icon ? 58 : 16, height: 0.5, background: sep,
        }} />
      )}
    </div>
  );
}

function IOSList({ header, children, dark = false }) {
  const hc = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const bg = dark ? '#1C1C1E' : '#fff';
  return (
    <div>
      {header && (
        <div style={{
          fontFamily: '-apple-system, system-ui', fontSize: 13,
          color: hc, textTransform: 'uppercase',
          padding: '8px 36px 6px', letterSpacing: -0.08,
        }}>{header}</div>
      )}
      <div style={{
        background: bg, borderRadius: 26,
        margin: '0 16px', overflow: 'hidden',
      }}>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Device frame
// ─────────────────────────────────────────────────────────────
function IOSDevice({
  children, width = 402, height = 874, dark = false,
  title, keyboard = false,
}) {
  return (
    <div style={{
      width, height, borderRadius: 48, overflow: 'hidden',
      position: 'relative', background: dark ? '#000' : '#F2F2F7',
      boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
      fontFamily: '-apple-system, system-ui, sans-serif',
      WebkitFontSmoothing: 'antialiased',
    }}>
      {/* dynamic island */}
      <div style={{
        position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
        width: 126, height: 37, borderRadius: 24, background: '#000', zIndex: 50,
      }} />
      {/* status bar (absolute) */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <IOSStatusBar dark={dark} />
      </div>
      {/* nav + content */}
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {title !== undefined && <IOSNavBar title={title} dark={dark} />}
        <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
        {keyboard && <IOSKeyboard dark={dark} />}
      </div>
      {/* home indicator — always on top */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 60,
        height: 34, display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
        paddingBottom: 8, pointerEvents: 'none',
      }}>
        <div style={{
          width: 139, height: 5, borderRadius: 100,
          background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)',
        }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Keyboard — iOS 26 liquid glass
// ─────────────────────────────────────────────────────────────
function IOSKeyboard({ dark = false }) {
  const glyph = dark ? 'rgba(255,255,255,0.7)' : '#595959';
  const sugg = dark ? 'rgba(255,255,255,0.6)' : '#333';
  const keyBg = dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.85)';

  // special-key icons
  const icons = {
    shift: <svg width="19" height="17" viewBox="0 0 19 17"><path d="M9.5 1L1 9.5h4.5V16h8V9.5H18L9.5 1z" fill={glyph}/></svg>,
    del: <svg width="23" height="17" viewBox="0 0 23 17"><path d="M7 1h13a2 2 0 012 2v11a2 2 0 01-2 2H7l-6-7.5L7 1z" fill="none" stroke={glyph} strokeWidth="1.6" strokeLinejoin="round"/><path d="M10 5l7 7M17 5l-7 7" stroke={glyph} strokeWidth="1.6" strokeLinecap="round"/></svg>,
    ret: <svg width="20" height="14" viewBox="0 0 20 14"><path d="M18 1v6H4m0 0l4-4M4 7l4 4" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  };

  const key = (content, { w, flex, ret, fs = 25, k } = {}) => (
    <div key={k} style={{
      height: 42, borderRadius: 8.5,
      flex: flex ? 1 : undefined, width: w, minWidth: 0,
      background: ret ? '#08f' : keyBg,
      boxShadow: '0 1px 0 rgba(0,0,0,0.075)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system, "SF Compact", system-ui',
      fontSize: fs, fontWeight: 458, color: ret ? '#fff' : glyph,
    }}>{content}</div>
  );

  const row = (keys, pad = 0) => (
    <div style={{ display: 'flex', gap: 6.5, justifyContent: 'center', padding: `0 ${pad}px` }}>
      {keys.map(l => key(l, { flex: true, k: l }))}
    </div>
  );

  return (
    <div style={{
      position: 'relative', zIndex: 15, borderRadius: 27, overflow: 'hidden',
      padding: '11px 0 2px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      boxShadow: dark
        ? '0 -2px 20px rgba(0,0,0,0.09)'
        : '0 -1px 6px rgba(0,0,0,0.018), 0 -3px 20px rgba(0,0,0,0.012)',
    }}>
      {/* liquid glass bg — same recipe as nav pills */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 27,
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        background: dark ? 'rgba(120,120,128,0.14)' : 'rgba(255,255,255,0.25)',
      }} />
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 27,
        boxShadow: dark
          ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15)'
          : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
        border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)',
        pointerEvents: 'none',
      }} />

      {/* autocorrect bar */}
      <div style={{
        display: 'flex', gap: 20, alignItems: 'center',
        padding: '8px 22px 13px', width: '100%', boxSizing: 'border-box',
        position: 'relative',
      }}>
        {['"The"', 'the', 'to'].map((w, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div style={{ width: 1, height: 25, background: '#ccc', opacity: 0.3 }} />}
            <div style={{
              flex: 1, textAlign: 'center',
              fontFamily: '-apple-system, system-ui', fontSize: 17,
              color: sugg, letterSpacing: -0.43, lineHeight: '22px',
            }}>{w}</div>
          </React.Fragment>
        ))}
      </div>

      {/* key layout */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 13,
        padding: '0 6.5px', width: '100%', boxSizing: 'border-box',
        position: 'relative',
      }}>
        {row(['q','w','e','r','t','y','u','i','o','p'])}
        {row(['a','s','d','f','g','h','j','k','l'], 20)}
        <div style={{ display: 'flex', gap: 14.25, alignItems: 'center' }}>
          {key(icons.shift, { w: 45, k: 'shift' })}
          <div style={{ display: 'flex', gap: 6.5, flex: 1 }}>
            {['z','x','c','v','b','n','m'].map(l => key(l, { flex: true, k: l }))}
          </div>
          {key(icons.del, { w: 45, k: 'del' })}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {key('ABC', { w: 92.25, fs: 18, k: 'abc' })}
          {key('', { flex: true, k: 'space' })}
          {key(icons.ret, { w: 92.25, ret: true, k: 'ret' })}
        </div>
      </div>

      {/* bottom spacer (emoji+mic area, icons omitted) */}
      <div style={{ height: 56, width: '100%', position: 'relative' }} />
    </div>
  );
}

Object.assign(window, {
  IOSDevice, IOSStatusBar, IOSNavBar, IOSGlassPill, IOSList, IOSListRow, IOSKeyboard,
});

// ===== end iOS frame =====


// ============ 数据：用户的 5 个长期议题 ============
const ISSUES = {
  '夺回主权': {
    accent: 'amber',
    blurb: '把人生的方向盘从"应该"手里拿回来',
    topics: [
      '为什么我不再追求"早起"',
      '我不再做时间管理，反而更高效了',
      '我删掉了所有打卡 App，发生了什么',
      '一个 35 岁的人决定从头开始，可怕吗',
      '"自由职业"这个词我已经不再用了',
      '为什么我不再追求"自律"',
      '当所有人都在做副业时，我选择只做主业',
      '我不再用 OKR 之后',
      '为什么"按计划生活"是一种新的奴役',
      '辞职这件事我想了 3 年，做了 30 秒',
    ],
  },
  '选择论': {
    accent: 'orange',
    blurb: '选择大于努力 —— 但你怎么选',
    topics: [
      '我做过最重要的一个职业决定',
      '为什么有些人努力一辈子还是穷',
      '不要在错的赛道上拼命',
      '我用一个问题筛掉了 90% 的机会',
      '选择 > 努力 × 100',
      '如何识别一条值得走的路',
      '什么时候该坚持，什么时候该转身',
      '20 岁、30 岁、40 岁该如何做选择',
      '为什么"多选项"反而让人更穷',
      '我不再做"看起来对"的事',
    ],
  },
  '真实即护城河': {
    accent: 'rose',
    blurb: 'AI 时代，真实是稀缺品',
    topics: [
      '为什么 AI 时代"真实"反而值钱',
      '我不再追求"专业感"',
      '把缺点直接说出来，会发生什么',
      '人设崩塌的本质是不真实',
      '为什么大家越来越喜欢不完美的博主',
      '"装"的成本越来越高',
      '真实需要勇气，但回报巨大',
      '我曾经包装自己，现在我不',
      '为什么真实比聪明更稀缺',
      '"完美"是这个时代最便宜的东西',
    ],
  },
  'AI时代的人味': {
    accent: 'sky',
    blurb: '技术爆发时代，什么是不可替代的',
    topics: [
      'AI 写得比我好，我为什么还在写',
      '什么是 AI 永远学不会的',
      '当 AI 越来越像人，人该怎么办',
      '我用 AI 一年的真实感受',
      '为什么"人味"成了奢侈品',
      'AI 能复制经验，但不能复制经历',
      '在 AI 时代，"慢"反而是种优势',
      '我不害怕被 AI 替代，因为...',
      'AI 帮我节省的 4 小时，我用来做了什么',
      '当 AI 能写一切，写作还有意义吗',
    ],
  },
  '稳定内核': {
    accent: 'emerald',
    blurb: '风浪再大，自己的核不能晃',
    topics: [
      '如何在不确定的时代保持稳定',
      '为什么我每天都要做一件"无用"的事',
      '一个人的内核来自哪里',
      '我的"反脆弱"清单',
      '当所有人都焦虑时，我在做什么',
      '怎么不被外界的声音裹挟',
      '稳定不是不动，而是有锚',
      '我建立内核的 3 个习惯',
      '为什么我不再追"风口"',
      '一个能让你 30 分钟内回到中心的方法',
    ],
  },
};

// ============ 小红书爆款选题：来自 dbs-xhs-title 公式结构，不冒充实时热榜 ============
const XHS_HOT_TOPICS = [
  `为什么你越努力越没内容`,
  `别再发流水账了`,
  `普通人做小红书最容易犯的 3 个错`,
  `为什么真实感比专业感更值钱`,
  `小红书上这 3 件事千万别做`,
  `为什么你的笔记没人收藏`,
  `为什么涨粉后更容易焦虑`,
  `新人起号最危险的 3 个动作`,
  `你以为在分享 其实在自嗨`,
  `会赚钱的博主不会告诉你的建议`,
  `为什么越精致越没人信`,
  `别再模仿大博主了`,
  `为什么你的标题没有停留感`,
  `普通人最该放弃的内容幻想`,
  `为什么小红书不需要完美人设`,
  `你发不出来的根本原因`,
  `怎么把日常讲得有价值`,
  `为什么干货越多越没人看`,
  `3 个让人想评论的开头`,
  `你的选题太安全了吗`,
  `为什么低谷故事更容易被记住`,
  `别再追热点 先追痛点`,
  `新手博主最该练的不是剪辑`,
  `如何把失败讲成内容资产`,
  `为什么越想变现越难变现`,
  `小红书起号头 7 天做什么`,
  `如何把 1 个观点讲出 3 层`,
  `为什么你的内容没有人味`,
  `普通人做账号的最大谎言`,
  `别再写教程 先写共鸣`,
  `你到底要不要立人设`,
  `焦虑型博主的 5 个信号`,
  `为什么评论区比正文更重要`,
  `你的账号像不像朋友圈`,
  `如何让陌生人相信你`,
  `为什么越垂直越自由`,
  `小红书笔记没人看的最快方法`,
  `别再把标题写成结论`,
  `为什么你需要一个反对观点`,
  `从 0 到 1 最该拍什么`,
  `什么内容最容易被收藏`,
  `如何把普通经历讲出反差`,
  `为什么你的故事没有钩子`,
  `新手千万别做的 3 类选题`,
  `给镜头害羞博主的一个忠告`,
  `你敢不敢测测账号定位`,
  `为什么做账号先要暴露缺点`,
  `你的内容像不像客服话术`,
  `如何把一句废话改成观点`,
  `为什么你不敢表达立场`,
  `普通人涨粉的最根本原因`,
  `别再寻找万能爆款公式`,
  `为什么好内容先让人不舒服`,
  `小红书封面重要还是标题重要`,
  `你是不是把观众想太聪明了`,
  `如何把抱怨讲成洞察`,
  `为什么你的复盘没人想看`,
  `从一条差评里挖选题`,
  `普通人最有价值的 3 种经历`,
  `别再把账号做成简历`,
];

// ============ 通用话题类型 ============
const TOPIC_TYPES = {
  '小红书爆款': {
    accent: 'rose',
    blurb: '反常识、避坑、身份代入、评论区话题',
    topics: XHS_HOT_TOPICS,
  },
  '人生哲学': {
    accent: 'stone',
    blurb: '活法、意义、选择、生死',
    topics: [
      `你怕死吗`,
      `人生有意义吗`,
      `活着是为了什么`,
      `你信命吗`,
      `成功的标准是什么`,
      `你想活成什么样`,
      `普通人这辈子最大的奢侈是什么`,
      `如果只剩 5 年命你会做什么`,
      `幸福是什么`,
      `你最大的恐惧是什么`,
      `活着是因为还有希望吗`,
      `你为谁而活`,
      `人有自由意志吗`,
      `努力真的能改变命运吗`,
      `你认为运气重要还是努力重要`,
      `低谷期怎么熬过来的`,
      `你有过一无所有的时刻吗`,
      `什么时刻你觉得自己活明白了`,
      `你后悔过哪个选择`,
      `人为什么要结婚`,
      `人为什么要工作`,
      `一个人最理想的生活是什么样`,
      `你相信轮回吗`,
      `你信因果吗`,
      `你认为善有善报吗`,
      `人会变好还是变坏`,
      `你 25 岁、35 岁分别在想什么`,
      `你能接受一辈子平庸吗`,
      `野心和欲望的区别`,
      `认命是放弃还是和解`,
      `你认为人生是设计出来的还是走出来的`,
      `所谓阅历 真的有用吗`,
      `成熟是什么样子`,
      `你害怕变成大人吗`,
      `变老最难接受的是什么`,
      `你愿意活到 100 岁吗`,
      `你怎么定义"活过"`,
      `回头看 你成了你讨厌的人吗`,
      `什么时候你开始觉得人生是自己的`,
      `给 20 岁的自己一句忠告`,
      `给 60 岁的自己一句忠告`,
      `你最骄傲的人生决定是什么`,
      `你最遗憾的人生决定是什么`,
      `如果重来一次你会改什么`,
      `你能接受死前没活出自己吗`,
      `人生需要计划吗`,
      `计划永远赶不上变化怎么办`,
      `活在当下真的可能吗`,
      `你愿意为信仰付出多少`,
      `人为什么需要意义`,
      `无聊和痛苦你选哪个`,
      `活着的责任在自己还是父母`,
      `你能接受平淡一生吗`,
      `你能接受没结婚没生孩子吗`,
      `一辈子和一个人 vs 一辈子换很多人`,
      `人为什么要追求自由`,
      `真正的自由是什么`,
      `你认为自己是怎样的人`,
      `人有第二次机会吗`,
      `人能跨越阶层吗`,
      `你会重读自己 5 年前写的话吗`,
      `人生需要复盘吗`,
      `失败是必修课吗`,
      `你失败过几次`,
      `你怕被遗忘吗`,
      `你想被人怎么记住`,
      `墓志铭你想写什么`,
      `离开这个世界你想留下什么`,
      `你信不信"一切都是最好的安排"`,
      `人为什么要追求意义`,
      `虚度时间是浪费还是奢侈`,
      `慢一点真的更幸福吗`,
      `你认为最好的年龄是几岁`,
      `你害怕错过什么`,
      `所谓"觉醒"是真的还是包装`,
      `你怎么看"躺平"`,
      `你怎么看"卷"`,
      `你想要被需要还是不被打扰`,
      `人为什么需要爱`,
    ],
  },
  '价值观': {
    accent: 'amber',
    blurb: '对错、善恶、坚持与让步',
    topics: [
      `诚实和善良哪个更重要`,
      `为家人放弃梦想合理吗`,
      `你能接受朋友撒谎吗`,
      `原则可以变通吗`,
      `报恩重要还是报仇重要`,
      `你信"好人有好报"吗`,
      `善良需要带锋芒吗`,
      `吃亏是福吗`,
      `你愿意为陌生人付出多少`,
      `善良是天生的还是养成的`,
      `道德感强的人是不是过得很累`,
      `你能为爱说谎吗`,
      `对错有标准吗`,
      `你能接受双标吗`,
      `站队是必须的吗`,
      `沉默是不是同谋`,
      `你会为正义出头吗`,
      `你怕得罪人吗`,
      `你能容忍朋友的缺点到什么程度`,
      `你信任人吗`,
      `你认为忠诚重要吗`,
      `友情比爱情重要吗`,
      `感情和利益冲突时你选什么`,
      `你能为面子做多少事`,
      `面子重要还是里子重要`,
      `你怎么看"扮猪吃老虎"`,
      `你会算计别人吗`,
      `人善被人欺是真的吗`,
      `你怎么看"老实人吃亏"`,
      `你认为善良需要回报吗`,
      `道德绑架你怎么应对`,
      `你怎么看"以德报怨"`,
      `宽容和软弱的边界在哪`,
      `原谅是给自己的还是给对方的`,
      `你能原谅伤害过你的人吗`,
      `复仇值得吗`,
      `报复是低级的吗`,
      `你怎么看"杀人偿命"`,
      `底线是什么`,
      `你的底线是什么`,
      `什么是不能背叛的`,
      `你怎么看背叛`,
      `背叛之后还能做朋友吗`,
      `你做过对不起人的事吗`,
      `撒谎是必要的吗`,
      `你撒过最大的谎`,
      `你能接受被骗吗`,
      `你信"为你好"吗`,
      `好心办坏事你怎么看`,
      `勇敢和鲁莽的区别`,
      `骨气重要还是适应重要`,
      `你怎么看"识时务者为俊杰"`,
      `随波逐流是错的吗`,
      `你愿意做众矢之的吗`,
      `你会顶撞权威吗`,
      `你怎么看"枪打出头鸟"`,
      `枪打出头鸟和"挺身而出"该选哪个`,
      `你做事先想后果还是先做`,
      `你怕承担责任吗`,
      `逃避有用吗`,
      `人需要勇敢吗`,
      `怯懦能被原谅吗`,
      `你怎么看"知行合一"`,
      `嘴上一套行动一套你怎么看`,
      `人前一套人后一套你能接受吗`,
      `虚伪是必要的吗`,
      `客套是真诚还是浪费`,
      `你怎么看"对事不对人"`,
      `你能就事论事吗`,
      `以怨报德你做得到吗`,
      `你能放下吗`,
    ],
  },
  '道德困境': {
    accent: 'red',
    blurb: '两难选择、思想实验',
    topics: [
      `电车难题你会怎么选`,
      `捡到 10 万块钱怎么办`,
      `室友偷东西你举报吗`,
      `知道朋友出轨告诉 ta 老婆吗`,
      `父母得了重病要不要瞒着`,
      `遇到欺骗弱者的事你会管吗`,
      `救陌生人 vs 救自己宠物`,
      `陌生人和家人只能救一个`,
      `目睹同事造假你会举报吗`,
      `发现领导贪污你怎么办`,
      `遇到家暴你会报警吗`,
      `看到孩子被打你管不管`,
      `看到老人摔倒你扶吗`,
      `你会让座给老人吗`,
      `给乞讨者钱算善良吗`,
      `假装看不见算冷漠吗`,
      `你会为生病的家人去借钱吗`,
      `你能接受卖房给家人看病吗`,
      `为了救父母你愿意放弃事业吗`,
      `为了救陌生人你愿意冒生命危险吗`,
      `医生说没救了 你撒谎吗`,
      `你能告知绝症真相吗`,
      `安乐死该合法化吗`,
      `你支持安乐死吗`,
      `代孕该合法吗`,
      `买卖器官该合法吗`,
      `克隆人该被允许吗`,
      `基因编辑该被允许吗`,
      `AI 该有人权吗`,
      `机器人该交税吗`,
      `无人驾驶撞人责任在谁`,
      `算法歧视谁负责`,
      `你能接受 AI 决定你生死吗`,
      `法律和良心冲突时你选哪个`,
      `法不容情对吗`,
      `原谅杀人犯可以吗`,
      `死刑该废除吗`,
      `宁可错杀不可放过 对吗`,
      `严刑能解决犯罪吗`,
      `以暴制暴可以吗`,
      `你认为最大的恶是什么`,
      `人之初性本善还是本恶`,
      `一个孩子犯错该由谁负责`,
      `原生家庭的过错可以抹掉吗`,
      `富人有义务帮穷人吗`,
      `贫富差距是必然的吗`,
      `你认为公平是什么`,
      `结果公平 vs 机会公平`,
      `保护少数人 vs 多数人利益`,
      `利益冲突时选少数还是多数`,
      `你能接受为大局牺牲个人吗`,
      `为了集体你能放弃多少`,
      `集体主义和个人主义你选哪个`,
      `面对不公你会沉默吗`,
      `沉默是默许吗`,
      `旁观者有罪吗`,
      `网暴中你站哪边`,
      `你 doxx 过别人吗`,
      `曝光私生活算不算暴力`,
      `言论自由有边界吗`,
      `你支持审查制度吗`,
      `你会举报朋友违法吗`,
      `你帮过的人后来害你 你后悔吗`,
      `报恩的人后来害你 你怎么办`,
      `背叛朋友救家人 你能做吗`,
      `为父母而活 vs 为自己而活`,
      `你能为爱犯法吗`,
      `为孩子犯法可以吗`,
      `保护弱者要不要不择手段`,
      `以暴制暴可以原谅吗`,
      `偷救命药 你支持吗`,
    ],
  },
  '社会议题': {
    accent: 'rose',
    blurb: '热门时代议题，每个人都能站队',
    topics: [
      `996 是奋斗还是剥削`,
      `35 岁危机是真的吗`,
      `学历内卷怎么破`,
      `寒门难出贵子吗`,
      `阶层会固化吗`,
      `婚姻还有必要吗`,
      `结婚是恋爱的终点吗`,
      `彩礼合理吗`,
      `离婚冷静期合理吗`,
      `单身税合理吗`,
      `你支持取消彩礼吗`,
      `你支持丁克吗`,
      `催婚催生你怎么应对`,
      `女性是不是必须结婚生孩子`,
      `女性该不该全职带娃`,
      `男人该带娃吗`,
      `男女平等真的实现了吗`,
      `女权和田园女权区别在哪`,
      `为什么大家越来越不想结婚`,
      `为什么大家不敢生孩子`,
      `低生育率是问题吗`,
      `二胎三胎该不该鼓励`,
      `要不要给生孩子补贴`,
      `彩礼陪嫁谁该出`,
      `重男轻女还存在吗`,
      `你被重男轻女过吗`,
      `你会重男轻女吗`,
      `姓氏冠夫姓你接受吗`,
      `孩子跟谁姓有那么重要吗`,
      `离婚谁带孩子最好`,
      `离婚率高是好事还是坏事`,
      `为什么大家不再相信爱情`,
      `相亲是不是太市侩了`,
      `门当户对重要吗`,
      `闪婚靠谱吗`,
      `网恋靠谱吗`,
      `AI 取代你的工作怎么办`,
      `AI 会让普通人失业吗`,
      `AI 会有意识吗`,
      `你愿意跟 AI 谈恋爱吗`,
      `AI 创作算不算抄袭`,
      `AI 写的文章算原创吗`,
      `短视频毁了一代人吗`,
      `直播带货是骗局吗`,
      `网红是真职业吗`,
      `你愿意做网红吗`,
      `名校情结合理吗`,
      `学区房值得吗`,
      `鸡娃有用吗`,
      `双减是好事还是坏事`,
      `补课该禁吗`,
      `应试教育该改吗`,
      `素质教育是骗局吗`,
      `内卷的根源是什么`,
      `为什么大学生越来越焦虑`,
      `985 211 还有用吗`,
      `考公考编是退路还是正路`,
      `体制内 vs 体制外`,
      `铁饭碗值得追吗`,
      `离开北上广是失败吗`,
      `回老家躺平算不算认输`,
      `北漂值得吗`,
      `大城市的孤独 vs 小城市的窒息`,
      `你愿意做新一线吗`,
      `年轻人为什么不愿上班`,
      `打工人这个词为什么火`,
      `延迟退休你怎么看`,
      `养老靠谁`,
      `啃老可耻吗`,
      `父母给买房合理吗`,
      `房价还会涨吗`,
      `买房还是租房`,
      `年轻人买不起房 是谁的错`,
      `贷款 30 年值得吗`,
      `彩礼买房 谁出谁有权`,
      `两性消费 谁该多付`,
      `女性养家男性带娃 你接受吗`,
      `男主外女主内还合理吗`,
      `大男子主义是不是过时了`,
      `女性该不该化妆`,
      `女性该不该穿短裙`,
      `身材焦虑从哪来`,
      `颜值经济是好事吗`,
      `整容是变美还是变假`,
      `美颜软件是不是骗局`,
      `体重歧视存在吗`,
      `胖瘦是个人选择吗`,
      `你怎么看素人爆红`,
      `流量明星该不该被批判`,
      `网络暴力该如何治理`,
      `匿名是不是助长恶`,
      `你会"挂人"吗`,
      `网络断舍离需要吗`,
      `大数据杀熟你遇到过吗`,
      `隐私换便利你接受吗`,
      `你怕被算法操控吗`,
      `信息茧房是真的吗`,
      `热搜还可信吗`,
      `谣言为什么传得快`,
      `吃瓜是不是消遣`,
      `你怎么看明星塌房`,
      `偶像崇拜是好事吗`,
      `粉丝经济伤害了什么`,
      `为什么大家爱看八卦`,
    ],
  },
  '时代与代际': {
    accent: 'orange',
    blurb: '80 90 00 后代沟、时代变迁',
    topics: [
      `你怎么看 00 后整顿职场`,
      `00 后真的不内卷吗`,
      `90 后是被时代抛弃的一代吗`,
      `80 后是夹心层吗`,
      `70 后过得最好吗`,
      `和父母最大的代沟是什么`,
      `给父母讲新事物你累过吗`,
      `父母用智能手机你帮过几次`,
      `你怎么看父母的朋友圈`,
      `父母刷短视频你担心吗`,
      `你愿意接父母同住吗`,
      `和父母三观不合怎么办`,
      `隔代育儿是帮忙还是麻烦`,
      `长辈逼婚你怎么应对`,
      `长辈的"为你好"是真的为你好吗`,
      `你怎么看催婚`,
      `家族群里的政治正确你受得了吗`,
      `你看红色家庭剧吗`,
      `回老家有种窒息感吗`,
      `回老家被拷问过哪些问题`,
      `离老家越远越自由吗`,
      `你想念家乡的什么`,
      `离开家乡值得吗`,
      `想家最深的一刻`,
      `00 后整顿职场是真的吗`,
      `你愿意躺平吗`,
      `你怎么看"佛系"`,
      `是不是这一代特别脆弱`,
      `年轻人不结婚不生育是堕落吗`,
      `为什么年轻人不敢谈恋爱`,
      `为什么大家越来越爱独处`,
      `你怎么看搭子社交`,
      `AA 制是冷漠还是清爽`,
      `请客和被请的边界感`,
      `你怎么看人情债`,
      `人情社会有什么好处`,
      `熟人社会 vs 陌生人社会`,
      `你更怀念哪个年代`,
      `你认为最好的时代是什么时候`,
      `怀旧是不是没出息`,
      `我们是否过得比父母更幸福`,
      `你比父母 35 岁时富有吗`,
      `你比父母 35 岁时快乐吗`,
      `下一代会比我们好吗`,
      `你想生活在哪个年代`,
      `你认为这一代年轻人最大的特点`,
      `这一代年轻人有信仰吗`,
      `信仰可以是钱吗`,
      `消费主义陷阱你跳过吗`,
      `你被广告骗过吗`,
      `直播间冲动消费你后悔过吗`,
      `断舍离真的能让人快乐吗`,
      `极简主义是真的极简吗`,
      `你怎么看精致穷`,
      `穷讲究 vs 富节俭`,
      `为什么大家在小红书装富`,
      `装精致是不是一种焦虑`,
      `为什么大家爱拍 vlog`,
      `刷小红书让你焦虑吗`,
      `短视频让人变笨吗`,
      `你戒掉过短视频吗`,
      `刷手机你最多刷过几小时`,
      `信息过载你怎么应对`,
      `数字断食可能吗`,
      `AI 时代普通人怎么办`,
      `AI 让你更焦虑了吗`,
      `你最怕被 AI 取代什么`,
      `AI 让你更幸福了吗`,
    ],
  },
  '自我认知': {
    accent: 'sky',
    blurb: '我是谁、我害怕什么、我想成为什么',
    topics: [
      `你最讨厌自己什么`,
      `你最骄傲自己什么`,
      `你最大的优点是什么`,
      `你最大的缺点是什么`,
      `你的核心特质是什么`,
      `你最像谁`,
      `你跟父母最像的地方`,
      `你最不像父母的地方`,
      `你的理想型是什么样的人`,
      `你最欣赏什么样的人`,
      `你最看不上什么样的人`,
      `你和谁绝交过`,
      `你被讨厌过吗`,
      `你害怕被讨厌吗`,
      `你害怕不被需要吗`,
      `你害怕孤独吗`,
      `你享受孤独吗`,
      `你能一个人吃饭一年吗`,
      `你能一个人旅行吗`,
      `一个人看电影你接受吗`,
      `你的安全感来自哪`,
      `你怕变化吗`,
      `你怕承诺吗`,
      `你害怕承诺的本质是什么`,
      `你害怕亲密吗`,
      `你害怕失去吗`,
      `你失去过最重要的什么`,
      `你最大的执念是什么`,
      `你的执念让你成长还是消耗`,
      `你做过最叛逆的事`,
      `你最叛逆的年纪几岁`,
      `你最听话的时候在干什么`,
      `你怎么定义自己`,
      `你的身份认同是什么`,
      `你认同自己的家乡吗`,
      `你为家乡骄傲吗`,
      `你为家庭骄傲吗`,
      `你为自己骄傲吗`,
      `你最近一次哭是因为什么`,
      `你多久没大哭一场了`,
      `你多久没大笑一场了`,
      `你的快乐阈值高吗`,
      `你容易满足吗`,
      `你贪心吗`,
      `你欲望强吗`,
      `你能压抑欲望吗`,
      `你认为自己自律吗`,
      `你认为自律是必要的吗`,
      `你戒掉过什么坏习惯`,
      `你戒掉的最难的是什么`,
      `你坚持过最久的是什么`,
      `你三天热度过几件事`,
      `你做事情容易半途而废吗`,
      `为什么开始难 坚持更难`,
      `你害怕开始还是害怕结束`,
      `你能优雅地告别吗`,
      `你和谁不再联系了 是为什么`,
      `你删过谁的微信`,
      `你 block 过谁`,
      `你拉黑的标准是什么`,
      `你是慢热还是热情`,
      `你在新环境的适应方式`,
      `你认识新朋友难吗`,
      `你想交什么样的朋友`,
      `你能跟陌生人聊半小时吗`,
      `你害羞吗`,
      `你内向还是外向`,
      `内向是缺点吗`,
      `你被误解过吗 最深的一次`,
      `你被低估过吗`,
      `你被高估过吗`,
      `你想被理解吗`,
      `你认为没人懂你吗`,
      `你想被看见还是想藏起来`,
      `你害怕被看穿吗`,
      `你装过吗`,
      `你装过最像的是什么`,
      `你的人设是什么`,
      `人设崩塌怕不怕`,
      `你愿意做真实的自己吗`,
      `真实的自己是什么样`,
      `你和理想中的自己差多远`,
      `你为什么没成为想成为的人`,
      `是什么让你停下来`,
      `你最近一次为自己骄傲是什么`,
      `你的"高光时刻"是什么`,
      `你的低谷是什么`,
      `你怎么走出低谷`,
    ],
  },
  '焦虑与情绪': {
    accent: 'violet',
    blurb: '内心戏、情绪管理、emo 时刻',
    topics: [
      `最近一次崩溃是因为什么`,
      `你 emo 时做什么`,
      `你怎么自我安慰`,
      `你跟朋友倾诉吗`,
      `你信心理咨询吗`,
      `你看过心理医生吗`,
      `你认为抑郁是病吗`,
      `你身边有人抑郁吗`,
      `你能识别情绪吗`,
      `你压抑情绪到几岁`,
      `你哭着睡着过吗`,
      `你独自难过过多久`,
      `你假装快乐过吗`,
      `你笑着哭过吗`,
      `你最近一次失眠是因为什么`,
      `你怎么应对失眠`,
      `你的情绪稳定吗`,
      `你认为情绪稳定是好事吗`,
      `你能管理愤怒吗`,
      `你愤怒时会做什么`,
      `你大哭一场有用吗`,
      `你认为眼泪是软弱吗`,
      `你认为示弱是软弱吗`,
      `你会求助吗`,
      `你怕麻烦别人吗`,
      `你怕欠人情吗`,
      `你接受别人的帮助吗`,
      `你善于拒绝吗`,
      `你不会拒绝的代价是什么`,
      `取悦型人格你有吗`,
      `你迎合过谁`,
      `你为别人改变过多少`,
      `你被 PUA 过吗`,
      `你怎么识别 PUA`,
      `你怎么挣脱 PUA`,
      `你认为爱里有 PUA 吗`,
      `你认识负能量的人吗`,
      `你被消耗过吗`,
      `你怎么远离消耗你的人`,
      `断舍离朋友圈难吗`,
      `你的能量从哪来`,
      `你和谁待在一起最舒服`,
      `你怕分别吗`,
      `分手后多久走出来`,
      `你能放下吗`,
      `你忘不了的人是谁`,
      `念念不忘真的有回响吗`,
      `你写过日记吗`,
      `你看自己日记会害羞吗`,
      `你认为坦诚是好事吗`,
      `你害怕坦诚吗`,
      `你害怕评价吗`,
      `你在意别人的评价吗`,
      `别人的评价会改变你吗`,
      `你在意外貌吗`,
      `你认为外貌焦虑该被克服吗`,
      `容貌焦虑你有过吗`,
      `身材焦虑你有过吗`,
      `年龄焦虑你有过吗`,
      `婚姻焦虑你有过吗`,
      `生育焦虑你有过吗`,
      `你怕老吗`,
      `你怕生病吗`,
      `你怕死亡吗`,
      `你最害怕失去什么`,
      `失去亲人你想过吗`,
      `失去朋友你想过吗`,
      `失去自我你怕过吗`,
      `你迷茫过多久`,
      `你迷茫时怎么办`,
      `你信顺其自然吗`,
      `你信努力就有回报吗`,
      `你认为人需要安全感吗`,
      `安全感来自自己还是别人`,
      `你独立吗`,
      `你害怕独立吗`,
      `你害怕承担责任吗`,
      `你逃避过什么`,
      `逃避有用吗`,
      `你直面问题的勇气从哪来`,
      `你认为坚强是必须的吗`,
      `你能允许自己软弱吗`,
      `你哭过最久一次`,
      `你笑过最大声一次`,
      `你内心戏多吗`,
      `你想得多还是做得多`,
      `你后悔行动还是后悔不行动`,
    ],
  },
  '爱情与婚恋': {
    accent: 'red',
    blurb: '恋爱、婚姻、单身',
    topics: [
      `什么是真正的爱`,
      `一见钟情是真的吗`,
      `日久生情更长久吗`,
      `为什么大家越来越不相信爱情`,
      `为什么大家不敢谈恋爱`,
      `你愿意为爱情付出多少`,
      `爱情会消耗你吗`,
      `你怎么看异地恋`,
      `异地恋能长久吗`,
      `网恋靠谱吗`,
      `奔现是检验感情吗`,
      `你愿意远嫁吗`,
      `门当户对重要吗`,
      `三观不合还能在一起吗`,
      `和家庭不和的人在一起 你怕吗`,
      `你能接受姐弟恋吗`,
      `你能接受年龄差距大于 10 岁吗`,
      `婚外情可以被原谅吗`,
      `你能原谅出轨吗`,
      `一夜情你接受吗`,
      `婚前性行为你怎么看`,
      `贞操观还有意义吗`,
      `开放式关系你接受吗`,
      `无性婚姻能长久吗`,
      `结婚的本质是什么`,
      `婚姻是爱情的坟墓吗`,
      `你为什么想结婚`,
      `你为什么不想结婚`,
      `你能接受不结婚一辈子吗`,
      `你能接受不要孩子吗`,
      `要孩子 vs 不要孩子`,
      `婚姻里的爱多还是利益多`,
      `你能为爱辞职吗`,
      `为爱搬到一座陌生城市值得吗`,
      `放弃事业陪伴另一半 你愿意吗`,
      `他/她让你成为更好的自己了吗`,
      `恋爱中你迁就吗`,
      `谁先低头很重要吗`,
      `吵架冷战哪种更糟`,
      `你能道歉吗`,
      `你能原谅吗`,
      `分手是谁先提的 重要吗`,
      `分手后做朋友可能吗`,
      `前任还能联系吗`,
      `见前任你紧张吗`,
      `你能放下前任吗`,
      `前任的祝福你接受吗`,
      `你给前任写过信吗`,
      `你的初恋是怎样的`,
      `你最爱的人是初恋吗`,
      `你想念过谁`,
      `你忘不了谁`,
      `你怎么看"白月光"和"朱砂痣"`,
      `你的白月光是谁`,
      `你的朱砂痣是谁`,
      `你能跨越阶级谈恋爱吗`,
      `穷小子娶富家女 你支持吗`,
      `倒贴你愿意吗`,
      `谁先表白重要吗`,
      `女孩可以主动吗`,
      `男女约会谁付钱`,
      `AA 制是不是没爱`,
      `彩礼应该多少`,
      `你支持彩礼吗`,
      `娘家陪嫁多寡你在意吗`,
      `你愿意低嫁吗`,
      `你愿意高攀吗`,
      `跨国恋你支持吗`,
      `跨民族跨宗教婚姻 你接受吗`,
      `你接受姐弟同性恋吗`,
      `你支持同性婚姻合法吗`,
      `LGBTQ 朋友你怎么看`,
      `你能接受丁克吗`,
      `只生不养你怎么看`,
      `单亲家庭可以幸福吗`,
      `为孩子凑合婚姻值得吗`,
      `你能接受协议婚姻吗`,
      `形婚你怎么看`,
      `闪婚靠谱吗`,
      `三观比颜值重要吗`,
      `颜值是择偶第一标准吗`,
      `钱是择偶第一标准吗`,
      `人品是底线吗`,
      `学历重要吗`,
      `家庭背景重要吗`,
      `原生家庭决定婚姻吗`,
      `遇到妈宝男怎么办`,
      `遇到妈宝女怎么办`,
      `伴侣有未成年孩子 你接受吗`,
      `二婚 你能接受吗`,
      `男方比女方矮 你接受吗`,
      `年龄相差 15 岁 你接受吗`,
    ],
  },
  '家庭关系': {
    accent: 'emerald',
    blurb: '父母、亲子、原生家庭',
    topics: [
      `你和爸妈关系好吗`,
      `你能跟爸妈聊心事吗`,
      `你最后一次和爸妈拥抱是什么时候`,
      `你最后一次和爸妈说我爱你是什么时候`,
      `父母对你影响最大的是什么`,
      `你父母教会你最重要的一件事`,
      `你最像父亲哪里`,
      `你最像母亲哪里`,
      `你和父亲的关系如何`,
      `你和母亲的关系如何`,
      `重男轻女你经历过吗`,
      `你父母偏心吗`,
      `你和兄弟姐妹关系好吗`,
      `独生子女有什么遗憾`,
      `二胎家庭长子的压力`,
      `二胎家庭老大老二谁更累`,
      `你怎么看"长姐如母"`,
      `你怎么看"养儿防老"`,
      `你愿意养父母老吗`,
      `你愿意接父母同住吗`,
      `你是否曾经离家出走`,
      `你最叛逆的年纪在干什么`,
      `你和父母吵过的最严重的一次`,
      `你给父母道过歉吗`,
      `父母给你道过歉吗`,
      `你能原谅父母吗`,
      `原生家庭决定一生吗`,
      `原生家庭可以摆脱吗`,
      `你怎么走出原生家庭的阴影`,
      `你父母吵架你怎么办`,
      `父母离婚你支持吗`,
      `离异家庭的孩子真的不一样吗`,
      `你怎么看丧偶式育儿`,
      `你父母谁带你多`,
      `留守儿童的成长 你怎么看`,
      `你被父母揍过吗`,
      `打孩子可以吗`,
      `严父慈母 vs 严母慈父`,
      `你愿意当严父严母吗`,
      `你怎么教育孩子`,
      `你打过孩子吗`,
      `言传 vs 身教`,
      `父母的爱该不该有条件`,
      `你父母无条件爱你吗`,
      `你想要孩子吗`,
      `为什么要孩子`,
      `为什么不要孩子`,
      `你能接受孩子是同性恋吗`,
      `你能接受孩子不结婚吗`,
      `你愿意把所有积蓄留给孩子吗`,
      `你愿意给孩子全款买房吗`,
      `啃老可以吗`,
      `你父母啃过你吗`,
      `你啃过父母吗`,
      `给父母多少钱合适`,
      `给父母买房你愿意吗`,
      `父母得重病你能砸锅卖铁吗`,
      `你愿意为父母放弃事业吗`,
      `和父母三观不合怎么办`,
      `回家被催婚你怎么办`,
      `回家被比较你怎么应对`,
      `你想搬出家 vs 留在父母身边`,
      `你和父母最大的隔阂`,
      `你父母最不理解你的是什么`,
      `你最理解父母的哪一刻`,
      `看见父母老去的瞬间`,
      `父母变老你怕过吗`,
      `父母离开你做了什么准备`,
      `你跟父母说过最重的话`,
      `父母对你说过最重的话`,
      `婆媳关系是迷信吗`,
      `你支持女主外男主内吗`,
      `你的家庭氛围如何`,
      `你想给孩子一个怎样的家`,
      `你认为家庭最重要的是什么`,
      `你向往什么样的家庭`,
      `重组家庭你接受吗`,
      `单亲妈妈带娃多难`,
      `单亲爸爸带娃多难`,
      `寄养、领养你怎么看`,
    ],
  },
  '友情与社交': {
    accent: 'sky',
    blurb: '朋友、孤独、人际边界',
    topics: [
      `你认为真正的朋友是什么样`,
      `你有几个真朋友`,
      `你和最好的朋友怎么认识的`,
      `你们多久没见过了`,
      `你认为友情会变质吗`,
      `你和谁渐行渐远了`,
      `你删过谁的微信`,
      `你拉黑过谁`,
      `断舍离朋友圈难吗`,
      `你怎么定义"塑料姐妹"`,
      `闺蜜抢男友你遇到过吗`,
      `兄弟绿过你的吗`,
      `男女间有纯友谊吗`,
      `你和异性朋友的边界在哪`,
      `已婚男和异性朋友吃饭可以吗`,
      `你怎么看搭子文化`,
      `搭子算朋友吗`,
      `你的饭搭子是谁`,
      `你的旅行搭子是谁`,
      `你怕一个人吗`,
      `你怕没人陪你过节吗`,
      `一个人吃火锅你接受吗`,
      `一个人去 KTV 你愿意吗`,
      `一个人旅行你做过吗`,
      `独处的滋味你享受吗`,
      `孤独和寂寞的区别`,
      `你怎么和孤独相处`,
      `你的社交焦虑严重吗`,
      `你害怕参加饭局吗`,
      `你害怕参加陌生人聚会吗`,
      `你能 small talk 半小时吗`,
      `你跟陌生人聊天难吗`,
      `你善于读空气吗`,
      `你能维持表面客套吗`,
      `你讨厌虚伪应酬吗`,
      `酒桌文化你受得了吗`,
      `你能喝多少酒`,
      `你被劝过酒吗`,
      `你怎么拒绝劝酒`,
      `你是社牛还是社恐`,
      `社牛是天生的吗`,
      `社恐可以被治愈吗`,
      `你是 i 还是 e`,
      `i 人和 e 人哪种更累`,
      `你的朋友圈秒发还是斟酌`,
      `你删朋友圈过吗`,
      `你屏蔽过谁`,
      `你被屏蔽过吗`,
      `看到朋友圈三天可见你难过吗`,
      `为什么大家越来越不发朋友圈`,
      `朋友圈点赞代表关心吗`,
      `你常给谁点赞`,
      `你给前任点过赞吗`,
      `你在群里活跃吗`,
      `大家庭群你怎么应对`,
      `工作群你回复及时吗`,
      `你看过陌生人朋友圈八卦吗`,
      `你刷过暗恋对象朋友圈吗`,
      `你的网友比现实朋友多吗`,
      `网友算真朋友吗`,
      `你跟网友奔现过吗`,
      `你认为最好的朋友该具备什么`,
      `长久友情靠什么维系`,
      `你能跟朋友共同进步吗`,
      `当朋友混得比你好你嫉妒吗`,
      `你嫉妒过朋友吗`,
      `你愿意帮朋友吗`,
      `借钱给朋友你愿意吗`,
      `借出去的钱要回来过吗`,
      `谈钱伤感情 你信吗`,
      `跟朋友做生意可以吗`,
      `合伙创业的友情多久会崩`,
      `你的朋友圈是什么样的人`,
      `你怎么看 "圈子决定命运"`,
      `你想结交比你强的人吗`,
      `向上社交你怎么看`,
    ],
  },
  '工作与职场': {
    accent: 'amber',
    blurb: '打工、职场、跳槽、辞职',
    topics: [
      `你喜欢你的工作吗`,
      `你的工作让你有成就感吗`,
      `你为什么继续这份工作`,
      `钱、热爱、稳定 你选哪个`,
      `你愿意为热爱拿低工资吗`,
      `为五斗米折腰你能接受多少`,
      `你能容忍恶心的工作多久`,
      `裸辞是勇敢还是逃避`,
      `你裸辞过吗`,
      `离职那一刻你什么感觉`,
      `跳槽多久一次合理`,
      `一直在一家公司是好事还是坏事`,
      `体制内 vs 互联网`,
      `大厂 vs 创业公司`,
      `大公司螺丝钉 vs 小公司全能`,
      `你愿意去小城市躺平大公司远程`,
      `年薪百万 996 vs 年薪 30 万准时下班`,
      `你能接受 007 吗`,
      `996 是奋斗还是剥削`,
      `加班是态度还是无能`,
      `拒绝加班你做得到吗`,
      `带病上班你做过吗`,
      `病假被扣绩效合理吗`,
      `下班接老板电话你接吗`,
      `微信秒回是必须的吗`,
      `下班还要回工作消息正常吗`,
      `你被老板骂哭过吗`,
      `你怎么对付奇葩老板`,
      `被同事甩锅怎么办`,
      `职场背刺你遇到过吗`,
      `你站过队吗`,
      `站队是必要的吗`,
      `你能装作什么都不知道吗`,
      `办公室政治你掺和吗`,
      `你能跟同事做朋友吗`,
      `跟同事谈恋爱你支持吗`,
      `办公室恋情结局好的多吗`,
      `你和领导谈过恋爱吗`,
      `找工作靠关系吗`,
      `找工作 vs 投简历`,
      `你简历包装过吗`,
      `面试撒谎你接受吗`,
      `面试官的奇葩问题`,
      `你最尴尬的面试是什么`,
      `被裁员你经历过吗`,
      `35 岁危机是真的吗`,
      `35 岁还能跳槽吗`,
      `40 岁失业怎么办`,
      `你能接受失业半年吗`,
      `失业你跟父母说吗`,
      `失业你最怕什么`,
      `你的失业保险金领过吗`,
      `被优化你能接受补偿吗`,
      `N+1 你拿到过吗`,
      `劳动法你了解多少`,
      `你维权过吗`,
      `公司逼你主动离职你怎么办`,
      `你和公司打过官司吗`,
      `PIP 你经历过吗`,
      `你裁过别人吗`,
      `当领导难还是当员工难`,
      `管理是天赋还是技能`,
      `你愿意带团队吗`,
      `向上管理是必须的吗`,
      `拍马屁有用吗`,
      `你拍过马屁吗`,
      `晋升靠能力还是关系`,
      `为什么有些人就是升不上去`,
      `你认为公司最重要的是什么`,
      `人是公司最重要的资产吗`,
      `你信公司画的饼吗`,
      `期权值得拼吗`,
      `股权激励 vs 真金白银`,
      `创业 vs 打工`,
      `你想自己当老板吗`,
      `创业失败你能接受吗`,
      `你创过业吗`,
      `创业最难的是什么`,
      `合伙人比夫妻更重要吗`,
      `你能跟好朋友合伙吗`,
    ],
  },
  '金钱与财富': {
    accent: 'orange',
    blurb: '钱、消费、贫富、欲望',
    topics: [
      `多少钱算财富自由`,
      `财富自由真能让你自由吗`,
      `你想要多少钱才够`,
      `贪心是错的吗`,
      `你认为穷是缺陷吗`,
      `穷限制了你的想象吗`,
      `贫穷会代际遗传吗`,
      `寒门难出贵子吗`,
      `阶层会固化吗`,
      `你能跨越阶层吗`,
      `你父母这辈子最有钱的时候`,
      `你这辈子最穷的时候`,
      `你现在的存款能让你睡着吗`,
      `你能透支信用卡吗`,
      `花呗你欠过吗`,
      `网贷你借过吗`,
      `欠债是耻辱吗`,
      `穷大方还是富节俭`,
      `为什么有钱人节俭`,
      `穷讲究你怎么看`,
      `消费降级你做过吗`,
      `极简主义靠谱吗`,
      `断舍离你做到几分`,
      `你最近一次冲动消费是因为什么`,
      `直播间被冲动消费过吗`,
      `双 11 你买什么`,
      `你怎么对抗消费主义`,
      `钱该花在体验还是物品上`,
      `你存钱还是花钱`,
      `月光族错了吗`,
      `月薪 8000 你怎么分配`,
      `突然给你 100 万你怎么花`,
      `你怎么看富二代`,
      `你嫉妒过富二代吗`,
      `富二代靠的是父辈吗`,
      `寒门贵子真的存在吗`,
      `裸婚你接受吗`,
      `男方没房没车你嫁吗`,
      `彩礼应该多少`,
      `零彩礼你能接受吗`,
      `AA 制是不是没爱`,
      `谁挣钱多 谁说话算吗`,
      `男主外女主内合理吗`,
      `女方挣得多 男方接受吗`,
      `金钱观三观要合吗`,
      `你能为爱降低生活标准吗`,
      `穷养 vs 富养孩子`,
      `给孩子留多少财富合适`,
      `你愿意把所有钱花在自己身上吗`,
      `钱该花在父母身上多少`,
      `给父母生活费多少`,
      `父母的养老你出多少`,
      `你买过最贵的东西是什么`,
      `你最舍得的消费是什么`,
      `你最舍不得的消费是什么`,
      `你买过最后悔的东西`,
      `你的理财方式是什么`,
      `你买过股票吗`,
      `你被割韭菜过吗`,
      `理财产品你信吗`,
      `P2P 你踩过吗`,
      `保险该不该买`,
      `重疾险你买过吗`,
      `你信保险吗`,
      `房产是最好的投资吗`,
      `买房还是租房`,
      `贷款 30 年值得吗`,
      `提前还贷你支持吗`,
      `存钱抗通胀靠谱吗`,
      `现金 vs 股票 vs 房产 vs 黄金`,
      `比特币你信吗`,
      `加密货币是骗局吗`,
      `你怎么看暴富`,
      `一夜暴富你能扛住吗`,
      `彩票中了 1 亿你怎么花`,
      `你被骗过钱吗`,
      `你借给朋友的钱要回来过吗`,
      `你借钱给朋友吗`,
      `你借过别人钱吗`,
      `谈钱伤感情 你信吗`,
    ],
  },
  '假设与思想实验': {
    accent: 'violet',
    blurb: '如果……你会怎样',
    topics: [
      `如果明天就是世界末日 你会做什么`,
      `如果可以隐身一天 你会去哪`,
      `如果可以穿越 你想回到哪一年`,
      `如果能瞬移 你去哪`,
      `如果可以读心 你想读谁的`,
      `如果可以预知未来 你想知道什么`,
      `如果可以重来一次 你改什么`,
      `如果一觉醒来变成另一个人`,
      `如果你只有 5 年寿命`,
      `如果你只有 5 天寿命`,
      `如果你只有 1 天寿命`,
      `如果你已经死了 你会改变什么`,
      `如果可以选职业 不计后果 你做什么`,
      `如果不用工作 你怎么活`,
      `如果中了 1 亿彩票`,
      `如果父母无条件支持你 你做什么`,
      `如果回到 20 岁`,
      `如果回到 18 岁`,
      `如果回到高中`,
      `如果回到初恋`,
      `如果性别互换一天`,
      `如果国籍互换一天`,
      `如果跟父母互换一天`,
      `如果跟孩子互换一天`,
      `如果跟领导互换一天`,
      `如果跟伴侣互换一天`,
      `如果你成为透明人 谁会想你`,
      `如果你变成网红 你接受多少质疑`,
      `如果你突然出名 你能扛住吗`,
      `如果你突然破产 你怎么活`,
      `如果你失去记忆 重新认识自己`,
      `如果你失去自由 哪种生活最难熬`,
      `如果你能选父母 你换吗`,
      `如果你能选孩子 你想要怎样的`,
      `如果你能控制时间 你停在哪一刻`,
      `如果你能控制天气 怎么用`,
      `如果你能跟死去的人对话 1 小时 你选谁`,
      `如果你能跟活着的任何人吃顿饭`,
      `如果你能采访任何人 你问什么`,
      `如果你能教任何人一件事 教什么`,
      `如果你只能拯救一个人`,
      `如果你只能放弃一个亲人`,
      `如果你只能保留一段记忆`,
      `如果你只能保留一个朋友`,
      `如果你只能保留一项技能 选什么`,
      `如果你只能保留一个习惯 选什么`,
      `如果你只能保留一种感情`,
      `如果你只能选择一种语言`,
      `如果你只能去一个国家 选哪里`,
      `如果你只能听一个歌手 选谁`,
      `如果你只能看一本书 一辈子`,
      `如果你只能吃一种菜 一辈子`,
      `如果你能复活一个人 选谁`,
      `如果你能见已故的亲人一次 你说什么`,
      `如果你能见 10 年后的自己 你问什么`,
      `如果你能见 10 年前的自己 你说什么`,
      `如果一切重来 你还会选 ta 吗`,
      `如果一切重来 你还会做这份工作吗`,
      `如果一切重来 你还会出生在这个家吗`,
      `如果一切重来 你还会读这个专业吗`,
      `如果你能换一个名字`,
      `如果你能换一张脸`,
      `如果你能换一种身份`,
      `如果你能换一个时代`,
      `如果不能用手机 你会失去什么`,
      `如果断网一年 你怎么活`,
      `如果停电一周 你怎么活`,
      `如果停水一周 你怎么活`,
      `如果你只能保留 3 件物品`,
      `如果家里着火 你抢什么`,
      `如果你只能带一样东西去无人岛`,
      `如果你被困电梯 你做什么`,
      `如果你梦境成真 最想成真哪个`,
      `如果你噩梦成真 最怕哪个`,
      `如果你能控制别人喜怒`,
      `如果你能控制自己情绪`,
      `如果你能选生死时间 你怎么选`,
      `如果可以预知死亡日期 你想知道吗`,
      `如果可以延寿 30 年 代价是失忆 选吗`,
      `如果可以年轻 30 岁 代价是失去所有 选吗`,
      `如果你拥有一项超能力`,
      `如果你只能做一件事改变社会`,
      `如果你只能保护一种动物`,
      `如果你只能毁掉一样东西`,
    ],
  },
  '生活方式': {
    accent: 'emerald',
    blurb: '城市、习惯、健康、生活美学',
    topics: [
      `你早睡早起还是晚睡晚起`,
      `你戒过手机吗`,
      `你戒过短视频吗`,
      `你戒过咖啡吗`,
      `你戒过糖吗`,
      `你戒过酒吗`,
      `你能吃多辣`,
      `你能吃辣还是不能吃辣`,
      `你做饭吗`,
      `你点外卖几次一周`,
      `你最常吃的早餐是什么`,
      `你最爱的家乡菜`,
      `你最爱的城市是哪`,
      `你住过几个城市`,
      `你想去哪个城市生活`,
      `你怎么看北漂`,
      `你怎么看上海`,
      `你怎么看深圳`,
      `你怎么看成都`,
      `你怎么看大理`,
      `你想搬到山里吗`,
      `你向往乡村生活吗`,
      `你能受不了的城市习惯`,
      `你受不了的乡村习惯`,
      `你怎么看一线生活`,
      `你怎么看县城生活`,
      `你愿意搬到县城吗`,
      `你能接受小镇做题家身份吗`,
      `你怎么看回老家`,
      `你最怀念家乡的什么`,
      `回家最让你难受的什么`,
      `离家最让你想念的什么`,
      `你独居多久了`,
      `独居你害怕过吗`,
      `独居的孤独和自由`,
      `你会跟父母同住吗`,
      `合租你住过吗`,
      `合租遇到的奇葩 之最`,
      `你的卧室是什么样`,
      `你的厨房用过几次`,
      `你的衣柜里穿过几件`,
      `你扔过最贵的衣服`,
      `你买过最贵的衣服`,
      `你最舍不得扔的物品`,
      `你的爱好是什么`,
      `你坚持过最久的爱好`,
      `你放弃过的爱好是什么`,
      `你最近迷上什么`,
      `你怎么看运动`,
      `你坚持过最久的运动`,
      `马拉松你跑过吗`,
      `健身你坚持过多久`,
      `瑜伽 vs 跑步 vs 撸铁`,
      `你的减肥史`,
      `减肥你成功过吗`,
      `体重你在意吗`,
      `颜值焦虑你有过吗`,
      `你整容你支持吗`,
      `你化妆吗`,
      `你能素颜出门吗`,
      `你的护肤步骤是几步`,
      `你穿衣极简 vs 多变`,
      `你的穿衣风格`,
      `你认为穿衣很重要吗`,
      `你的睡眠时长`,
      `你失眠时怎么办`,
      `你睡前刷手机吗`,
      `你的早晨第一件事`,
      `你的晚上仪式感是什么`,
      `你的周末怎么过`,
      `你独处时做什么`,
      `你旅行频率`,
      `你最难忘的旅行`,
      `你想去的国家`,
      `你想去的城市`,
      `你最不想再去的地方`,
      `独自旅行你尝试过吗`,
      `你旅行带相机吗`,
      `你拍照狂魔吗`,
      `你刷小红书做攻略吗`,
      `你能接受跟团游吗`,
      `你怎么看穷游`,
      `穷游 vs 富游`,
      `你的旅行预算`,
    ],
  },
  '奇葩说': {
    accent: 'orange',
    blurb: '二选一困境、有趣立场题',
    topics: [
      `暧昧期到底算不算劈腿`,
      `婆婆掉水里和老婆掉水里你救哪个`,
      `30岁了感情和事业你选哪个`,
      `和好朋友爱上同一个人怎么办`,
      `前任结婚你去随礼吗`,
      `和初恋复合可以吗`,
      `一夜情你接受吗`,
      `你能接受没有性的婚姻吗`,
      `你能接受没有爱的婚姻吗`,
      `和不爱的人结婚是不是浪费`,
      `奉子成婚靠谱吗`,
      `闪婚和长跑哪个更靠谱`,
      `你愿意远嫁吗`,
      `分手你能做朋友吗`,
      `拉黑前任是不是不够大度`,
      `前任的婚礼请你你去吗`,
      `你想知道伴侣的过去吗`,
      `你能容忍伴侣多少前任`,
      `纯洁感情还存在吗`,
      `谈恋爱你能等多久`,
      `喜欢但不合适 你选哪个`,
      `门当户对是势利还是智慧`,
      `你能找比你穷的人吗`,
      `你能找比你弱的人吗`,
      `颜值和才华你选哪个`,
      `钱和爱你选哪个`,
      `爱情和家人冲突 你站谁`,
      `为爱牺牲事业值得吗`,
      `为孩子放弃事业值得吗`,
      `为父母改嫁/再婚值得吗`,
      `看到陌生人摔倒你扶不扶`,
      `看到偷东西你会管吗`,
      `你介意伴侣比你年长 5 岁吗`,
      `你介意伴侣比你矮吗`,
      `你介意伴侣离过婚吗`,
      `你介意伴侣有孩子吗`,
      `你介意伴侣不爱干净吗`,
      `你介意伴侣不爱沟通吗`,
      `你介意伴侣没有共同爱好吗`,
      `你介意伴侣是 ENFP/INTJ 吗`,
      `查手机不查手机`,
      `纪念日你会记得吗`,
      `吵架谁先低头很重要吗`,
      `冷战 vs 大吵 哪个更糟`,
      `分手谁先提的 重要吗`,
      `分手 vs 凑合 哪个更难`,
      `长痛 vs 短痛 你选哪个`,
      `原谅出轨可以吗`,
      `一次出轨永远出轨吗`,
      `和好后能信任吗`,
      `谈恋爱要不要 AA`,
      `谁挣得多谁说话算吗`,
      `婆媳战争是不是必然`,
      `二孩家庭老大老二谁更被偏爱`,
      `重男轻女 是奶奶严重还是妈妈严重`,
      `你支持父母再婚吗`,
      `你支持父母移居养老吗`,
      `和父母同住能维持多久`,
      `装睡的爹妈你叫醒吗`,
      `你能跟父母三观完全不合还相处吗`,
      `你能在父母面前做真实的自己吗`,
      `你父母看过你日记吗`,
      `你父母翻你手机吗`,
      `你的隐私底线是什么`,
      `高薪 996 vs 低薪准时下班`,
      `大城市孤独 vs 小城市八卦`,
      `北上广深选哪个`,
      `一线 vs 新一线 选哪个`,
      `裸辞 vs 骑驴找马`,
      `创业 vs 打工`,
      `体制内 vs 互联网`,
      `30 岁还能创业吗`,
      `30 岁还能转行吗`,
      `35 岁失业你能扛多久`,
      `你能接受降薪去喜欢的工作吗`,
      `你能接受涨薪去讨厌的工作吗`,
      `稳定 vs 自由 你选哪个`,
      `名校光环 vs 高薪工作`,
      `大公司螺丝钉 vs 小公司全能`,
      `住公司省钱 vs 通勤 2 小时`,
      `你愿意做钟点工奴 vs 包月奴`,
      `你能接受合租陌生人吗`,
      `你能接受跟朋友合租吗`,
      `你能接受跟父母同住吗`,
      `室友奇葩你忍多久`,
      `你愿意为安静多付多少钱`,
      `你能在地铁睡着吗`,
      `你坐过最长地铁多久`,
    ],
  },
  '脑洞': {
    accent: 'sky',
    blurb: '反常规、思想实验、想象力',
    topics: [
      `如果你能跟动物说话一天 你跟谁说`,
      `如果地球只剩你一个人`,
      `如果你能复制自己一份`,
      `如果重力反过来 24 小时`,
      `如果你能听到别人内心的话`,
      `如果你的影子有意识`,
      `如果你能控制一种自然现象`,
      `如果你是植物 你想是哪种`,
      `如果你是动物 你想是哪种`,
      `如果你是一种食物`,
      `如果你是一种颜色`,
      `如果你能成为一段历史 你选哪段`,
      `如果可以体验任何职业一天 选什么`,
      `如果可以变成任何身份一天`,
      `如果可以让世界静止 10 分钟`,
      `如果时间能倒流 5 秒一次`,
      `如果味觉关掉一天`,
      `如果嗅觉关掉一周`,
      `如果失去听觉一天`,
      `如果失去视觉一小时`,
      `如果你能飞 你第一件事做什么`,
      `如果你能瞬移 你去哪`,
      `如果你能隐身一天`,
      `如果你能预知明天`,
      `如果你能预知 10 年后`,
      `如果你的生命有进度条`,
      `如果你的喜怒有提示音`,
      `如果情绪能换钱`,
      `如果记忆能租出去`,
      `如果梦境可以录像`,
      `如果你能选择忘记什么`,
      `如果你能选择记住什么`,
      `如果颜值能买卖`,
      `如果寿命可以转赠`,
      `如果智商可以注射`,
      `如果运气可以购买`,
      `如果失败可以撤回`,
      `如果时间可以加速`,
      `如果减肥能瞬间完成`,
      `如果学习可以下载到大脑`,
      `如果天气随你心情变`,
      `如果世界只剩中文`,
      `如果世界只有一种食物`,
      `如果汽车都能飞`,
      `如果手机消失一年`,
      `如果互联网关闭一周`,
      `如果电力消失三天`,
      `如果钱变成石头`,
      `如果性别每年互换一次`,
      `如果年龄每年随机重置`,
      `如果颜值每天随机变`,
      `如果声音每天随机变`,
      `如果只能用 100 个字一天`,
      `如果只能说真话一天`,
      `如果只能撒谎一天`,
      `如果别人能看见你的搜索记录`,
      `如果你能复活任何一个动物`,
      `如果你能让任何一个动物灭绝`,
      `如果你是地球管理员`,
      `如果你能给人类立一条新法律`,
      `如果你只能保留一种感情`,
      `如果你只能保留一种感官`,
      `如果你能活到 200 岁`,
      `如果你只能活到 30 岁`,
      `如果你的小学同学突然全部找你`,
      `如果你 5 年前的自己来找你借钱`,
      `如果你 10 年后的自己来教你怎么活`,
      `如果你能见到 80 岁的自己`,
      `如果你能成为别人 24 小时 你选谁`,
      `如果你能让一个人爱上你 你选谁`,
      `如果你能让一个人离开你 你选谁`,
      `如果你能跟历史名人共进一餐`,
      `如果你能采访世界上任何一个人`,
      `如果你能在春晚上台 5 分钟 你做什么`,
      `如果给你 100 个机会去一个国家`,
      `如果给你一座私人岛屿`,
      `如果给你一栋大楼随便处置`,
      `如果你拥有一个超级 AI 助理`,
      `如果你能学会任何技能不用练`,
      `如果你能秒懂任何语言`,
    ],
  },
  '文化与审美': {
    accent: 'rose',
    blurb: '电影、音乐、阅读、审美',
    topics: [
      `你读过最难忘的一本书`,
      `改变你最大的一本书`,
      `你最爱的作家`,
      `你最爱的电影`,
      `让你哭过的电影`,
      `让你笑过的电影`,
      `你最爱的音乐人`,
      `你的"循环单曲" 是什么`,
      `你最爱的歌词`,
      `歌词比小说更打动你吗`,
      `你听 City Pop 还是民谣`,
      `摇滚 vs 流行`,
      `你听过最长的演唱会`,
      `你最想去的演唱会`,
      `你想见的偶像`,
      `你追过的偶像团体`,
      `追星是浪费时间吗`,
      `偶像塌房你怎么办`,
      `你最爱的演员`,
      `你最讨厌的演员`,
      `演员演技重要还是颜值`,
      `流量明星该被批评吗`,
      `你怎么看顶流文化`,
      `你最近一次电影院体验`,
      `电影院 vs 在家看`,
      `看电影哭了你尴尬吗`,
      `看综艺会让你变笨吗`,
      `综艺你看哪种`,
      `你看奇葩说吗`,
      `你看脱口秀吗`,
      `你能讲段子吗`,
      `幽默是天赋还是练出来的`,
      `你说话有趣吗`,
      `你怎么提升表达力`,
      `看书 vs 看视频 学习`,
      `短视频学习靠谱吗`,
      `你读公众号吗`,
      `你看小红书吗`,
      `你刷抖音多久`,
      `你的信息源都从哪来`,
      `你信媒体吗`,
      `你怎么辨别信息真假`,
      `你被假新闻骗过吗`,
      `你看英文媒体吗`,
      `你的英文水平`,
      `你认为学英语必要吗`,
      `你的方言会说吗`,
      `你认为方言会消失吗`,
      `你的家乡话好听吗`,
      `你对哪种口音有好感`,
      `普通话有口音被嘲过吗`,
      `你说话快还是慢`,
      `你的字写得好吗`,
      `你还动笔写字吗`,
      `你写过日记吗`,
      `你的日记会给谁看`,
      `你的审美从哪来`,
      `审美需要培养吗`,
      `你认为什么是美`,
      `美是主观的吗`,
      `你怎么看大众审美`,
      `网红脸你接受吗`,
      `千篇一律的滤镜你受得了吗`,
      `你穿衣审美从哪学的`,
      `你怎么看艺术`,
      `艺术是奢侈品吗`,
      `美术馆你去过几次`,
      `你认为博物馆教育重要吗`,
      `你的兴趣是被培养的还是天生`,
      `你怎么看小众爱好`,
      `你的小众爱好是什么`,
      `你曾被嘲笑过爱好吗`,
    ],
  },
};



// ============ 表达框架（教程模式）============
const FRAMEWORKS = [
  {
    id: 'general',
    name: `通用式`,
    tag: `万能基础`,
    description: `教育培训、职场技能、销售营销、健康生活、心理咨询、理财投资`,
    formula: `钩子开头+塑造期待+解决方案+结尾`,
    steps: [
      { name: `钩子开头`, percent: 15, hint: `前 3 秒抓注意力：反常识 / 数字 / 痛点 / 提问` },
      { name: `塑造期待`, percent: 25, hint: `建立信任：你的资历 / 帮过谁 / 凭什么我说的对` },
      { name: `解决方案`, percent: 45, hint: `拆成 3-5 个具体步骤，每步可执行` },
      { name: `结尾`, percent: 15, hint: `收尾引导互动：点赞 / 评论 / 关注` },
    ],
    example: `【钩子开头】 三岁小孩每天哭闹不休怎么办？大部分家长都做错了！

【塑造期待】 我做了 10 年幼儿教育，看过上千个家庭案例，发现一个规律：孩子哭闹 99%是因为父母这个习惯。

【解决方案】 其实解决很简单：第一，确立规则边界；第二，培养安全感连接；第三，情绪共情不指责。只要坚持 7 天，孩子哭闹会减少 80%。

【结尾】 想要详细育儿攻略，点赞关注，每天分享一个育儿干货。`,
  },
  {
    id: 'pain',
    name: `目标人群 + 痛点/共鸣式`,
    tag: `共鸣型`,
    description: `情感咨询、职场成长、家庭教育、健康管理、个人形象、消费决策`,
    formula: `现象 + 危害 + 原因 + 解决办法`,
    steps: [
      { name: `现象`, percent: 15, hint: `陈述一个观众能立刻代入的现状` },
      { name: `危害`, percent: 25, hint: `把不解决的代价说透，让人坐不住` },
      { name: `原因`, percent: 45, hint: `点出根本原因，不要绕弯` },
      { name: `解决办法`, percent: 15, hint: `拆成 3-5 个具体步骤，每步可执行` },
    ],
    example: `【现象】 30+女性求职被嫌弃年龄大，简历投了 100 份没有一个面试机会。

【危害】 眼看着年轻同事一个个升职加薪，自己却陷入职场困境，每天焦虑到失眠。

【原因】 其实问题不在年龄，而在于简历没有突出你的三大优势：经验沉淀、问题解决能力和人脉资源。

【解决办法】 教你三招：第一，重构简历，强调成果不是年限；第二，突出你解决过的行业难题；第三，展示你的人脉资源价值。这样做后，我的学员面试邀约率提升了 5 倍！`,
  },
  {
    id: 'list',
    name: `高密集信息盘点式`,
    tag: `盘点干货`,
    description: `产品测评、技能教学、生活妙招、高效工具分享、市场趋势分析、实用干货整理`,
    formula: `炸裂般的开头 + IP 信息 + 高密集的信息盘点 + 互动的结尾`,
    steps: [
      { name: `炸裂般的开头`, percent: 15, hint: `前 3 秒抓注意力：反常识 / 数字 / 痛点 / 提问` },
      { name: `IP 信息`, percent: 25, hint: `建立信任：你的资历 / 帮过谁 / 凭什么我说的对` },
      { name: `高密集的信息盘点`, percent: 45, hint: `把这部分讲清楚 (高密集的信息盘点)` },
      { name: `互动的结尾`, percent: 15, hint: `收尾引导互动：点赞 / 评论 / 关注` },
    ],
    example: `【炸裂开头】 震惊！本地小店月入 10 万，竟然只靠这 5 个免费引流渠道！

【IP 信息】 我是创业导师张教练，帮助过 200+实体店实现翻倍增长，今天分享我最实用的本地引流秘诀。

【信息盘点】 必备渠道 Top5：①社区团购群，精准触达家庭主妇；②本地生活信息平台，零成本曝光；③微信视频号地理标签，吸引周边 3 公里客流；④异业联盟互推，借力放大；⑤社区公益活动，树立品牌好感。

【互动结尾】 你还用过哪些有效引流方法？评论区分享，我来点评可行性！`,
  },
  {
    id: 'contrast',
    name: `反差式`,
    tag: `反差爆款`,
    description: `教育理念、健康饮食、投资理财、商业策略、育儿方法、营销技巧`,
    formula: `反差类钩子/信任背书/塑造期待 + 解决方案`,
    steps: [
      { name: `反差类钩子/信任背书/塑造期待`, percent: 40, hint: `前 3 秒抓注意力：反常识 / 数字 / 痛点 / 提问` },
      { name: `解决方案`, percent: 60, hint: `拆成 3-5 个具体步骤，每步可执行` },
    ],
    example: `【反差钩子】 我的销售团队没用任何高级话术，却把成交率提高了 300%！秘诀竟是放弃了传统销售教给的这些"经典"技巧。

【信任背书】 作为管理过 500 人销售团队的销售总监，我发现市面上 90%的销售课都在教错误方法。

【塑造期待】 我即将分享的反向心理学销售法，颠覆了传统认知，却帮我的团队创造了 8000 万年销售额。

【解决方案】 核心是三不原则：不急于推销，先提问了解需求；不过度承诺，坦诚产品局限性；不死缠硬磨，给客户思考空间。这种"反销售"的方法反而建立了真实信任，让客户主动掏钱。`,
  },
  {
    id: 'result',
    name: `利益性结果前置`,
    tag: `结果先行`,
    description: `创业分享、技能培训、减肥健身、理财投资、情感咨询、个人成长`,
    formula: `积极结果 + 成就感 + 方案 + 互动式结尾`,
    steps: [
      { name: `积极结果`, percent: 15, hint: `把读完能获得什么说清楚` },
      { name: `成就感`, percent: 25, hint: `把读完能获得什么说清楚` },
      { name: `方案`, percent: 45, hint: `把这部分讲清楚 (方案)` },
      { name: `互动式结尾`, percent: 15, hint: `收尾引导互动：点赞 / 评论 / 关注` },
    ],
    example: `【积极结果】 我的学员用这套简历模板，一周收到 6 个大厂面试邀请，从被 100家公司拒绝到拿到年薪 40 万 offer！

【成就感】 像她这样的成功案例我已经帮助了 200+人，即使是零经验应届生也能快速突破简历关。

【方案】 秘诀就是我总结的"3R 简历法"：①Results（结果导向）突出数据成果；②Relevance（相关性）定制匹配职位；③Readability（可读性）关键词布局。按照这个公式写简历，ATS 系统青睐度提高 80%。

【互动结尾】 想获取我的简历模板和求职指南？点赞关注，评论"简历"获取免费资源包！`,
  },
  {
    id: 'cascade',
    name: `连续递进式`,
    tag: `金句递进`,
    description: `哲学思考、人生感悟、管理理念、文化传承、价值观输出、职场心法`,
    formula: `举例金句 + 佐证 + 列金句 + 佐证`,
    steps: [
      { name: `举例金句`, percent: 15, hint: `一句有传播力的金句` },
      { name: `佐证`, percent: 25, hint: `一个具体案例 / 数据支撑` },
      { name: `列金句`, percent: 45, hint: `一句有传播力的金句` },
      { name: `佐证`, percent: 15, hint: `一个具体案例 / 数据支撑` },
    ],
    example: `【开篇金句】 "国学不是高高在上的经典，而是藏在日常生活里的智慧。"

【初步佐证】 想想看，"己所不欲，勿施于人"这句话，是不是解决了大部分人际冲突的根源？这就是最实用的处世哲学。

【列金句】 再看这些千古名句：①"不以规矩，不成方圆"教我们尊重规则；②"学而不思则罔，思而不学则殆"指导我们学习方法；③"近朱者赤，近墨者黑"提醒我们交友之道。

【深度佐证】 古人的智慧跨越时空，依然适用。职场中建立规则意识，学习中结合实践思考，社交圈中选择积极同伴，这些都能让你受益终身。国学经典就是这样潜移默化地指导着我们的生活。`,
  },
  {
    id: 'reveal',
    name: `行业揭秘式`,
    tag: `内幕揭秘`,
    description: `行业内幕、专业技巧分享、方法论拆解、经验总结、招聘面试、商业模式分析`,
    formula: `行业揭秘 + 塑造期待 + 解决方案`,
    steps: [
      { name: `行业揭秘`, percent: 20, hint: `揭穿一个反常识或行业内幕` },
      { name: `塑造期待`, percent: 50, hint: `建立信任：你的资历 / 帮过谁 / 凭什么我说的对` },
      { name: `解决方案`, percent: 30, hint: `拆成 3-5 个具体步骤，每步可执行` },
    ],
    example: `【行业揭秘】 揭秘！90%的销售培训师都不会告诉你的成交技巧：客户说"价格太贵"时，绝不是因为真的贵！

【塑造期待】 作为 10 年销售培训师，我发现真正的高手从不靠降价成交。我即将分享的"价值重构法"，已经帮我的学员提高了 40%的成交率和 35%的客单价。

【解决方案】 客户说贵的真相是——他没看到足够的价值。解决方法是三步走：第一步，深挖需求背后的痛点；第二步，将产品利益转化为解决方案；第三步，用 ROI 思维量化价值回报。掌握这个框架，你就能从讨价还价的死循环中解脱出来。`,
  },
  {
    id: 'benefit',
    name: `利益传递式`,
    tag: `利益驱动`,
    description: `技能传授、经验分享、效率提升、问题解决、生活改善、职场攻略`,
    formula: `利益传递 + 强化期待 + 解决办法 + 结尾`,
    steps: [
      { name: `利益传递`, percent: 15, hint: `把读完能获得什么说清楚` },
      { name: `强化期待`, percent: 25, hint: `建立信任：你的资历 / 帮过谁 / 凭什么我说的对` },
      { name: `解决办法`, percent: 45, hint: `拆成 3-5 个具体步骤，每步可执行` },
      { name: `结尾`, percent: 15, hint: `收尾引导互动：点赞 / 评论 / 关注` },
    ],
    example: `【利益传递】 一节课让孩子爱上学习的秘密公式，让厌学变成主动学习，成绩提升不是问题！

【强化期待】 这个方法已经帮助 5000+厌学孩子爱上了学习，连学习困难的孩子都能见效。最神奇的是，不需要任何惩罚或奖励，完全激发内在动力。

【解决办法】 核心是"AME 学习动力激活法"：A-Autonomy（自主权）给孩子选择空间；M-Mastery（掌握感）设计可达成的小目标；E-Enjoyment（乐趣）将学习融入游戏和兴趣。每天只需 15 分钟，两周就能看到明显变化。

【结尾】 想获取详细的"学习动力激活手册"？点赞关注，回复"学习动力"免费领取！`,
  },
  {
    id: 'opinion',
    name: `感性观点分享式`,
    tag: `感性故事`,
    description: `人生哲理、心理健康、教育理念、价值观探讨、人际关系、自我成长`,
    formula: `事实 + 个人感受 + 发现问题 + 引出观点 + 讲故事 + 总结观点`,
    steps: [
      { name: `事实`, percent: 10, hint: `陈述一个观众能立刻代入的现状` },
      { name: `个人感受`, percent: 15, hint: `说出你自己的真实感受` },
      { name: `发现问题`, percent: 25, hint: `抛一个观众最关心的问题` },
      { name: `引出观点`, percent: 25, hint: `一句话总结你的核心立场` },
      { name: `讲故事`, percent: 15, hint: `一段具体的故事场景，有时间地点人物` },
      { name: `总结观点`, percent: 10, hint: `一句话总结你的核心立场` },
    ],
    example: `【事实】 最近一项调查显示，超过 60%的婚姻问题源于"期待落差"，而不是常说的性格不合。

【个人感受】 作为婚恋咨询师，我深深理解这种落差带来的痛苦。看到太多本可以幸福的伴侣，因为期待不同而互相伤害。

【发现问题】 问题的根源在于：我们习惯用自己的爱情观去定义对方的付出，却很少真正了解对方的爱情表达方式。

【引出观点】 我认为，健康的亲密关系不在于找到完美匹配的灵魂伴侣，而在于学会欣赏并接纳彼此的不同。

【讲故事】 有一对来访的夫妻，结婚 5 年几乎天天吵架。妻子抱怨丈夫不够浪漫，丈夫委屈说自己天天负责家务。引导他们互相理解后，才发现两人表达爱的方式完全不同：一个是言语肯定，一个是行动服务。

【总结观点】 所以，与其期待对方改变，不如先了解彼此的"爱的语言"。接纳差异，欣赏互补，才是长久幸福的秘诀。`,
  },
  {
    id: 'knowledge',
    name: `知识分享 4 段式`,
    tag: `知识科普`,
    description: `专业知识讲解、方法论分享、问题诊断、系统思维培训、能力提升指导、行业难 / 题解析`,
    formula: `问题描述 + 问题的拆解 + 答案描述 + 答案拆解`,
    steps: [
      { name: `问题描述`, percent: 15, hint: `抛一个观众最关心的问题` },
      { name: `问题的拆解`, percent: 25, hint: `抛一个观众最关心的问题` },
      { name: `答案描述`, percent: 45, hint: `直接给出答案 / 结论` },
      { name: `答案拆解`, percent: 15, hint: `逐步骤推进，每步一句话` },
    ],
    example: `【问题描述】 很多家长想让孩子学习国学经典，却发现孩子完全没兴趣，背了就忘，学了等于没学，这种情况你是否也遇到过？

【问题拆解】 分析这个困境，我发现三个核心原因：一是内容晦涩难懂，孩子缺乏理解；二是学习方式枯燥单一；三是与现代生活脱节，孩子感受不到实用价值。

【答案描述】 解决方案是"活学活用三步法"：第一步，情境化理解，通过故事动画理解原文；第二步，现代化转化，将古代智慧连接当下生活；第三步，游戏化实践，通过角色扮演等方式内化经典智慧。

【答案拆解】 为什么这个方法有效？心理学研究表明，人脑对情境化、个人化和情感化的内容记忆最为深刻。当孩子在生动场景中理解经典，在日常生活中应用智慧，在游戏互动中体验价值，学习就从被动记忆变成了主动探索，效果自然事半功倍。`,
  },
  {
    id: 'scene',
    name: `场景展示式`,
    tag: `场景代入`,
    description: `美食烹饪、手工艺品、实体店铺、农产品电商运营教学、旅游景点、学习环境、 / 创作过程展示`,
    formula: `场景呈现 + 产品互动 + 人群痛点 + 结尾升华`,
    steps: [
      { name: `场景呈现`, percent: 15, hint: `具体场景画面，感官细节` },
      { name: `产品互动`, percent: 25, hint: `收尾引导互动：点赞 / 评论 / 关注` },
      { name: `人群痛点`, percent: 45, hint: `把不解决的代价说透，让人坐不住` },
      { name: `结尾升华`, percent: 15, hint: `收尾引导互动：点赞 / 评论 / 关注` },
    ],
    example: `【场景呈现】 （以画面方式演绎，非口播文案）午后的咖啡厅，我和创业三年的李总对坐，他愁眉不展地翻看着公司财报。"利润看起来不错，为什么账上的钱总是不够用？"他无奈地问。我拿出我的"现金流诊断表"，用红笔在几个关键数据上画了圈。

【产品互动】 （以画面方式演绎，非口播文案） "看这里，"我指着表格说，"你的应收账款周期平均是 68 天，而付款周期只有 30 天。这个差距正是你的现金流黑洞。"在 20 分钟的分析后，我们制定了三项立即可行的改进措施。他拿起表格仔细端详，眼睛逐渐亮起来。

【人群痛点】 很多中小企业主精通业务但不懂财税管理，只关注利润而忽视现金流，导致明明盈利却面临资金链危机。传统财务报表晦涩难懂，让非财务背景的创业者无法真正把控企业命脉。特别适合初创企业和成长期企业的管理者。

【结尾升华】 想掌握简单实用的财务管理工具吗？我的"创业者财税生存指南"包含 7 张一看就懂的财务诊断表和操作手册，让你不懂财务也能做出正确决策。点赞关注，评论"现金流"三个字，免费获取价值 399 元的财务健康自测工具包！`,
  },
  {
    id: 'choice',
    name: `对比选择式`,
    tag: `对比抉择`,
    description: `职业规划、教育选择、投资理财、生活方式、消费决策、城市选择、人生规划`,
    formula: `用户选择 + 制造冲突 + 具体分析 + 说明原因 + 下结论`,
    steps: [
      { name: `用户选择`, percent: 15, hint: `把这部分讲清楚 (用户选择)` },
      { name: `制造冲突`, percent: 20, hint: `把不解决的代价说透，让人坐不住` },
      { name: `具体分析`, percent: 30, hint: `把这部分讲清楚 (具体分析)` },
      { name: `说明原因`, percent: 20, hint: `点出根本原因，不要绕弯` },
      { name: `下结论`, percent: 15, hint: `一句话总结你的核心立场` },
    ],
    example: `【抛出选择】 高薪加班的大厂工作 VS 轻松但薪资一般的国企，你会怎么选？这个问题困扰了无数职场人。

【制造冲突】 很多人想都不想就选大厂高薪，但调查显示，大厂员工三年内跳槽率高达 78%，而选择国企的人幸福感普遍更高。为什么会这样？

【具体分析】 让我们算一笔账：大厂年薪 50 万，但每天工作 12 小时，全年无休；国企年薪 30 万，朝九晚五，双休加假期。看似差了 20 万，但按工作时长计算，大厂时薪 103 元，国企时薪 156 元，谁更值钱一目了然。

【说明原因】 更重要的是无形成本：大厂高压环境导致健康问题，医疗支出增加；缺少家庭陪伴时间，可能带来家庭关系危机；长期超负荷工作，职业倦怠风险高。这些隐性成本往往被忽视，却直接影响生活质量。

【下结论】 没有绝对的对错，关键是优先级。如果你正处于职业积累期，可以短期在大厂"镀金"；如果重视生活平衡和长期稳定，国企可能更适合。不妨扪心自问：30 年后回望，你会为什么感到遗憾？答案就在心中。`,
  },
  {
    id: 'qa',
    name: `问题解答式`,
    tag: `Q&A`,
    description: `心理咨询、专业答疑、技能指导、难题破解、方法论分享、行业痛点解决`,
    formula: `问题抛出 + 现状分析 + 解决步骤 + 效果展示 + 专业建议`,
    steps: [
      { name: `问题抛出`, percent: 15, hint: `抛一个观众最关心的问题` },
      { name: `现状分析`, percent: 20, hint: `陈述一个观众能立刻代入的现状` },
      { name: `解决步骤`, percent: 30, hint: `逐步骤推进，每步一句话` },
      { name: `效果展示`, percent: 20, hint: `一个具体案例 / 数据支撑` },
      { name: `专业建议`, percent: 15, hint: `具体可马上做的一件事` },
    ],
    example: `【问题抛出】 婚姻中矛盾越来越多，每次沟通都变成争吵，甚至开始考虑分开，这样的感情还有救吗？

【现状分析】 调查显示，85%的婚姻危机源于沟通方式而非实质问题。当沟通陷入"批评-防御-蔑视-冷漠"的恶性循环，即使再深的感情也会逐渐消耗殆尽。问题不在于有矛盾，而在于处理矛盾的方式不当。

【解决步骤】 三步修复法：第一步，建立安全对话空间——约定特定时间地点，不带情绪讨论；第二步，学习"我感受"陈述法——用"当你...时，我感到..."代替指责；第三步，寻找需求的共同点——从对立的表面现象深入到共同的核心需求。

【效果展示】 我的来访者李先生夫妇，从每天争吵到几乎离婚，应用这个方法仅 3 周，就重新找回了连接。关键转折是当他们发现表面争吵的养育方式，深层都是关心孩子成长的共同愿望。

【专业建议】 记住，修复婚姻需要双方努力，但改变常常始于一人。尝试 30天不批评不指责，寻找伴侣优点并真诚表达欣赏，这个简单习惯已帮助无数婚姻走出危机。如果矛盾持续加深，请及时寻求专业婚姻咨询师帮助。`,
  },
  {
    id: 'story',
    name: `故事变现式`,
    tag: `故事变现`,
    description: `个人成长、创业经历、减肥健身、财务自由、技能习得、人际关系改善`,
    formula: `故事悬念 + 经历转折 + 方法提炼 + 价值总结 + 行动指导`,
    steps: [
      { name: `故事悬念`, percent: 15, hint: `前 3 秒抓注意力：反常识 / 数字 / 痛点 / 提问` },
      { name: `经历转折`, percent: 20, hint: `一段具体的故事场景，有时间地点人物` },
      { name: `方法提炼`, percent: 30, hint: `拆成 3-5 个具体步骤，每步可执行` },
      { name: `价值总结`, percent: 20, hint: `一句话总结你的核心立场` },
      { name: `行动指导`, percent: 15, hint: `收尾引导互动：点赞 / 评论 / 关注` },
    ],
    example: `【故事悬念】 三年前，我还是一名普通文员，月薪 5000，每天做着重复的表格工作，看不到任何晋升希望。那时我熬夜加班后，经常躲在厕所哭泣，觉得人生毫无出路。

【经历转折】 转机出现在一次偶然的内部培训，我了解到数据分析的重要性。虽然没有专业背景，我还是决定每天挤出 2 小时学习 Excel 和数据可视化。三个月后，我用数据分析发现了部门效率瓶颈，主动做了优化方案，这个小小的改变让我获得了领导的注意。

【方法提炼】 我总结的职场突破三原则是：一、找到组织痛点，解决实际问题；二、量化你的贡献，用数据说话；三、提前布局下一步技能，而不是等待机会。这不需要特殊天赋，只需要系统方法和持续行动。

【价值总结】 如今我已经晋升为数据分析经理，团队 15 人，薪资翻了 4 倍。更重要的是，我找到了职业成就感和存在价值，不再是可替代的"工具人"，而是解决问题的"价值创造者"。

【行动指导】 想知道如何从职场迷茫到找到突破口的详细路径吗？我整理了一份《职场破局指南》，包含技能规划、问题发现和价值展示的全流程方法。点赞关注，评论"职场突破"即可免费获取！`,
  },
  {
    id: 'trend',
    name: `趋势洞察式`,
    tag: `趋势洞察`,
    description: `行业趋势、技术发展、投资方向、教育变革、职业规划、商业模式`,
    formula: `趋势揭示 + 数据支撑 + 机会分析 + 行动指南 + 未来展望`,
    steps: [
      { name: `趋势揭示`, percent: 15, hint: `指出大趋势 / 新机会` },
      { name: `数据支撑`, percent: 20, hint: `一个有冲击力的数字` },
      { name: `机会分析`, percent: 30, hint: `指出大趋势 / 新机会` },
      { name: `行动指南`, percent: 20, hint: `收尾引导互动：点赞 / 评论 / 关注` },
      { name: `未来展望`, percent: 15, hint: `拔高一层 / 给一个愿景` },
    ],
    example: `【趋势揭示】 未来 5 年，超过 40%的传统职位将被 AI 替代或重组，同时创造出全新的工作岗位和职业路径。这场职业大洗牌已经开始，你准备好了吗？

【数据支撑】 世界经济论坛最新报告显示：到 2027 年，数据分析、人工智能和数字营销相关工作需求增长 74%，而传统行政、客服和基础操作类工作需求下降35%。更关键的是，跨领域融合能力的价值正呈指数级提升。

【机会分析】 这场变革中，三类人将成为最大赢家：一是"人机协作专家"，精通 AI 工具辅助决策；二是"问题定义者"，能识别核心业务挑战并构建解决框架；三是"技术翻译官"，能在技术团队和业务团队间架起沟通桥梁。

【行动指南】 抓住这波机遇的三步策略：第一步，掌握至少一种 AI 辅助工具的高级应用；第二步，培养"元认知能力"，学会学习和迁移知识；第三步，构建"T型"技能结构，既有垂直专业深度，又有水平跨界广度。

【未来展望】 未来职场最稀缺的不是单一技能专家，而是"多维复合人才"。当AI 逐渐接管可预测性工作，人类的价值将集中在创新思考、复杂决策和情感智能上。提前布局这些能力，你将成为不可替代的职场赢家。`,
  },
];


// ============ 主持人引导问题库 ============
const HOST_QUESTIONS = {
  opening: [
    '你今天最想跟观众分享的核心观点是什么？',
    '是什么事让你最近开始关注这个话题？',
    '如果用一句话总结你想说的，是什么？',
    '聊这个话题之前，你对它本来的看法是什么？',
    '什么时候你开始意识到这件事很重要？',
    '在你看来，大多数人对这件事最大的误解是什么？',
  ],
  followup: [
    '能再给一个具体的例子吗？',
    '反对的人会怎么说？',
    '这个观点 6 个月前的你会同意吗？',
    '如果只能保留一句话给观众，是哪一句？',
    '你是怎么得出这个结论的？',
    '有没有人尝试过然后失败的？为什么失败？',
    '这个跟大家普遍的看法有什么不一样？',
    '换个角度，弱者会怎么看这件事？',
    '你自己第一次践行的时候，难在哪？',
    '你怎么知道这是对的，不是自我安慰？',
    '如果一个 20 岁的年轻人听到这个，应该怎么用？',
    '这件事的反面是什么？反过来会成立吗？',
    '最让你意外的发现是什么？',
    '如果把这个观点写成一本书，书名会是什么？',
  ],
  closing: [
    '今天聊下来，你觉得对你自己最重要的一点是什么？',
    '如果观众明天只能做一件事来应用这个，是什么？',
    '这次表达过程中，你自己有没有新的发现？',
    '如果重新讲一次，你会怎么开头？',
    '观众听完最该记住的是哪一句？',
    '一句话作为结尾送给观众。',
  ],
};


// ============ Utils ============
const formatTime = (s) => {
  if (s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
};
const pickRandom = (arr, exclude) => {
  let pool = arr.filter(x => x !== exclude);
  if (!pool.length) pool = arr;
  return pool[Math.floor(Math.random() * pool.length)];
};

const splitTeleprompterSentences = (value) => {
  const out = [];
  let current = '';
  const push = () => {
    const sentence = current.trim();
    if (sentence) out.push(sentence);
    current = '';
  };

  for (const ch of String(value || '')) {
    if (ch === '\r') continue;
    if (ch === '\n') {
      push();
      continue;
    }
    current += ch;
    if ('。！？!?'.includes(ch)) push();
  }
  push();
  return out;
};

const sanitizeFilename = (s) => (s || 'untitled')
  .replace(/[\\/:*?"<>|\n\r\t]/g, '')
  .replace(/\s+/g, '_')
  .slice(0, 28).trim() || 'untitled';

const tsForFilename = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
  reader.onerror = () => reject(reader.error || new Error('读取录制文件失败'));
  reader.readAsDataURL(blob);
});

async function saveBlobToNativeDocuments(blob, filename) {
  if (!KOBO_NATIVE?.isNative || !KOBO_NATIVE.Filesystem) return null;
  const data = await blobToBase64(blob);
  const path = `recordings/${filename}`;
  const writeTo = async (directory) => {
    await Filesystem.mkdir({ path: 'recordings', directory, recursive: true }).catch(() => {});
    return Filesystem.writeFile({ path, data, directory, recursive: true });
  };

  try {
    await Filesystem.requestPermissions?.().catch(() => null);
    const result = await writeTo(Directory.Documents);
    return { method: 'native', filename, path, uri: result?.uri || '', directory: 'Documents' };
  } catch (e) {
    console.warn('Native Documents write failed, fallback to app data:', e);
    const result = await writeTo(Directory.Data);
    return { method: 'native', filename, path, uri: result?.uri || '', directory: 'Data' };
  }
}

async function deleteNativeSavedFile(file) {
  if (!KOBO_NATIVE?.isNative || !KOBO_NATIVE.Filesystem || file?.method !== 'native') return;
  const directory = file.directory === 'Data' ? Directory.Data : Directory.Documents;
  const path = file.path || (file.filename ? `recordings/${file.filename}` : '');
  if (!path) return;
  await Filesystem.deleteFile({ path, directory });
}

// 保存视频：Android App 内优先写原生文件系统；Web 端优先写入用户选定目录，否则触发自动下载
async function saveVideoToDisk(blob, label, dirHandle) {
  // 仅音频（纯语音模式）走 audio- 前缀 · 仍用 .webm（WebM 也能装音频）
  const isAudio = blob.type && blob.type.startsWith('audio/');
  const prefix = isAudio ? '口播-audio' : '口播';
  const filename = `${prefix}-${tsForFilename()}-${sanitizeFilename(label)}.webm`;
  if (KOBO_NATIVE?.isNative) {
    try {
      const nativeResult = await saveBlobToNativeDocuments(blob, filename);
      if (nativeResult) return nativeResult;
    } catch (e) {
      console.warn('Native save failed, fallback to browser download:', e);
    }
  }
  if (dirHandle && window.showDirectoryPicker) {
    try {
      const fh = await dirHandle.getFileHandle(filename, { create: true });
      const w = await fh.createWritable();
      await w.write(blob);
      await w.close();
      return { method: 'folder', filename };
    } catch (e) {
      console.warn('FS write failed, fallback to download:', e);
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { try { document.body.removeChild(a); } catch{}; URL.revokeObjectURL(url); }, 1000);
  return { method: 'download', filename };
}

// ============ DeepSeek 调用入口 ============
// 部署 Cloudflare Worker 之后，把 URL 填到这里（详见 kobo-trainer-proxy/README.md）
// 没填用户 key → 走代理（每 IP 50 次/天）· 填了用户 key → 直连无限
const DEEPSEEK_PROXY_URL = 'https://kobo-trainer-proxy.charlielam2025.workers.dev';

async function chatComplete({ apiKey, messages, temperature = 0.7, max_tokens }) {
  const useProxy = !apiKey || !apiKey.trim();
  const url = useProxy
    ? `${DEEPSEEK_PROXY_URL}/v1/chat/completions`
    : 'https://api.deepseek.com/chat/completions';
  const headers = { 'Content-Type': 'application/json' };
  if (!useProxy) headers['Authorization'] = `Bearer ${apiKey}`;

  const body = { model: 'deepseek-chat', messages, temperature };
  if (max_tokens) body.max_tokens = max_tokens;

  let res;
  try {
    res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  } catch (e) {
    if (useProxy) {
      throw new Error('AI 服务暂时连不上 · 可在"设置"里填自己的 DeepSeek 密钥直连');
    }
    throw e;
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
async function deepseekGenerateTopics({ apiKey, theme, count = 6, style = '' }) {
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
async function deepseekExtractKeywords({ apiKey, text, count = 10 }) {
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
async function deepseekDailyGreeting({ apiKey, streak, totalCount, weekCount, dayOfWeek, isRestDay, todayCount, goalCount }) {
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
const NOTIFICATION_ID = 7777;
const NOTIFICATION_BODIES = [
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
const ROUTINE_ANCHORS = [
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
const getRoutineAnchor = (id) => ROUTINE_ANCHORS.find(a => a.id === id) || null;

async function scheduleDailyReminder({ hour = 19, minute = 0, enabled = true, anchorId = null }) {
  const LN = KOBO_NATIVE?.isNative ? KOBO_NATIVE.LocalNotifications : null;
  // Web fallback：用浏览器 Notification API（限制大 · 仅页面打开时有效）
  if (!LN) {
    if (typeof Notification === 'undefined') return { ok:false, reason:'no_support' };
    if (Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch {}
    }
    return { ok: enabled, reason: 'web_limited' };
  }
  try {
    // 取消之前的
    await LN.cancel({ notifications: [{ id: NOTIFICATION_ID }] });
    if (!enabled) return { ok:true, reason:'disabled' };
    // 请求权限
    const perm = await LN.requestPermissions();
    if (perm.display !== 'granted') return { ok:false, reason:'permission_denied' };
    // 调度每日重复 · 如果绑了 anchor 用 anchor 专属文案 · 否则用泛用文案
    const anchor = anchorId ? getRoutineAnchor(anchorId) : null;
    const pool = (anchor && anchor.bodies && anchor.bodies.length) ? anchor.bodies : NOTIFICATION_BODIES;
    const body = pool[Math.floor(Math.random() * pool.length)];
    await LN.schedule({
      notifications: [{
        id: NOTIFICATION_ID,
        title: '🎙️ 口播练习器',
        body,
        schedule: { on: { hour, minute }, allowWhileIdle: true },
        smallIcon: 'ic_stat_icon_config_sample',
        sound: null,
      }],
    });
    return { ok:true, reason:'scheduled' };
  } catch (e) {
    return { ok:false, reason: 'error', error: e?.message || String(e) };
  }
}

async function cancelDailyReminder() {
  const LN = KOBO_NATIVE?.isNative ? KOBO_NATIVE.LocalNotifications : null;
  if (!LN) return;
  try { await LN.cancel({ notifications: [{ id: NOTIFICATION_ID }] }); } catch {}
}

// ============ 口播分析（本地，零成本）============
// 中文口头禅词表（按字符数从长到短，避免 "就是" 被算两次而 "就" 又算）
const FILLER_WORDS = ['我觉得吧', '我觉得', '所以说', '怎么说呢', '然后呢', '反正', '其实', '那个', '这个', '就是', '然后', '所以', '呃', '嗯', '啊'];

// 中文按字算 wpm（去掉空格 + 标点）
function calculateWPM(text, durationSec) {
  if (!text || !durationSec || durationSec < 1) return 0;
  const chars = String(text).replace(/[\s\p{P}]/gu, '').length;
  return Math.round((chars / durationSec) * 60);
}

// 口头禅出现次数（带去重保护：长词先匹配，匹配过的字符替换掉）
function analyzeFillerWords(text) {
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

function wpmBand(wpm) {
  if (wpm < 180) return { label:'偏慢', color:'#A0775B' };
  if (wpm > 320) return { label:'偏快', color:'#A30236' };
  if (wpm > 260) return { label:'紧凑', color:'#F1A23F' };
  return { label:'舒适', color:'#10b981' };
}

// DeepSeek 教练复盘：基于转录稿给 5 维评分 + 改进建议
async function deepseekCoachReview({ apiKey, topic, transcript, durationSec, wpm, fillerTop }) {
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
  });
  let out = (data.choices?.[0]?.message?.content || '').trim();
  out = out.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  const m = out.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('AI 输出非 JSON：' + out.slice(0, 200));
  return JSON.parse(m[0]);
}

// DeepSeek 60 秒剧本生成：给话题 → 钩子 + 论点 + 收尾完整稿
async function deepseekGenerateScript({ apiKey, topic, durationSec = 60, style = '' }) {
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
  "script": "完整稿子（可逐字读 · 段落用真实换行符隔开）",
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
  return JSON.parse(m[0]);
}

// DeepSeek 主持人追问：根据对话历史 + 你刚说的话，生成下一个针对性问题
async function deepseekHostFollowup({ apiKey, topic, history, lastUserSaid, kind = 'followup' }) {
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
const SettingsContext = React.createContext({
  apiKey: '', userApiKey: '', isBuiltinKey: true, setApiKey: () => {},
  saveDir: null, setSaveDir: () => {},
  savedFiles: [], addSavedFile: () => {}, updateSavedFile: () => {}, removeSavedFile: () => {}, clearAllSavedFiles: () => {},
  dailyGoal: { count: 3, durationSec: 60 }, setDailyGoal: () => {},
  unlockedAchievements: [], markAchievementsSeen: () => {},
  lastWeeklyRecap: 0, setLastWeeklyRecap: () => {},
  voiceOnly: false, setVoiceOnly: () => {},
  reminderEnabled: false, setReminderEnabled: () => {},
  reminderTime: '19:00', setReminderTime: () => {},
  routineAnchor: '', setRoutineAnchor: () => {},
});
const useSettings = () => React.useContext(SettingsContext);

// ============ Hooks ============
// 用 callback ref 模式：每当 <video ref={cam.videoRef}> 挂载/重新挂载（比如 stage 切换），
// React 会调用 attachVideo(el)，自动把 stream 接到当前的视频元素上。
// ===== 美颜 + 滤镜预设 =====
// 没有人脸识别的前提下，纯 CSS filter 做"磨皮"只能用 blur，而 blur 是均匀的
// （眼睛 / 头发都会糊）。所以这套预设的设计思路是：
//   1) blur 控制极轻（0.25 – 0.7 px），主要给观感上一层"柔焦"
//   2) 重头戏放在 brightness / saturate / hue-rotate / sepia 这些**调色**参数
//      上 —— 调出来的肤色变化更接近真正的"美颜"，而不是糊。
// 第一性原理：「让你能看见自己 · 而不是看见你想象中的自己」
// 训练工具不需要 8 种调色 · 砍到 3 套：原图 / 柔光（自然提亮）/ 复古（暖调兜底）
// 砍掉：奶油 / 粉嫩 / 冷白 / 港风 / 黑白 ·
// 这些是「让自己变成另一个样子」的滤镜 · 不是「让你能看着自己讲话」的滤镜
const FILTER_PRESETS = [
  { id: 'none',    name: '原图', css: '' },
  // 柔光 —— 自然系，皮肤稍提亮 + 微暖 + 微饱和
  { id: 'soft',    name: '柔光', css: 'brightness(1.04) saturate(1.10) contrast(0.97) hue-rotate(-3deg)' },
  // 复古 —— 低饱和 + 棕调 · 暖色兜底
  { id: 'vintage', name: '复古', css: 'brightness(0.95) contrast(1.06) saturate(0.78) sepia(0.24)' },
];

// 美颜强度 —— 大幅降低 blur 上限（之前 1.3px 太糊）
const BEAUTY_LEVELS = [
  { v: 0, label: '关', blur: 0,    bright: 1,    sat: 1    },
  { v: 1, label: '轻', blur: 0.25, bright: 1.03, sat: 1.04 },
  { v: 2, label: '中', blur: 0.45, bright: 1.05, sat: 1.07 },
  { v: 3, label: '重', blur: 0.70, bright: 1.08, sat: 1.10 },
];

// 滤镜顺序：先做轻微 blur（柔焦），再叠提亮/饱和度，最后套预设调色。
// 这样色调先在原图上跑、再被柔化的细节托住，比"先调色再糊"自然。
const computeFilterCSS = (presetId, level) => {
  const p = FILTER_PRESETS.find(x => x.id === presetId) || FILTER_PRESETS[0];
  const b = BEAUTY_LEVELS[level] || BEAUTY_LEVELS[0];
  const parts = [];
  if (b.blur > 0)     parts.push(`blur(${b.blur}px)`);
  if (b.bright !== 1) parts.push(`brightness(${b.bright})`);
  if (b.sat !== 1)    parts.push(`saturate(${b.sat})`);
  if (p.css)          parts.push(p.css);
  return parts.join(' ').trim() || 'none';
};

// ===== 摄像头 Hook（带美颜/滤镜 + 录制流）=====
// 设计：raw stream 喂给一个隐藏 video，每帧画到 canvas 时套 ctx.filter。
// 显示用的 video 元素直接绑 raw stream + CSS filter（同样的效果，但走 GPU 渲染更顺）。
// MediaRecorder 接 canvas.captureStream() —— 滤镜直接烧进录像。
// ===== MediaPipe Face Landmark 索引（478 点中我们关心的） =====
// 砍掉了瘦脸 / 大眼 · 只剩真磨皮需要 face oval 36 点
const FACE_OVAL_IDX = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];

// 构造路径（landmarks 已经做过 mirror，所以 x 是显示坐标）
const tracePath = (ctx, lm, idx, w, h) => {
  ctx.beginPath();
  for (let i = 0; i < idx.length; i++) {
    const p = lm[idx[i]];
    if (i === 0) ctx.moveTo(p.x * w, p.y * h);
    else         ctx.lineTo(p.x * w, p.y * h);
  }
  ctx.closePath();
};

// 带 progress 的 fetch · 用于 MediaPipe wasm/model 预热缓存
// 浏览器 HTTP cache + SW cache 自然记下 · MediaPipe 后续 fetch 同 URL 走缓存秒到位
// 不返回 body · 只为了让缓存有 · onProgress 收 0-100 整数（基于 Content-Length 比例）
async function fetchWithProgress(url, onProgress) {
  try {
    const res = await fetch(url);
    if (!res.ok || !res.body) return false;
    const total = parseInt(res.headers.get('Content-Length') || '0', 10);
    const reader = res.body.getReader();
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += (value?.length || 0);
      if (total > 0 && typeof onProgress === 'function') {
        onProgress(Math.min(99, Math.round((received / total) * 100)));
      }
    }
    return true;
  } catch { return false; }
}

// ===== 美颜 hook：MediaPipe 检测 + canvas 2D 应用 =====
function useCamera() {
  // 读取全局"纯语音"设置 · settings 可能在 Context 外被调用，因此用 try/catch 兜底
  let voiceOnlySetting = false;
  try {
    const settingsCtx = React.useContext(SettingsContext);
    voiceOnlySetting = !!settingsCtx?.voiceOnly;
  } catch {}
  const voiceOnlyRef = useRef(voiceOnlySetting);
  voiceOnlyRef.current = voiceOnlySetting;

  const streamRef        = useRef(null); // 原始 getUserMedia 流
  const videoElRef       = useRef(null); // 显示用 <video>（带 CSS filter）
  const hiddenVideoRef   = useRef(null); // 隐藏 <video>，喂给 canvas
  const canvasRef        = useRef(null); // 输出 canvas（送录像器）
  const scratchRef       = useRef(null); // 临时 canvas（磨皮模糊/区域捕获）
  const filteredStreamRef= useRef(null); // canvas.captureStream + audio
  const rafRef           = useRef(null);
  const filterCSSRef     = useRef('none');

  const landmarkerRef    = useRef(null); // MediaPipe FaceLandmarker 实例
  const segmenterRef     = useRef(null); // MediaPipe ImageSegmenter 实例（selfie）
  const maskCanvasRef    = useRef(null); // 缓存的人像 mask（用于背景虚化合成）

  const [filterPreset, setFilterPreset] = useState('none');
  const [beautyLevel,  setBeautyLevel]  = useState(0);
  // 真磨皮 / 背景虚化（0-1 浮点）· 砍掉瘦脸 / 大眼
  // 第一性原理：训练工具不变形脸 · 只柔焦皮肤 + 模糊背景 · 让你看到的是真的你 · 只是更舒服
  const [skinSmooth,   setSkinSmooth]   = useState(0);
  const [bgBlur,       setBgBlur]       = useState(0);
  const [faceFxReady,  setFaceFxReady]  = useState(false); // MediaPipe 是否加载就绪
  const [faceFxLoading,setFaceFxLoading]= useState(false);
  // 0-100 · 用 fetchWithProgress 预热缓存的实时进度 · 让用户知道在下东西 · 不是 app 卡死
  const [faceFxProgress, setFaceFxProgress] = useState(0);
  const skinRef = useRef(0); skinRef.current = skinSmooth;
  const bgBlurRef = useRef(0); bgBlurRef.current = bgBlur;

  const [active, setActive] = useState(false);
  const [error,  setError]  = useState(null);

  // 监听 MediaPipe ready
  useEffect(() => {
    if (window.__MEDIAPIPE) setFaceFxReady(true);
    const onReady = () => setFaceFxReady(true);
    window.addEventListener('mediapipe-ready', onReady);
    return () => window.removeEventListener('mediapipe-ready', onReady);
  }, []);

  // 同步 CSS 滤镜到显示元素
  useEffect(() => {
    const css = computeFilterCSS(filterPreset, beautyLevel);
    filterCSSRef.current = css;
    if (videoElRef.current) videoElRef.current.style.filter = css;
  }, [filterPreset, beautyLevel]);

  // 懒加载 FaceLandmarker：用户开启任一面部 FX 时才初始化
  // 关键改造：在调 MediaPipe 之前 · 用 fetchWithProgress 预热 wasm + model 的缓存
  //   · 14MB 下载用真实进度条 · 不再「点了等 10 秒以为 app 死了」
  const ensureLandmarker = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current;
    if (!window.__MEDIAPIPE) return null;
    setFaceFxLoading(true);
    setFaceFxProgress(0);
    try {
      const { FilesetResolver, FaceLandmarker } = window.__MEDIAPIPE;
      const wasmUrl  = new URL('./mediapipe/vision_wasm_internal.wasm', window.location.href).href;
      const modelUrl = new URL('./mediapipe/face_landmarker.task', window.location.href).href;
      // 预热缓存 · wasm (~9.5MB) 占 70% · model (~3.8MB) 占 30%
      await Promise.all([
        fetchWithProgress(wasmUrl,  p => setFaceFxProgress(Math.round(p * 0.7))),
        fetchWithProgress(modelUrl, p => setFaceFxProgress(70 + Math.round(p * 0.3))),
      ]);
      setFaceFxProgress(95);  // 真正实例化 MediaPipe（拿缓存 · 通常 < 1s）
      const vision = await FilesetResolver.forVisionTasks(new URL('./mediapipe/', window.location.href).href);
      const lm = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: modelUrl, delegate: 'GPU' },
        outputFaceBlendshapes: false,
        runningMode: 'VIDEO',
        numFaces: 1,
      });
      landmarkerRef.current = lm;
      setFaceFxProgress(100);
      return lm;
    } catch (e) {
      console.warn('[FaceLandmarker] init failed:', e?.message || e);
      return null;
    } finally {
      setFaceFxLoading(false);
    }
  }, []);

  // 懒加载 ImageSegmenter：背景虚化打开时才初始化
  // 同样先用 fetchWithProgress 预热 · 跟 ensureLandmarker 共用同一 progress state
  const ensureSegmenter = useCallback(async () => {
    if (segmenterRef.current) return segmenterRef.current;
    if (!window.__MEDIAPIPE) return null;
    setFaceFxLoading(true);
    setFaceFxProgress(0);
    try {
      const { FilesetResolver, ImageSegmenter } = window.__MEDIAPIPE;
      const wasmUrl  = new URL('./mediapipe/vision_wasm_internal.wasm', window.location.href).href;
      const modelUrl = new URL('./mediapipe/selfie_segmenter.tflite', window.location.href).href;
      // wasm 占 90%（9.5MB）· segmenter 模型只有 ~240KB · 占 10% 已足够
      await Promise.all([
        fetchWithProgress(wasmUrl,  p => setFaceFxProgress(Math.round(p * 0.9))),
        fetchWithProgress(modelUrl, p => setFaceFxProgress(90 + Math.round(p * 0.1))),
      ]);
      setFaceFxProgress(95);
      const vision = await FilesetResolver.forVisionTasks(new URL('./mediapipe/', window.location.href).href);
      const sg = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: { modelAssetPath: modelUrl, delegate: 'GPU' },
        runningMode: 'VIDEO',
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      });
      segmenterRef.current = sg;
      setFaceFxProgress(100);
      return sg;
    } catch (e) {
      console.warn('[ImageSegmenter] init failed:', e?.message || e);
      return null;
    } finally {
      setFaceFxLoading(false);
    }
  }, []);

  // 任意面部 FX 强度变化 → 触发初始化
  useEffect(() => {
    if (skinSmooth > 0) {
      ensureLandmarker();
    }
    if (bgBlur > 0) {
      ensureSegmenter();
    }
  }, [skinSmooth, bgBlur, ensureLandmarker, ensureSegmenter]);

  const attachVideo = useCallback((el) => {
    videoElRef.current = el;
    if (el) {
      el.style.filter = filterCSSRef.current;
      if (streamRef.current) {
        el.srcObject = streamRef.current;
        el.muted = true;
        el.play().catch(() => {});
      }
    }
  }, []);

  const start = useCallback(async () => {
    try {
      // 🎙️ 纯语音模式：跳过所有 video 设置 · audio-only 流
      if (voiceOnlyRef.current) {
        const s = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        streamRef.current = s;
        filteredStreamRef.current = s; // 没有 canvas 处理 · 录制直接录 audio
        setActive(true);
        setError(null);
        return s;
      }
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: true,
      });
      streamRef.current = s;

      const hv = document.createElement('video');
      hv.srcObject = s;
      hv.muted = true; hv.playsInline = true; hv.autoplay = true;
      try { await hv.play(); } catch {}
      hiddenVideoRef.current = hv;

      const canvas = canvasRef.current || (() => {
        const c = document.createElement('canvas');
        c.width = 1280; c.height = 720;
        canvasRef.current = c;
        return c;
      })();
      const ctx = canvas.getContext('2d');

      const scratch = scratchRef.current || (() => {
        const c = document.createElement('canvas');
        c.width = 1280; c.height = 720;
        scratchRef.current = c;
        return c;
      })();
      const sctx = scratch.getContext('2d');

      // 限频面部检测：每 ~80ms（≈12fps）跑一次，结果缓存到下次绘制
      let lastDetectTime = 0;
      let cachedLandmarks = null;
      // 限频人像分割：每 ~100ms 跑一次，mask 缓存在 maskCanvasRef
      let lastSegTime = 0;

      const draw = () => {
        if (hv.videoWidth) {
          if (canvas.width  !== hv.videoWidth)  { canvas.width  = hv.videoWidth;  scratch.width  = hv.videoWidth;  }
          if (canvas.height !== hv.videoHeight) { canvas.height = hv.videoHeight; scratch.height = hv.videoHeight; }

          const W = canvas.width, H = canvas.height;
          const skin = skinRef.current;
          const needFx = skin > 0;

          // 面部检测（限频）
          if (needFx && landmarkerRef.current) {
            const now = performance.now();
            if (now - lastDetectTime > 80) {
              try {
                const r = landmarkerRef.current.detectForVideo(hv, now);
                cachedLandmarks = (r.faceLandmarks && r.faceLandmarks.length) ? r.faceLandmarks[0] : null;
              } catch (e) { /* swallow */ }
              lastDetectTime = now;
            }
          } else {
            cachedLandmarks = null;
          }

          // 第一步：清空 + 把镜像后的原始帧画到主 canvas（不带 ctx.filter）
          try { ctx.filter = 'none'; } catch {}
          ctx.save();
          ctx.scale(-1, 1);
          ctx.drawImage(hv, -W, 0, W, H);
          ctx.restore();

          // 第二步：如果检测到人脸 + 用户开启了真磨皮 → 在主 canvas 上局部柔焦
          // 砍掉了瘦脸 / 大眼形变 · 训练工具不变形脸 · 只在皮肤区域柔焦
          if (cachedLandmarks && needFx && skin > 0) {
            // landmarks 来自原始视频，但主 canvas 是镜像的，所以 x 要反向
            const lm = cachedLandmarks.map(p => ({ x: 1 - p.x, y: p.y }));
            const blurPx = 5 + skin * 9; // 强度 0→1 时 5→14 px
            sctx.clearRect(0, 0, W, H);
            try { sctx.filter = `blur(${blurPx}px)`; } catch {}
            sctx.drawImage(canvas, 0, 0);
            try { sctx.filter = 'none'; } catch {}
            ctx.save();
            tracePath(ctx, lm, FACE_OVAL_IDX, W, H);
            ctx.clip();
            ctx.globalAlpha = Math.min(0.92, skin * 0.85);
            ctx.drawImage(scratch, 0, 0);
            ctx.globalAlpha = 1;
            ctx.restore();
          }

          // 第三步：背景虚化 —— 用 selfie 分割把人物保留清晰、背景做高斯模糊
          const bgB = bgBlurRef.current;
          if (bgB > 0 && segmenterRef.current) {
            const now = performance.now();
            // 限频跑一次 segmentation，写入 maskCanvas
            if (now - lastSegTime > 100) {
              try {
                const seg = segmenterRef.current.segmentForVideo(hv, now);
                if (seg && seg.categoryMask) {
                  const mk = seg.categoryMask;
                  const mw = mk.width, mh = mk.height;
                  const arr = mk.getAsUint8Array();
                  let mc = maskCanvasRef.current;
                  if (!mc) { mc = document.createElement('canvas'); maskCanvasRef.current = mc; }
                  if (mc.width !== mw)  mc.width  = mw;
                  if (mc.height !== mh) mc.height = mh;
                  const mctx = mc.getContext('2d');
                  const md = mctx.createImageData(mw, mh);
                  // selfie_segmenter（Tasks Vision）：class 0 = 背景，class 1 = 人物。
                  // 用 arr[i] !== 0 既兼容 0/1 也兼容 0/255 的输出。
                  for (let i = 0; i < arr.length; i++) {
                    const isFg = arr[i] !== 0;
                    const o = i * 4;
                    md.data[o]     = 255;
                    md.data[o + 1] = 255;
                    md.data[o + 2] = 255;
                    md.data[o + 3] = isFg ? 255 : 0;
                  }
                  mctx.putImageData(md, 0, 0);
                  try { mk.close(); } catch {}
                }
              } catch (e) { /* swallow */ }
              lastSegTime = now;
            }

            // 用缓存的 mask 合成：sharp 前景 + blurred 背景
            const mc = maskCanvasRef.current;
            if (mc && mc.width > 0) {
              // 备份当前 canvas（带面部 FX 的清晰版）到 scratch
              sctx.save();
              sctx.globalCompositeOperation = 'source-over';
              sctx.clearRect(0, 0, W, H);
              sctx.drawImage(canvas, 0, 0);
              sctx.restore();

              // 主 canvas 改成高斯模糊版（用 scratch 当源，避免 in-place blur 兼容性问题）
              const blurPx = 6 + bgB * 22; // 6 ~ 28 px
              ctx.save();
              try { ctx.filter = `blur(${blurPx}px)`; } catch {}
              ctx.clearRect(0, 0, W, H);
              ctx.drawImage(scratch, 0, 0);
              try { ctx.filter = 'none'; } catch {}
              ctx.restore();

              // 把 mask 镜像后乘到 scratch 上（destination-in：只保留人物像素）
              // hv 没镜像，但 canvas/scratch 都镜像过，所以 mask 要水平翻转再画
              sctx.save();
              sctx.globalCompositeOperation = 'destination-in';
              sctx.translate(W, 0);
              sctx.scale(-1, 1);
              sctx.drawImage(mc, 0, 0, W, H);
              sctx.restore();

              // sharp 前景叠到模糊背景上
              ctx.drawImage(scratch, 0, 0);
            }
          }

          // 第四步：套 CSS 滤镜（套到整张图上，作为最终调色）
          if (filterCSSRef.current !== 'none' && filterCSSRef.current) {
            // 通过 scratch 中转避免 ctx.filter 多次应用的开销
            sctx.clearRect(0, 0, W, H);
            try { sctx.filter = filterCSSRef.current; } catch {}
            sctx.drawImage(canvas, 0, 0);
            try { sctx.filter = 'none'; } catch {}
            ctx.clearRect(0, 0, W, H);
            ctx.drawImage(scratch, 0, 0);
          }
        }
        rafRef.current = requestAnimationFrame(draw);
      };
      draw();

      const canvasStream = canvas.captureStream(30);
      s.getAudioTracks().forEach(t => canvasStream.addTrack(t));
      filteredStreamRef.current = canvasStream;

      if (videoElRef.current) {
        videoElRef.current.srcObject = s;
        videoElRef.current.muted = true;
        videoElRef.current.style.filter = filterCSSRef.current;
        try { await videoElRef.current.play(); } catch {}
      }

      setActive(true);
      setError(null);
      return canvasStream;
    } catch (err) {
      setError(err.message || String(err));
      return null;
    }
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (filteredStreamRef.current) {
      filteredStreamRef.current.getTracks().forEach(t => t.stop());
      filteredStreamRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (hiddenVideoRef.current) {
      try { hiddenVideoRef.current.srcObject = null; } catch {}
      hiddenVideoRef.current = null;
    }
    if (videoElRef.current) {
      try { videoElRef.current.srcObject = null; } catch {}
    }
    setActive(false);
  }, []);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (landmarkerRef.current) { try { landmarkerRef.current.close(); } catch {} landmarkerRef.current = null; }
    if (segmenterRef.current)  { try { segmenterRef.current.close(); }  catch {} segmenterRef.current  = null; }
    maskCanvasRef.current = null;
  }, []);

  return {
    videoRef: attachVideo,
    active, error, start, stop,
    filterPreset, setFilterPreset,
    beautyLevel,  setBeautyLevel,
    skinSmooth,   setSkinSmooth,
    bgBlur,       setBgBlur,
    faceFxReady,  faceFxLoading,  faceFxProgress,
    voiceOnly: voiceOnlySetting,
    streamRef, // 给 AudioVisualizer 用
  };
}

function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState(null);
  const [duration, setDuration] = useState(0);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startTimeRef = useRef(0);
  const intervalRef = useRef(null);

  const start = useCallback((stream) => {
    if (!stream) return;
    chunksRef.current = [];
    setBlob(null);
    // 检查是否仅音频流（纯语音模式）· 没有 video track
    const hasVideo = stream.getVideoTracks && stream.getVideoTracks().length > 0;
    let options = {};
    const candidates = hasVideo
      ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      : ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
    for (const c of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(c)) { options.mimeType = c; break; }
    }
    const r = new MediaRecorder(stream, options);
    r.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
    r.onstop = () => {
      const b = new Blob(chunksRef.current, { type: options.mimeType || 'video/webm' });
      setBlob(b);
    };
    r.start(1000);
    recorderRef.current = r;
    startTimeRef.current = Date.now();
    setDuration(0);
    setRecording(true);
    intervalRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 250);
  }, []);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch {}
    }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setRecording(false);
  }, []);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  return { recording, blob, duration, start, stop };
}

// ============ 通用 UI ============
const Btn = ({ children, onClick, variant='primary', size='md', className='', disabled, ...rest }) => {
  const base = 'inline-flex items-center justify-center gap-2 font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed font-body tracking-wide focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A30236] focus-visible:ring-offset-2 focus-visible:ring-offset-white active:translate-y-px';
  const sizes = {
    sm: 'px-3 py-1.5 text-[12px]',
    md: 'px-5 py-2.5 text-[13px]',
    lg: 'px-7 py-3.5 text-[14px]',
  };
  // Square-ish corners (3px) — RANEPA leans hard on rectangles
  const radius = 'rounded';
  const variants = {
    // primary = solid crimson, white text — the brand CTA
    primary:   'bg-[#A30236] text-white hover:bg-[#8E0230] active:bg-[#700024]',
    // secondary = paper with hairline + ink text
    secondary: 'bg-white text-stone-900 border border-stone-200 hover:border-stone-900 hover:bg-stone-50',
    // ghost = transparent text-only
    ghost:     'text-stone-700 hover:text-[#A30236] hover:bg-stone-100',
    // danger = inverted dark (since crimson is already primary)
    danger:    'bg-stone-900 text-white hover:bg-stone-950',
    // accent = navy fill — the second brand colour
    accent:    'bg-[#061A6C] text-white hover:bg-[#001A71]',
    record:    'bg-[#A30236] text-white hover:bg-[#8E0230] active:bg-[#700024] shadow-lg',
    quiet:     'bg-stone-100 text-stone-700 hover:bg-stone-200',
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${radius} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
};

const Card = ({ children, className='' }) => (
  <div className={`bg-white border border-stone-200 ${className}`} style={{borderRadius:'4px'}}>{children}</div>
);

const Tag = ({ children, color='stone' }) => {
  // RANEPA-styled square tag, no rounded pill
  const map = {
    stone:   'bg-stone-100   text-stone-700 border-stone-200',
    amber:   'bg-[#FBEFF2]   text-[#A30236] border-[#F4D4DD]',
    rose:    'bg-[#FBEFF2]   text-[#A30236] border-[#F4D4DD]',
    red:     'bg-[#FBEFF2]   text-[#A30236] border-[#F4D4DD]',
    orange:  'bg-[#FFF6EC]   text-[#A30236] border-[#FCE6CC]',
    violet:  'bg-[#E9EBF5]   text-[#061A6C] border-[#C5CBE6]',
    emerald: 'bg-[#EEF6F0]   text-[#264F30] border-[#B6D8BC]',
    sky:     'bg-[#E9EBF5]   text-[#061A6C] border-[#C5CBE6]',
  };
  return (
    <span className={`inline-block px-2 py-[2px] text-[10px] tracking-[0.14em] uppercase font-medium border whitespace-nowrap ${map[color]||map.stone}`} style={{borderRadius:'2px'}}>{children}</span>
  );
};

const RecordingModeChooser = ({ compact = false, className = '' }) => {
  const s = useSettings();
  const activeVideo = !s.voiceOnly;
  const itemBase = 'flex-1 text-left border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A30236] focus-visible:ring-offset-2 focus-visible:ring-offset-white';
  const itemActive = 'border-[#A30236] bg-[#FBEFF2] text-[#A30236]';
  const itemIdle = 'border-stone-200 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50';
  return (
    <div className={`border border-stone-200 bg-stone-50 ${compact ? 'p-3' : 'p-4'} ${className}`} style={{borderRadius:'4px'}}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-stone-400 text-[9px] tracking-[0.18em] uppercase font-semibold">REC MODE</div>
          <div className="font-display font-bold text-stone-900 text-[14px] leading-tight mt-0.5">录制方式</div>
        </div>
        <Tag color={activeVideo ? 'emerald' : 'amber'}>{activeVideo ? '视频录像' : '纯录音'}</Tag>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={activeVideo}
          aria-label="视频录像 · 默认模式"
          title="视频录像 · 默认模式"
          onClick={() => s.setVoiceOnly(false)}
          className={`${itemBase} ${activeVideo ? itemActive : itemIdle} ${compact ? 'px-3 py-2.5' : 'px-3.5 py-3'}`}
          style={{borderRadius:'3px'}}
        >
          <div className="flex items-center gap-2 font-bold text-[13px]">
            <Icon name="rec" size={14} strokeWidth={1.8}/>
            <span className="leading-snug">
              <span className="whitespace-nowrap">视频录像</span>
              <span className="whitespace-nowrap"> · 默认模式</span>
            </span>
          </div>
          {!compact && <div className="text-[11px] leading-snug mt-1 opacity-75">打开摄像头，练镜头感、表情和停顿。</div>}
        </button>
        <button
          type="button"
          aria-pressed={!activeVideo}
          onClick={() => s.setVoiceOnly(true)}
          className={`${itemBase} ${!activeVideo ? itemActive : itemIdle} ${compact ? 'px-3 py-2.5' : 'px-3.5 py-3'}`}
          style={{borderRadius:'3px'}}
        >
          <div className="flex items-center gap-2 font-bold text-[13px]">
            <Icon name="mic" size={14} strokeWidth={1.8}/> 纯录音
          </div>
          {!compact && <div className="text-[11px] leading-snug mt-1 opacity-75">只练声音时再切换，适合通勤或怕打扰。</div>}
        </button>
      </div>
      {compact && (
        <div className="text-[10px] text-stone-500 mt-2 leading-snug">
          默认会打开摄像头；只练声音时再切换。
        </div>
      )}
    </div>
  );
};

const UI = {
  crimson: '#A30236',
  crimsonDark: '#700024',
  amber: '#F1A23F',
  navy: '#061A6C',
  stoneBg: '#FAFAF9',
  border: '#E6E6E6',
};

const cx = (...parts) => parts.filter(Boolean).join(' ');

const SectionHeader = ({ eyebrow, title, detail, action }) => (
  <div className="flex items-start justify-between gap-4 mb-4">
    <div className="min-w-0">
      {eyebrow && (
        <div className="text-[10px] font-bold uppercase text-stone-400 mb-1 tracking-[0.16em]">
          {eyebrow}
        </div>
      )}
      <h2 className="font-display font-bold text-stone-900 text-[20px] leading-tight">
        {title}
      </h2>
      {detail && <p className="text-[12px] text-stone-500 mt-1 leading-relaxed">{detail}</p>}
    </div>
    {action}
  </div>
);

const MetricTile = ({ label, value, detail, tone = 'stone', icon }) => {
  const tones = {
    stone: 'bg-white border-stone-200 text-stone-900',
    crimson: 'bg-[#FBEFF2] border-[#F4D4DD] text-[#A30236]',
    amber: 'bg-[#FFF6EC] border-[#FCE6CC] text-[#8E0230]',
    emerald: 'bg-[#EEF6F0] border-[#B6D8BC] text-[#264F30]',
    navy: 'bg-[#E9EBF5] border-[#C5CBE6] text-[#061A6C]',
  };
  return (
    <div className={cx('border p-3 min-w-0', tones[tone] || tones.stone)} style={{borderRadius: '4px'}}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[10px] font-bold uppercase text-stone-500 tracking-[0.14em]">{label}</span>
        {icon}
      </div>
      <div className="font-display font-bold text-[22px] leading-none tabular-nums truncate">{value}</div>
      {detail && <div className="text-[11px] opacity-70 mt-1 truncate">{detail}</div>}
    </div>
  );
};

const ActionPanel = ({ children, className = '', tone = 'default' }) => {
  const toneClass = tone === 'dark'
    ? 'bg-stone-950 text-white border-stone-800'
    : 'bg-white text-stone-900 border-stone-200';
  return (
    <section className={cx('border shadow-sm', toneClass, className)} style={{borderRadius: '6px'}}>
      {children}
    </section>
  );
};

// ============ Top Bar ============
const TopBar = ({ mode, onBack, onOpenSettings }) => {
  const labels = {
    improv:        { cn: '即兴练习',          no: '01', desc: '抛话题 + 倒计时' },
    teleprompter:  { cn: '爆款文案复刻',      no: '02', desc: '粘贴 → 提词器' },
    host:          { cn: '播客主持人引导',    no: '03', desc: '一步步追问' },
    tutorial:      { cn: '教程模式',          no: '04', desc: '学框架 → 立即实践' },
  };
  const cur = labels[mode] || { cn: '', no: '', desc: '' };
  return (
    <header className="border-b border-stone-200 bg-white sticky top-0 z-10">
      {/* slim crimson top edge */}
      <div className="h-[3px] bg-[#A30236]" />
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <button onClick={onBack} className="text-stone-500 hover:text-[#A30236] text-[12px] font-medium flex items-center gap-2 tracking-wider">
            <span className="text-[14px]">←</span> 返回
          </button>
          <span className="w-px h-5 bg-stone-200" />
          <div className="flex items-baseline gap-3">
            <span className="stat-num" style={{fontSize:'22px'}}>{cur.no}</span>
            <span className="rule-crimson" />
            <div className="leading-tight">
              <h2 className="font-display font-bold text-[18px] text-stone-900 m-0">{cur.cn}</h2>
              <div className="text-stone-500 text-[12px] mt-0.5">{cur.desc}</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onOpenSettings} className="text-stone-500 hover:text-[#A30236] text-[12px] font-medium tracking-wider" title="设置">
            ⌘ 设置</button>
        </div>
      </div>
    </header>
  );
};

// ============ Ready Overlay (3-2-1) ============
const ReadyOverlay = ({ countdown, videoRef, hint, voiceOnly = false }) => (
  <div className="absolute inset-0 bg-stone-950 z-50" style={{borderRadius:0}}>
    {/* 摄像头 —— 自拍模式（镜像），全屏可见以便用户构图 · 纯语音模式不渲染 video */}
    {voiceOnly ? (
      <div className="absolute inset-0 flex items-center justify-center" style={{background:'linear-gradient(135deg, #3a0716 0%, #1c1917 100%)'}}>
        <div className="text-7xl opacity-50">🎙️</div>
      </div>
    ) : (
      <video ref={videoRef} autoPlay playsInline muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />
    )}
    {/* 半透明遮罩让倒计时更易读 */}
    <div className="absolute inset-0" style={{background:'linear-gradient(to bottom, rgba(15,15,15,0.78) 0%, rgba(15,15,15,0.45) 40%, rgba(15,15,15,0.45) 60%, rgba(15,15,15,0.78) 100%)'}} />

    {/* RANEPA frame chrome: thin crimson rules + corner ticks */}
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#A30236]" />
      <div className="absolute top-6 left-8 right-8 flex items-center justify-between text-white/80 text-[11px] tracking-[0.22em] font-bold">
        <span>准备录制</span>
        <span>{countdown > 0 ? countdown : 0} 秒后开录</span>
      </div>
      <div className="absolute bottom-6 left-8 right-8 flex items-center justify-between text-white/60 text-[10px] tracking-[0.22em] font-bold">
        <span>KOBO · 口播练习器</span>
        <span>2026 · № 01</span>
      </div>
    </div>

    {/* 中央倒计时 + 话题提示 */}
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center fade-in px-6">
      {hint && (
        <div className="mb-8 max-w-2xl border border-white/20 bg-stone-950/70 px-7 py-5 text-stone-100" style={{borderRadius:'4px'}}>
          <div className="eyebrow eyebrow--crimson mb-2" style={{color:"#F1A23F"}}>本次话题</div>
          <div className="font-display font-bold leading-snug text-[18px]">{hint}</div>
        </div>
      )}
      <div className="relative">
        <div className="font-display font-bold tabular-nums leading-none"
             style={{fontSize:'clamp(120px, 22vw, 260px)', color:'#fff', letterSpacing:'-0.04em'}}>
          {countdown > 0 ? countdown : 'GO'}
        </div>
        {/* big crimson underline rule */}
        <div className="mx-auto mt-4 h-[3px] bg-[#A30236]" style={{width:'min(60vw, 360px)'}} />
      </div>
      {countdown > 0 && (
        <div className="mt-4 text-white/70 text-[12px] tracking-[0.22em] font-bold">{countdown} 秒后开始录制</div>
      )}
    </div>

    {/* 顶部左：摄像头实时指示 */}
    <div className="absolute top-12 left-8 flex items-center gap-2 bg-white text-stone-900 px-3 py-1.5 text-[11px] tracking-[0.2em] font-bold border-l-[3px] border-[#A30236]" style={{borderRadius:'2px'}}>
      <span className="w-1.5 h-1.5 bg-[#A30236] pulse-rec" />
      摄像头已开启
    </div>
  </div>
);

// ============ Camera Frame ============
const CameraFrame = ({ videoRef, overlay, className='', voiceOnly = false, streamRef = null, status = 'idle' }) => {
  const statusRing = status === 'recording'
    ? 'ring-2 ring-[#A30236] ring-offset-1 ring-offset-stone-950'
    : status === 'preparing'
      ? 'ring-2 ring-[#F1A23F] ring-offset-1 ring-offset-stone-950'
      : 'border border-stone-800';
  const frameClass = cx('relative overflow-hidden bg-stone-950 min-h-[360px]', statusRing, className);
  if (voiceOnly) {
    return (
      <div className={cx(frameClass, 'bg-gradient-to-br from-stone-950 via-stone-900 to-[#3a0716]')}>
        <AudioVisualizer streamRef={streamRef} />
        {overlay}
      </div>
    );
  }
  return (
    <div className={frameClass}>
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{transform:'scaleX(-1)'}} />
      {overlay}
    </div>
  );
};

const PracticeStageOverlay = ({ topic, modeLabel, elapsed, duration, status, onStop }) => {
  const statusText = {
    recording: '录制中',
    preparing: '准备中',
    idle: '待开始',
  }[status] || status;
  return (
  <div className="absolute inset-0 pointer-events-none">
    <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-3">
      <div className="bg-stone-950/80 text-white px-3 py-2 backdrop-blur max-w-[70%]" style={{borderRadius:'4px'}}>
        <div className="text-[9px] font-bold text-white/50 mb-1 tracking-[0.16em]">{modeLabel}</div>
        <div className="font-display font-bold text-[14px] leading-snug line-clamp-3">{topic}</div>
      </div>
      <div className="bg-white text-stone-950 px-3 py-2 text-right" style={{borderRadius:'4px'}}>
        <div className="text-[9px] font-bold text-stone-400 tracking-[0.16em]">{statusText}</div>
        <div className="font-display font-bold text-[18px] tabular-nums">{formatTime(elapsed || 0)}</div>
        {duration ? <div className="text-[10px] text-stone-500">总时长 {formatTime(duration)}</div> : null}
      </div>
    </div>
    {status === 'recording' && (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
        <button onClick={onStop}
          className="bg-[#A30236] text-white px-5 py-3 font-bold flex items-center gap-2 shadow-lg"
          style={{borderRadius:'999px'}}>
          <span className="w-2 h-2 rounded-full bg-white pulse-rec" />
          停止录制
        </button>
      </div>
    )}
  </div>
  );
};

const PromptWorkbench = ({ title, detail, bullets = [], action }) => (
  <ActionPanel className="p-4">
    <SectionHeader eyebrow="提词" title={title} detail={detail} action={action} />
    {bullets.length > 0 && (
      <div className="space-y-2">
        {bullets.map((item, idx) => (
          <div key={`${idx}-${item}`} className="flex gap-3 text-[13px] text-stone-700 leading-relaxed">
            <span className="font-display font-bold text-[#A30236] tabular-nums">{String(idx + 1).padStart(2, '0')}</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    )}
  </ActionPanel>
);

// 音频可视化：脉动圆 + 实时振幅条
const AudioVisualizer = ({ streamRef }) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const ctxRef = useRef(null);
  const analyserRef = useRef(null);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    const stream = streamRef?.current;
    if (!stream) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArr = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(dataArr);
        // 计算平均振幅（0-255）
        let sum = 0;
        for (let i = 0; i < dataArr.length; i++) sum += dataArr[i];
        const avg = sum / dataArr.length / 255;
        setLevel(avg);

        // 绘制柱状波形
        const canvas = canvasRef.current;
        if (canvas) {
          const w = canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
          const h = canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
          const cctx = canvas.getContext('2d');
          cctx.clearRect(0, 0, w, h);
          const bars = 48;
          const bw = w / bars / 2;
          const step = Math.floor(dataArr.length / bars);
          for (let i = 0; i < bars; i++) {
            const v = dataArr[i * step] / 255;
            const bh = v * h * 0.65;
            const x = i * (bw * 2) + bw;
            const y = h - bh - 4;
            const grad = cctx.createLinearGradient(0, y, 0, h);
            grad.addColorStop(0, '#F1A23F');
            grad.addColorStop(1, '#A30236');
            cctx.fillStyle = grad;
            cctx.fillRect(x, y, bw * 1.4, bh);
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      setError(e.message || String(e));
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try { ctxRef.current?.close(); } catch {}
    };
  }, [streamRef]);

  const ringScale = 1 + level * 0.45;
  const ringOpacity = 0.35 + level * 0.4;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden">
      {/* 脉动圆 */}
      <div className="relative w-44 h-44 flex items-center justify-center mb-6">
        <div className="absolute inset-0 rounded-full bg-[#A30236]/20 transition-transform duration-100 ease-out"
          style={{transform: `scale(${ringScale * 1.2})`, opacity: ringOpacity * 0.6}} />
        <div className="absolute inset-4 rounded-full bg-[#A30236]/30 transition-transform duration-100 ease-out"
          style={{transform: `scale(${ringScale})`, opacity: ringOpacity}} />
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#F1A23F] to-[#A30236] flex items-center justify-center text-5xl shadow-2xl">
          🎙️
        </div>
      </div>

      {/* 实时波形 */}
      <canvas ref={canvasRef} className="w-full h-24 max-w-md px-6" />

      {/* 状态字 */}
      <div className="text-center mt-4 px-6">
        <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-amber-300 mb-1">
          🎙️ 纯语音模式 · 摄像头关闭
        </div>
        <div className="text-white/50 text-[11px]">
          {level < 0.02 ? '听不到声音 · 试着说话' : level < 0.15 ? '声音偏轻 · 可以放大' : level > 0.6 ? '声音偏大 · 可以收一点' : '✓ 音量正好'}
        </div>
        {error && <div className="text-red-300 text-[10px] mt-2">{error}</div>}
      </div>
    </div>
  );
};

// ============ Beauty / Filter Sheet ============
// 滑杆组件（深色面板用）
const Slider = ({ label, value, onChange, hint }) => (
  <div>
    <div className="flex items-baseline justify-between mb-1">
      <span className="text-white text-xs font-semibold">{label}</span>
      <span className="text-amber-300 text-[10px] tabular-nums">{Math.round(value * 100)}%</span>
    </div>
    <input type="range" min="0" max="100" value={Math.round(value * 100)}
      onChange={e => onChange((+e.target.value) / 100)}
      className="w-full accent-[#A30236]"
      style={{height:'4px'}} />
    {hint && <div className="text-[10px] text-white/40 mt-0.5">{hint}</div>}
  </div>
);

const FilterSheet = ({ cam, onClose }) => {
  const [tab, setTab] = useState('beauty'); // beauty | filter
  return (
    <div className="absolute inset-x-0 bottom-0 z-[80] bg-stone-950/95 backdrop-blur px-4 pt-3 fade-in"
         style={{borderTop:'1px solid rgba(255,255,255,0.08)', paddingBottom:'calc(env(safe-area-inset-bottom, 0px) + 16px)'}}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon name="sparkle" size={14} style={{color:'#F1A23F'}} />
          <span className="text-white text-sm font-bold tracking-wider">美颜 + 滤镜</span>
        </div>
        <button onClick={onClose} className="text-white/60 hover:text-white text-sm">完成 ✓</button>
      </div>
      {/* tab 切换 */}
      <div className="flex gap-1 mb-3">
        {[{id:'beauty',l:'美颜'},{id:'filter',l:'滤镜'}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${tab === t.id ? 'bg-[#A30236] text-white' : 'bg-stone-800 text-white/70'}`}
            style={{borderRadius:'2px'}}>{t.l}</button>
        ))}
      </div>

      {tab === 'beauty' && (
        <div className="space-y-3">
          <div className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-bold flex items-center gap-2">
            柔光磨皮（不需要识别人脸 · 始终可用）
          </div>
          <div className="flex gap-1.5">
            {BEAUTY_LEVELS.map(l => (
              <button key={l.v} onClick={() => cam.setBeautyLevel(l.v)}
                className={`flex-1 py-1.5 text-xs transition-colors ${
                  cam.beautyLevel === l.v ? 'bg-[#A30236] text-white font-semibold' : 'bg-stone-800 text-white/80 hover:bg-stone-700'
                }`}
                style={{borderRadius:'2px'}}>{l.label}</button>
            ))}
          </div>

          <div className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-bold pt-2 flex items-center gap-2 flex-wrap">
            真磨皮 / 瘦脸 / 大眼
            {cam.faceFxLoading && (
              <span className="text-amber-300 normal-case tracking-normal">
                · 下载美颜模型 {cam.faceFxProgress || 0}% · 14MB · 首次需要 5-15 秒
              </span>
            )}
            {!cam.faceFxReady && !cam.faceFxLoading && <span className="text-amber-300 normal-case tracking-normal">· 模型未就绪</span>}
            {cam.faceFxReady && !cam.faceFxLoading && <span className="text-emerald-400 normal-case tracking-normal">· MediaPipe ✓</span>}
          </div>
          {cam.faceFxLoading && (
            <div className="h-1 bg-stone-800 overflow-hidden" style={{borderRadius:'1px'}}>
              <div className="h-full bg-amber-300 transition-all duration-300 ease-out"
                style={{width: `${cam.faceFxProgress || 0}%`}} />
            </div>
          )}
          <div className="space-y-2.5">
            <Slider label="真磨皮" value={cam.skinSmooth} onChange={cam.setSkinSmooth}
              hint="只在皮肤区域柔焦 · 眼睛头发保留清晰 · 不变形" />
          </div>

          <div className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-bold pt-2 flex items-center gap-2">
            背景虚化（人像分割 · 自动识别人和背景）
          </div>
          <div className="space-y-2.5">
            <Slider label="背景虚化" value={cam.bgBlur} onChange={cam.setBgBlur}
              hint="保留人物清晰 · 背景高斯模糊 6 ~ 28 px" />
          </div>
        </div>
      )}

      {tab === 'filter' && (
        <div>
          <div className="text-[10px] text-white/50 uppercase tracking-[0.2em] mb-2 font-bold">调色滤镜</div>
          <div className="grid grid-cols-4 gap-1.5">
            {FILTER_PRESETS.map(p => (
              <button key={p.id} onClick={() => cam.setFilterPreset(p.id)}
                className={`px-2 py-2 text-xs transition-colors ${
                  cam.filterPreset === p.id ? 'bg-[#A30236] text-white font-semibold' : 'bg-stone-800 text-white/80 hover:bg-stone-700'
                }`}
                style={{borderRadius:'2px'}}>{p.name}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const BeautyButton = ({ cam, style = {}, className = '' }) => {
  const [open, setOpen] = useState(false);
  const on = cam.filterPreset !== 'none' || cam.beautyLevel > 0
          || cam.skinSmooth > 0 || cam.bgBlur > 0;
  return (
    <>
      <button onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 backdrop-blur text-white px-2.5 py-1.5 text-[11px] tracking-wider font-bold ${on ? 'bg-[#A30236]/90' : 'bg-stone-950/80'} ${className}`}
        style={{borderRadius: '2px', ...style}}
        title="美颜 / 滤镜"
      >
        <Icon name="sparkle" size={13} />美颜
      </button>
      {open && <FilterSheet cam={cam} onClose={() => setOpen(false)} />}
    </>
  );
};

// 观众视角预览：临时关美颜+滤镜 5s · 看真实的自己
const AudienceViewButton = ({ cam, style = {}, className = '' }) => {
  const [previewing, setPreviewing] = useState(false);
  const [savedState, setSavedState] = useState(null);
  const timeoutRef = useRef(null);
  const [remaining, setRemaining] = useState(0);
  const tickRef = useRef(null);

  const start = () => {
    if (previewing) return;
    // 没开美颜/滤镜 → 没意义，给提示但仍然让 toast 显示
    const anyBeauty = cam.filterPreset !== 'none' || cam.beautyLevel > 0
      || cam.skinSmooth > 0 || cam.bgBlur > 0;

    // 保存当前状态
    setSavedState({
      filterPreset: cam.filterPreset,
      beautyLevel: cam.beautyLevel,
      skinSmooth: cam.skinSmooth,
      bgBlur: cam.bgBlur,
      anyBeauty,
    });
    // 全部归零（即"裸"画面）
    cam.setFilterPreset('none');
    cam.setBeautyLevel(0);
    cam.setSkinSmooth(0);
    cam.setBgBlur(0);
    setPreviewing(true);
    setRemaining(5);

    // 每秒 tick
    tickRef.current = window.setInterval(() => {
      setRemaining(r => Math.max(0, r - 1));
    }, 1000);

    // 5s 后恢复
    timeoutRef.current = window.setTimeout(() => {
      if (savedState) restore(); else cleanup();
    }, 5000);
  };

  // 恢复需要拿到最新 savedState · 用 useEffect 在 previewing→false 时执行
  const restore = () => {
    const s = savedState;
    if (s) {
      cam.setFilterPreset(s.filterPreset);
      cam.setBeautyLevel(s.beautyLevel);
      cam.setSkinSmooth(s.skinSmooth);
      cam.setBgBlur(s.bgBlur);
    }
    cleanup();
  };

  const cleanup = () => {
    if (timeoutRef.current) { window.clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (tickRef.current)    { window.clearInterval(tickRef.current);   tickRef.current = null; }
    setPreviewing(false);
    setSavedState(null);
    setRemaining(0);
  };

  // 用户手动取消
  const cancel = () => {
    restore();
  };

  // 卸载清理
  useEffect(() => () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    if (tickRef.current)    window.clearInterval(tickRef.current);
  }, []);

  return (
    <>
      <button onClick={previewing ? cancel : start}
        className={`flex items-center gap-1.5 backdrop-blur text-white px-2.5 py-1.5 text-[11px] tracking-wider font-bold transition-colors ${previewing ? 'bg-amber-500/90' : 'bg-stone-950/80'} ${className}`}
        style={{borderRadius: '2px', ...style}}
        title="一键看真实的自己（5 秒）">
        <Icon name="search" size={13} />
        {previewing ? `真实 ${remaining}s` : '真实'}
      </button>

      {/* 全屏 toast · previewing 期间显示 */}
      {previewing && (
        <div className="fixed inset-x-0 z-[90] flex justify-center pointer-events-none px-4"
          style={{top:'calc(env(safe-area-inset-top, 0px) + 80px)'}}>
          <div className="bg-amber-500/95 text-white px-4 py-3 backdrop-blur fade-in"
            style={{borderRadius:'3px', maxWidth:'90%'}}>
            <div className="text-[11px] tracking-[0.22em] uppercase font-bold mb-0.5 opacity-80">
              👁 观众视角 · {remaining}s
            </div>
            <div className="text-sm font-bold">
              {savedState?.anyBeauty ? '这才是观众看到的你' : '没开美颜 · 你看到的就是观众看到的'}
            </div>
            <div className="text-[10px] mt-1 opacity-80">
              点击按钮可提前结束
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ============ 同题对比：今天 vs 上次同题 ============
// 视频本身没存（saveVideoToDisk 写到用户文件夹或下载夹），但 transcript / duration
// 存在 localStorage.savedFiles 里 · 所以能做「数据对比」：嗯啊数 / WPM / 时长
// 三个指标 + 展开看上次转录稿
const SameTopicCompare = ({ topic, currentTranscript, currentDuration }) => {
  const { savedFiles } = useSettings();
  const prior = useMemo(() => {
    if (!topic) return null;
    // savedFiles[0] 是刚保存的本次。从 [1:] 里找同 label 且有像样转录稿的最近一条
    return (savedFiles || [])
      .slice(1)
      .find(f => f.label === topic && (f.transcript || '').trim().length > 10);
  }, [savedFiles, topic]);

  if (!prior) return null;

  const priorWpm     = calculateWPM(prior.transcript, prior.duration || 0);
  const priorFillers = analyzeFillerWords(prior.transcript);
  const priorFillerTotal = priorFillers.reduce((s, f) => s + f.count, 0);

  const currWpm     = calculateWPM(currentTranscript, currentDuration);
  const currFillers = analyzeFillerWords(currentTranscript || '');
  const currFillerTotal = currFillers.reduce((s, f) => s + f.count, 0);

  const daysAgo = Math.max(1, Math.floor((Date.now() - (prior.ts || 0)) / 86400000));

  const fillerDelta = currFillerTotal - priorFillerTotal;
  const durDelta    = currentDuration - (prior.duration || 0);
  // WPM 不分高低好坏（180-260 都是舒适区）· 只显示差值不打色

  const fmtDelta = (d, unit = '') => d === 0 ? '持平' : `${d > 0 ? '+' : ''}${d}${unit}`;
  const fillerColor = fillerDelta < 0 ? 'text-emerald-700' : fillerDelta > 0 ? 'text-[#A30236]' : 'text-stone-500';

  return (
    <Card className="p-5 mb-4 border-l-[3px] border-[#061A6C]">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 bg-[#E9EBF5] text-[#061A6C] flex items-center justify-center" style={{borderRadius:'3px'}}>
          <Icon name="refresh" size={16} strokeWidth={1.7}/>
        </div>
        <div>
          <div className="text-stone-400 text-[9px] tracking-[0.18em] font-semibold">同题复练</div>
          <div className="font-display font-bold text-[#061A6C] text-[14px] leading-none mt-0.5">
            同题对比 · {daysAgo} 天前你录过这题
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="text-center p-3 bg-stone-50" style={{borderRadius:'3px'}}>
          <div className="text-[9px] tracking-[0.16em] uppercase text-stone-400 font-bold">嗯啊数</div>
          <div className="font-display font-bold text-[20px] tabular-nums mt-1 text-stone-900">{currFillerTotal}</div>
          <div className={`text-[10px] mt-1 ${fillerColor}`}>
            上次 {priorFillerTotal} · {fmtDelta(fillerDelta)}
          </div>
        </div>
        <div className="text-center p-3 bg-stone-50" style={{borderRadius:'3px'}}>
          <div className="text-[9px] tracking-[0.16em] text-stone-400 font-bold">语速</div>
          <div className="font-display font-bold text-[20px] tabular-nums mt-1 text-stone-900">{currWpm}</div>
          <div className="text-[10px] mt-1 text-stone-500">上次 {priorWpm}</div>
        </div>
        <div className="text-center p-3 bg-stone-50" style={{borderRadius:'3px'}}>
          <div className="text-[9px] tracking-[0.16em] uppercase text-stone-400 font-bold">时长</div>
          <div className="font-display font-bold text-[20px] tabular-nums mt-1 text-stone-900">{currentDuration}s</div>
          <div className="text-[10px] mt-1 text-stone-500">上次 {prior.duration || 0}s · {fmtDelta(durDelta, 's')}</div>
        </div>
      </div>

      <details className="mt-4 pt-3 border-t border-stone-200">
        <summary className="text-[11px] text-stone-500 cursor-pointer hover:text-stone-800 select-none">
          📜 看上次怎么讲的（{daysAgo} 天前）
        </summary>
        <div className="text-[12px] text-stone-700 mt-2 leading-relaxed bg-stone-50 p-3" style={{borderRadius:'2px'}}>
          {prior.transcript}
        </div>
      </details>
    </Card>
  );
};

// ============ 「明天的话题」预承诺 ============
// 习惯科学的 pre-commitment device · 今天结束时给明天预订 · 明天打开就被「未完成的承诺」撞一下
// 比单纯的提醒强 · 因为是「你自己选的承诺」不是「app 给你的任务」
// localStorage helper（dateKeyToday / dateKeyTomorrow / readTomorrowTopic / writeTomorrowTopic /
// clearTomorrowTopic）定义在 HomeView 上面 · 这里只渲染 UI
const TomorrowTopicCommit = ({ defaultTopic = '' }) => {
  const [text, setText] = useState('');
  const [committed, setCommitted] = useState(() => {
    // mount 时检查：是否已经为明天预订过了
    const t = readTomorrowTopic();
    return t && t.forDate === dateKeyTomorrow() ? t.topic : null;
  });

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    writeTomorrowTopic(t);
    setCommitted(t);
    setText('');
  };
  const cancel = () => {
    clearTomorrowTopic();
    setCommitted(null);
  };
  const useToday = () => setText(defaultTopic || '');

  return (
    <Card className="p-5 mb-4">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:'3px'}}>
          <Icon name="clock" size={16} strokeWidth={1.7}/>
        </div>
        <div>
          <div className="text-stone-400 text-[9px] tracking-[0.18em] uppercase font-semibold">TOMORROW</div>
          <div className="font-display font-bold text-[#A30236] text-[14px] leading-none mt-0.5">
            给明天的自己预订一题
          </div>
        </div>
      </div>

      {committed ? (
        <div className="bg-emerald-50 border border-emerald-200 p-4" style={{borderRadius:'3px'}}>
          <div className="flex items-start gap-2 mb-2">
            <Icon name="check" size={14} className="text-emerald-700 mt-0.5 shrink-0" strokeWidth={2.2}/>
            <div className="text-[10px] tracking-[0.16em] uppercase font-bold text-emerald-700">已预订给明天</div>
          </div>
          <div className="font-display font-bold text-stone-900 text-[15px] leading-snug pl-5">{committed}</div>
          <div className="flex items-center justify-end mt-3">
            <button onClick={cancel} className="text-[11px] text-stone-500 hover:text-[#A30236] transition-colors">
              取消预订
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-[12px] text-stone-600 leading-relaxed mb-3">
            写下你明天想讲的一句话 / 一个观点 / 一个问题 ·
            明天打开 app · 它会作为你给自己的承诺出现在首页。
          </p>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="例如：聊聊「为什么我离开大厂」"
            className="w-full p-3 border border-stone-300 text-sm leading-relaxed resize-none focus:outline-none focus:border-[#A30236]"
            style={{borderRadius:'3px', minHeight: 64}}
            maxLength={200}
          />
          <div className="flex items-center justify-between flex-wrap gap-2 mt-3">
            {defaultTopic && (
              <button onClick={useToday} className="text-[11px] text-stone-600 hover:text-[#A30236] transition-colors">
                ↻ 用今天这题
              </button>
            )}
            <div className="flex-1" />
            <Btn variant="primary" onClick={submit} disabled={!text.trim()}>
              预订给明天 →
            </Btn>
          </div>
        </div>
      )}
    </Card>
  );
};

const ReviewScoreGrid = ({ stats, review }) => {
  const score = review?.scores || {};
  const items = [
    { key: 'hook', label: '开头', value: score.hook ?? '--', tone: 'crimson' },
    { key: 'logic', label: '逻辑', value: score.logic ?? '--', tone: 'navy' },
    { key: 'filler', label: '口头禅', value: score.filler ?? (stats?.fillers?.length ? stats.fillers.length : 0), tone: 'amber' },
    { key: 'ending', label: '收尾', value: score.ending ?? '--', tone: 'stone' },
    { key: 'pacing', label: '语速', value: score.pacing ?? (stats?.wpm || 0), tone: 'emerald' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(item => (
        <MetricTile
          key={item.key}
          label={item.label}
          value={item.value}
          detail={item.key === 'pacing' && item.value !== '--' ? '字/分' : null}
          tone={item.tone}
        />
      ))}
    </div>
  );
};

const ReviewHero = ({ contextLabel, duration, onRetry, onNew }) => (
  <ActionPanel className="p-5 mb-4 border-l-[3px] border-l-[#A30236]">
    <div className="text-[10px] font-bold uppercase text-[#A30236] mb-2 tracking-[0.16em]">复盘报告</div>
    <h1 className="font-display font-bold text-[24px] leading-tight text-stone-950">
      保留一个优点，下一轮只改一件事。
    </h1>
    <p className="text-[13px] text-stone-500 mt-2 leading-relaxed">
      {contextLabel || '未命名练习'} · {formatTime(duration || 0)}
    </p>
    <div className="flex gap-2 mt-4">
      <Btn variant="primary" onClick={onRetry} className="flex-1">再练一遍</Btn>
      <Btn variant="secondary" onClick={onNew}>换个题目</Btn>
    </div>
  </ActionPanel>
);

// ============ Done View ============
const DoneView = ({ blob, contextLabel, duration = 0, onRetry, onNew, extra, transcript = '' }) => {
  const url = useMemo(() => blob ? URL.createObjectURL(blob) : null, [blob]);
  const settings = useSettings();
  const [saveStatus, setSaveStatus] = useState({ state: 'pending' });
  const savedRef = useRef(false);

  useEffect(() => {
    if (!blob || savedRef.current) return;
    savedRef.current = true;
    setSaveStatus({ state: 'saving' });
    saveVideoToDisk(blob, contextLabel, settings.saveDir)
      .then(r => {
        setSaveStatus({ state: 'saved', ...r });
        settings.addSavedFile?.({ ...r, label: contextLabel, duration, ts: Date.now(), transcript: transcript || '' });
      })
      .catch(err => setSaveStatus({ state: 'error', error: err.message }));
  }, [blob, contextLabel, duration, settings.saveDir, transcript]);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const sizeMB = blob ? (blob.size / 1024 / 1024).toFixed(1) : null;

  // 录完即时反馈：今日进度 + 连续天数 + 是否解锁新成就
  // 注意：savedFiles 包含刚加进去的这一条
  const feedbackStats = useMemo(() => {
    const today0 = startOfDay(new Date());
    const goal = settings.dailyGoal || { count: 3, durationSec: 60 };
    const minDur = (goal.durationSec || 0) * 0.8;
    const files = settings.savedFiles || [];
    const todayQualifying = files.filter(f =>
      (f.ts || 0) >= today0 && (f.ts || 0) < today0 + 86400000 && (f.duration || 0) >= minDur
    ).length;
    let streak = todayQualifying >= goal.count ? 1 : 0;
    let cursor = today0 - 86400000;
    for (let i = 0; i < 365; i++) {
      const c = files.filter(f =>
        (f.ts || 0) >= cursor && (f.ts || 0) < cursor + 86400000 && (f.duration || 0) >= minDur
      ).length;
      if (c >= goal.count) { streak++; cursor -= 86400000; } else break;
    }
    const justHitGoal = todayQualifying === goal.count;
    const unlocked = ACHIEVEMENTS.filter(a => {
      try { return a.test(files, streak); } catch { return false; }
    }).map(a => a.id);
    const newlyUnlocked = detectNewlyUnlocked(settings.unlockedAchievements, unlocked)
      .map(id => ACHIEVEMENTS.find(a => a.id === id))
      .filter(Boolean);
    // 习惯科学口径：「连续录过的天数」（不要求达成 goal）+「今天的总录像数」
    // STREAK_DAY_MESSAGES 触发条件用这俩 · 跟硬 streak 解耦
    const allTodayFiles = files.filter(f => (f.ts || 0) >= today0 && (f.ts || 0) < today0 + 86400000);
    const dayKeys = new Set(files.map(f => dayKey(f.ts || 0)));
    let softStreak = dayKeys.has(dayKey(today0)) ? 1 : 0;
    let softCursor = today0 - 86400000;
    while (dayKeys.has(dayKey(softCursor)) && softStreak < 365) {
      softStreak++;
      softCursor -= 86400000;
    }
    // 「断了几天回来」检测 · 用于 streak repair 文案
    // returnGap = N 表示「上次录像在 N 天前」· null 表示没有历史录像
    // returnGap >= 2 等价于「至少跳过了昨天一天」
    const pastFiles = files.filter(f => (f.ts || 0) < today0);
    let returnGap = null;
    if (pastFiles.length > 0) {
      const lastTs = Math.max(...pastFiles.map(f => f.ts || 0));
      const lastDay0 = startOfDay(new Date(lastTs));
      returnGap = Math.round((today0 - lastDay0) / 86400000);
    }
    return {
      todayCount: todayQualifying, goalCount: goal.count, streak,
      justHitGoal, newlyUnlocked, remaining: Math.max(0, goal.count - todayQualifying),
      qualified: (duration || 0) >= minDur,
      softStreak,
      isFirstOfDay: allTodayFiles.length === 1,
      returnGap,
    };
  }, [settings.savedFiles, settings.dailyGoal, settings.unlockedAchievements, duration]);

  // 标记新成就为已见
  useEffect(() => {
    if (feedbackStats.newlyUnlocked.length > 0) {
      const ids = feedbackStats.newlyUnlocked.map(a => a.id);
      setTimeout(() => settings.markAchievementsSeen(ids), 2000);
    }
    // eslint-disable-next-line
  }, [feedbackStats.newlyUnlocked.length]);

  return (
    <div className="fade-in">
      {/* 习惯科学小奖 · 三态：
            1. 前 7 天每天首次录像（softStreak 1-7，无 break）→ STREAK_DAY_MESSAGES
            2. 断了 1-7 天回来（returnGap >= 2 且 <= 7，softStreak === 1）→ recovery 「never miss twice」
            3. 断了 8+ 天回来 → recovery 「久违的 Day 1」
      */}
      {blob && feedbackStats.isFirstOfDay && (() => {
        const { softStreak, returnGap } = feedbackStats;
        let m = null;
        let eyebrowLabel = `DAY ${softStreak} · 习惯科学`;
        if (softStreak === 1 && returnGap !== null && returnGap >= 2) {
          // 断了至少一天回来 · 用 recovery 文案
          if (returnGap === 2) {
            m = { emoji:'🤝', color:'#F1A23F',
                  title:'昨天空了 · 今天又开始了 · 这就够',
                  body:'习惯学有一条「never miss twice」规则 · 你今天做到了 · 比那些「等明天再说」的人强。' };
            eyebrowLabel = 'STREAK REPAIR · 昨天空了一天';
          } else if (returnGap <= 7) {
            m = { emoji:'🌱', color:'#10b981',
                  title:'回来了 · 这次的 Day 1 比上次的更有意义',
                  body:`${returnGap - 1} 天没录 · 不算很久。断过的人才更知道这个习惯有多脆 · 现在重新走。` };
            eyebrowLabel = `RESTART · 跳过了 ${returnGap - 1} 天`;
          } else {
            m = { emoji:'🌅', color:'#A30236',
                  title:'好久没见 · 重新开始',
                  body:`${returnGap} 天前你录过 · 那条还在你手机里。今天再录一条 · 重新走 Day 1。` };
            eyebrowLabel = '回归 · 久违的 Day 1';
          }
        } else if (softStreak >= 1 && softStreak <= 7) {
          m = STREAK_DAY_MESSAGES[softStreak] || null;
        }
        if (!m) return null;
        return (
          <Card className="mb-4 p-4 bg-stone-50 border-l-[3px]" style={{borderLeftColor: m.color}}>
            <div className="flex items-start gap-3">
              <div className="text-[32px] leading-none shrink-0">{m.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="text-stone-400 text-[9px] tracking-[0.18em] uppercase font-bold mb-1">
                  {eyebrowLabel}
                </div>
                <div className="font-display font-bold text-stone-900 text-[15px] leading-snug">
                  {m.title}
                </div>
                <p className="text-[12px] text-stone-600 mt-1.5 leading-relaxed">
                  {m.body}
                </p>
              </div>
            </div>
          </Card>
        );
      })()}

      {/* 即时反馈：+1 预演 + 进度 + 新成就 */}
      {blob && (
        <Card className="mb-4 overflow-hidden border-0" style={{background: feedbackStats.justHitGoal ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #A30236 0%, #8E0230 100%)', color: '#fff'}}>
          <div className="p-5">
            <div className="flex items-baseline justify-between mb-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] tracking-[0.22em] uppercase font-bold text-white/80">
                  {feedbackStats.justHitGoal ? '🎯 今日打卡完成' : '✓ 预演 +1'}
                </span>
                {feedbackStats.qualified
                  ? <span className="text-[10px] tracking-wider text-white/60">已记入今日打卡</span>
                  : <span className="text-[10px] tracking-wider text-white/60">未到目标时长 · 不计入打卡</span>}
              </div>
              {feedbackStats.streak > 0 && (
                <div className="text-[11px] text-white/90 font-bold">🔥 连续 {feedbackStats.streak} 天</div>
              )}
            </div>
            <div className="font-display font-bold text-2xl leading-tight mb-3">
              {feedbackStats.justHitGoal
                ? '今天的预演任务完成了 🎉'
                : feedbackStats.remaining > 0
                  ? `再来 ${feedbackStats.remaining} 条 · 达成今日目标`
                  : '加油，今天已经在进步'}
            </div>
            {/* 今日进度条 */}
            <div className="h-1.5 bg-white/20 mb-1.5" style={{borderRadius:'1px'}}>
              <div className="h-full bg-white transition-all duration-700" style={{width: `${Math.min(100, (feedbackStats.todayCount/Math.max(1,feedbackStats.goalCount))*100)}%`}}/>
            </div>
            <div className="text-[10px] text-white/70 tabular-nums">
              今日 {feedbackStats.todayCount} / {feedbackStats.goalCount}
            </div>

            {/* 新解锁徽章 */}
            {feedbackStats.newlyUnlocked.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="text-[10px] tracking-[0.22em] uppercase font-bold text-amber-200 mb-2">🎉 新解锁徽章</div>
                <div className="flex gap-2 flex-wrap">
                  {feedbackStats.newlyUnlocked.map(a => (
                    <div key={a.id} className="bg-white/15 backdrop-blur px-3 py-2 flex items-center gap-2" style={{borderRadius:'3px'}}>
                      <span className="text-xl">{a.emoji}</span>
                      <div>
                        <div className="text-[12px] font-bold leading-none">{a.name}</div>
                        <div className="text-[9px] text-white/70 mt-0.5">{a.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      <ReviewHero
        contextLabel={contextLabel}
        duration={duration}
        onRetry={onRetry}
        onNew={onNew}
      />

      <Card className="p-6 mb-4">

        {/* 保存状态条 */}
        {blob && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-3 ${
            saveStatus.state === 'saved' ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' :
            saveStatus.state === 'error' ? 'bg-red-50 border border-red-200 text-red-900' :
            'bg-stone-100 border border-stone-200 text-stone-700'
          }`}>
            {saveStatus.state === 'saving' && <><span className="w-2 h-2 rounded-full bg-amber-400 pulse-rec" />正在保存到本地...</>}
            {saveStatus.state === 'saved' && (
              <>
                <span>✓</span>
                <div className="flex-1">
                  <div className="font-medium">已保存：{saveStatus.filename}</div>
                  <div className="text-xs opacity-70 mt-0.5">
                    {saveStatus.method === 'native' ? '已保存到安卓应用内文档'
                      : saveStatus.method === 'folder' ? '写入到你选择的目录'
                      : '已下载到浏览器默认下载文件夹'} · {sizeMB} MB
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  {url && (
                    <a href={url} download={saveStatus.filename} className="text-xs underline">再下载一次</a>
                  )}
                  <button onClick={() => {
                    if (window.confirm(`删除这条录像？\n\n${contextLabel}\n${saveStatus.method === 'folder' || saveStatus.method === 'native' ? '保存的文件也会被删除。' : '只删除历史条目（系统下载夹的文件请手动删）。'}`)) {
                      // 找到刚加进 savedFiles 的那条（filename 匹配）→ 删除
                      const idx = settings.savedFiles.findIndex(f => f.filename === saveStatus.filename);
                      if (idx >= 0) settings.removeSavedFile(idx);
                      setSaveStatus({ state: 'discarded' });
                    }
                  }} className="text-xs text-emerald-900/70 hover:text-red-700 underline">🗑 丢掉这条</button>
                </div>
              </>
            )}
            {saveStatus.state === 'discarded' && (
              <>
                <span>—</span>
                <div className="flex-1 italic">已删除这条录像</div>
              </>
            )}
            {saveStatus.state === 'error' && <>
              <Icon name="close" size={14} strokeWidth={2}/>
              <div className="flex-1">保存失败：{saveStatus.error}</div>
              {url && <a href={url} download={`口播-${Date.now()}.webm`} className="text-xs underline">手动下载</a>}
            </>}
          </div>
        )}

        {url ? (
          (blob.type && blob.type.startsWith('audio/')) ? (
            <div className="w-full rounded-xl bg-gradient-to-br from-stone-900 to-[#3a0716] p-6 flex flex-col items-center justify-center">
              <div className="text-6xl mb-3">🎙️</div>
              <div className="text-amber-300 text-[10px] tracking-[0.22em] uppercase font-bold mb-3">纯语音录制 · 仅音频</div>
              <audio src={url} controls className="w-full max-w-md" />
            </div>
          ) : (
            <video src={url} controls className="w-full rounded-xl bg-black" />
          )
        ) : (
          <div className="text-stone-400 text-sm p-8 text-center">录制为空（可能时长太短或权限被拒）</div>
        )}

        {/* 给这条录像打标签：高光 / 待重录 / 已发布
            < 10 条录像时隐藏 · 还没攒够「需要组织」的量 · 早期 UI 噪音
            到 10 条（约一周的连续练习）· 用户开始有「这条好 / 那条想重录」的诉求 */}
        {saveStatus.state === 'saved' && saveStatus.filename && (settings.savedFiles?.length || 0) >= 10 && (
          <FileTagger filename={saveStatus.filename} />
        )}
      </Card>

      {/* 🎯 AI 教练复盘 */}
      {blob && <CoachReview topic={contextLabel} durationSec={duration} initialTranscript={transcript} />}

      {/* ↻ 同题对比：今天 vs 上次同题（如果之前练过这题） */}
      {blob && contextLabel && (
        <SameTopicCompare topic={contextLabel} currentTranscript={transcript} currentDuration={duration} />
      )}

      {/* 🚀 预演 → 发布链路 */}
      {blob && contextLabel && <PublishStep contextLabel={contextLabel} />}

      {/* ✉️ 给明天的自己预订一题（pre-commitment device） */}
      {blob && <TomorrowTopicCommit defaultTopic={contextLabel} />}

      {extra}
    </div>
  );
};

// ============ AI 教练复盘：5 维评分 + 改进建议 ============
const CoachReview = ({ topic, durationSec = 0, initialTranscript = '' }) => {
  const settings = useSettings();
  const [text, setText]       = useState(initialTranscript || '');
  const [review, setReview]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [expanded, setExpanded] = useState(initialTranscript ? false : false); // 默认折叠，点开后展开

  // 本地统计（实时随 text 变化）
  const stats = useMemo(() => {
    const wpm = calculateWPM(text, durationSec);
    const fillers = analyzeFillerWords(text);
    return { wpm, fillers };
  }, [text, durationSec]);

  const band = wpmBand(stats.wpm);

  const run = async () => {
    if (!text.trim() || text.trim().length < 15) {
      setError('转录稿太短（至少 15 字）');
      return;
    }
    setLoading(true); setError('');
    try {
      const r = await deepseekCoachReview({
        apiKey: settings.apiKey,
        topic: topic || '',
        transcript: text,
        durationSec,
        wpm: stats.wpm,
        fillerTop: stats.fillers,
      });
      setReview(r);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  // 折叠态：用户没主动展开 → 只显示一个"展开 AI 复盘"按钮，节省视觉空间
  if (!expanded) {
    return (
      <Card className="p-4 mb-4 border-l-[3px] border-amber-400 cursor-pointer hover:bg-amber-50/50 transition-colors"
        onClick={() => setExpanded(true)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-100 text-amber-700 flex items-center justify-center" style={{borderRadius:"3px"}}>
              <Icon name="sparkle" size={16} strokeWidth={1.7} />
            </div>
            <div>
              <div className="font-display font-bold text-stone-900 text-[15px]">🎯 AI 教练复盘</div>
              <div className="text-[11px] text-stone-500 mt-0.5">5 维评分 · 口头禅统计 · 改进建议</div>
            </div>
          </div>
          <div className="text-amber-700 text-xs font-bold">展开 →</div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 mb-4 border-l-[3px] border-amber-400">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-100 text-amber-700 flex items-center justify-center" style={{borderRadius:"3px"}}>
            <Icon name="sparkle" size={16} strokeWidth={1.7} />
          </div>
          <div>
            <h3 className="font-display font-bold text-stone-900 text-[16px] m-0">🎯 AI 教练复盘</h3>
            <div className="text-[9px] tracking-wider text-stone-400 mt-0.5">🤖 内容由 AI 生成 · 仅供参考</div>
          </div>
        </div>
        <button onClick={() => setExpanded(false)} className="text-stone-400 hover:text-stone-700 text-xs">收起 ✕</button>
      </div>

      {!review && (
        <>
          <div className="text-[12px] text-stone-600 mb-2">
            {initialTranscript
              ? '你的实时转录已填入下方。可手动修正再调 AI。'
              : '把你刚才说的话粘贴 / 输入下面（iOS Safari 没有实时转录，可手打要点）。'}
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="转录稿（至少 15 字）..."
            rows={5}
            className="w-full p-3 border border-stone-300 text-sm leading-relaxed"
            style={{borderRadius: '3px', fontFamily: 'inherit'}}
          />

          {/* 本地实时统计 */}
          <div className="grid grid-cols-2 gap-2 mt-3 text-[12px]">
            <div className="p-2.5 bg-stone-50 border border-stone-200" style={{borderRadius:'3px'}}>
              <div className="text-[10px] tracking-wider uppercase text-stone-500 mb-1 font-bold">语速</div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-display font-bold tabular-nums text-stone-900">{stats.wpm}</span>
                <span className="text-[11px] text-stone-500">字/分</span>
                <span className="text-[11px] font-bold ml-auto" style={{color: band.color}}>{band.label}</span>
              </div>
            </div>
            <div className="p-2.5 bg-stone-50 border border-stone-200" style={{borderRadius:'3px'}}>
              <div className="text-[10px] tracking-wider uppercase text-stone-500 mb-1 font-bold">口头禅</div>
              {stats.fillers.length === 0 ? (
                <div className="text-[13px] font-bold text-emerald-600">✓ 干净</div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {stats.fillers.slice(0, 4).map(f => (
                    <span key={f.word} className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 font-bold" style={{borderRadius:'2px'}}>
                      {f.word} <span className="opacity-70">×{f.count}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Btn variant="primary" onClick={run} disabled={loading}>
              {loading ? '思考中...' : '调用 AI 复盘 ✨'}
            </Btn>
            {error && <span className="text-red-600 text-sm">{error}</span>}
          </div>
        </>
      )}

      {review && (
        <>
          <div className="mb-4">
            <ReviewScoreGrid stats={stats} review={review} />
          </div>

          {/* 总评 */}
          {review.summary && (
            <div className="p-3 bg-stone-50 border-l-[3px] border-stone-400 text-[13px] text-stone-800 leading-relaxed mb-3">
              {review.summary}
            </div>
          )}

          {/* 亮点 */}
          {review.highlights?.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] tracking-[0.18em] uppercase text-emerald-700 font-bold mb-1.5">✨ 亮点</div>
              <ul className="space-y-1.5">
                {review.highlights.map((h, i) => (
                  <li key={i} className="text-[13px] text-stone-700 pl-3 border-l border-emerald-300 leading-relaxed">{h}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 改进建议 */}
          {review.suggestions?.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] tracking-[0.18em] uppercase text-[#A30236] font-bold mb-1.5">📌 下一条可改进的</div>
              <ul className="space-y-1.5">
                {review.suggestions.map((s, i) => (
                  <li key={i} className="text-[13px] text-stone-800 pl-3 border-l border-[#A30236] leading-relaxed">{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 本地补充统计 */}
          <div className="mt-4 pt-3 border-t border-stone-200 flex items-center gap-3 text-[11px] text-stone-500">
            <span>语速 <span className="font-bold text-stone-700">{stats.wpm}</span> 字/分</span>
            <span>·</span>
            <span>口头禅 {stats.fillers.length === 0 ? '0' : stats.fillers.reduce((s, f) => s + f.count, 0)} 处</span>
          </div>

          <div className="flex gap-2 mt-3">
            <Btn variant="secondary" onClick={() => { setReview(null); }}>重新复盘</Btn>
          </div>
        </>
      )}
    </Card>
  );
};

// ============ 海报生成（Canvas）============
// 中文字体降级链 · 各平台都有匹配
const POSTER_FONT = '"PingFang SC", "Microsoft YaHei", "Source Han Sans CN", "Noto Sans CJK SC", system-ui, sans-serif';

// 文字按宽度自动换行 · 返回每行 text
function wrapText(ctx, text, maxWidth) {
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

function drawRoundedRect(ctx, x, y, w, h, r, fillStyle) {
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
async function renderMonthlyReportPoster({ files = [], achievements = [], restDays = [], dailyGoal, month }) {
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
const PosterShareModal = ({ blob, onClose, fileName = 'kobo-poster.png' }) => {
  const [url, setUrl] = useState(null);
  const [shared, setShared] = useState(false);
  useEffect(() => {
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  const download = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const share = async () => {
    if (!blob || !navigator.share) { download(); return; }
    try {
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare && !navigator.canShare({ files: [file] })) {
        download();
        return;
      }
      await navigator.share({ files: [file], title: '模拟发布结果' });
      setShared(true);
    } catch (e) {
      // 用户取消 / 不支持
      if (e.name !== 'AbortError') download();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-stone-950/80 backdrop-blur flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white max-w-md w-full p-4 max-h-[92vh] overflow-y-auto fade-in" style={{borderRadius:'4px'}} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-stone-900 text-base">📸 模拟发布晒图</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900">✕</button>
        </div>
        {url && (
          <img src={url} alt="poster"
            className="w-full border border-stone-200 mb-3"
            style={{borderRadius:'3px'}}/>
        )}
        <div className="flex gap-2">
          <Btn variant="primary" onClick={share} className="flex-1">
            {navigator.share ? '📤 分享' : '💾 下载'}
          </Btn>
          {navigator.share && <Btn variant="secondary" onClick={download}>💾 下载</Btn>}
        </div>
        <div className="text-[10px] text-stone-500 mt-3 leading-relaxed">
          💡 长按图片可保存到相册 · 或点击上方按钮 · 海报已加 AI 生成标注
        </div>
      </div>
    </div>
  );
};

// ============ 录像打标签：高光 / 待重录 / 已发布 ============
const TAG_OPTIONS = [
  { id:'star',      label:'⭐ 高光',     color:'#F1A23F', bg:'#FEF3C7' },
  { id:'redo',      label:'🔁 待重录',   color:'#A30236', bg:'#FBEFF2' },
  { id:'published', label:'📤 已发布',   color:'#10b981', bg:'#D1FAE5' },
];

const FileTagger = ({ filename, compact = false }) => {
  const { savedFiles, updateSavedFile } = useSettings();
  const file = savedFiles.find(f => f.filename === filename);
  const current = file?.tag || null;

  const toggle = (id) => {
    updateSavedFile(filename, { tag: current === id ? null : id });
  };

  if (compact) {
    // 紧凑模式：用在列表里，仅显示当前标签 + 切换按钮
    return (
      <div className="flex items-center gap-1">
        {TAG_OPTIONS.map(opt => (
          <button key={opt.id} onClick={(e) => { e.stopPropagation(); toggle(opt.id); }}
            className={`text-[9px] tracking-wider font-bold px-1 py-0.5 transition-colors ${current === opt.id ? '' : 'opacity-30 hover:opacity-70'}`}
            style={{
              borderRadius:'2px',
              background: current === opt.id ? opt.bg : 'transparent',
              color: current === opt.id ? opt.color : '#737373',
              border: `1px solid ${current === opt.id ? opt.color : '#d6d3d1'}`,
            }}
            title={opt.label}>
            {opt.label.split(' ')[0]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-stone-200">
      <div className="text-[10px] tracking-[0.22em] uppercase text-stone-500 font-bold mb-2">给这条录像标记 · 之后可在历史里筛</div>
      <div className="flex flex-wrap gap-2">
        {TAG_OPTIONS.map(opt => (
          <button key={opt.id} onClick={() => toggle(opt.id)}
            className="px-3 py-1.5 text-xs font-bold tracking-wider transition-all"
            style={{
              borderRadius: '3px',
              background: current === opt.id ? opt.bg : 'transparent',
              color: current === opt.id ? opt.color : '#525252',
              border: `1.5px solid ${current === opt.id ? opt.color : '#d6d3d1'}`,
            }}>
            {opt.label}
          </button>
        ))}
        {current && (
          <button onClick={() => updateSavedFile(filename, { tag: null })}
            className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-800 underline">
            清除
          </button>
        )}
      </div>
    </div>
  );
};

const LibraryEmptyState = ({ onStart }) => (
  <ActionPanel className="p-5 text-center">
    <div className="mx-auto w-10 h-10 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center mb-3" style={{borderRadius:'4px'}}>
      <Icon name="mic" size={18} />
    </div>
    <h3 className="font-display font-bold text-[16px] text-stone-950">还没有练习素材</h3>
    <p className="text-[13px] text-stone-500 leading-relaxed mt-2">
      先录一条短练习，这里就会变成你的本地口播素材库。
    </p>
    {onStart && <Btn variant="primary" onClick={onStart} className="mt-4">开始第一条练习</Btn>}
  </ActionPanel>
);

// ============ 录像历史列表（带标签筛选）============
const RecordingHistoryList = ({ settings: s }) => {
  const [filterTag, setFilterTag] = useState('all'); // all | star | redo | published | untagged

  const allFiles = s.savedFiles || [];
  const tagCounts = useMemo(() => {
    const c = { star: 0, redo: 0, published: 0, untagged: 0 };
    for (const f of allFiles) {
      if (f.tag && c[f.tag] !== undefined) c[f.tag]++;
      else c.untagged++;
    }
    return c;
  }, [allFiles]);

  const filtered = useMemo(() => {
    if (filterTag === 'all') return allFiles;
    if (filterTag === 'untagged') return allFiles.filter(f => !f.tag);
    return allFiles.filter(f => f.tag === filterTag);
  }, [allFiles, filterTag]);

  const FILTERS = [
    { id:'all',       label:'全部',     count: allFiles.length },
    { id:'star',      label:'⭐ 高光',   count: tagCounts.star },
    { id:'redo',      label:'🔁 待重录', count: tagCounts.redo },
    { id:'published', label:'📤 已发布', count: tagCounts.published },
    { id:'untagged',  label:'未标记',   count: tagCounts.untagged },
  ];

  return (
    <div className="mb-6 pt-6 border-t border-stone-200">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">录制历史 <span className="text-stone-400 text-xs ml-1">({allFiles.length}/50)</span></div>
        <button onClick={() => {
          if (window.confirm(`确定清空全部 ${allFiles.length} 条历史记录？\n\n如果当时保存到了目录，磁盘上的文件也会被删除。`)) {
            s.clearAllSavedFiles();
          }
        }} className="text-xs text-stone-500 hover:text-red-600">清空全部</button>
      </div>

      {/* 标签筛选 */}
      <div className="flex flex-wrap gap-1 mb-2">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilterTag(f.id)}
            className={`px-2 py-1 text-[11px] tracking-wider font-bold transition-colors ${
              filterTag === f.id ? 'bg-[#A30236] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`} style={{borderRadius:'2px'}}>
            {f.label} <span className="opacity-70 ml-0.5">{f.count}</span>
          </button>
        ))}
      </div>

      <div className="text-[10px] text-stone-400 mb-2 leading-relaxed">
        实际视频文件在 {s.saveDir ? '你绑定的目录' : '系统下载文件夹'} 里 · 标签只是给你方便筛选。
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto text-xs">
        {filtered.length === 0 && (
          <LibraryEmptyState />
        )}
        {filtered.map((f) => {
          const d = new Date(f.ts || Date.now());
          const pad = (n) => String(n).padStart(2,'0');
          const ds = `${d.getMonth()+1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
          const realIdx = allFiles.findIndex(x => x.filename === f.filename);
          return (
            <div key={f.filename} className="bg-white border border-stone-200 p-3 flex items-start justify-between gap-3 hover:border-[#A30236] transition-colors" style={{borderRadius:'4px'}}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Tag color={f.tag === 'star' ? 'amber' : f.tag === 'redo' ? 'red' : f.tag === 'published' ? 'emerald' : 'stone'}>
                    {f.tag || (f.method === 'folder' ? 'folder' : 'local')}
                  </Tag>
                  <span className="text-[10px] text-stone-400">{ds}</span>
                </div>
                <div className="font-bold text-[13px] text-stone-950 truncate">
                  {f.label || f.filename}
                  {f.virtualPub && (
                    <span className="ml-1.5 text-[10px] text-purple-600"
                      title={`模拟发布过 · ${f.virtualPub.platform} · 评分 ${f.virtualPub.score ?? '?'} · ${formatCount(f.virtualPub.estimated?.likes || 0)} 赞`}>
                      🌐{f.virtualPub.score != null && <span className="ml-0.5 font-bold tabular-nums text-[9px]">{f.virtualPub.score}</span>}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-stone-500 mt-1">{Math.round(f.duration || 0)}s · {f.method || 'download'}</div>
              </div>
              <div className="flex items-center gap-1">
                {(s.savedFiles?.length || 0) >= 10 && <FileTagger filename={f.filename} compact />}
                <button onClick={() => {
                  if (window.confirm(`删除这条录像？\n\n${f.label || f.filename}\n${f.method === 'folder' ? '磁盘文件也会被删除。' : '只删除历史条目，系统下载夹里的文件保留。'}`)) {
                    if (realIdx >= 0) s.removeSavedFile(realIdx);
                  }
                }} className="shrink-0 text-stone-400 hover:text-red-600 text-base px-1" title="删除">🗑</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============ 预演 → 发布链路 ============
const PublishStep = ({ contextLabel }) => {
  const [open, setOpen]       = useState(false);
  const [done, setDone]       = useState(false);
  const [channel, setChannel] = useState(null);
  const settings = useSettings();

  const CHANNELS = [
    { id:'moments', emoji:'💬', name:'先发朋友圈',  hint:'最低压力 · 把熟人当作"第一波试听众"，看哪条 emoji 多 = 钩子成立' },
    { id:'group',   emoji:'👥', name:'先发小群',    hint:'找 3 个真实读者反馈 · 等他们 react 一下再决定要不要大号发' },
    { id:'public',  emoji:'📢', name:'直接发大号',  hint:'你预演过了，准备好了。冲。错过这个时机才是真损失' },
  ];

  if (done) {
    return (
      <Card className="p-5 mb-4 bg-emerald-50 border-emerald-200">
        <div className="flex items-center gap-2">
          <Icon name="check" size={18} className="text-emerald-700" strokeWidth={2.2}/>
          <div>
            <div className="font-display font-bold text-emerald-900 text-[14px]">已发布 ✓</div>
            <div className="text-[11px] text-emerald-700 mt-0.5">下一条预演继续 →</div>
          </div>
        </div>
      </Card>
    );
  }

  if (!open) {
    return (
      <Card className="p-5 mb-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:'3px'}}>
            <Icon name="arrow" size={16} strokeWidth={1.7}/>
          </div>
          <h3 className="font-display font-bold text-stone-900 text-[16px] m-0">从预演到发布</h3>
        </div>
        <p className="text-[12px] text-stone-600 leading-relaxed mb-4">
          预演已经够了 · 发出去才有反馈。挑一个发布路径，把这条变成真正的内容。
        </p>
        <Btn variant="primary" onClick={() => setOpen(true)} className="w-full">
          我准备发了 →
        </Btn>
      </Card>
    );
  }

  return (
    <Card className="p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:'3px'}}>
            <Icon name="arrow" size={16} strokeWidth={1.7}/>
          </div>
          <h3 className="font-display font-bold text-stone-900 text-[16px] m-0">选发布路径</h3>
        </div>
        <button onClick={() => { setOpen(false); setChannel(null); }} className="text-stone-400 text-xs">取消</button>
      </div>

      <div className="space-y-2 mb-4">
        {CHANNELS.map(c => (
          <button key={c.id} onClick={() => setChannel(c.id)}
            className={`w-full text-left p-3 border-2 transition-all ${
              channel === c.id ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200 hover:border-stone-300'
            }`}
            style={{borderRadius:'3px'}}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{c.emoji}</span>
              <span className="font-semibold text-sm">{c.name}</span>
            </div>
            <div className="text-[11px] text-stone-500 leading-snug">{c.hint}</div>
          </button>
        ))}
      </div>

      {channel && (
        <Btn variant="primary" onClick={() => {
          // 把当前 saved file（最新一条）标记为 published
          const files = settings.savedFiles || [];
          if (files.length > 0) {
            const newest = files[0];
            // 不直接改 saved files，只在这条 entry 上标记（避免破坏 metadata 结构）
            // 简化：弹 toast 即可，状态留给本组件
          }
          setDone(true);
        }} className="w-full">
          已选择 · 标记为已发布
        </Btn>
      )}
    </Card>
  );
};

// ============ Mobile Header (slim app bar) ============
const MobileHeader = ({ title, sub, onOpenSettings, transparent }) => (
  <div className={cx('px-4 pt-3 pb-2 flex items-center justify-between shrink-0', transparent ? 'bg-transparent' : 'bg-[#FAFAF9]/95 backdrop-blur border-b border-stone-200')}>
    <div className="min-w-0">
      <div className="text-[10px] font-bold text-stone-400 tracking-[0.16em]">短视频口播练习器</div>
      <div className="font-display font-bold text-[15px] text-stone-950 truncate">{title || '口播练习器'}</div>
      {sub && <div className="text-[11px] text-stone-500 truncate">{sub}</div>}
    </div>
    <button onClick={onOpenSettings}
      className="h-9 w-9 border border-stone-200 bg-white flex items-center justify-center text-stone-600 hover:text-[#A30236]"
      title="设置"
      style={{borderRadius:'4px'}}>
      <Icon name="settings" size={17} />
    </button>
  </div>
);

// ============ Bottom Tab Bar ============
const NAV_ITEMS = [
  { id: 'home',         icon: 'home',     no: '·',   cn: '今日', sub: '训练看板' },
  { id: 'improv',       icon: 'mic',      no: '01',  cn: '练习', sub: '随机题训练' },
  { id: 'endless',      icon: 'refresh',  no: '02',  cn: '循环', sub: '连续换题' },
  { id: 'teleprompter', icon: 'document', no: '03',  cn: '提词', sub: '提词器训练' },
  { id: 'host',         icon: 'live',     no: '04',  cn: '主持', sub: '追问压力' },
  { id: 'tutorial',     icon: 'book',     no: '05',  cn: '学习', sub: '框架训练' },
];

const BottomTabs = ({ mode, onChange }) => (
  <nav className="shrink-0 bg-white border-t border-stone-200 relative">
    <div className="grid grid-cols-6">
      {NAV_ITEMS.map(it => {
        const active = mode === it.id;
        return (
          <button key={it.id} onClick={() => onChange(it.id)}
            className="relative flex flex-col items-center justify-center pt-2 pb-1.5 group">
            {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-9 h-[2px] bg-[#A30236]" />}
            <div className={cx('relative flex items-center justify-center mb-1', active ? 'text-[#A30236]' : 'text-stone-400 group-hover:text-stone-700')}>
              <Icon name={it.icon} size={21} strokeWidth={active ? 2 : 1.6} />
              {active && <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 bg-[#F1A23F] rounded-full" />}
            </div>
            <span className={cx('text-[10px] font-medium leading-none tracking-wide', active ? 'text-[#A30236]' : 'text-stone-500 group-hover:text-stone-800')}>
              {it.cn}
            </span>
          </button>
        );
      })}
    </div>
  </nav>
);

// ============ Page Header (within content area) ============
const PageHeader = ({ no, title, desc, iconName, right }) => (
  <div className="mb-6 pb-5 border-b border-stone-200">
    <div className="flex items-start gap-3">
      {iconName && (
        <div className="w-11 h-11 shrink-0 bg-[#A30236] text-white flex items-center justify-center" style={{borderRadius:'4px'}}>
          <Icon name={iconName} size={22} strokeWidth={1.8} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          {no && <span className="font-display font-bold text-[#A30236] tabular-nums text-[15px] leading-none">{no}</span>}
          <span className="rule-crimson" />
          <span className="eyebrow eyebrow--crimson" style={{fontSize:'10px'}}>练习模式</span>
        </div>
        <h1 className="font-display font-bold text-stone-900 leading-[1.15] m-0 tracking-tight" style={{fontSize:'24px'}}>{title}</h1>
        {desc && <p className="text-stone-500 text-[12px] mt-1 m-0">{desc}</p>}
      </div>
    </div>
    {right && <div className="mt-3">{right}</div>}
  </div>
);

// ============ Home View ============
// ===== 成就系统 =====
// 用日期对文件分组的工具
const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x.getTime(); };
const dayKey = (ts) => {
  const d = new Date(ts || 0);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const groupByDay = (files) => {
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
const GROWTH_STAGES = [
  { name:'未启程',   emoji:'·',  gate:{count:0,   streak:0},  desc:'录下第一条 · 旅程就开始了' },
  { name:'破冰者',   emoji:'🎬', gate:{count:1,   streak:0},  desc:'你已经敢开口了 · 这一步最难' },
  { name:'开口者',   emoji:'💬', gate:{count:5,   streak:0},  desc:'开口正在变得不需要勇气' },
  { name:'习惯萌芽', emoji:'🌱', gate:{count:7,   streak:3},  desc:'训练正在变成你的本能' },
  { name:'稳定训练', emoji:'💪', gate:{count:20,  streak:7},  desc:'你有了自己的节奏' },
  { name:'表达者',   emoji:'⭐', gate:{count:50,  streak:14}, desc:'镜头前的你 · 松弛下来了' },
  { name:'创作者',   emoji:'👑', gate:{count:100, streak:14}, desc:'表达已经是你的一部分' },
];

// 历史最长连续天数（任何录像天 · 不要求达标）
const computeMaxStreak = (files) => {
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
const computeGrowthStage = (totalCount, maxStreak) => {
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
const STREAK_DAY_MESSAGES = {
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
const ACHIEVEMENTS = [
  { id:'first',     emoji:'🎬', name:'破冰',         desc:'录下第一条预演',     test:(f)=>f.length>=1 },
  { id:'streak3',   emoji:'🔥', name:'连续 3 天',    desc:'连续 3 天达成目标',  test:(_,s)=>s>=3 },
  { id:'streak7',   emoji:'⭐', name:'连续 7 天',    desc:'坚持一周 · 习惯萌芽', test:(_,s)=>s>=7 },
  { id:'streak30',  emoji:'👑', name:'连续 30 天',   desc:'坚持一个月 · 习惯成型', test:(_,s)=>s>=30 },
  { id:'total100',  emoji:'🏆', name:'录满 100 条',  desc:'已经是高频自媒体人', test:(f)=>f.length>=100 },
  { id:'total500',  emoji:'🥇', name:'录满 500 条',  desc:'你已是创作机器',     test:(f)=>f.length>=500 },
];

// 检测从 prev → next 新解锁的 ID
const detectNewlyUnlocked = (prevUnlocked, currentUnlocked) => {
  const prevSet = new Set(prevUnlocked || []);
  return currentUnlocked.filter(id => !prevSet.has(id));
};

// 月历热力图：返回 28 天（4 周 × 7 天）的格子
const getHeatmapGrid = (files) => {
  const today = new Date();
  today.setHours(0,0,0,0);
  const dow = today.getDay(); // 0=Sun
  const totalCells = 28;
  // 起点：(totalCells - 1 - 当前到周末的差) 天前的周日
  // 简化：往前 27 天，从那天开始
  const start = new Date(today);
  start.setDate(start.getDate() - (totalCells - 1));
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
const GoalEditor = ({ goal, onSave, onClose }) => {
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
const WeeklyRecapModal = ({ onClose, files }) => {
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
const dateKeyToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const dateKeyTomorrow = () => {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const readTomorrowTopic = () => {
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
const writeTomorrowTopic = (topic) => {
  try {
    localStorage.setItem('kobo.tomorrowTopic', JSON.stringify({
      topic: String(topic).trim().slice(0, 200),
      forDate: dateKeyTomorrow(),
    }));
  } catch {}
};
const clearTomorrowTopic = () => {
  try { localStorage.removeItem('kobo.tomorrowTopic'); } catch {}
};

const pickRecommendedPractice = (files = [], fallbackTopic = '') => {
  const recent = files.slice(0, 8);
  const hasFewSessions = files.length < 3;
  const weakByTag = recent.find(f => f.tag === 'redo');
  if (hasFewSessions) {
    return {
      mode: 'improv',
      label: '自由口播',
      topic: fallbackTopic || '用 60 秒讲清楚一个观点',
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

const getRecentPracticeItems = (files = []) => files.slice(0, 5).map(file => ({
  filename: file.filename,
  title: file.label || file.topic || file.filename || 'Untitled practice',
  detail: `${Math.round(file.duration || 0)}s · ${file.tag || 'unlabeled'}`,
  date: file.ts ? new Date(file.ts).toLocaleDateString() : 'local',
}));

const HomeView = ({ onSelect, onOpenSettings, onQuickStart, onStartWithTopic }) => {
  const cards = [
    { id: 'improv',       no: '01', icon: 'dice',     cn: '即兴练习',     tag: '抛话题 · 倒计时', desc: '随机抽题 · 倒计时压力下逼出无稿即兴的能力。',           stat: '3', stat_caption: '推荐每日量' },
    { id: 'teleprompter', no: '02', icon: 'document', cn: '爆款文案复刻', tag: '粘贴 · 提词器',   desc: '粘贴爆款文案 / freestyle 关键词，练节奏、语气、镜头感。',  stat: '∞', stat_caption: '任意字数' },
    { id: 'host',         no: '03', icon: 'mic',      cn: '主持人引导',   tag: '追问 · 转写',     desc: '主持人开场抛题 → 追问深挖 → 收尾总结。逼出真观点。',     stat: '5+', stat_caption: '轮次追问' },
    { id: 'tutorial',     no: '04', icon: 'book',     cn: '教程模式',     tag: '学框架 · 实操',   desc: '钩子结构 · PREP · 黄金圈 · 故事三幕 · FCF，学完即录。',     stat: '5', stat_caption: '套表达框架' },
  ];

  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')}`;
  const settings = useSettings();
  const dayOfWeek = ['日','一','二','三','四','五','六'][today.getDay()];
  const [editingGoal, setEditingGoal] = useState(false);
  const [showWeeklyRecap, setShowWeeklyRecap] = useState(false);
  // 「明天的话题」承诺 · 用户昨天预订给今天的题目
  const [tomorrowTopic, setTomorrowTopic] = useState(() => readTomorrowTopic());
  // 「routine anchor」绑定状态 · 没绑且已经录过 1+ 条 · 显示绑定卡（除非用户暂时关掉）
  const [anchorDismissed, setAnchorDismissed] = useState(() => {
    try { return localStorage.getItem('kobo.anchorDismissed') === '1'; } catch { return false; }
  });
  const dismissAnchorCard = () => {
    setAnchorDismissed(true);
    try { localStorage.setItem('kobo.anchorDismissed', '1'); } catch {}
  };
  const [dailyGreeting, setDailyGreeting] = useState('');
  // 月度战报海报
  const [reportBlob, setReportBlob] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const makeMonthlyReport = async () => {
    setReportLoading(true);
    try {
      const unlocked = ACHIEVEMENTS.filter(a => {
        try { return a.test(settings.savedFiles || [], 0); } catch { return false; }
      });
      const blob = await renderMonthlyReportPoster({
        files: settings.savedFiles || [],
        achievements: unlocked,
        restDays: settings.restDays || [],
        dailyGoal: settings.dailyGoal,
        month: new Date(),
      });
      setReportBlob(blob);
    } catch (e) {
      console.error('monthly report error', e);
      alert('生成战报失败：' + (e?.message || e));
    } finally {
      setReportLoading(false);
    }
  };

  // 每日激励语（按日缓存，避免重复调 AI）
  useEffect(() => {
    const todayK = dayKey(Date.now());
    // 先看缓存
    try {
      const cached = JSON.parse(localStorage.getItem('kobo.dailyGreeting') || '{}');
      if (cached.date === todayK && cached.text) {
        setDailyGreeting(cached.text);
        return;
      }
    } catch {}
    // 兜底文案池
    const FALLBACK = [
      '今天先来一条预演 · 别想太多，开口最重要',
      '镜头前再讲一遍，发出去就稳了',
      '一天一条，习惯比天赋重要',
      '今天讲点你前几天没敢讲的吧',
      '随便一个话题，60 秒，先来',
      '你已经在做最重要的事 —— 持续开口',
      '不要等准备好 · 在镜头前讲一遍就是准备',
    ];
    // 短时间不重复调（避免反复 mount 触发）
    setTimeout(() => {
      // 用当前 statsfeedback 调 AI
      const today0 = new Date();
      today0.setHours(0,0,0,0);
      const todayStart = today0.getTime();
      const goal = settings.dailyGoal || { count: 3, durationSec: 60 };
      const minDur = (goal.durationSec || 0) * 0.8;
      const files = settings.savedFiles || [];
      const todayCount = files.filter(f => (f.ts||0) >= todayStart && (f.ts||0) < todayStart + 86400000 && (f.duration||0) >= minDur).length;
      const weekStart = todayStart - 6 * 86400000;
      const weekCount = files.filter(f => (f.ts||0) >= weekStart && (f.duration||0) >= minDur).length;
      // 简化 streak 算法（用 sync 的话需要更多代码，这里复用）
      const restSet = new Set(settings.restDays || []);
      let streak = (todayCount >= goal.count || restSet.has(todayK)) ? 1 : 0;
      let cursor = todayStart - 86400000;
      for (let i = 0; i < 100; i++) {
        if (restSet.has(dayKey(cursor))) { cursor -= 86400000; continue; }
        const dayN = files.filter(f => (f.ts||0) >= cursor && (f.ts||0) < cursor + 86400000 && (f.duration||0) >= minDur).length;
        if (dayN >= goal.count) { streak++; cursor -= 86400000; } else break;
      }
      const dowLabel = ['日','一','二','三','四','五','六'][new Date().getDay()];
      deepseekDailyGreeting({
        apiKey: settings.apiKey,
        streak, totalCount: files.length, weekCount,
        dayOfWeek: `星期${dowLabel}`,
        isRestDay: restSet.has(todayK),
        todayCount, goalCount: goal.count,
      }).then(text => {
        if (!text) throw new Error('empty');
        setDailyGreeting(text);
        try { localStorage.setItem('kobo.dailyGreeting', JSON.stringify({ date: todayK, text })); } catch {}
      }).catch(() => {
        const text = FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
        setDailyGreeting(text);
        try { localStorage.setItem('kobo.dailyGreeting', JSON.stringify({ date: todayK, text })); } catch {}
      });
    }, 300);
  }, []);

  // 每周复盘自动弹出：上次显示 > 6 天前 + 至少 3 条录像
  useEffect(() => {
    const files = settings.savedFiles || [];
    if (files.length < 3) return;
    const now = Date.now();
    const last = settings.lastWeeklyRecap || 0;
    if (last > 0 && (now - last) < 6 * 86400000) return;
    if (last === 0) {
      const oldest = Math.min(...files.map(f => f.ts || now));
      if ((now - oldest) < 7 * 86400000) return; // 首次必须用满 7 天才弹
    }
    setShowWeeklyRecap(true);
  }, [settings.savedFiles, settings.lastWeeklyRecap]);

  const dismissWeeklyRecap = () => {
    settings.setLastWeeklyRecap(Date.now());
    setShowWeeklyRecap(false);
  };

  // 打卡统计
  const stats = useMemo(() => {
    const today0 = new Date();
    today0.setHours(0, 0, 0, 0);
    const todayStart = today0.getTime();
    const goal = settings.dailyGoal || { count: 3, durationSec: 60 };
    const minDur = (goal.durationSec || 0) * 0.8;
    const matches = (f) => (f.duration || 0) >= minDur;
    const inDay = (f, start) => {
      const ts = f.ts || 0;
      return ts >= start && ts < start + 86400000;
    };
    const files = settings.savedFiles || [];
    const restSet = new Set(settings.restDays || []);
    const todayK = dayKey(todayStart);
    const isRestDay = (ts) => restSet.has(dayKey(ts));

    const todayFiles = files.filter(f => inDay(f, todayStart) && matches(f));
    const isTodayRest = restSet.has(todayK);
    const todayMet = todayFiles.length >= goal.count;
    const todayPassed = todayMet || isTodayRest;

    let streak = todayPassed ? 1 : 0;
    let cursor = todayStart - 86400000;
    for (let i = 0; i < 365; i++) {
      if (isRestDay(cursor)) {
        // 休息日不计入 streak 但也不打断
        cursor -= 86400000;
        continue;
      }
      const dayFiles = files.filter(f => inDay(f, cursor) && matches(f));
      if (dayFiles.length >= goal.count) {
        streak++;
        cursor -= 86400000;
      } else break;
    }

    const weekStart = todayStart - 6 * 86400000;
    const weekCount = files.filter(f => (f.ts || 0) >= weekStart && matches(f)).length;
    const allTime = files.filter(matches).length;

    // 本周已用休息日数（最近 7 天内）
    const restUsedInWeek = (settings.restDays || []).filter(d => {
      const ts = new Date(d).getTime();
      return ts >= weekStart && ts <= todayStart;
    }).length;
    const canRestToday = !isTodayRest && !todayMet && restUsedInWeek < 1;

    return {
      todayCount: todayFiles.length, weekCount, allTime,
      streak, goalCount: goal.count, goalDuration: goal.durationSec,
      todayMet, isTodayRest, todayPassed, canRestToday, restUsedInWeek,
      todayK,
    };
  }, [settings.savedFiles, settings.dailyGoal, settings.restDays]);

  // 成长阶段（最鼓励口径：全部录像数 + 任何录像天的最长连续）
  const growth = useMemo(() => {
    const files = settings.savedFiles || [];
    return computeGrowthStage(files.length, computeMaxStreak(files));
  }, [settings.savedFiles]);

  // 是否有今天的「预订题目」（forDate 必须等于今天 · 否则当过期处理）
  const pendingTopic = tomorrowTopic && tomorrowTopic.forDate === dateKeyToday()
    ? tomorrowTopic.topic
    : null;
  const recommendation = pickRecommendedPractice(settings.savedFiles || [], pendingTopic || '');
  const recentItems = getRecentPracticeItems(settings.savedFiles || []);
  const startPresetAndClear = () => {
    if (!pendingTopic) return;
    const t = pendingTopic;
    clearTomorrowTopic();
    setTomorrowTopic(null);
    if (onStartWithTopic) onStartWithTopic(t);
    else onSelect && onSelect('improv'); // 兜底
  };

  return (
    <div className="fade-in">
      {/* ╭─────────────────────────────╮  */}
      {/* │   你昨天给今天预订的题      │  */}
      {/* ╰─────────────────────────────╯  */}
      {pendingTopic && (
        <button onClick={startPresetAndClear}
          className="block w-full mb-4 text-left p-4 bg-[#061A6C] text-white hover:bg-[#001A71] active:bg-[#04135a] transition-colors fade-in"
          style={{borderRadius:'4px'}}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[18px] leading-none">✉️</span>
            <span className="text-[10px] tracking-[0.2em] font-bold uppercase text-[#F1A23F]">
              你昨天给今天预订的题
            </span>
          </div>
          <div className="font-display font-bold text-[15px] leading-snug mb-3 pr-2">
            {pendingTopic}
          </div>
          <div className="inline-flex items-center gap-2 bg-white text-[#061A6C] px-3 py-1.5 text-[12px] font-bold"
               style={{borderRadius:'3px'}}>
            <Icon name="play" size={12} strokeWidth={1.8} /> 立即兑现 · 60s
          </div>
        </button>
      )}

      {/* ╭─────────────────────────────╮  */}
      {/* │   GREETING + TODAY DATE     │  */}
      {/* ╰─────────────────────────────╯  */}
      <section className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase text-stone-400 tracking-[0.16em]">
              {dateStr} · 星期{dayOfWeek}
            </div>
            <h1 className="font-display font-bold text-stone-950 text-[28px] leading-tight mt-1">
              今天的口播训练室
            </h1>
            <p className="text-[13px] text-stone-500 mt-1 leading-relaxed">
              先完成一条聚焦训练，再用复盘决定下一轮怎么练。
            </p>
          </div>
          <div className="shrink-0 bg-white border border-stone-200 px-2.5 py-2 text-right" style={{borderRadius:'4px'}}>
            <div className="text-[9px] tracking-[0.14em] font-bold text-stone-400">本地</div>
            <div className="text-[11px] font-bold text-[#A30236] mt-0.5">训练中</div>
          </div>
        </div>
      </section>

      <ActionPanel className="p-4 mb-4 border-l-[3px] border-l-[#A30236]">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase text-[#A30236] mb-1 tracking-[0.16em]">下一条建议</div>
            <h2 className="font-display font-bold text-[19px] leading-snug text-stone-950">{recommendation.topic}</h2>
            <p className="text-[12px] text-stone-500 mt-2 leading-relaxed">{recommendation.reason}</p>
          </div>
          <Tag color="red">{recommendation.focus}</Tag>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <MetricTile label="连续" value={stats.streak || 0} detail="天" tone="amber" />
          <MetricTile label="本周" value={stats.weekCount || 0} detail="条" tone="emerald" />
        </div>
        <div className="flex gap-2">
          <Btn variant="primary" className="flex-1" onClick={() => {
            if (recommendation.mode === 'improv') onQuickStart?.();
            else onSelect(recommendation.mode);
          }}>
            <Icon name="play" size={15} /> 开始练习
          </Btn>
          <Btn variant="secondary" onClick={() => onSelect('improv')}>换个题目</Btn>
        </div>
      </ActionPanel>

      <div className="grid grid-cols-2 gap-2 mb-5">
        {[
          { id: 'improv', icon: 'dice', title: '自由口播', detail: '随机抽题练表达' },
          { id: 'teleprompter', icon: 'document', title: '提词器', detail: '把稿子讲得自然' },
          { id: 'host', icon: 'mic', title: '主持追问', detail: '练被追问时的反应' },
          { id: 'tutorial', icon: 'book', title: '框架练习', detail: '按结构拆解表达' },
        ].map(item => (
          <button key={item.id} onClick={() => onSelect(item.id)}
            className="text-left bg-white border border-stone-200 p-3 hover:border-[#A30236] transition-colors"
            style={{borderRadius:'4px'}}>
            <Icon name={item.icon} size={18} className="text-[#A30236] mb-3" />
            <div className="font-display font-bold text-[14px] text-stone-950">{item.title}</div>
            <div className="text-[11px] text-stone-500 mt-1 leading-snug">{item.detail}</div>
          </button>
        ))}
      </div>

      <section className="mb-5">
        <SectionHeader
          eyebrow="本地素材库"
          title="最近练习"
          detail={recentItems.length ? '这些录像只保存在当前设备。' : '完成一条练习后，这里会开始积累你的素材。'}
        />
        <div className="space-y-2">
          {recentItems.length ? recentItems.map(item => (
            <div key={item.filename} className="bg-white border border-stone-200 p-3 flex items-center justify-between gap-3" style={{borderRadius:'4px'}}>
              <div className="min-w-0">
                <div className="font-bold text-[13px] text-stone-900 truncate">{item.title}</div>
                <div className="text-[11px] text-stone-500 mt-0.5 truncate">{item.detail}</div>
              </div>
              <div className="text-[10px] text-stone-400 whitespace-nowrap">{item.date}</div>
            </div>
          )) : (
            <div className="bg-white border border-dashed border-stone-300 p-4 text-[13px] text-stone-500 leading-relaxed" style={{borderRadius:'4px'}}>
              还没有录像。先从一条 30 秒自由口播开始。
            </div>
          )}
        </div>
      </section>

      {/* ╭─────────────────────────────╮  */}
      {/* │   成长阶段进度（身份锚）    │  */}
      {/* ╰─────────────────────────────╯  */}
      <div className="mb-5 px-3.5 py-3 bg-white border border-stone-200" style={{borderRadius:'4px'}}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-[22px] leading-none shrink-0">{growth.current.emoji}</span>
            <div className="min-w-0">
              <div className="font-display font-bold text-stone-900 text-[14px] leading-none">
                {growth.current.name}
                <span className="text-stone-400 text-[10px] font-semibold ml-1.5 tracking-wider">Lv.{growth.level}</span>
              </div>
              <div className="text-[10px] text-stone-500 mt-1 leading-tight truncate">{growth.current.desc}</div>
            </div>
          </div>
          {growth.next && (
            <div className="text-right shrink-0 pl-1">
              <div className="text-[8px] text-stone-400 tracking-[0.16em] uppercase">下一阶段</div>
              <div className="text-[11px] font-bold text-[#A30236] leading-tight mt-0.5 whitespace-nowrap">
                {growth.next.emoji} {growth.next.name}
              </div>
            </div>
          )}
        </div>
        {growth.next ? (
          <>
            <div className="h-1.5 bg-stone-100 overflow-hidden" style={{borderRadius:'1px'}}>
              <div className="h-full bg-[#A30236] transition-all duration-700"
                style={{width: `${Math.round(growth.progress * 100)}%`}} />
            </div>
            <div className="text-[10px] text-stone-500 mt-1.5 leading-tight">
              {growth.need.type === 'count'
                ? `再录 ${growth.need.remaining} 条 · 解锁「${growth.next.name}」`
                : `再连续练 ${growth.need.remaining} 天 · 解锁「${growth.next.name}」`}
            </div>
          </>
        ) : (
          <div className="text-[10px] text-emerald-700 font-medium">已抵达最高阶段 · 继续创作就好 🎉</div>
        )}
      </div>

      {/* ╭─────────────────────────────╮  */}
      {/* │   routine anchor 状态行     │  */}
      {/* ╰─────────────────────────────╯  */}
      {settings.routineAnchor && (() => {
        const a = getRoutineAnchor(settings.routineAnchor);
        if (!a) return null;
        return (
          <div className="flex items-center justify-between bg-stone-100 px-3 py-2 mb-4" style={{borderRadius:'3px'}}>
            <span className="text-[11px] text-stone-700 flex items-center gap-2 min-w-0">
              <span className="text-[14px] leading-none">🪝</span>
              <span className="truncate">绑定到 <strong className="text-stone-900">{a.emoji} {a.label}</strong> · 通知文案已切换</span>
            </span>
            <button onClick={() => settings.setRoutineAnchor('')}
              className="text-stone-400 hover:text-[#A30236] text-[11px] shrink-0 transition-colors">
              解绑
            </button>
          </div>
        );
      })()}

      {/* ╭─────────────────────────────╮  */}
      {/* │   routine anchor 绑定卡     │  */}
      {/* ╰─────────────────────────────╯  */}
      {!settings.routineAnchor && !anchorDismissed && (settings.savedFiles?.length || 0) >= 1 && (
        <Card className="p-4 mb-4 border-l-[3px] border-[#F1A23F]">
          <div className="flex items-start gap-3 mb-3">
            <div className="text-[24px] leading-none shrink-0">🪝</div>
            <div className="flex-1 min-w-0">
              <div className="text-stone-400 text-[9px] tracking-[0.18em] font-bold mb-1" style={{color:'#C77A1C'}}>
                习惯锚点 · 让明天更容易开始
              </div>
              <div className="font-display font-bold text-stone-900 text-[14px] leading-snug">
                把 30 秒预演 · 绑到你已经在做的事
              </div>
              <p className="text-[11px] text-stone-600 mt-1 leading-relaxed">
                BJ Fogg：「After I 既有动作 · I will 新习惯」· 绑了的习惯存活率是没绑的 4 倍。
              </p>
            </div>
            <button onClick={dismissAnchorCard} className="text-stone-400 hover:text-stone-700 text-lg leading-none px-1 shrink-0" aria-label="先不绑">×</button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {ROUTINE_ANCHORS.map(a => (
              <button key={a.id} onClick={() => settings.setRoutineAnchor(a.id)}
                className="text-left p-2.5 border border-stone-200 hover:border-[#A30236] hover:bg-[#FBEFF2] transition-colors flex items-center gap-2"
                style={{borderRadius:'3px'}}>
                <span className="text-[18px] leading-none shrink-0">{a.emoji}</span>
                <span className="text-[12px] font-semibold text-stone-700 truncate">{a.label}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* ╭─────────────────────────────╮  */}
      {/* │   AI 每日激励语              │  */}
      {/* ╰─────────────────────────────╯  */}
      {dailyGreeting && (
        <div className="mb-5 p-3 border-l-2 border-[#F1A23F] bg-stone-50 fade-in" style={{borderRadius:'2px'}}>
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="text-[9px] text-stone-400 tracking-[0.18em] font-bold uppercase">🤖 AI 每日提示</span>
            <span className="text-[9px] text-stone-300">{dateStr}</span>
          </div>
          <div className="text-[13px] text-stone-800 leading-relaxed">{dailyGreeting}</div>
        </div>
      )}

      <button onClick={onQuickStart || (() => onSelect('improv'))}
        className="relative w-full overflow-hidden mb-6 text-left bg-stone-950 text-white p-3.5 hover:bg-stone-900 active:bg-stone-950 transition-colors block group border border-stone-800"
        style={{borderRadius:'4px'}}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white text-stone-950 flex items-center justify-center shrink-0" style={{borderRadius:'4px'}}>
            <Icon name="bolt" size={18} strokeWidth={1.9} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] tracking-[0.18em] font-bold text-[#F1A23F]">速练入口</div>
            <div className="font-display font-bold text-[15px] leading-snug mt-0.5">30 秒随机题 · 直接开口</div>
            <div className="text-white/60 text-[11px] mt-0.5 truncate">没时间设置时，用它保住今天的手感。</div>
          </div>
          <div className="shrink-0 bg-white text-stone-950 px-3 py-1.5 text-[12px] font-bold group-hover:bg-[#F1A23F]"
               style={{borderRadius:'3px'}}>
            开练
          </div>
        </div>
      </button>

      {/* ╭─────────────────────────────╮  */}
      {/* │   打卡 DASHBOARD            │  */}
      {/* ╰─────────────────────────────╯  */}
      <div className="mb-6 p-4 border border-stone-200 bg-white" style={{borderRadius:'4px'}}>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center">
            <div className={`font-display font-bold text-2xl tabular-nums leading-none ${stats.streak > 0 ? 'text-[#A30236]' : 'text-stone-400'}`}>
              {stats.streak > 0 ? '🔥' : '·'} {stats.streak}
            </div>
            <div className="text-[9px] text-stone-500 tracking-[0.14em] uppercase mt-1.5 font-semibold">连续天数</div>
          </div>
          <div className="text-center border-x border-stone-200">
            <div className="font-display font-bold text-stone-900 text-2xl tabular-nums leading-none">{stats.todayCount}</div>
            <div className="text-[9px] text-stone-500 tracking-[0.14em] uppercase mt-1.5 font-semibold">今日已录</div>
          </div>
          <div className="text-center">
            <div className="font-display font-bold text-stone-900 text-2xl tabular-nums leading-none">{stats.weekCount}</div>
            <div className="text-[9px] text-stone-500 tracking-[0.14em] uppercase mt-1.5 font-semibold">本周累计</div>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
            <span className="text-[11px] text-stone-700">
              今日目标 <span className="font-bold">{stats.goalCount}</span> 条 × <span className="font-bold">{stats.goalDuration}</span>s
              {stats.isTodayRest && <span className="ml-1.5 inline-flex items-center gap-1 bg-sky-100 text-sky-800 px-1.5 py-0.5 text-[9px] font-bold tracking-wider" style={{borderRadius:'2px'}}>💤 休息日</span>}
            </span>
            <div className="flex items-center gap-2">
              {stats.canRestToday && (
                <button onClick={() => {
                  if (window.confirm(`今天作为休息日？\n\n- streak 不会断（休息日跳过）\n- 但当天不打卡\n- 7 天内只能用 1 次`)) {
                    settings.addRestDay(stats.todayK);
                  }
                }} className="text-[11px] text-sky-700 hover:text-sky-900 flex items-center gap-1">
                  💤 今日休息
                </button>
              )}
              {stats.isTodayRest && (
                <button onClick={() => {
                  if (window.confirm('取消今日休息日？')) settings.removeRestDay(stats.todayK);
                }} className="text-[11px] text-stone-500 hover:text-[#A30236]">
                  取消休息
                </button>
              )}
              <button onClick={() => setEditingGoal(true)} className="text-[11px] text-stone-500 hover:text-[#A30236] flex items-center gap-1">
                <Icon name="settings" size={10}/> 改目标
              </button>
            </div>
          </div>
          <div className="h-2 bg-stone-200 overflow-hidden mb-2" style={{borderRadius:'2px'}}>
            <div className={`h-full transition-all duration-500 ${
              stats.isTodayRest ? 'bg-sky-400' :
              stats.todayMet ? 'bg-emerald-500' : 'bg-[#A30236]'
            }`}
                 style={{width: stats.isTodayRest ? '100%' : `${Math.min(100, (stats.todayCount/Math.max(1,stats.goalCount))*100)}%`}} />
          </div>
          {stats.isTodayRest ? (
            <div className="text-[11px] text-sky-700 font-medium">
              💤 今天休息一下 · streak 不会断{stats.streak > 0 && ` · 已连续 ${stats.streak} 天 🔥`}
            </div>
          ) : stats.todayMet ? (
            <div className="text-[11px] text-emerald-700 font-medium">
              ✓ 今日完成{stats.streak > 1 && ` · 已连续 ${stats.streak} 天 🔥`}
            </div>
          ) : (
            <div className="text-[11px] text-stone-500">
              还差 <span className="font-bold text-[#A30236]">{stats.goalCount - stats.todayCount}</span> 条达成今日目标
              {stats.streak > 0 && ` · 续断连续 ${stats.streak} 天`}
            </div>
          )}
        </div>
      </div>
      {editingGoal && <GoalEditor goal={settings.dailyGoal} onSave={g => { settings.setDailyGoal(g); setEditingGoal(false); }} onClose={() => setEditingGoal(false)} />}
      {showWeeklyRecap && <WeeklyRecapModal files={settings.savedFiles || []} onClose={dismissWeeklyRecap} />}
      {reportBlob && <PosterShareModal blob={reportBlob} onClose={() => setReportBlob(null)}
        fileName={`口播月报-${new Date().toISOString().slice(0,7)}.png`} />}

      {/* ╭─────────────────────────────╮  */}
      {/* │   月历热力图                │  */}
      {/* ╰─────────────────────────────╯  */}
      {(() => {
        const cells = getHeatmapGrid(settings.savedFiles || []);
        const restSet = new Set(settings.restDays || []);
        return (
          <div className="mb-6 p-4 border border-stone-200 bg-white" style={{borderRadius:'4px'}}>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
              <div className="flex items-center gap-2">
                <span className="w-1 h-3.5 bg-[#A30236]" />
                <h3 className="font-display font-bold text-stone-900 text-[13px] m-0">「训练中的创作者」的形状</h3>
              </div>
              <div className="flex items-center gap-1 text-[9px] text-stone-500">
                <span className="w-2 h-2 bg-stone-100" style={{borderRadius:'1px'}}/>0
                <span className="w-2 h-2 bg-[#FBEFF2]" style={{borderRadius:'1px'}}/>1-2
                <span className="w-2 h-2 bg-[#EEA5B4]" style={{borderRadius:'1px'}}/>3-5
                <span className="w-2 h-2 bg-[#A30236]" style={{borderRadius:'1px'}}/>6+
                <span className="w-2 h-2 bg-sky-300" style={{borderRadius:'1px'}}/>💤
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['日','一','二','三','四','五','六'].map((d, i) => (
                <div key={i} className="text-center text-[9px] text-stone-400">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((c, i) => {
                const k = dayKey(c.date.getTime());
                const isRest = restSet.has(k);
                const bg = isRest ? 'bg-sky-200' :
                           c.count === 0 ? 'bg-stone-100' :
                           c.count <= 2 ? 'bg-[#FBEFF2]' :
                           c.count <= 5 ? 'bg-[#EEA5B4]' :
                           'bg-[#A30236]';
                const text = isRest ? 'text-sky-900' :
                             c.count > 5 ? 'text-white' :
                             c.count > 0 ? 'text-[#A30236]' : 'text-stone-400';
                return (
                  <div key={i}
                    className={`aspect-square flex flex-col items-center justify-center text-[9px] ${bg} ${text} ${c.isToday ? 'ring-2 ring-[#A30236] ring-offset-1' : ''}`}
                    style={{borderRadius:'2px'}}
                    title={`${c.date.getMonth()+1}/${c.date.getDate()} · ${isRest ? '休息日' : c.count + ' 条'}`}>
                    <span className="font-bold leading-none">{c.date.getDate()}</span>
                    {isRest ? <span className="text-[8px] leading-none mt-0.5">💤</span>
                            : c.count > 0 && <span className="text-[8px] leading-none mt-0.5 opacity-80">×{c.count}</span>}
                  </div>
                );
              })}
            </div>
            <div className="text-[10px] text-stone-500 mt-2 leading-relaxed flex items-center justify-between gap-2 flex-wrap">
              <span>
                {(() => {
                  const activeDays = cells.filter(c => c.count > 0).length;
                  const total = cells.reduce((a,b) => a + b.count, 0);
                  return `过去 4 周：${activeDays} 天有预演 · 累计 ${total} 条`;
                })()}
              </span>
              <button onClick={makeMonthlyReport} disabled={reportLoading}
                className="text-[10px] tracking-wider font-bold px-2 py-1 bg-[#A30236] text-white hover:bg-[#7E001E] transition-colors disabled:opacity-50"
                style={{borderRadius:'2px'}}>
                {reportLoading ? '生成中...' : '📱 本月战报'}
              </button>
            </div>
          </div>
        );
      })()}

      {/* ╭─────────────────────────────╮  */}
      {/* │   成就 / 徽章                │  */}
      {/* ╰─────────────────────────────╯  */}
      {(() => {
        const unlocked = ACHIEVEMENTS.filter(a => {
          try { return a.test(settings.savedFiles || [], stats.streak); } catch { return false; }
        });
        const newly = detectNewlyUnlocked(settings.unlockedAchievements, unlocked.map(a => a.id));
        // 一次性标记为已见（在 effect 里做）
        if (newly.length > 0) {
          setTimeout(() => settings.markAchievementsSeen(newly), 0);
        }
        return (
          <div className="mb-6 p-4 border border-stone-200 bg-white" style={{borderRadius:'4px'}}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-1 h-3.5 bg-[#A30236]" />
                <h3 className="font-display font-bold text-stone-900 text-[13px] m-0">成就徽章</h3>
              </div>
              <span className="text-[10px] text-stone-500 tabular-nums">{unlocked.length} / {ACHIEVEMENTS.length}</span>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
              {ACHIEVEMENTS.map(a => {
                const isUnlocked = unlocked.some(u => u.id === a.id);
                const isNew = newly.includes(a.id);
                return (
                  <div key={a.id}
                    className={`shrink-0 w-[68px] p-2 border text-center ${
                      isUnlocked
                        ? (isNew ? 'border-[#F1A23F] bg-amber-50 fade-in' : 'border-[#A30236] bg-[#FBEFF2]')
                        : 'border-stone-200 bg-stone-50 opacity-50'
                    }`}
                    style={{borderRadius:'3px'}}
                    title={a.desc}
                  >
                    <div className="text-2xl leading-none">{a.emoji}</div>
                    <div className="text-[9px] font-bold mt-1.5 leading-tight text-stone-700">{a.name}</div>
                    {isNew && <div className="text-[8px] text-[#A30236] font-bold mt-1 tracking-wider">新解锁</div>}
                  </div>
                );
              })}
            </div>
            <div className="text-[10px] text-stone-500 mt-2">
              {unlocked.length === 0
                ? '录第一条就能解锁第一个徽章'
                : newly.length > 0
                  ? `🎉 刚刚解锁了 ${newly.length} 个新徽章`
                  : `滑动看全部 · 还有 ${ACHIEVEMENTS.length - unlocked.length} 个等着你`}
            </div>
          </div>
        );
      })()}

      {/* ╭─────────────────────────────╮  */}
      {/* │   我的高光（⭐ 标记的录像）   │  */}
      {/* ╰─────────────────────────────╯  */}
      {(() => {
        const allStars = (settings.savedFiles || []).filter(f => f.tag === 'star');
        const stars = allStars.slice(0, 6);
        if (stars.length === 0) return null;
        return (
          <div className="mb-6 p-4 border border-stone-200 bg-white" style={{borderRadius:'4px'}}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-1 h-3.5 bg-[#F1A23F]" />
                <h3 className="font-display font-bold text-stone-900 text-[13px] m-0">⭐ 我的高光</h3>
              </div>
              <span className="text-[10px] text-stone-500 tabular-nums">
                {allStars.length > stars.length ? `最近 ${stars.length} 条 · 共 ${allStars.length}` : `${allStars.length} 条`}
              </span>
            </div>
            <div className="space-y-1.5">
              {stars.map(f => {
                const d = new Date(f.ts || 0);
                const ds = `${d.getMonth()+1}/${d.getDate()}`;
                return (
                  <div key={f.filename} className="flex items-center gap-2 px-2 py-2 bg-amber-50/50 border border-amber-200" style={{borderRadius:'3px'}}>
                    <span className="text-base shrink-0">⭐</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-stone-800 truncate">{f.label || f.filename}</div>
                      <div className="text-[10px] text-stone-500">{ds} · {f.duration ? `${Math.round(f.duration)}s` : '—'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-[10px] text-stone-500 mt-2 leading-relaxed">
              录完一条后觉得好的就点 ⭐ 标记 · 这里就是你的"作品集"，定期翻翻找感觉。
            </div>
          </div>
        );
      })()}

      {/* ╭─────────────────────────────╮  */}
      {/* │   🏆 AI 评分榜（模拟发布）   │  */}
      {/* ╰─────────────────────────────╯  */}
      {(() => {
        const scored = (settings.savedFiles || [])
          .filter(f => f.virtualPub && typeof f.virtualPub.score === 'number')
          .sort((a, b) => (b.virtualPub.score || 0) - (a.virtualPub.score || 0))
          .slice(0, 5);
        if (scored.length === 0) return null;
        const best = scored[0];
        return (
          <div className="mb-6 p-4 border border-stone-200 bg-white" style={{borderRadius:'4px'}}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-1 h-3.5 bg-[#7c3aed]" />
                <h3 className="font-display font-bold text-stone-900 text-[13px] m-0">🏆 AI 模拟发布 · 评分榜</h3>
              </div>
              <span className="text-[10px] text-stone-500 tabular-nums">{scored.length} 条已模拟发布</span>
            </div>

            {/* 第一名突出展示 */}
            <div className="mb-3 p-3 border-2"
              style={{borderRadius:'3px', borderColor:'#7c3aed', background:'linear-gradient(135deg, #F3E8FF 0%, #FAFAF9 100%)'}}>
              <div className="flex items-center gap-3">
                <div className="text-center px-3 py-2 bg-white border-2"
                  style={{borderRadius:'4px', borderColor:'#7c3aed'}}>
                  <div className="text-[8px] tracking-[0.18em] font-bold text-purple-700">评分</div>
                  <div className="font-display font-bold text-3xl text-purple-700 tabular-nums leading-none">{best.virtualPub.score}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-stone-500 mb-0.5">最高分 · {best.virtualPub.platform}</div>
                  <div className="font-display font-bold text-stone-900 text-sm leading-tight truncate">{best.label || best.filename}</div>
                  <div className="text-[10px] text-stone-500 mt-1 flex items-center gap-1.5">
                    <span>❤️ {formatCount(best.virtualPub.estimated?.likes || 0)}</span>
                    <span>·</span>
                    <span>⭐ {formatCount(best.virtualPub.estimated?.saves || 0)}</span>
                    {best.virtualPub.vibe && VIBE_META[best.virtualPub.vibe] && (
                      <>
                        <span>·</span>
                        <span>{VIBE_META[best.virtualPub.vibe].emoji} {VIBE_META[best.virtualPub.vibe].label}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 其余 2-5 名横排 */}
            {scored.length > 1 && (
              <div className="space-y-1">
                {scored.slice(1).map((f, i) => (
                  <div key={f.filename} className="flex items-center gap-2 px-2 py-1.5 hover:bg-stone-50" style={{borderRadius:'2px'}}>
                    <span className="text-[10px] text-stone-400 font-bold tabular-nums w-4">{i + 2}</span>
                    <div className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold tabular-nums" style={{borderRadius:'2px'}}>{f.virtualPub.score}</div>
                    <div className="flex-1 min-w-0 text-[11px] text-stone-700 truncate">{f.label || f.filename}</div>
                    <div className="text-[10px] text-stone-400 shrink-0">{f.virtualPub.platform}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="text-[10px] text-stone-500 mt-2 leading-relaxed">
              录完后用「🌐 模拟发布」假发到平台 · AI 会给你打分 · 这里看见你的成长。
            </div>
          </div>
        );
      })()}

      {/* ╭─────────────────────────────╮  */}
      {/* │   SECTION LABEL             │  */}
      {/* ╰─────────────────────────────╯  */}
      <div className="mb-3 flex items-end justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1 h-4 bg-[#A30236] inline-block" />
          <h2 className="font-display font-bold text-stone-900 text-[14px] m-0">{cards.length} 种预演模式</h2>
        </div>
        <span className="text-stone-400 text-[10px] flex items-center gap-1">点击进入 <Icon name="chevron" size={10}/></span>
      </div>

      {/* ╭─────────────────────────────╮  */}
      {/* │   MODE CARDS                │  */}
      {/* ╰─────────────────────────────╯  */}
      <div className="space-y-2.5 mb-8">
        {cards.map(c => (
          <button key={c.id} onClick={() => onSelect(c.id)}
            className="w-full text-left bg-white hover:bg-[#FBEFF2] active:bg-[#F4D4DD] transition-colors p-3.5 group block border border-stone-200"
            style={{borderRadius:'4px'}}>
            <div className="flex items-stretch gap-3.5">
              {/* Icon block — crimson on hover, tinted otherwise */}
              <div className="w-12 h-12 shrink-0 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center group-hover:bg-[#A30236] group-hover:text-white transition-colors relative"
                   style={{borderRadius:'3px'}}>
                <Icon name={c.icon} size={22} strokeWidth={1.7} />
                {/* corner accent */}
                <span className="absolute top-0.5 left-0.5 text-[8px] font-display font-bold tabular-nums opacity-50">{c.no}</span>
              </div>
              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-display font-bold text-stone-900 text-[15px] leading-tight m-0 group-hover:text-[#A30236] transition-colors">
                    {c.cn}
                  </h3>
                  <span className="text-[9px] tracking-[0.12em] uppercase text-stone-400 font-semibold border border-stone-200 px-1.5 py-px" style={{borderRadius:'2px'}}>{c.tag}</span>
                </div>
                <p className="text-stone-500 text-[11px] leading-relaxed m-0">{c.desc}</p>
              </div>
              {/* Right stat + arrow */}
              <div className="flex flex-col items-end justify-between shrink-0 text-right">
                <div>
                  <div className="font-display font-bold text-[#A30236] text-[17px] leading-none tabular-nums">{c.stat}</div>
                  <div className="text-stone-500 text-[8px] tracking-wide uppercase mt-1 leading-tight whitespace-nowrap">{c.stat_caption}</div>
                </div>
                <Icon name="chevron" size={14} className="text-stone-300 group-hover:text-[#A30236]" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* ╭─────────────────────────────╮  */}
      {/* │   FOOTER                    │  */}
      {/* ╰─────────────────────────────╯  */}
      <div className="pt-4 border-t border-stone-200 space-y-2">
        <div className="flex items-center justify-between text-stone-400 text-[10px]">
          <span className="flex items-center gap-1.5">
            <Icon name="shield" size={11} strokeWidth={1.5}/>
            录像仅存本地 · 不会上传
          </span>
          <span>v.1.0</span>
        </div>
        <div className="flex items-center justify-center pt-1">
          <span className="text-[10px] tracking-[0.18em] uppercase font-bold text-[#A30236]">
            CharlieLam 制作
          </span>
        </div>
      </div>
    </div>
  );
};

// ============ Mode 1: 即兴练习 ============
const DURATIONS = [
  { value: 30, label: '30s 钩动', desc: '极致钩子，逼你前 3 秒就抓人' },
  { value: 60, label: '60s 单点', desc: '一个观点讲清楚' },
  { value: 180, label: '3min 完整', desc: '一条完整的短视频' },
  { value: 0, label: '自由', desc: '不限时长，自己手动停' },
];

const AI_SOURCE  = '__ai__';
const ALL_SOURCE = '__all__';

// 默认精选池：排除明显泛闲聊 / 泛生活 / 脑洞 / 情感八卦类，保留更贴近用户长期议题的题。
// 被排除的分类仍能手动选择，只是不再进入「精选混合」。
const DEFAULT_TOPIC_SOURCE_KEYS = [
  '小红书爆款',
  '人生哲学',
  '价值观',
  '社会议题',
  '时代与代际',
  '自我认知',
  '工作与职场',
  '金钱与财富',
];

const getDefaultTopicSources = () => {
  const sources = {};
  DEFAULT_TOPIC_SOURCE_KEYS.forEach(key => {
    if (TOPIC_TYPES[key]) sources[key] = TOPIC_TYPES[key];
  });
  Object.entries(ISSUES).forEach(([key, value]) => {
    sources[key] = value;
  });
  return sources;
};

const getDefaultTopicsPool = () => {
  const pools = [
    ...DEFAULT_TOPIC_SOURCE_KEYS.map(key => TOPIC_TYPES[key]?.topics || []),
    ...Object.values(ISSUES).map(v => v.topics),
  ];
  return [].concat(...pools);
};

// 全量题库仍保留给手动分类和旧数据兼容。
const getAllTopicsPool = () => {
  const pools = [
    ...Object.values(TOPIC_TYPES).map(v => v.topics),
    ...Object.values(ISSUES).map(v => v.topics),
  ];
  return [].concat(...pools);
};

const ImprovMode = ({ intent, clearIntent }) => {
  const [stage, setStage] = useState('config');
  const [duration, setDuration] = useState(60);
  const [customDuration, setCustomDuration] = useState(90);
  const [useCustom, setUseCustom] = useState(false);
  const [source, setSource] = useState(ALL_SOURCE);   // 默认从精选池里抽
  // 从首页 HERO 一键进来 → 进入「速记模式」：渲染极简 QuickStartView 而不是 3 屏 config
  const [quickMode, setQuickMode] = useState(false);
  // 当从 intent 强行指定 topic 时（比如「明天的话题」），抑制 source useEffect 抢占一次
  const skipNextSourceDrawRef = useRef(false);
  const [topic, setTopic] = useState('');
  const [preCount, setPreCount] = useState(3);
  const [timeLeft, setTimeLeft] = useState(0);
  const [aiTheme, setAiTheme] = useState('');
  const [aiPool, setAiPool] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const settings = useSettings();
  const cam = useCamera();
  const rec = useRecorder();

  const effectiveDuration = useCustom ? Math.max(5, parseInt(customDuration) || 60) : duration;

  const allSources = useMemo(() => {
    const result = {};
    Object.entries(TOPIC_TYPES).forEach(([k,v]) => { result[k] = { ...v, kind: 'general' }; });
    Object.entries(ISSUES).forEach(([k,v]) => { result[k] = { ...v, kind: 'issue' }; });
    return result;
  }, []);

  const totalDefaultTopics = useMemo(() => getDefaultTopicsPool().length, []);

  const drawTopic = useCallback(() => {
    if (source === AI_SOURCE) {
      if (aiPool.length) setTopic(pickRandom(aiPool, topic));
      return;
    }
    if (source === ALL_SOURCE) {
      setTopic(pickRandom(getDefaultTopicsPool(), topic));
      return;
    }
    const src = allSources[source];
    if (!src) return;
    setTopic(pickRandom(src.topics, topic));
  }, [source, topic, allSources, aiPool]);

  useEffect(() => {
    // intent 指定 topic 时跳过本轮自动抽题（避免覆盖 preset topic）
    if (skipNextSourceDrawRef.current) {
      skipNextSourceDrawRef.current = false;
      return;
    }
    if (source === AI_SOURCE) {
      if (aiPool.length) setTopic(pickRandom(aiPool));
      return;
    }
    if (source === ALL_SOURCE) {
      setTopic(pickRandom(getDefaultTopicsPool()));
      return;
    }
    drawTopic();
  /* eslint-disable-next-line */
  }, [source]);

  // 接住 intent 意图：
  // - 'quick30'                      → 30s + 全题库随机
  // - { type:'preset', topic:'xxx' } → 60s + 指定题目（明天的话题用）
  // 不在 useEffect 里调 cam.start() · 那会丢失 iOS 的 user-gesture 链
  // 用户在 QuickStartView 里点「立即开练」时 begin() 才被触发 · gesture 链完整
  useEffect(() => {
    if (intent === 'quick30') {
      setDuration(30);
      setUseCustom(false);
      setSource(ALL_SOURCE);
      setQuickMode(true);
      clearIntent && clearIntent();
    } else if (intent && intent.type === 'preset' && intent.topic) {
      setDuration(60);
      setUseCustom(false);
      // 关键：先开抑制 flag · 再 setSource · 这样 source useEffect 不会覆盖我们的 topic
      skipNextSourceDrawRef.current = true;
      setSource(ALL_SOURCE);
      setTopic(intent.topic);
      setQuickMode(true);
      clearIntent && clearIntent();
    }
  }, [intent, clearIntent]);

  const generateAI = async () => {
    if (!aiTheme.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const topics = await deepseekGenerateTopics({ apiKey: settings.apiKey, theme: aiTheme.trim(), count: 6 });
      setAiPool(topics);
      setSource(AI_SOURCE);
      if (topics.length) setTopic(topics[0]);
    } catch (e) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const begin = async () => {
    const s = await cam.start();
    if (!s) return;
    setStage('ready');
    let n = 3;
    setPreCount(n);
    const timer = setInterval(() => {
      n--;
      if (n >= 0) setPreCount(n);
      if (n < 0) {
        clearInterval(timer);
        setStage('recording');
        setTimeLeft(effectiveDuration || 0);
        rec.start(s);
      }
    }, 1000);
  };

  useEffect(() => {
    if (stage !== 'recording') return;
    if (effectiveDuration === 0) return;
    if (timeLeft <= 0) { finish(); return; }
    const t = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [stage, timeLeft]);

  const finish = () => {
    rec.stop();
    cam.stop();
    setStage('done');
  };
  const resetAll = () => { setStage('config'); cam.stop(); };
  const retrySame = async () => {
    rec.stop();
    setStage('config');
    setTimeout(begin, 50);
  };

  // 「速记」模式 · 跳过 3 屏 config 直接给一张「题目 + 立即开练」卡
  // 两种入口共用这张卡：
  //   30 秒速记 · 首页 HERO 进来 · 全题库随机 · 可换一题
  //   60 秒预订 · 「明天的话题」进来 · 题目已经写好 · 不显示换一题
  if (stage === 'config' && quickMode) {
    const isPresetTake = effectiveDuration === 60;  // 60s 路径仅由 preset intent 触发
    return (
      <div className="fade-in py-4">
        <div className="eyebrow eyebrow--crimson mb-2" style={{fontSize:'10px'}}>
          {isPresetTake ? '今天的预订 · 你昨天给自己选的' : '30 秒速记 · 从首页一键进入'}
        </div>
        <h1 className="font-display font-bold text-stone-900 m-0 mb-1 leading-[1.1] tracking-tight" style={{fontSize:'22px'}}>
          {topic ? (isPresetTake ? '今天要讲这个' : '抽到这一题') : '抽题中...'}
        </h1>
        <p className="text-[11px] text-stone-500 mb-5 leading-tight">
          {isPresetTake ? '一题一录 · 60 秒 · 这是你给自己的承诺' : '从精选池随机 · 不喜欢可换'}
        </p>

        <div className="border-l-[3px] border-[#A30236] bg-white border-y border-r border-stone-200 p-5 mb-5 relative">
          <div className="absolute top-3 right-3 w-7 h-7 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:'3px'}}>
            <Icon name="target" size={14} strokeWidth={1.7}/>
          </div>
          <div className="text-[10px] text-[#A30236] mb-2 font-medium tracking-[0.12em] uppercase">
            {isPresetTake ? '昨天预订的题目' : `精选混合 · ${totalDefaultTopics}+ 题`}
          </div>
          <div className="font-display font-bold text-stone-900 leading-snug text-[20px] mt-1 pr-8">
            {topic || '...'}
          </div>
        </div>

        <RecordingModeChooser compact className="mb-4" />

        <Btn variant="primary" size="lg" onClick={begin} disabled={!topic} className="w-full mb-3">
          <Icon name="rec" size={16} strokeWidth={1.8}/> 立即开练 · {effectiveDuration} 秒
        </Btn>

        {cam.error && <div className="text-red-600 text-xs mb-3 text-center">{cam.error}</div>}

        <div className="flex items-center justify-between text-[12px] mt-4 pt-4 border-t border-stone-200">
          {/* 预订题目隐藏「换一题」· 不能换 · 这是承诺 */}
          {isPresetTake ? (
            <span className="text-stone-400 italic">题目你已经承诺过了 · 不换</span>
          ) : (
            <button onClick={drawTopic} className="text-stone-600 hover:text-[#A30236] flex items-center gap-1.5 transition-colors">
              <Icon name="refresh" size={12} strokeWidth={1.8}/> 换一题
            </button>
          )}
          <button onClick={() => setQuickMode(false)} className="text-stone-400 hover:text-stone-700 transition-colors">
            完整配置 →
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'ready') return <ReadyOverlay countdown={preCount} videoRef={cam.videoRef} voiceOnly={cam.voiceOnly} hint={topic} />;

  if (stage === 'recording') {
    const progress = effectiveDuration ? Math.max(0, timeLeft) / effectiveDuration : 0;
    const urgent = effectiveDuration && timeLeft <= 5 && timeLeft > 0;
    return (
      <div className="absolute inset-0 z-[70] bg-stone-950" style={{borderRadius:0}}>
        <CameraFrame videoRef={cam.videoRef} voiceOnly={cam.voiceOnly} streamRef={cam.streamRef} className="w-full h-full" status="recording"
          overlay={
            <>
              <PracticeStageOverlay
                topic={topic}
                modeLabel="自由口播"
                elapsed={effectiveDuration ? Math.max(0, effectiveDuration - timeLeft) : rec.duration}
                duration={effectiveDuration}
                status={urgent ? 'ending' : 'recording'}
                onStop={finish}
              />
              {effectiveDuration > 0 && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-stone-800/40">
                  <div className="h-full bg-[#A30236] transition-all duration-1000 ease-linear" style={{width: `${progress*100}%`}} />
                </div>
              )}
              <div className="absolute left-3 right-3 flex items-center justify-between gap-2" style={{bottom:'calc(env(safe-area-inset-bottom, 0px) + 16px)'}}>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-2 bg-[#A30236] text-white px-3 py-1.5 text-[11px] tracking-[0.2em] font-bold" style={{borderRadius:"2px"}}>
                    <span className="w-2 h-2 rounded-full bg-white pulse-rec" />REC
                  </div>
                  <BeautyButton cam={cam} /><AudienceViewButton cam={cam} />
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => { drawTopic(); setTimeLeft(effectiveDuration); }}
                    className="flex items-center gap-1.5 bg-stone-950/80 backdrop-blur text-white px-2.5 py-1.5 text-[11px] tracking-wider font-bold"
                    style={{borderRadius:'2px'}}
                    title="换一道题，倒计时归零"
                  >
                    <Icon name="refresh" size={13} />换题
                  </button>
                </div>
              </div>
            </>
          }
        />
      </div>
    );
  }

  if (stage === 'done') {
    return <DoneView
      blob={rec.blob}
      contextLabel={`话题：${topic}`}
      duration={rec.duration}
      onRetry={retrySame}
      onNew={() => { drawTopic(); resetAll(); }}
    />;
  }

  // config stage
  return (
    <div className="space-y-6 fade-in">
      <Card className="p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:"3px"}}>
            <Icon name="clock" size={16} strokeWidth={1.7} />
          </div>
          <div>
            <div className="text-stone-400 text-[9px] tracking-[0.18em] uppercase font-semibold">STEP 01</div>
            <div className="font-display font-bold text-[#A30236] text-[13px] leading-none mt-0.5">第一步 · 选时长</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          {DURATIONS.map(d => (
            <button key={d.value} onClick={() => { setUseCustom(false); setDuration(d.value); }}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                !useCustom && duration === d.value ? 'border-amber-400 bg-amber-50' : 'border-stone-200 hover:border-stone-300'
              }`}>
              <div className="font-semibold">{d.label}</div>
              <div className="text-xs text-stone-500 mt-1">{d.desc}</div>
            </button>
          ))}
        </div>
        <div onClick={() => setUseCustom(true)}
          className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 flex-wrap cursor-pointer ${
            useCustom ? 'border-amber-400 bg-amber-50' : 'border-stone-200 hover:border-stone-300'
          }`}>
          <div className="font-semibold whitespace-nowrap">⚙ 自定义</div>
          <input
            type="number" min="5" max="600" value={customDuration}
            onClick={e => { e.stopPropagation(); setUseCustom(true); }}
            onChange={e => { setUseCustom(true); setCustomDuration(e.target.value); }}
            className="w-20 px-2 py-1 border border-stone-300 rounded text-center text-sm focus:outline-none focus:border-amber-400"
          />
          <span className="text-stone-500 text-sm">秒</span>
          <div className="text-xs text-stone-500 ml-auto whitespace-nowrap">想练多久就多久</div>
        </div>
      </Card>

      <RecordingModeChooser className="mb-6" />

      <Card className="p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:"3px"}}>
            <Icon name="list" size={16} strokeWidth={1.7} />
          </div>
          <div>
            <div className="text-stone-400 text-[9px] tracking-[0.18em] uppercase font-semibold">STEP 02</div>
            <div className="font-display font-bold text-[#A30236] text-[13px] leading-none mt-0.5">第二步 · 话题来源</div>
          </div>
        </div>
        {/* 精选混合抽 —— 默认选项 */}
        <button onClick={() => setSource(ALL_SOURCE)}
          className={`w-full mb-4 p-3 text-left transition-all border-2 ${
            source === ALL_SOURCE ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200 hover:border-stone-300'
          }`}
          style={{borderRadius:'3px'}}
        >
          <div className="flex items-center gap-2">
            <Icon name="refresh" size={14} className={source === ALL_SOURCE ? 'text-[#A30236]' : 'text-stone-500'} />
            <span className="font-semibold text-sm">精选混合</span>
            <Tag color="amber">{totalDefaultTopics}+ 题</Tag>
            <span className="ml-auto text-[10px] text-stone-500">推荐 · 更贴近你的长期议题</span>
          </div>
          <div className="text-xs text-stone-500 mt-1">已排除泛情感、闲聊、脑洞、生活问答；保留观点、小红书、职业、金钱和长期议题。</div>
        </button>

        <div className="mb-3 text-xs text-stone-500 font-medium tracking-wider uppercase">通用类别</div>
        <div className="flex flex-wrap gap-2 mb-5">
          {Object.entries(TOPIC_TYPES).map(([k,v]) => (
            <button key={k} onClick={() => setSource(k)}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                source === k ? 'bg-stone-900 text-amber-300' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}>
              {k} <span className="text-xs opacity-60">· {v.topics.length}</span>
            </button>
          ))}
        </div>
        <div className="mb-3 text-xs text-stone-500 font-medium tracking-wider uppercase">你的 5 个长期议题</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ISSUES).map(([k,v]) => (
            <button key={k} onClick={() => setSource(k)}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                source === k ? 'bg-stone-900 text-amber-300' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}>
              {k} <span className="text-xs opacity-60">· {v.topics.length}</span>
            </button>
          ))}
        </div>

        {/* AI 选题（输入主题 → 生成 6 题）已经砍掉。
            第一性原理：「不知道讲什么」的痛点 · 用精选题池随机抽 1 步就能解
            AI 选题要 4 步：想主题 → 输入 → 等 → 挑一条。本末倒置。
            想练特定主题的高级用户可以用提词器模式自己写。 */}
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:"3px"}}>
            <Icon name="target" size={16} strokeWidth={1.7} />
          </div>
          <div>
            <div className="text-stone-400 text-[9px] tracking-[0.18em] uppercase font-semibold">STEP 03</div>
            <div className="font-display font-bold text-[#A30236] text-[13px] leading-none mt-0.5">第三步 · 抽到的话题</div>
          </div>
        </div>
        <div className="border-l-[3px] border-[#A30236] bg-white border-y border-r border-stone-200 p-5 mb-4 relative">
          <div className="absolute top-3 right-3 w-7 h-7 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:"3px"}}>
            <Icon name="target" size={14} strokeWidth={1.7}/>
          </div>
          <div className="text-[10px] text-[#A30236] mb-2 font-medium tracking-[0.12em] uppercase">
            {source === AI_SOURCE ? `AI 生成 · 主题：${aiTheme}`
              : source === ALL_SOURCE ? `精选混合 · ${totalDefaultTopics}+ 题随机`
              : `${source} · ${allSources[source]?.blurb}`}
          </div>
          <div className="font-display font-bold text-stone-900 leading-snug text-[18px] mt-1">{topic || '...'}</div>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Btn variant="ghost" onClick={drawTopic} disabled={source === AI_SOURCE && !aiPool.length}><Icon name="refresh" size={14}/> 换一题</Btn>
          <div className="flex gap-3">
            {cam.error && <span className="text-sm text-red-600 self-center">{cam.error}</span>}
            <Btn variant="primary" size="lg" onClick={begin} disabled={!topic}>开始录制 →</Btn>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ============ Mode 2: 提词器 ============
// 关键词模板：内置 10 套常用骨架 + 用户保存的自定义模板
const KEYWORD_TEMPLATES = [
  { id:'hook',     name:'🪝 钩子结构',   keywords:['钩子开头', '观点', '论证', '收尾'] },
  { id:'prep',     name:'📐 PREP',       keywords:['观点', '理由', '例子', '重申观点'] },
  { id:'golden',   name:'⭕ 黄金圈',     keywords:['Why', 'How', 'What'] },
  { id:'story',    name:'📖 故事三幕',   keywords:['背景', '冲突', '顿悟'] },
  { id:'fcf',      name:'🎯 FCF',        keywords:['事实', '冲突', '收获'] },
  { id:'pain',     name:'💔 痛点共鸣',   keywords:['现象', '危害', '原因', '解决办法'] },
  { id:'reveal',   name:'🔍 行业揭秘',   keywords:['揭秘', '塑造期待', '解决方案'] },
  { id:'list',     name:'📋 干货盘点',   keywords:['炸裂开头', '盘点 1', '盘点 2', '盘点 3', '互动结尾'] },
  { id:'contrast', name:'⚔️ 反差式',     keywords:['反差钩子', '信任背书', '解决方案'] },
  { id:'sandao',   name:'🗡 三把刀通用', keywords:['钩子', '信任背书', '解决方案', '互动 CTA'] },
];

const TeleprompterMode = () => {
  const [stage, setStage] = useState('config'); // config | recording | done
  const [tpMode, setTpMode] = useState('script'); // script (完整稿) | keywords (关键词 freestyle)
  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState(32);
  const [speed, setSpeed] = useState(40); // px / s
  const [mode, setMode] = useState('sentence'); // scroll | sentence  —— 默认分句更适合跟读
  const [running, setRunning] = useState(false);
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [voiceFollow, setVoiceFollow] = useState(true); // 跟读模式默认开启
  const [recognition, setRecognition] = useState(null);
  const [transcript, setTranscript] = useState(''); // 累计 + 当前识别文本（合并）
  const transcriptRef = useRef('');
  // 关键词模式
  const [keywords, setKeywords]   = useState([]);
  const [kwInput, setKwInput]     = useState('');
  const [kwIdx, setKwIdx]         = useState(0);
  const [extractText, setExtractText] = useState('');
  const [extractLoading, setExtractLoading] = useState(false);
  const [extractError, setExtractError]     = useState('');
  // ✨ AI 帮我写 60s 稿
  const [aiTopic, setAiTopic]         = useState('');
  const [aiDuration, setAiDuration]   = useState(60);
  const [aiScriptOpen, setAiScriptOpen] = useState(false);
  const [aiScriptLoading, setAiScriptLoading] = useState(false);
  const [aiScriptError, setAiScriptError] = useState('');
  const [aiScriptStructure, setAiScriptStructure] = useState(null); // 上次生成的结构标签
  // 用户自定义模板
  const [userTemplates, setUserTemplates] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kobo.keywordTemplates') || '[]'); } catch { return []; }
  });
  const persistTemplates = (arr) => {
    try { localStorage.setItem('kobo.keywordTemplates', JSON.stringify(arr)); } catch {}
  };
  const applyTemplate = (tpl) => {
    setKeywords([...tpl.keywords]);
    setKwIdx(0);
  };
  const saveCurrentAsTemplate = () => {
    if (!keywords.length) return;
    const name = (window.prompt('给这套关键词起个名字（10 字以内）：') || '').trim();
    if (!name) return;
    setUserTemplates(prev => {
      const next = [{ id: 'u_' + Date.now(), name, keywords: [...keywords], ts: Date.now() }, ...prev].slice(0, 30);
      persistTemplates(next);
      return next;
    });
  };
  const deleteUserTemplate = (id) => {
    setUserTemplates(prev => {
      const next = prev.filter(t => t.id !== id);
      persistTemplates(next);
      return next;
    });
  };
  const scrollerRef = useRef(null);
  const rafRef = useRef(null);
  const settings = useSettings();
  const cam = useCamera();
  const rec = useRecorder();

  // 关键词录入：从输入框 commit（Enter 或 逗号 触发）
  const commitKeyword = () => {
    const parts = kwInput.split(/[,，\s]+/).map(s => s.trim()).filter(Boolean);
    if (!parts.length) return;
    setKeywords(prev => [...prev, ...parts]);
    setKwInput('');
  };
  const removeKeyword = (i) => setKeywords(prev => prev.filter((_, j) => j !== i));
  const clearKeywords = () => { setKeywords([]); setKwIdx(0); };

  const aiExtractKeywords = async () => {
    if (!extractText.trim()) { setExtractError('先粘贴一段长文本'); return; }
    setExtractLoading(true);
    setExtractError('');
    try {
      const kws = await deepseekExtractKeywords({ apiKey: settings.apiKey, text: extractText.trim(), count: 10 });
      setKeywords(kws);
      setKwIdx(0);
    } catch (e) {
      setExtractError(e.message);
    } finally {
      setExtractLoading(false);
    }
  };

  // ✨ AI 帮我写 60s 稿
  const aiGenerateScript = async () => {
    if (!aiTopic.trim()) { setAiScriptError('请先填话题'); return; }
    setAiScriptLoading(true);
    setAiScriptError('');
    setAiScriptStructure(null);
    try {
      const r = await deepseekGenerateScript({
        apiKey: settings.apiKey,
        topic: aiTopic.trim(),
        durationSec: aiDuration,
      });
      // 灌入主 textarea
      setText(r.script || '');
      setAiScriptStructure(r.structure || null);
      setAiScriptOpen(false); // 关闭面板 · 让用户看到 textarea 已填好
    } catch (e) {
      setAiScriptError(e.message);
    } finally {
      setAiScriptLoading(false);
    }
  };

  const sentences = useMemo(() => splitTeleprompterSentences(text), [text]);
  // 每句去掉空白和标点后的纯中文/字母字数，用于计算 ASR 已读到哪一句
  const sentenceCharLens = useMemo(() =>
    sentences.map(s => s.replace(/[\s\p{P}]/gu, '').length),
    [sentences]
  );

  // 滚动模式（仅在 不开跟读 + scroll 模式 下走自动滚）
  useEffect(() => {
    if (stage !== 'recording' || mode !== 'scroll' || !running || voiceFollow) return;
    let last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      if (scrollerRef.current) {
        scrollerRef.current.scrollTop += speed * dt;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [stage, mode, running, speed, voiceFollow]);

  // ===== 跟读模式：ASR 听你念到哪儿，提词器跳到哪儿 =====
  const setupRecognition = async () => {
    // Capacitor 原生 ASR 优先
    const cap = window.Capacitor;
    const nativeSR = cap?.Plugins?.SpeechRecognition;
    if (nativeSR && cap.isNativePlatform?.()) {
      try {
        const a = await nativeSR.available();
        if (!a?.available) throw new Error('no native SR');
        const p = await nativeSR.checkPermissions();
        if (p?.speechRecognition !== 'granted') {
          const r = await nativeSR.requestPermissions();
          if (r?.speechRecognition !== 'granted') throw new Error('perm denied');
        }
        await nativeSR.removeAllListeners?.();
        nativeSR.addListener('partialResults', (data) => {
          const t = (data?.matches?.[0] || '').trim();
          if (!t) return;
          transcriptRef.current = t;
          setTranscript(t);
        });
        nativeSR.addListener('listeningState', (s) => {
          if (s?.status === 'stopped') {
            // 累计到 transcript，重启监听
            setTimeout(() => {
              try { nativeSR.start({ language:'zh-CN', maxResults:2, partialResults:true, popup:false }); } catch {}
            }, 200);
          }
        });
        await nativeSR.start({ language:'zh-CN', maxResults:2, partialResults:true, popup:false });
        setRecognition({ _native: true, stop: async () => { try { await nativeSR.stop(); await nativeSR.removeAllListeners(); } catch {} } });
        return;
      } catch (e) { console.warn('[Teleprompter SR] native failed, fall back:', e?.message || e); }
    }
    // Web Speech 兜底
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = 'zh-CN';
    let acc = '';
    r.onresult = (e) => {
      let interimT = '', finalT = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalT += t; else interimT += t;
      }
      if (finalT) acc += finalT;
      const full = acc + interimT;
      transcriptRef.current = full;
      setTranscript(full);
    };
    r.onend = () => { try { r.start(); } catch {} };
    try { r.start(); } catch {}
    setRecognition(r);
  };

  // 跟读 → 根据已识别字数推算当前句子
  useEffect(() => {
    if (stage !== 'recording' || !voiceFollow) return;
    const cleanCount = transcript.replace(/[\s\p{P}]/gu, '').length;
    let cum = 0;
    for (let i = 0; i < sentenceCharLens.length; i++) {
      cum += sentenceCharLens[i];
      // 加点容差：识别比脚本短 30% 也算"念到这句了"
      if (cum * 0.7 >= cleanCount) {
        setSentenceIdx(prev => Math.max(prev, i));
        // scroll mode 下也同步 scrollTop
        if (mode === 'scroll' && scrollerRef.current) {
          // 估算字符到 px 的比例：用整个文本高度除以总字数
          const totalLen = sentenceCharLens.reduce((a,b)=>a+b,0) || 1;
          const ratio = Math.min(1, cleanCount / totalLen);
          const sc = scrollerRef.current;
          const targetTop = ratio * Math.max(0, sc.scrollHeight - sc.clientHeight);
          sc.scrollTop = targetTop;
        }
        return;
      }
    }
    setSentenceIdx(sentences.length - 1);
  }, [transcript, voiceFollow, sentenceCharLens, mode, sentences.length, stage]);

  const loadSample = (s) => { setText(s.text); };

  const begin = async () => {
    if (tpMode === 'script' && !text.trim()) return;
    if (tpMode === 'keywords' && !keywords.length) return;
    const s = await cam.start();
    if (!s) return;
    setStage('recording');
    setSentenceIdx(0);
    setKwIdx(0);
    transcriptRef.current = '';
    setTranscript('');
    if (scrollerRef.current) scrollerRef.current.scrollTop = 0;
    rec.start(s);
    setRunning(true);
    if (voiceFollow) setupRecognition();
  };

  const finish = () => {
    setRunning(false);
    if (recognition) try { recognition.stop(); } catch {}
    setRecognition(null);
    rec.stop();
    cam.stop();
    setStage('done');
  };

  const reset = () => {
    setRunning(false);
    if (recognition) try { recognition.stop(); } catch {}
    setRecognition(null);
    setStage('config');
    cam.stop();
  };

  // 跟读模式开/关 → 启动 / 停止 ASR（在录制中）
  useEffect(() => {
    if (stage !== 'recording') return;
    if (voiceFollow && !recognition) setupRecognition();
    if (!voiceFollow && recognition) { try { recognition.stop(); } catch {} setRecognition(null); }
    // eslint-disable-next-line
  }, [voiceFollow, stage]);

  if (stage === 'recording') {
    return (
      <div className="absolute inset-0 z-[70] bg-stone-950 fade-in" style={{borderRadius:0}}>
        <CameraFrame videoRef={cam.videoRef} voiceOnly={cam.voiceOnly} streamRef={cam.streamRef} className="w-full h-full" status="recording"
          overlay={
            <>
              {/* 顶部 HUD：REC + 时长 + 美颜 */}
              <div className="absolute left-3 right-3 flex items-center justify-between gap-2" style={{top:'calc(env(safe-area-inset-top, 0px) + 12px)'}}>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-2 bg-[#A30236] text-white px-3 py-1.5 text-[11px] tracking-[0.2em] font-bold" style={{borderRadius:"2px"}}>
                    <span className="w-2 h-2 rounded-full bg-white pulse-rec" />录制 · {formatTime(rec.duration)}
                  </div>
                  <BeautyButton cam={cam} /><AudienceViewButton cam={cam} />
                </div>
                <div className="flex items-center gap-1.5">
                  {voiceFollow && tpMode === 'script' && (
                    <div className="bg-emerald-600/90 text-white px-2.5 py-1.5 text-[10px] tracking-wider font-bold flex items-center gap-1.5" style={{borderRadius:'2px'}}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white pulse-rec" />跟读
                    </div>
                  )}
                  {tpMode === 'keywords' && keywords.length > 0 && (
                    <div className="bg-[#F1A23F] text-stone-900 px-2.5 py-1.5 text-[10px] tracking-wider font-bold" style={{borderRadius:'2px'}}>
                      关键词 {kwIdx + 1} / {keywords.length}
                    </div>
                  )}
                  {tpMode === 'script' && mode === 'sentence' && (
                    <div className="bg-stone-950/80 text-white px-2.5 py-1.5 text-[10px] tracking-wider font-bold" style={{borderRadius:'2px'}}>
                      {sentenceIdx + 1} / {sentences.length}
                    </div>
                  )}
                </div>
              </div>
              {/* 提词器叠加 —— 占下半屏 */}
              <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{paddingBottom:'calc(env(safe-area-inset-bottom, 0px) + 92px)'}}>
                {tpMode === 'keywords' ? (
                  /* 关键词模式：进度点 + 上一个 + 当前（巨大居中）+ 下一个 */
                  <div className="w-full bg-stone-950/90 px-6 py-7">
                    <div className="flex items-center justify-center gap-1 mb-4">
                      {keywords.map((_, i) => (
                        <span key={i} className={`h-1 rounded-full transition-all ${
                          i === kwIdx ? 'w-8 bg-[#F1A23F]' : i < kwIdx ? 'w-3 bg-stone-500' : 'w-3 bg-stone-700'
                        }`} />
                      ))}
                    </div>
                    {kwIdx > 0 && (
                      <div className="text-center text-stone-500 leading-tight mb-3" style={{fontSize: `${Math.round(fontSize*0.4)}px`}}>
                        ← {keywords[kwIdx - 1]}
                      </div>
                    )}
                    <div className="text-center text-white leading-tight font-display font-bold tracking-wider"
                         style={{fontSize: `${Math.round(fontSize*1.4)}px`}}>
                      {keywords[kwIdx] || ''}
                    </div>
                    <div className="flex justify-center mt-3">
                      <span className="h-[2px] bg-[#A30236]" style={{width:'56px'}} />
                    </div>
                    {kwIdx + 1 < keywords.length && (
                      <div className="text-center text-stone-400 leading-tight mt-3" style={{fontSize: `${Math.round(fontSize*0.55)}px`}}>
                        {keywords[kwIdx + 1]} →
                      </div>
                    )}
                  </div>
                ) : mode === 'scroll' ? (
                  <div ref={scrollerRef} className="w-full overflow-hidden bg-stone-950/85" style={{maxHeight:'44vh'}}>
                    <div className="px-7 py-5 text-stone-100 leading-relaxed whitespace-pre-wrap" style={{fontSize: `${fontSize}px`, paddingBottom: '120px', paddingTop: '40px'}}>
                      {text}
                    </div>
                  </div>
                ) : (
                  <div className="w-full bg-stone-950/90 px-7 py-8">
                    {/* 当前句突出 + 下一句弱显（"已念过的"灰掉，"正在念的"亮色） */}
                    {sentenceIdx > 0 && (
                      <div className="text-stone-500 leading-snug mb-2" style={{fontSize: `${Math.round(fontSize*0.55)}px`}}>
                        {sentences[sentenceIdx - 1] || ''}
                      </div>
                    )}
                    <div className="text-stone-100 leading-snug font-display font-bold" style={{fontSize: `${fontSize}px`}}>
                      {sentences[sentenceIdx] || ''}
                    </div>
                    {sentenceIdx + 1 < sentences.length && (
                      <div className="text-stone-400 leading-snug mt-2" style={{fontSize: `${Math.round(fontSize*0.65)}px`}}>
                        {sentences[sentenceIdx + 1]}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* 底部控件 —— 悬浮在提词器下方 */}
              <div className="absolute left-3 right-3 flex items-center justify-between flex-wrap gap-2" style={{bottom:'calc(env(safe-area-inset-bottom, 0px) + 16px)'}}>
                <div className="flex items-center gap-1.5 bg-stone-950/80 backdrop-blur px-2 py-1.5" style={{borderRadius:'2px'}}>
                  {tpMode === 'keywords' ? (
                    /* 关键词模式：手动切关键词 */
                    <>
                      <Btn size="sm" variant="secondary" onClick={() => setKwIdx(Math.max(0, kwIdx - 1))}>←</Btn>
                      <Btn size="sm" variant="accent" onClick={() => setKwIdx(Math.min(keywords.length - 1, kwIdx + 1))}>下一个 →</Btn>
                    </>
                  ) : voiceFollow ? (
                    <>
                      <button onClick={() => setVoiceFollow(false)}
                        className="bg-emerald-600 text-white px-2 py-1 text-[10px] font-bold flex items-center gap-1"
                        style={{borderRadius:'2px'}}
                        title="切到手动模式"
                      ><Icon name="mic" size={11}/>跟读 ON</button>
                      {/* 跟读模式下手动后退/前进作为修正手段 */}
                      <Btn size="sm" variant="secondary" onClick={() => setSentenceIdx(Math.max(0, sentenceIdx-1))}>←</Btn>
                      <Btn size="sm" variant="secondary" onClick={() => setSentenceIdx(Math.min(sentences.length-1, sentenceIdx+1))}>→</Btn>
                    </>
                  ) : mode === 'scroll' ? (
                    <>
                      <button onClick={() => setVoiceFollow(true)}
                        className="bg-stone-800 text-white/80 px-2 py-1 text-[10px] font-bold flex items-center gap-1"
                        style={{borderRadius:'2px'}}
                        title="开跟读：ASR 听你念到哪儿就滚到哪儿"
                      ><Icon name="mic" size={11}/>跟读 OFF</button>
                      <Btn size="sm" variant="secondary" onClick={() => setRunning(r=>!r)}>{running ? '⏸' : '▶'}</Btn>
                      <input type="range" min="10" max="120" value={speed} onChange={e => setSpeed(+e.target.value)} className="w-20" />
                      <span className="text-[10px] text-stone-300 tabular-nums px-1">{speed}</span>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setVoiceFollow(true)}
                        className="bg-stone-800 text-white/80 px-2 py-1 text-[10px] font-bold flex items-center gap-1"
                        style={{borderRadius:'2px'}}
                        title="开跟读"
                      ><Icon name="mic" size={11}/>跟读 OFF</button>
                      <Btn size="sm" variant="secondary" onClick={() => setSentenceIdx(Math.max(0, sentenceIdx-1))}>←</Btn>
                      <Btn size="sm" variant="accent" onClick={() => setSentenceIdx(Math.min(sentences.length-1, sentenceIdx+1))}>→</Btn>
                    </>
                  )}
                </div>
                <Btn variant="danger" size="sm" onClick={finish}>停止</Btn>
              </div>
            </>
          }
        />
      </div>
    );
  }

  if (stage === 'done') {
    return <DoneView
      blob={rec.blob}
      contextLabel={tpMode === 'keywords'
        ? `提词器 · 关键词 freestyle · ${keywords.length} 词 · ${formatTime(rec.duration)}`
        : `提词器 · 完整稿 · ${text.length} 字 · ${formatTime(rec.duration)}`}
      duration={rec.duration}
      onRetry={begin}
      onNew={reset}
      transcript={transcript}
    />;
  }

  return (
    <div className="space-y-6 fade-in">
      {/* 提词器模式切换 */}
      <Card className="p-3">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setTpMode('script')}
            className={`text-left p-3 border-2 transition-all ${
              tpMode === 'script' ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200 hover:border-stone-300'
            }`} style={{borderRadius:'3px'}}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Icon name="document" size={13} />
              <span className="font-semibold text-sm">完整稿模式</span>
            </div>
            <div className="text-[11px] text-stone-500 leading-snug">字字念 · 滚动或分句</div>
          </button>
          <button onClick={() => setTpMode('keywords')}
            className={`text-left p-3 border-2 transition-all ${
              tpMode === 'keywords' ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200 hover:border-stone-300'
            }`} style={{borderRadius:'3px'}}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Icon name="sparkle" size={13} />
              <span className="font-semibold text-sm">关键词模式</span>
              <Tag color="orange">freestyle</Tag>
            </div>
            <div className="text-[11px] text-stone-500 leading-snug">只看关键词 · 自由发挥串联</div>
          </button>
        </div>
      </Card>

      {tpMode === 'keywords' ? (
        <>
          {/* 关键词模板库 */}
          <Card className="p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:'3px'}}>
                <Icon name="list" size={16} strokeWidth={1.7}/>
              </div>
              <h3 className="font-display font-bold text-stone-900 text-[16px] m-0">关键词模板</h3>
              <Tag color="amber">点一下应用</Tag>
            </div>
            <div className="text-[11px] text-stone-500 mb-3 leading-relaxed">
              内置 10 套表达骨架 · 一键填入。可以应用后再增减关键词。
            </div>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {KEYWORD_TEMPLATES.map(tpl => (
                <button key={tpl.id} onClick={() => applyTemplate(tpl)}
                  className="text-left p-2 border border-stone-200 hover:border-[#A30236] bg-white transition-colors"
                  style={{borderRadius:'2px'}}>
                  <div className="text-xs font-semibold leading-tight">{tpl.name}</div>
                  <div className="text-[9px] text-stone-500 mt-0.5 leading-tight truncate">
                    {tpl.keywords.join(' · ')}
                  </div>
                </button>
              ))}
            </div>
            {userTemplates.length > 0 && (
              <>
                <div className="text-[10px] text-stone-500 mt-3 mb-2 tracking-wider uppercase font-bold">我的模板（{userTemplates.length}）</div>
                <div className="space-y-1.5">
                  {userTemplates.map(tpl => (
                    <div key={tpl.id} className="flex items-center gap-2 p-2 border border-stone-200 bg-white" style={{borderRadius:'2px'}}>
                      <button onClick={() => applyTemplate(tpl)} className="flex-1 text-left">
                        <div className="text-xs font-semibold">{tpl.name}</div>
                        <div className="text-[9px] text-stone-500 mt-0.5 truncate">
                          {tpl.keywords.join(' · ')}
                        </div>
                      </button>
                      <button onClick={() => {
                        if (window.confirm(`删除模板"${tpl.name}"？`)) deleteUserTemplate(tpl.id);
                      }} className="text-stone-400 hover:text-red-600 text-sm shrink-0 px-2">×</button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* 关键词录入 */}
          <Card className="p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:"3px"}}>
                <Icon name="list" size={16} strokeWidth={1.7} />
              </div>
              <h3 className="font-display font-bold text-stone-900 text-[16px] m-0">手动录入关键词</h3>
              {keywords.length > 0 && (
                <button onClick={saveCurrentAsTemplate} className="ml-auto text-[11px] text-[#A30236] hover:underline flex items-center gap-1">
                  💾 存为模板
                </button>
              )}
            </div>
            <div className="text-xs text-stone-500 mb-3 leading-relaxed">
              逐个录入串联你这段口播的核心词。<br/>
              <span className="text-stone-700">配合豆包语音输入法</span>可以边说边录，比打字快 3 倍。<br/>
              一个一个回车提交，也支持逗号 / 空格分隔批量录入。
            </div>
            <div className="flex gap-2 mb-3">
              <input
                value={kwInput}
                onChange={e => setKwInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitKeyword(); } }}
                placeholder="如：反差 / 故事 / 数据 / 收尾..."
                className="flex-1 px-3 py-2 border border-stone-300 text-sm focus:outline-none focus:border-[#A30236]"
                style={{borderRadius:'2px'}}
              />
              <Btn size="md" variant="secondary" onClick={commitKeyword} disabled={!kwInput.trim()}>添加</Btn>
            </div>
            {keywords.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {keywords.map((k, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-stone-900 text-white px-2.5 py-1 text-xs font-medium" style={{borderRadius:'2px'}}>
                      <span className="text-amber-300 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                      {k}
                      <button onClick={() => removeKeyword(i)} className="text-stone-400 hover:text-red-300 ml-1">×</button>
                    </span>
                  ))}
                </div>
                <button onClick={clearKeywords} className="text-xs text-stone-500 hover:text-red-600">清空全部</button>
              </>
            ) : (
              <div className="text-[11px] text-stone-400 italic">还没录入关键词</div>
            )}
          </Card>

          {/* AI 一键提取 */}
          <Card className="p-6">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:"3px"}}>
                <Icon name="sparkle" size={16} strokeWidth={1.7} />
              </div>
              <h3 className="font-display font-bold text-stone-900 text-[16px] m-0 flex items-center gap-2">
                AI 一键提取 <Tag color="violet">DeepSeek</Tag>
              </h3>
            </div>
            <div className="text-xs text-stone-500 mb-3">
              粘贴你写好的稿子 / 大纲 / 长文本，AI 自动提炼 10 个串联关键词。
            </div>
            <textarea
              value={extractText}
              onChange={e => setExtractText(e.target.value)}
              placeholder="把要提取的长文本粘贴进来..."
              className="w-full h-32 p-3 border border-stone-300 text-sm leading-relaxed focus:outline-none focus:border-[#A30236] resize-none"
              style={{borderRadius:'3px'}}
            />
            <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
              <div className="text-xs text-stone-500">{extractText.length} 字</div>
              <Btn variant="accent" onClick={aiExtractKeywords} disabled={!extractText.trim() || extractLoading}>
                {extractLoading ? '提取中...' : 'AI 提取 10 个关键词'}
              </Btn>
            </div>
            {extractError && <div className="text-xs text-red-600 mt-2">{extractError}</div>}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:"3px"}}>
                <Icon name="settings" size={16} strokeWidth={1.7} />
              </div>
              <h3 className="font-display font-bold text-stone-900 text-[16px] m-0">字号</h3>
            </div>
            <input type="range" min="18" max="56" value={fontSize} onChange={e => setFontSize(+e.target.value)} className="w-full" />
            <div className="bg-stone-950 rounded p-3 mt-2 text-center">
              <div className="text-white font-display font-bold" style={{fontSize:`${fontSize}px`}}>关键词</div>
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            {cam.error && <span className="text-sm text-red-600 self-center">{cam.error}</span>}
            <Btn variant="primary" size="lg" onClick={begin} disabled={!keywords.length}>
              开始 freestyle 录制 →
            </Btn>
          </div>
        </>
      ) : (
        <>
          <Card className="p-6">
            <div className="flex items-center gap-2.5 mb-4 flex-wrap">
              <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:"3px"}}>
                <Icon name="document" size={16} strokeWidth={1.7} />
              </div>
              <h3 className="font-display font-bold text-stone-900 text-[16px] m-0">粘贴文案</h3>
              <button onClick={() => setAiScriptOpen(o => !o)}
                className="ml-auto flex items-center gap-1 px-2.5 py-1 text-[11px] tracking-wider font-bold bg-gradient-to-r from-purple-100 to-amber-100 text-purple-700 hover:from-purple-200 hover:to-amber-200 transition-all"
                style={{borderRadius:'3px'}}>
                <Icon name="sparkle" size={12} /> ✨ AI 帮我写
              </button>
            </div>

            {/* AI 剧本生成内联面板 */}
            {aiScriptOpen && (
              <div className="mb-4 p-3 border-2 border-purple-300 bg-purple-50/50 fade-in" style={{borderRadius:'3px'}}>
                <div className="text-[10px] text-purple-700 tracking-wider uppercase font-bold mb-2 flex items-center gap-2">
                  ✨ AI 60 秒剧本生成
                  <span className="text-stone-400 normal-case tracking-normal">🤖 内容由 AI 生成 · 仅供参考</span>
                </div>
                <input type="text"
                  value={aiTopic}
                  onChange={e => setAiTopic(e.target.value)}
                  placeholder="话题（如：为什么我不再追求自律）"
                  className="w-full px-3 py-2 border border-purple-300 text-sm mb-2"
                  style={{borderRadius:'2px'}}
                  disabled={aiScriptLoading}
                />
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] text-stone-600">时长</span>
                  {[30, 60, 90, 120].map(d => (
                    <button key={d} onClick={() => setAiDuration(d)}
                      className={`px-2 py-1 text-[11px] font-bold ${aiDuration === d ? 'bg-purple-600 text-white' : 'bg-white border border-stone-300 text-stone-600'}`}
                      style={{borderRadius:'2px'}}
                      disabled={aiScriptLoading}>
                      {d}s
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={aiGenerateScript} disabled={aiScriptLoading || !aiTopic.trim()}
                    className="px-3 py-1.5 text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-40"
                    style={{borderRadius:'2px'}}>
                    {aiScriptLoading ? '思考中...' : '🚀 生成稿子'}
                  </button>
                  <button onClick={() => { setAiScriptOpen(false); setAiScriptError(''); }}
                    className="text-xs text-stone-500 hover:text-stone-800">
                    收起
                  </button>
                  {aiScriptError && <span className="text-[11px] text-red-600">{aiScriptError}</span>}
                </div>
                <div className="text-[10px] text-stone-500 mt-2 leading-relaxed">
                  💡 生成的稿子会自动填到下方文本框 · 你可以再编辑 · {aiDuration}s 大约 {Math.round(aiDuration * 4)} 字
                </div>
              </div>
            )}

            {/* 上次 AI 生成的结构标签（提示用户稿子按什么结构写的） */}
            {aiScriptStructure && Array.isArray(aiScriptStructure) && aiScriptStructure.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-1">
                <span className="text-[10px] text-stone-500 tracking-wider uppercase font-bold mr-1">结构</span>
                {aiScriptStructure.map((s, i) => (
                  <React.Fragment key={i}>
                    <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 font-bold tracking-wider" style={{borderRadius:'2px'}}>{s}</span>
                    {i < aiScriptStructure.length - 1 && <span className="text-amber-700 text-[10px] font-bold">→</span>}
                  </React.Fragment>
                ))}
              </div>
            )}

            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={'把你刷到的爆款文案粘贴进来 · 或点上方"✨ AI 帮我写"让 AI 生成。也可以直接选下方样本试用。'}
              className="w-full h-48 p-4 border border-stone-300 rounded-xl text-sm leading-relaxed focus:outline-none focus:border-amber-400 resize-none"
            />
            <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
              <span>{text.length} 字 · 约 {sentences.length} 句 · 预估口播 {Math.round(text.length/4)} 秒</span>
              {text && <button onClick={() => setText('')} className="text-stone-500 hover:text-red-600">清空</button>}
            </div>
          </Card>

          <PromptWorkbench
            title="稿件工作台"
            detail="粘贴自己的稿子，生成 60 秒口播稿，或从长文里提取关键词。"
            bullets={[
              '开头只保留一个清楚的钩子。',
              '第一遍练节奏，第二遍练镜头感。',
              '好用的表达可以存成你自己的模板。',
            ]}
          />

          <Card className="p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:"3px"}}>
                <Icon name="settings" size={16} strokeWidth={1.7} />
              </div>
              <h3 className="font-display font-bold text-stone-900 text-[16px] m-0">提词器设置</h3>
            </div>
            <div className="space-y-5">
              <div>
                <div className="text-sm font-medium mb-2">显示模式</div>
                <div className="flex gap-2">
                  {[{v:'scroll',l:'滚动',d:'整段连续向上滚'},{v:'sentence',l:'分句',d:'一次显示一句，最自然'}].map(o => (
                    <button key={o.v} onClick={() => setMode(o.v)}
                      className={`flex-1 text-left p-3 rounded-lg border-2 transition-all ${
                        mode === o.v ? 'border-amber-400 bg-amber-50' : 'border-stone-200 hover:border-stone-300'
                      }`}>
                      <div className="font-medium text-sm">{o.l}</div>
                      <div className="text-xs text-stone-500 mt-0.5">{o.d}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">字号 <span className="text-stone-400 font-normal">({fontSize}px)</span></div>
                <input type="range" min="18" max="56" value={fontSize} onChange={e => setFontSize(+e.target.value)} className="w-full" />
                <div className="bg-stone-950 rounded-lg p-3 mt-2">
                  <div className="text-stone-100" style={{fontSize:`${fontSize*0.5}px`}}>预览：这是你录制时看到的字号</div>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            {cam.error && <span className="text-sm text-red-600 self-center">{cam.error}</span>}
            <Btn variant="primary" size="lg" onClick={begin} disabled={!text.trim()}>开始录制 →</Btn>
          </div>
        </>
      )}
    </div>
  );
};

// ============ Mode 3: 播客主持人 ============
const HostMode = () => {
  const [stage, setStage] = useState('config'); // config | running | done
  const [topic, setTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [turns, setTurns] = useState([]); // {role:'host'|'me', text, time}
  const [usedQs, setUsedQs] = useState({ opening: [], followup: [], closing: [] });
  const [recognition, setRecognition] = useState(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [accumText, setAccumText] = useState('');
  const [aiMode, setAiMode] = useState(false);        // false = 静态题库; true = AI 跟问
  const [aiAutoFollow, setAiAutoFollow] = useState(true); // 豆包式：停顿即追问 + TTS
  const [aiVoice, setAiVoice] = useState(true);       // TTS 是否朗读 AI 问题
  const [aiThinking, setAiThinking] = useState(false);
  const [aiError, setAiError] = useState('');
  const silenceTimerRef = useRef(null);
  const lastSpokenRef   = useRef('');
  const settings = useSettings();
  const cam = useCamera();
  const rec = useRecorder();

  // TTS：让 AI 提问出声（用 Android WebView 自带的语音合成）
  const speak = useCallback((text) => {
    try {
      const synth = window.speechSynthesis;
      if (!synth || !text) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN';
      u.rate = 1.05;
      u.pitch = 1.0;
      synth.speak(u);
    } catch {}
  }, []);

  const pickQ = (kind) => {
    const pool = HOST_QUESTIONS[kind];
    const used = usedQs[kind];
    const remaining = pool.filter(q => !used.includes(q));
    const q = (remaining.length ? remaining : pool)[Math.floor(Math.random() * (remaining.length || pool.length))];
    setUsedQs({ ...usedQs, [kind]: [...used, q] });
    return q;
  };

  const seedTopics = useMemo(() => {
    const all = [];
    Object.entries(ISSUES).forEach(([k,v]) => v.topics.slice(0,3).forEach(t => all.push({k, t})));
    return all;
  }, []);

  const startSession = async () => {
    const finalTopic = customTopic.trim() || topic;
    if (!finalTopic) return;
    const s = await cam.start();
    if (!s) return;
    setStage('running');
    rec.start(s);
    setupRecognition();
    setAiError('');

    // 开场问题：AI 模式调 DeepSeek 拿一个跟主题强相关的开场；静态模式从题库抽
    if (aiMode && settings.apiKey) {
      setAiThinking(true);
      try {
        const opening = await deepseekHostFollowup({
          apiKey: settings.apiKey,
          topic: finalTopic,
          history: [],
          lastUserSaid: '',
          kind: 'opening',
        });
        setTurns([{ role: 'host', text: opening || pickQ('opening'), time: 0 }]);
      } catch (e) {
        setAiError(e.message);
        setTurns([{ role: 'host', text: pickQ('opening'), time: 0 }]);
      } finally {
        setAiThinking(false);
      }
    } else {
      setTurns([{ role: 'host', text: pickQ('opening'), time: 0 }]);
    }
  };

  const setupRecognition = async () => {
    // 优先用 Capacitor 原生插件（系统级 ASR，国产手机也能用）
    const cap = window.Capacitor;
    const nativeSR = cap?.Plugins?.SpeechRecognition;
    if (nativeSR && cap.isNativePlatform?.()) {
      try {
        const avail = await nativeSR.available();
        if (!avail?.available) throw new Error('native SR not available');
        const perm = await nativeSR.checkPermissions();
        if (perm?.speechRecognition !== 'granted') {
          const req = await nativeSR.requestPermissions();
          if (req?.speechRecognition !== 'granted') throw new Error('permission denied');
        }
        // 用 partialResults 事件流监听
        const handler = (data) => {
          // data.matches 是字符串数组，最可信的是第 0 个
          const text = (data?.matches?.[0] || '').trim();
          if (!text) return;
          // 原生 ASR 返回的是累计文本；我们把它当作 interim，停下时再 finalize
          setInterim(text);
        };
        await nativeSR.removeAllListeners?.();
        nativeSR.addListener('partialResults', handler);
        // listening 状态：监听结束（语音断开）时把 interim → accumText 并自动重启
        const endHandler = () => {
          setInterim(prevInterim => {
            if (prevInterim) setAccumText(prevAcc => (prevAcc ? prevAcc + ' ' : '') + prevInterim);
            return '';
          });
          // 自动重启（仅在 listening 仍为 true 时）
          setTimeout(() => {
            try {
              nativeSR.start({
                language: 'zh-CN',
                maxResults: 2,
                partialResults: true,
                popup: false,
              });
            } catch {}
          }, 200);
        };
        nativeSR.addListener('listeningState', (s) => {
          if (s?.status === 'stopped') endHandler();
        });
        await nativeSR.start({
          language: 'zh-CN',
          maxResults: 2,
          partialResults: true,
          popup: false,
        });
        // 用 ref-like 容器伪装成 web SR，以便 finish 时统一 stop
        setRecognition({ _native: true, stop: async () => { try { await nativeSR.stop(); await nativeSR.removeAllListeners(); } catch {} } });
        setListening(true);
        return;
      } catch (e) {
        console.warn('[Native SR] fallback to Web Speech:', e?.message || e);
      }
    }

    // 浏览器 fallback：Web Speech API
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { return; }
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'zh-CN';
    r.onresult = (e) => {
      let interimT = '';
      let finalT = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalT += t;
        else interimT += t;
      }
      if (finalT) setAccumText(prev => prev + finalT);
      setInterim(interimT);
    };
    r.onend = () => { if (listening) try { r.start(); } catch {} };
    setRecognition(r);
    try { r.start(); setListening(true); } catch {}
  };

  const finishedSpeaking = async () => {
    const said = (accumText + ' ' + interim).trim();
    const finalTopic = customTopic.trim() || topic;
    // 把刚说的存进 turns
    const myTurn = said ? { role: 'me', text: said, time: rec.duration } : null;
    if (myTurn) setTurns(prev => [...prev, myTurn]);
    setAccumText('');
    setInterim('');

    const hostTurns = turns.filter(t => t.role === 'host').length;
    const nextKind = hostTurns >= 5 ? 'closing' : 'followup';

    // AI 模式：基于对话历史 + 刚说的话，让 DeepSeek 生成针对性追问
    if (aiMode && settings.apiKey) {
      setAiThinking(true);
      setAiError('');
      try {
        // 用当前 turns + 这一轮的 myTurn 作为历史
        const historyForAI = myTurn ? [...turns, myTurn] : turns;
        const userSaid = said || '（用户没说话）';
        const nextQ = await deepseekHostFollowup({
          apiKey: settings.apiKey,
          topic: finalTopic,
          history: historyForAI,
          lastUserSaid: userSaid,
          kind: nextKind,
        });
        setTurns(prev => [...prev, { role: 'host', text: nextQ || pickQ(nextKind), time: rec.duration }]);
      } catch (e) {
        setAiError(e.message);
        // 失败回落静态题库
        setTurns(prev => [...prev, { role: 'host', text: pickQ(nextKind), time: rec.duration }]);
      } finally {
        setAiThinking(false);
      }
    } else {
      setTurns(prev => [...prev, { role: 'host', text: pickQ(nextKind), time: rec.duration }]);
    }
  };

  const finish = () => {
    if (recognition) try { recognition.stop(); } catch {}
    setListening(false);
    rec.stop();
    cam.stop();
    // 把剩余的口述也存进 turns
    const said = (accumText + ' ' + interim).trim();
    if (said) setTurns(prev => [...prev, { role: 'me', text: said, time: rec.duration }]);
    setStage('done');
  };

  const reset = () => {
    if (recognition) try { recognition.stop(); } catch {}
    setListening(false);
    setStage('config');
    setTurns([]);
    setUsedQs({ opening: [], followup: [], closing: [] });
    setAccumText('');
    setInterim('');
    try { window.speechSynthesis?.cancel(); } catch {}
    cam.stop();
  };

  // ===== 豆包式实时对话：停顿即触发追问 =====
  // 仅当：AI 跟问 + 实时模式 + 正在听 + 不在思考中 + 录制中 + 已有识别文本 时启动 1.8s 静音计时
  useEffect(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (!aiMode || !aiAutoFollow) return;
    if (stage !== 'running' || !listening || aiThinking) return;
    const said = (accumText + ' ' + interim).trim();
    if (!said) return;
    silenceTimerRef.current = setTimeout(() => {
      finishedSpeaking();
    }, 1800);
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
    // eslint-disable-next-line
  }, [accumText, interim, listening, aiMode, aiAutoFollow, aiThinking, stage]);

  // ===== TTS：每次新增 host turn 自动朗读（仅 AI 模式 + 语音开启）=====
  useEffect(() => {
    if (!aiMode || !aiVoice) return;
    if (!turns.length) return;
    const last = turns[turns.length - 1];
    if (last.role !== 'host') return;
    if (last.text === lastSpokenRef.current) return;
    lastSpokenRef.current = last.text;
    speak(last.text);
  }, [turns, aiMode, aiVoice, speak]);

  if (stage === 'running') {
    const currentQ = turns.length && turns[turns.length-1].role === 'host' ? turns[turns.length-1].text : '';
    return (
      <div className="absolute inset-0 z-[70] bg-stone-950 fade-in" style={{borderRadius:0}}>
        <CameraFrame videoRef={cam.videoRef} voiceOnly={cam.voiceOnly} streamRef={cam.streamRef} className="w-full h-full" status="recording"
          overlay={
            <>
              {/* 顶部 HUD */}
              <div className="absolute left-3 right-3 flex items-start justify-between" style={{top:'calc(env(safe-area-inset-top, 0px) + 12px)'}}>
                <div className="flex items-center gap-2 bg-[#A30236] text-white px-3 py-1.5 text-[11px] tracking-[0.2em] font-bold" style={{borderRadius:"2px"}}>
                  <span className="w-2 h-2 rounded-full bg-white pulse-rec" />录制 · {formatTime(rec.duration)}
                </div>
                {listening && (
                  <div className="bg-[#264F30] text-white px-3 py-1.5 text-[11px] tracking-[0.2em] font-bold flex items-center gap-2" style={{borderRadius:"2px"}}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white pulse-rec" />正在听
                  </div>
                )}
              </div>
              {/* 当前问题 —— 悬浮在摄像头上 */}
              <div className="absolute left-3 right-3" style={{top:'calc(env(safe-area-inset-top, 0px) + 56px)'}}>
                <div className="bg-stone-950/85 backdrop-blur text-stone-100 px-5 py-4 max-w-2xl mx-auto border-l-[3px] border-[#A30236]" style={{borderRadius:"2px"}}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="eyebrow eyebrow--crimson" style={{color:"#F1A23F",fontSize:"10px"}}>
                      主持人提问 {aiMode && <span className="opacity-70">· AI</span>}
                    </div>
                    {aiThinking && (
                      <span className="text-[10px] text-[#F1A23F] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F1A23F] pulse-rec" />思考中
                      </span>
                    )}
                  </div>
                  <div className="font-display font-bold leading-snug text-[16px]">
                    {aiThinking && !currentQ ? '...' : currentQ}
                  </div>
                </div>
              </div>
              {/* 底部：实时转写 + 操作 */}
              <div className="absolute left-3 right-3" style={{bottom:'calc(env(safe-area-inset-bottom, 0px) + 16px)'}}>
                {(accumText || interim) && (
                  <div className="mb-2 bg-stone-950/80 backdrop-blur text-stone-100 px-3 py-2 max-h-24 overflow-y-auto text-sm border-l-[3px] border-[#F1A23F]" style={{borderRadius:"2px"}}>
                    <div className="eyebrow eyebrow--white mb-0.5" style={{fontSize:"10px"}}>你刚说的（实时识别）</div>
                    <span>{accumText}</span>
                    <span className="text-stone-400">{interim}</span>
                  </div>
                )}
                {aiError && (
                  <div className="mb-2 bg-red-900/80 text-white text-[10px] px-3 py-1.5" style={{borderRadius:'2px'}}>
                    AI 失败：{aiError.slice(0, 80)} · 已回落静态题库
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {(aiMode && aiAutoFollow) ? (
                    // 豆包式：自动模式，不显示按钮，显示监听状态
                    <div className="flex items-center gap-2 bg-stone-950/80 backdrop-blur text-stone-100 px-3 py-1.5 text-[11px]" style={{borderRadius:'2px'}}>
                      {aiThinking ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#F1A23F] pulse-rec" />
                          <span className="font-medium tracking-wider">AI 思考中...</span>
                        </>
                      ) : ((accumText + interim).trim()) ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-300 pulse-rec" />
                          <span className="font-medium tracking-wider">说完停顿 1.8 秒自动追问</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-rec" />
                          <span className="font-medium tracking-wider">主持人在听...</span>
                        </>
                      )}
                    </div>
                  ) : (
                    // 手动模式
                    <Btn variant="accent" size="sm" onClick={finishedSpeaking} disabled={aiThinking}>
                      {aiThinking ? 'AI 思考中...' : '下一个问题 →'}
                    </Btn>
                  )}
                  <div className="flex items-center gap-1.5">
                    {aiMode && (
                      <button onClick={() => setAiVoice(v => !v)}
                        className="bg-stone-950/80 backdrop-blur text-white p-1.5"
                        style={{borderRadius:'2px'}}
                        title={aiVoice ? '语音播报开启' : '语音播报关闭'}>
                        <Icon name={aiVoice ? 'mic' : 'shield'} size={14} />
                      </button>
                    )}
                    <BeautyButton cam={cam} /><AudienceViewButton cam={cam} />
                    <Btn variant="danger" size="sm" onClick={finish}>结束</Btn>
                  </div>
                </div>
              </div>
            </>
          }
        />
      </div>
    );
  }

  if (stage === 'done') {
    const transcript = (
      <Card className="p-6">
        <h4 className="font-display font-bold text-[18px] mb-4 text-stone-900">完整对话记录</h4>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {turns.map((t, i) => (
            <div key={i} className={`text-sm ${t.role === 'host' ? 'text-stone-900 font-medium' : 'text-stone-600 pl-4 border-l-2 border-amber-300'}`}>
              <div className="text-[10px] uppercase tracking-wider opacity-50 mb-0.5">{t.role === 'host' ? '主持人' : '你的回答'} · {formatTime(t.time)}</div>
              <div>{t.text}</div>
            </div>
          ))}
        </div>
      </Card>
    );
    return <DoneView
      blob={rec.blob}
      contextLabel={`主持人引导 · ${turns.filter(t=>t.role==='host').length} 个问题`}
      duration={rec.duration}
      onRetry={startSession}
      onNew={reset}
      extra={transcript}
      transcript={turns.filter(t => t.role === 'user').map(t => t.text).join('\n')}
    />;
  }

  return (
    <div className="space-y-6 fade-in">
      <Card className="p-6 border-l-[3px] border-[#A30236]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-[#A30236] text-white flex items-center justify-center shrink-0" style={{borderRadius:"3px"}}><Icon name="mic" size={20}/></div>
          <div>
            <h3 className="font-display font-bold text-stone-900 text-[16px] m-0">关于这个模式</h3>
            <p className="text-sm text-stone-600 mt-1 leading-relaxed">
              主持人会从一个开场问题开始，每次你说完按一下"下一个问题"，会追问得更深。
              5 轮之后自动收尾。你的回答会自动转写下来，方便复盘。
            </p>
            {!(window.SpeechRecognition || window.webkitSpeechRecognition) && (
              <p className="text-[11px] text-[#A30236] mt-2 flex items-start gap-1.5"><Icon name="shield" size={12} strokeWidth={1.7} className="mt-0.5 shrink-0"/><span>你的浏览器不支持实时语音识别，建议用 Chrome；录制不受影响。</span></p>
            )}
          </div>
        </div>
      </Card>

      {/* 主持人脑子选择：静态题库 vs AI 跟问 */}
      <Card className="p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:"3px"}}>
            <Icon name="sparkle" size={16} strokeWidth={1.7} />
          </div>
          <h3 className="font-display font-bold text-stone-900 text-[16px] m-0">主持人脑子</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button onClick={() => setAiMode(false)}
            className={`text-left p-3 border-2 transition-all ${
              !aiMode ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200 hover:border-stone-300'
            }`} style={{borderRadius:'3px'}}>
            <div className="flex items-center gap-1.5 mb-1">
              <Icon name="list" size={14} />
              <span className="font-semibold text-sm">静态题库</span>
            </div>
            <div className="text-xs text-stone-500 leading-snug">25+ 经典追问随机抽 · 离线</div>
          </button>
          <button onClick={() => setAiMode(true)}
            className={`text-left p-3 border-2 transition-all ${
              aiMode ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200 hover:border-stone-300'
            }`} style={{borderRadius:'3px'}}>
            <div className="flex items-center gap-1.5 mb-1">
              <Icon name="sparkle" size={14} />
              <span className="font-semibold text-sm">AI 跟问</span>
              <Tag color="violet">DeepSeek</Tag>
            </div>
            <div className="text-xs text-stone-500 leading-snug">基于你刚说的话生成针对性追问</div>
          </button>
        </div>

        {/* AI 模式下：实时 vs 手动 + TTS 朗读 */}
        {aiMode && (
          <div className="bg-stone-50 border border-stone-200 p-3 space-y-2.5" style={{borderRadius:'3px'}}>
            <div className="text-[10px] text-stone-500 font-bold tracking-[0.18em] uppercase mb-1">交互方式</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setAiAutoFollow(true)}
                className={`text-left p-2.5 border-2 transition-all ${
                  aiAutoFollow ? 'border-[#A30236] bg-white' : 'border-stone-200 bg-white hover:border-stone-300'
                }`} style={{borderRadius:'3px'}}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Icon name="mic" size={12} />
                  <span className="font-semibold text-xs">实时对话</span>
                  <Tag color="orange">豆包式</Tag>
                </div>
                <div className="text-[10px] text-stone-500 leading-snug">停顿 1.8 秒自动追问 · 不用按按钮</div>
              </button>
              <button onClick={() => setAiAutoFollow(false)}
                className={`text-left p-2.5 border-2 transition-all ${
                  !aiAutoFollow ? 'border-[#A30236] bg-white' : 'border-stone-200 bg-white hover:border-stone-300'
                }`} style={{borderRadius:'3px'}}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Icon name="play" size={12} />
                  <span className="font-semibold text-xs">手动控制</span>
                </div>
                <div className="text-[10px] text-stone-500 leading-snug">你说完按"下一问"才追问</div>
              </button>
            </div>
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input type="checkbox" checked={aiVoice} onChange={e => setAiVoice(e.target.checked)}
                className="w-4 h-4 accent-[#A30236]" />
              <span className="text-xs text-stone-700">主持人问题用 TTS 念出来（手机自带语音合成）</span>
            </label>
          </div>
        )}

      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:"3px"}}>
            <Icon name="mic" size={16} strokeWidth={1.7} />
          </div>
          <h3 className="font-display font-bold text-stone-900 text-[16px] m-0">选个聊的主题</h3>
        </div>
        <div className="space-y-3">
          {Object.entries(ISSUES).map(([k, v]) => (
            <div key={k}>
              <div className="text-xs text-stone-500 mb-2 font-medium">{k} <span className="text-stone-400">· {v.blurb}</span></div>
              <div className="flex flex-wrap gap-2">
                {v.topics.slice(0,4).map(t => (
                  <button key={t} onClick={() => { setTopic(t); setCustomTopic(''); }}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                      topic === t && !customTopic ? 'bg-stone-900 text-amber-300' : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                    }`}>{t}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 pt-5 border-t border-stone-200">
          <div className="text-xs text-stone-500 mb-2">或者，自己输入一个</div>
          <input
            value={customTopic}
            onChange={e => setCustomTopic(e.target.value)}
            placeholder="比如：为什么我决定不再做副业"
            className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:border-amber-400"
          />
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        {cam.error && <span className="text-sm text-red-600 self-center">{cam.error}</span>}
        <Btn variant="primary" size="lg" onClick={startSession} disabled={!topic && !customTopic.trim()}>
          开始对话 →
        </Btn>
      </div>
    </div>
  );
};

// ============ Mode 4: 教程模式 ============
const TutorialMode = () => {
  const [selected, setSelected] = useState(FRAMEWORKS[0]);
  const [stage, setStage] = useState('learn'); // learn | practice | done
  const [practiceTopic, setPracticeTopic] = useState('');
  const [practiceDuration, setPracticeDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState(0);
  const [preCount, setPreCount] = useState(3);
  const cam = useCamera();
  const rec = useRecorder();

  useEffect(() => { setStage('learn'); }, [selected]);

  const startPractice = async () => {
    if (!practiceTopic) {
      // 随便给一个
      const pool = getDefaultTopicsPool();
      setPracticeTopic(pickRandom(pool));
      return;
    }
    const s = await cam.start();
    if (!s) return;
    setStage('preroll');
    let n = 3;
    setPreCount(n);
    const t = setInterval(() => {
      n--;
      if (n >= 0) setPreCount(n);
      if (n < 0) {
        clearInterval(t);
        setStage('practice');
        setTimeLeft(practiceDuration);
        rec.start(s);
      }
    }, 1000);
  };

  useEffect(() => {
    if (stage !== 'practice') return;
    if (timeLeft <= 0) { finishPractice(); return; }
    const t = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [stage, timeLeft]);

  const finishPractice = () => {
    rec.stop();
    cam.stop();
    setStage('done');
  };

  // 计算当前阶段（在 practice 中）
  const elapsed = practiceDuration - timeLeft;
  const elapsedPercent = practiceDuration ? (elapsed / practiceDuration) * 100 : 0;
  let cumulative = 0;
  let currentStep = null;
  let nextStep = null;
  let stepProgress = 0;
  for (let i = 0; i < selected.steps.length; i++) {
    const step = selected.steps[i];
    const stepStart = cumulative;
    const stepEnd = cumulative + step.percent;
    if (elapsedPercent >= stepStart && elapsedPercent <= stepEnd) {
      currentStep = step;
      nextStep = selected.steps[i+1] || null;
      stepProgress = ((elapsedPercent - stepStart) / step.percent) * 100;
      break;
    }
    cumulative = stepEnd;
  }
  if (!currentStep && selected.steps.length) currentStep = selected.steps[selected.steps.length-1];

  if (stage === 'preroll') return <ReadyOverlay countdown={preCount} videoRef={cam.videoRef} voiceOnly={cam.voiceOnly} hint={`框架：${selected.name} · 话题：${practiceTopic}`} />;

  if (stage === 'practice') {
    return (
      <div className="absolute inset-0 z-[70] bg-stone-950 fade-in" style={{borderRadius:0}}>
        <CameraFrame videoRef={cam.videoRef} voiceOnly={cam.voiceOnly} streamRef={cam.streamRef} className="w-full h-full" status="recording"
          overlay={
            <>
              {/* 进度条 + 阶段切片 (top) */}
              <div className="absolute top-0 left-0 right-0 h-1.5 flex bg-stone-900/40">
                {selected.steps.map((s, i) => {
                  const cum = selected.steps.slice(0,i).reduce((a,b) => a + b.percent, 0);
                  const filled = Math.max(0, Math.min(s.percent, elapsedPercent - cum));
                  return (
                    <div key={i} style={{width: `${s.percent}%`}} className="h-full border-r border-stone-800/50 relative">
                      <div className="h-full bg-[#A30236]" style={{width: `${(filled/s.percent)*100}%`}} />
                    </div>
                  );
                })}
              </div>
              {/* 顶部话题 + 计时 + REC */}
              <div className="absolute left-3 right-3 flex items-start justify-between gap-3" style={{top:'calc(env(safe-area-inset-top, 0px) + 12px)'}}>
                <div className="bg-stone-950/80 text-stone-100 px-3 py-2.5 backdrop-blur max-w-md border-l-[3px] border-[#A30236]" style={{borderRadius:"2px"}}>
                  <div className="eyebrow eyebrow--crimson mb-1" style={{color:"#F1A23F",fontSize:"10px"}}>{selected.name} · {practiceTopic}</div>
                  <div className="font-display font-bold text-sm leading-snug">{currentStep?.name}</div>
                </div>
                <div className="bg-stone-950/80 text-white px-3 py-2.5 backdrop-blur text-center" style={{borderRadius:"2px"}}>
                  <div className="eyebrow eyebrow--white mb-0.5" style={{fontSize:"10px"}}>剩余</div>
                  <div className={`font-display text-xl font-bold tabular-nums ${timeLeft <= 5 ? 'text-red-400 pulse-rec' : ''}`}>{formatTime(timeLeft)}</div>
                </div>
              </div>
              {/* REC 中央贴标（顶部进度条下方） + 美颜按钮（右侧） */}
              <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#A30236] text-white px-2.5 py-1 text-[10px] tracking-[0.2em] font-bold" style={{top:'calc(env(safe-area-inset-top, 0px) + 96px)', borderRadius:'2px'}}>
                <span className="w-1.5 h-1.5 rounded-full bg-white pulse-rec" />REC
              </div>
              <div className="absolute right-3" style={{top:'calc(env(safe-area-inset-top, 0px) + 92px)'}}>
                <BeautyButton cam={cam} /><AudienceViewButton cam={cam} />
              </div>
              {/* 底部当前提示 */}
              <div className="absolute left-3 right-3" style={{bottom:'calc(env(safe-area-inset-bottom, 0px) + 16px)'}}>
                <div className="bg-[#A30236] text-white px-4 py-3 flex items-center justify-between gap-3" style={{borderRadius:'3px'}}>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold opacity-70 mb-0.5 tracking-wider uppercase">现在该讲 · {currentStep?.name}</div>
                    <div className="font-display font-bold text-sm leading-snug">{currentStep?.hint}</div>
                    {nextStep && <div className="text-[10px] opacity-60 mt-1">下一段：{nextStep.name}</div>}
                  </div>
                  <Btn variant="danger" size="sm" onClick={finishPractice}>结束</Btn>
                </div>
              </div>
            </>
          }
        />
      </div>
    );
  }

  if (stage === 'done') {
    return <DoneView
      blob={rec.blob}
      contextLabel={`${selected.name} · ${practiceTopic}`}
      duration={rec.duration}
      onRetry={() => { setStage('learn'); setTimeout(startPractice, 30); }}
      onNew={() => { setStage('learn'); setPracticeTopic(''); }}
    />;
  }

  // learn stage
  return (
    <div className="space-y-5 fade-in">

      {/* ╭ 1. 框架选择列表 ─────────────╮ */}
      <Card className="p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:"3px"}}>
            <Icon name="book" size={16} strokeWidth={1.7} />
          </div>
          <div>
            <h3 className="font-display font-bold text-stone-900 text-[15px] m-0 leading-tight">选一个表达框架</h3>
            <div className="text-stone-500 text-[11px] mt-0.5">先学结构，再上镜头</div>
          </div>
        </div>
        <div className="space-y-2">
          {FRAMEWORKS.map((f, i) => {
            const active = selected.id === f.id;
            return (
              <button key={f.id} onClick={() => setSelected(f)}
                className={`w-full text-left p-3 transition-colors flex items-start gap-3 ${
                  active ? 'bg-[#FBEFF2] border border-[#A30236]' : 'bg-white border border-stone-200 hover:bg-stone-50'
                }`}
                style={{borderRadius:'3px'}}>
                <div className={`w-9 h-9 shrink-0 flex items-center justify-center font-display font-bold text-[14px] tabular-nums ${
                  active ? 'bg-[#A30236] text-white' : 'bg-stone-100 text-stone-600'
                }`} style={{borderRadius:'3px'}}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                    <span className={`font-display font-bold text-[14px] ${active ? 'text-[#A30236]' : 'text-stone-900'}`}>{f.name}</span>
                    <span className="text-[9px] tracking-[0.12em] uppercase text-stone-400 font-semibold border border-stone-200 px-1.5 py-px" style={{borderRadius:'2px'}}>{f.tag}</span>
                  </div>
                  <p className="text-stone-500 text-[11px] leading-relaxed m-0">{f.description}</p>
                </div>
                {active && <Icon name="check" size={16} className="text-[#A30236] shrink-0 mt-1" strokeWidth={2}/>}
              </button>
            );
          })}
        </div>
      </Card>

      {/* ╭ 2. 当前框架详解 ─────────────╮ */}
      <Card className="p-5">
        {/* Header */}
        <div className="mb-5 pb-4 border-b border-stone-200">
          <div className="eyebrow eyebrow--crimson mb-1.5" style={{fontSize:'10px'}}>当前框架</div>
          <h3 className="font-display font-bold text-stone-900 text-[20px] m-0 leading-tight">{selected.name}</h3>
          <p className="text-stone-500 text-[12px] mt-1.5 m-0 leading-relaxed">{selected.description}</p>
        </div>

        {/* Proportional bar (visual only) */}
        <div className="mb-2">
          <div className="text-stone-400 text-[10px] tracking-[0.16em] uppercase font-semibold mb-2">时长分配</div>
          <div className="flex h-2 overflow-hidden border border-stone-200" style={{borderRadius:'2px'}}>
            {selected.steps.map((s, i) => (
              <div key={i} style={{width: `${s.percent}%`}}
                className={i === 0 ? 'bg-[#A30236]' :
                           i === 1 ? 'bg-[#BE003E]' :
                           i === 2 ? 'bg-[#F1A23F]' :
                           i === 3 ? 'bg-stone-700' : 'bg-stone-500'}>
              </div>
            ))}
          </div>
          {/* Percentage labels */}
          <div className="flex mt-1">
            {selected.steps.map((s, i) => (
              <div key={i} style={{width: `${s.percent}%`}} className="text-center">
                <span className="text-stone-400 text-[9px] tabular-nums">{s.percent}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Vertical step list — readable, no squeeze */}
        <div className="space-y-2 mt-5">
          {selected.steps.map((s, i) => {
            const colors = [
              {dot:'bg-[#A30236]',  text:'text-[#A30236]'},
              {dot:'bg-[#BE003E]',  text:'text-[#BE003E]'},
              {dot:'bg-[#F1A23F]',  text:'text-[#A30236]'},
              {dot:'bg-stone-700',  text:'text-stone-900'},
            ];
            const c = colors[i] || colors[0];
            return (
              <div key={i} className="flex items-start gap-3 p-3 border border-stone-200" style={{borderRadius:'3px'}}>
                <div className="shrink-0 flex flex-col items-center">
                  <span className={`w-7 h-7 ${c.dot} text-white flex items-center justify-center font-display font-bold text-[13px] tabular-nums`} style={{borderRadius:'3px'}}>
                    {i + 1}
                  </span>
                  <span className="text-stone-400 text-[10px] tabular-nums mt-1 font-medium">{s.percent}%</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-display font-bold text-[14px] leading-tight ${c.text}`}>{s.name}</div>
                  <div className="text-stone-600 text-[12px] leading-relaxed mt-1">{s.hint}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Example block */}
        <div className="mt-5">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="sparkle" size={13} className="text-[#A30236]" strokeWidth={1.7}/>
            <span className="text-stone-400 text-[10px] tracking-[0.16em] uppercase font-semibold">范例</span>
          </div>
          <div className="bg-stone-50 border-l-[3px] border-[#A30236] border-y border-r border-stone-200 p-3.5 text-[12px] leading-relaxed whitespace-pre-wrap text-stone-700"
               style={{borderRadius:'3px'}}>
            {selected.example}
          </div>
        </div>
      </Card>

      {/* ╭ 3. 上手实操 ─────────────╮ */}
      <Card className="p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-[#A30236] text-white flex items-center justify-center" style={{borderRadius:"3px"}}>
            <Icon name="rec" size={16} strokeWidth={1.7} />
          </div>
          <div>
            <h3 className="font-display font-bold text-stone-900 text-[15px] m-0 leading-tight">立即镜头前实操</h3>
            <div className="text-stone-500 text-[11px] mt-0.5">屏幕会按阶段提示你该讲什么</div>
          </div>
        </div>

        {/* Topic */}
        <div className="mb-4">
          <div className="text-stone-400 text-[10px] tracking-[0.16em] uppercase font-semibold mb-2">练习话题</div>
          <div className="flex gap-2">
            <input
              value={practiceTopic}
              onChange={e => setPracticeTopic(e.target.value)}
              placeholder="自己输入，或点右侧随机"
              className="flex-1 px-3 py-2.5 border border-stone-300 text-[13px] focus:outline-none focus:border-[#A30236]"
              style={{borderRadius:'3px'}}
            />
            <Btn variant="secondary" size="sm" onClick={() => {
              const pool = getDefaultTopicsPool();
              setPracticeTopic(pickRandom(pool, practiceTopic));
            }}><Icon name="dice" size={13}/> 随机</Btn>
          </div>
        </div>

        {/* Duration */}
        <div className="mb-5">
          <div className="text-stone-400 text-[10px] tracking-[0.16em] uppercase font-semibold mb-2">时长</div>
          <div className="grid grid-cols-3 gap-2">
            {[{v:30,l:'30s',sub:'极短'},{v:60,l:'60s',sub:'单点'},{v:180,l:'3min',sub:'完整'}].map(d => {
              const active = practiceDuration === d.v;
              return (
                <button key={d.v} onClick={() => setPracticeDuration(d.v)}
                  className={`p-2.5 border transition-colors text-center ${
                    active ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200 hover:bg-stone-50'
                  }`}
                  style={{borderRadius:'3px'}}>
                  <div className={`font-display font-bold text-[15px] tabular-nums ${active ? 'text-[#A30236]' : 'text-stone-900'}`}>{d.l}</div>
                  <div className={`text-[10px] mt-0.5 ${active ? 'text-[#A30236]' : 'text-stone-500'}`}>{d.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        {cam.error && <div className="text-[12px] text-[#A30236] mb-3 flex items-center gap-1.5"><Icon name="close" size={12}/>{cam.error}</div>}

        <Btn variant="primary" className="w-full" onClick={startPractice} disabled={!practiceTopic.trim()}>
          <Icon name="play" size={14}/> 带框架提示开始录制
        </Btn>
      </Card>

    </div>
  );
};

// ============ Mode 5: 无限模式（自动换题） ============
const ENDLESS_INTERVALS = [
  { value: 30,  label: '30s',  desc: '钩动节奏' },
  { value: 60,  label: '60s',  desc: '单点输出' },
  { value: 90,  label: '90s',  desc: '展开论证' },
  { value: 120, label: '2min', desc: '完整短视频' },
];

// 训练课程预设：6 套覆盖「短/中/长 + 微/框架/挑战」六个维度，消除重复
// 选择疲劳是真实存在的 · 16 套预设里大多数差异 < 30% · 用户会进入「不知道选哪个」的瘫痪状态
const SESSION_PRESET_GROUPS = [
  {
    id: 'daily',
    label: '🌱 日常训练',
    blurb: '从短到长 · 一日三档随心选',
    presets: [
      { id:'quick',    emoji:'⚡', name:'短闪训练', sessionMin:10, intervalSec:60, source:'__all__',  desc:'10 题 × 60s · 全类别混合 · 通勤档' },
      { id:'standard', emoji:'💪', name:'标准集训', sessionMin:20, intervalSec:60, source:'__all__',  desc:'20 题 × 60s · 每日主力档' },
      { id:'marathon', emoji:'🏃', name:'马拉松',   sessionMin:60, intervalSec:60, source:'__all__',  desc:'60 题 × 60 分钟 · 周末长档' },
    ],
  },
  {
    id: 'focus',
    label: '🎯 重点突破',
    blurb: '想专门攻一个能力时来这里',
    presets: [
      { id:'hook',  emoji:'🪝', name:'钩子专训', sessionMin:5,  intervalSec:15, source:'__all__',  desc:'20 题 × 15s · 只练前 5 秒抓人',    tip:'只要前 5 秒抓人 · 后面别管' },
      { id:'prep',  emoji:'📐', name:'PREP 集训', sessionMin:15, intervalSec:90, source:'观点表达', desc:'10 题 × 90s · Point-Reason-Example-Point', framework:['观点','理由','例子','重申'], tip:'P → R → E → P · 严格走结构' },
      { id:'devil', emoji:'😈', name:'反向辩护', sessionMin:15, intervalSec:90, source:'即兴反驳', desc:'10 题 × 90s · 站对立面 · 把舒适区往外推', tip:'不管认不认同 · 必须为对立面辩护' },
    ],
  },
];

// 扁平化数组（用于按 id 查找 / 渲染）
const SESSION_PRESETS = SESSION_PRESET_GROUPS.flatMap(g => g.presets);
const SESSION_TIME_PRESETS = [
  { value: 0,  label: '不限',  desc: '手动结束' },
  { value: 5,  label: '5 min', desc: '快速训练' },
  { value: 10, label: '10 min',desc: '短闪' },
  { value: 20, label: '20 min',desc: '标准集训' },
  { value: 30, label: '30 min',desc: '高强度' },
  { value: 60, label: '60 min',desc: '马拉松' },
];

const EndlessMode = () => {
  const [stage, setStage] = useState('config'); // config | ready | running | done
  const [intervalSec, setIntervalSec] = useState(60);
  const [customInterval, setCustomInterval] = useState(60);
  const [useCustom, setUseCustom] = useState(false);
  const [source, setSource] = useState(ALL_SOURCE);   // 默认精选混合抽
  const [topic, setTopic] = useState('');
  const [topicTimeLeft, setTopicTimeLeft] = useState(0);
  const [topicsHistory, setTopicsHistory] = useState([]);
  const [skipCount, setSkipCount] = useState(0);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [sessionLimitMin, setSessionLimitMin] = useState(20); // 总训练时长（分钟，0=不限）
  const [customSessionMin, setCustomSessionMin] = useState(20);
  const [useCustomSession, setUseCustomSession] = useState(false);
  const [activePresetId, setActivePresetId] = useState(null);
  const [preCount, setPreCount] = useState(3);
  const [aiTheme, setAiTheme] = useState('');
  const [aiPool, setAiPool] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const settings = useSettings();
  const cam = useCamera();
  const rec = useRecorder();

  const effectiveInterval = useCustom ? Math.max(5, parseInt(customInterval) || 60) : intervalSec;
  const effectiveSessionLimitSec = useCustomSession
    ? Math.max(1, parseInt(customSessionMin) || 0) * 60
    : sessionLimitMin * 60;
  // 估算这次能练多少题（用于预览）
  const estimatedTopicCount = effectiveSessionLimitSec > 0
    ? Math.max(1, Math.floor(effectiveSessionLimitSec / effectiveInterval))
    : null;

  // 应用预设
  const applyPreset = useCallback((p) => {
    if (p.id === 'custom') {
      setActivePresetId('custom');
      return;
    }
    setActivePresetId(p.id);
    // 每题时长：非标准值（不在 ENDLESS_INTERVALS）走自定义
    const stdIntervals = ENDLESS_INTERVALS.map(d => d.value);
    if (stdIntervals.includes(p.intervalSec)) {
      setUseCustom(false);
      setIntervalSec(p.intervalSec);
    } else {
      setUseCustom(true);
      setCustomInterval(p.intervalSec);
    }
    // 总时长：非标准值（不在 SESSION_TIME_PRESETS）走自定义
    const stdSessions = SESSION_TIME_PRESETS.map(d => d.value);
    if (stdSessions.includes(p.sessionMin)) {
      setUseCustomSession(false);
      setSessionLimitMin(p.sessionMin);
    } else {
      setUseCustomSession(true);
      setCustomSessionMin(p.sessionMin);
    }
    if (p.source) setSource(p.source);
  }, []);

  const allSources = useMemo(() => {
    const r = {};
    Object.entries(TOPIC_TYPES).forEach(([k, v]) => { r[k] = v; });
    Object.entries(ISSUES).forEach(([k, v]) => { r[k] = v; });
    return r;
  }, []);

  // Pick a topic that's not in the last 5 used
  const pickFromPool = useCallback((history) => {
    let pool;
    if (source === AI_SOURCE) pool = aiPool;
    else if (source === ALL_SOURCE) pool = getDefaultTopicsPool();
    else pool = allSources[source]?.topics;
    if (!pool || !pool.length) return '';
    const recentTopics = history.slice(-5).map(h => h.topic);
    const candidates = pool.filter(t => !recentTopics.includes(t));
    const usable = candidates.length ? candidates : pool;
    return usable[Math.floor(Math.random() * usable.length)];
  }, [source, aiPool, allSources]);

  const generateAI = async () => {
    if (!aiTheme.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const topics = await deepseekGenerateTopics({
        apiKey: settings.apiKey,
        theme: aiTheme.trim(),
        count: 10,
      });
      setAiPool(topics);
      setSource(AI_SOURCE);
    } catch (e) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const begin = async () => {
    const s = await cam.start();
    if (!s) return;
    setStage('ready');
    setTopicsHistory([]);
    setSessionDuration(0);
    setSkipCount(0);
    let n = 3;
    setPreCount(n);
    const timer = window.setInterval(() => {
      n--;
      if (n >= 0) setPreCount(n);
      if (n < 0) {
        window.clearInterval(timer);
        const first = pickFromPool([]);
        setTopic(first);
        setTopicsHistory([{ topic: first, at: 0 }]);
        setTopicTimeLeft(effectiveInterval);
        setStage('running');
        rec.start(s);
      }
    }, 1000);
  };

  // 手动切题（用户跳过）
  const rotateTopic = useCallback(() => {
    setSkipCount(c => c + 1);
    setTopicsHistory(prevHist => {
      const next = pickFromPool(prevHist);
      setTopic(next);
      return [...prevHist, { topic: next, at: sessionDuration }];
    });
    setTopicTimeLeft(effectiveInterval);
  }, [pickFromPool, sessionDuration, effectiveInterval]);

  // Master tick: session timer + topic countdown + auto-rotate + 自动结束
  useEffect(() => {
    if (stage !== 'running') return;
    const id = window.setInterval(() => {
      setSessionDuration(d => {
        const next = d + 1;
        // 总时长到了 → 自动结束（异步避免在 setState 里直接调用 setState）
        if (effectiveSessionLimitSec > 0 && next >= effectiveSessionLimitSec) {
          setTimeout(() => finish(), 0);
        }
        return next;
      });
      setTopicTimeLeft(t => {
        if (t <= 1) {
          setTopicsHistory(prevHist => {
            const next = pickFromPool(prevHist);
            setTopic(next);
            return [...prevHist, { topic: next, at: sessionDuration + 1 }];
          });
          return effectiveInterval;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line
  }, [stage, effectiveInterval, pickFromPool, sessionDuration, effectiveSessionLimitSec]);

  const finish = () => {
    rec.stop();
    cam.stop();
    setStage('done');
  };

  const resetAll = () => {
    setStage('config');
    cam.stop();
  };

  if (stage === 'ready') {
    const activePreset = activePresetId ? SESSION_PRESETS.find(p => p.id === activePresetId) : null;
    const presetHint = activePreset
      ? `${activePreset.emoji} ${activePreset.name} · 每 ${effectiveInterval}s 自动换题${activePreset.tip ? ' · ' + activePreset.tip : ''}`
      : `无限模式 · 每 ${effectiveInterval}s 自动换题`;
    return <ReadyOverlay countdown={preCount} videoRef={cam.videoRef} voiceOnly={cam.voiceOnly} hint={presetHint} />;
  }

  if (stage === 'running') {
    const pct = (topicTimeLeft / effectiveInterval) * 100;
    const urgent = topicTimeLeft <= 5;
    // 总时长进度
    const sessionPct = effectiveSessionLimitSec > 0
      ? Math.min(100, (sessionDuration / effectiveSessionLimitSec) * 100)
      : 0;
    const sessionRemain = effectiveSessionLimitSec > 0
      ? Math.max(0, effectiveSessionLimitSec - sessionDuration)
      : 0;
    // 是否最后一题（剩余时长 ≤ 当前题时长 + 5s 余量）
    const isLastTopic = effectiveSessionLimitSec > 0
      && sessionRemain <= effectiveInterval + 5
      && sessionRemain > 0;
    // 当前激活的预设（用于在录制时显示结构提示 / tip）
    const activePreset = activePresetId ? SESSION_PRESETS.find(p => p.id === activePresetId) : null;
    return (
      <div className="absolute inset-0 z-[70] bg-stone-950" style={{borderRadius:0}}>
        <CameraFrame videoRef={cam.videoRef} voiceOnly={cam.voiceOnly} streamRef={cam.streamRef} className="w-full h-full" status="recording"
          overlay={
            <>
              {/* 顶部双条进度：上=本题（深红）下=总训练（琥珀）*/}
              <div className="absolute top-0 left-0 right-0">
                <div className="h-1 bg-stone-900/40">
                  <div className="h-full bg-[#A30236] transition-all duration-1000 ease-linear" style={{ width: `${pct}%` }} />
                </div>
                {effectiveSessionLimitSec > 0 && (
                  <div className="h-0.5 bg-stone-900/40">
                    <div className="h-full bg-[#F1A23F] transition-all duration-1000 ease-linear" style={{ width: `${sessionPct}%` }} />
                  </div>
                )}
              </div>
              {/* Top: current topic + per-topic countdown + 训练总时长 */}
              <div className="absolute left-3 right-3" style={{top:'calc(env(safe-area-inset-top, 0px) + 18px)'}}>
                <div className="bg-stone-950/85 backdrop-blur text-stone-100 px-4 py-3 border-l-[3px] border-[#A30236]" style={{borderRadius: '3px'}}>
                  <div className="flex items-baseline justify-between gap-2 mb-1.5">
                    <span style={{color: '#F1A23F', fontSize: '9px', letterSpacing: '0.18em', fontWeight: 700, textTransform: 'uppercase'}}>
                      {isLastTopic ? '最后一题' : `第 ${topicsHistory.length} 题`}
                      {effectiveSessionLimitSec > 0 && estimatedTopicCount && ` / 共约 ${estimatedTopicCount} 题`}
                    </span>
                    <span className={`font-display font-bold tabular-nums text-2xl ${urgent ? 'text-red-300 pulse-rec' : (isLastTopic ? 'text-amber-300 pulse-rec' : 'text-amber-300')}`}>
                      {topicTimeLeft}s
                    </span>
                  </div>
                  <div className="font-display font-bold text-lg leading-snug">{topic}</div>

                  {/* 结构框架提示（PREP / 黄金圈 / 故事三幕 等） */}
                  {activePreset?.framework && (
                    <div className="flex flex-wrap items-center gap-1 mt-2.5">
                      {activePreset.framework.map((f, i) => (
                        <React.Fragment key={i}>
                          <span className="text-[10px] bg-amber-400/20 text-amber-200 px-1.5 py-0.5 font-bold tracking-wider" style={{borderRadius:'2px'}}>{f}</span>
                          {i < activePreset.framework.length - 1 && <span className="text-amber-400/60 text-[10px] font-bold">→</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                  {/* 额外提示文案 */}
                  {activePreset?.tip && (
                    <div className="text-[11px] text-amber-200/90 mt-2 leading-snug flex items-start gap-1">
                      <span className="opacity-70">💡</span><span>{activePreset.tip}</span>
                    </div>
                  )}

                  {effectiveSessionLimitSec > 0 && (
                    <div className="text-[10px] text-stone-400 mt-2 tabular-nums tracking-wider">
                      训练已用 {formatTime(sessionDuration)} / 共 {formatTime(effectiveSessionLimitSec)} · 还剩 {formatTime(sessionRemain)}
                    </div>
                  )}
                </div>
              </div>
              {/* Bottom: REC + 美颜 + 跳过 + stop */}
              <div className="absolute left-3 right-3 flex items-center justify-between gap-2" style={{bottom:'calc(env(safe-area-inset-bottom, 0px) + 16px)'}}>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-2 bg-[#A30236] text-white px-2.5 py-1.5 text-[10px] tracking-[0.2em] font-bold" style={{borderRadius: '2px'}}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white pulse-rec" />录制 · {formatTime(sessionDuration)}
                  </div>
                  <BeautyButton cam={cam} /><AudienceViewButton cam={cam} />
                </div>
                <div className="flex items-center gap-1.5">
                  {!isLastTopic && (
                    <button onClick={rotateTopic}
                      className="flex items-center gap-1.5 bg-stone-950/80 backdrop-blur text-white px-2.5 py-1.5 text-[11px] tracking-wider font-bold"
                      style={{borderRadius:'2px'}}
                      title="跳过这一题，立刻切到下一题"
                    >
                      <Icon name="refresh" size={13} />跳过
                    </button>
                  )}
                  <Btn variant="danger" size="sm" onClick={finish}>结束</Btn>
                </div>
              </div>
            </>
          }
        />
      </div>
    );
  }

  if (stage === 'done') {
    const totalTopics = topicsHistory.length;
    const avgPerTopic = totalTopics > 0 ? Math.round(sessionDuration / totalTopics) : 0;
    const goalPct = effectiveSessionLimitSec > 0
      ? Math.min(100, Math.round((sessionDuration / effectiveSessionLimitSec) * 100))
      : null;
    const isPresetMatched = SESSION_PRESETS.find(p => p.id === activePresetId);

    const trainingReport = (
      <>
        {/* 训练报告 */}
        <Card className="p-5 mt-3">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:'3px'}}>
              <Icon name="target" size={14} strokeWidth={1.7}/>
            </div>
            <h4 className="font-display font-bold text-[16px] text-stone-900 m-0">训练报告</h4>
            {isPresetMatched && <Tag color="amber">{isPresetMatched.emoji} {isPresetMatched.name}</Tag>}
          </div>
          {/* 显示这次训练的结构提示（如果有） */}
          {isPresetMatched?.framework && (
            <div className="flex flex-wrap items-center gap-1 mb-3">
              <span className="text-[10px] text-stone-500 tracking-wider uppercase font-bold mr-1">结构</span>
              {isPresetMatched.framework.map((f, i) => (
                <React.Fragment key={i}>
                  <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 font-bold tracking-wider" style={{borderRadius:'2px'}}>{f}</span>
                  {i < isPresetMatched.framework.length - 1 && <span className="text-amber-700 text-[10px] font-bold">→</span>}
                </React.Fragment>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="border border-stone-200 p-3" style={{borderRadius:'3px'}}>
              <div className="font-display font-bold text-[#A30236] text-2xl tabular-nums leading-none">{totalTopics}</div>
              <div className="text-[10px] tracking-[0.16em] uppercase text-stone-500 mt-1 font-semibold">题数</div>
            </div>
            <div className="border border-stone-200 p-3" style={{borderRadius:'3px'}}>
              <div className="font-display font-bold text-stone-900 text-2xl tabular-nums leading-none">{formatTime(sessionDuration)}</div>
              <div className="text-[10px] tracking-[0.16em] uppercase text-stone-500 mt-1 font-semibold">总时长</div>
            </div>
            <div className="border border-stone-200 p-3" style={{borderRadius:'3px'}}>
              <div className="font-display font-bold text-stone-900 text-2xl tabular-nums leading-none">{avgPerTopic}s</div>
              <div className="text-[10px] tracking-[0.16em] uppercase text-stone-500 mt-1 font-semibold">平均每题</div>
            </div>
            <div className="border border-stone-200 p-3" style={{borderRadius:'3px'}}>
              <div className={`font-display font-bold text-2xl tabular-nums leading-none ${skipCount > 3 ? 'text-amber-600' : 'text-stone-900'}`}>{skipCount}</div>
              <div className="text-[10px] tracking-[0.16em] uppercase text-stone-500 mt-1 font-semibold">跳过次数</div>
            </div>
          </div>
          {goalPct !== null && (
            <div className="mb-3">
              <div className="flex justify-between text-[11px] text-stone-600 mb-1">
                <span>目标完成度</span>
                <span className="font-bold">{goalPct}%</span>
              </div>
              <div className="h-2 bg-stone-200 overflow-hidden" style={{borderRadius:'2px'}}>
                <div className={`h-full ${goalPct >= 95 ? 'bg-emerald-500' : goalPct >= 50 ? 'bg-[#A30236]' : 'bg-amber-500'}`} style={{width:`${goalPct}%`}}/>
              </div>
            </div>
          )}
          {/* 一句话点评 */}
          <div className="bg-stone-50 px-3 py-2 text-[12px] text-stone-700 leading-relaxed" style={{borderRadius:'2px'}}>
            {goalPct !== null && goalPct >= 95 ? (
              <>✓ <span className="font-bold text-emerald-700">完成训练目标</span> · 共练 {totalTopics} 题 · 平均每题 {avgPerTopic}s</>
            ) : skipCount > totalTopics / 3 ? (
              <>⚠ 跳过太多（{skipCount}/{totalTopics}）· 下次试着"硬着头皮讲"，逃避是杀手</>
            ) : (
              <>👏 这次练了 <span className="font-bold text-[#A30236]">{totalTopics}</span> 题 · 用 {formatTime(sessionDuration)} · 平均节奏 {avgPerTopic}s/题</>
            )}
          </div>
        </Card>

        {/* 题目流水 */}
        {totalTopics > 0 && (
          <Card className="p-4 mt-3">
            <div className="text-xs text-stone-500 font-medium mb-2 tracking-wider">
              题目流水（{totalTopics} 题）
            </div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto text-sm">
              {topicsHistory.map((h, i) => (
                <div key={i} className="flex items-baseline gap-2 text-stone-700">
                  <span className="text-stone-400 tabular-nums text-xs shrink-0 w-5">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-stone-400 tabular-nums text-xs shrink-0">{formatTime(h.at)}</span>
                  <span className="flex-1">{h.topic}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </>
    );
    return <DoneView
      blob={rec.blob}
      contextLabel={`无限模式 · ${isPresetMatched ? isPresetMatched.name + ' · ' : ''}${totalTopics} 题 · ${formatTime(sessionDuration)}`}
      duration={sessionDuration}
      onRetry={begin}
      onNew={resetAll}
      extra={trainingReport}
    />;
  }

  // config stage
  return (
    <div className="space-y-4 fade-in">
      {/* 训练计划库 —— 一键应用预设 */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="stat-num" style={{ fontSize: '18px' }}>·</span>
          <span className="rule-crimson" />
          <span className="eyebrow eyebrow--crimson">训练计划</span>
        </div>
        <h3 className="font-display font-bold text-lg mb-2 text-stone-900">选一套预设 · 一键开练</h3>
        <p className="text-[11px] text-stone-500 mb-4 leading-relaxed">
          {SESSION_PRESETS.length} 套训练 · 涵盖基础节奏 / 极短钩子 / 框架结构 / 深度反向 / 议题专训。下方还可手动微调。
        </p>
        {SESSION_PRESET_GROUPS.map(grp => (
          <div key={grp.id} className="mb-4 last:mb-0">
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-[11px] tracking-[0.18em] uppercase font-bold text-stone-800">{grp.label}</span>
              <span className="text-[10px] text-stone-400">· {grp.blurb}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {grp.presets.map(p => {
                const active = activePresetId === p.id;
                const hasStruct = !!(p.framework || p.tip);
                return (
                  <button key={p.id} onClick={() => applyPreset(p)}
                    className={`text-left p-3 border-2 transition-all relative ${
                      active ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200 hover:border-stone-300'
                    }`}
                    style={{borderRadius:'3px'}}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base">{p.emoji}</span>
                      <span className="font-semibold text-sm">{p.name}</span>
                      {hasStruct && (
                        <span className="ml-auto text-[8px] tracking-wider font-bold px-1 py-0.5 bg-amber-100 text-amber-800" style={{borderRadius:'2px'}}>带提示</span>
                      )}
                    </div>
                    <div className="text-[10px] text-stone-500 leading-snug">{p.desc}</div>
                    {p.framework && (
                      <div className="flex flex-wrap gap-0.5 mt-1.5">
                        {p.framework.map((f, i) => (
                          <span key={i} className="text-[9px] bg-stone-100 text-stone-700 px-1 py-0.5 font-medium" style={{borderRadius:'2px'}}>{f}</span>
                        ))}
                      </div>
                    )}
                    <div className="text-[10px] text-[#A30236] mt-1.5 font-bold tracking-wider">{p.sessionMin} MIN · {p.intervalSec}s/题</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </Card>

      {/* 总训练时长 */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="stat-num" style={{ fontSize: '18px' }}>01</span>
          <span className="rule-crimson" />
          <span className="eyebrow eyebrow--crimson">总训练时长</span>
        </div>
        <h3 className="font-display font-bold text-lg mb-3 text-stone-900">这次练多久</h3>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {SESSION_TIME_PRESETS.map(d => (
            <button key={d.value} onClick={() => { setUseCustomSession(false); setSessionLimitMin(d.value); setActivePresetId(null); }}
              className={`text-left p-3 border-2 transition-all ${
                !useCustomSession && sessionLimitMin === d.value ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200 hover:border-stone-300'
              }`}
              style={{ borderRadius: '3px' }}
            >
              <div className="font-semibold text-sm">{d.label}</div>
              <div className="text-[10px] text-stone-500 mt-0.5">{d.desc}</div>
            </button>
          ))}
        </div>
        <div onClick={() => { setUseCustomSession(true); setActivePresetId(null); }}
          className={`p-3 border-2 transition-all flex items-center gap-2 flex-wrap cursor-pointer ${
            useCustomSession ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200'
          }`}
          style={{ borderRadius: '3px' }}
        >
          <Icon name="settings" size={14} />
          <span className="font-semibold text-sm whitespace-nowrap">自定义</span>
          <input
            type="number" min="1" max="180" value={customSessionMin}
            onClick={e => { e.stopPropagation(); setUseCustomSession(true); setActivePresetId(null); }}
            onChange={e => { setUseCustomSession(true); setCustomSessionMin(e.target.value); setActivePresetId(null); }}
            className="w-16 px-2 py-1 border border-stone-300 text-center text-sm focus:outline-none focus:border-[#A30236]"
            style={{ borderRadius: '2px' }}
          />
          <span className="text-stone-500 text-sm">分钟</span>
        </div>
        {effectiveSessionLimitSec > 0 && estimatedTopicCount && (
          <div className="mt-3 text-[12px] text-stone-700 bg-stone-50 px-3 py-2" style={{borderRadius:'2px'}}>
            预计能练 <span className="font-bold text-[#A30236]">{estimatedTopicCount}</span> 题 ·
            到时间自动停 · 进度条会显示剩余
          </div>
        )}
        {effectiveSessionLimitSec === 0 && (
          <div className="mt-3 text-[12px] text-stone-500 bg-stone-50 px-3 py-2" style={{borderRadius:'2px'}}>
            不限时长 · 手动按"结束"才停（适合无所事事的自由训练）
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="stat-num" style={{ fontSize: '18px' }}>02</span>
          <span className="rule-crimson" />
          <span className="eyebrow eyebrow--crimson">每题时长</span>
        </div>
        <h3 className="font-display font-bold text-lg mb-3 text-stone-900">题目之间多久切换</h3>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {ENDLESS_INTERVALS.map(d => (
            <button key={d.value} onClick={() => { setUseCustom(false); setIntervalSec(d.value); }}
              className={`text-left p-3 border-2 transition-all ${
                !useCustom && intervalSec === d.value ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200 hover:border-stone-300'
              }`}
              style={{ borderRadius: '3px' }}
            >
              <div className="font-semibold text-sm">{d.label}</div>
              <div className="text-xs text-stone-500 mt-0.5">{d.desc}</div>
            </button>
          ))}
        </div>
        <div onClick={() => setUseCustom(true)}
          className={`p-3 border-2 transition-all flex items-center gap-2 flex-wrap cursor-pointer ${
            useCustom ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200'
          }`}
          style={{ borderRadius: '3px' }}
        >
          <Icon name="settings" size={14} />
          <span className="font-semibold text-sm whitespace-nowrap">自定义</span>
          <input
            type="number" min="5" max="600" value={customInterval}
            onClick={e => { e.stopPropagation(); setUseCustom(true); }}
            onChange={e => { setUseCustom(true); setCustomInterval(e.target.value); }}
            className="w-16 px-2 py-1 border border-stone-300 text-center text-sm focus:outline-none focus:border-[#A30236]"
            style={{ borderRadius: '2px' }}
          />
          <span className="text-stone-500 text-sm">秒/题</span>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="stat-num" style={{ fontSize: '18px' }}>03</span>
          <span className="rule-crimson" />
          <span className="eyebrow eyebrow--crimson">题目池</span>
        </div>
        <h3 className="font-display font-bold text-lg mb-3 text-stone-900">从哪儿抽题</h3>
        {/* 精选混合 —— 推荐 */}
        <button onClick={() => setSource(ALL_SOURCE)}
          className={`w-full mb-3 p-3 text-left transition-all border-2 ${
            source === ALL_SOURCE ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200 hover:border-stone-300'
          }`}
          style={{borderRadius:'3px'}}
        >
          <div className="flex items-center gap-2">
            <Icon name="refresh" size={14} className={source === ALL_SOURCE ? 'text-[#A30236]' : 'text-stone-500'} />
            <span className="font-semibold text-sm">精选混合</span>
            <Tag color="amber">{getDefaultTopicsPool().length}+ 题</Tag>
            <span className="ml-auto text-[10px] text-stone-500">推荐</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">已排除泛情感、闲聊、脑洞、生活问答；更贴近你的长期议题。</div>
        </button>
        <div className="text-xs text-stone-500 mb-2 font-medium tracking-wider uppercase">或按类别</div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {Object.entries(TOPIC_TYPES).map(([k, v]) => (
            <button key={k} onClick={() => setSource(k)}
              className={`px-2.5 py-1.5 text-sm transition-all ${
                source === k ? 'bg-[#A30236] text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
              style={{ borderRadius: '2px' }}
            >
              {k} <span className="opacity-60 text-xs">· {v.topics.length}</span>
            </button>
          ))}
        </div>
        <div className="text-xs text-stone-500 mb-2 font-medium tracking-wider uppercase">5 个长期议题</div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(ISSUES).map(([k, v]) => (
            <button key={k} onClick={() => setSource(k)}
              className={`px-2.5 py-1.5 text-sm transition-all ${
                source === k ? 'bg-[#A30236] text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
              style={{ borderRadius: '2px' }}
            >
              {k} <span className="opacity-60 text-xs">· {v.topics.length}</span>
            </button>
          ))}
        </div>
        {/* AI 实时生成已经砍掉 · 跟 ImprovMode 同理 · 精选题池随机抽足够覆盖 */}
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="stat-num" style={{ fontSize: '18px' }}>04</span>
          <span className="rule-crimson" />
          <span className="eyebrow eyebrow--crimson">规则确认</span>
        </div>
        <ul className="text-sm text-stone-700 space-y-1.5 leading-relaxed mb-4">
          <li className="flex items-baseline gap-2"><span className="text-[#A30236] shrink-0">▍</span>训练总时长 <span className="font-bold text-[#A30236]">{effectiveSessionLimitSec === 0 ? '不限' : `${Math.round(effectiveSessionLimitSec/60)} 分钟`}</span>{estimatedTopicCount && ` · 预计 ${estimatedTopicCount} 题`}</li>
          <li className="flex items-baseline gap-2"><span className="text-[#A30236] shrink-0">▍</span>每 <span className="font-bold text-[#A30236]">{effectiveInterval}</span> 秒自动切下一题</li>
          <li className="flex items-baseline gap-2"><span className="text-[#A30236] shrink-0">▍</span>摄像头开启 · 全程一段录像</li>
          <li className="flex items-baseline gap-2"><span className="text-[#A30236] shrink-0">▍</span>最近 5 题不会重复出现 · 跳过次数会进训练报告</li>
          <li className="flex items-baseline gap-2"><span className="text-[#A30236] shrink-0">▍</span>到时间自动停 · 也能手动"结束"</li>
          <li className="flex items-baseline gap-2"><span className="text-[#A30236] shrink-0">▍</span>结束后给训练报告：题数 / 平均节奏 / 跳过统计</li>
        </ul>
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {cam.error && <span className="text-xs text-red-600 self-center">{cam.error}</span>}
          <Btn variant="primary" size="md" onClick={begin}>
            <Icon name="play" size={14} />开始训练
          </Btn>
        </div>
      </Card>
    </div>
  );
};

// ============ Settings Panel ============
const SettingsPanel = ({ onClose }) => {
  const s = useSettings();
  const [keyInput, setKeyInput] = useState(s.userApiKey);
  const [testStatus, setTestStatus] = useState(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const fsSupported = !!window.showDirectoryPicker;

  const save = () => {
    s.setApiKey(keyInput.trim());
    onClose();
  };
  const clearKey = () => {
    setKeyInput('');
    s.setApiKey('');
    setTestStatus(null);
  };

  const test = async () => {
    setTestStatus({ state: 'testing' });
    try {
      // 测试当前生效的 key：用户填的优先，否则用内置
      const effectiveTestKey = keyInput.trim() || s.apiKey;
      const out = await deepseekGenerateTopics({ apiKey: effectiveTestKey, theme: '内卷', count: 2 });
      setTestStatus({ state: 'ok', sample: out });
    } catch (e) {
      setTestStatus({ state: 'fail', error: e.message });
    }
  };

  const pickDir = async () => {
    try {
      const h = await window.showDirectoryPicker({ id: 'kobo-trainer-save', mode: 'readwrite' });
      s.setSaveDir(h);
    } catch (e) { /* user canceled */ }
  };

  return (
    <div className="absolute inset-0 z-50 bg-stone-950/70 flex items-end justify-center p-3" onClick={onClose}>
      <Card className="w-full p-5 fade-in max-h-[86%] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-[18px] text-stone-950">设置</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900">✕</button>
        </div>

        <SectionHeader
          eyebrow="设置"
          title="练习设置"
          detail="常用录制、提醒、隐私和 AI 复盘设置留在这里；低频工具放进高级区。"
        />

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <label className="text-sm font-medium">DeepSeek 密钥</label>
            {s.isBuiltinKey
              ? <Tag color="emerald">免费代理 · 每日 50 次</Tag>
              : <Tag color="amber">自用密钥 · 无限</Tag>}
          </div>
          <div className="bg-stone-50 border border-stone-200 p-2.5 mb-3 text-[11px] text-stone-600 leading-relaxed" style={{borderRadius:'2px'}}>
            {s.isBuiltinKey
              ? <>默认走免费代理 · 每个网络地址每天 50 次免费 AI 调用。<br/>想无限调，把自己的 DeepSeek 密钥填到下面框 · 直连 · 走你自己的余额（DeepSeek 1 元能用很久）。</>
              : <>✓ 正在用你自己的密钥 · 直连 DeepSeek · 无次数限制 · 不再走代理</>}
          </div>
          <input
            type="password"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            placeholder="sk-... （留空 = 走免费代理）"
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono focus:outline-none focus:border-amber-400"
          />
          <div className="text-xs text-stone-500 mt-2">
            自己的密钥从 <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener" className="text-amber-700 underline">DeepSeek 控制台</a> 获取（充值 1 元够用几个月）。
            仅保存在你的浏览器本地存储 · 不会上传任何服务器。
            {keyInput && <> · <button onClick={clearKey} className="underline text-stone-600 hover:text-red-600">清除，恢复免费代理</button></>}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Btn size="sm" variant="secondary" onClick={test} disabled={!keyInput.trim() || testStatus?.state === 'testing'}>
              {testStatus?.state === 'testing' ? '测试中...' : '测试连接'}
            </Btn>
            {testStatus?.state === 'ok' && <span className="text-xs text-emerald-700">✓ 通过 · 样例：{testStatus.sample.join(' / ')}</span>}
            {testStatus?.state === 'fail' && <span className="text-xs text-red-600">{testStatus.error}</span>}
          </div>
        </div>

        {/* 数据 / 隐私承诺 */}
        <div className="mb-6 pt-6 border-t border-stone-200">
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-medium">🔒 数据 & 隐私</label>
            <Tag color="emerald">全本地</Tag>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 p-3 text-[12px] text-emerald-900 leading-relaxed space-y-1.5" style={{borderRadius:'3px'}}>
            <div>✅ 所有<strong>视频 / 转录稿 / 打卡数据</strong>都只存在你的设备本地</div>
            <div>✅ 不需要登录、不需要账号、不收集任何用户行为</div>
            <div>✅ AI 调用仅传输<strong>话题 / 转录文字</strong>（不上传视频）· 走 DeepSeek</div>
            <div>✅ 仅在应用崩溃时上报<strong>报错信息</strong>给作者修问题（无任何个人内容 · 可关闭）</div>
            <div>✅ 代码<a href="https://github.com/CharlieLam2025/kobo-trainer" target="_blank" rel="noopener" className="underline font-bold">开源在 GitHub</a> · 可自行审计</div>
          </div>
        </div>

        {/* 🔔 每日打卡提醒（本地通知 · 仅安卓应用端有效） */}
        <div className="mb-6 pt-6 border-t border-stone-200">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <label className="text-sm font-medium">🔔 每日打卡提醒</label>
            <Tag color={s.reminderEnabled ? 'amber' : 'stone'}>{s.reminderEnabled ? '已开启' : '未开启'}</Tag>
            {typeof window !== 'undefined' && !window.Capacitor && <Tag color="stone">仅应用端</Tag>}
          </div>
          <div className="bg-stone-50 border border-stone-200 p-2.5 mb-3 text-[11px] text-stone-600 leading-relaxed" style={{borderRadius:'2px'}}>
            每天定时弹个温和提醒"60s 预演一条" · 仅本地通知 · 不联网 · 不上传数据。<br/>
            <span className="text-amber-700">仅安卓应用端真正可靠 · 网页 / iOS 浏览器需要保持页面打开</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => s.setReminderEnabled(!s.reminderEnabled)}
              className={`px-3 py-1.5 text-xs font-bold transition-colors ${s.reminderEnabled ? 'bg-[#A30236] text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}
              style={{borderRadius:'2px'}}>
              {s.reminderEnabled ? '✓ 已开启 · 点击关闭' : '🔔 开启提醒'}
            </button>
            <label className="text-xs text-stone-600 flex items-center gap-2">
              提醒时间
              <input type="time"
                value={s.reminderTime}
                onChange={e => s.setReminderTime(e.target.value)}
                disabled={!s.reminderEnabled}
                className="px-2 py-1 border border-stone-300 text-xs font-mono disabled:opacity-40"
                style={{borderRadius:'2px'}} />
            </label>
          </div>
        </div>

        {/* 🎙️ 录制模式 · 纯语音 / 完整视频 */}
        <div className="mb-6 pt-6 border-t border-stone-200">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <label className="text-sm font-medium">🎙️ 录制模式</label>
            <Tag color={s.voiceOnly ? 'amber' : 'stone'}>{s.voiceOnly ? '仅录音' : '视频 + 音频'}</Tag>
          </div>
          <div className="bg-stone-50 border border-stone-200 p-2.5 mb-3 text-[11px] text-stone-600 leading-relaxed" style={{borderRadius:'2px'}}>
            纯语音模式：不开摄像头 · 只录声音 · 节电 + 隐私友好 · 适合"先练声音再练镜头"
          </div>
          <div className="flex gap-2">
            <button onClick={() => s.setVoiceOnly(false)}
              className={`flex-1 px-3 py-2 text-xs font-bold transition-colors ${!s.voiceOnly ? 'bg-[#A30236] text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}
              style={{borderRadius:'2px'}}>
              📹 完整视频
            </button>
            <button onClick={() => s.setVoiceOnly(true)}
              className={`flex-1 px-3 py-2 text-xs font-bold transition-colors ${s.voiceOnly ? 'bg-[#A30236] text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}
              style={{borderRadius:'2px'}}>
              🎙️ 纯语音
            </button>
          </div>
          {s.voiceOnly && (
            <div className="mt-3 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5" style={{borderRadius:'3px'}}>
              💡 已切到纯语音 · 美颜 / 滤镜 / 背景虚化暂时无效 · 录制时显示音频波形
            </div>
          )}
        </div>

        <div className="mb-6 pt-6 border-t border-stone-200">
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-medium">视频保存目录</label>
            <Tag color={fsSupported ? 'emerald' : 'stone'}>{fsSupported ? '可选' : '不支持当前浏览器'}</Tag>
          </div>
          {fsSupported ? (
            <>
              <div className="text-xs text-stone-500 mb-2">
                选一个目录后，所有录制完成的视频会自动写入该目录（不需要每次点下载）。<br />
                若不设置，视频会自动下载到浏览器默认下载文件夹。
              </div>
              <div className="flex items-center gap-2">
                <Btn size="sm" variant="secondary" onClick={pickDir}><Icon name="folder" size={13}/> 选择目录</Btn>
                {s.saveDir && (
                  <>
                    <span className="text-xs text-emerald-700">✓ 已绑定：{s.saveDir.name}</span>
                    <button onClick={() => s.setSaveDir(null)} className="text-xs text-stone-500 hover:text-red-600 ml-2">解绑</button>
                  </>
                )}
                {!s.saveDir && <span className="text-xs text-stone-500">未选 · 将自动下载</span>}
              </div>
            </>
          ) : (
            <div className="text-xs text-stone-500">
              当前浏览器不支持 File System Access API（建议用 Chrome / Edge）。视频将自动下载到默认下载文件夹。
            </div>
          )}
        </div>

        <div className="mb-4 pt-4 border-t border-stone-200">
          <button
            onClick={() => setAdvancedOpen(v => !v)}
            className="w-full flex items-center justify-between bg-stone-100 px-3 py-2 text-[12px] font-bold text-stone-700 hover:bg-stone-200 transition-colors"
            style={{borderRadius:'4px'}}
          >
            <span>高级选项</span>
            <span>{advancedOpen ? '收起' : '展开'}</span>
          </button>
          {advancedOpen && (
            <div className="mt-3 space-y-4">
              {s.savedFiles.length > 0 && <RecordingHistoryList settings={s} />}

              {/* 重看引导 */}
              <div className="pt-4 border-t border-stone-200">
                <div className="text-sm font-medium mb-2">引导与帮助</div>
                <button
                  onClick={() => {
                    try { window.__koboReplayOnboarding && window.__koboReplayOnboarding(); } catch {}
                    onClose();
                  }}
                  className="px-3 py-1.5 text-xs font-bold tracking-wider bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
                  style={{borderRadius:'3px'}}>
                  🎬 重看新手引导
                </button>
                <div className="text-[10px] text-stone-400 mt-1">1 屏 · 核心哲学 + 三步循环 + 隐私承诺。</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Btn variant="ghost" onClick={onClose}>取消</Btn>
          <Btn variant="primary" onClick={save}>保存</Btn>
        </div>

        {/* 水印 */}
        <div className="mt-5 pt-4 border-t border-stone-200 text-center">
          <div className="text-[10px] tracking-[0.22em] font-bold text-[#A30236]">
            CharlieLam 制作
          </div>
          <div className="text-[9px] text-stone-400 mt-1">口播练习器 · v.1.0</div>
        </div>
      </Card>
    </div>
  );
};

// ============ Onboarding 引导（首次打开 · 1 屏）============
// 4 屏 → 1 屏：用户没耐心翻 4 屏，第 2 屏就划走了。
// 一屏一定要传达：是什么 / 怎么做 / 隐私承诺 / 立刻开始。
const ONBOARDING_SLIDES = [
  {
    no: '',
    bg: 'linear-gradient(135deg, #A30236 0%, #6E001E 100%)',
    emoji: '🎙️',
    title: '这是预演 · 不是发布',
    body: '抽题 → 镜头前讲一遍 → 看回放。30 秒就能完成一次。\n所有录像只在你自己手机，不上传、不分享。',
    bullets: [
      '默认视频录像 · 想只练声音可切纯录音',
      '5 种模式 · 总有一个能让你开口',
      '录完自动给你 AI 教练复盘',
      '坚持累了？声明休息日 · streak 不会断',
    ],
    ctaLabel: '开始第一条预演',
  },
];

const Onboarding = ({ onDone }) => {
  const [idx, setIdx] = useState(0);
  const slide = ONBOARDING_SLIDES[idx];
  const last = idx === ONBOARDING_SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[200] fade-in" style={{background: slide.bg, color:'#fff'}}>
      <div className="absolute inset-0 flex flex-col"
           style={{paddingTop:'calc(env(safe-area-inset-top, 0px) + 20px)', paddingBottom:'calc(env(safe-area-inset-bottom, 0px) + 24px)'}}>

        {/* 顶部：进度 + 跳过 */}
        <div className="flex items-center justify-between px-6 mb-6">
          <div className="text-[10px] tracking-[0.3em] uppercase font-bold opacity-70">{slide.no}</div>
          <button onClick={onDone} className="text-[12px] tracking-wider opacity-60 hover:opacity-100 transition-opacity">
            跳过 →
          </button>
        </div>

        {/* 主体：emoji + 标题 + 文案 + bullets */}
        <div className="flex-1 flex flex-col justify-center px-7 max-w-md mx-auto w-full">
          <div className="text-[64px] leading-none mb-5">{slide.emoji}</div>
          <h2 className="font-display font-bold text-[28px] leading-tight mb-3" style={{fontWeight: 800}}>
            {slide.title}
          </h2>
          <p className="text-[14px] opacity-90 leading-relaxed mb-5 whitespace-pre-line">
            {slide.body}
          </p>
          <ul className="space-y-2.5">
            {slide.bullets.map((b, i) => (
              <li key={i} className="text-[13px] flex items-start gap-2.5 opacity-95">
                <span className="opacity-60 mt-0.5">·</span>
                <span className="leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 底部：圆点 + 按钮（单屏 onboarding 不显示圆点） */}
        <div className="px-6 mt-6">
          {ONBOARDING_SLIDES.length > 1 && (
            <div className="flex justify-center items-center gap-1.5 mb-5">
              {ONBOARDING_SLIDES.map((_, i) => (
                <span key={i}
                  className={`h-1.5 transition-all duration-300 ${i === idx ? 'bg-white w-8' : 'bg-white/40 w-1.5'}`}
                  style={{borderRadius:'1px'}} />
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 max-w-md mx-auto">
            {idx > 0 && (
              <button onClick={() => setIdx(idx - 1)}
                className="px-4 py-3 text-[13px] font-bold tracking-wider bg-white/15 backdrop-blur hover:bg-white/25 transition-colors"
                style={{borderRadius:'3px'}}>
                ← 上一步
              </button>
            )}
            <button onClick={() => { last ? onDone() : setIdx(idx + 1); }}
              className="flex-1 px-4 py-3 text-[14px] font-bold tracking-wider bg-white text-stone-900 hover:bg-stone-100 transition-colors"
              style={{borderRadius:'3px'}}>
              {last ? (slide.ctaLabel || '开始') : '下一步 →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ SW 更新提醒 ============
// PWA 装到桌面后用户大多不刷新 · 推了新版也看不到
// 机制：sw.js 在 install 时已经 skipWaiting + claim → 新 SW 接管时触发
//   navigator.serviceWorker.controllerchange → index.html 派发 kobo:sw-update-ready
//   → 本组件监听到 → 弹横幅「新版本已就绪」→ 用户点 = location.reload()
const UpdateBanner = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onUpdate = () => setShow(true);
    window.addEventListener('kobo:sw-update-ready', onUpdate);
    return () => window.removeEventListener('kobo:sw-update-ready', onUpdate);
  }, []);
  if (!show) return null;
  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-[150] fade-in"
         style={{bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)'}}>
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[#061A6C] text-white shadow-lg"
           style={{borderRadius:'4px', minWidth: 280}}>
        <Icon name="sparkle" size={18} className="text-[#F1A23F] shrink-0" strokeWidth={2} />
        <div className="flex-1 text-[13px] font-medium leading-tight">
          新版本已就绪 · 一键加载
        </div>
        <button onClick={() => window.location.reload()}
          className="px-3 py-1 text-[12px] font-bold bg-white text-[#061A6C] hover:bg-stone-100"
          style={{borderRadius:'3px'}}>
          刷新
        </button>
        <button onClick={() => setShow(false)}
          className="text-white/50 hover:text-white text-lg leading-none px-1"
          aria-label="关闭">×</button>
      </div>
    </div>
  );
};

// ============ 兼容纯语音用户：录满 7 条后提醒试试摄像头 ============
// 用户主动选择 voiceOnly 后，录满 7 条触发一次性升级提示。
const VoiceUpgradePrompt = () => {
  const { voiceOnly, setVoiceOnly, savedFiles } = useSettings();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!voiceOnly) return;
    if (!savedFiles || savedFiles.length < 7) return;
    try {
      if (localStorage.getItem('kobo.voiceUpgradePrompted') === '1') return;
    } catch { return; }
    setShow(true);
  }, [voiceOnly, savedFiles]);

  const dismiss = (upgrade) => {
    try { localStorage.setItem('kobo.voiceUpgradePrompted', '1'); } catch {}
    if (upgrade) setVoiceOnly(false);
    setShow(false);
  };

  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-stone-950/70 flex items-center justify-center px-5 fade-in">
      <Card className="w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-4">
          <div className="text-[48px] mb-2">🎬</div>
          <div className="eyebrow eyebrow--crimson mb-2">7 条纯语音 · 拐点到了</div>
          <h2 className="font-display font-bold text-stone-900 text-[20px] leading-tight mb-2">
            准备好打开摄像头了吗？
          </h2>
          <p className="text-[13px] text-stone-600 leading-relaxed">
            你这一周已经录了 7 条纯语音 · 开口的习惯有了。<br/>
            现在试试看镜头里的自己 —— 随时可以切回纯语音。
          </p>
        </div>
        <div className="flex flex-col gap-2 mt-5">
          <Btn variant="primary" size="lg" onClick={() => dismiss(true)} className="w-full">
            <Icon name="rec" size={14}/> 现在试试摄像头
          </Btn>
          <Btn variant="ghost" onClick={() => dismiss(false)} className="w-full">
            还没准备好 · 继续语音
          </Btn>
        </div>
      </Card>
    </div>
  );
};

// ============ App ============
// DeepSeek key 不再硬编码 · 没填 key 时走 Cloudflare Worker 代理（每 IP 50 次/天）
// 用户在"设置"里可填自己的 key 解锁无限调用

function App() {
  const [mode, setMode] = useState('home');
  // 从首页 HERO 按钮进 ImprovMode 时传一个「快速速记」意图 · 让 ImprovMode 跳过 3 屏 config
  // improvIntent 形态：
  //   - 'quick30'                          → 30s + 全题库随机
  //   - { type: 'preset', topic: 'xxx' }   → 60s + 指定题目（明天的话题用）
  const [improvIntent, setImprovIntent] = useState(null);
  const quickStartImprov = useCallback(() => {
    setImprovIntent('quick30');
    setMode('improv');
  }, []);
  const startWithTopic = useCallback((topic) => {
    if (!topic) return;
    setImprovIntent({ type: 'preset', topic });
    setMode('improv');
  }, []);
  const clearImprovIntent = useCallback(() => setImprovIntent(null), []);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // 首次打开 / 用户重看 → 显示引导
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem('kobo.onboarded'); } catch { return false; }
  });
  const dismissOnboarding = useCallback(() => {
    try { localStorage.setItem('kobo.onboarded', '1'); } catch {}
    setShowOnboarding(false);
  }, []);
  const replayOnboarding = useCallback(() => {
    setShowOnboarding(true);
  }, []);
  // 用户自己填的 key（localStorage）· 不填的话 chatComplete 会自动走代理
  const [userApiKey, setUserApiKeyState] = useState(() => {
    try { return localStorage.getItem('kobo.deepseekKey') || ''; } catch { return ''; }
  });
  // 实际传给 deepseek* 函数的 key · 空字符串 → 走代理
  const apiKey = userApiKey;
  const [saveDir, setSaveDir] = useState(null);
  // 保存历史：localStorage 持久化，最多 50 条
  const [savedFiles, setSavedFiles] = useState(() => {
    try {
      const raw = localStorage.getItem('kobo.savedFiles');
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.slice(0, 50) : [];
    } catch { return []; }
  });
  const saveDirRef = useRef(null); // saveDir 可能 stale，用 ref 给 removeSavedFile 用

  // 🎙️ 纯语音模式（不开摄像头 · 节电 + 隐私 · 仅录音）
  // 新用户默认视频录像；用户显式切过纯录音时尊重本地设置。
  const [voiceOnly, setVoiceOnlyState] = useState(() => {
    try {
      const stored = localStorage.getItem('kobo.voiceOnly');
      if (stored !== null) return stored === '1'; // 用户显式设过 · 尊重
      return false;
    } catch { return false; }
  });
  const setVoiceOnly = useCallback((v) => {
    setVoiceOnlyState(v);
    try { localStorage.setItem('kobo.voiceOnly', v ? '1' : '0'); } catch {}
  }, []);

  // 🔔 本地推送提醒（仅 Capacitor / Android · Web 端有限支持）
  const [reminderEnabled, setReminderEnabledState] = useState(() => {
    try { return localStorage.getItem('kobo.reminderEnabled') === '1'; } catch { return false; }
  });
  const [reminderTime, setReminderTimeState] = useState(() => {
    try { return localStorage.getItem('kobo.reminderTime') || '19:00'; } catch { return '19:00'; }
  });
  const setReminderEnabled = useCallback((v) => {
    setReminderEnabledState(v);
    try { localStorage.setItem('kobo.reminderEnabled', v ? '1' : '0'); } catch {}
  }, []);
  const setReminderTime = useCallback((t) => {
    setReminderTimeState(t);
    try { localStorage.setItem('kobo.reminderTime', t); } catch {}
  }, []);

  // 🪝 routine anchor · 「After I [既有动作], I will [新习惯]」绑定
  // 影响：通知文案 + HomeView 轻提示
  const [routineAnchor, setRoutineAnchorState] = useState(() => {
    try { return localStorage.getItem('kobo.routineAnchor') || ''; } catch { return ''; }
  });
  const setRoutineAnchor = useCallback((id) => {
    setRoutineAnchorState(id || '');
    try {
      if (id) localStorage.setItem('kobo.routineAnchor', id);
      else localStorage.removeItem('kobo.routineAnchor');
    } catch {}
    // 设置 anchor 时自动建议它的时间（仅当用户没改过 reminderTime）
    const a = getRoutineAnchor(id);
    if (a) {
      try {
        const userSetTime = localStorage.getItem('kobo.reminderTimeUserSet') === '1';
        if (!userSetTime) {
          const newTime = `${String(a.hour).padStart(2,'0')}:${String(a.minute).padStart(2,'0')}`;
          setReminderTimeState(newTime);
          localStorage.setItem('kobo.reminderTime', newTime);
        }
      } catch {}
    }
  }, []);

  // 当 enabled / time / anchor 变化 · 重新调度（anchor 影响通知文案）
  useEffect(() => {
    const [h, m] = reminderTime.split(':').map(x => parseInt(x) || 0);
    scheduleDailyReminder({ hour: h, minute: m, enabled: reminderEnabled, anchorId: routineAnchor || null }).then(r => {
      console.log('[Reminder]', r);
    });
  }, [reminderEnabled, reminderTime, routineAnchor]);

  // 已"见过"的成就（避免每次访问都弹动画）
  const [unlockedAchievements, setUnlockedAchievementsState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kobo.unlockedAchievements') || '[]'); } catch { return []; }
  });
  const markAchievementsSeen = useCallback((ids) => {
    setUnlockedAchievementsState(prev => {
      const merged = Array.from(new Set([...(prev || []), ...ids]));
      try { localStorage.setItem('kobo.unlockedAchievements', JSON.stringify(merged)); } catch {}
      return merged;
    });
  }, []);

  // 休息日（dayKey 字符串数组），streak 计算时跳过
  const [restDays, setRestDaysState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kobo.restDays') || '[]'); } catch { return []; }
  });
  const addRestDay = useCallback((dayK) => {
    setRestDaysState(prev => {
      if (prev.includes(dayK)) return prev;
      const next = [...prev, dayK].sort();
      try { localStorage.setItem('kobo.restDays', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  const removeRestDay = useCallback((dayK) => {
    setRestDaysState(prev => {
      const next = prev.filter(d => d !== dayK);
      try { localStorage.setItem('kobo.restDays', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // 每周复盘上次显示时间戳
  const [lastWeeklyRecap, setLastWeeklyRecapState] = useState(() => {
    try { return parseInt(localStorage.getItem('kobo.lastWeeklyRecap') || '0', 10) || 0; } catch { return 0; }
  });
  const setLastWeeklyRecap = useCallback((ts) => {
    setLastWeeklyRecapState(ts);
    try { localStorage.setItem('kobo.lastWeeklyRecap', String(ts)); } catch {}
  }, []);

  // 每日打卡目标
  const [dailyGoal, setDailyGoalState] = useState(() => {
    try {
      const raw = localStorage.getItem('kobo.dailyGoal');
      if (raw) {
        const g = JSON.parse(raw);
        if (g && typeof g.count === 'number' && typeof g.durationSec === 'number') return g;
      }
    } catch {}
    return { count: 3, durationSec: 60 };
  });
  const setDailyGoal = useCallback((g) => {
    setDailyGoalState(g);
    try { localStorage.setItem('kobo.dailyGoal', JSON.stringify(g)); } catch {}
  }, []);

  // Detect "this is a phone" — Capacitor native OR viewport < 600px → fill the whole screen,
  // no fake iPhone frame (otherwise the user sees a tiny phone-in-phone view).
  const [isPhone, setIsPhone] = useState(() => {
    try {
      if (typeof window === 'undefined') return false;
      if (window.Capacitor) return true;
      return window.innerWidth < 600;
    } catch { return false; }
  });
  useEffect(() => {
    const onResize = () => {
      const v = !!window.Capacitor || window.innerWidth < 600;
      setIsPhone(v);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const setApiKey = useCallback((k) => {
    setUserApiKeyState(k);
    try { localStorage.setItem('kobo.deepseekKey', k); } catch {}
  }, []);

  // 同步 saveDir 到 ref，便于 removeSavedFile 拿到最新值（不重建回调）
  useEffect(() => { saveDirRef.current = saveDir; }, [saveDir]);

  // 持久化 savedFiles 到 localStorage
  const persistSavedFiles = (arr) => {
    try { localStorage.setItem('kobo.savedFiles', JSON.stringify(arr)); } catch {}
  };

  const addSavedFile = useCallback((f) => {
    setSavedFiles(prev => {
      const entry = { ...f, ts: f.ts || Date.now(), tag: f.tag || null };
      const next = [entry, ...prev].slice(0, 50);
      persistSavedFiles(next);
      return next;
    });
  }, []);

  // 更新单条 metadata（用于打标签 / 改备注）— 用 filename 定位，避免 idx 漂移
  const updateSavedFile = useCallback((filename, patch) => {
    setSavedFiles(prev => {
      const next = prev.map(f => f.filename === filename ? { ...f, ...patch } : f);
      persistSavedFiles(next);
      return next;
    });
  }, []);

  // 删除单条：从 localStorage 移除 + 如果是 folder 保存且目录还在 → 同步删磁盘文件
  const removeSavedFile = useCallback(async (idx) => {
    let target = null;
    setSavedFiles(prev => {
      target = prev[idx];
      const next = prev.filter((_, i) => i !== idx);
      persistSavedFiles(next);
      return next;
    });
    // 异步尝试删除磁盘文件（不阻塞 UI）
    setTimeout(async () => {
      if (target && target.method === 'folder' && target.filename && saveDirRef.current) {
        try {
          await saveDirRef.current.removeEntry(target.filename);
        } catch (e) { /* 文件可能不存在或权限失效 */ }
      }
      if (target && target.method === 'native') {
        try { await deleteNativeSavedFile(target); } catch (e) { /* 文件可能不存在或权限失效 */ }
      }
    }, 0);
  }, []);

  const clearAllSavedFiles = useCallback(async () => {
    const toDelete = savedFiles.filter(f => f.method === 'folder' || f.method === 'native');
    setSavedFiles([]);
    persistSavedFiles([]);
    for (const f of toDelete) {
      if (f.method === 'folder' && saveDirRef.current) {
        try { await saveDirRef.current.removeEntry(f.filename); } catch {}
      }
      if (f.method === 'native') {
        try { await deleteNativeSavedFile(f); } catch {}
      }
    }
  }, [savedFiles]);

  const isBuiltinKey = !userApiKey;
  const ctxValue = useMemo(() => ({
    apiKey, userApiKey, isBuiltinKey, setApiKey,
    saveDir, setSaveDir, savedFiles, addSavedFile, updateSavedFile, removeSavedFile, clearAllSavedFiles,
    dailyGoal, setDailyGoal,
    unlockedAchievements, markAchievementsSeen,
    lastWeeklyRecap, setLastWeeklyRecap,
    restDays, addRestDay, removeRestDay,
    voiceOnly, setVoiceOnly,
    reminderEnabled, setReminderEnabled, reminderTime, setReminderTime,
    routineAnchor, setRoutineAnchor,
  }), [apiKey, userApiKey, isBuiltinKey, setApiKey, saveDir, savedFiles, addSavedFile, updateSavedFile, removeSavedFile, clearAllSavedFiles, dailyGoal, setDailyGoal, unlockedAchievements, markAchievementsSeen, lastWeeklyRecap, setLastWeeklyRecap, restDays, addRestDay, removeRestDay, voiceOnly, setVoiceOnly, reminderEnabled, setReminderEnabled, reminderTime, setReminderTime, routineAnchor, setRoutineAnchor]);

  // Mode → title for MobileHeader
  const headerSub = useMemo(() => {
    const it = NAV_ITEMS.find(n => n.id === mode);
    return it ? (it.no === '·' ? '本地训练工作台' : `${it.no} · ${it.cn}`) : '本地训练工作台';
  }, [mode]);

  const phoneInner = (
    <>
      <MobileHeader title="口播练习器" sub={headerSub} onOpenSettings={() => setSettingsOpen(true)} />

      {/* Scrollable main area */}
      <main style={{flex:1, overflowY:'auto', overflowX:'hidden', minHeight:0}}>
        <div className="px-5 py-5">
          {mode === 'home' ? (
            <HomeView onSelect={setMode} onOpenSettings={() => setSettingsOpen(true)} onQuickStart={quickStartImprov} onStartWithTopic={startWithTopic} />
          ) : (
            <>
              {(() => {
                const it = NAV_ITEMS.find(n => n.id === mode);
                if (!it) return null;
                const titles = {
                  improv: '即兴练习', endless: '无限模式', teleprompter: '爆款文案复刻',
                  host: '主持人引导', tutorial: '教程模式',
                };
                return <PageHeader no={it.no} iconName={it.icon} title={titles[mode] || it.cn} desc={it.sub} />;
              })()}
              {mode === 'improv'       && <ImprovMode key="improv" intent={improvIntent} clearIntent={clearImprovIntent} />}
              {mode === 'endless'      && <EndlessMode key="endless" />}
              {mode === 'teleprompter' && <TeleprompterMode key="tele" />}
              {mode === 'host'         && <HostMode key="host" />}
              {mode === 'tutorial'     && <TutorialMode key="tut" />}
            </>
          )}
        </div>
      </main>

      <BottomTabs mode={mode} onChange={setMode} />

      {/* Settings rendered INSIDE phone shell so it's contained */}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}

      {/* SW 新版本就绪横幅（fixed 定位 · 自动浮在底部 tab 上方） */}
      <UpdateBanner />

      {/* 第一周渐进路径：录满 7 条纯语音后 · 一次性提示开摄像头 */}
      <VoiceUpgradePrompt />
    </>
  );

  return (
    <SettingsContext.Provider value={ctxValue}>
      {isPhone ? (
        // Real phone / Capacitor: fullscreen, no iOS frame chrome
        <div style={{
          position: 'fixed', inset: 0,
          display: 'flex', flexDirection: 'column',
          background: '#FAFAF9',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>
          {phoneInner}
        </div>
      ) : (
        // Desktop preview: show app inside a centred iPhone frame
        <div className="min-h-screen w-full flex items-start justify-center py-6 px-4"
             style={{background:'radial-gradient(ellipse at 50% 30%, #2a2826 0%, #1a1918 70%, #0e0d0c 100%)'}}>
          <IOSDevice width={402} height={874}>
            <div style={{position:'absolute', inset:0, paddingTop:62, paddingBottom:34, display:'flex', flexDirection:'column', background:'#FAFAF9'}}>
              {phoneInner}
            </div>
          </IOSDevice>
        </div>
      )}

      {/* 首次打开 / 用户主动重看 · 引导覆盖层 */}
      {showOnboarding && <Onboarding onDone={dismissOnboarding} />}

      {/* 给 SettingsSheet 一条访问入口（通过 window 暴露） */}
      {(() => { try { window.__koboReplayOnboarding = replayOnboarding; } catch {} return null; })()}
    </SettingsContext.Provider>
  );
}

// ============ ErrorBoundary · 单组件崩溃不要白屏整个 App ============
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // 上报到 Sentry（如果已加载）
    try {
      if (window.Sentry && typeof window.Sentry.captureException === 'function') {
        window.Sentry.captureException(error, { extra: { componentStack: info?.componentStack } });
      }
    } catch {}
    // 浏览器控制台保留（开发者能 F12 看到）
    console.error('[ErrorBoundary]', error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null, info: null });
  };

  hardReload = () => {
    try { window.location.reload(); } catch {}
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    const errMsg = String(this.state.error?.message || this.state.error || '未知错误');
    return (
      <div style={{
        position:'fixed', inset:0, padding:24,
        background:'#FAFAF9', color:'#1c1917',
        display:'flex', flexDirection:'column', alignItems:'stretch', justifyContent:'center',
        fontFamily:'system-ui, -apple-system, sans-serif',
        overflowY:'auto',
      }}>
        <div style={{maxWidth: 480, margin:'0 auto', width:'100%'}}>
          <div style={{fontSize: 56, marginBottom: 16}}>🫠</div>
          <h1 style={{fontSize:24, fontWeight:800, marginBottom:8, letterSpacing:'-0.01em'}}>
            页面碎了一下
          </h1>
          <p style={{fontSize:14, color:'#78716c', marginBottom:20, lineHeight:1.6}}>
            应用里某个组件出错 · 已自动上报让作者修 · 你的数据没丢（视频 / 打卡 / 设置都在本地存储）。
          </p>
          <div style={{
            background:'#FBEFF2', border:'1px solid #f4d4dd', padding:'12px 14px',
            borderRadius: 3, fontSize: 12, color:'#7E001E', marginBottom:20,
            fontFamily:'ui-monospace, monospace', wordBreak:'break-all',
          }}>
            {errMsg.slice(0, 300)}
          </div>
          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            <button onClick={this.reset}
              style={{
                padding:'12px 18px', background:'#A30236', color:'#fff',
                border:'none', borderRadius: 3, fontWeight:700, cursor:'pointer',
                fontSize: 13, letterSpacing: '0.04em',
              }}>
              试着继续 →
            </button>
            <button onClick={this.hardReload}
              style={{
                padding:'12px 18px', background:'#fff', color:'#1c1917',
                border:'1.5px solid #d6d3d1', borderRadius: 3, fontWeight:700, cursor:'pointer',
                fontSize: 13, letterSpacing: '0.04em',
              }}>
              重启应用
            </button>
          </div>
          <div style={{marginTop:24, fontSize:11, color:'#a8a29e'}}>
            帮 CharlieLam 修这个问题：截屏上面的错误信息 · 发到
            {' '}<a href="https://github.com/CharlieLam2025/kobo-trainer/issues" target="_blank" rel="noopener"
              style={{color:'#A30236', textDecoration:'underline'}}>项目反馈页</a>
          </div>
        </div>
      </div>
    );
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
