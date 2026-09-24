import { toRaw } from "vue";
import { defineStore } from "pinia";
import type { SongType } from "@/types/main";
import { cloneDeep } from "lodash-es";
import localforage from "localforage";

interface ListState {
  playList: SongType[];
  originalPlayList: SongType[];
  historyList: SongType[];
}

// musicDB
const musicDB = localforage.createInstance({
  name: "music-data",
  description: "List data of the application",
  storeName: "music",
});

// backgroundDB
const backgroundDB = localforage.createInstance({
  name: "background-data",
  description: "Background image data",
  storeName: "background",
});

export const useDataStore = defineStore("data", {
  state: (): ListState => ({
    // 播放列表
    playList: [],
    // 原始播放列表
    originalPlayList: [],
    // 播放历史
    historyList: [],
  }),
  actions: {
    /**
     * 加载数据
     */
    async loadData() {
      try {
        // 获取 music-data
        const musicDataKeys = (await musicDB.keys()) as string[];
        await Promise.all(
          musicDataKeys.map(async (key) => {
            const data = await musicDB.getItem(key);
            if (key === "playList") {
              this.playList = data ? markRaw(data as SongType[]) : [];
            } else if (key === "originalPlayList") {
              this.originalPlayList = data ? markRaw(data as SongType[]) : [];
            } else if (key === "historyList") {
              this.historyList = data ? markRaw(data as SongType[]) : [];
            }
          }),
        );
      } catch (error) {
        console.error("Error loading data from localforage:", error);
      }
    },
    /**
     * 更新播放列表
     * @param data 播放列表
     * @returns 插入的歌曲索引
     */
    async setPlayList(data: SongType | SongType[]): Promise<number> {
      try {
        let newList: SongType[] = [];
        let index = 0;
        // 若为列表
        if (Array.isArray(data)) {
          newList = data;
          index = 0;
        }
        // 若为单曲
        else {
          const currentList = toRaw(this.playList);
          // 歌曲去重
          newList = currentList.filter((s) => s.id !== data.id);
          // 添加到歌单末尾
          newList.push(data);
          // 获取索引
          index = newList.length - 1;
        }
        this.playList = markRaw(newList);
        await musicDB.setItem("playList", cloneDeep(toRaw(newList)));
        return index;
      } catch (error) {
        console.error("Error updating playlist:", error);
        throw error;
      }
    },
    /**
     * 设置原始播放列表
     * @param data 原始播放列表
     */
    async setOriginalPlayList(data: SongType[]): Promise<void> {
      this.originalPlayList = markRaw(data);
      await musicDB.setItem("originalPlayList", cloneDeep(toRaw(data)));
    },
    /**
     * 获取原始播放列表
     * @returns 原始播放列表
     */
    async getOriginalPlayList(): Promise<SongType[] | null> {
      // 检查内存中是否有数据
      if (Array.isArray(this.originalPlayList) && this.originalPlayList.length > 0) {
        return this.originalPlayList;
      }
      // 从 DB 获取
      const data = (await musicDB.getItem("originalPlayList")) as SongType[] | null;
      if (Array.isArray(data) && data.length > 0) {
        this.originalPlayList = markRaw(data);
        return data;
      }
      return null;
    },
    /**
     * 清除原始播放列表
     */
    async clearOriginalPlayList(): Promise<void> {
      this.originalPlayList = [];
      await musicDB.setItem("originalPlayList", []);
    },
    /**
     * 设置下一首播放歌曲
     * @param song 歌曲
     * @param index 插入位置
     * @returns 插入的歌曲索引
     */
    async setNextPlaySong(song: SongType, index: number): Promise<number> {
      // 若为空,则直接添加
      if (this.playList.length === 0) {
        this.playList = [song];
        await musicDB.setItem("playList", cloneDeep(this.playList));
        return 0;
      }
      // 避免直接修改 state
      const newList = [...this.playList];
      // 在当前播放位置之后插入歌曲
      const indexAdd = index + 1;
      newList.splice(indexAdd, 0, song);
      // 移除重复的歌曲（如果存在）
      const finalList = newList.filter((item, idx) => idx === indexAdd || item.id !== song.id);
      // 更新本地存储
      this.playList = markRaw(finalList);
      await musicDB.setItem("playList", cloneDeep(finalList));
      // 返回刚刚插入的歌曲索引
      return finalList.indexOf(song);
    },
    /**
     * 设置播放历史
     * @param song 歌曲
     */
    async setHistory(song: SongType) {
      try {
        let historyList: SongType[] = (await musicDB.getItem("historyList")) || [];
        if (!Array.isArray(historyList)) historyList = [];
        // 过滤旧的同名歌曲，把新的放到第一位
        const updatedList = [song, ...historyList.filter((item) => item.id !== song.id)];
        // 最多 500 首
        if (updatedList.length > 500) updatedList.splice(500);
        // 存储
        await musicDB.setItem("historyList", cloneDeep(toRaw(updatedList)));
        this.historyList = markRaw(updatedList);
      } catch (error) {
        console.error("Error updating history:", error);
        throw error;
      }
    },
    /**
     * 清除播放历史
     */
    async clearHistory(): Promise<void> {
      try {
        await musicDB.setItem("historyList", []);
        this.historyList = [];
      } catch (error) {
        console.error("Error clearing history:", error);
        throw error;
      }
    },
    /**
     * 删除数据库
     * @param name 数据库名称
     */
    async deleteDB(name?: string): Promise<void> {
      try {
        if (name) {
          await localforage.dropInstance({ name });
          console.log(`Dropped ${name} database`);
          return;
        }
        await musicDB.clear();
        console.log("All databases cleared");
      } catch (error) {
        console.error("Error deleting database:", error);
        throw error;
      }
    },
    /**
     * 保存背景图
     * @param blob 图片 Blob 数据
     */
    async saveBackgroundImage(blob: Blob): Promise<void> {
      try {
        await backgroundDB.setItem("image", blob);
      } catch (error) {
        console.error("Error saving background image:", error);
        throw error;
      }
    },
    /**
     * 获取背景图
     * @returns Blob 数据
     */
    async getBackgroundImage(): Promise<Blob | null> {
      try {
        const data = await backgroundDB.getItem<Blob>("image");
        return data || null;
      } catch (error) {
        console.error("Error getting background image:", error);
        return null;
      }
    },
    /**
     * 清除背景图
     */
    async clearBackgroundImage(): Promise<void> {
      try {
        await backgroundDB.removeItem("image");
      } catch (error) {
        console.error("Error clearing background image:", error);
        throw error;
      }
    },
  },
});
