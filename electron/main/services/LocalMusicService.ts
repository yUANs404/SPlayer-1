import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { nativeImage } from "electron";
import { parseFile } from "music-metadata";
import pLimit from "p-limit";
import { LocalMusicDB, type MusicTrack } from "../database/LocalMusicDB";
import { processLog } from "../logger";
import { useStore } from "../store";
import { loadNativeModule } from "../utils/native-loader";

type toolModule = typeof import("@native/tools");
const tools: toolModule | null = loadNativeModule("tools.node", "tools");

/** 扫描事件（与原生模块的 ScanEvent 结构对齐，tracks 使用数据库类型） */
interface LocalScanEvent {
  event: string;
  tracks?: MusicTrack[];
  progress?: { current: number; total: number };
  deletedPaths?: string[];
}

/** 支持的音频扩展名（与 native/tools 保持一致） */
const SUPPORTED_EXTENSIONS = new Set([
  "mp3", "flac", "wav", "aac", "m4a", "ogg", "opus", "wma", "ape", "wv", "alac", "aiff", "aif",
  "dsf", "dff", "mpc", "tak", "tta", "ac3", "dts", "thd", "truehd", "mka", "mkv", "mp4", "m4v",
  "mov", "webm", "asf", "amr", "au", "ra", "rm", "3gp",
]);

/** 批量上报大小 */
const BATCH_SIZE = 50;

/** 将路径分隔符统一为 / （与原生模块一致） */
const normalizePath = (p: string): string => p.replace(/\\/g, "/");

/** 以规范化路径的 MD5 作为文件 ID（与原生模块一致） */
const getFileId = (p: string): string => createHash("md5").update(p).digest("hex");

/** 本地音乐服务 */
export class LocalMusicService {
  /** 数据库实例 */
  private db: LocalMusicDB | null = null;
  /** 运行锁：防止并发扫描 */
  private isRefreshing = false;
  /** 初始化 Promise：确保只初始化一次 */
  private initPromise: Promise<void> | null = null;
  /** 记录最后一次使用的 DB 路径 */
  private lastDbPath: string = "";

  /** 获取动态路径 */
  get paths() {
    const store = useStore();
    const localCachePath = join(store.get("cachePath"), "local-data");
    return {
      dbPath: join(localCachePath, "library.db"),
      jsonPath: join(localCachePath, "library.json"),
      coverDir: join(localCachePath, "covers"),
      cacheDir: localCachePath,
    };
  }

