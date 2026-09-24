import { app, ipcMain, powerSaveBlocker } from "electron";
import { ipcLog } from "../logger";
import { getFonts } from "font-list";
import { useStore } from "../store";

/**
 * 初始化系统 IPC 通信
 * @returns void
 */
const initSystemIpc = (): void => {
  const store = useStore();

  /** 阻止系统息屏 ID */
  let preventId: number | null = null;

  // 是否阻止系统息屏
  ipcMain.on("prevent-sleep", (_event, val: boolean) => {
    if (val) {
      preventId = powerSaveBlocker.start("prevent-display-sleep");
      ipcLog.info("⏾ System sleep prevention started");
    } else {
      if (preventId !== null) {
        powerSaveBlocker.stop(preventId);
        ipcLog.info("✅ System sleep prevention stopped");
      }
    }
  });

  // 退出应用
  ipcMain.on("quit-app", () => {
    app.quit();
  });

  // 重启应用
  ipcMain.on("restart-app", () => {
    ipcLog.info("🔄 Restarting application...");
    app.relaunch();
    app.exit(0);
  });

  // 获取系统全部字体
  ipcMain.handle("get-all-fonts", async () => {
    try {
      const fonts = await getFonts({ disableQuoting: true });
      return fonts;
    } catch (error) {
      ipcLog.error(`❌ Failed to get all system fonts: ${error}`);
      return [];
    }
  });

  // 重置全部设置
  ipcMain.on("reset-setting", () => {
    store.reset();
    ipcLog.info("✅ Reset setting successfully");
  });
};

export default initSystemIpc;
