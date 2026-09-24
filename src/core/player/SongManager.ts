import type { QualityType, SongType, AudioSourceType } from "@/types/main";
import { useLyricManager } from "@/core/player/LyricManager";
import { useDataStore, useSettingStore, useStatusStore } from "@/stores";
import { isElectron } from "@/utils/env";
import { toFileUrl } from "@/utils/fileUrl";

/** 歌曲播放地址信息 */
export type AudioSource = {
  /** 歌曲id */
  id: number;
  /** 歌曲播放地址 */
  url?: string;
  /** 音质 */
  quality?: QualityType;
  /** 音源 */
  source?: AudioSourceType;
};

/**
 * 歌曲管理器
 * 负责本地歌曲的源解析、预加载等操作
 */
class SongManager {
  /** 预载下一首歌曲播放信息 */
  private nextPrefetch: AudioSource | undefined;

  public peekPrefetch(id: number): AudioSource | undefined {
    if (!this.nextPrefetch) return;
    if (this.nextPrefetch.id !== id) return;
    return this.nextPrefetch;
  }

  /**
   * 获取音频源
   * 始终从此方法获取对应歌曲播放信息
   * 仅支持本地文件（song.path），在线歌曲将被标记为不可播放
   * @param song 歌曲
   * @returns 音频源
   */
  public getAudioSource = async (song: SongType): Promise<AudioSource> => {
    // 本地文件直接返回
    if (song.path) {
      // 检查本地文件是否存在
      const result = await window.electron.ipcRenderer.invoke("file-exists", song.path);
      if (!result) {
        this.nextPrefetch = undefined;
        console.error("❌ 本地文件不存在");
        return { id: song.id, url: undefined, source: "local" };
      }
      const fileUrl = toFileUrl(song.path);
      return { id: song.id, url: fileUrl, source: "local" };
    }

    // 非本地歌曲（历史遗留的在线数据等）标记为不可播放
    console.warn(`⚠️ [${song.id}] 非本地歌曲，无法播放: ${song.name || ""}`);
    return { id: song.id, url: undefined, source: "local" };
  };

  /**
   * 预载下一首歌曲
   * 本地歌曲提前触发音频分析（Automix），无网络预载
   * @returns 预载数据
   */
  public prefetchNextSong = async (): Promise<AudioSource | undefined> => {
    try {
      const dataStore = useDataStore();
      const statusStore = useStatusStore();
      const settingStore = useSettingStore();
      const lyricManager = useLyricManager();
      // 无播放列表直接跳过
      const playList = dataStore.playList;
      if (!playList?.length) {
        return;
      }
      // 计算下一首（循环到首）
      let nextIndex = statusStore.playIndex + 1;
      if (nextIndex >= playList.length) nextIndex = 0;
      const nextSong = playList[nextIndex];
      if (!nextSong) return;
      // 仅处理本地歌曲
      if (!nextSong.path) return;
      // 预加载歌词
      lyricManager.prefetchLyric(nextSong);
      // 预分析音频 (Automix)
      if (isElectron && settingStore.enableAutomix) {
        window.electron.ipcRenderer.invoke("analyze-audio-head", nextSong.path).catch((e) => {
          console.warn("[Prefetch] Analysis failed:", e);
        });
      }
      return;
    } catch (error) {
      console.error("❌ 预加载下一首歌曲失败", error);
      return;
    }
  };

  /**
   * 清除预加载缓存
   */
  public clearPrefetch() {
    this.nextPrefetch = undefined;
  }
}

let instance: SongManager | null = null;

/**
 * 获取 SongManager 实例
 * @returns SongManager
 */
export const useSongManager = (): SongManager => {
  if (!instance) instance = new SongManager();
  return instance;
};
