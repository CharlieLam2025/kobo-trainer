# 口播练习器 · Kobo Trainer

短视频口播练习 PWA · 5 种模式 + AI 选题 + 1300+ 题库 + MediaPipe 真磨皮

**在线访问**：在 GitHub Pages 开启后，URL 会是  
`https://<你的用户名>.github.io/<仓库名>/`

iOS / Android 用户在 Safari / Chrome 打开后，可以**添加到主屏幕**，体验跟原生 app 几乎一致。

---

## 5 种练习模式

| 模式 | 玩法 |
|---|---|
| 🎲 **即兴** | 1384 题随机抽（17 类含奇葩说 / 脑洞 / 人生哲学），30s/60s/3min/自由 倒计时 |
| 🔁 **无限** | 每 60s 自动换题，持续连续录制 |
| 📜 **爆款文案复刻** | 粘贴文案 + ASR 跟读模式（自动跟着你念到哪句） |
| 🎙 **主持人引导** | 静态题库 / DeepSeek AI 跟问（豆包式：停顿即追问 + TTS 朗读） |
| 📚 **教程** | 钩子 / PREP / 黄金圈 / 故事三幕 / FCF + 100 条万赞文案案例 |

## 美颜 + 滤镜

- **柔光磨皮档**（关 / 轻 / 中 / 重）—— 全局柔焦
- **真磨皮 / 瘦脸 / 大眼**（MediaPipe Face Mesh + canvas 形变）
- **8 种调色滤镜**（柔光 / 奶油 / 粉嫩 / 冷白 / 港风 / 复古 / 黑白）

## 设置

- DeepSeek API Key（用于 AI 生成选题 / AI 跟问 / AI 复盘）
- 视频保存目录（Chrome / Edge 支持 File System Access API）

## 离线可用

首次加载后 Service Worker 缓存全部资源（≈ 15MB 含 MediaPipe 模型），之后断网也能用。

## 隐私

所有录像存在你的浏览器本地，**不会上传任何服务器**。  
DeepSeek API 调用走 https 直连，由你自己的 Key 计费。

---

made by **CharlieLam**