  /** 初始化 */
  private async ensureInitialized(): Promise<void> {
    const { dbPath, jsonPath, coverDir } = this.paths;
    // 如果路径变了，强制重新初始化
    if (this.lastDbPath && this.lastDbPath !== dbPath) {
      this.initPromise = null;
      if (this.db) {
        this.db.close();
        this.db = null;
      }
    }
    this.lastDbPath = dbPath;
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      if (!existsSync(coverDir)) {
        await mkdir(coverDir, { recursive: true });
      }
      if (!this.db) {
        this.db = new LocalMusicDB(dbPath);
        this.db.init();
      }
      await this.db.migrateFromJsonIfNeeded(jsonPath);
    })();
    return this.initPromise;
  }

  /**
   * 内部扫描方法
   * 优先使用原生模块（Rust，速度快），未加载时回退到 JS 实现
   * @param dirPaths 文件夹路径数组
   * @param ignoreDelete 是否忽略删除操作（默认为 false）
   * @param onProgress 进度回调
   * @param onTracksBatch 批量track回调
   */
  private async _scan(
    dirPaths: string[],
    ignoreDelete: boolean = false,
    onProgress?: (current: number, total: number) => void,
    onTracksBatch?: (tracks: MusicTrack[]) => void,
  ) {
    const { dbPath, coverDir } = this.paths;
    // 运行锁
    if (this.isRefreshing) {
      throw new Error("SCAN_IN_PROGRESS");
    }
    // 确保初始化完成
    await this.ensureInitialized();
    if (!this.db) throw new Error("DB not initialized");
    if (!dirPaths || dirPaths.length === 0) {
      if (!ignoreDelete) {
        this.db.clearTracks();
      }
      return;
    }
    this.isRefreshing = true;
    try {
      // 统一的扫描事件处理
      const handleEvent = (event: LocalScanEvent) => {
        if (!event) return;
        switch (event.event) {
          // 进度更新
          case "progress":
            if (event.progress) {
              onProgress?.(event.progress.current, event.progress.total);
            }
            break;
          // 批量数据
          case "batch":
            if (event.tracks && event.tracks.length > 0) {
              this.db?.addTracks(event.tracks);
              onTracksBatch?.(event.tracks);
            }
            break;
          // 扫描结束
          case "end":
            if (!ignoreDelete && event.deletedPaths && event.deletedPaths.length > 0) {
              this.db?.deleteTracks(event.deletedPaths);
            }
            break;
        }
      };

      if (tools?.scanMusicLibrary) {
        console.time("RustScanStream");
        await new Promise<void>((resolve, reject) => {
          tools!
            .scanMusicLibrary(dbPath, dirPaths, coverDir, (err, event) => {
              if (err) {
                processLog.error("[LocalMusicService] 原生模块扫描时出错:", err);
                return;
              }
              try {
                handleEvent(event);
                if (event?.event === "end") resolve();
              } catch (e) {
                processLog.error("[LocalMusicService] 扫描时出错:", e);
              }
            })
            .catch((err) => {
              reject(err);
            });
        });
        console.timeEnd("RustScanStream");
      } else {
        console.time("JsScanStream");
        processLog.info("[LocalMusicService] 未加载原生扫描模块，使用 JS 回退扫描");
        await this.scanWithNodeJs(dirPaths, coverDir, handleEvent);
        console.timeEnd("JsScanStream");
      }
    } catch (err) {
      processLog.error("[LocalMusicService]: 扫描失败", err);
      throw err;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * JS 回退扫描：行为对齐 native/tools 的 scanMusicLibrary
   * @param dirPaths 文件夹路径数组
   * @param coverDir 封面输出目录
   * @param emit 扫描事件回调
   */
  private async scanWithNodeJs(
    dirPaths: string[],
    coverDir: string,
    emit: (event: LocalScanEvent) => void,
  ): Promise<void> {
    if (!this.db) return;
    // 递归收集音频文件（跳过隐藏文件/目录）
    const collectFiles = async (dir: string): Promise<string[]> => {
      const out: string[] = [];
      const walk = async (d: string): Promise<void> => {
        let entries;
        try {
          entries = await readdir(d, { withFileTypes: true });
        } catch {
          return;
        }
        for (const entry of entries) {
          // 跳过隐藏文件/目录
          if (entry.name.startsWith(".")) continue;
          const full = join(d, entry.name);
          if (entry.isDirectory()) {
            await walk(full);
          } else if (entry.isFile()) {
            const ext = entry.name.split(".").pop()?.toLowerCase();
            if (ext && SUPPORTED_EXTENSIONS.has(ext)) out.push(full);
          }
        }
      };
      await walk(dir);
      return out;
    };

    const filePaths = (await Promise.all(dirPaths.map(collectFiles))).flat();
    const scannedPaths = new Set(filePaths.map(normalizePath));
    const total = filePaths.length;
    emit({ event: "progress", progress: { current: 0, total } });

    // 已有库快照：用于增量跳过与删除检测
    const snapshot = new Map(this.db.getAllTracks().map((t) => [t.path, t]));
    if (!existsSync(coverDir)) {
      await mkdir(coverDir, { recursive: true });
    }

    let processed = 0;
    let batch: MusicTrack[] = [];
    const flushBatch = () => {
      if (batch.length > 0) {
        emit({ event: "batch", tracks: batch });
        batch = [];
      }
    };

    /** 解析单个文件，返回曲目信息或 null（跳过） */
    const buildTrack = async (file: string): Promise<MusicTrack | null> => {
      const normalized = normalizePath(file);
      const info = await stat(file);
      // 过小文件跳过
      if (info.size < 1024) return null;
      const mtime = info.mtimeMs;
      // 未变化的文件跳过（除非封面文件丢失）
      const cached = snapshot.get(normalized);
      if (cached && Math.abs(cached.mtime - mtime) < 1 && cached.size === info.size) {
        const coverMissing = cached.cover && !existsSync(join(coverDir, cached.cover));
        if (!coverMissing) return null;
      }
      const meta = await parseFile(file);
      const tag = meta.common;
      const duration = Math.round((meta.format.duration ?? 0) * 1000);
      const title = tag.title;
      // 无标题的短音频（<30秒）视为非音乐文件跳过
      if (!title && duration < 30000) return null;
      // 提取并压缩封面为 256px JPEG
      let cover: string | undefined;
      const picture = tag.picture?.[0];
      if (picture) {
        const id = getFileId(normalized);
        const fileName = `${id}.jpg`;
        const savePath = join(coverDir, fileName);
        if (existsSync(savePath)) {
          cover = fileName;
        } else {
          const img = nativeImage.createFromBuffer(Buffer.from(picture.data));
          if (!img.isEmpty()) {
            await writeFile(savePath, img.resize({ width: 256 }).toJPEG(90));
            cover = fileName;
          }
        }
      }
      return {
        id: getFileId(normalized),
        path: normalized,
        title: title || "未知歌曲",
        artist: tag.artist || "未知艺术家",
        album: tag.album || "未知专辑",
        duration,
        cover,
        mtime,
        size: Number(info.size),
        bitrate: meta.format.bitrate ?? 0,
        track_number: tag.track?.no ?? undefined,
      };
    };

    const processOne = async (file: string): Promise<void> => {
      try {
        const track = await buildTrack(file);
        if (track) {
          batch.push(track);
          if (batch.length >= BATCH_SIZE) flushBatch();
        }
      } catch {
        // 解析失败的文件直接跳过
      }
      processed++;
      if (processed % 50 === 0 || processed === total) {
        emit({ event: "progress", progress: { current: processed, total } });
      }
    };

    const limit = pLimit(8);
    await Promise.all(filePaths.map((file) => limit(() => processOne(file))));
    flushBatch();

    // 快照中存在但磁盘上已不存在的路径视为已删除
    const deletedPaths = [...snapshot.keys()].filter((p) => !scannedPaths.has(p));
    emit({ event: "end", deletedPaths });
  }

  /**
   * 刷新所有库文件夹
   * @param dirPaths 文件夹路径数组
   * @param onProgress 进度回调
   * @param onTracksBatch 批量track回调
   */
  async refreshLibrary(
    dirPaths: string[],
    onProgress?: (current: number, total: number) => void,
    onTracksBatch?: (tracks: MusicTrack[]) => void,
  ) {
    await this._scan(dirPaths, false, onProgress, onTracksBatch);
    return this.db?.getAllTracks() || [];
  }

  /**
   * 扫描指定目录
   * @param dirPath 目录路径
   */
  async scanDirectory(dirPath: string): Promise<MusicTrack[]> {
    await this._scan([dirPath], true);
    return this.db?.getTracksInPath(dirPath) || [];
  }

  /** 获取所有歌曲 */
  async getAllTracks(): Promise<MusicTrack[]> {
    await this.ensureInitialized();
    if (!this.db) return [];
    return this.db.getAllTracks();
  }

  /** 获取音频分析结果 */
  async getAnalysis(path: string) {
    await this.ensureInitialized();
    return this.db?.getAnalysis(path);
  }

  /** 保存音频分析结果 */
  async saveAnalysis(path: string, data: string, mtime: number, size: number) {
    await this.ensureInitialized();
    this.db?.saveAnalysis(path, data, mtime, size);
  }
}
