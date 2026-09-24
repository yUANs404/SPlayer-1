import { useDataStore, useMusicStore, useStatusStore } from "@/stores";
import type { RepeatModeType, ShuffleModeType } from "@/types/shared/play-mode";
import { isElectron } from "@/utils/env";
import { shuffleArray } from "@/utils/helper";
import * as playerIpc from "./PlayerIpc";

/**
 * 播放模式管理器
 * 负责循环模式、随机模式的切换逻辑及状态同步
 */
export class PlayModeManager {
  /**
   * 切换循环模式
   * @param mode 可选，直接设置目标模式。如果不传，则按 List -> One -> Off 顺序轮转
   */
  public toggleRepeat(mode?: RepeatModeType) {
    const statusStore = useStatusStore();

    if (mode) {
      if (statusStore.repeatMode === mode) return;
      statusStore.repeatMode = mode;
    } else {
      statusStore.toggleRepeat();
    }

    this.syncMediaPlayMode();

    const modeText: Record<RepeatModeType, string> = {
      list: "列表循环",
      one: "单曲循环",
      off: "不循环",
    };
    window.$message.success(modeText[statusStore.repeatMode], { showIcon: false });
  }

  /**
   * 计算下一个随机模式
   */
  public calculateNextShuffleMode(currentMode: ShuffleModeType): ShuffleModeType {
    if (currentMode === "off") return "on";
    return "off";
  }

  /**
   * 执行开启随机模式的操作
   */
  private async applyShuffleOn() {
    const dataStore = useDataStore();
    const statusStore = useStatusStore();
    const musicStore = useMusicStore();

    const currentList = [...dataStore.playList];
    // 备份原始列表
    await dataStore.setOriginalPlayList(currentList);

    // 打乱列表
    const shuffled = shuffleArray(currentList);
    await dataStore.setPlayList(shuffled);

    // 修正当前播放索引
    const idx = shuffled.findIndex((s) => s.id === musicStore.playSong?.id);
    if (idx !== -1) statusStore.playIndex = idx;

    window.$message.success("随机播放已开启", { showIcon: false });
  }

  /**
   * 执行关闭随机模式的操作
   *
   * 会恢复原始列表
   */
  private async applyShuffleOff() {
    const dataStore = useDataStore();
    const statusStore = useStatusStore();
    const musicStore = useMusicStore();

    // 恢复原始列表
    const original = await dataStore.getOriginalPlayList();

    if (original && original.length > 0) {
      await dataStore.setPlayList(original);
      const idx = original.findIndex((s) => s.id === musicStore.playSong?.id);
      statusStore.playIndex = idx !== -1 ? idx : 0;
      await dataStore.clearOriginalPlayList();
    } else {
      await dataStore.setPlayList(dataStore.playList);
    }

    window.$message.success("随机播放已关闭", { showIcon: false });
  }

  /**
   * 切换随机模式
   * @param mode 要切换到的随机模式
   */
  public async toggleShuffle(mode: ShuffleModeType) {
    const statusStore = useStatusStore();

    const nextMode = mode;
    const currentMode = statusStore.shuffleMode;

    if (nextMode === currentMode) return;

    const previousMode = statusStore.shuffleMode;
    statusStore.shuffleMode = nextMode;
    this.syncMediaPlayMode();

    // 将耗时的数据处理扔到 UI 图标更新后再进行，避免打乱庞大列表导致点击延迟
    setTimeout(async () => {
      try {
        switch (nextMode) {
          case "on":
            await this.applyShuffleOn();
            break;
          default:
            await this.applyShuffleOff();
            break;
        }
      } catch (e) {
        console.error("切换模式时发生错误:", e);

        // 失败回滚
        statusStore.shuffleMode = previousMode;

        const errorMsg = (e as Error).message || "模式切换出错";
        window.$message.error(errorMsg);
      }
    }, 10);
  }

  /**
   * 同步当前的播放模式到媒体控件
   */
  public syncMediaPlayMode() {
    const statusStore = useStatusStore();

    if (isElectron) {
      const shuffle = statusStore.shuffleMode !== "off";
      const repeat =
        statusStore.repeatMode === "list"
          ? "List"
          : statusStore.repeatMode === "one"
            ? "Track"
            : "None";

      playerIpc.sendMediaPlayMode(shuffle, repeat);
    }
  }

  /**
   * 同步播放模式给托盘
   */
  public playModeSyncIpc() {
    const statusStore = useStatusStore();
    if (isElectron) {
      playerIpc.sendPlayMode(statusStore.repeatMode, statusStore.shuffleMode);
    }
  }
}
