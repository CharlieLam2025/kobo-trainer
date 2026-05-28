// 口播练习器 · Tailwind v3 配置
// 从 index.html 内联 tailwind.config 迁移过来（一字不改）
// content 字段告诉 Tailwind 去哪里扫 className，只生成实际用到的样式
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx}',
    './index.html',
  ],
  theme: {
    extend: {
      colors: {
        /* amber slot becomes the crimson brand family */
        amber: {
          50:  '#FBEFF2',
          100: '#F7DCE4',
          200: '#EEA5B4',
          300: '#FFFFFF',   /* "amber-300 on dark" reads as white */
          400: '#A30236',
          500: '#8E0230',
          600: '#700024',
          700: '#A30236',
          800: '#700024',
          900: '#52001A',
        },
        /* stone slot becomes the RANEPA grey ramp */
        stone: {
          50:  '#FAFAF9',
          100: '#F4F4F2',
          200: '#E6E6E6',
          300: '#D5D5D2',
          400: '#999999',
          500: '#6D6D6D',
          600: '#48494A',
          700: '#404040',
          800: '#323232',
          900: '#262626',
          950: '#0F0F0F',
        },
        /* misc accent slots — kept restrained */
        rose:    { 100:'#FBEFF2', 200:'#F4D4DD', 700:'#A30236' },
        orange:  { 50:'#FFF6EC', 100:'#FCE6CC', 200:'#F1A23F', 400:'#EB5E3F' },
        violet:  { 100:'#E9EBF5', 200:'#C5CBE6', 900:'#061A6C' },
        emerald: { 50:'#EEF6F0', 100:'#D6E9D9', 200:'#B6D8BC', 600:'#2F6B3D', 700:'#264F30', 900:'#1B3522' },
        sky:     { 100:'#E9EBF5', 200:'#C5CBE6' },
        red:     { 50:'#FBEFF2', 100:'#F7DCE4', 200:'#EEA5B4', 400:'#BE003E', 600:'#A30236', 700:'#8E0230' },
        navy:    { DEFAULT:'#061A6C', alt:'#001A71', pale:'#E9EBF5' },
      },
      fontFamily: {
        display: ['"Yandex Sans Display"','"Yandex Sans Text"','"PingFang SC"','"Microsoft YaHei"','system-ui','sans-serif'],
        body:    ['"Yandex Sans Text"','"PingFang SC"','"Microsoft YaHei"','system-ui','sans-serif'],
      },
      borderRadius: {
        /* RANEPA prefers near-square; clamp every "rounded-*" token */
        none: '0', sm:'2px', DEFAULT:'3px', md:'3px', lg:'4px', xl:'4px',
        '2xl':'6px', '3xl':'6px', full:'9999px',
      },
      boxShadow: {
        sm:  '0 1px 2px rgba(38,38,38,0.06)',
        DEFAULT: '0 1px 2px rgba(38,38,38,0.06), 0 4px 16px rgba(38,38,38,0.05)',
        md:  '0 4px 16px rgba(38,38,38,0.06)',
        lg:  '0 8px 32px rgba(38,38,38,0.10)',
      },
    },
  },
};
