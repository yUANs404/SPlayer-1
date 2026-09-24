import { TimeFormat } from "@/composables/useTimeFormat";
import { defineStore } from "pinia";
import {
  CURRENT_SETTING_SCHEMA_VERSION,
  REMOVED_SETTING_KEYS,
  settingMigrations,
} from "./migrations/settingMigrations";
import { ThemeColorType } from "@/types/color";

export interface SettingState {
  /** Schema 版本号 */
  schemaVersion?: number;
  /** 明暗模式 */
  themeMode: "light" | "dark" | "auto";
  /** 主题类别 */
  themeColorType: ThemeColorType;
  /** 偏好繁体中文 */
  preferTraditionalChinese: boolean;
  /** 繁体中文变体 */
  traditionalChineseVariant: "s2t" | "s2tw" | "s2hk" | "s2twp";
  /** 主题自定义颜色 */
  themeCustomColor: string;
  /** 全局着色 */
  themeGlobalColor: boolean;
  /** 主题变体 */
  themeVariant: "primary" | "secondary" | "tertiary" | "neutral" | "neutralVariant" | "error";
  /** 主题跟随封面 */
  themeFollowCover: boolean;
  /** 字体设置样式 */
  fontSettingStyle: "single" | "multi" | "custom";
  /** 全局字体 */
  globalFont: "default" | string;
  /** 歌词区域字体 */
  LyricFont: "follow" | string;
  /** 日语歌词字体 */
  japaneseLyricFont: "follow" | string;
  /** 英语歌词字体 */
  englishLyricFont: "follow" | string;
  /** 韩语歌词字体 */
  koreanLyricFont: "follow" | string;
  /** 隐藏 VIP 标签 */
  showCloseAppTip: boolean;
  /** 关闭应用方式 */
  closeAppMethod: "exit" | "hide";
  /** 显示任务栏进度 */
  showTaskbarProgress: boolean;
  /** 任务栏歌词跟随主题色 */
  taskbarLyricUseThemeColor: boolean;
  /** 启动时检查更新 */
  checkUpdateOnStart: boolean;
  /** 隐藏 VIP 标签 */
  hideVipTag: boolean;
  /** 歌词字体大小模式 */
  lyricFontSizeMode: "fixed" | "adaptive";
  /** 歌词字体大小 */
  lyricFontSize: number;
  /** 歌词翻译字体大小 */
  lyricTranFontSize: number;
  /** 歌词音译字体大小 */
  lyricRomaFontSize: number;
  /** 歌词字重设置 */
  lyricFontWeight: number;
  /** 显示逐字歌词 */
  showWordLyrics: boolean;
  /** 显示歌词翻译 */
  showTran: boolean;
  /** 显示歌词音译 */
  showRoma: boolean;
  /** 调换翻译与音译位置 */
  swapTranRoma: boolean;
  /** 显示逐字音译 */
  showWordsRoma: boolean;
  /** 歌词动画 */
  lyricTransition: "slide" | "fade";
  /** 歌词位置 */
  lyricsPosition: "flex-start" | "center" | "flex-end";
  /** 歌词滚动位置偏移量 */
  lyricsScrollOffset: number;
  /** 歌词水平位置偏移量 */
  lyricHorizontalOffset: number;
  /** 歌词默认靠右（对唱互换） */
  lyricAlignRight: boolean;
  /** 隐藏歌词括号内容和别名 */
  hideBracketedContent: boolean;
  /** 替换歌词括号内容 */
  replaceLyricBrackets: boolean;
  /** 把歌词里的屏蔽词还原为原词 **/
  uncensorMaskedProfanity: boolean;
  /** 歌词括号替换预设 */
  bracketReplacementPreset: "dash" | "angleBrackets" | "cornerBrackets" | "custom";
  /** 自定义歌词括号替换内容 */
  customBracketReplacement: string;
  /** 是否启用缓存 */
  cacheEnabled: boolean;
  /** 是否缓存歌曲（音频文件） */
  songCacheEnabled: boolean;
  /** 播放设备 */
  playDevice: "default" | string;
  /** 音频引擎: element (原生) 或 ffmpeg */
  audioEngine: "element" | "ffmpeg";
  /** Web Audio 延迟策略 */
  audioLatencyHint: "interactive" | "playback";
  /** 自动播放 */
  autoPlay: boolean;
  /** 预载下一首 */
  useNextPrefetch: boolean;
  /** 渐入渐出 */
  songVolumeFade: boolean;
  /** 渐入渐出时间 */
  songVolumeFadeTime: number;
  /** 是否启用 ReplayGain (音量平衡) */
  enableReplayGain: boolean;
  /** ReplayGain 模式: 轨道增益 (track) 或 专辑增益 (album) */
  replayGainMode: "track" | "album";
  /** 显示倒计时 */
  countDownShow: boolean;
  /** 显示歌词条 */
  barLyricShow: boolean;
  /** 时间显示格式 **/
  timeFormat: TimeFormat;
  /** 播放器类型 */
  playerType: "cover" | "record" | "fullscreen";
  /** 背景类型 */
  playerBackgroundType: "none" | "animation" | "blur" | "color";
  /** 背景动画帧率 */
  playerBackgroundFps: number;
  /** 背景动画流动速度 */
  playerBackgroundFlowSpeed: number;
  /** 背景动画是否在歌曲暂停时暂停 */
  playerBackgroundPause: boolean;
  /** 背景动画是否响应低频音量 */
  playerBackgroundLowFreqVolume: boolean;
  /** 背景动画渲染比例 */
  playerBackgroundRenderScale: number;
  /** 播放器元素自动隐藏 */
  autoHidePlayerMeta: boolean;
  /** 记忆最后进度 */
  memoryLastSeek: boolean;
  /** 显示进度条悬浮信息 */
  progressTooltipShow: boolean;
  /** 进度调节吸附最近歌词 */
  progressAdjustLyric: boolean;
  /** 显示播放列表数量 */
  showPlaylistCount: boolean;
  /** 是否显示音乐频谱 */
  showSpectrums: boolean;
  /** 是否开启系统音频集成 */
  smtcOpen: boolean;
  /** 歌词模糊 */
  lyricsBlur: boolean;
  /** 歌词混合模式 */
  lyricsBlendMode: "screen" | "plus-lighter";
  /** 是否使用 AMLL 歌词 */
  useAMLyrics: boolean;
  /** 是否使用 AMLL 歌词弹簧效果 */
  useAMSpring: boolean;
  /** 隐藏已播放歌词 */
  hidePassedLines: boolean;
  /** 文字动画的渐变宽度 */
  wordFadeWidth: number;
  /** 歌词时延调节步长（毫秒） */
  lyricOffsetStep: number;
  /** 音频延迟手动补偿（毫秒） */
  audioDelayCompensation: number;
  /** 菜单显示封面 */
  menuShowCover: boolean;
  /** 菜单展开项 */
  menuExpandedKeys: string[];
  /** 是否禁止休眠 */
  preventSleep: boolean;
  /** 本地文件路径 */
  localFilesPath: string[];
  /** 本地歌词路径 */
  localLyricPath: string[];
  /** 本地文件分隔符 */
  localSeparators: string[];
  /** 显示本地封面 */
  showLocalCover: boolean;
  /** 封面显示配置 */
  hiddenCovers: {
    /** 播放器 */
    player: boolean;
    /** 歌单详情/歌曲列表 */
    list: boolean;
  };
  /** 隐藏全部封面 */
  hideAllCovers: boolean;
  /** 隐藏迷你播放器封面 */
  hideMiniPlayerCover: boolean;
  /** 路由动画 */
  routeAnimation: "none" | "fade" | "zoom" | "slide" | "up" | "flow" | "mask-left" | "mask-top";
  /** 播放器展开动画 */
  playerExpandAnimation: "up" | "flow";
  /** 是否使用 keep-alive */
  useKeepAlive: boolean;
  /** 是否启用排除歌词 */
  enableExcludeLyrics: boolean;
  /** 「排除歌词」是否适用于 TTML */
  enableExcludeLyricsTTML: boolean;
  /** 「排除歌词」是否适用于本地歌词 */
  enableExcludeLyricsLocal: boolean;
  /** 用户自定义的排除歌词关键字 */
  excludeLyricsUserKeywords: string[];
  /** 用户自定义的排除歌词正则表达式 */
  excludeLyricsUserRegexes: string[];
  /** 显示默认本地路径 */
  showDefaultLocalPath: boolean;
  /** 本地文件夹显示模式 */
  localFolderDisplayMode: "tab" | "dropdown";
  /** 展示当前歌曲歌词状态信息 */
  showPlayMeta: boolean;
  /** 显示歌曲音质 */
  showSongQuality: boolean;
  /** 显示播放器歌曲音质 */
  showPlayerQuality: boolean;
  /** 显示歌曲特权标签 */
  showSongPrivilegeTag: boolean;
  /** 显示歌曲脏标 */
  showSongExplicitTag: boolean;
  /** 显示原唱翻唱标签 */
  showSongOriginalTag: boolean;
  /** 显示歌曲专辑 */
  showSongAlbum: boolean;
  /** 显示歌曲时长 */
  showSongDuration: boolean;
  /** 显示歌曲操作 */
  showSongOperations: boolean;
  /** 显示歌曲歌手 */
  showSongArtist: boolean;
  /** 侧边栏隐藏 */
  sidebarHide: {
    /** 隐藏本地歌曲 */
    hideLocal: boolean;
    /** 隐藏最近播放 */
    hideHistory: boolean;
  };
  /** 歌单界面元素显示配置 */
  // Controls the visibility of elements on the playlist detail page
  playlistPageElements: {
    tags: boolean;
    creator: boolean;
    time: boolean;
    description: boolean;
  };
  /** 全屏播放器界面元素显示配置 */
  fullscreenPlayerElements: {
    addToPlaylist: boolean;
    desktopLyric: boolean;
    moreSettings: boolean;
    copyLyric: boolean;
    lyricOffset: boolean;
    lyricSettings: boolean;
  };
  /** 右键菜单显示配置 */
  contextMenuOptions: {
    play: boolean;
    playNext: boolean;
    addToPlaylist: boolean;
    more: boolean;
    deleteFromPlaylist: boolean;
    deleteFromLocal: boolean;
    openFolder: boolean;
    copyName: boolean;
    musicTagEditor: boolean;
  };
  /** 显示主页问好 */
  showHomeGreeting: boolean;
  /** 用户协议版本 */
  userAgreementVersion: string;
  /** 播放器跟随封面主色 */
  playerFollowCoverColor: boolean;
  /** 进度条悬浮时显示歌词 */
  progressLyricShow: boolean;
  /** Discord RPC 配置 */
  discordRpc: {
    /** 是否启用 Discord RPC */
    enabled: boolean;
    /** 暂停时显示 */
    showWhenPaused: boolean;
    /** 显示模式 */
    displayMode: "Name" | "State" | "Details";
  };
  /** 播放引擎 */
  playbackEngine: "web-audio" | "mpv";
  /** 自定义 CSS */
  customCss: string;
  /** 自定义 JS */
  customJs: string;
  /** 播放器封面/歌词占比 (0-100) */
  playerStyleRatio: number;
  /** 全屏封面渐变位置 (0-100) */
  playerFullscreenGradient: number;
  /** Fuck DJ: 开启后自动跳过 DJ 歌曲 */
  disableDjMode: boolean;
  /** 启用自动混音 */
  enableAutomix: boolean;
  /** 自动混音最大分析时间 (秒) */
  automixMaxAnalyzeTime: number;
  /** 启用全局错误弹窗 */
  enableGlobalErrorDialog: boolean;
  /** macOS 专属设置 */
  macos: {
    /** 状态栏歌词 */
    statusBarLyric: {
      /** 是否启用 */
      enabled: boolean;
    };
  };
}

