import { keywords as defaultKeywords, regexes as defaultRegexes } from "@/assets/data/exclude";
import { useCacheManager } from "@/core/resource/CacheManager";
import { useMusicStore, useSettingStore, useStatusStore } from "@/stores";
import type { SongLyric } from "@/types/lyric";
import type { SongType } from "@/types/main";
import { isElectron } from "@/utils/env";
import { applyBracketReplacement } from "@/utils/lyric/lyricFormat";
import { applyProfanityUncensor } from "@/utils/lyric/lyricProfanity";
import {
  alignLyricLines,
  isWordLevelFormat,
  parseQRCLyric,
  parseSmartLrc,
} from "@/utils/lyric/lyricParser";
import { stripLyricMetadata } from "@/utils/lyric/lyricStripper";
import { getConverter } from "@/utils/opencc";
import { type LyricLine, parseTTML, parseYrc } from "@applemusic-like-lyrics/lyric";
import { cloneDeep, isEmpty } from "lodash-es";
import { attachTtmlBgLines, cleanTTMLTranslations } from "@/utils/lyric/parseTTML";

interface LyricFetchResult {
  data: SongLyric;
  meta: {
    usingTTMLLyric: boolean;
  };
}

/**
 * 歌词管理器
 * 负责本地歌词（内嵌/旁车文件）的获取、缓存、预加载等操作
 */
class LyricManager {
  /**
   * 歌词请求序列
   * 每次发起新请求递增
   */
  private lyricReqSeq = 0;
  /**
   * 当前有效的请求序列
   * 用于校验返回是否属于当前歌曲的最新请求
   */
  private activeLyricReq = 0;

  /**
   * 预加载的歌词
   */
  private prefetchedLyric: { id: number | string; result: LyricFetchResult } | null = null;

  constructor() {}

  /**
   * 重置当前歌曲的歌词数据
   * 包括清空歌词数据、重置歌词索引等
   */
  private resetSongLyric() {
    const musicStore = useMusicStore();
    const statusStore = useStatusStore();
    // 重置歌词数据
    musicStore.setSongLyric({}, true);
    // 重置歌词索引
    statusStore.lyricIndex = -1;
    statusStore.lyricLoading = false;
  }

