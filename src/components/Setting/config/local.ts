import { useSettingStore } from "@/stores";
import { useCacheManager } from "@/core/resource/CacheManager";
import { formatFileSize } from "@/utils/helper";
import { SettingConfig } from "@/types/settings";
import { openLocalMusicDirectoryModal } from "@/utils/modal";
import LocalLyricDirectories from "../components/LocalLyricDirectories.vue";
import CacheSizeLimit from "../components/CacheSizeLimit.vue";

export const useLocalSettings = (): SettingConfig => {
  const settingStore = useSettingStore();
  const cacheManager = useCacheManager();

  // --- 缓存逻辑 ---
  const cacheSizeDisplay = ref<string>("--");
  const cachePath = ref<string>("");

  // 统计全部缓存目录占用大小
  const loadCacheSize = async () => {
    const res = await cacheManager.getSize();
    if (res.success && res.data !== undefined) {
      cacheSizeDisplay.value = formatFileSize(res.data);
    } else {
      cacheSizeDisplay.value = "--";
    }
  };

  // 获取缓存目录
  const loadCachePath = async () => {
    try {
      const path = await window.api.store.get("cachePath");
      cachePath.value = path || "";
    } catch (error) {
      console.error("读取缓存路径失败:", error);
    }
  };

  // 初始加载
  const onActivate = () => {
    loadCacheSize();
    loadCachePath();
  };

  // 更改缓存目录
  const changeCachePath = async () => {
    const path = await window.electron.ipcRenderer.invoke("choose-path");
    if (path) {
      cachePath.value = path;
      await window.api.store.set("cachePath", path);
    }
  };

  // 确认更改缓存目录
  const confirmChangeCachePath = () => {
    window.$dialog.warning({
      title: "更改缓存目录",
      content: "更改缓存目录不会自动移动已有缓存文件，建议在清空缓存后再更改目录。确定要继续吗？",
      positiveText: "确定更改",
      negativeText: "取消",
      onPositiveClick: () => {
        return changeCachePath();
      },
    });
  };

  // 清空所有缓存目录
  const clearCache = async () => {
    const res = await cacheManager.clearAll();
    await loadCacheSize();
    if (!res.success) {
      window.$message.error("缓存清理失败: " + (res.message || "未知错误"));
    } else {
      window.$message.success("缓存已清空");
    }
  };

  // 确认清空缓存
  const confirmClearCache = () => {
    window.$dialog.warning({
      title: "清空缓存",
      content: "将删除所有缓存的音乐、歌词和本地数据，此操作不可恢复，确定要继续吗？",
      positiveText: "清空缓存",
      negativeText: "取消",
      onPositiveClick: () => {
        return clearCache();
      },
    });
  };

  return {
    onActivate,
    groups: [
      {
        title: "本地歌曲",
        items: [
          {
            key: "showLocalCover",
            label: "显示本地歌曲封面",
            type: "switch",
            description: "当数量过多时请勿开启，会严重影响性能",
            value: computed({
              get: () => settingStore.showLocalCover,
              set: (v) => (settingStore.showLocalCover = v),
            }),
          },
          {
            key: "localFolderDisplayMode",
            label: "本地文件夹显示模式",
            type: "select",
            description: "选择本地音乐页面文件夹的显示方式",
            options: [
              { label: "标签页模式", value: "tab" },
              { label: "下拉筛选模式", value: "dropdown" },
            ],
            value: computed({
              get: () => settingStore.localFolderDisplayMode,
              set: (v) => (settingStore.localFolderDisplayMode = v),
            }),
          },
          {
            key: "showDefaultLocalPath",
            label: "显示本地默认歌曲目录",
            type: "switch",
            value: computed({
              get: () => settingStore.showDefaultLocalPath,
              set: (v) => (settingStore.showDefaultLocalPath = v),
            }),
          },
          {
            key: "localFilesPath",
            label: "本地歌曲目录",
            type: "button",
            buttonLabel: "管理目录",
            description: "可在此增删本地歌曲目录，歌曲增删实时同步",
            action: openLocalMusicDirectoryModal,
          },
          {
            key: "localLyricPath",
            label: "本地歌词覆盖在线歌词",
            type: "custom",
            noWrapper: true,
            component: markRaw(LocalLyricDirectories),
          },
        ],
      },
      {
        title: "缓存配置",
        items: [
          {
            key: "cacheEnabled",
            label: "启用缓存",
            type: "switch",
            description: "开启缓存会加快资源加载速度，但会占用更多磁盘空间",
            value: computed({
              get: () => settingStore.cacheEnabled,
              set: (v) => (settingStore.cacheEnabled = v),
            }),
          },
          {
            key: "songCacheEnabled",
            label: "缓存歌曲",
            type: "switch",
            description: "是否缓存歌曲音频，关闭后可节省缓存空间",
            value: computed({
              get: () => settingStore.songCacheEnabled,
              set: (v) => (settingStore.songCacheEnabled = v),
            }),
            condition: () => settingStore.cacheEnabled,
          },
          {
            key: "cacheLimit",
            label: "缓存大小上限",
            type: "custom",
            description: "达到上限后将清理最旧的缓存，可以是小数，最低 2GB",
            component: markRaw(CacheSizeLimit),
            condition: () => settingStore.cacheEnabled,
            noWrapper: true,
          },
          {
            key: "cachePath",
            label: "缓存目录",
            type: "button",
            description: computed(() => cachePath.value || "未配置时将使用默认缓存目录"),
            buttonLabel: "更改",
            action: confirmChangeCachePath,
            condition: () => settingStore.cacheEnabled,
          },
          {
            key: "clearCache",
            label: "缓存占用与清理",
            type: "button",
            description: () => `当前缓存占用：${cacheSizeDisplay.value}`,
            buttonLabel: "清空缓存",
            action: confirmClearCache,
            componentProps: { type: "error" },
          },
        ],
      },
    ],
  };
};
