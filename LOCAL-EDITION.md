# SPlayer 本地版（移除在线播放）

> 本仓库是 [SPlayer-Dev/SPlayer](https://github.com/SPlayer-Dev/SPlayer)（`dev` 分支，v3.1.1）的衍生版本。
> **本版本彻底移除了全部在线音乐服务与网络功能，是一个纯本地音乐播放器。**
> 原项目的许可证（AGPL-3.0）、作者信息与基本项目结构均予以保留，本文件仅说明本版本与上游的差异。

- 分支：`remove-online-playback`
- 基线：上游 `dev` 分支（commit `40d9ec60`）
- 变更规模：197 个文件，+约 900 行 / **-约 29,600 行**

---

## 一、移除的模块与功能

### 1. 在线音乐服务（核心移除）

| 模块 | 原位置 | 说明 |
|---|---|---|
| 内嵌网易云音乐 API 服务器 | `electron/server/netease/`、`@neteasecloudmusicapienhanced/api` | Fastify 封装的网易云全量接口（搜索/播放链接/歌单/电台/MV 等） |
| 音乐解灰服务 | `electron/server/unblock/` | 网易云无版权歌曲的第三方音源替换（netease/bodian/kuwo） |
| QQ 音乐歌词代理 | `electron/server/qqmusic/` | QQ 逐字歌词匹配与搜索代理 |
| 网易云 API 封装层 | `src/api/`（album、artist、cloud、comment、login、playlist、radio、rec、search、song、user、video） | 渲染进程全部在线请求 |
| Last.fm 服务 | `src/api/lastfm.ts`、`src/utils/lastfmScrobbler.ts` | scrobble / 正在播放同步 |
| 自托管流媒体 | `src/api/streaming/`、`src/stores/streaming.ts` | Subsonic / Navidrome / Jellyfin / Emby 串流 |
| 在线更新日志与贡献者 | `src/api/other.ts`（GitHub API） | — |

### 2. 账号与用户体系

- 网易云登录（二维码 / 手机号 / UID / Cookie）与多账号切换
- 用户信息、用户歌单、收藏（歌单 / 专辑 / 歌手 / MV / 电台）
- 云盘（上传 / 匹配 / 导入）、每日推荐、私人 FM、心动模式（heartRateList）
- 歌曲喜欢（网易云红心）、打卡 scrobble、VIP / 特权标签数据

### 3. 在线功能页面与 UI 入口

- **路由页面**：搜索、发现音乐（歌单广场 / 排行榜 / 歌手 / 新歌）、歌手、专辑、MV 视频、歌曲百科、评论、播客电台、云盘、每日推荐、我的收藏、流媒体、在线歌单详情、下载管理
- **布局入口**：顶部搜索框（热搜 / 建议）、用户头像菜单、侧边栏在线菜单项（推荐 / 发现 / FM / 电台 / 收藏 / 云盘 / 流媒体等）
- **播放器内**：网易云喜欢按钮、评论查看、歌曲下载、MV 入口、在线音质切换、音源切换（解灰）、动态封面、歌词源切换（QM / TTML）
- **弹窗**：登录、下载、云盘匹配、音源管理、跳转歌手、复制歌曲信息、AMLL 服务器配置、流媒体服务器配置、评论排除、首页栏目配置
- **设置项**：在线服务总开关、搜索设置、评论排除、下载配置、解灰配置、在线歌词源、网络代理、真实 IP、Last.fm、流媒体服务器、首页栏目、分享链接格式等约 45 项

### 4. 在线数据与缓存

- 在线歌词获取（网易云 `/lyric/new`、AMLL TTML DB、QQ 逐字匹配）及对应缓存
- 在线歌曲音频缓存（`MusicCacheService`）与歌曲下载管理（`DownloadManager` / `DownloadService`）
- 持久化的账号 / 收藏 / 云盘 / 分类 / 下载队列状态（设置迁移 v13 会在启动时自动清理旧版本残留）

### 5. 构建与部署

- Docker / nginx / vercel 的「网页版在线播放器」部署链（`Dockerfile`、`docker-compose.yml`、`nginx.conf`、`vercel.json`、`docker-entrypoint.sh`）
- `orpheus://` 协议注册（网易云网页端唤起客户端用）
- 依赖移除：`@neteasecloudmusicapienhanced/api`、`axios`、`axios-retry`、`js-cookie`、`md5`、`plyr`、`change-case`、`file-saver`（及 `crypto-js` 等未使用项）

### 6. 明确保留的非音乐类网络功能

以下功能仍会访问网络，但与在线音乐服务无关，保守起见予以保留（如需彻底断网可自行移除）：

- 应用更新检查（electron-updater，GitHub Releases）
- 「关于」页的更新日志与贡献者列表（GitHub API）
- Discord RPC（与本地 Discord 客户端通信）

---

## 二、保留的功能

### 本地播放核心

- 本地音乐库：目录管理、递归扫描、SQLite 曲库、封面提取缓存、按单曲 / 专辑 / 艺术家 / 文件夹浏览
- 播放控制：播放 / 暂停 / 上下曲 / 进度拖动 / 音量 / 静音 / 倍速 / 循环（列表 / 单曲）/ 随机
- 音效：均衡器（10 段）、AB 循环、自动关闭、音乐渐入渐出、ReplayGain 音量平衡、Automix 自动混音（BPM 对齐 / Smart Cut）
- 多播放引擎：Web Audio（默认）/ FFmpeg / MPV，可切换

### 歌词与封面（本地来源）

- 内嵌歌词读取（LRC / YRC / QRC / TTML）+ 本地歌词目录覆盖（`.lrc` / `.ttml` 旁车文件）
- 简繁转换（OpenCC WASM，本地）、逐字歌词渲染、AMLL Apple Music-like 歌词界面
- 本地封面：音频内嵌提取 + 曲库封面缓存

### 系统集成与桌面能力

- 桌面歌词、任务栏歌词（Windows，Rust 原生模块）、macOS 状态栏歌词
- 系统媒体控制（Windows SMTC / Linux MPRIS，Rust 原生模块）
- 托盘、全局快捷键、窗口控制（无边框 / 最小化 / 关闭行为）、任务栏进度
- 局域网遥控：WebSocket 服务（端口 25885）与本地 HTTP 控制接口 `/api/control`（播放 / 暂停 / 切歌 / 状态查询）
- Discord Rich Presence

### 其他

- 本地歌单（新建 / 编辑 / 排序 / 批量操作 / 模糊搜索）、最近播放、播放队列管理
- 音乐标签编辑器（读写本地文件元数据）
- 主题 / 字体 / 背景 / 自定义 CSS / JS / 界面缩放等全部本地设置
- 应用内更新检查（GitHub Releases）

---

## 三、相对上游的修复（本版本新增）

1. **本地扫描器 JS 回退**：上游本地扫描依赖 Rust 原生模块（`tools.node`），缺失时扫描直接崩溃。现增加行为对齐的纯 JS 回退实现（无原生模块时自动启用），未编译原生模块也能正常导入音乐库。
2. **FFmpeg 引擎解锁**：上游 FFmpeg 播放引擎被「跨源隔离（SharedArrayBuffer）」检查锁死——打包版因 `webSecurity: false`（允许访问本地文件）永远无法满足，导致引擎切换静默失效。实测部分转码批次的 FLAC（如周杰伦多数曲目）Chromium 原生解码器无法解码，必须依赖 FFmpeg 引擎。现移除该门槛（本地文件通过 WORKERFS 挂载整文件解码，不依赖 SharedArrayBuffer），并在流式路径保留明确的错误提示。
3. **设置迁移 v13**：启动时自动清理旧版本残留的在线相关设置键，旧曲库数据中的在线歌曲（无本地路径）播放时会自动跳过并提示，不会崩溃。

---

## 四、构建与运行

```bash
pnpm install

# 开发模式（未安装 Rust 时跳过原生模块）
SKIP_NATIVE_BUILD=true pnpm dev

# 构建可运行目录版（dist/win-unpacked）
SKIP_NATIVE_BUILD=true pnpm build:unpack

# 打包安装版（需要 Rust 工具链编译任务栏歌词 / SMTC / 扫描器原生模块）
pnpm build:win
```

> - `SKIP_NATIVE_BUILD=true` 跳过 Rust 原生模块编译；此时本地扫描自动使用 JS 回退实现，但任务栏歌词与系统媒体控制（SMTC / MPRIS）不可用。
> - 旧版本（在线版）遗留的播放列表 / 历史记录中若无本地文件对应，播放时会自动跳过。
> - 网络连接并非必需，断网状态下所有功能正常。