export const useSettingStore = defineStore("setting", {
  state: (): SettingState => ({
    schemaVersion: 0,
    themeMode: "auto",
    themeColorType: "default",
    preferTraditionalChinese: false,
    traditionalChineseVariant: "s2t",
    themeCustomColor: "#fe7971",
    themeFollowCover: false,
    themeGlobalColor: false,
    themeVariant: "secondary",
    fontSettingStyle: "single",
    globalFont: "default",
    LyricFont: "follow",
    japaneseLyricFont: "follow",
    englishLyricFont: "follow",
    koreanLyricFont: "follow",
    hideVipTag: false,
    menuShowCover: true,
    menuExpandedKeys: [],
    routeAnimation: "slide",
    playerExpandAnimation: "up",
    showCloseAppTip: true,
    closeAppMethod: "hide",
    showTaskbarProgress: false,
    taskbarLyricUseThemeColor: false,
    checkUpdateOnStart: true,
    preventSleep: false,
    useKeepAlive: true,
    playDevice: "default",
    audioEngine: "element",
    audioLatencyHint: "interactive",
    autoPlay: false,
    useNextPrefetch: true,
    songVolumeFade: true,
    songVolumeFadeTime: 300,
    enableReplayGain: false,
    replayGainMode: "track",
    countDownShow: true,
    barLyricShow: true,
    timeFormat: "current-total",
    playerType: "cover",
    playerBackgroundType: "blur",
    playerBackgroundFps: 30,
    playerBackgroundFlowSpeed: 4,
    playerBackgroundPause: false,
    playerBackgroundLowFreqVolume: false,
    playerBackgroundRenderScale: 0.5,
    autoHidePlayerMeta: true,
    memoryLastSeek: true,
    progressTooltipShow: true,
    progressAdjustLyric: false,
    showPlaylistCount: true,
    showSpectrums: false,
    smtcOpen: true,
    lyricFontSizeMode: "adaptive",
    lyricFontSize: 46,
    lyricTranFontSize: 22,
    lyricRomaFontSize: 18,
    lyricFontWeight: 700,
    useAMLyrics: false,
    useAMSpring: false,
    hidePassedLines: false,
    wordFadeWidth: 0.5,
    lyricOffsetStep: 500,
    audioDelayCompensation: 0,
    showWordLyrics: true,
    showTran: true,
    showRoma: true,
    swapTranRoma: false,
    showWordsRoma: true,
    lyricTransition: "slide",
    lyricsPosition: "flex-start",
    lyricsBlur: false,
    lyricsBlendMode: "screen",
    lyricsScrollOffset: 0.25,
    lyricHorizontalOffset: 10,
    lyricAlignRight: false,
    hideBracketedContent: false,
    replaceLyricBrackets: false,
    uncensorMaskedProfanity: false,
    bracketReplacementPreset: "dash",
    customBracketReplacement: "-",
    enableExcludeLyrics: true,
    enableExcludeLyricsTTML: false,
    enableExcludeLyricsLocal: false,
    excludeLyricsUserKeywords: [],
    excludeLyricsUserRegexes: [],
    localFilesPath: [],
    localLyricPath: [],
    showDefaultLocalPath: true,
    localFolderDisplayMode: "tab",
    localSeparators: ["/", "&"],
    showLocalCover: true,
    hiddenCovers: {
      player: false,
      list: false,
    },
    hideAllCovers: false,
    hideMiniPlayerCover: false,
    cacheEnabled: true,
    songCacheEnabled: true,
    showPlayMeta: true,
    showSongQuality: true,
    showPlayerQuality: true,
    showSongPrivilegeTag: true,
    showSongExplicitTag: true,
    showSongOriginalTag: true,
    showSongAlbum: true,
    showSongDuration: true,
    showSongOperations: true,
    showSongArtist: true,
    sidebarHide: {
      hideLocal: false,
      hideHistory: false,
    },
    playlistPageElements: {
      tags: true,
      creator: true,
      time: true,
      description: true,
    },
    fullscreenPlayerElements: {
      addToPlaylist: true,
      desktopLyric: true,
      moreSettings: true,
      copyLyric: true,
      lyricOffset: true,
      lyricSettings: true,
    },
    contextMenuOptions: {
      play: true,
      playNext: true,
      addToPlaylist: true,
      more: true,
      deleteFromPlaylist: true,
      deleteFromLocal: true,
      openFolder: true,
      copyName: true,
      musicTagEditor: true,
    },
    showHomeGreeting: true,
    userAgreementVersion: "",
    playerFollowCoverColor: true,
    progressLyricShow: true,
    discordRpc: {
      enabled: false,
      showWhenPaused: true,
      displayMode: "Name",
    },
    playbackEngine: "web-audio",
    customCss: "",
    customJs: "",
    playerStyleRatio: 50,
    playerFullscreenGradient: 15,
    disableDjMode: false,
    enableAutomix: false,
    automixMaxAnalyzeTime: 60,
    enableGlobalErrorDialog: true,
    macos: {
      statusBarLyric: {
        enabled: false,
      },
    },
  }),
  getters: {
    /**
     * 获取淡入淡出时间
     * @returns 淡入淡出时间
     */
    getFadeTime(state): number {
      return state.songVolumeFade ? state.songVolumeFadeTime : 0;
    },
  },
  actions: {
    /**
     * 检查并执行数据迁移
     * 应在应用启动时调用
     */
    checkAndMigrate() {
      const currentVersion = this.schemaVersion ?? 0;
      const targetVersion = CURRENT_SETTING_SCHEMA_VERSION;

      if (currentVersion !== targetVersion) {
        console.log(`[Setting Migration] 检测到版本差异: ${currentVersion} -> ${targetVersion}`);
        // 保存当前完整状态
        const currentState = { ...this.$state } as Partial<SettingState>;
        // 计算需要更新的字段（迁移返回的更新）
        const updates: Partial<SettingState> = {};
        // 按版本顺序执行迁移，收集所有更新
        for (let version = currentVersion + 1; version <= targetVersion; version++) {
          const migration = settingMigrations[version];
          if (migration) {
            const migrationUpdates = migration(currentState);
            Object.assign(updates, migrationUpdates);
          }
        }
        // 只 patch 需要更新的字段
        this.$patch(updates);
        // 清理已废弃的设置键（在线服务移除后残留的字段）
        for (const key of REMOVED_SETTING_KEYS) {
          delete (this.$state as Record<string, unknown>)[key];
        }
        // 统一设置版本号
        this.schemaVersion = targetVersion;
        console.log(`[Setting Migration] 迁移完成，已更新到版本 ${targetVersion}`);
      }
    },
    // 更换明暗模式
    setThemeMode(mode?: "auto" | "light" | "dark") {
      // 若未传入
      if (mode === undefined) {
        if (this.themeMode === "auto") {
          this.themeMode = "light";
        } else if (this.themeMode === "light") {
          this.themeMode = "dark";
        } else {
          this.themeMode = "auto";
        }
      } else {
        this.themeMode = mode;
      }
      window.$message.info(
        `已切换至
        ${
          this.themeMode === "auto"
            ? "跟随系统"
            : this.themeMode === "light"
              ? "浅色模式"
              : "深色模式"
        }`,
        {
          showIcon: false,
        },
      );
    },
  },
  // 持久化
  persist: {
    key: "setting-store",
    storage: localStorage,
  },
});