  /**
   * 获取缓存歌词（原始数据）
   * @param id 歌曲 ID
   * @returns 缓存数据
   */
  private async getRawLyricCache(id: number): Promise<string | null> {
    const settingStore = useSettingStore();
    if (!isElectron || !settingStore.cacheEnabled) return null;
    try {
      const cacheManager = useCacheManager();
      const result = await cacheManager.get("lyrics", `${id}.ttml`);
      if (result.success && result.data) {
        // Uint8Array to string
        const decoder = new TextDecoder();
        return decoder.decode(result.data);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 处理本地歌词
   * @param song 歌曲对象
   * @returns 歌词数据和元数据
   */
  private async fetchLocalLyric(song: SongType): Promise<LyricFetchResult> {
    const defaultResult: LyricFetchResult = {
      data: { lrcData: [], yrcData: [] },
      meta: { usingTTMLLyric: false },
    };
    if (!song.path) return defaultResult;

    try {
      const { lyric, format }: { lyric?: string; format?: "lrc" | "ttml" | "yrc" } =
        await window.electron.ipcRenderer.invoke("get-music-lyric", song.path);
      if (!lyric) return defaultResult;
      // YRC 直接解析
      if (format === "yrc") {
        let lines: LyricLine[] = [];
        // 检测是否为 XML 格式 (QRC)
        if (lyric.trim().startsWith("<") || lyric.includes("<QrcInfos>")) {
          lines = parseQRCLyric(lyric);
        } else {
          lines = parseYrc(lyric) || [];
        }
        return {
          data: { lrcData: [], yrcData: lines },
          meta: { usingTTMLLyric: false },
        };
      }
      // TTML 直接返回
      if (format === "ttml") {
        const sorted = cleanTTMLTranslations(lyric);
        const ttml = parseTTML(sorted);
        const lines = ttml?.lines || [];
        return {
          data: { lrcData: [], yrcData: lines },
          meta: { usingTTMLLyric: true },
        };
      }
      // 解析本地歌词
      const { format: lrcFormat, lines: parsedLines } = parseSmartLrc(lyric);
      // 如果是逐字格式，直接作为 yrcData
      if (isWordLevelFormat(lrcFormat)) {
        return {
          data: { lrcData: [], yrcData: parsedLines },
          meta: { usingTTMLLyric: false },
        };
      }
      // 普通格式
      const aligned: SongLyric = { lrcData: alignLyricLines(parsedLines), yrcData: [] };
      return {
        data: aligned,
        meta: { usingTTMLLyric: false },
      };
    } catch {
      return defaultResult;
    }
  }

  /**
   * 检测本地歌词覆盖
   * @param id 歌曲 ID
   * @returns 歌词数据和元数据
   */
  private async fetchLocalOverrideLyric(id: number): Promise<LyricFetchResult> {
    const settingStore = useSettingStore();
    const { localLyricPath } = settingStore;
    const defaultResult: LyricFetchResult = {
      data: { lrcData: [], yrcData: [] },
      meta: { usingTTMLLyric: false },
    };

    if (!isElectron || !localLyricPath.length) return defaultResult;

    // 从本地遍历
    try {
      const lyricDirs = Array.isArray(localLyricPath) ? localLyricPath.map((p) => String(p)) : [];
      // 读取本地歌词
      const { lrc, ttml } = await window.electron.ipcRenderer.invoke(
        "read-local-lyric",
        lyricDirs,
        id,
      );

      // 安全解析 LRC
      let lrcLines: LyricLine[] = [];
      let lrcIsWordLevel = false;
      try {
        const lrcContent = typeof lrc === "string" ? lrc : "";
        if (lrcContent) {
          const { format: lrcFormat, lines } = parseSmartLrc(lrcContent);
          lrcIsWordLevel = isWordLevelFormat(lrcFormat);
          lrcLines = lines;
          console.log("检测到本地歌词覆盖", lrcFormat, lrcLines);
        }
      } catch (err) {
        console.error("parseLrc 本地解析失败:", err);
        lrcLines = [];
      }

      // 安全解析 TTML
      let ttmlLines: LyricLine[] = [];
      try {
        const ttmlContent = typeof ttml === "string" ? ttml : "";
        if (ttmlContent) {
          const cleaned = cleanTTMLTranslations(ttmlContent);
          const raw = parseTTML(cleaned).lines || [];
          ttmlLines = raw;
          console.log("检测到本地TTML歌词覆盖", ttmlLines);
        }
      } catch (err) {
        console.error("parseTTML 本地解析失败:", err);
        ttmlLines = [];
      }

      if (lrcIsWordLevel && lrcLines.length > 0) {
        return {
          data: { lrcData: [], yrcData: lrcLines },
          meta: { usingTTMLLyric: false },
        };
      }

      return {
        data: { lrcData: lrcLines, yrcData: ttmlLines },
        meta: { usingTTMLLyric: ttmlLines.length > 0 },
      };
    } catch (error) {
      console.error("读取本地歌词失败:", error);
      return defaultResult;
    }
  }

  /**
   * 处理歌词排除
   * @param lyricData 歌词数据
   * @param targetSong 目标歌曲
   * @param usingTTMLLyric 是否使用 TTML 歌词
   * @returns 处理后的歌词数据
   */
  private handleLyricExclude(
    lyricData: SongLyric,
    targetSong?: SongType,
    usingTTMLLyric?: boolean,
  ): SongLyric {
    const settingStore = useSettingStore();
    const musicStore = useMusicStore();

    const { enableExcludeLyrics, excludeLyricsUserKeywords, excludeLyricsUserRegexes } =
      settingStore;

    if (!enableExcludeLyrics) return lyricData;

    // 合并默认规则和用户自定义规则
    const mergedKeywords = [...new Set([...defaultKeywords, ...(excludeLyricsUserKeywords ?? [])])];
    const mergedRegexes = [...new Set([...defaultRegexes, ...(excludeLyricsUserRegexes ?? [])])];

    const song = targetSong || musicStore.playSong;
    const { name, artists } = song;

    const artistNames: string[] = [];
    if (artists) {
      if (typeof artists === "string") {
        if (artists !== "未知歌手") {
          artistNames.push(artists);
        }
      } else if (Array.isArray(artists)) {
        artists.forEach((artist) => {
          if (artist.name) {
            artistNames.push(artist.name);
          }
        });
      }
    }

    const options = {
      keywords: mergedKeywords,
      regexPatterns: mergedRegexes,
      matchMetadata: {
        title: name !== "未播放歌曲" ? name : undefined,
        artists: artistNames,
      },
    };

    const lrcData = stripLyricMetadata(lyricData.lrcData || [], options);
    let yrcData = lyricData.yrcData || [];

    // usingTTMLLyric 未传入时从 lyricData 推断（预加载场景）
    const isTTML = usingTTMLLyric ?? false;
    if (!isTTML || settingStore.enableExcludeLyricsTTML) {
      yrcData = stripLyricMetadata(yrcData, options);
    }

    return {
      lrcData,
      yrcData,
    };
  }

  /**
   * 简繁转换歌词
   * @param lyricData 歌词数据
   * @returns 转换后的歌词数据
   */
  private async applyChineseVariant(lyricData: SongLyric): Promise<SongLyric> {
    const settingStore = useSettingStore();
    if (!settingStore.preferTraditionalChinese) {
      return lyricData;
    }

    try {
      const mode = settingStore.traditionalChineseVariant;
      const convert = await getConverter(mode);

      // 深拷贝以避免副作用
      const newLyricData = cloneDeep(lyricData);

      const convertLines = (lines: LyricLine[] | undefined) => {
        if (!lines) return;
        lines.forEach((line) => {
          line.words.forEach((word) => {
            if (word.word) word.word = convert(word.word);
          });
          if (line.translatedLyric) {
            line.translatedLyric = convert(line.translatedLyric);
          }
        });
      };

      // LRC
      convertLines(newLyricData.lrcData);

      // YRC / QRC / TTML
      convertLines(newLyricData.yrcData);

      return newLyricData;
    } catch (e) {
      console.error("简繁转换失败:", e);
      return lyricData;
    }
  }

  /**
   * 比较歌词数据是否相同
   * @param oldData 旧歌词数据
   * @param newData 新歌词数据
   * @returns 是否相同
   */
  private isLyricDataEqual(oldData: SongLyric, newData: SongLyric): boolean {
    // 比较数组长度
    if (
      oldData.lrcData?.length !== newData.lrcData?.length ||
      oldData.yrcData?.length !== newData.yrcData?.length
    ) {
      return false;
    }
    // 比较 lrcData 内容（比较每行的 startTime 和文本内容）
    const compareLines = (oldLines: LyricLine[], newLines: LyricLine[]): boolean => {
      if (oldLines.length !== newLines.length) return false;
      for (let i = 0; i < oldLines.length; i++) {
        const oldLine = oldLines[i];
        const newLine = newLines[i];
        const oldText = oldLine.words?.map((w) => w.word).join("") || "";
        const newText = newLine.words?.map((w) => w.word).join("") || "";
        if (oldLine.startTime !== newLine.startTime || oldText !== newText) {
          return false;
        }
        // ttml 特有属性
        if (newLine.isBG !== oldLine.isBG) return false;
      }
      return true;
    };
    return (
      compareLines(oldData.lrcData || [], newData.lrcData || []) &&
      compareLines(oldData.yrcData || [], newData.yrcData || [])
    );
  }

  /**
   * 规范化歌词行时间
   * @param lines 歌词行
   */
  private normalizeLyricLines(lines: LyricLine[]) {
    lines.forEach((line) => {
      // 修复 startTime / endTime 为 0 或 invalid 的情况
      if ((!line.startTime || line.startTime <= 0) && line.words?.length) {
        line.startTime = line.words[0].startTime;
      }
      if ((!line.endTime || line.endTime <= 0) && line.words?.length) {
        line.endTime = line.words[line.words.length - 1].endTime;
      }
    });
  }

  /**
   * 设置最终歌词
   * @param lyricData 歌词数据
   * @param req 当前歌词请求
   */
  private setFinalLyric(lyricData: SongLyric, req: number) {
    const musicStore = useMusicStore();
    const statusStore = useStatusStore();
    const settingStore = useSettingStore();
    // 若非本次
    if (this.activeLyricReq !== req) return;
    // 应用括号替换
    lyricData = applyBracketReplacement(lyricData);
    lyricData = applyProfanityUncensor(lyricData, settingStore.uncensorMaskedProfanity);
    // 规范化时间
    this.normalizeLyricLines(lyricData.yrcData);
    this.normalizeLyricLines(lyricData.lrcData);
    // 如果只有逐字歌词
    if (lyricData.lrcData.length === 0 && lyricData.yrcData.length > 0) {
      // 构成普通歌词
      lyricData.lrcData = lyricData.yrcData.map((line) => ({
        ...line,
        words: [
          {
            word: line.words?.map((w) => w.word)?.join("") || "",
            startTime: line.startTime || 0,
            endTime: line.endTime || 0,
            romanWord: line.words?.map((w) => w.romanWord)?.join("") || undefined,
          },
        ],
      }));
    }
    // 比较新旧歌词数据，如果相同则跳过设置，避免重复重载
    if (this.isLyricDataEqual(musicStore.songLyric, lyricData)) {
      // 仅更新加载状态，不更新歌词数据
      statusStore.lyricLoading = false;
      // 单曲循环时，歌词数据未变，需通知桌面歌词取消加载状态
      if (isElectron) {
        window.electron.ipcRenderer.send("desktop-lyric:update-data", {
          lyricLoading: false,
        });
      }
      return;
    }
    // 设置歌词
    musicStore.setSongLyric(lyricData, true);
    // 结束加载状态
    statusStore.lyricLoading = false;
  }

  /**
   * 处理歌词
   * @param song 歌曲对象
   */
  public async handleLyric(song: SongType) {
    // 标记当前歌词请求
    const req = ++this.lyricReqSeq;
    this.activeLyricReq = req;

    // 清除不匹配的预加载
    if (this.prefetchedLyric && this.prefetchedLyric.id !== song.id) {
      this.prefetchedLyric = null;
    }

    // 检查预加载缓存
    if (this.prefetchedLyric && this.prefetchedLyric.id === song.id) {
      console.log(`🚀 [${song.id}] 使用预加载歌词`);
      const { data } = this.prefetchedLyric.result;
      this.prefetchedLyric = null; // 消费后清除

      // 应用到 Store
      this.setFinalLyric(data, req);
      return;
    }

    try {
      const { data } = await this.fetchLyric(song);

      // 再次确认请求是否仍然有效
      if (this.activeLyricReq !== req) return;

      this.setFinalLyric(data, req);
    } catch (error) {
      console.error("❌ 处理歌词失败:", error);
      this.resetSongLyric();
    }
  }

  /**
   * 获取歌词（仅本地来源：旁车文件 / 内嵌标签）
   * @param song 歌曲对象
   * @returns 歌词结果和元数据
   */
  public async fetchLyric(song: SongType): Promise<LyricFetchResult> {
    const settingStore = useSettingStore();
    let fetchResult: LyricFetchResult = {
      data: { lrcData: [], yrcData: [] },
      meta: { usingTTMLLyric: false },
    };

    try {
      const isLocal = Boolean(song.path) || false;
      // 检查本地覆盖
      const overrideResult = await this.fetchLocalOverrideLyric(song.id);
      if (!isEmpty(overrideResult.data.lrcData) || !isEmpty(overrideResult.data.yrcData)) {
        // 对齐
        overrideResult.data.lrcData = alignLyricLines(overrideResult.data.lrcData);
        fetchResult = overrideResult;
      } else if (song.path) {
        // 本地文件（内嵌歌词）
        fetchResult = await this.fetchLocalLyric(song);
      }
      // 后处理：元数据排除
      if (isLocal ? settingStore.enableExcludeLyricsLocal : true) {
        fetchResult.data = this.handleLyricExclude(
          fetchResult.data,
          song,
          fetchResult.meta.usingTTMLLyric,
        );
      }
      // 后处理：简繁转换
      fetchResult.data = await this.applyChineseVariant(fetchResult.data);

      return fetchResult;
    } catch (error) {
      console.error("❌ 获取歌词失败:", error);
      return fetchResult;
    }
  }

  /**
   * 预加载下一首歌曲歌词
   * @param song 歌曲对象
   */
  public async prefetchLyric(song: SongType) {
    if (!song) return;
    try {
      console.log(`Lyrics prefetching started: [${song.id}] ${song.name}`);
      const result = await this.fetchLyric(song);
      // 存储预加载结果
      this.prefetchedLyric = {
        id: song.id,
        result,
      };
      console.log(`Lyrics prefetch completed: [${song.id}]`);
    } catch (e) {
      console.warn(`Lyrics prefetch failed: [${song.id}]`, e);
    }
  }

  /**
   * 获取原始 TTML 文本（如果存在）
   * @param id 歌曲 ID
   */
  public async getRawTtml(id: number | string): Promise<string | null> {
    if (typeof id !== "number") return null;
    const ttml = await this.getRawLyricCache(id);
    if (ttml) return cleanTTMLTranslations(ttml);
    return null;
  }

  /**
   * 为任务栏歌词处理 TTML（注入 BG）
   * @param lines 原始解析后的歌词行
   * @param ttml 原始 TTML 文本
   */
  public processTtmlForTaskbar(lines: LyricLine[], ttml: string): LyricLine[] {
    return attachTtmlBgLines(ttml, cloneDeep(lines));
  }
}

let instance: LyricManager | null = null;

/**
 * 获取 LyricManager 实例
 * @returns LyricManager
 */
export const useLyricManager = (): LyricManager => {
  if (!instance) instance = new LyricManager();
  return instance;
};
