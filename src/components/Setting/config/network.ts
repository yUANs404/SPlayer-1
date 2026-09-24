import { useSettingStore } from "@/stores";
import { isElectron } from "@/utils/env";
import { SettingConfig } from "@/types/settings";
import { computed, ref } from "vue";
import { disableDiscordRpc, enableDiscordRpc, updateDiscordConfig } from "@/core/player/PlayerIpc";

export const useNetworkSettings = (): SettingConfig => {
  const settingStore = useSettingStore();

  // --- Discord RPC Logic (from third.ts) ---
  const handleDiscordConfigUpdate = () => {
    if (!settingStore.discordRpc.enabled) return;
    updateDiscordConfig({
      showWhenPaused: settingStore.discordRpc.showWhenPaused,
      displayMode: settingStore.discordRpc.displayMode,
    });
  };

  const handleDiscordEnabledUpdate = (val: boolean) => {
    settingStore.discordRpc.enabled = val;
    if (val) {
      enableDiscordRpc();
      handleDiscordConfigUpdate();
    } else {
      disableDiscordRpc();
    }
  };

  // --- WebSocket Logic (from third.ts) ---
  const socketPort = ref(25885);
  const socketEnabled = ref(false);
  const socketPortSaved = ref<number | null>(null);

  const initSocketConfig = async () => {
    if (!isElectron) return;
    const wsOptions = await window.api.store.get("websocket");
    const portFromStore = wsOptions?.port ?? 25885;
    socketPort.value = portFromStore;
    socketPortSaved.value = portFromStore;
    socketEnabled.value = wsOptions?.enabled ?? false;
  };

  const saveSocketConfig = async () => {
    if (!isElectron) return;
    await window.api.store.set("websocket", {
      enabled: socketEnabled.value,
      port: socketPort.value,
    });
  };

  const handleSocketEnabledUpdate = async (value: boolean) => {
    if (!isElectron) {
      socketEnabled.value = value;
      await saveSocketConfig();
      return;
    }
    if (value) {
      if (socketPort.value !== socketPortSaved.value) {
        window.$message.warning("请先测试并保存端口配置后再启用 WebSocket");
        return;
      }
      const result = await window.electron.ipcRenderer.invoke("socket-start");
      if (result?.success) {
        socketEnabled.value = true;
        await saveSocketConfig();
        window.$message.success("WebSocket 服务已启动");
      } else {
        window.$message.error(result?.message ?? "WebSocket 启动失败");
        socketEnabled.value = false;
      }
    } else {
      const result = await window.electron.ipcRenderer.invoke("socket-stop");
      if (result?.success) {
        socketEnabled.value = false;
        await saveSocketConfig();
        window.$message.success("WebSocket 服务已关闭");
      } else {
        window.$message.error(result?.message ?? "WebSocket 关闭失败");
        socketEnabled.value = true;
      }
    }
  };

  const testSocketPort = async () => {
    if (!isElectron) return;
    if (!socketPort.value) {
      window.$message.error("请输入端口号");
      return;
    }
    try {
      const result = await window.electron.ipcRenderer.invoke("socket-test-port", socketPort.value);
      if (result?.success) {
        await saveSocketConfig();
        socketPortSaved.value = socketPort.value;
        window.$message.success("已保存 WebSocket 配置");
      } else {
        window.$message.error(result?.message ?? "该端口不可用，请更换端口");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const onActivate = () => {
    initSocketConfig();
  };

  return {
    onActivate,
    groups: [
      {
        title: "系统集成",
        items: [
          {
            key: "smtcOpen",
            label: isElectron ? "开启系统音频集成" : "开启浏览器媒体会话",
            type: "switch",
            description: isElectron
              ? "与系统集成以显示媒体元数据，支持高清封面显示"
              : "向浏览器发送 Media Session 媒体元数据",
            value: computed({
              get: () => settingStore.smtcOpen,
              set: (v) => (settingStore.smtcOpen = v),
            }),
          },
        ],
      },
      {
        title: "Discord RPC",
        show: isElectron,
        items: [
          {
            key: "discord_enabled",
            label: "启用 Discord RPC",
            type: "switch",
            description: "在 Discord 状态中显示正在播放的歌曲",
            value: computed({
              get: () => settingStore.discordRpc.enabled,
              set: (v) => handleDiscordEnabledUpdate(v),
            }),
            children: [
              {
                key: "discord_paused",
                label: "暂停时显示",
                type: "switch",
                description: "暂停播放时是否保留 Discord 状态",
                value: computed({
                  get: () => settingStore.discordRpc.showWhenPaused,
                  set: (v) => {
                    settingStore.discordRpc.showWhenPaused = v;
                    handleDiscordConfigUpdate();
                  },
                }),
              },
              {
                key: "discord_mode",
                label: "简略状态显示",
                type: "select",
                description: "不打开详细信息面板时，在用户名下方显示的小字",
                options: [
                  { label: "应用名", value: "Name" },
                  { label: "歌曲名", value: "Details" },
                  { label: "歌手名", value: "State" },
                ],
                value: computed({
                  get: () => settingStore.discordRpc.displayMode,
                  set: (v) => {
                    settingStore.discordRpc.displayMode = v;
                    handleDiscordConfigUpdate();
                  },
                }),
              },
            ],
          },
        ],
      },
      {
        title: "WebSocket 配置",
        show: isElectron,
        items: [
          {
            key: "socket_enabled",
            label: "启用 WebSocket",
            type: "switch",
            description: "开启后可通过 WebSocket 获取状态或控制播放器",
            value: computed({
              get: () => socketEnabled.value,
              set: (v) => handleSocketEnabledUpdate(v),
            }),
          },
          {
            key: "socket_port",
            label: "WebSocket 端口",
            type: "input-number",
            description: "更改后需要测试并保存才能生效",
            componentProps: { min: 1, max: 65535, showButton: false, placeholder: "请输入端口号" },
            disabled: computed(() => socketEnabled.value),
            value: computed({
              get: () => socketPort.value,
              set: (v) => (socketPort.value = v || 25885),
            }),
          },
          {
            key: "socket_test",
            label: "测试端口配置",
            type: "button",
            buttonLabel: "测试并保存",
            show: computed(() => socketPort.value !== socketPortSaved.value),
            action: testSocketPort,
            componentProps: { type: "primary" },
          },
        ],
      },
    ],
  };
};
