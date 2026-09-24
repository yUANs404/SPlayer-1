import { useDataStore, useSettingStore } from "@/stores";
import { isElectron } from "@/utils/env";
import { SettingConfig } from "@/types/settings";
import { NAlert } from "naive-ui";

export const useGeneralSettings = (): SettingConfig => {
  const dataStore = useDataStore();
  const settingStore = useSettingStore();

  // 任务栏进度
  const closeTaskbarProgress = (val: boolean) => {
    if (!isElectron) return;
    if (!val) window.electron.ipcRenderer.send("set-bar", "none");
  };

  // --- Backup & Restore Logic (from other.ts) ---
  const exportSettings = async () => {
    try {
      const rendererData = {
        "setting-store": localStorage.getItem("setting-store"),
        "shortcut-store": localStorage.getItem("shortcut-store"),
        // "status-store": localStorage.getItem("status-store"),
        // "music-store": localStorage.getItem("music-store"),
      };
      const result = await window.api.store.export(rendererData);
      if (result && result.success) {
        window.$message.success(`设置导出成功: ${result.path}`);
      } else {
        const errorMsg = result?.error === "cancelled" ? "已取消导出" : "设置导出失败";
        if (result?.error !== "cancelled") {
          window.$message.error(errorMsg);
        }
      }
    } catch {
      window.$message.error("设置导出出错");
    }
  };

  const importSettings = async () => {
    window.$dialog.warning({
      title: "导入设置",
      content: () =>
        h("div", null, [
          h(
            NAlert,
            { type: "warning", showIcon: true, style: { marginBottom: "12px" } },
            {
              default: () =>
                "导入设置将覆盖当前所有配置（包括主题、快捷键、音效设置等）并重启软件。",
            },
          ),
          h("div", null, "是否继续？"),
        ]),
      positiveText: "确定",
      negativeText: "取消",
      onPositiveClick: async () => {
        try {
          const result = await window.api.store.import();
          if (result && result.success) {
            const data = result.data;
            let restoredCount = 0;
            if (data.renderer) {
              const storesToRestore = [
                "setting-store",
                "shortcut-store",
                // "status-store",
                // "music-store",
              ];

              storesToRestore.forEach((key) => {
                if (data.renderer[key]) {
                  localStorage.setItem(key, data.renderer[key]);
                  restoredCount++;
                }
              });
            }

            if (restoredCount > 0 || data.electron) {
              window.$message.success("设置导入成功，即将重启");
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            } else {
              window.$message.warning("未找到可恢复的设置数据");
            }
          } else {
            if (result?.error !== "cancelled") {
              window.$message.error("设置导入失败: " + (result?.error || "未知错误"));
            }
          }
        } catch (error) {
          window.$message.error("设置导入出错");
          console.error(error);
        }
      },
    });
  };

  // --- Reset Logic (from other.ts) ---
  const resetSetting = () => {
    window.$dialog.warning({
      title: "警告",
      content: "此操作将重置所有设置，是否继续?",
      positiveText: "确定",
      negativeText: "取消",
      onPositiveClick: () => {
        settingStore.$reset();
        if (isElectron) window.electron.ipcRenderer.send("reset-setting");
        window.$message.success("设置重置完成");
      },
    });
  };

  const clearAllData = () => {
    window.$dialog.warning({
      title: "高危操作",
      content: "此操作将重置所有设置并清除全部数据，同时将退出登录状态，是否继续?",
      positiveText: "确定",
      negativeText: "取消",
      onPositiveClick: async () => {
        window.localStorage.clear();
        window.sessionStorage.clear();
        await dataStore.deleteDB();
        if (isElectron) window.electron.ipcRenderer.send("reset-setting");
        window.$message.loading("数据清除完成，软件即将热重载", {
          duration: 3000,
          onAfterLeave: () => window.location.reload(),
        });
      },
    });
  };

  return {
    groups: [
      {
        title: "系统行为",
        show: isElectron,
        items: [
          {
            key: "closeAppMethod",
            label: "关闭软件时",
            type: "select",
            description: "选择关闭软件的方式",
            disabled: computed(() => settingStore.showCloseAppTip),
            options: [
              { label: "最小化到任务栏", value: "hide" },
              { label: "直接退出", value: "close" },
            ],
            value: computed({
              get: () => settingStore.closeAppMethod,
              set: (v) => (settingStore.closeAppMethod = v),
            }),
          },
          {
            key: "showCloseAppTip",
            label: "每次关闭前都进行提醒",
            type: "switch",
            value: computed({
              get: () => settingStore.showCloseAppTip,
              set: (v) => (settingStore.showCloseAppTip = v),
            }),
          },
          {
            key: "showTaskbarProgress",
            label: "任务栏显示播放进度",
            type: "switch",
            description: "是否在任务栏显示歌曲播放进度",
            value: computed({
              get: () => settingStore.showTaskbarProgress,
              set: (v) => {
                settingStore.showTaskbarProgress = v;
                closeTaskbarProgress(v);
              },
            }),
          },
          {
            key: "checkUpdateOnStart",
            label: "自动检查更新",
            type: "switch",
            description: "在每次开启软件时自动检查更新",
            value: computed({
              get: () => settingStore.checkUpdateOnStart,
              set: (v) => (settingStore.checkUpdateOnStart = v),
            }),
          },
        ],
      },
      {
        title: "备份与恢复",
        tags: [{ text: "Beta", type: "warning" }],
        show: isElectron,
        items: [
          {
            key: "exportSettings",
            label: "导出设置",
            type: "button",
            description: "将当前所有设置导出为 JSON 文件",
            buttonLabel: "导出设置",
            action: exportSettings,
            componentProps: { type: "primary" },
          },
          {
            key: "importSettings",
            label: "导入设置",
            type: "button",
            description: "从 JSON 文件恢复设置（导入后将自动重启）",
            buttonLabel: "导入设置",
            action: importSettings,
            componentProps: { type: "primary" },
          },
        ],
      },
      {
        title: "重置",
        items: [
          {
            key: "resetSetting",
            label: "重置所有设置",
            type: "button",
            description: "重置所有设置，恢复软件默认值",
            buttonLabel: "重置设置",
            action: resetSetting,
            componentProps: { type: "warning" },
          },
          {
            key: "clearAllData",
            label: "清除全部数据",
            type: "button",
            description: "重置所有设置，清除全部数据",
            buttonLabel: "清除全部",
            action: clearAllData,
            componentProps: { type: "error" },
          },
        ],
      },
    ],
  };
};
