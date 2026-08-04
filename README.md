# 口播练习器 · Kobo Trainer

短视频口播预演 PWA · 抽题 → 镜头前讲一遍 → 看回放 · 30 秒完成一次训练

**在线访问**：`https://charlielam2025.github.io/kobo-trainer/`

iOS / Android 用户在 Safari / Chrome 打开后，可以**添加到主屏幕**，体验跟原生 app 几乎一致。也可用 `npm run android:apk` 打 Android 安装包（Capacitor）。

---

## 5 种预演模式

| 模式 | 入口 | 玩法 |
|---|---|---|
| 🎲 **即兴练习** | 底栏「练习」 | 精选题池随机抽题（680+ 题），倒计时逼出无稿即兴 |
| 📜 **爆款文案复刻** | 底栏「提词」 | 粘贴文案 + 提词器跟读，练节奏、语气、镜头感 |
| 🎙 **主持人引导** | 底栏「主持」 | 开场抛题 → 追问深挖 → 收尾（可接 DeepSeek） |
| 📚 **教程模式** | 底栏「学习」 | 钩子 / PREP / 黄金圈 / 故事三幕 / FCF |
| 🔁 **循环模式** | 首页模式格 | 连续自动换题录制（从底栏挪到首页，减噪音） |

## 习惯系统

- **今日目标 + streak**：连续天数 · 休息日声明（streak 不断）
- **习惯锚点**：设置里绑到既有日常动作（通知文案更贴你）
- **成长阶段 + 成就徽章**：进度合进首页主卡，不再铺满屏
- **月历热力图 + 本月战报**：过去 4 周分布，一键生成分享图

## 录制 & 美颜

- 默认竖屏 9:16 视频录像，可切纯录音；前后摄像头切换 · 自拍镜像 · 构图线
- **柔光磨皮 4 档**（关 / 轻 / 中 / 重）—— CSS 柔焦，始终可用
- **真磨皮**（MediaPipe Face Mesh，只在皮肤区域柔焦，不变形）· **背景虚化**（人像分割）
- **3 套滤镜**：原图 / 柔光 / 复古
- MediaPipe 按需懒加载：不开美颜不下载；首次开启有真实进度条（约 14MB 模型）

## AI 能力（可选 · DeepSeek）

- 录完自动 **AI 教练复盘** + 同题二刷对比
- 主持人模式 AI 追问 · 每日训练提示

## 离线可用

首次加载后 Service Worker 缓存 app shell，之后断网也能练。美颜模型在第一次使用时缓存。

## 隐私

所有录像存在你的浏览器本地，**不会上传任何服务器**。
DeepSeek API 调用走 https 直连，由你自己的 Key 计费。

## 开发

```bash
npm run build        # esbuild + Tailwind 构建 bundle.js / styles.css
npm run watch        # watch 模式
npm run verify       # 跑全部静态验证脚本
```

源码在 `src/` 下按职责拆分：

| 目录 | 内容 |
|---|---|
| `src/modes/` | 首页 + 5 种练习模式 |
| `src/components/` | 相机 UI、回放、设置、通用组件 |
| `src/hooks/` | `useCamera` / `useRecorder` |
| `src/lib/` | 存储、AI、打卡统计、题池 |
| `src/data/` | 题库、表达框架、主持人题 |
| `src/app.jsx` | App shell + 路由 + 全局状态 |

---

made by **CharlieLam**
